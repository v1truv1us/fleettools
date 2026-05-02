export interface SoloSuccessEnvelope<T> {
  ok: true;
  data: T;
}

export interface SoloErrorPayload {
  code: string;
  message: string;
  retryable?: boolean;
  retry_hint?: string;
}

export interface SoloErrorEnvelope {
  ok: false;
  error: SoloErrorPayload;
}

export type SoloEnvelope<T> = SoloSuccessEnvelope<T> | SoloErrorEnvelope;

export interface SoloTaskListItem {
  id: string;
  title: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: string;
  priority_value?: number;
  labels?: string[];
  affected_files?: string[];
}

export interface SoloTaskListData {
  tasks: SoloTaskListItem[];
  total?: number;
  limit?: number;
  offset?: number;
}

export interface SoloTaskShowData {
  task?: Record<string, unknown>;
  dependencies?: Array<Record<string, unknown>>;
  active_reservation?: Record<string, unknown> | null;
  session_count?: number;
}

export interface SoloCreateTaskInput {
  title: string;
  type?: string;
  priority?: string | number;
  description?: string;
  acceptanceCriteria?: string;
  definitionOfDone?: string;
  parent?: string;
  labels?: string[];
  affectedFiles?: string[];
  deps?: string[];
}

export interface SoloCreatedTask {
  id: string;
  title: string;
  type: string;
  status: string;
  status_legacy?: string;
  priority: string;
  priority_value?: number;
  version: number;
  created_at: string;
}

export interface SoloTaskCreateData {
  task?: SoloCreatedTask;
}

export interface SoloSessionStartData {
  session_id: string;
  reservation_id: string;
  reservation_token?: string;
  worktree_path: string;
  branch?: string;
  expires_at?: string;
  context: Record<string, unknown>;
}
