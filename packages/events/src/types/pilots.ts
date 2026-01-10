/**
 * FleetTools Pilot Event Schemas
 * 
 * Zod schemas for pilot-related events.
 */

import { z } from 'zod';
import { BaseEventSchema } from './base.js';

/**
 * Pilot registered event
 */
export const PilotRegisteredSchema = BaseEventSchema.extend({
  type: z.literal('pilot_registered'),
  data: z.object({
    callsign: z.string().min(1),
    program: z.enum(['opencode', 'claude-code', 'custom']),
    model: z.string().min(1),
    task_description: z.string().optional(),
  }),
});

/**
 * Pilot active event
 */
export const PilotActiveSchema = BaseEventSchema.extend({
  type: z.literal('pilot_active'),
  data: z.object({
    callsign: z.string(),
    status: z.enum(['active', 'idle', 'busy']),
    current_task: z.string().optional(),
  }),
});

/**
 * Pilot deregistered event
 */
export const PilotDeregisteredSchema = BaseEventSchema.extend({
  type: z.literal('pilot_deregistered'),
  data: z.object({
    callsign: z.string(),
    reason: z.enum(['completed', 'error', 'timeout', 'manual']),
    final_status: z.string().optional(),
  }),
});

export type PilotRegisteredEvent = z.infer<typeof PilotRegisteredSchema>;
export type PilotActiveEvent = z.infer<typeof PilotActiveSchema>;
export type PilotDeregisteredEvent = z.infer<typeof PilotDeregisteredSchema>;