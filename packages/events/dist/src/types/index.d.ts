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
        callsign: string;
        program: "custom" | "opencode" | "claude-code";
        model: string;
        task_description?: string | undefined;
    }, {
        callsign: string;
        program: "custom" | "opencode" | "claude-code";
        model: string;
        task_description?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "pilot_registered";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        program: "custom" | "opencode" | "claude-code";
        model: string;
        task_description?: string | undefined;
    };
}, {
    id: string;
    type: "pilot_registered";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        program: "custom" | "opencode" | "claude-code";
        model: string;
        task_description?: string | undefined;
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
        status: "active" | "idle" | "busy";
        callsign: string;
        current_task?: string | undefined;
    }, {
        status: "active" | "idle" | "busy";
        callsign: string;
        current_task?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "pilot_active";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        status: "active" | "idle" | "busy";
        callsign: string;
        current_task?: string | undefined;
    };
}, {
    id: string;
    type: "pilot_active";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        status: "active" | "idle" | "busy";
        callsign: string;
        current_task?: string | undefined;
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
        callsign: string;
        reason: "completed" | "error" | "timeout" | "manual";
        final_status?: string | undefined;
    }, {
        callsign: string;
        reason: "completed" | "error" | "timeout" | "manual";
        final_status?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "pilot_deregistered";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        reason: "completed" | "error" | "timeout" | "manual";
        final_status?: string | undefined;
    };
}, {
    id: string;
    type: "pilot_deregistered";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        reason: "completed" | "error" | "timeout" | "manual";
        final_status?: string | undefined;
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
        from_callsign: string;
        to_callsigns: string[];
        subject: string;
        body: string;
        importance: "low" | "normal" | "high" | "critical";
        ack_required: boolean;
        thread_id?: string | undefined;
    }, {
        from_callsign: string;
        to_callsigns: string[];
        subject: string;
        body: string;
        thread_id?: string | undefined;
        importance?: "low" | "normal" | "high" | "critical" | undefined;
        ack_required?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "message_sent";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        from_callsign: string;
        to_callsigns: string[];
        subject: string;
        body: string;
        importance: "low" | "normal" | "high" | "critical";
        ack_required: boolean;
        thread_id?: string | undefined;
    };
}, {
    id: string;
    type: "message_sent";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        from_callsign: string;
        to_callsigns: string[];
        subject: string;
        body: string;
        thread_id?: string | undefined;
        importance?: "low" | "normal" | "high" | "critical" | undefined;
        ack_required?: boolean | undefined;
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
        callsign: string;
        message_id: string;
        read_at: string;
    }, {
        callsign: string;
        message_id: string;
        read_at: string;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "message_read";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        message_id: string;
        read_at: string;
    };
}, {
    id: string;
    type: "message_read";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        message_id: string;
        read_at: string;
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
        callsign: string;
        message_id: string;
        acknowledged_at: string;
        notes?: string | undefined;
    }, {
        callsign: string;
        message_id: string;
        acknowledged_at: string;
        notes?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "message_acknowledged";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        message_id: string;
        acknowledged_at: string;
        notes?: string | undefined;
    };
}, {
    id: string;
    type: "message_acknowledged";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        message_id: string;
        acknowledged_at: string;
        notes?: string | undefined;
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
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }, {
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        message_id: string;
        updated_by: string;
        changes: {
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
    }, {
        message_id: string;
        updated_by: string;
        changes: {
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "message_updated";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        message_id: string;
        updated_by: string;
        changes: {
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
    };
}, {
    id: string;
    type: "message_updated";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        message_id: string;
        updated_by: string;
        changes: {
            field: string;
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
        message_id: string;
        deleted_by: string;
        reason?: string | undefined;
    }, {
        message_id: string;
        deleted_by: string;
        reason?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "message_deleted";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        message_id: string;
        deleted_by: string;
        reason?: string | undefined;
    };
}, {
    id: string;
    type: "message_deleted";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        message_id: string;
        deleted_by: string;
        reason?: string | undefined;
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
        callsign: string;
        path_pattern: string;
        exclusive: boolean;
        reason?: string | undefined;
        ttl_seconds?: number | undefined;
    }, {
        callsign: string;
        path_pattern: string;
        reason?: string | undefined;
        exclusive?: boolean | undefined;
        ttl_seconds?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "file_reserved";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        path_pattern: string;
        exclusive: boolean;
        reason?: string | undefined;
        ttl_seconds?: number | undefined;
    };
}, {
    id: string;
    type: "file_reserved";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        path_pattern: string;
        reason?: string | undefined;
        exclusive?: boolean | undefined;
        ttl_seconds?: number | undefined;
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
        callsign: string;
        path_pattern: string;
        reason?: string | undefined;
        released_by?: string | undefined;
    }, {
        callsign: string;
        path_pattern: string;
        reason?: string | undefined;
        released_by?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "file_released";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        path_pattern: string;
        reason?: string | undefined;
        released_by?: string | undefined;
    };
}, {
    id: string;
    type: "file_released";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        path_pattern: string;
        reason?: string | undefined;
        released_by?: string | undefined;
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
        callsign: string;
        path_pattern: string;
        conflicting_callsign: string;
        conflict_type: "timeout" | "exclusive_violation" | "pattern_overlap";
        resolved: boolean;
    }, {
        callsign: string;
        path_pattern: string;
        conflicting_callsign: string;
        conflict_type: "timeout" | "exclusive_violation" | "pattern_overlap";
        resolved?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "file_conflict";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        path_pattern: string;
        conflicting_callsign: string;
        conflict_type: "timeout" | "exclusive_violation" | "pattern_overlap";
        resolved: boolean;
    };
}, {
    id: string;
    type: "file_conflict";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        path_pattern: string;
        conflicting_callsign: string;
        conflict_type: "timeout" | "exclusive_violation" | "pattern_overlap";
        resolved?: boolean | undefined;
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
        sortie_id: string;
        title: string;
        priority: "low" | "high" | "critical" | "medium";
        files: string[];
        mission_id?: string | undefined;
        description?: string | undefined;
        assigned_to?: string | undefined;
        estimated_hours?: number | undefined;
    }, {
        sortie_id: string;
        title: string;
        mission_id?: string | undefined;
        description?: string | undefined;
        priority?: "low" | "high" | "critical" | "medium" | undefined;
        assigned_to?: string | undefined;
        files?: string[] | undefined;
        estimated_hours?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "sortie_created";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        sortie_id: string;
        title: string;
        priority: "low" | "high" | "critical" | "medium";
        files: string[];
        mission_id?: string | undefined;
        description?: string | undefined;
        assigned_to?: string | undefined;
        estimated_hours?: number | undefined;
    };
}, {
    id: string;
    type: "sortie_created";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        sortie_id: string;
        title: string;
        mission_id?: string | undefined;
        description?: string | undefined;
        priority?: "low" | "high" | "critical" | "medium" | undefined;
        assigned_to?: string | undefined;
        files?: string[] | undefined;
        estimated_hours?: number | undefined;
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
        sortie_id: string;
        started_by: string;
        started_at: string;
    }, {
        sortie_id: string;
        started_by: string;
        started_at: string;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "sortie_started";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        sortie_id: string;
        started_by: string;
        started_at: string;
    };
}, {
    id: string;
    type: "sortie_started";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        sortie_id: string;
        started_by: string;
        started_at: string;
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
        sortie_id: string;
        completed_by: string;
        completed_at: string;
        result: "success" | "partial" | "failed";
        notes?: string | undefined;
    }, {
        sortie_id: string;
        completed_by: string;
        completed_at: string;
        result: "success" | "partial" | "failed";
        notes?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "sortie_completed";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        sortie_id: string;
        completed_by: string;
        completed_at: string;
        result: "success" | "partial" | "failed";
        notes?: string | undefined;
    };
}, {
    id: string;
    type: "sortie_completed";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        sortie_id: string;
        completed_by: string;
        completed_at: string;
        result: "success" | "partial" | "failed";
        notes?: string | undefined;
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
        sortie_id: string;
        blocked_by: string;
        blocked_reason: string;
        blocked_at: string;
        blocked_by_callsign?: string | undefined;
    }, {
        sortie_id: string;
        blocked_by: string;
        blocked_reason: string;
        blocked_at: string;
        blocked_by_callsign?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "sortie_blocked";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        sortie_id: string;
        blocked_by: string;
        blocked_reason: string;
        blocked_at: string;
        blocked_by_callsign?: string | undefined;
    };
}, {
    id: string;
    type: "sortie_blocked";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        sortie_id: string;
        blocked_by: string;
        blocked_reason: string;
        blocked_at: string;
        blocked_by_callsign?: string | undefined;
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
        sortie_id: string;
        resumed_by: string;
        resumed_at: string;
        previous_state: string;
    }, {
        sortie_id: string;
        resumed_by: string;
        resumed_at: string;
        previous_state: string;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "sortie_resumed";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        sortie_id: string;
        resumed_by: string;
        resumed_at: string;
        previous_state: string;
    };
}, {
    id: string;
    type: "sortie_resumed";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        sortie_id: string;
        resumed_by: string;
        resumed_at: string;
        previous_state: string;
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
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }, {
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        updated_by: string;
        changes: {
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        sortie_id: string;
        updated_at: string;
    }, {
        updated_by: string;
        changes: {
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        sortie_id: string;
        updated_at: string;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "sortie_updated";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        updated_by: string;
        changes: {
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        sortie_id: string;
        updated_at: string;
    };
}, {
    id: string;
    type: "sortie_updated";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        updated_by: string;
        changes: {
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        sortie_id: string;
        updated_at: string;
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
        mission_id: string;
        title: string;
        priority: "low" | "high" | "critical" | "medium";
        created_by: string;
        description?: string | undefined;
        estimated_duration_hours?: number | undefined;
    }, {
        mission_id: string;
        title: string;
        created_by: string;
        description?: string | undefined;
        priority?: "low" | "high" | "critical" | "medium" | undefined;
        estimated_duration_hours?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "mission_created";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        mission_id: string;
        title: string;
        priority: "low" | "high" | "critical" | "medium";
        created_by: string;
        description?: string | undefined;
        estimated_duration_hours?: number | undefined;
    };
}, {
    id: string;
    type: "mission_created";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        mission_id: string;
        title: string;
        created_by: string;
        description?: string | undefined;
        priority?: "low" | "high" | "critical" | "medium" | undefined;
        estimated_duration_hours?: number | undefined;
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
        mission_id: string;
        started_by: string;
        started_at: string;
    }, {
        mission_id: string;
        started_by: string;
        started_at: string;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "mission_started";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        mission_id: string;
        started_by: string;
        started_at: string;
    };
}, {
    id: string;
    type: "mission_started";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        mission_id: string;
        started_by: string;
        started_at: string;
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
        mission_id: string;
        completed_by: string;
        completed_at: string;
        result: "success" | "partial" | "failed";
        summary?: string | undefined;
        metrics?: Record<string, number> | undefined;
    }, {
        mission_id: string;
        completed_by: string;
        completed_at: string;
        result: "success" | "partial" | "failed";
        summary?: string | undefined;
        metrics?: Record<string, number> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "mission_completed";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        mission_id: string;
        completed_by: string;
        completed_at: string;
        result: "success" | "partial" | "failed";
        summary?: string | undefined;
        metrics?: Record<string, number> | undefined;
    };
}, {
    id: string;
    type: "mission_completed";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        mission_id: string;
        completed_by: string;
        completed_at: string;
        result: "success" | "partial" | "failed";
        summary?: string | undefined;
        metrics?: Record<string, number> | undefined;
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
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }, {
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        updated_by: string;
        changes: {
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        mission_id: string;
        updated_at: string;
    }, {
        updated_by: string;
        changes: {
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        mission_id: string;
        updated_at: string;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "mission_updated";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        updated_by: string;
        changes: {
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        mission_id: string;
        updated_at: string;
    };
}, {
    id: string;
    type: "mission_updated";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        updated_by: string;
        changes: {
            field: string;
            old_value?: unknown;
            new_value?: unknown;
        }[];
        mission_id: string;
        updated_at: string;
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
        callsign: string;
        checkpoint_id: string;
        trigger: string;
        sortie_id?: string | undefined;
        mission_id?: string | undefined;
        summary?: string | undefined;
        progress_percent?: number | undefined;
        context_data?: Record<string, unknown> | undefined;
    }, {
        callsign: string;
        checkpoint_id: string;
        trigger: string;
        sortie_id?: string | undefined;
        mission_id?: string | undefined;
        summary?: string | undefined;
        progress_percent?: number | undefined;
        context_data?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "checkpoint_created";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        checkpoint_id: string;
        trigger: string;
        sortie_id?: string | undefined;
        mission_id?: string | undefined;
        summary?: string | undefined;
        progress_percent?: number | undefined;
        context_data?: Record<string, unknown> | undefined;
    };
}, {
    id: string;
    type: "checkpoint_created";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        checkpoint_id: string;
        trigger: string;
        sortie_id?: string | undefined;
        mission_id?: string | undefined;
        summary?: string | undefined;
        progress_percent?: number | undefined;
        context_data?: Record<string, unknown> | undefined;
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
        checkpoint_id: string;
        compacted_by: string;
        original_size: number;
        compacted_size: number;
        compression_ratio: number;
        compacted_at: string;
    }, {
        checkpoint_id: string;
        compacted_by: string;
        original_size: number;
        compacted_size: number;
        compression_ratio: number;
        compacted_at: string;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "context_compacted";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        checkpoint_id: string;
        compacted_by: string;
        original_size: number;
        compacted_size: number;
        compression_ratio: number;
        compacted_at: string;
    };
}, {
    id: string;
    type: "context_compacted";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        checkpoint_id: string;
        compacted_by: string;
        original_size: number;
        compacted_size: number;
        compression_ratio: number;
        compacted_at: string;
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
        success: boolean;
        checkpoint_id: string;
        restored_by: string;
        restored_at: string;
        restore_target: string;
        notes?: string | undefined;
    }, {
        success: boolean;
        checkpoint_id: string;
        restored_by: string;
        restored_at: string;
        restore_target: string;
        notes?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "checkpoint_restored";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        success: boolean;
        checkpoint_id: string;
        restored_by: string;
        restored_at: string;
        restore_target: string;
        notes?: string | undefined;
    };
}, {
    id: string;
    type: "checkpoint_restored";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        success: boolean;
        checkpoint_id: string;
        restored_by: string;
        restored_at: string;
        restore_target: string;
        notes?: string | undefined;
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
        reason: "manual" | "expired" | "cleanup";
        deleted_by: string;
        checkpoint_id: string;
        deleted_at: string;
    }, {
        reason: "manual" | "expired" | "cleanup";
        deleted_by: string;
        checkpoint_id: string;
        deleted_at: string;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "checkpoint_deleted";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        reason: "manual" | "expired" | "cleanup";
        deleted_by: string;
        checkpoint_id: string;
        deleted_at: string;
    };
}, {
    id: string;
    type: "checkpoint_deleted";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        reason: "manual" | "expired" | "cleanup";
        deleted_by: string;
        checkpoint_id: string;
        deleted_at: string;
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
        decision_id: string;
        coordinator: string;
        decision_type: "pilot_assignment" | "task_priority" | "resource_allocation" | "conflict_resolution";
        context: Record<string, unknown>;
        decision: Record<string, unknown>;
        confidence: number;
        reasoning?: string | undefined;
    }, {
        decision_id: string;
        coordinator: string;
        decision_type: "pilot_assignment" | "task_priority" | "resource_allocation" | "conflict_resolution";
        context: Record<string, unknown>;
        decision: Record<string, unknown>;
        confidence: number;
        reasoning?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "coordinator_decision";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        decision_id: string;
        coordinator: string;
        decision_type: "pilot_assignment" | "task_priority" | "resource_allocation" | "conflict_resolution";
        context: Record<string, unknown>;
        decision: Record<string, unknown>;
        confidence: number;
        reasoning?: string | undefined;
    };
}, {
    id: string;
    type: "coordinator_decision";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        decision_id: string;
        coordinator: string;
        decision_type: "pilot_assignment" | "task_priority" | "resource_allocation" | "conflict_resolution";
        context: Record<string, unknown>;
        decision: Record<string, unknown>;
        confidence: number;
        reasoning?: string | undefined;
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
        callsign: string;
        program: "custom" | "opencode" | "claude-code";
        model: string;
        spawned_by: string;
        config?: Record<string, unknown> | undefined;
    }, {
        callsign: string;
        program: "custom" | "opencode" | "claude-code";
        model: string;
        spawned_by: string;
        config?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "pilot_spawned";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        program: "custom" | "opencode" | "claude-code";
        model: string;
        spawned_by: string;
        config?: Record<string, unknown> | undefined;
    };
}, {
    id: string;
    type: "pilot_spawned";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        program: "custom" | "opencode" | "claude-code";
        model: string;
        spawned_by: string;
        config?: Record<string, unknown> | undefined;
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
        callsign: string;
        reason: "completed" | "error" | "timeout" | "manual" | "resource_limit";
        terminated_by: string;
        exit_code?: number | undefined;
        final_state?: Record<string, unknown> | undefined;
    }, {
        callsign: string;
        reason: "completed" | "error" | "timeout" | "manual" | "resource_limit";
        terminated_by: string;
        exit_code?: number | undefined;
        final_state?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "pilot_terminated";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        reason: "completed" | "error" | "timeout" | "manual" | "resource_limit";
        terminated_by: string;
        exit_code?: number | undefined;
        final_state?: Record<string, unknown> | undefined;
    };
}, {
    id: string;
    type: "pilot_terminated";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        reason: "completed" | "error" | "timeout" | "manual" | "resource_limit";
        terminated_by: string;
        exit_code?: number | undefined;
        final_state?: Record<string, unknown> | undefined;
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
        ttl_seconds: number;
        lock_key: string;
        holder_id: string;
        lock_type: "exclusive" | "shared";
        acquired_at: string;
    }, {
        ttl_seconds: number;
        lock_key: string;
        holder_id: string;
        lock_type: "exclusive" | "shared";
        acquired_at: string;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "lock_acquired";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        ttl_seconds: number;
        lock_key: string;
        holder_id: string;
        lock_type: "exclusive" | "shared";
        acquired_at: string;
    };
}, {
    id: string;
    type: "lock_acquired";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        ttl_seconds: number;
        lock_key: string;
        holder_id: string;
        lock_type: "exclusive" | "shared";
        acquired_at: string;
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
        released_by: string;
        lock_key: string;
        holder_id: string;
        released_at: string;
        held_duration_ms: number;
    }, {
        released_by: string;
        lock_key: string;
        holder_id: string;
        released_at: string;
        held_duration_ms: number;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "lock_released";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        released_by: string;
        lock_key: string;
        holder_id: string;
        released_at: string;
        held_duration_ms: number;
    };
}, {
    id: string;
    type: "lock_released";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        released_by: string;
        lock_key: string;
        holder_id: string;
        released_at: string;
        held_duration_ms: number;
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
        consumer_id: string;
        stream_type: string;
        old_position: number;
        new_position: number;
        moved_at: string;
        batch_size?: number | undefined;
    }, {
        consumer_id: string;
        stream_type: string;
        old_position: number;
        new_position: number;
        moved_at: string;
        batch_size?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "cursor_moved";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        consumer_id: string;
        stream_type: string;
        old_position: number;
        new_position: number;
        moved_at: string;
        batch_size?: number | undefined;
    };
}, {
    id: string;
    type: "cursor_moved";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        consumer_id: string;
        stream_type: string;
        old_position: number;
        new_position: number;
        moved_at: string;
        batch_size?: number | undefined;
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
//# sourceMappingURL=index.d.ts.map