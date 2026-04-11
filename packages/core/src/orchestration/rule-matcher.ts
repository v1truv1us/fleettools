import type { HarnessSelection, OrchestrationTaskRef } from './types.js';

export interface RoutingRuleCondition {
  task_id?: string | string[];
  task_type?: string | string[];
  labels?: string[];
  priority?: string | string[];
  title_regex?: string;
  affected_files_glob?: string[];
}

export interface RoutingRule {
  id: string;
  when: RoutingRuleCondition;
  select: {
    harness: HarnessSelection['harness'];
    timeout_ms?: number;
  };
}

export function matchRoutingRule(task: OrchestrationTaskRef, rules: RoutingRule[]): HarnessSelection | null {
  for (const rule of rules) {
    if (!matchesCondition(task, rule.when)) {
      continue;
    }

    return {
      harness: rule.select.harness,
      ruleId: rule.id,
      reason: `Matched routing rule '${rule.id}'`,
    };
  }

  return null;
}

function matchesCondition(task: OrchestrationTaskRef, when: RoutingRuleCondition): boolean {
  if (when.task_id && !matchesValue(task.taskId, when.task_id)) {
    return false;
  }

  if (when.task_type && !matchesValue(task.type, when.task_type)) {
    return false;
  }

  if (when.priority && !matchesValue(task.priority, when.priority)) {
    return false;
  }

  if (when.labels && !when.labels.every(label => task.labels.includes(label))) {
    return false;
  }

  if (when.title_regex) {
    const regex = new RegExp(when.title_regex, 'i');
    if (!regex.test(task.title)) {
      return false;
    }
  }

  if (when.affected_files_glob && when.affected_files_glob.length > 0) {
    const matched = task.affectedFiles.some(file => when.affected_files_glob!.some(pattern => globMatches(file, pattern)));
    if (!matched) {
      return false;
    }
  }

  return true;
}

function matchesValue(actual: string | undefined, expected: string | string[]): boolean {
  if (!actual) {
    return false;
  }

  return Array.isArray(expected) ? expected.includes(actual) : actual === expected;
}

function globMatches(value: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regex = escaped.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
  return new RegExp(`^${regex}$`).test(value);
}
