import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import YAML from 'yaml';
import { defaultConfig, SteerConfig } from './types.js';
import { pathExists } from './fs.js';

function mergeConfig(base: SteerConfig, patch: any): SteerConfig {
  return {
    review: {
      max_rounds: Number(patch?.review?.max_rounds ?? base.review.max_rounds),
      early_exit_on_pass_count: Number(patch?.review?.early_exit_on_pass_count ?? base.review.early_exit_on_pass_count),
    },
    verify_gate: {
      tests: {
        enabled: patch?.verify_gate?.tests?.enabled ?? base.verify_gate.tests.enabled,
        command: String(patch?.verify_gate?.tests?.command ?? base.verify_gate.tests.command),
        timeout_seconds: Number(patch?.verify_gate?.tests?.timeout_seconds ?? base.verify_gate.tests.timeout_seconds),
      },
    },
  };
}

export async function loadSteerConfig(projectRoot = process.cwd()): Promise<SteerConfig> {
  const candidates = [join(projectRoot, '.steer', 'config.yaml'), join(homedir(), '.config', 'fleet', 'steer.yaml')];
  let config = defaultConfig;
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      const parsed = YAML.parse(await fs.readFile(candidate, 'utf8')) ?? {};
      config = mergeConfig(config, parsed);
      break;
    }
  }
  return config;
}
