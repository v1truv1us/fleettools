/**
 * FleetTools Mission Event Schemas
 * 
 * Zod schemas for mission-related events.
 */

import { z } from 'zod';
import { BaseEventSchema } from './base.js';

/**
 * Mission created event
 */
export const MissionCreatedSchema = BaseEventSchema.extend({
  type: z.literal('mission_created'),
  data: z.object({
    mission_id: z.string().startsWith('mission-'),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    estimated_duration_hours: z.number().positive().optional(),
    created_by: z.string(),
  }),
});

/**
 * Mission started event
 */
export const MissionStartedSchema = BaseEventSchema.extend({
  type: z.literal('mission_started'),
  data: z.object({
    mission_id: z.string(),
    started_by: z.string(),
    started_at: z.string().datetime(),
  }),
});

/**
 * Mission completed event
 */
export const MissionCompletedSchema = BaseEventSchema.extend({
  type: z.literal('mission_completed'),
  data: z.object({
    mission_id: z.string(),
    completed_by: z.string(),
    completed_at: z.string().datetime(),
    result: z.enum(['success', 'partial', 'failed']),
    summary: z.string().optional(),
    metrics: z.record(z.number()).optional(),
  }),
});

/**
 * Mission updated event
 */
export const MissionUpdatedSchema = BaseEventSchema.extend({
  type: z.literal('mission_updated'),
  data: z.object({
    mission_id: z.string(),
    updated_by: z.string(),
    updated_at: z.string().datetime(),
    changes: z.array(z.object({
      field: z.string(),
      old_value: z.unknown(),
      new_value: z.unknown(),
    })),
  }),
});

export type MissionCreatedEvent = z.infer<typeof MissionCreatedSchema>;
export type MissionStartedEvent = z.infer<typeof MissionStartedSchema>;
export type MissionCompletedEvent = z.infer<typeof MissionCompletedSchema>;
export type MissionUpdatedEvent = z.infer<typeof MissionUpdatedSchema>;