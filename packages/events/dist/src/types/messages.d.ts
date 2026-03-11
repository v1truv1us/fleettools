/**
 * FleetTools Message Event Schemas
 *
 * Zod schemas for message-related events.
 */
import { z } from 'zod';
/**
 * Message sent event
 */
export declare const MessageSentSchema: z.ZodObject<{
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
}>;
/**
 * Message read event
 */
export declare const MessageReadSchema: z.ZodObject<{
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
}>;
/**
 * Message acknowledged event
 */
export declare const MessageAcknowledgedSchema: z.ZodObject<{
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
}>;
/**
 * Message updated event
 */
export declare const MessageUpdatedSchema: z.ZodObject<{
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
}>;
/**
 * Message deleted event
 */
export declare const MessageDeletedSchema: z.ZodObject<{
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
}>;
export type MessageSentEvent = z.infer<typeof MessageSentSchema>;
export type MessageReadEvent = z.infer<typeof MessageReadSchema>;
export type MessageAcknowledgedEvent = z.infer<typeof MessageAcknowledgedSchema>;
export type MessageUpdatedEvent = z.infer<typeof MessageUpdatedSchema>;
export type MessageDeletedEvent = z.infer<typeof MessageDeletedSchema>;
//# sourceMappingURL=messages.d.ts.map