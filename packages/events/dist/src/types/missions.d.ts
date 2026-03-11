/**
 * FleetTools Mission Event Schemas
 *
 * Zod schemas for mission-related events.
 */
import { z } from 'zod';
/**
 * Mission created event
 */
export declare const MissionCreatedSchema: z.ZodObject<{
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
}>;
/**
 * Mission started event
 */
export declare const MissionStartedSchema: z.ZodObject<{
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
}>;
/**
 * Mission completed event
 */
export declare const MissionCompletedSchema: z.ZodObject<{
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
}>;
/**
 * Mission updated event
 */
export declare const MissionUpdatedSchema: z.ZodObject<{
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
}>;
export type MissionCreatedEvent = z.infer<typeof MissionCreatedSchema>;
export type MissionStartedEvent = z.infer<typeof MissionStartedSchema>;
export type MissionCompletedEvent = z.infer<typeof MissionCompletedSchema>;
export type MissionUpdatedEvent = z.infer<typeof MissionUpdatedSchema>;
//# sourceMappingURL=missions.d.ts.map