/**
 * FleetTools ID Generators
 * 
 * Generates prefixed UUIDs for different entity types.
 * All IDs follow the pattern: {prefix}-{uuid}
 */

import { randomUUID } from 'node:crypto';

/**
 * FleetTools ID prefixes
 */
export const ID_PREFIXES = {
  MISSION: 'msn-',
  WORK_ORDER: 'wo-',
  CHECKPOINT: 'chk-',
  EVENT: 'evt-',
} as const;

/**
 * FleetTools version
 */
export const FLEETTOOLS_VERSION = '0.1.0';

/**
 * Branded ID types for compile-time safety
 */
export type MissionId = `msn-${string}`;
export type WorkOrderId = `wo-${string}`;
export type CheckpointId = `chk-${string}`;
export type EventId = `evt-${string}`;

/**
 * Extract prefix from an ID
 */
export function extractPrefix(id: string): string | null {
  const match = id.match(/^([a-z]{2,4}-)/);
  return match?.[1] ?? null;
}

/**
 * Check if an ID has a valid prefix
 */
export function isValidPrefixId(id: string, prefix: string): boolean {
  return id.startsWith(prefix) && extractPrefix(id) === prefix;
}

/**
 * Generate a UUID using crypto.randomUUID()
 */
function generateUUID(): string {
  return randomUUID();
}

/**
 * Generate a mission ID (msn-{uuid})
 */
export function generateMissionId(): MissionId {
  return `msn-${generateUUID()}` as MissionId;
}

/**
 * Generate a work order ID (wo-{uuid})
 */
export function generateWorkOrderId(): WorkOrderId {
  return `wo-${generateUUID()}` as WorkOrderId;
}

/**
 * Generate a checkpoint ID (chk-{uuid})
 */
export function generateCheckpointId(): CheckpointId {
  return `chk-${generateUUID()}` as CheckpointId;
}

/**
 * Generate an event ID (evt-{uuid})
 */
export function generateEventId(): EventId {
  return `evt-${generateUUID()}` as EventId;
}

/**
 * Generate an ISO 8601 timestamp
 */
export function generateTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Type guard for MissionId
 */
export function isMissionId(id: string): id is MissionId {
  return isValidPrefixId(id, ID_PREFIXES.MISSION);
}

/**
 * Type guard for WorkOrderId
 */
export function isWorkOrderId(id: string): id is WorkOrderId {
  return isValidPrefixId(id, ID_PREFIXES.WORK_ORDER);
}

/**
 * Type guard for CheckpointId
 */
export function isCheckpointId(id: string): id is CheckpointId {
  return isValidPrefixId(id, ID_PREFIXES.CHECKPOINT);
}

/**
 * Type guard for EventId
 */
export function isEventId(id: string): id is EventId {
  return isValidPrefixId(id, ID_PREFIXES.EVENT);
}
