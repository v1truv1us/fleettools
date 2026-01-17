/**
 * FleetTools API Validation Schemas
 *
 * Provides Zod schemas for all API endpoints to ensure type safety
 * and prevent injection attacks through proper validation.
 */
import { z } from 'zod';
export declare const StreamIdSchema: z.ZodString;
export declare const EventIdSchema: z.ZodString;
export declare const LockIdSchema: z.ZodString;
export declare const CursorIdSchema: z.ZodString;
export declare const SpecialistIdSchema: z.ZodString;
export declare const TimestampSchema: z.ZodOptional<z.ZodString>;
export declare const JsonDataSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
export declare const MetadataSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
export declare const EventSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    stream_id: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    causation_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const EventArraySchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    stream_id: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    causation_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>>;
export declare const AppendEventsRequestSchema: z.ZodObject<{
    stream_id: z.ZodString;
    events: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        stream_id: z.ZodString;
        data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        causation_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const MailboxResponseSchema: z.ZodObject<{
    id: z.ZodString;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    events: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        stream_id: z.ZodString;
        data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        causation_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const CursorAdvanceRequestSchema: z.ZodObject<{
    stream_id: z.ZodString;
    position: z.ZodNumber;
}, z.core.$strip>;
export declare const CursorSchema: z.ZodObject<{
    id: z.ZodString;
    stream_id: z.ZodString;
    position: z.ZodNumber;
    consumer_id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, z.core.$strip>;
export declare const FilePathSchema: z.ZodString;
export declare const LockPurposeSchema: z.ZodOptional<z.ZodEnum<{
    edit: "edit";
    read: "read";
    delete: "delete";
}>>;
export declare const AcquireLockRequestSchema: z.ZodObject<{
    file: z.ZodString;
    specialist_id: z.ZodString;
    timeout_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    purpose: z.ZodOptional<z.ZodEnum<{
        edit: "edit";
        read: "read";
        delete: "delete";
    }>>;
    checksum: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const ReleaseLockRequestSchema: z.ZodObject<{
    lock_id: z.ZodString;
    specialist_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const LockSchema: z.ZodObject<{
    id: z.ZodString;
    file: z.ZodString;
    reserved_by: z.ZodString;
    reserved_at: z.ZodString;
    released_at: z.ZodNullable<z.ZodString>;
    purpose: z.ZodString;
    checksum: z.ZodNullable<z.ZodString>;
    timeout_ms: z.ZodNumber;
    metadata: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const CoordinatorStatusSchema: z.ZodObject<{
    active_mailboxes: z.ZodNumber;
    active_locks: z.ZodNumber;
    timestamp: z.ZodString;
}, z.core.$strip>;
export declare const ErrorResponseSchema: z.ZodObject<{
    error: z.ZodString;
}, z.core.$strip>;
export declare const HealthResponseSchema: z.ZodObject<{
    status: z.ZodLiteral<"healthy">;
    service: z.ZodLiteral<"squawk">;
    timestamp: z.ZodString;
}, z.core.$strip>;
export declare const MailboxAppendResponseSchema: z.ZodObject<{
    mailbox: z.ZodObject<{
        id: z.ZodString;
        created_at: z.ZodString;
        updated_at: z.ZodString;
        events: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodString;
            stream_id: z.ZodString;
            data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
            causation_id: z.ZodOptional<z.ZodString>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
    inserted: z.ZodNumber;
}, z.core.$strip>;
export type AppendEventsRequest = z.infer<typeof AppendEventsRequestSchema>;
export type Event = z.infer<typeof EventSchema>;
export type MailboxResponse = z.infer<typeof MailboxResponseSchema>;
export type CursorAdvanceRequest = z.infer<typeof CursorAdvanceRequestSchema>;
export type Cursor = z.infer<typeof CursorSchema>;
export type AcquireLockRequest = z.infer<typeof AcquireLockRequestSchema>;
export type ReleaseLockRequest = z.infer<typeof ReleaseLockRequestSchema>;
export type Lock = z.infer<typeof LockSchema>;
export type CoordinatorStatus = z.infer<typeof CoordinatorStatusSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type MailboxAppendResponse = z.infer<typeof MailboxAppendResponseSchema>;
//# sourceMappingURL=schemas.d.ts.map