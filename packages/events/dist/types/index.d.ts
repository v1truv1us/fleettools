/**
 * FleetTools Event Types Index
 *
 * Main event type exports and discriminated union for all FleetTools events.
 */
import { z } from 'zod';
import { PilotRegisteredSchema, PilotActiveSchema, PilotDeregisteredSchema } from './pilots.js';
import { MessageSentSchema, MessageReadSchema, MessageAcknowledgedSchema, MessageUpdatedSchema, MessageDeletedSchema } from './messages.js';
import { FileReservedSchema, FileReleasedSchema, FileConflictSchema } from './reservations.js';
import { SortieCreatedSchema, SortieStartedSchema, SortieCompletedSchema, SortieBlockedSchema, SortieResumedSchema, SortieUpdatedSchema } from './sorties.js';
import { MissionCreatedSchema, MissionStartedSchema, MissionCompletedSchema, MissionUpdatedSchema } from './missions.js';
import { CheckpointCreatedSchema, ContextCompactedSchema, CheckpointRestoredSchema, CheckpointDeletedSchema } from './checkpoints.js';
import { CoordinatorDecisionSchema, PilotSpawnedSchema, PilotTerminatedSchema, LockAcquiredSchema, LockReleasedSchema, CursorMovedSchema } from './coordination.js';
export { PilotRegisteredSchema, PilotActiveSchema, PilotDeregisteredSchema, MessageSentSchema, MessageReadSchema, MessageAcknowledgedSchema, MessageUpdatedSchema, MessageDeletedSchema, FileReservedSchema, FileReleasedSchema, FileConflictSchema, SortieCreatedSchema, SortieStartedSchema, SortieCompletedSchema, SortieBlockedSchema, SortieResumedSchema, SortieUpdatedSchema, MissionCreatedSchema, MissionStartedSchema, MissionCompletedSchema, MissionUpdatedSchema, CheckpointCreatedSchema, ContextCompactedSchema, CheckpointRestoredSchema, CheckpointDeletedSchema, CoordinatorDecisionSchema, PilotSpawnedSchema, PilotTerminatedSchema, LockAcquiredSchema, LockReleasedSchema, CursorMovedSchema, };
export declare const FleetEventSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"pilot_registered">;
    data: z.ZodObject<{
        callsign: z.ZodString;
        program: z.ZodEnum<["opencode", "claude-code", "custom"]>;
        model: z.ZodString;
        task_description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        callsign?: string;
        program?: "custom" | "opencode" | "claude-code";
        model?: string;
        task_description?: string;
    }, {
        callsign?: string;
        program?: "custom" | "opencode" | "claude-code";
        model?: string;
        task_description?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "pilot_registered";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        program?: "custom" | "opencode" | "claude-code";
        model?: string;
        task_description?: string;
    };
}, {
    type?: "pilot_registered";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        program?: "custom" | "opencode" | "claude-code";
        model?: string;
        task_description?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"pilot_active">;
    data: z.ZodObject<{
        callsign: z.ZodString;
        status: z.ZodEnum<["active", "idle", "busy"]>;
        current_task: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status?: "active" | "idle" | "busy";
        callsign?: string;
        current_task?: string;
    }, {
        status?: "active" | "idle" | "busy";
        callsign?: string;
        current_task?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "pilot_active";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        status?: "active" | "idle" | "busy";
        callsign?: string;
        current_task?: string;
    };
}, {
    type?: "pilot_active";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        status?: "active" | "idle" | "busy";
        callsign?: string;
        current_task?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"pilot_deregistered">;
    data: z.ZodObject<{
        callsign: z.ZodString;
        reason: z.ZodEnum<["completed", "error", "timeout", "manual"]>;
        final_status: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        callsign?: string;
        reason?: "completed" | "error" | "timeout" | "manual";
        final_status?: string;
    }, {
        callsign?: string;
        reason?: "completed" | "error" | "timeout" | "manual";
        final_status?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "pilot_deregistered";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        reason?: "completed" | "error" | "timeout" | "manual";
        final_status?: string;
    };
}, {
    type?: "pilot_deregistered";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        reason?: "completed" | "error" | "timeout" | "manual";
        final_status?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"message_sent">;
    data: z.ZodObject<{
        from_callsign: z.ZodString;
        to_callsigns: z.ZodArray<z.ZodString, "many">;
        subject: z.ZodString;
        body: z.ZodString;
        thread_id: z.ZodOptional<z.ZodString>;
        importance: z.ZodDefault<z.ZodEnum<["low", "normal", "high", "critical"]>>;
        ack_required: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        from_callsign?: string;
        to_callsigns?: string[];
        subject?: string;
        body?: string;
        thread_id?: string;
        importance?: "low" | "normal" | "high" | "critical";
        ack_required?: boolean;
    }, {
        from_callsign?: string;
        to_callsigns?: string[];
        subject?: string;
        body?: string;
        thread_id?: string;
        importance?: "low" | "normal" | "high" | "critical";
        ack_required?: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "message_sent";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        from_callsign?: string;
        to_callsigns?: string[];
        subject?: string;
        body?: string;
        thread_id?: string;
        importance?: "low" | "normal" | "high" | "critical";
        ack_required?: boolean;
    };
}, {
    type?: "message_sent";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        from_callsign?: string;
        to_callsigns?: string[];
        subject?: string;
        body?: string;
        thread_id?: string;
        importance?: "low" | "normal" | "high" | "critical";
        ack_required?: boolean;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"message_read">;
    data: z.ZodObject<{
        message_id: z.ZodString;
        callsign: z.ZodString;
        read_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        callsign?: string;
        message_id?: string;
        read_at?: string;
    }, {
        callsign?: string;
        message_id?: string;
        read_at?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "message_read";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        message_id?: string;
        read_at?: string;
    };
}, {
    type?: "message_read";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        message_id?: string;
        read_at?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"message_acknowledged">;
    data: z.ZodObject<{
        message_id: z.ZodString;
        callsign: z.ZodString;
        acknowledged_at: z.ZodString;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        callsign?: string;
        message_id?: string;
        acknowledged_at?: string;
        notes?: string;
    }, {
        callsign?: string;
        message_id?: string;
        acknowledged_at?: string;
        notes?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "message_acknowledged";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        message_id?: string;
        acknowledged_at?: string;
        notes?: string;
    };
}, {
    type?: "message_acknowledged";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        message_id?: string;
        acknowledged_at?: string;
        notes?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"message_updated">;
    data: z.ZodObject<{
        message_id: z.ZodString;
        updated_by: z.ZodString;
        changes: z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            old_value: z.ZodUnknown;
            new_value: z.ZodUnknown;
        }, "strip", z.ZodTypeAny, {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }, {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        message_id?: string;
        updated_by?: string;
        changes?: {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
    }, {
        message_id?: string;
        updated_by?: string;
        changes?: {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "message_updated";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        message_id?: string;
        updated_by?: string;
        changes?: {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
    };
}, {
    type?: "message_updated";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        message_id?: string;
        updated_by?: string;
        changes?: {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"message_deleted">;
    data: z.ZodObject<{
        message_id: z.ZodString;
        deleted_by: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        reason?: string;
        message_id?: string;
        deleted_by?: string;
    }, {
        reason?: string;
        message_id?: string;
        deleted_by?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "message_deleted";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        reason?: string;
        message_id?: string;
        deleted_by?: string;
    };
}, {
    type?: "message_deleted";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        reason?: string;
        message_id?: string;
        deleted_by?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"file_reserved">;
    data: z.ZodObject<{
        callsign: z.ZodString;
        path_pattern: z.ZodString;
        exclusive: z.ZodDefault<z.ZodBoolean>;
        reason: z.ZodOptional<z.ZodString>;
        ttl_seconds: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        callsign?: string;
        reason?: string;
        path_pattern?: string;
        exclusive?: boolean;
        ttl_seconds?: number;
    }, {
        callsign?: string;
        reason?: string;
        path_pattern?: string;
        exclusive?: boolean;
        ttl_seconds?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "file_reserved";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        reason?: string;
        path_pattern?: string;
        exclusive?: boolean;
        ttl_seconds?: number;
    };
}, {
    type?: "file_reserved";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        reason?: string;
        path_pattern?: string;
        exclusive?: boolean;
        ttl_seconds?: number;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"file_released">;
    data: z.ZodObject<{
        callsign: z.ZodString;
        path_pattern: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
        released_by: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        callsign?: string;
        reason?: string;
        path_pattern?: string;
        released_by?: string;
    }, {
        callsign?: string;
        reason?: string;
        path_pattern?: string;
        released_by?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "file_released";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        reason?: string;
        path_pattern?: string;
        released_by?: string;
    };
}, {
    type?: "file_released";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        reason?: string;
        path_pattern?: string;
        released_by?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"file_conflict">;
    data: z.ZodObject<{
        callsign: z.ZodString;
        path_pattern: z.ZodString;
        conflicting_callsign: z.ZodString;
        conflict_type: z.ZodEnum<["exclusive_violation", "pattern_overlap", "timeout"]>;
        resolved: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        callsign?: string;
        path_pattern?: string;
        conflicting_callsign?: string;
        conflict_type?: "timeout" | "exclusive_violation" | "pattern_overlap";
        resolved?: boolean;
    }, {
        callsign?: string;
        path_pattern?: string;
        conflicting_callsign?: string;
        conflict_type?: "timeout" | "exclusive_violation" | "pattern_overlap";
        resolved?: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "file_conflict";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        path_pattern?: string;
        conflicting_callsign?: string;
        conflict_type?: "timeout" | "exclusive_violation" | "pattern_overlap";
        resolved?: boolean;
    };
}, {
    type?: "file_conflict";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        path_pattern?: string;
        conflicting_callsign?: string;
        conflict_type?: "timeout" | "exclusive_violation" | "pattern_overlap";
        resolved?: boolean;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"sortie_created">;
    data: z.ZodObject<{
        sortie_id: z.ZodString;
        mission_id: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical"]>>;
        assigned_to: z.ZodOptional<z.ZodString>;
        files: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        estimated_hours: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        sortie_id?: string;
        mission_id?: string;
        title?: string;
        priority?: "low" | "high" | "critical" | "medium";
        assigned_to?: string;
        files?: string[];
        estimated_hours?: number;
    }, {
        description?: string;
        sortie_id?: string;
        mission_id?: string;
        title?: string;
        priority?: "low" | "high" | "critical" | "medium";
        assigned_to?: string;
        files?: string[];
        estimated_hours?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "sortie_created";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        description?: string;
        sortie_id?: string;
        mission_id?: string;
        title?: string;
        priority?: "low" | "high" | "critical" | "medium";
        assigned_to?: string;
        files?: string[];
        estimated_hours?: number;
    };
}, {
    type?: "sortie_created";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        description?: string;
        sortie_id?: string;
        mission_id?: string;
        title?: string;
        priority?: "low" | "high" | "critical" | "medium";
        assigned_to?: string;
        files?: string[];
        estimated_hours?: number;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"sortie_started">;
    data: z.ZodObject<{
        sortie_id: z.ZodString;
        started_by: z.ZodString;
        started_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        sortie_id?: string;
        started_by?: string;
        started_at?: string;
    }, {
        sortie_id?: string;
        started_by?: string;
        started_at?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "sortie_started";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        sortie_id?: string;
        started_by?: string;
        started_at?: string;
    };
}, {
    type?: "sortie_started";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        sortie_id?: string;
        started_by?: string;
        started_at?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"sortie_completed">;
    data: z.ZodObject<{
        sortie_id: z.ZodString;
        completed_by: z.ZodString;
        completed_at: z.ZodString;
        result: z.ZodEnum<["success", "partial", "failed"]>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        notes?: string;
        sortie_id?: string;
        completed_by?: string;
        completed_at?: string;
        result?: "partial" | "success" | "failed";
    }, {
        notes?: string;
        sortie_id?: string;
        completed_by?: string;
        completed_at?: string;
        result?: "partial" | "success" | "failed";
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "sortie_completed";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        notes?: string;
        sortie_id?: string;
        completed_by?: string;
        completed_at?: string;
        result?: "partial" | "success" | "failed";
    };
}, {
    type?: "sortie_completed";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        notes?: string;
        sortie_id?: string;
        completed_by?: string;
        completed_at?: string;
        result?: "partial" | "success" | "failed";
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"sortie_blocked">;
    data: z.ZodObject<{
        sortie_id: z.ZodString;
        blocked_by: z.ZodString;
        blocked_reason: z.ZodString;
        blocked_at: z.ZodString;
        blocked_by_callsign: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sortie_id?: string;
        blocked_by?: string;
        blocked_reason?: string;
        blocked_at?: string;
        blocked_by_callsign?: string;
    }, {
        sortie_id?: string;
        blocked_by?: string;
        blocked_reason?: string;
        blocked_at?: string;
        blocked_by_callsign?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "sortie_blocked";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        sortie_id?: string;
        blocked_by?: string;
        blocked_reason?: string;
        blocked_at?: string;
        blocked_by_callsign?: string;
    };
}, {
    type?: "sortie_blocked";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        sortie_id?: string;
        blocked_by?: string;
        blocked_reason?: string;
        blocked_at?: string;
        blocked_by_callsign?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"sortie_resumed">;
    data: z.ZodObject<{
        sortie_id: z.ZodString;
        resumed_by: z.ZodString;
        resumed_at: z.ZodString;
        previous_state: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        sortie_id?: string;
        resumed_by?: string;
        resumed_at?: string;
        previous_state?: string;
    }, {
        sortie_id?: string;
        resumed_by?: string;
        resumed_at?: string;
        previous_state?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "sortie_resumed";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        sortie_id?: string;
        resumed_by?: string;
        resumed_at?: string;
        previous_state?: string;
    };
}, {
    type?: "sortie_resumed";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        sortie_id?: string;
        resumed_by?: string;
        resumed_at?: string;
        previous_state?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"sortie_updated">;
    data: z.ZodObject<{
        sortie_id: z.ZodString;
        updated_by: z.ZodString;
        updated_at: z.ZodString;
        changes: z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            old_value: z.ZodUnknown;
            new_value: z.ZodUnknown;
        }, "strip", z.ZodTypeAny, {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }, {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        updated_by?: string;
        changes?: {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        sortie_id?: string;
        updated_at?: string;
    }, {
        updated_by?: string;
        changes?: {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        sortie_id?: string;
        updated_at?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "sortie_updated";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        updated_by?: string;
        changes?: {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        sortie_id?: string;
        updated_at?: string;
    };
}, {
    type?: "sortie_updated";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        updated_by?: string;
        changes?: {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        sortie_id?: string;
        updated_at?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"mission_created">;
    data: z.ZodObject<{
        mission_id: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical"]>>;
        estimated_duration_hours: z.ZodOptional<z.ZodNumber>;
        created_by: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        mission_id?: string;
        title?: string;
        priority?: "low" | "high" | "critical" | "medium";
        estimated_duration_hours?: number;
        created_by?: string;
    }, {
        description?: string;
        mission_id?: string;
        title?: string;
        priority?: "low" | "high" | "critical" | "medium";
        estimated_duration_hours?: number;
        created_by?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "mission_created";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        description?: string;
        mission_id?: string;
        title?: string;
        priority?: "low" | "high" | "critical" | "medium";
        estimated_duration_hours?: number;
        created_by?: string;
    };
}, {
    type?: "mission_created";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        description?: string;
        mission_id?: string;
        title?: string;
        priority?: "low" | "high" | "critical" | "medium";
        estimated_duration_hours?: number;
        created_by?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"mission_started">;
    data: z.ZodObject<{
        mission_id: z.ZodString;
        started_by: z.ZodString;
        started_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        mission_id?: string;
        started_by?: string;
        started_at?: string;
    }, {
        mission_id?: string;
        started_by?: string;
        started_at?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "mission_started";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        mission_id?: string;
        started_by?: string;
        started_at?: string;
    };
}, {
    type?: "mission_started";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        mission_id?: string;
        started_by?: string;
        started_at?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"mission_completed">;
    data: z.ZodObject<{
        mission_id: z.ZodString;
        completed_by: z.ZodString;
        completed_at: z.ZodString;
        result: z.ZodEnum<["success", "partial", "failed"]>;
        summary: z.ZodOptional<z.ZodString>;
        metrics: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        mission_id?: string;
        completed_by?: string;
        completed_at?: string;
        result?: "partial" | "success" | "failed";
        summary?: string;
        metrics?: Record<string, number>;
    }, {
        mission_id?: string;
        completed_by?: string;
        completed_at?: string;
        result?: "partial" | "success" | "failed";
        summary?: string;
        metrics?: Record<string, number>;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "mission_completed";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        mission_id?: string;
        completed_by?: string;
        completed_at?: string;
        result?: "partial" | "success" | "failed";
        summary?: string;
        metrics?: Record<string, number>;
    };
}, {
    type?: "mission_completed";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        mission_id?: string;
        completed_by?: string;
        completed_at?: string;
        result?: "partial" | "success" | "failed";
        summary?: string;
        metrics?: Record<string, number>;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"mission_updated">;
    data: z.ZodObject<{
        mission_id: z.ZodString;
        updated_by: z.ZodString;
        updated_at: z.ZodString;
        changes: z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            old_value: z.ZodUnknown;
            new_value: z.ZodUnknown;
        }, "strip", z.ZodTypeAny, {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }, {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        updated_by?: string;
        changes?: {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        mission_id?: string;
        updated_at?: string;
    }, {
        updated_by?: string;
        changes?: {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        mission_id?: string;
        updated_at?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "mission_updated";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        updated_by?: string;
        changes?: {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        mission_id?: string;
        updated_at?: string;
    };
}, {
    type?: "mission_updated";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        updated_by?: string;
        changes?: {
            field?: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        mission_id?: string;
        updated_at?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"checkpoint_created">;
    data: z.ZodObject<{
        checkpoint_id: z.ZodString;
        mission_id: z.ZodOptional<z.ZodString>;
        sortie_id: z.ZodOptional<z.ZodString>;
        callsign: z.ZodString;
        trigger: z.ZodString;
        progress_percent: z.ZodOptional<z.ZodNumber>;
        summary: z.ZodOptional<z.ZodString>;
        context_data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        callsign?: string;
        sortie_id?: string;
        mission_id?: string;
        summary?: string;
        checkpoint_id?: string;
        trigger?: string;
        progress_percent?: number;
        context_data?: Record<string, unknown>;
    }, {
        callsign?: string;
        sortie_id?: string;
        mission_id?: string;
        summary?: string;
        checkpoint_id?: string;
        trigger?: string;
        progress_percent?: number;
        context_data?: Record<string, unknown>;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "checkpoint_created";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        sortie_id?: string;
        mission_id?: string;
        summary?: string;
        checkpoint_id?: string;
        trigger?: string;
        progress_percent?: number;
        context_data?: Record<string, unknown>;
    };
}, {
    type?: "checkpoint_created";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        sortie_id?: string;
        mission_id?: string;
        summary?: string;
        checkpoint_id?: string;
        trigger?: string;
        progress_percent?: number;
        context_data?: Record<string, unknown>;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"context_compacted">;
    data: z.ZodObject<{
        checkpoint_id: z.ZodString;
        compacted_by: z.ZodString;
        original_size: z.ZodNumber;
        compacted_size: z.ZodNumber;
        compression_ratio: z.ZodNumber;
        compacted_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        checkpoint_id?: string;
        compacted_by?: string;
        original_size?: number;
        compacted_size?: number;
        compression_ratio?: number;
        compacted_at?: string;
    }, {
        checkpoint_id?: string;
        compacted_by?: string;
        original_size?: number;
        compacted_size?: number;
        compression_ratio?: number;
        compacted_at?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "context_compacted";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        checkpoint_id?: string;
        compacted_by?: string;
        original_size?: number;
        compacted_size?: number;
        compression_ratio?: number;
        compacted_at?: string;
    };
}, {
    type?: "context_compacted";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        checkpoint_id?: string;
        compacted_by?: string;
        original_size?: number;
        compacted_size?: number;
        compression_ratio?: number;
        compacted_at?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"checkpoint_restored">;
    data: z.ZodObject<{
        checkpoint_id: z.ZodString;
        restored_by: z.ZodString;
        restored_at: z.ZodString;
        restore_target: z.ZodString;
        success: z.ZodBoolean;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        notes?: string;
        success?: boolean;
        checkpoint_id?: string;
        restored_by?: string;
        restored_at?: string;
        restore_target?: string;
    }, {
        notes?: string;
        success?: boolean;
        checkpoint_id?: string;
        restored_by?: string;
        restored_at?: string;
        restore_target?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "checkpoint_restored";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        notes?: string;
        success?: boolean;
        checkpoint_id?: string;
        restored_by?: string;
        restored_at?: string;
        restore_target?: string;
    };
}, {
    type?: "checkpoint_restored";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        notes?: string;
        success?: boolean;
        checkpoint_id?: string;
        restored_by?: string;
        restored_at?: string;
        restore_target?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"checkpoint_deleted">;
    data: z.ZodObject<{
        checkpoint_id: z.ZodString;
        deleted_by: z.ZodString;
        deleted_at: z.ZodString;
        reason: z.ZodEnum<["expired", "manual", "cleanup"]>;
    }, "strip", z.ZodTypeAny, {
        reason?: "manual" | "expired" | "cleanup";
        deleted_by?: string;
        checkpoint_id?: string;
        deleted_at?: string;
    }, {
        reason?: "manual" | "expired" | "cleanup";
        deleted_by?: string;
        checkpoint_id?: string;
        deleted_at?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "checkpoint_deleted";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        reason?: "manual" | "expired" | "cleanup";
        deleted_by?: string;
        checkpoint_id?: string;
        deleted_at?: string;
    };
}, {
    type?: "checkpoint_deleted";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        reason?: "manual" | "expired" | "cleanup";
        deleted_by?: string;
        checkpoint_id?: string;
        deleted_at?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"coordinator_decision">;
    data: z.ZodObject<{
        decision_id: z.ZodString;
        coordinator: z.ZodString;
        decision_type: z.ZodEnum<["pilot_assignment", "task_priority", "resource_allocation", "conflict_resolution"]>;
        context: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        decision: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        confidence: z.ZodNumber;
        reasoning: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        decision_id?: string;
        coordinator?: string;
        decision_type?: "pilot_assignment" | "task_priority" | "resource_allocation" | "conflict_resolution";
        context?: Record<string, unknown>;
        decision?: Record<string, unknown>;
        confidence?: number;
        reasoning?: string;
    }, {
        decision_id?: string;
        coordinator?: string;
        decision_type?: "pilot_assignment" | "task_priority" | "resource_allocation" | "conflict_resolution";
        context?: Record<string, unknown>;
        decision?: Record<string, unknown>;
        confidence?: number;
        reasoning?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "coordinator_decision";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        decision_id?: string;
        coordinator?: string;
        decision_type?: "pilot_assignment" | "task_priority" | "resource_allocation" | "conflict_resolution";
        context?: Record<string, unknown>;
        decision?: Record<string, unknown>;
        confidence?: number;
        reasoning?: string;
    };
}, {
    type?: "coordinator_decision";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        decision_id?: string;
        coordinator?: string;
        decision_type?: "pilot_assignment" | "task_priority" | "resource_allocation" | "conflict_resolution";
        context?: Record<string, unknown>;
        decision?: Record<string, unknown>;
        confidence?: number;
        reasoning?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"pilot_spawned">;
    data: z.ZodObject<{
        callsign: z.ZodString;
        program: z.ZodEnum<["opencode", "claude-code", "custom"]>;
        model: z.ZodString;
        spawned_by: z.ZodString;
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        callsign?: string;
        program?: "custom" | "opencode" | "claude-code";
        model?: string;
        spawned_by?: string;
        config?: Record<string, unknown>;
    }, {
        callsign?: string;
        program?: "custom" | "opencode" | "claude-code";
        model?: string;
        spawned_by?: string;
        config?: Record<string, unknown>;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "pilot_spawned";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        program?: "custom" | "opencode" | "claude-code";
        model?: string;
        spawned_by?: string;
        config?: Record<string, unknown>;
    };
}, {
    type?: "pilot_spawned";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        program?: "custom" | "opencode" | "claude-code";
        model?: string;
        spawned_by?: string;
        config?: Record<string, unknown>;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"pilot_terminated">;
    data: z.ZodObject<{
        callsign: z.ZodString;
        terminated_by: z.ZodString;
        reason: z.ZodEnum<["completed", "error", "timeout", "manual", "resource_limit"]>;
        exit_code: z.ZodOptional<z.ZodNumber>;
        final_state: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        callsign?: string;
        reason?: "completed" | "error" | "timeout" | "manual" | "resource_limit";
        terminated_by?: string;
        exit_code?: number;
        final_state?: Record<string, unknown>;
    }, {
        callsign?: string;
        reason?: "completed" | "error" | "timeout" | "manual" | "resource_limit";
        terminated_by?: string;
        exit_code?: number;
        final_state?: Record<string, unknown>;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "pilot_terminated";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        reason?: "completed" | "error" | "timeout" | "manual" | "resource_limit";
        terminated_by?: string;
        exit_code?: number;
        final_state?: Record<string, unknown>;
    };
}, {
    type?: "pilot_terminated";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        callsign?: string;
        reason?: "completed" | "error" | "timeout" | "manual" | "resource_limit";
        terminated_by?: string;
        exit_code?: number;
        final_state?: Record<string, unknown>;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"lock_acquired">;
    data: z.ZodObject<{
        lock_key: z.ZodString;
        holder_id: z.ZodString;
        lock_type: z.ZodEnum<["exclusive", "shared"]>;
        ttl_seconds: z.ZodNumber;
        acquired_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        ttl_seconds?: number;
        lock_key?: string;
        holder_id?: string;
        lock_type?: "exclusive" | "shared";
        acquired_at?: string;
    }, {
        ttl_seconds?: number;
        lock_key?: string;
        holder_id?: string;
        lock_type?: "exclusive" | "shared";
        acquired_at?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "lock_acquired";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        ttl_seconds?: number;
        lock_key?: string;
        holder_id?: string;
        lock_type?: "exclusive" | "shared";
        acquired_at?: string;
    };
}, {
    type?: "lock_acquired";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        ttl_seconds?: number;
        lock_key?: string;
        holder_id?: string;
        lock_type?: "exclusive" | "shared";
        acquired_at?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"lock_released">;
    data: z.ZodObject<{
        lock_key: z.ZodString;
        holder_id: z.ZodString;
        released_by: z.ZodString;
        released_at: z.ZodString;
        held_duration_ms: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        released_by?: string;
        lock_key?: string;
        holder_id?: string;
        released_at?: string;
        held_duration_ms?: number;
    }, {
        released_by?: string;
        lock_key?: string;
        holder_id?: string;
        released_at?: string;
        held_duration_ms?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "lock_released";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        released_by?: string;
        lock_key?: string;
        holder_id?: string;
        released_at?: string;
        held_duration_ms?: number;
    };
}, {
    type?: "lock_released";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        released_by?: string;
        lock_key?: string;
        holder_id?: string;
        released_at?: string;
        held_duration_ms?: number;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"cursor_moved">;
    data: z.ZodObject<{
        consumer_id: z.ZodString;
        stream_type: z.ZodString;
        old_position: z.ZodNumber;
        new_position: z.ZodNumber;
        moved_at: z.ZodString;
        batch_size: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        consumer_id?: string;
        stream_type?: string;
        old_position?: number;
        new_position?: number;
        moved_at?: string;
        batch_size?: number;
    }, {
        consumer_id?: string;
        stream_type?: string;
        old_position?: number;
        new_position?: number;
        moved_at?: string;
        batch_size?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type?: "cursor_moved";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        consumer_id?: string;
        stream_type?: string;
        old_position?: number;
        new_position?: number;
        moved_at?: string;
        batch_size?: number;
    };
}, {
    type?: "cursor_moved";
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
    data?: {
        consumer_id?: string;
        stream_type?: string;
        old_position?: number;
        new_position?: number;
        moved_at?: string;
        batch_size?: number;
    };
}>]>;
export type FleetEvent = z.infer<typeof FleetEventSchema>;
export type { PilotRegisteredEvent, PilotActiveEvent, PilotDeregisteredEvent, } from './pilots.js';
export type { MessageSentEvent, MessageReadEvent, MessageAcknowledgedEvent, MessageUpdatedEvent, MessageDeletedEvent, } from './messages.js';
export type { FileReservedEvent, FileReleasedEvent, FileConflictEvent, } from './reservations.js';
export type { SortieCreatedEvent, SortieStartedEvent, SortieCompletedEvent, SortieBlockedEvent, SortieResumedEvent, SortieUpdatedEvent, } from './sorties.js';
export type { MissionCreatedEvent, MissionStartedEvent, MissionCompletedEvent, MissionUpdatedEvent, } from './missions.js';
export type { CheckpointCreatedEvent, ContextCompactedEvent, CheckpointRestoredEvent, CheckpointDeletedEvent, } from './checkpoints.js';
export type { CoordinatorDecisionEvent, PilotSpawnedEvent, PilotTerminatedEvent, LockAcquiredEvent, LockReleasedEvent, CursorMovedEvent, } from './coordination.js';
export { BaseEventSchema } from './base.js';
export type { BaseEvent } from './base.js';
