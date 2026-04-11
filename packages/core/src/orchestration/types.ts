export type HarnessId = 'claude-code' | 'opencode' | 'codex';

export type HarnessAvailabilityStatus = 'available' | 'unavailable';

export interface OrchestrationTaskRef {
  taskId: string;
  title: string;
  description?: string;
  type?: string;
  priority?: string;
  priorityValue?: number;
  labels: string[];
  status?: string;
  affectedFiles: string[];
}

export interface HarnessAvailability {
  harness: HarnessId;
  status: HarnessAvailabilityStatus;
  reason?: string;
  command?: string;
}

export interface HarnessSelection {
  harness: HarnessId;
  ruleId: string;
  reason: string;
}

export type RunStatus =
  | 'pending'
  | 'routing'
  | 'claiming'
  | 'running'
  | 'completed'
  | 'failed'
  | 'handoff';

export interface HarnessLaunchRequest {
  harness: HarnessId;
  worktreePath: string;
  task: OrchestrationTaskRef;
  sessionId: string;
  prompt: string;
  timeoutMs: number;
}

export interface HarnessRunResult {
  status: 'completed' | 'failed' | 'handoff';
  summary: string;
  remainingWork?: string;
  nextWorker?: HarnessId;
  filesChanged: string[];
  error?: string;
  rawOutput?: string;
}

export interface OrchestrationRunRecord {
  runId: string;
  taskId: string;
  harness: HarnessId;
  status: RunStatus;
  startedAt: string;
  endedAt?: string;
  ruleId: string;
  reason: string;
  sessionId?: string;
  worktreePath?: string;
  summary?: string;
}
