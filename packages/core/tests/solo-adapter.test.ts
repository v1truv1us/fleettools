import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SoloAdapter, SoloCommandError } from '../src/index.js';

describe('SoloAdapter.createTask', () => {
  let tempDir: string;
  let soloBin: string;
  let argsFile: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `fleet-solo-adapter-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
    soloBin = join(tempDir, 'solo');
    argsFile = join(tempDir, 'args.json');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writeFakeSolo(response: unknown): Promise<void> {
    await fs.writeFile(soloBin, `#!/usr/bin/env bun\nimport { writeFileSync } from 'node:fs';\nwriteFileSync(${JSON.stringify(argsFile)}, JSON.stringify(process.argv.slice(2)));\nconsole.log(${JSON.stringify(JSON.stringify(response))});\n`);
    await fs.chmod(soloBin, 0o755);
  }

  it('passes non-empty create flags, serializes arrays, and returns data.task', async () => {
    await writeFakeSolo({
      ok: true,
      data: {
        task: {
          id: 'solo-123',
          title: 'Create task',
          type: 'task',
          status: 'draft',
          status_legacy: 'draft',
          priority: 'medium',
          priority_value: 2,
          version: 1,
          created_at: '2026-04-25T00:00:00.000Z',
        },
      },
    });

    const created = await new SoloAdapter({ binaryPath: soloBin, cwd: tempDir, retries: 1 }).createTask({
      title: 'Create task',
      type: 'task',
      priority: 'medium',
      description: 'Created from Fleet Steer.',
      acceptanceCriteria: 'Criteria',
      definitionOfDone: 'Done',
      parent: '',
      labels: ['fleet-steer', '', 'verified'],
      affectedFiles: ['packages/core/src/index.ts', ' packages/cli/src/steer/handoff.ts '],
      deps: ['solo-a', 'solo-b'],
    });

    expect(created.id).toBe('solo-123');
    expect(created.status).toBe('draft');
    expect(JSON.parse(await fs.readFile(argsFile, 'utf8'))).toEqual([
      'task', 'create',
      '--title', 'Create task',
      '--type', 'task',
      '--priority', 'medium',
      '--description', 'Created from Fleet Steer.',
      '--acceptance-criteria', 'Criteria',
      '--definition-of-done', 'Done',
      '--labels', 'fleet-steer,verified',
      '--affected-files', 'packages/core/src/index.ts,packages/cli/src/steer/handoff.ts',
      '--deps', 'solo-a,solo-b',
      '--json',
    ]);
  });

  it('throws SOLO_MISSING_TASK when create response lacks data.task', async () => {
    await writeFakeSolo({ ok: true, data: {} });

    await expect(new SoloAdapter({ binaryPath: soloBin, cwd: tempDir, retries: 1 }).createTask({ title: 'Missing task' }))
      .rejects.toThrow(SoloCommandError);
    await expect(new SoloAdapter({ binaryPath: soloBin, cwd: tempDir, retries: 1 }).createTask({ title: 'Missing task' }))
      .rejects.toMatchObject({ code: 'SOLO_MISSING_TASK' });
  });
});
