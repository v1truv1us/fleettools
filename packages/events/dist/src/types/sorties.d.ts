/**
 * FleetTools Sortie Event Schemas
 *
 * Zod schemas for sortie-related events.
 */
import { z } from 'zod';
/**
 * Sortie created event
 */
export declare const SortieCreatedSchema: z.ZodObject<{
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
}>;
/**
 * Sortie started event
 */
export declare const SortieStartedSchema: z.ZodObject<{
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
}>;
/**
 * Sortie completed event
 */
export declare const SortieCompletedSchema: z.ZodObject<{
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
}>;
/**
 * Sortie blocked event
 */
export declare const SortieBlockedSchema: z.ZodObject<{
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
}>;
/**
 * Sortie resumed event
 */
export declare const SortieResumedSchema: z.ZodObject<{
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
}>;
/**
 * Sortie updated event
 */
export declare const SortieUpdatedSchema: z.ZodObject<{
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
}>;
export type SortieCreatedEvent = z.infer<typeof SortieCreatedSchema>;
export type SortieStartedEvent = z.infer<typeof SortieStartedSchema>;
export type SortieCompletedEvent = z.infer<typeof SortieCompletedSchema>;
export type SortieBlockedEvent = z.infer<typeof SortieBlockedSchema>;
export type SortieResumedEvent = z.infer<typeof SortieResumedSchema>;
export type SortieUpdatedEvent = z.infer<typeof SortieUpdatedSchema>;
//# sourceMappingURL=sorties.d.ts.map