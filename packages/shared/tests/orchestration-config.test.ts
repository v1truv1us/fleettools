import { describe, expect, it } from 'bun:test';
import {
  getDefaultRoutingConfig,
  validateRoutingConfig,
} from '../src/orchestration-config.js';

describe('orchestration config', () => {
  it('returns sensible defaults', () => {
    const config = getDefaultRoutingConfig();

    expect(config.version).toBe(1);
    expect(config.defaults.harness).toBe('claude-code');
    expect(config.defaults.timeout_ms).toBe(1800000);
    expect(config.rules).toEqual([]);
  });

  it('validates a routing config with rules', () => {
    const config = validateRoutingConfig({
      version: 1,
      defaults: {
        harness: 'claude-code',
        timeout_ms: 1800000,
      },
      rules: [
        {
          id: 'solo-backend',
          when: {
            labels: ['backend'],
            priority: ['high', 'critical'],
          },
          select: {
            harness: 'claude-code',
            timeout_ms: 600000,
          },
        },
      ],
    });

    expect(config.rules).toHaveLength(1);
    expect(config.rules[0]?.id).toBe('solo-backend');
    expect(config.rules[0]?.select.harness).toBe('claude-code');
  });

  it('rejects invalid harness values', () => {
    expect(() => validateRoutingConfig({
      defaults: {
        harness: 'unknown',
      },
    })).toThrow("Invalid default harness 'unknown'");
  });
});
