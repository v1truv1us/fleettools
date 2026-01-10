/**
 * FleetTools Checkpoint Event Schemas
 * 
 * Zod schemas for checkpoint-related events.
 */

import { z } from 'zod';
import { BaseEventSchema } from './base.js';

/**
 * Checkpoint created event
 */
export const CheckpointCreatedSchema = BaseEventSchema.extend({
  type: z.literal('checkpoint_created'),
  data: z.object({
    checkpoint_id: z.string().startsWith('chk-'),
    mission_id: z.string().startsWith('mission-').optional(),
    sortie_id: z.string().startsWith('sortie-').optional(),
    callsign: z.string(),
    trigger: z.string(),
    progress_percent: z.number().min(0).max(100).optional(),
    summary: z.string().optional(),
    context_data: z.record(z.unknown()).optional(),
  }),
});

/**
 * Context compacted event
 */
export const ContextCompactedSchema = BaseEventSchema.extend({
  type: z.literal('context_compacted'),
  data: z.object({
    checkpoint_id: z.string(),
    compacted_by: z.string(),
    original_size: z.number(),
    compacted_size: z.number(),
    compression_ratio: z.number(),
    compacted_at: z.string().datetime(),
  }),
});

/**
 * Checkpoint restored event
 */
export const CheckpointRestoredSchema = BaseEventSchema.extend({
  type: z.literal('checkpoint_restored'),
  data: z.object({
    checkpoint_id: z.string(),
    restored_by: z.string(),
    restored_at: z.string().datetime(),
    restore_target: z.string(),
    success: z.boolean(),
    notes: z.string().optional(),
  }),
});

/**
 * Checkpoint deleted event
 */
export const CheckpointDeletedSchema = BaseEventSchema.extend({
  type: z.literal('checkpoint_deleted'),
  data: z.object({
    checkpoint_id: z.string(),
    deleted_by: z.string(),
    deleted_at: z.string().datetime(),
    reason: z.enum(['expired', 'manual', 'cleanup']),
  }),
});

export type CheckpointCreatedEvent = z.infer<typeof CheckpointCreatedSchema>;
export type ContextCompactedEvent = z.infer<typeof ContextCompactedSchema>;
export type CheckpointRestoredEvent = z.infer<typeof CheckpointRestoredSchema>;
export type CheckpointDeletedEvent = z.infer<typeof CheckpointDeletedSchema>;