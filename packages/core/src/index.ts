/**
 * FleetTools Core Package
 * 
 * Core utilities, ID generators, and shared types for FleetTools.
 */

// Export all functions and types from ids module
export {
  ID_PREFIXES,
  FLEETTOOLS_VERSION,
  generateMissionId,
  generateWorkOrderId,
  generateCheckpointId,
  generateEventId,
  generateTimestamp,
  extractPrefix,
  isValidPrefixId,
  isMissionId,
  isWorkOrderId,
  isCheckpointId,
  isEventId,
} from './ids.js';

// Export timestamp functions from timestamps module
export {
  nowIso,
  toIso,
  fromUnixMs,
  fromIso,
  toUnixMs,
  nowUnixMs,
  formatDuration,
  durationBetween,
  addDuration,
  isPast,
  isFuture,
  formatDisplay,
} from './timestamps.js';

// Export types from types module
export type {
  MissionStatus,
  WorkOrderStatus,
  CheckpointStatus,
  Priority,
  AggregateType,
  EventMetadata,
  BaseEvent,
  Snapshot,
  PaginationOptions,
  TimeRange,
  DatabaseConfig,
  Result,
} from './types.js';

// Export utility functions from utils module
export {
  sleep,
  retry,
  deepClone,
  isValidJSON,
  safeJSONStringify,
  isValidFleetToolsId,
  extractUUIDFromId,
  generateSafeFilename,
  formatBytes,
  debounce,
  throttle,
} from './utils.js';

// Re-export branded ID types
export type {
  MissionId,
  WorkOrderId,
  CheckpointId,
  EventId,
} from './ids.js';
