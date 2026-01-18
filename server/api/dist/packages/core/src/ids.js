"use strict";
/**
 * FleetTools ID Generators
 *
 * Generates prefixed UUIDs for different entity types.
 * All IDs follow the pattern: {prefix}-{uuid}
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLEETTOOLS_VERSION = exports.ID_PREFIXES = void 0;
exports.extractPrefix = extractPrefix;
exports.isValidPrefixId = isValidPrefixId;
exports.generateMissionId = generateMissionId;
exports.generateWorkOrderId = generateWorkOrderId;
exports.generateCheckpointId = generateCheckpointId;
exports.generateEventId = generateEventId;
exports.generateTimestamp = generateTimestamp;
exports.isMissionId = isMissionId;
exports.isWorkOrderId = isWorkOrderId;
exports.isCheckpointId = isCheckpointId;
exports.isEventId = isEventId;
const node_crypto_1 = require("node:crypto");
/**
 * FleetTools ID prefixes
 */
exports.ID_PREFIXES = {
    MISSION: 'msn-',
    WORK_ORDER: 'wo-',
    CHECKPOINT: 'chk-',
    EVENT: 'evt-',
};
/**
 * FleetTools version
 */
exports.FLEETTOOLS_VERSION = '0.1.0';
/**
 * Extract prefix from an ID
 */
function extractPrefix(id) {
    const match = id.match(/^([a-z]{2,4}-)/);
    return match?.[1] ?? null;
}
/**
 * Check if an ID has a valid prefix
 */
function isValidPrefixId(id, prefix) {
    return id.startsWith(prefix) && extractPrefix(id) === prefix;
}
/**
 * Generate a UUID using crypto.randomUUID()
 */
function generateUUID() {
    return (0, node_crypto_1.randomUUID)();
}
/**
 * Generate a mission ID (msn-{uuid})
 */
function generateMissionId() {
    return `msn-${generateUUID()}`;
}
/**
 * Generate a work order ID (wo-{uuid})
 */
function generateWorkOrderId() {
    return `wo-${generateUUID()}`;
}
/**
 * Generate a checkpoint ID (chk-{uuid})
 */
function generateCheckpointId() {
    return `chk-${generateUUID()}`;
}
/**
 * Generate an event ID (evt-{uuid})
 */
function generateEventId() {
    return `evt-${generateUUID()}`;
}
/**
 * Generate an ISO 8601 timestamp
 */
function generateTimestamp() {
    return new Date().toISOString();
}
/**
 * Type guard for MissionId
 */
function isMissionId(id) {
    return isValidPrefixId(id, exports.ID_PREFIXES.MISSION);
}
/**
 * Type guard for WorkOrderId
 */
function isWorkOrderId(id) {
    return isValidPrefixId(id, exports.ID_PREFIXES.WORK_ORDER);
}
/**
 * Type guard for CheckpointId
 */
function isCheckpointId(id) {
    return isValidPrefixId(id, exports.ID_PREFIXES.CHECKPOINT);
}
/**
 * Type guard for EventId
 */
function isEventId(id) {
    return isValidPrefixId(id, exports.ID_PREFIXES.EVENT);
}
//# sourceMappingURL=ids.js.map