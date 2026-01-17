/**
 * FleetTools Pilot Event Schemas
 *
 * Zod schemas for pilot-related events.
 */
import { z } from 'zod';
/**
 * Pilot registered event
 */
export declare const PilotRegisteredSchema: z.ZodObject<{
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
}>;
/**
 * Pilot active event
 */
export declare const PilotActiveSchema: z.ZodObject<{
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
}>;
/**
 * Pilot deregistered event
 */
export declare const PilotDeregisteredSchema: z.ZodObject<{
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
}>;
export type PilotRegisteredEvent = z.infer<typeof PilotRegisteredSchema>;
export type PilotActiveEvent = z.infer<typeof PilotActiveSchema>;
export type PilotDeregisteredEvent = z.infer<typeof PilotDeregisteredSchema>;
