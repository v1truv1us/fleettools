export type Phase = 'context' | 'spec' | 'spec-review' | 'plan' | 'plan-review' | 'tasks' | 'execute' | 'verify' | 'done';

export type TaskStatusValue = 'pending' | 'active' | 'verifying' | 'done' | 'failed' | 'done-pending-handoff';

export interface StateHistoryEntry {
  at: string;
  action: string;
  detail?: string;
}

export interface ReviewProgress {
  consecutive_passes: number;
  status: 'pending' | 'passed' | 'needs-resolve';
}

export interface StateSnapshot {
  phase: Phase;
  round: number;
  active_task?: string;
  tasks: string[];
  review: {
    spec: ReviewProgress;
    plan: ReviewProgress;
  };
  history: StateHistoryEntry[];
}

export interface ReviewIssue {
  severity: 'high' | 'medium' | 'low';
  description: string;
  location?: string;
}

export interface ReviewVerdict {
  status: 'pass' | 'issues';
  round: number;
  lens: 'ambiguity' | 'security-perf' | 'maintainability' | 'custom';
  issues: ReviewIssue[];
}

export interface TaskMetadata {
  id: string;
  slug: string;
  description: string;
  deps: string[];
}

export interface TaskStatusFile {
  id: string;
  status: TaskStatusValue;
  deps: string[];
  description: string;
  started_at?: string;
  completed_at?: string;
  base_ref?: string;
  handoff_id?: string;
  solo_task_id?: string;
  solo_status?: string;
}

export interface SteerConfig {
  review: {
    max_rounds: number;
    early_exit_on_pass_count: number;
  };
  verify_gate: {
    tests: {
      enabled: boolean;
      command: string;
      timeout_seconds: number;
    };
  };
}

export const defaultState = (): StateSnapshot => ({
  phase: 'context',
  round: 0,
  tasks: [],
  review: {
    spec: { consecutive_passes: 0, status: 'pending' },
    plan: { consecutive_passes: 0, status: 'pending' },
  },
  history: [],
});

export const defaultConfig: SteerConfig = {
  review: { max_rounds: 3, early_exit_on_pass_count: 2 },
  verify_gate: { tests: { enabled: true, command: 'bun test', timeout_seconds: 300 } },
};
