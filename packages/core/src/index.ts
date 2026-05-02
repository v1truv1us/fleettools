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

export type {
  HarnessId,
  HarnessAvailabilityStatus,
  OrchestrationTaskRef,
  HarnessAvailability,
  HarnessSelection,
  RunStatus,
  HarnessLaunchRequest,
  HarnessRunResult,
  OrchestrationRunRecord,
} from './orchestration/types.js';

export {
  SoloAdapter,
  type SoloAdapterOptions,
  type SoloSessionContext,
} from './integrations/solo-adapter.js';

export {
  SoloCommandError,
  isRetryableSoloError,
} from './integrations/solo-errors.js';

export type {
  SoloSuccessEnvelope,
  SoloErrorEnvelope,
  SoloErrorPayload,
  SoloEnvelope,
  SoloTaskListItem,
  SoloTaskListData,
  SoloTaskShowData,
  SoloCreateTaskInput,
  SoloCreatedTask,
  SoloTaskCreateData,
  SoloSessionStartData,
} from './integrations/solo-types.js';

export type { HarnessAdapter } from './harnesses/types.js';
export { HarnessRegistry } from './harnesses/registry.js';
export { ClaudeCodeHarnessAdapter } from './harnesses/claude-code.js';
export { GenericCliHarnessAdapter } from './harnesses/generic-cli.js';
export { OpenCodeHarnessAdapter } from './harnesses/opencode.js';
export { CodexHarnessAdapter } from './harnesses/codex.js';
export { matchRoutingRule, type RoutingRule, type RoutingRuleCondition } from './orchestration/rule-matcher.js';
export { resolveHarnessRoute, type RoutingDecision, type RoutingConfigShape } from './orchestration/routing-engine.js';
export { buildHarnessPrompt } from './orchestration/prompt-builder.js';
export { ProjectionStore } from './orchestration/projection-store.js';
export { Orchestrator, type OrchestratorOptions } from './orchestration/orchestrator.js';
