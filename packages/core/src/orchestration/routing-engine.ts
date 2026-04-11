import type { HarnessSelection, OrchestrationTaskRef } from './types.js';
import { matchRoutingRule } from './rule-matcher.js';

export interface RoutingConfigShape {
  defaults: {
    harness: HarnessSelection['harness'];
    timeout_ms: number;
  };
  rules: Array<{
    id: string;
    when: Record<string, unknown>;
    select: {
      harness: HarnessSelection['harness'];
      timeout_ms?: number;
    };
  }>;
}

export interface RoutingDecision {
  selection: HarnessSelection;
  timeoutMs: number;
}

export function resolveHarnessRoute(task: OrchestrationTaskRef, config: RoutingConfigShape): RoutingDecision {
  const matched = matchRoutingRule(task, config.rules);
  if (matched) {
    const rule = config.rules.find(entry => entry.id === matched.ruleId);
    return {
      selection: matched,
      timeoutMs: rule?.select.timeout_ms ?? config.defaults.timeout_ms,
    };
  }

  return {
    selection: {
      harness: config.defaults.harness,
      ruleId: 'defaults',
      reason: `No routing rule matched; using default harness '${config.defaults.harness}'`,
    },
    timeoutMs: config.defaults.timeout_ms,
  };
}
