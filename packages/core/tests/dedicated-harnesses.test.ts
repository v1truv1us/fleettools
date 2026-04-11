import { describe, expect, it } from 'bun:test';
import { CodexHarnessAdapter, OpenCodeHarnessAdapter } from '../src/index.js';

describe('dedicated harness adapters', () => {
  it('creates an OpenCode adapter with the expected id', async () => {
    const adapter = new OpenCodeHarnessAdapter();
    expect(adapter.id).toBe('opencode');
  });

  it('creates a Codex adapter with the expected id', async () => {
    const adapter = new CodexHarnessAdapter();
    expect(adapter.id).toBe('codex');
  });
});
