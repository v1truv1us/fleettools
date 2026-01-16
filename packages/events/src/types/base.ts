/**
 * FleetTools Base Event Schema
 * 
 * Base event schema with common fields for all FleetTools events.
 */

import { z } from 'zod';

/**
 * Base event schema with common fields
 */
export const BaseEventSchema = z.object({
  id: z.string().min(1), // Accept our prefixed UUID format
  type: z.string(),
  project_key: z.string(),
  timestamp: z.string().datetime(), // ISO 8601
  sequence: z.number().int().positive(),
  data: z.unknown(),
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;
