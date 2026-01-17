/**
 * FleetTools API Validation Schemas
 *
 * Provides Zod schemas for all API endpoints to ensure type safety
 * and prevent injection attacks through proper validation.
 */
import { z } from 'zod';
// ============================================================================
// COMMON SCHEMAS
// ============================================================================
export const StreamIdSchema = z.string().min(1, { message: "Stream ID required" }).max(255, { message: "Stream ID too long" });
export const EventIdSchema = z.string().min(1, { message: "Event ID required" }).max(255, { message: "Event ID too long" });
export const LockIdSchema = z.string().min(1, { message: "Lock ID required" }).max(255, { message: "Lock ID too long" });
export const CursorIdSchema = z.string().min(1, { message: "Cursor ID required" }).max(255, { message: "Cursor ID too long" });
export const SpecialistIdSchema = z.string().min(1, { message: "Specialist ID required" }).max(255, { message: "Specialist ID too long" });
export const TimestampSchema = z.string().datetime().optional();
export const JsonDataSchema = z.record(z.string(), z.unknown()).optional();
export const MetadataSchema = z.record(z.string(), z.unknown()).optional();
// ============================================================================
// EVENT SCHEMAS
// ============================================================================
export const EventSchema = z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    stream_id: z.string().min(1),
    data: z.record(z.string(), z.unknown()),
    causation_id: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const EventArraySchema = z.array(EventSchema);
export const AppendEventsRequestSchema = z.object({
    stream_id: StreamIdSchema,
    events: EventArraySchema.min(1),
});
// ============================================================================
// MAILBOX SCHEMAS
// ============================================================================
export const MailboxResponseSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    events: z.array(EventSchema).optional(),
});
// ============================================================================
// CURSOR SCHEMAS
// ============================================================================
export const CursorAdvanceRequestSchema = z.object({
    stream_id: StreamIdSchema,
    position: z.number().int().min(0),
});
export const CursorSchema = z.object({
    id: z.string(),
    stream_id: z.string(),
    position: z.number().int().min(0),
    consumer_id: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
});
// ============================================================================
// LOCK SCHEMAS
// ============================================================================
export const FilePathSchema = z.string().min(1).max(1024);
export const LockPurposeSchema = z.enum(['edit', 'read', 'delete']).optional();
export const AcquireLockRequestSchema = z.object({
    file: FilePathSchema,
    specialist_id: SpecialistIdSchema,
    timeout_ms: z.number().int().min(1000).max(3600000).optional().default(30000),
    purpose: LockPurposeSchema,
    checksum: z.string().optional(),
    metadata: JsonDataSchema,
});
export const ReleaseLockRequestSchema = z.object({
    lock_id: LockIdSchema,
    specialist_id: SpecialistIdSchema.optional(),
});
export const LockSchema = z.object({
    id: z.string(),
    file: z.string(),
    reserved_by: z.string(),
    reserved_at: z.string(),
    released_at: z.string().nullable(),
    purpose: z.string(),
    checksum: z.string().nullable(),
    timeout_ms: z.number(),
    metadata: z.string().nullable(),
});
// ============================================================================
// COORDINATOR SCHEMAS
// ============================================================================
export const CoordinatorStatusSchema = z.object({
    active_mailboxes: z.number(),
    active_locks: z.number(),
    timestamp: z.string(),
});
// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================
export const ErrorResponseSchema = z.object({
    error: z.string(),
});
export const HealthResponseSchema = z.object({
    status: z.literal('healthy'),
    service: z.literal('squawk'),
    timestamp: z.string(),
});
export const MailboxAppendResponseSchema = z.object({
    mailbox: MailboxResponseSchema,
    inserted: z.number(),
});
//# sourceMappingURL=schemas.js.map