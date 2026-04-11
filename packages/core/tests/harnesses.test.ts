import { describe, expect, it } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GenericCliHarnessAdapter, ProjectionStore } from '../src/index.js';

describe('GenericCliHarnessAdapter', () => {
  it('reports successful execution for configured templates', async () => {
    const adapter = new GenericCliHarnessAdapter(
      'codex',
      'node',
      ['--version'],
      "printf '{\"status\":\"completed\",\"summary\":\"ok\",\"filesChanged\":[]}'",
    );

    const result = await adapter.run({
      harness: 'codex',
      worktreePath: process.cwd(),
      task: {
        taskId: 'T-test',
        title: 'Test task',
        labels: [],
        affectedFiles: [],
      },
      sessionId: 'S-test',
      prompt: 'noop',
      timeoutMs: 1000,
    });

    expect(result.status).toBe('completed');
    expect(result.summary).toBe('ok');
  });
});

describe('ProjectionStore', () => {
  it('appends and lists run projections', () => {
    const root = mkdtempSync(join(tmpdir(), 'fleet-projection-'));
    const store = new ProjectionStore(root);

    store.append({
      runId: 'R-1',
      taskId: 'T-1',
      harness: 'claude-code',
      status: 'completed',
      startedAt: new Date().toISOString(),
      ruleId: 'defaults',
      reason: 'test',
    });

    const runs = store.list();
    expect(runs).toHaveLength(1);
    expect(runs[0]?.runId).toBe('R-1');
  });
});
