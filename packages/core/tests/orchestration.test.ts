import { describe, expect, it } from 'bun:test';
import { matchRoutingRule, resolveHarnessRoute } from '../src/index.js';

describe('matchRoutingRule', () => {
  it('matches the first rule that satisfies the task', () => {
    const task = {
      taskId: 'T-2',
      title: 'Implement typed Solo adapter and error mapping',
      type: 'task',
      priority: 'critical',
      labels: ['backend', 'solo'],
      affectedFiles: ['packages/core/src/integrations/solo-adapter.ts'],
    };

    const result = matchRoutingRule(task, [
      {
        id: 'backend-opencode',
        when: { labels: ['backend'] },
        select: { harness: 'opencode' },
      },
      {
        id: 'critical-claude',
        when: { priority: 'critical' },
        select: { harness: 'claude-code' },
      },
    ]);

    expect(result).toEqual({
      harness: 'opencode',
      ruleId: 'backend-opencode',
      reason: "Matched routing rule 'backend-opencode'",
    });
  });

  it('returns null when no rule matches', () => {
    const task = {
      taskId: 'T-3',
      title: 'Implement routing rules config and validation',
      type: 'task',
      priority: 'high',
      labels: ['config'],
      affectedFiles: ['packages/shared/src/orchestration-config.ts'],
    };

    const result = matchRoutingRule(task, [
      {
        id: 'frontend-only',
        when: { labels: ['frontend'] },
        select: { harness: 'opencode' },
      },
    ]);

    expect(result).toBeNull();
  });
});

describe('resolveHarnessRoute', () => {
  it('falls back to the default harness when nothing matches', () => {
    const task = {
      taskId: 'T-9',
      title: 'Add FleetTools CLI task inspection commands backed by Solo',
      type: 'task',
      priority: 'medium',
      labels: ['cli'],
      affectedFiles: [],
    };

    const decision = resolveHarnessRoute(task, {
      defaults: {
        harness: 'claude-code',
        timeout_ms: 1800000,
      },
      rules: [],
    });

    expect(decision.selection.harness).toBe('claude-code');
    expect(decision.selection.ruleId).toBe('defaults');
    expect(decision.timeoutMs).toBe(1800000);
  });
});
