import type { HarnessAvailability, HarnessId } from '../orchestration/types.js';
import type { HarnessAdapter } from './types.js';
import { ClaudeCodeHarnessAdapter } from './claude-code.js';
import { OpenCodeHarnessAdapter } from './opencode.js';
import { CodexHarnessAdapter } from './codex.js';

export class HarnessRegistry {
  private readonly adapters: Map<HarnessId, HarnessAdapter>;

  constructor(adapters?: HarnessAdapter[]) {
    const defaults = adapters ?? [
      new ClaudeCodeHarnessAdapter(),
      new OpenCodeHarnessAdapter(),
      new CodexHarnessAdapter(),
    ];
    this.adapters = new Map(defaults.map(adapter => [adapter.id, adapter]));
  }

  getAdapter(id: HarnessId): HarnessAdapter | undefined {
    return this.adapters.get(id);
  }

  async getAvailability(): Promise<HarnessAvailability[]> {
    return Promise.all(Array.from(this.adapters.values()).map(adapter => adapter.probeAvailability()));
  }
}
