/**
 * FleetTools Coordination Event Schemas
 *
 * Zod schemas for coordination-related events.
 */
import { z } from 'zod';
/**
 * Coordinator decision event
 */
export declare const CoordinatorDecisionSchema: z.ZodObject<{
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
}>;
/**
 * Pilot spawned event
 */
export declare const PilotSpawnedSchema: z.ZodObject<{
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
}>;
/**
 * Pilot terminated event
 */
export declare const PilotTerminatedSchema: z.ZodObject<{
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
}>;
/**
 * Lock acquired event
 */
export declare const LockAcquiredSchema: z.ZodObject<{
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
}>;
/**
 * Lock released event
 */
export declare const LockReleasedSchema: z.ZodObject<{
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
}>;
/**
 * Cursor moved event
 */
export declare const CursorMovedSchema: z.ZodObject<{
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
}>;
export type CoordinatorDecisionEvent = z.infer<typeof CoordinatorDecisionSchema>;
export type PilotSpawnedEvent = z.infer<typeof PilotSpawnedSchema>;
export type PilotTerminatedEvent = z.infer<typeof PilotTerminatedSchema>;
export type LockAcquiredEvent = z.infer<typeof LockAcquiredSchema>;
export type LockReleasedEvent = z.infer<typeof LockReleasedSchema>;
export type CursorMovedEvent = z.infer<typeof CursorMovedSchema>;
//# sourceMappingURL=coordination.d.ts.map