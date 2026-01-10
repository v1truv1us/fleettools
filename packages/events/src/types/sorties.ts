/**
 * FleetTools Sortie Event Schemas
 * 
 * Zod schemas for sortie-related events.
 */

import { z } from 'zod';
import { BaseEventSchema } from './base.js';

/**
 * Sortie created event
 */
export const SortieCreatedSchema = BaseEventSchema.extend({
  type: z.literal('sortie_created'),
  data: z.object({
    sortie_id: z.string().startsWith('sortie-'),
    mission_id: z.string().startsWith('mission-').optional(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    assigned_to: z.string().optional(),
    files: z.array(z.string()).default([]),
    estimated_hours: z.number().positive().optional(),
  }),
});

/**
 * Sortie started event
 */
export const SortieStartedSchema = BaseEventSchema.extend({
  type: z.literal('sortie_started'),
  data: z.object({
    sortie_id: z.string(),
    started_by: z.string(),
    started_at: z.string().datetime(),
  }),
});

/**
 * Sortie completed event
 */
export const SortieCompletedSchema = BaseEventSchema.extend({
  type: z.literal('sortie_completed'),
  data: z.object({
    sortie_id: z.string(),
    completed_by: z.string(),
    completed_at: z.string().datetime(),
    result: z.enum(['success', 'partial', 'failed']),
    notes: z.string().optional(),
  }),
});

/**
 * Sortie blocked event
 */
export const SortieBlockedSchema = BaseEventSchema.extend({
  type: z.literal('sortie_blocked'),
  data: z.object({
    sortie_id: z.string(),
    blocked_by: z.string(),
    blocked_reason: z.string(),
    blocked_at: z.string().datetime(),
    blocked_by_callsign: z.string().optional(),
  }),
});

/**
 * Sortie resumed event
 */
export const SortieResumedSchema = BaseEventSchema.extend({
  type: z.literal('sortie_resumed'),
  data: z.object({
    sortie_id: z.string(),
    resumed_by: z.string(),
    resumed_at: z.string().datetime(),
    previous_state: z.string(),
  }),
});

/**
 * Sortie updated event
 */
export const SortieUpdatedSchema = BaseEventSchema.extend({
  type: z.literal('sortie_updated'),
  data: z.object({
    sortie_id: z.string(),
    updated_by: z.string(),
    updated_at: z.string().datetime(),
    changes: z.array(z.object({
      field: z.string(),
      old_value: z.unknown(),
      new_value: z.unknown(),
    })),
  }),
});

export type SortieCreatedEvent = z.infer<typeof SortieCreatedSchema>;
export type SortieStartedEvent = z.infer<typeof SortieStartedSchema>;
export type SortieCompletedEvent = z.infer<typeof SortieCompletedSchema>;
export type SortieBlockedEvent = z.infer<typeof SortieBlockedSchema>;
export type SortieResumedEvent = z.infer<typeof SortieResumedSchema>;
export type SortieUpdatedEvent = z.infer<typeof SortieUpdatedSchema>;