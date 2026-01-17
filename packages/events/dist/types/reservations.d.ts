/**
 * FleetTools Reservation Event Schemas
 *
 * Zod schemas for file reservation events.
 */
import { z } from 'zod';
/**
 * File reserved event
 */
export declare const FileReservedSchema: z.ZodObject<{
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
}>;
/**
 * File released event
 */
export declare const FileReleasedSchema: z.ZodObject<{
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
}>;
/**
 * File conflict event
 */
export declare const FileConflictSchema: z.ZodObject<{
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
}>;
export type FileReservedEvent = z.infer<typeof FileReservedSchema>;
export type FileReleasedEvent = z.infer<typeof FileReleasedSchema>;
export type FileConflictEvent = z.infer<typeof FileConflictSchema>;
