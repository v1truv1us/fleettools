import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertNonEmptyFile, changeDir, discoverProjectRoot, inferSlug, pathExists, readTextIfExists, validateSlug, withChangeLock, writeJsonAtomic, writeTextAtomic } from '../steer/fs.js';
import { appendHistory, readState, writeState } from '../steer/state.js';
import { defaultState, Phase } from '../steer/types.js';
import { loadTemplate } from '../steer/templates.js';
import { parseVerdict } from '../steer/verdict.js';
import { loadSteerConfig } from '../steer/config.js';
import { depsSatisfied, listTaskStatuses, readTaskStatus, scaffoldTasks, writeTaskStatus } from '../steer/tasks.js';
import { completeHandoff } from '../steer/handoff.js';
import { emitDiffReview, ingestDiffReview } from '../steer/verify.js';
import { SteerError } from '../steer/errors.js';

const stdout = (text: string) => process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
const stderr = (text: string) => process.stderr.write(text.endsWith('\n') ? text : `${text}\n`);

async function context(explicit?: string) {
  const root = await discoverProjectRoot();
  const slug = await inferSlug(root, explicit);
  return { root, slug, dir: changeDir(root, slug) };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

function artifactFor(phase: Phase): string | null {
  switch (phase) {
    case 'context': return '00-context.md';
    case 'spec': return '01-spec.md';
    case 'plan': return '03-plan.md';
    case 'tasks': return '05-tasks.md';
    case 'spec-review':
    case 'plan-review':
    case 'execute':
    case 'verify':
    case 'done': return null;
  }
}

function priorArtifactFor(phase: Phase): string {
  switch (phase) {
    case 'spec': return '00-context.md';
    case 'plan': return '01-spec.md';
    case 'tasks': return '03-plan.md';
    case 'execute': return '05-tasks.md';
    case 'context':
    case 'spec-review':
    case 'plan-review':
    case 'verify':
    case 'done': return artifactFor(phase) ?? '05-tasks.md';
  }
}

function nextPhase(phase: Phase): Phase {
  switch (phase) {
    case 'context': return 'spec';
    case 'spec': return 'spec-review';
    case 'plan': return 'plan-review';
    case 'tasks': return 'execute';
    case 'spec-review':
    case 'plan-review': throw new SteerError('Use fleet steer review --ingest or --resolve to leave review phases.');
    case 'execute': throw new SteerError('Use fleet steer task start and fleet steer verify for execute/verify phases.');
    case 'verify': throw new SteerError('Use fleet steer verify --ingest-review to complete verification.');
    case 'done': throw new SteerError('Change is already done.');
  }
}

async function promptFor(root: string, dir: string, slug: string): Promise<string> {
  const state = await readState(dir);
  if (state.phase === 'spec-review' || state.phase === 'plan-review') return reviewPrompt(root, dir, slug);
  const templateName = state.phase === 'execute' ? 'execute' : state.phase;
  const prior = await readTextIfExists(join(dir, priorArtifactFor(state.phase)));
  return loadTemplate(templateName, { slug, phase: state.phase, round: state.round, prior_artifact: prior }, root);
}

async function reviewPrompt(root: string, dir: string, slug: string): Promise<string> {
  const state = await readState(dir);
  if (state.phase !== 'spec-review' && state.phase !== 'plan-review') throw new SteerError('Review prompts are only available during spec-review or plan-review.');
  const round = state.round + 1;
  const lensRound = Math.min(round, 3);
  const artifact = await readTextIfExists(join(dir, state.phase === 'spec-review' ? '01-spec.md' : '03-plan.md'));
  const contextText = await readTextIfExists(join(dir, '00-context.md'));
  return loadTemplate(`review-r${lensRound}`, { slug, round, phase: state.phase, artifact, context: contextText }, root);
}

async function initSteer(slug: string): Promise<void> {
  validateSlug(slug);
  const root = await discoverProjectRoot();
  const dir = changeDir(root, slug);
  if (await pathExists(dir)) throw new SteerError(`Change already exists: ${dir}`);
  await fs.mkdir(join(dir, '02-spec-reviews'), { recursive: true });
  await fs.mkdir(join(dir, '04-plan-reviews'), { recursive: true });
  await fs.mkdir(join(dir, 'tasks'), { recursive: true });
  await writeTextAtomic(join(dir, '00-context.md'), '');
  await writeTextAtomic(join(dir, '01-spec.md'), '');
  await writeTextAtomic(join(dir, '03-plan.md'), '');
  await writeTextAtomic(join(dir, '05-tasks.md'), '');
  await writeTextAtomic(join(dir, 'decisions.md'), `# Decisions: ${slug}\n\n`);
  await writeJsonAtomic(join(dir, 'state.json'), defaultState());
  stderr(`Initialized steer change at ${dir}`);
}

async function advanceSteer(slug?: string): Promise<void> {
  const { root, dir } = await context(slug);
  await withChangeLock(dir, async () => {
    const state = await readState(dir);
    const artifact = artifactFor(state.phase);
    if (artifact) await assertNonEmptyFile(join(dir, artifact), artifact);
    if (state.phase === 'tasks') {
      const tasks = await scaffoldTasks(dir, root);
      if (tasks.length === 0) throw new SteerError('05-tasks.md contains no markdown checklist tasks.');
      await writeState(dir, appendHistory({ ...state, phase: 'execute', tasks: tasks.map((task) => task.id) }, 'advance', 'tasks -> execute'));
      return;
    }
    const next = nextPhase(state.phase);
    await writeState(dir, appendHistory({ ...state, phase: next, round: 0 }, 'advance', `${state.phase} -> ${next}`));
  });
  stderr('Advanced steer phase.');
}

async function statusSteer(slug: string | undefined, json = false): Promise<void> {
  const { dir, slug: resolved } = await context(slug);
  const state = await readState(dir);
  if (json) { stdout(JSON.stringify({ slug: resolved, ...state }, null, 2)); return; }
  stdout(`Change: ${resolved}\nPhase: ${state.phase}\nRound: ${state.round}\nActive task: ${state.active_task ?? 'none'}\nTasks: ${state.tasks.length}\nHistory: ${state.history.slice(-3).map((entry) => `${entry.at} ${entry.action}${entry.detail ? ` (${entry.detail})` : ''}`).join('\n') || 'none'}`);
}

async function ingestReview(slug?: string): Promise<void> {
  const { dir } = await context(slug);
  await withChangeLock(dir, async () => {
    const state = await readState(dir);
    if (state.phase !== 'spec-review' && state.phase !== 'plan-review') throw new SteerError('Not in a review phase.');
    const raw = await readStdin();
    const verdict = parseVerdict(raw);
    const round = state.round + 1;
    const reviewDir = join(dir, state.phase === 'spec-review' ? '02-spec-reviews' : '04-plan-reviews');
    if (!verdict) {
      await writeTextAtomic(join(reviewDir, `round-${round}-raw.txt`), raw);
      throw new SteerError(`Invalid strict verdict JSON. Raw output saved to ${reviewDir}/round-${round}-raw.txt`);
    }
    await writeTextAtomic(join(reviewDir, `round-${round}.md`), `\`\`\`json\n${JSON.stringify(verdict, null, 2)}\n\`\`\`\n`);
    await writeTextAtomic(join(dir, 'decisions.md'), `${await readTextIfExists(join(dir, 'decisions.md'))}\n- ${new Date().toISOString()} ${state.phase} round ${round}: ${verdict.status}\n`);
    const config = await loadSteerConfig(await discoverProjectRoot());
    const key = state.phase === 'spec-review' ? 'spec' : 'plan';
    const passes = verdict.status === 'pass' ? state.review[key].consecutive_passes + 1 : 0;
    if (passes >= config.review.early_exit_on_pass_count) {
      const next: Phase = state.phase === 'spec-review' ? 'plan' : 'tasks';
      await writeState(dir, appendHistory({ ...state, phase: next, round: 0, review: { ...state.review, [key]: { consecutive_passes: passes, status: 'passed' } } }, 'review-passed', `${key} review early exit`));
    } else {
      const status = round >= config.review.max_rounds ? 'needs-resolve' : 'pending';
      await writeState(dir, appendHistory({ ...state, round, review: { ...state.review, [key]: { consecutive_passes: passes, status } } }, 'review-ingest', `${key} round ${round}`));
    }
  });
  stderr('Review verdict ingested.');
}

async function resolveReview(slug?: string): Promise<void> {
  const { dir } = await context(slug);
  await withChangeLock(dir, async () => {
    const state = await readState(dir);
    if (state.phase !== 'spec-review' && state.phase !== 'plan-review') throw new SteerError('Not in a review phase.');
    const next: Phase = state.phase === 'spec-review' ? 'plan' : 'tasks';
    await writeTextAtomic(join(dir, 'decisions.md'), `${await readTextIfExists(join(dir, 'decisions.md'))}\n- ${new Date().toISOString()} ${state.phase} resolved by user; advancing to ${next}.\n`);
    await writeState(dir, appendHistory({ ...state, phase: next, round: 0 }, 'review-resolve', `${state.phase} -> ${next}`));
  });
  stderr('Review resolved.');
}

async function taskStart(slug?: string): Promise<void> {
  const { root, dir } = await context(slug);
  await withChangeLock(dir, async () => {
    let state = await readState(dir);
    if (state.phase === 'tasks') {
      const tasks = await scaffoldTasks(dir, root);
      state = appendHistory({ ...state, phase: 'execute', tasks: tasks.map((task) => task.id) }, 'advance', 'tasks -> execute');
    } else if (state.phase === 'execute') {
      await scaffoldTasks(dir, root);
    } else {
      throw new SteerError(`Cannot start tasks while change is in ${state.phase} phase.`);
    }
    const statuses = await listTaskStatuses(dir);
    if (statuses.some((task) => task.status === 'active' || task.status === 'verifying')) throw new SteerError('A task is already active or verifying.');
    const next = statuses.find((task) => task.status === 'pending' && depsSatisfied(task, statuses));
    if (!next) throw new SteerError('No ready pending task found.');
    const base = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
    await writeTaskStatus(dir, { ...next, status: 'active', started_at: new Date().toISOString(), base_ref: base.status === 0 ? base.stdout.trim() : undefined });
    await writeState(dir, appendHistory({ ...state, phase: 'execute', active_task: next.id }, 'task-start', next.id));
    stdout(await fs.readFile(join(dir, 'tasks', next.id, 'prompt.md'), 'utf8'));
  });
}

async function taskRetry(taskId: string, slug?: string): Promise<void> {
  const { dir } = await context(slug);
  await withChangeLock(dir, async () => {
    const state = await readState(dir);
    if (state.phase !== 'execute' && state.phase !== 'verify') throw new SteerError(`Cannot retry tasks while change is in ${state.phase} phase.`);
    const statuses = await listTaskStatuses(dir);
    if (statuses.some((task) => (task.status === 'active' || task.status === 'verifying') && task.id !== taskId)) throw new SteerError('Another task is already active or verifying.');
    const task = await readTaskStatus(dir, taskId);
    if (task.status !== 'failed') throw new SteerError(`Task ${taskId} is ${task.status}; only failed tasks can be retried.`);
    await writeTaskStatus(dir, { ...task, status: 'active' });
    await writeState(dir, appendHistory({ ...state, phase: 'execute', active_task: taskId }, 'task-retry', taskId));
  });
  stderr(`Task ${taskId} is active again.`);
}

async function verifySteer(slug: string | undefined, opts: { ingestReview?: boolean; tests?: boolean }): Promise<void> {
  const { root, dir } = await context(slug);
  await withChangeLock(dir, async () => {
    const state = await readState(dir);
    if (opts.ingestReview) {
      if (state.phase !== 'verify') throw new SteerError(`Cannot ingest diff review while change is in ${state.phase} phase.`);
      stdout(await ingestDiffReview(dir, await readStdin()));
      return;
    }
    if (state.phase !== 'execute') throw new SteerError(`Cannot verify while change is in ${state.phase} phase.`);
    stdout(await emitDiffReview(dir, root, opts.tests));
  });
}

export function registerSteerCommand(program: Command): void {
  const steer = program.command('steer').description('Spec-driven Fleet Steer authoring workflow');
  const act = (fn: (...args: any[]) => Promise<void>) => (...args: any[]) => fn(...args).catch((error) => { stderr(error instanceof Error ? error.message : String(error)); process.exit(error instanceof SteerError ? error.exitCode : 1); });

  steer.command('init <slug>').description('Scaffold specs/<slug>').action(act(initSteer));
  steer.command('status [slug]').option('--json', 'Output JSON').action(act((slug, opts) => statusSteer(slug, opts.json)));
  steer.command('next [slug]').description('Emit current phase prompt').action(act(async (slug) => { const c = await context(slug); stdout(await promptFor(c.root, c.dir, c.slug)); }));
  steer.command('resume [slug]').description('Alias for next').action(act(async (slug) => { const c = await context(slug); stdout(await promptFor(c.root, c.dir, c.slug)); }));
  steer.command('advance [slug]').description('Validate artifact and advance phase').action(act(advanceSteer));
  steer.command('review [slug]').option('--ingest', 'Read strict verdict JSON from stdin').option('--resolve', 'Resolve review and advance').action(act(async (slug, opts) => { if (opts.ingest) return ingestReview(slug); if (opts.resolve) return resolveReview(slug); const c = await context(slug); stdout(await reviewPrompt(c.root, c.dir, c.slug)); }));

  const task = steer.command('task').description('Manage steer tasks');
  task.command('list [slug]').action(act(async (slug) => { const { dir } = await context(slug); await scaffoldTasks(dir, await discoverProjectRoot()); const rows = await listTaskStatuses(dir); stdout(rows.map((row) => `${row.id}\t${row.status}\tdeps:${row.deps.join(',') || '-'}\t${row.description}`).join('\n') || 'No tasks.'); }));
  task.command('start [slug]').description('Claim next ready task and emit its prompt').action(act(taskStart));
  task.command('retry <taskId> [slug]').description('Make a failed task active again').action(act(taskRetry));

  steer.command('verify [slug]').option('--ingest-review', 'Read diff-review verdict JSON from stdin').option('--no-tests', 'Skip configured test command').action(act(verifySteer));
  steer.command('handoff [slug]').option('--retry', 'Retry Solo handoff for pending tasks').action(act(async (slug, opts) => { if (!opts.retry) throw new SteerError('Only fleet steer handoff --retry is supported in the MVP.'); const { root, dir } = await context(slug); await withChangeLock(dir, async () => { const rows = await listTaskStatuses(dir); const pending = rows.filter((task) => task.status === 'done-pending-handoff'); for (const row of pending) await completeHandoff(dir, row.id, root); stdout(`Retried ${pending.length} pending handoff(s).`); }); }));
  steer.command('rollback').description('Refuse dangerous rollback in MVP').action(act(async () => { throw new SteerError('Rollback is intentionally disabled in the MVP to avoid reverting unrelated work. Use git status/diff and revert manually.'); }));
}
