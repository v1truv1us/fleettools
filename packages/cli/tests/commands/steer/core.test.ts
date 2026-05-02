import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverProjectRoot, validateSlug, withChangeLock, writeTextAtomic } from '../../../src/steer/fs.js';
import { defaultState } from '../../../src/steer/types.js';
import { readState, writeState } from '../../../src/steer/state.js';
import { parseVerdict } from '../../../src/steer/verdict.js';
import { parseTasksFile, scaffoldTasks, listTaskStatuses, readTaskStatus, writeTaskStatus } from '../../../src/steer/tasks.js';
import { loadTemplate } from '../../../src/steer/templates.js';
import { ingestDiffReview } from '../../../src/steer/verify.js';
import { completeHandoff } from '../../../src/steer/handoff.js';

describe('fleet steer core behavior', () => {
  let tempDir: string;
  let originalCwd: string;
  let originalSoloBinary: string | undefined;
  let originalSoloMock: string | undefined;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = join(tmpdir(), `fleet-steer-test-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(join(tempDir, 'package.json'), '{}');
    process.chdir(tempDir);
    originalSoloBinary = process.env.STEER_SOLO_BINARY;
    originalSoloMock = process.env.STEER_SOLO_MOCK;
    delete process.env.STEER_SOLO_BINARY;
    delete process.env.STEER_SOLO_MOCK;
  });

  afterEach(async () => {
    if (originalSoloBinary === undefined) delete process.env.STEER_SOLO_BINARY;
    else process.env.STEER_SOLO_BINARY = originalSoloBinary;
    if (originalSoloMock === undefined) delete process.env.STEER_SOLO_MOCK;
    else process.env.STEER_SOLO_MOCK = originalSoloMock;
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writeFakeSolo(id: string): Promise<string> {
    const soloBin = join(tempDir, 'solo');
    await fs.writeFile(soloBin, `#!/usr/bin/env bun\nconsole.log(JSON.stringify({ ok: true, data: { task: { id: ${JSON.stringify(id)}, title: 'Handoff', type: 'task', status: 'draft', status_legacy: 'draft', priority: 'medium', priority_value: 2, version: 1, created_at: '2026-04-25T00:00:00.000Z' } } }));\n`);
    await fs.chmod(soloBin, 0o755);
    return soloBin;
  }

  async function scaffoldVerifyingTask(slug: string) {
    const dir = join(tempDir, 'specs', slug);
    const taskId = '001-create-solo-handoff';
    await fs.mkdir(join(dir, 'tasks', taskId), { recursive: true });
    await writeTextAtomic(join(dir, '05-tasks.md'), '- [ ] Create Solo handoff\n');
    await writeTextAtomic(join(dir, 'tasks', taskId, 'verify.md'), '# Files modified\n- `src/example.ts`\n\n# Criteria\n- [shell: bun test]\n');
    await writeTextAtomic(join(dir, 'tasks', taskId, 'verify-result.md'), '# Verify Result\n');
    await writeState(dir, { ...defaultState(), phase: 'verify', active_task: taskId, tasks: [taskId] });
    await writeTaskStatus(dir, { id: taskId, status: 'verifying', deps: [], description: 'Create Solo handoff' });
    return { dir, taskId };
  }

  it('validates kebab slugs and rejects traversal', () => {
    expect(() => validateSlug('valid-change-1')).not.toThrow();
    expect(() => validateSlug('../bad')).toThrow();
    expect(() => validateSlug('Bad_Case')).toThrow();
  });

  it('writes and reads initial state atomically', async () => {
    const dir = join(tempDir, 'specs', 'demo');
    await fs.mkdir(dir, { recursive: true });
    await writeState(dir, defaultState());
    const state = await readState(dir);
    expect(state.phase).toBe('context');
    expect(state.tasks).toEqual([]);
  });

  it('prefers the git root over nested package roots', async () => {
    await fs.mkdir(join(tempDir, '.git'), { recursive: true });
    const nested = join(tempDir, 'packages', 'cli');
    await fs.mkdir(nested, { recursive: true });
    await fs.writeFile(join(nested, 'package.json'), '{}');

    await expect(discoverProjectRoot(nested)).resolves.toBe(tempDir);
  });

  it('recovers a stale lock from a dead owner', async () => {
    const dir = join(tempDir, 'specs', 'demo');
    const lockDir = join(dir, '.steer-lock');
    await fs.mkdir(lockDir, { recursive: true });
    await fs.writeFile(join(lockDir, 'owner.json'), JSON.stringify({ pid: 99999999, at: '2000-01-01T00:00:00.000Z' }));

    let ran = false;
    await withChangeLock(dir, async () => {
      ran = true;
    });

    expect(ran).toBe(true);
  });

  it('fails loudly for malformed state', async () => {
    const dir = join(tempDir, 'specs', 'demo');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, 'state.json'), '{');
    await expect(readState(dir)).rejects.toThrow('Invalid steer state');
  });

  it('parses strict verdict JSON and rejects unknown fields', () => {
    const verdict = parseVerdict('```json\n{"status":"pass","round":1,"lens":"ambiguity","issues":[]}\n```');
    expect(verdict?.status).toBe('pass');
    expect(parseVerdict('{"status":"pass","round":1,"lens":"ambiguity","issues":[],"extra":true}')).toBeNull();
  });

  it('parses task checklist dependencies and scaffolds task folders', async () => {
    const dir = join(tempDir, 'specs', 'demo');
    await fs.mkdir(dir, { recursive: true });
    await writeTextAtomic(join(dir, '05-tasks.md'), '- [ ] First task\n- [ ] Second task (deps: 001-first-task)\n');
    const tasks = await parseTasksFile(dir);
    expect(tasks.map((task) => task.id)).toEqual(['001-first-task', '002-second-task']);
    expect(tasks[1].deps).toEqual(['001-first-task']);
    await scaffoldTasks(dir, tempDir);
    const statuses = await listTaskStatuses(dir);
    expect(statuses[0].status).toBe('pending');
  });

  it('uses repo template override and substitutes variables', async () => {
    await fs.mkdir(join(tempDir, '.steer', 'templates'), { recursive: true });
    await writeTextAtomic(join(tempDir, '.steer', 'templates', 'custom.md'), 'Hello {{slug}}');
    await expect(loadTemplate('custom', { slug: 'demo' }, tempDir)).resolves.toBe('Hello demo');
    await writeTextAtomic(join(tempDir, '.steer', 'templates', 'bad.md'), 'Hello {{missing}}');
    await expect(loadTemplate('bad', { slug: 'demo' }, tempDir)).rejects.toThrow('missing');
  });

  it('creates a Solo draft handoff on passing diff review', async () => {
    process.env.STEER_SOLO_BINARY = await writeFakeSolo('solo-created-1');
    const { dir, taskId } = await scaffoldVerifyingTask('demo-handoff');

    const message = await ingestDiffReview(dir, '{"status":"pass","round":1,"lens":"maintainability","issues":[]}');
    const status = await readTaskStatus(dir, taskId);
    const handoff = JSON.parse(await fs.readFile(join(dir, 'tasks', taskId, 'handoff.json'), 'utf8'));

    expect(message).toContain('handed off to Solo');
    expect(status.status).toBe('done');
    expect(status.solo_task_id).toBe('solo-created-1');
    expect(status.solo_status).toBe('draft');
    expect(handoff.solo_task_id).toBe('solo-created-1');
  });

  it('keeps done-pending-handoff on Solo failure and retry completes via the same real path', async () => {
    process.env.STEER_SOLO_BINARY = join(tempDir, 'missing-solo');
    const { dir, taskId } = await scaffoldVerifyingTask('retry-handoff');

    const message = await ingestDiffReview(dir, '{"status":"pass","round":1,"lens":"maintainability","issues":[]}');
    expect(message).toContain('pending retry');
    expect((await readTaskStatus(dir, taskId)).status).toBe('done-pending-handoff');

    process.env.STEER_SOLO_BINARY = await writeFakeSolo('solo-retry-1');
    const done = await completeHandoff(dir, taskId, tempDir);

    expect(done.status).toBe('done');
    expect(done.solo_task_id).toBe('solo-retry-1');
    expect(done.solo_status).toBe('draft');
  });
});
