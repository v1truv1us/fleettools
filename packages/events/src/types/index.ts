/**
 * FleetTools Event Types Index
 * 
 * Main event type exports and discriminated union for all FleetTools events.
 */

import { z } from 'zod';

// Import all event schemas
import {
  PilotRegisteredSchema,
  PilotActiveSchema,
  PilotDeregisteredSchema,
} from './pilots.js';

import {
  MessageSentSchema,
  MessageReadSchema,
  MessageAcknowledgedSchema,
  MessageUpdatedSchema,
  MessageDeletedSchema,
} from './messages.js';

import {
  FileReservedSchema,
  FileReleasedSchema,
  FileConflictSchema,
} from './reservations.js';

import {
  SortieCreatedSchema,
  SortieStartedSchema,
  SortieCompletedSchema,
  SortieBlockedSchema,
  SortieResumedSchema,
  SortieUpdatedSchema,
} from './sorties.js';

import {
  MissionCreatedSchema,
  MissionStartedSchema,
  MissionCompletedSchema,
  MissionUpdatedSchema,
} from './missions.js';

import {
  CheckpointCreatedSchema,
  ContextCompactedSchema,
  CheckpointRestoredSchema,
  CheckpointDeletedSchema,
} from './checkpoints.js';

import {
  CoordinatorDecisionSchema,
  PilotSpawnedSchema,
  PilotTerminatedSchema,
  LockAcquiredSchema,
  LockReleasedSchema,
  CursorMovedSchema,
} from './coordination.js';

// Export all individual event schemas
export {
  PilotRegisteredSchema,
  PilotActiveSchema,
  PilotDeregisteredSchema,
  MessageSentSchema,
  MessageReadSchema,
  MessageAcknowledgedSchema,
  MessageUpdatedSchema,
  MessageDeletedSchema,
  FileReservedSchema,
  FileReleasedSchema,
  FileConflictSchema,
  SortieCreatedSchema,
  SortieStartedSchema,
  SortieCompletedSchema,
  SortieBlockedSchema,
  SortieResumedSchema,
  SortieUpdatedSchema,
  MissionCreatedSchema,
  MissionStartedSchema,
  MissionCompletedSchema,
  MissionUpdatedSchema,
  CheckpointCreatedSchema,
  ContextCompactedSchema,
  CheckpointRestoredSchema,
  CheckpointDeletedSchema,
  CoordinatorDecisionSchema,
  PilotSpawnedSchema,
  PilotTerminatedSchema,
  LockAcquiredSchema,
  LockReleasedSchema,
  CursorMovedSchema,
};

// Create discriminated union of all event types
export const FleetEventSchema = z.discriminatedUnion('type', [
  PilotRegisteredSchema,
  PilotActiveSchema,
  PilotDeregisteredSchema,
  MessageSentSchema,
  MessageReadSchema,
  MessageAcknowledgedSchema,
  MessageUpdatedSchema,
  MessageDeletedSchema,
  FileReservedSchema,
  FileReleasedSchema,
  FileConflictSchema,
  SortieCreatedSchema,
  SortieStartedSchema,
  SortieCompletedSchema,
  SortieBlockedSchema,
  SortieResumedSchema,
  SortieUpdatedSchema,
  MissionCreatedSchema,
  MissionStartedSchema,
  MissionCompletedSchema,
  MissionUpdatedSchema,
  CheckpointCreatedSchema,
  ContextCompactedSchema,
  CheckpointRestoredSchema,
  CheckpointDeletedSchema,
  CoordinatorDecisionSchema,
  PilotSpawnedSchema,
  PilotTerminatedSchema,
  LockAcquiredSchema,
  LockReleasedSchema,
  CursorMovedSchema,
]);

// Export main FleetEvent type
export type FleetEvent = z.infer<typeof FleetEventSchema>;

// Export individual event types
export type {
  PilotRegisteredEvent,
  PilotActiveEvent,
  PilotDeregisteredEvent,
} from './pilots.js';

export type {
  MessageSentEvent,
  MessageReadEvent,
  MessageAcknowledgedEvent,
  MessageUpdatedEvent,
  MessageDeletedEvent,
} from './messages.js';

export type {
  FileReservedEvent,
  FileReleasedEvent,
  FileConflictEvent,
} from './reservations.js';

export type {
  SortieCreatedEvent,
  SortieStartedEvent,
  SortieCompletedEvent,
  SortieBlockedEvent,
  SortieResumedEvent,
  SortieUpdatedEvent,
} from './sorties.js';

export type {
  MissionCreatedEvent,
  MissionStartedEvent,
  MissionCompletedEvent,
  MissionUpdatedEvent,
} from './missions.js';

export type {
  CheckpointCreatedEvent,
  ContextCompactedEvent,
  CheckpointRestoredEvent,
  CheckpointDeletedEvent,
} from './checkpoints.js';

export type {
  CoordinatorDecisionEvent,
  PilotSpawnedEvent,
  PilotTerminatedEvent,
  LockAcquiredEvent,
  LockReleasedEvent,
  CursorMovedEvent,
} from './coordination.js';

// Re-export base types
export { BaseEventSchema } from './base.js';
export type { BaseEvent } from './base.js';
