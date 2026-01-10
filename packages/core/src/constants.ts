export const VERSION = '0.1.0';

export const TTL = {
  RESERVATION: 60 * 60 * 1000,
  LOCK: 5 * 60 * 1000,
  SESSION: 24 * 60 * 60 * 1000,
  OPERATION: 30 * 1000,
} as const;

export const IMPORTANCE = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type Importance = typeof IMPORTANCE[keyof typeof IMPORTANCE];

export const SORTIE_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  CLOSED: 'closed',
} as const;

export type SortieStatus = typeof SORTIE_STATUS[keyof typeof SORTIE_STATUS];

export const MISSION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export type MissionStatus = typeof MISSION_STATUS[keyof typeof MISSION_STATUS];

export const PRIORITY = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
} as const;

export type Priority = typeof PRIORITY[keyof typeof PRIORITY];

export const EVENT_CATEGORIES = {
  PILOT: ['pilot_registered', 'pilot_active', 'pilot_deregistered'],
  MESSAGE: ['message_sent', 'message_read', 'message_acked', 'thread_created', 'thread_activity'],
  RESERVATION: ['file_reserved', 'file_released', 'file_conflict'],
  SORTIE: ['sortie_created', 'sortie_started', 'sortie_progress', 'sortie_completed', 'sortie_blocked', 'sortie_status_changed'],
  MISSION: ['mission_created', 'mission_started', 'mission_completed', 'mission_synced'],
  CHECKPOINT: ['checkpoint_created', 'context_compacted', 'fleet_recovered', 'context_injected'],
  COORDINATION: ['coordinator_decision', 'coordinator_violation', 'pilot_spawned', 'pilot_completed', 'review_started', 'review_completed'],
} as const;

export const PROGRAM_TYPE = {
  OPENCODE: 'opencode',
  CLAUDE: 'claude',
  STANDALONE: 'standalone',
  UNKNOWN: 'unknown',
} as const;

export type ProgramType = typeof PROGRAM_TYPE[keyof typeof PROGRAM_TYPE];

export const DB_FILENAME = 'fleet.db';

export const FLEET_DIR = '.fleet';

export const MAX_QUERY_RESULTS = 1000;

export const COMPACTION_THRESHOLD = 10000;

export const CHECKPOINT_TRIGGER = {
  AUTO: 'auto',
  MANUAL: 'manual',
  ERROR: 'error',
  CONTEXT_LIMIT: 'context_limit',
} as const;

export type CheckpointTrigger = typeof CHECKPOINT_TRIGGER[keyof typeof CHECKPOINT_TRIGGER];
