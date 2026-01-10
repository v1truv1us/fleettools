/**
 * FleetTools Coordination Event Schemas
 * 
 * Zod schemas for coordination-related events.
 */

import { z } from 'zod';
import { BaseEventSchema } from './base.js';

/**
 * Coordinator decision event
 */
export const CoordinatorDecisionSchema = BaseEventSchema.extend({
  type: z.literal('coordinator_decision'),
  data: z.object({
    decision_id: z.string().uuid(),
    coordinator: z.string(),
    decision_type: z.enum(['pilot_assignment', 'task_priority', 'resource_allocation', 'conflict_resolution']),
    context: z.record(z.unknown()),
    decision: z.record(z.unknown()),
    confidence: z.number().min(0).max(1),
    reasoning: z.string().optional(),
  }),
});

/**
 * Pilot spawned event
 */
export const PilotSpawnedSchema = BaseEventSchema.extend({
  type: z.literal('pilot_spawned'),
  data: z.object({
    callsign: z.string(),
    program: z.enum(['opencode', 'claude-code', 'custom']),
    model: z.string(),
    spawned_by: z.string(),
    config: z.record(z.unknown()).optional(),
  }),
});

/**
 * Pilot terminated event
 */
export const PilotTerminatedSchema = BaseEventSchema.extend({
  type: z.literal('pilot_terminated'),
  data: z.object({
    callsign: z.string(),
    terminated_by: z.string(),
    reason: z.enum(['completed', 'error', 'timeout', 'manual', 'resource_limit']),
    exit_code: z.number().optional(),
    final_state: z.record(z.unknown()).optional(),
  }),
});

/**
 * Lock acquired event
 */
export const LockAcquiredSchema = BaseEventSchema.extend({
  type: z.literal('lock_acquired'),
  data: z.object({
    lock_key: z.string(),
    holder_id: z.string(),
    lock_type: z.enum(['exclusive', 'shared']),
    ttl_seconds: z.number().int().positive(),
    acquired_at: z.string().datetime(),
  }),
});

/**
 * Lock released event
 */
export const LockReleasedSchema = BaseEventSchema.extend({
  type: z.literal('lock_released'),
  data: z.object({
    lock_key: z.string(),
    holder_id: z.string(),
    released_by: z.string(),
    released_at: z.string().datetime(),
    held_duration_ms: z.number(),
  }),
});

/**
 * Cursor moved event
 */
export const CursorMovedSchema = BaseEventSchema.extend({
  type: z.literal('cursor_moved'),
  data: z.object({
    consumer_id: z.string(),
    stream_type: z.string(),
    old_position: z.number(),
    new_position: z.number(),
    moved_at: z.string().datetime(),
    batch_size: z.number().optional(),
  }),
});

export type CoordinatorDecisionEvent = z.infer<typeof CoordinatorDecisionSchema>;
export type PilotSpawnedEvent = z.infer<typeof PilotSpawnedSchema>;
export type PilotTerminatedEvent = z.infer<typeof PilotTerminatedSchema>;
export type LockAcquiredEvent = z.infer<typeof LockAcquiredSchema>;
export type LockReleasedEvent = z.infer<typeof LockReleasedSchema>;
export type CursorMovedEvent = z.infer<typeof CursorMovedSchema>;