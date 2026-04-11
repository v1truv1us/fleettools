import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { HarnessRegistry } from '../harnesses/registry.js';
import type { SoloAdapter } from '../integrations/solo-adapter.js';
import { buildHarnessPrompt } from './prompt-builder.js';
import { ProjectionStore } from './projection-store.js';
import { resolveHarnessRoute } from './routing-engine.js';
import type { OrchestrationRunRecord, OrchestrationTaskRef } from './types.js';

export interface OrchestratorOptions {
  solo: SoloAdapter;
  routingConfig: {
    defaults: {
      harness: 'claude-code' | 'opencode' | 'codex';
      timeout_ms: number;
    };
    rules: Array<{
      id: string;
      when: Record<string, unknown>;
      select: {
        harness: 'claude-code' | 'opencode' | 'codex';
        timeout_ms?: number;
      };
    }>;
  };
  projectRoot?: string;
  registry?: HarnessRegistry;
}

export interface RunTaskOptions {
  harnessOverride?: 'claude-code' | 'opencode' | 'codex';
}

export class Orchestrator {
  private readonly solo: SoloAdapter;
  private readonly routingConfig: OrchestratorOptions['routingConfig'];
  private readonly registry: HarnessRegistry;
  private readonly store: ProjectionStore;
  private readonly projectRoot: string;

  constructor(options: OrchestratorOptions) {
    this.solo = options.solo;
    this.routingConfig = options.routingConfig;
    this.registry = options.registry ?? new HarnessRegistry();
    this.projectRoot = options.projectRoot ?? process.cwd();
    this.store = new ProjectionStore(this.projectRoot);
  }

  listRuns(): OrchestrationRunRecord[] {
    return this.store.list();
  }

  async runTask(taskId: string, options: RunTaskOptions = {}): Promise<OrchestrationRunRecord> {
    const task = await this.loadTask(taskId);
    const route = resolveHarnessRoute(task, this.routingConfig);
    const selectedHarness = options.harnessOverride ?? route.selection.harness;
    const adapter = this.registry.getAdapter(selectedHarness);

    if (!adapter) {
      throw new Error(`No harness adapter registered for ${selectedHarness}`);
    }

    const availability = await adapter.probeAvailability();
    if (availability.status !== 'available') {
      throw new Error(`Harness ${selectedHarness} unavailable: ${availability.reason ?? 'unknown error'}`);
    }

    const runId = randomUUID();
    const startedAt = new Date().toISOString();
    const baseRecord: OrchestrationRunRecord = {
      runId,
      taskId,
      harness: selectedHarness,
      status: 'claiming',
      startedAt,
      ruleId: options.harnessOverride ? 'manual-override' : route.selection.ruleId,
      reason: options.harnessOverride
        ? `Manual harness override selected '${selectedHarness}'`
        : route.selection.reason,
    };
    this.store.append(baseRecord);

    const session = await this.solo.startSession(taskId, selectedHarness);
    const worktreePath = resolve(this.projectRoot, session.worktreePath);

    this.store.append({
      ...baseRecord,
      status: 'running',
      sessionId: session.sessionId,
      worktreePath,
    });

    try {
      const result = await adapter.run({
        harness: selectedHarness,
        worktreePath,
        task,
        sessionId: session.sessionId,
        prompt: buildHarnessPrompt(task, session, selectedHarness),
        timeoutMs: route.timeoutMs,
      });

      if (result.status === 'handoff' && result.nextWorker) {
        await this.solo.createHandoff(taskId, {
          summary: result.summary,
          remainingWork: result.remainingWork ?? '',
          to: result.nextWorker,
          files: result.filesChanged,
        });
      } else if (result.status === 'completed') {
        await this.solo.endSession(taskId, 'completed', { files: result.filesChanged });
      } else {
        await this.solo.endSession(taskId, 'failed', {
          notes: result.error ?? result.summary,
          files: result.filesChanged,
        });
      }

      const finalRecord: OrchestrationRunRecord = {
        ...baseRecord,
        status: result.status,
        sessionId: session.sessionId,
        worktreePath,
        endedAt: new Date().toISOString(),
        summary: result.summary,
      };
      this.store.append(finalRecord);
      return finalRecord;
    } catch (error) {
      await this.solo.endSession(taskId, 'failed', {
        notes: error instanceof Error ? error.message : String(error),
      });
      const failedRecord: OrchestrationRunRecord = {
        ...baseRecord,
        status: 'failed',
        sessionId: session.sessionId,
        worktreePath,
        endedAt: new Date().toISOString(),
        summary: error instanceof Error ? error.message : String(error),
      };
      this.store.append(failedRecord);
      return failedRecord;
    }
  }

  private async loadTask(taskId: string): Promise<OrchestrationTaskRef> {
    const task = await this.solo.showTask(taskId);
    return {
      taskId,
      title: String(task.title ?? ''),
      description: typeof task.description === 'string' ? task.description : undefined,
      type: typeof task.type === 'string' ? task.type : undefined,
      priority: typeof task.priority === 'string' ? task.priority : undefined,
      priorityValue: typeof task.priority_value === 'number' ? task.priority_value : undefined,
      labels: Array.isArray(task.labels) ? task.labels.map(value => String(value)) : [],
      status: typeof task.status === 'string' ? task.status : undefined,
      affectedFiles: Array.isArray(task.affected_files) ? task.affected_files.map(value => String(value)) : [],
    };
  }
}
