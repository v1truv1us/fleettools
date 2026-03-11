export declare const VERSION = "0.1.0";
export declare const TTL: {
    readonly RESERVATION: number;
    readonly LOCK: number;
    readonly SESSION: number;
    readonly OPERATION: number;
};
export declare const IMPORTANCE: {
    readonly LOW: "low";
    readonly NORMAL: "normal";
    readonly HIGH: "high";
    readonly URGENT: "urgent";
};
export type Importance = typeof IMPORTANCE[keyof typeof IMPORTANCE];
export declare const SORTIE_STATUS: {
    readonly OPEN: "open";
    readonly IN_PROGRESS: "in_progress";
    readonly BLOCKED: "blocked";
    readonly CLOSED: "closed";
};
export type SortieStatus = typeof SORTIE_STATUS[keyof typeof SORTIE_STATUS];
export declare const MISSION_STATUS: {
    readonly PENDING: "pending";
    readonly IN_PROGRESS: "in_progress";
    readonly COMPLETED: "completed";
};
export type MissionStatus = typeof MISSION_STATUS[keyof typeof MISSION_STATUS];
export declare const PRIORITY: {
    readonly CRITICAL: 0;
    readonly HIGH: 1;
    readonly MEDIUM: 2;
    readonly LOW: 3;
};
export type Priority = typeof PRIORITY[keyof typeof PRIORITY];
export declare const EVENT_CATEGORIES: {
    readonly PILOT: readonly ["pilot_registered", "pilot_active", "pilot_deregistered"];
    readonly MESSAGE: readonly ["message_sent", "message_read", "message_acked", "thread_created", "thread_activity"];
    readonly RESERVATION: readonly ["file_reserved", "file_released", "file_conflict"];
    readonly SORTIE: readonly ["sortie_created", "sortie_started", "sortie_progress", "sortie_completed", "sortie_blocked", "sortie_status_changed"];
    readonly MISSION: readonly ["mission_created", "mission_started", "mission_completed", "mission_synced"];
    readonly CHECKPOINT: readonly ["checkpoint_created", "context_compacted", "fleet_recovered", "context_injected"];
    readonly COORDINATION: readonly ["coordinator_decision", "coordinator_violation", "pilot_spawned", "pilot_completed", "review_started", "review_completed"];
};
export declare const PROGRAM_TYPE: {
    readonly OPENCODE: "opencode";
    readonly CLAUDE: "claude";
    readonly STANDALONE: "standalone";
    readonly UNKNOWN: "unknown";
};
export type ProgramType = typeof PROGRAM_TYPE[keyof typeof PROGRAM_TYPE];
export declare const DB_FILENAME = "fleet.db";
export declare const FLEET_DIR = ".fleet";
export declare const MAX_QUERY_RESULTS = 1000;
export declare const COMPACTION_THRESHOLD = 10000;
export declare const CHECKPOINT_TRIGGER: {
    readonly AUTO: "auto";
    readonly MANUAL: "manual";
    readonly ERROR: "error";
    readonly CONTEXT_LIMIT: "context_limit";
};
export type CheckpointTrigger = typeof CHECKPOINT_TRIGGER[keyof typeof CHECKPOINT_TRIGGER];
//# sourceMappingURL=constants.d.ts.map