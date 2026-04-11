import { describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Orchestrator } from '../src/index.js';

describe('Orchestrator', () => {
  it('records a completed run in projection storage', async () => {
    const root = mkdtempSync(join(tmpdir(), 'fleet-orchestrator-'));
    mkdirSync(join(root, '.solo', 'worktrees', 'T-2'), { recursive: true });

    const solo = {
      async showTask() {
        return {
          title: 'Implement typed Solo adapter and error mapping',
          description: 'Task description',
          type: 'task',
          priority: 'critical',
          priority_value: 5,
          labels: ['backend'],
          status: 'ready',
          affected_files: [],
        };
      },
      async startSession() {
        return {
          taskId: 'T-2',
          sessionId: 'S-1',
          reservationId: 'R-1',
          worktreePath: join(root, '.solo', 'worktrees', 'T-2'),
          contextBundle: {},
        };
      },
      async endSession() {
        return {};
      },
      async createHandoff() {
        return {};
      },
    };

    const registry = {
      getAdapter() {
        return {
          async probeAvailability() {
            return { harness: 'claude-code', status: 'available' as const };
          },
          async run() {
            return {
              status: 'completed' as const,
              summary: 'done',
              filesChanged: ['packages/core/src/integrations/solo-adapter.ts'],
            };
          },
        };
      },
    };

    const orchestrator = new Orchestrator({
      solo: solo as any,
      routingConfig: {
        defaults: { harness: 'claude-code', timeout_ms: 1000 },
        rules: [],
      },
      projectRoot: root,
      registry: registry as any,
    });

    const result = await orchestrator.runTask('T-2');
    const projection = readFileSync(join(root, '.fleet', 'orchestration', 'runs.jsonl'), 'utf-8');

    expect(result.status).toBe('completed');
    expect(projection).toContain('completed');
    expect(projection).toContain('T-2');
  });
});
