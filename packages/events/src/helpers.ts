/**
 * FleetTools Event Helpers
 * 
 * Utility functions for event creation, validation, and type guards.
 */

import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { FleetEventSchema, type FleetEvent } from './types/index.js';

// Re-export for convenience
export { FleetEventSchema };
import { generateEventId } from '@fleettools/core';
import { nowIso } from '@fleettools/core';

/**
 * Create a typed event with validation
 */
export function createEvent<T extends FleetEvent>(
  type: T['type'],
  data: T['data'],
  options: {
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
  } = {}
): T {
  const event = {
    id: options.id || generateEventId(),
    type,
    project_key: options.project_key || '/default',
    timestamp: options.timestamp || nowIso(),
    sequence: options.sequence || 1,
    data,
  } as T;

  // Validate the event
  const result = FleetEventSchema.safeParse(event);
  if (!result.success) {
    throw new Error(`Invalid event data: ${result.error.message}`);
  }

  return result.data as T;
}

/**
 * Validate an event using the FleetEvent schema
 */
export function validateEvent(event: unknown): FleetEvent {
  const result = FleetEventSchema.safeParse(event);
  if (!result.success) {
    throw new Error(`Invalid event: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Safe event validation that returns a result
 */
export function safeValidateEvent(event: unknown): {
  success: boolean;
  data?: FleetEvent;
  error?: string;
} {
  const result = FleetEventSchema.safeParse(event);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { 
      success: false, 
      error: result.error.message 
    };
  }
}

/**
 * Type guard for specific event types
 */
export function isEventType<T extends FleetEvent>(
  event: FleetEvent,
  type: T['type']
): event is T {
  return event.type === type;
}

/**
 * Type guard for pilot events
 */
export function isPilotEvent(event: FleetEvent): boolean {
  return [
    'pilot_registered',
    'pilot_active',
    'pilot_deregistered'
  ].includes(event.type);
}

/**
 * Type guard for message events
 */
export function isMessageEvent(event: FleetEvent): boolean {
  return [
    'message_sent',
    'message_read',
    'message_acknowledged',
    'message_updated',
    'message_deleted'
  ].includes(event.type);
}

/**
 * Type guard for reservation events
 */
export function isReservationEvent(event: FleetEvent): boolean {
  return [
    'file_reserved',
    'file_released',
    'file_conflict'
  ].includes(event.type);
}

/**
 * Type guard for sortie events
 */
export function isSortieEvent(event: FleetEvent): boolean {
  return [
    'sortie_created',
    'sortie_started',
    'sortie_completed',
    'sortie_blocked',
    'sortie_resumed',
    'sortie_updated'
  ].includes(event.type);
}

/**
 * Type guard for mission events
 */
export function isMissionEvent(event: FleetEvent): boolean {
  return [
    'mission_created',
    'mission_started',
    'mission_completed',
    'mission_updated'
  ].includes(event.type);
}

/**
 * Type guard for checkpoint events
 */
export function isCheckpointEvent(event: FleetEvent): boolean {
  return [
    'checkpoint_created',
    'context_compacted',
    'checkpoint_restored',
    'checkpoint_deleted'
  ].includes(event.type);
}

/**
 * Type guard for coordination events
 */
export function isCoordinationEvent(event: FleetEvent): boolean {
  return [
    'coordinator_decision',
    'pilot_spawned',
    'pilot_terminated',
    'lock_acquired',
    'lock_released',
    'cursor_moved'
  ].includes(event.type);
}

/**
 * Extract event data with proper typing
 */
export function getEventData<T extends FleetEvent>(
  event: T
): T['data'] {
  return event.data;
}

/**
 * Get event type information
 */
export function getEventInfo(event: FleetEvent): {
  category: 'pilot' | 'message' | 'reservation' | 'sortie' | 'mission' | 'checkpoint' | 'coordination';
  isAggregateEvent: boolean;
  isSystemEvent: boolean;
} {
  const category = isPilotEvent(event) ? 'pilot' :
    isMessageEvent(event) ? 'message' :
    isReservationEvent(event) ? 'reservation' :
    isSortieEvent(event) ? 'sortie' :
    isMissionEvent(event) ? 'mission' :
    isCheckpointEvent(event) ? 'checkpoint' : 'coordination';

  const isAggregateEvent = ['sortie_created', 'mission_created'].includes(event.type);
  const isSystemEvent = ['pilot_spawned', 'pilot_terminated', 'cursor_moved'].includes(event.type);

  return { category, isAggregateEvent, isSystemEvent };
}