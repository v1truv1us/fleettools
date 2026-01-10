/**
 * FleetTools ID Generators
 *
 * Generates prefixed UUIDs for different entity types.
 * All IDs follow the pattern: {prefix}-{uuid}
 */
/**
 * FleetTools ID prefixes
 */
export declare const ID_PREFIXES: {
    readonly MISSION: "msn-";
    readonly WORK_ORDER: "wo-";
    readonly CHECKPOINT: "chk-";
    readonly EVENT: "evt-";
};
/**
 * FleetTools version
 */
export declare const FLEETTOOLS_VERSION = "0.1.0";
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
export declare function extractPrefix(id: string): string | null;
/**
 * Check if an ID has a valid prefix
 */
export declare function isValidPrefixId(id: string, prefix: string): boolean;
/**
 * Generate a mission ID (msn-{uuid})
 */
export declare function generateMissionId(): MissionId;
/**
 * Generate a work order ID (wo-{uuid})
 */
export declare function generateWorkOrderId(): WorkOrderId;
/**
 * Generate a checkpoint ID (chk-{uuid})
 */
export declare function generateCheckpointId(): CheckpointId;
/**
 * Generate an event ID (evt-{uuid})
 */
export declare function generateEventId(): EventId;
/**
 * Generate an ISO 8601 timestamp
 */
export declare function generateTimestamp(): string;
/**
 * Type guard for MissionId
 */
export declare function isMissionId(id: string): id is MissionId;
/**
 * Type guard for WorkOrderId
 */
export declare function isWorkOrderId(id: string): id is WorkOrderId;
/**
 * Type guard for CheckpointId
 */
export declare function isCheckpointId(id: string): id is CheckpointId;
/**
 * Type guard for EventId
 */
export declare function isEventId(id: string): id is EventId;
//# sourceMappingURL=ids.d.ts.map