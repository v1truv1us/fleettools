/**
 * FleetTools Reservation Event Schemas
 * 
 * Zod schemas for file reservation events.
 */

import { z } from 'zod';
import { BaseEventSchema } from './base.js';

/**
 * File reserved event
 */
export const FileReservedSchema = BaseEventSchema.extend({
  type: z.literal('file_reserved'),
  data: z.object({
    callsign: z.string(),
    path_pattern: z.string(),
    exclusive: z.boolean().default(true),
    reason: z.string().optional(),
    ttl_seconds: z.number().int().positive().optional(),
  }),
});

/**
 * File released event
 */
export const FileReleasedSchema = BaseEventSchema.extend({
  type: z.literal('file_released'),
  data: z.object({
    callsign: z.string(),
    path_pattern: z.string(),
    reason: z.string().optional(),
    released_by: z.string().optional(),
  }),
});

/**
 * File conflict event
 */
export const FileConflictSchema = BaseEventSchema.extend({
  type: z.literal('file_conflict'),
  data: z.object({
    callsign: z.string(),
    path_pattern: z.string(),
    conflicting_callsign: z.string(),
    conflict_type: z.enum(['exclusive_violation', 'pattern_overlap', 'timeout']),
    resolved: z.boolean().default(false),
  }),
});

export type FileReservedEvent = z.infer<typeof FileReservedSchema>;
export type FileReleasedEvent = z.infer<typeof FileReleasedSchema>;
export type FileConflictEvent = z.infer<typeof FileConflictSchema>;