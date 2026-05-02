import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { loadSteerConfig } from './config.js';
import { readTextIfExists, writeTextAtomic } from './fs.js';
import { loadTemplate } from './templates.js';
import { parseVerdict } from './verdict.js';
import { getActiveTask, listTaskStatuses, readTaskStatus, writeTaskStatus } from './tasks.js';
import { appendHistory, readState, writeState } from './state.js';
import { SteerError } from './errors.js';
import { createSoloTaskHandoff } from './handoff.js';

async function runShell(command: string, cwd: string, timeoutSeconds: number): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ ok: false, output: `${output}\nTimed out after ${timeoutSeconds}s` });
    }, timeoutSeconds * 1000);
    child.stdout.on('data', (chunk) => { output += String(chunk); });
    child.stderr.on('data', (chunk) => { output += String(chunk); });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, output });
    });
  });
}

function parseDeclaredFiles(verifyText: string): string[] {
  const files: string[] = [];
  let inFiles = false;
  for (const line of verifyText.split('\n')) {
    if (/^#+\s+Files (created|modified)/i.test(line)) { inFiles = true; continue; }
    if (/^#+\s+/.test(line)) inFiles = false;
    if (inFiles) {
      const match = line.match(/^\s*[-*]\s+`?([^`\s]+)`?/);
      if (match && !match[1].includes('path/to/')) files.push(match[1]);
    }
  }
  return files;
}

function parseShellCriteria(verifyText: string): string[] {
  const noComments = verifyText.replace(/<!--[\s\S]*?-->/g, '');
  return [...noComments.matchAll(/\[shell:\s*([^\]]+)\]/g)].map((match) => match[1].trim());
}

async function gitDiff(projectRoot: string, baseRef?: string): Promise<string> {
  const command = baseRef ? `git diff ${baseRef}` : 'git diff';
  return (await runShell(command, projectRoot, 30)).output;
}

export async function runDeterministicVerify(changeDir: string, projectRoot: string, testsEnabled: boolean): Promise<{ ok: boolean; markdown: string; taskId: string }> {
  const active = await getActiveTask(changeDir);
  if (!active) throw new SteerError('No active task to verify. Run fleet steer task start first.');
  const config = await loadSteerConfig(projectRoot);
  const verifyText = await fs.readFile(join(changeDir, 'tasks', active.id, 'verify.md'), 'utf8');
  const sections: string[] = [`# Verify Result: ${active.id}`, `Started: ${new Date().toISOString()}`];

  if (config.verify_gate.tests.enabled && testsEnabled) {
    const result = await runShell(config.verify_gate.tests.command, projectRoot, config.verify_gate.tests.timeout_seconds);
    sections.push(`## Tests\nCommand: \`${config.verify_gate.tests.command}\`\n\nPassed: ${result.ok}\n\n\`\`\`\n${result.output}\n\`\`\``);
    if (!result.ok) return { ok: false, markdown: sections.join('\n\n'), taskId: active.id };
  } else {
    sections.push('## Tests\nSkipped by configuration or --no-tests.');
  }

  const declared = parseDeclaredFiles(verifyText);
  const missing: string[] = [];
  for (const file of declared) {
    try {
      const stat = await fs.stat(join(projectRoot, file));
      if (stat.size === 0) missing.push(`${file} (empty)`);
    } catch {
      missing.push(file);
    }
  }
  sections.push(`## Files\n${declared.length === 0 ? 'No declared file checks.' : missing.length === 0 ? 'All declared files exist.' : `Missing/empty: ${missing.join(', ')}`}`);
  if (missing.length > 0) return { ok: false, markdown: sections.join('\n\n'), taskId: active.id };

  for (const command of parseShellCriteria(verifyText)) {
    const result = await runShell(command, projectRoot, 120);
    sections.push(`## Acceptance Criterion\nCommand: \`${command}\`\n\nPassed: ${result.ok}\n\n\`\`\`\n${result.output}\n\`\`\``);
    if (!result.ok) return { ok: false, markdown: sections.join('\n\n'), taskId: active.id };
  }

  return { ok: true, markdown: sections.join('\n\n'), taskId: active.id };
}

export async function emitDiffReview(changeDir: string, projectRoot: string, testsEnabled: boolean): Promise<string> {
  const result = await runDeterministicVerify(changeDir, projectRoot, testsEnabled);
  await writeTextAtomic(join(changeDir, 'tasks', result.taskId, 'verify-result.md'), result.markdown);
  const task = await readTaskStatus(changeDir, result.taskId);
  if (!result.ok) {
    await writeTaskStatus(changeDir, { ...task, status: 'failed' });
    throw new SteerError(`Deterministic verify failed for ${result.taskId}. See tasks/${result.taskId}/verify-result.md`);
  }
  await writeTaskStatus(changeDir, { ...task, status: 'verifying' });
  const state = await readState(changeDir);
  await writeState(changeDir, appendHistory({ ...state, phase: 'verify', active_task: result.taskId }, 'verify', `deterministic checks passed for ${result.taskId}`));
  const spec = await readTextIfExists(join(changeDir, '01-spec.md'));
  const verifyText = await readTextIfExists(join(changeDir, 'tasks', result.taskId, 'verify.md'));
  const diff = await gitDiff(projectRoot, task.base_ref);
  return loadTemplate('diff-review', { task_id: result.taskId, spec, verify: verifyText, diff }, projectRoot);
}

export async function ingestDiffReview(changeDir: string, raw: string): Promise<string> {
  const active = await getActiveTask(changeDir);
  if (!active || active.status !== 'verifying') throw new SteerError('No task is awaiting diff-review ingestion.');
  const verdict = parseVerdict(raw);
  if (!verdict) {
    await writeTextAtomic(join(changeDir, 'tasks', active.id, 'diff-review-raw.txt'), raw);
    throw new SteerError(`Invalid strict verdict JSON. Raw output saved for ${active.id}.`);
  }
  const existing = await readTextIfExists(join(changeDir, 'tasks', active.id, 'verify-result.md'));
  const final = `${existing}\n\n## Diff Review\n\n\`\`\`json\n${JSON.stringify(verdict, null, 2)}\n\`\`\`\n`;
  await writeTextAtomic(join(changeDir, 'tasks', active.id, 'verify-result.md'), final);
  const state = await readState(changeDir);
  if (verdict.status !== 'pass') {
    await writeTaskStatus(changeDir, { ...active, status: 'failed' });
    await writeState(changeDir, appendHistory({ ...state, active_task: active.id }, 'verify-failed', active.id));
    return `Task ${active.id} failed diff review.`;
  }
  let nextStatus: 'done' | 'done-pending-handoff' = 'done';
  let handoffId: string | undefined;
  let soloStatus: string | undefined;
  try {
    const handoff = await createSoloTaskHandoff(changeDir, active);
    handoffId = handoff.id;
    soloStatus = handoff.status;
  } catch {
    nextStatus = 'done-pending-handoff';
  }
  await writeTaskStatus(changeDir, {
    ...active,
    status: nextStatus,
    completed_at: new Date().toISOString(),
    handoff_id: handoffId,
    solo_task_id: nextStatus === 'done' && soloStatus !== 'mock' ? handoffId : active.solo_task_id,
    solo_status: soloStatus ?? active.solo_status,
  });
  const statuses = await listTaskStatuses(changeDir);
  const allComplete = statuses.every((task) => ['done', 'done-pending-handoff'].includes(task.id === active.id ? nextStatus : task.status));
  await writeState(changeDir, appendHistory({ ...state, phase: allComplete ? 'done' : 'execute', active_task: undefined }, 'verify-passed', active.id));
  return nextStatus === 'done' ? `Task ${active.id} verified and handed off to Solo.` : `Task ${active.id} verified but handoff is pending retry.`;
}
