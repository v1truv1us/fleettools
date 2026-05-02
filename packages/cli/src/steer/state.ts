import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { StateCorruptionError, SteerError } from './errors.js';
import { defaultState, Phase, StateSnapshot } from './types.js';
import { writeJsonAtomic } from './fs.js';

const phases = new Set<Phase>(['context', 'spec', 'spec-review', 'plan', 'plan-review', 'tasks', 'execute', 'verify', 'done']);

export function validateState(value: unknown, path: string): StateSnapshot {
  if (!value || typeof value !== 'object') throw new StateCorruptionError(path, 'expected object');
  const state = value as Partial<StateSnapshot>;
  if (typeof state.phase !== 'string' || !phases.has(state.phase as Phase)) {
    throw new StateCorruptionError(path, 'invalid phase');
  }
  if (typeof state.round !== 'number' || state.round < 0) throw new StateCorruptionError(path, 'invalid round');
  if (!Array.isArray(state.tasks)) throw new StateCorruptionError(path, 'tasks must be an array');
  const base = defaultState();
  return {
    ...base,
    ...state,
    review: {
      spec: { ...base.review.spec, ...(state.review?.spec ?? {}) },
      plan: { ...base.review.plan, ...(state.review?.plan ?? {}) },
    },
    history: Array.isArray(state.history) ? state.history : [],
  };
}

export async function readState(dir: string): Promise<StateSnapshot> {
  const path = join(dir, 'state.json');
  let raw: string;
  try {
    raw = await fs.readFile(path, 'utf8');
  } catch {
    throw new SteerError(`Missing steer state: ${path}`);
  }
  try {
    return validateState(JSON.parse(raw), path);
  } catch (error) {
    if (error instanceof StateCorruptionError) throw error;
    throw new StateCorruptionError(path, error instanceof Error ? error.message : String(error));
  }
}

export async function writeState(dir: string, state: StateSnapshot): Promise<void> {
  await writeJsonAtomic(join(dir, 'state.json'), validateState(state, join(dir, 'state.json')));
}

export function appendHistory(state: StateSnapshot, action: string, detail?: string): StateSnapshot {
  return { ...state, history: [...state.history, { at: new Date().toISOString(), action, detail }] };
}
