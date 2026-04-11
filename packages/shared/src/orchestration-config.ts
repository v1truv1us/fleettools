import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { findUp } from './utils.js';

export type HarnessId = 'claude-code' | 'opencode' | 'codex';

export interface FleetRoutingRuleCondition {
  task_id?: string | string[];
  task_type?: string | string[];
  labels?: string[];
  priority?: string | string[];
  title_regex?: string;
  affected_files_glob?: string[];
}

export interface FleetRoutingRule {
  id: string;
  when: FleetRoutingRuleCondition;
  select: {
    harness: HarnessId;
    timeout_ms?: number;
  };
}

export interface FleetRoutingConfig {
  version: number;
  defaults: {
    harness: HarnessId;
    timeout_ms: number;
  };
  rules: FleetRoutingRule[];
  filePath?: string;
}

const VALID_HARNESSES: HarnessId[] = ['claude-code', 'opencode', 'codex'];

export function getDefaultRoutingConfig(): FleetRoutingConfig {
  return {
    version: 1,
    defaults: {
      harness: 'claude-code',
      timeout_ms: 30 * 60 * 1000,
    },
    rules: [],
  };
}

export function findRoutingConfigPath(cwd: string = process.cwd()): string | null {
  return findUp('fleet.routing.yaml', cwd) ?? findUp('fleet.routing.yml', cwd);
}

export function loadRoutingConfig(cwd: string = process.cwd()): FleetRoutingConfig {
  const filePath = findRoutingConfigPath(cwd);
  if (!filePath) {
    return getDefaultRoutingConfig();
  }

  const content = readFileSync(filePath, 'utf-8');
  const parsed = parseYaml(content);
  const config = validateRoutingConfig(parsed);
  config.filePath = filePath;
  return config;
}

export function validateRoutingConfig(input: unknown): FleetRoutingConfig {
  if (!input || typeof input !== 'object') {
    throw new Error('Routing config must be an object');
  }

  const raw = input as Record<string, unknown>;
  const defaults = raw.defaults as Record<string, unknown> | undefined;
  const rules = Array.isArray(raw.rules) ? raw.rules : [];
  const harness = defaults?.harness;
  const timeoutMs = defaults?.timeout_ms;

  if (!VALID_HARNESSES.includes((harness as HarnessId | undefined) ?? 'claude-code')) {
    throw new Error(`Invalid default harness '${String(harness)}'`);
  }

  if (timeoutMs !== undefined && (!Number.isInteger(timeoutMs) || Number(timeoutMs) <= 0)) {
    throw new Error('defaults.timeout_ms must be a positive integer');
  }

  const validatedRules = rules.map((rule, index) => validateRoutingRule(rule, index));

  return {
    version: Number(raw.version ?? 1),
    defaults: {
      harness: (harness as HarnessId | undefined) ?? 'claude-code',
      timeout_ms: Number(timeoutMs ?? 30 * 60 * 1000),
    },
    rules: validatedRules,
  };
}

function validateRoutingRule(rule: unknown, index: number): FleetRoutingRule {
  if (!rule || typeof rule !== 'object') {
    throw new Error(`rules[${index}] must be an object`);
  }

  const raw = rule as Record<string, unknown>;
  const id = String(raw.id ?? '').trim();
  const when = (raw.when ?? {}) as Record<string, unknown>;
  const select = (raw.select ?? {}) as Record<string, unknown>;
  const harness = select.harness;

  if (!id) {
    throw new Error(`rules[${index}].id is required`);
  }

  if (!VALID_HARNESSES.includes(harness as HarnessId)) {
    throw new Error(`rules[${index}].select.harness must be one of ${VALID_HARNESSES.join(', ')}`);
  }

  const timeoutMs = select.timeout_ms;
  if (timeoutMs !== undefined && (!Number.isInteger(timeoutMs) || Number(timeoutMs) <= 0)) {
    throw new Error(`rules[${index}].select.timeout_ms must be a positive integer`);
  }

  return {
    id,
    when: normalizeCondition(when),
    select: {
      harness: harness as HarnessId,
      timeout_ms: timeoutMs === undefined ? undefined : Number(timeoutMs),
    },
  };
}

function normalizeCondition(input: Record<string, unknown>): FleetRoutingRuleCondition {
  const condition: FleetRoutingRuleCondition = {};

  if (input.task_id !== undefined) condition.task_id = normalizeStringOrStringArray(input.task_id, 'task_id');
  if (input.task_type !== undefined) condition.task_type = normalizeStringOrStringArray(input.task_type, 'task_type');
  if (input.priority !== undefined) condition.priority = normalizeStringOrStringArray(input.priority, 'priority');
  if (input.title_regex !== undefined) condition.title_regex = normalizeString(input.title_regex, 'title_regex');
  if (input.labels !== undefined) condition.labels = normalizeStringArray(input.labels, 'labels');
  if (input.affected_files_glob !== undefined) {
    condition.affected_files_glob = normalizeStringArray(input.affected_files_glob, 'affected_files_glob');
  }

  return condition;
}

function normalizeString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function normalizeStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || item.trim().length === 0)) {
    throw new Error(`${field} must be an array of non-empty strings`);
  }
  return value.map(item => item.trim());
}

function normalizeStringOrStringArray(value: unknown, field: string): string | string[] {
  return Array.isArray(value) ? normalizeStringArray(value, field) : normalizeString(value, field);
}
