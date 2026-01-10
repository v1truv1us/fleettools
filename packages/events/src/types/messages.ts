/**
 * FleetTools Message Event Schemas
 * 
 * Zod schemas for message-related events.
 */

import { z } from 'zod';
import { BaseEventSchema } from './base.js';

/**
 * Message sent event
 */
export const MessageSentSchema = BaseEventSchema.extend({
  type: z.literal('message_sent'),
  data: z.object({
    from_callsign: z.string(),
    to_callsigns: z.array(z.string()),
    subject: z.string(),
    body: z.string(),
    thread_id: z.string().optional(),
    importance: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
    ack_required: z.boolean().default(false),
  }),
});

/**
 * Message read event
 */
export const MessageReadSchema = BaseEventSchema.extend({
  type: z.literal('message_read'),
  data: z.object({
    message_id: z.string().uuid(),
    callsign: z.string(),
    read_at: z.string().datetime(),
  }),
});

/**
 * Message acknowledged event
 */
export const MessageAcknowledgedSchema = BaseEventSchema.extend({
  type: z.literal('message_acknowledged'),
  data: z.object({
    message_id: z.string().uuid(),
    callsign: z.string(),
    acknowledged_at: z.string().datetime(),
    notes: z.string().optional(),
  }),
});

/**
 * Message updated event
 */
export const MessageUpdatedSchema = BaseEventSchema.extend({
  type: z.literal('message_updated'),
  data: z.object({
    message_id: z.string().uuid(),
    updated_by: z.string(),
    changes: z.array(z.object({
      field: z.string(),
      old_value: z.unknown(),
      new_value: z.unknown(),
    })),
  }),
});

/**
 * Message deleted event
 */
export const MessageDeletedSchema = BaseEventSchema.extend({
  type: z.literal('message_deleted'),
  data: z.object({
    message_id: z.string().uuid(),
    deleted_by: z.string(),
    reason: z.string().optional(),
  }),
});

export type MessageSentEvent = z.infer<typeof MessageSentSchema>;
export type MessageReadEvent = z.infer<typeof MessageReadSchema>;
export type MessageAcknowledgedEvent = z.infer<typeof MessageAcknowledgedSchema>;
export type MessageUpdatedEvent = z.infer<typeof MessageUpdatedSchema>;
export type MessageDeletedEvent = z.infer<typeof MessageDeletedSchema>;