/**
 * FleetTools Checkpoint Event Schemas
 *
 * Zod schemas for checkpoint-related events.
 */
import { z } from 'zod';
/**
 * Checkpoint created event
 */
export declare const CheckpointCreatedSchema: z.ZodObject<{
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
}>;
/**
 * Context compacted event
 */
export declare const ContextCompactedSchema: z.ZodObject<{
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
}>;
/**
 * Checkpoint restored event
 */
export declare const CheckpointRestoredSchema: z.ZodObject<{
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
}>;
/**
 * Checkpoint deleted event
 */
export declare const CheckpointDeletedSchema: z.ZodObject<{
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
}>;
export type CheckpointCreatedEvent = z.infer<typeof CheckpointCreatedSchema>;
export type ContextCompactedEvent = z.infer<typeof ContextCompactedSchema>;
export type CheckpointRestoredEvent = z.infer<typeof CheckpointRestoredSchema>;
export type CheckpointDeletedEvent = z.infer<typeof CheckpointDeletedSchema>;
//# sourceMappingURL=checkpoints.d.ts.map