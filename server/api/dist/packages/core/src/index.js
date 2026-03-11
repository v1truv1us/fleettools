"use strict";
/**
 * FleetTools Core Package
 *
 * Core utilities, ID generators, and shared types for FleetTools.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.throttle = exports.debounce = exports.formatBytes = exports.generateSafeFilename = exports.extractUUIDFromId = exports.isValidFleetToolsId = exports.safeJSONStringify = exports.isValidJSON = exports.deepClone = exports.retry = exports.sleep = exports.formatDisplay = exports.isFuture = exports.isPast = exports.addDuration = exports.durationBetween = exports.formatDuration = exports.nowUnixMs = exports.toUnixMs = exports.fromIso = exports.fromUnixMs = exports.toIso = exports.nowIso = exports.isEventId = exports.isCheckpointId = exports.isWorkOrderId = exports.isMissionId = exports.isValidPrefixId = exports.extractPrefix = exports.generateTimestamp = exports.generateEventId = exports.generateCheckpointId = exports.generateWorkOrderId = exports.generateMissionId = exports.FLEETTOOLS_VERSION = exports.ID_PREFIXES = void 0;
// Export all functions and types from ids module
var ids_js_1 = require("./ids.js");
Object.defineProperty(exports, "ID_PREFIXES", { enumerable: true, get: function () { return ids_js_1.ID_PREFIXES; } });
Object.defineProperty(exports, "FLEETTOOLS_VERSION", { enumerable: true, get: function () { return ids_js_1.FLEETTOOLS_VERSION; } });
Object.defineProperty(exports, "generateMissionId", { enumerable: true, get: function () { return ids_js_1.generateMissionId; } });
Object.defineProperty(exports, "generateWorkOrderId", { enumerable: true, get: function () { return ids_js_1.generateWorkOrderId; } });
Object.defineProperty(exports, "generateCheckpointId", { enumerable: true, get: function () { return ids_js_1.generateCheckpointId; } });
Object.defineProperty(exports, "generateEventId", { enumerable: true, get: function () { return ids_js_1.generateEventId; } });
Object.defineProperty(exports, "generateTimestamp", { enumerable: true, get: function () { return ids_js_1.generateTimestamp; } });
Object.defineProperty(exports, "extractPrefix", { enumerable: true, get: function () { return ids_js_1.extractPrefix; } });
Object.defineProperty(exports, "isValidPrefixId", { enumerable: true, get: function () { return ids_js_1.isValidPrefixId; } });
Object.defineProperty(exports, "isMissionId", { enumerable: true, get: function () { return ids_js_1.isMissionId; } });
Object.defineProperty(exports, "isWorkOrderId", { enumerable: true, get: function () { return ids_js_1.isWorkOrderId; } });
Object.defineProperty(exports, "isCheckpointId", { enumerable: true, get: function () { return ids_js_1.isCheckpointId; } });
Object.defineProperty(exports, "isEventId", { enumerable: true, get: function () { return ids_js_1.isEventId; } });
// Export timestamp functions from timestamps module
var timestamps_js_1 = require("./timestamps.js");
Object.defineProperty(exports, "nowIso", { enumerable: true, get: function () { return timestamps_js_1.nowIso; } });
Object.defineProperty(exports, "toIso", { enumerable: true, get: function () { return timestamps_js_1.toIso; } });
Object.defineProperty(exports, "fromUnixMs", { enumerable: true, get: function () { return timestamps_js_1.fromUnixMs; } });
Object.defineProperty(exports, "fromIso", { enumerable: true, get: function () { return timestamps_js_1.fromIso; } });
Object.defineProperty(exports, "toUnixMs", { enumerable: true, get: function () { return timestamps_js_1.toUnixMs; } });
Object.defineProperty(exports, "nowUnixMs", { enumerable: true, get: function () { return timestamps_js_1.nowUnixMs; } });
Object.defineProperty(exports, "formatDuration", { enumerable: true, get: function () { return timestamps_js_1.formatDuration; } });
Object.defineProperty(exports, "durationBetween", { enumerable: true, get: function () { return timestamps_js_1.durationBetween; } });
Object.defineProperty(exports, "addDuration", { enumerable: true, get: function () { return timestamps_js_1.addDuration; } });
Object.defineProperty(exports, "isPast", { enumerable: true, get: function () { return timestamps_js_1.isPast; } });
Object.defineProperty(exports, "isFuture", { enumerable: true, get: function () { return timestamps_js_1.isFuture; } });
Object.defineProperty(exports, "formatDisplay", { enumerable: true, get: function () { return timestamps_js_1.formatDisplay; } });
// Export utility functions from utils module
var utils_js_1 = require("./utils.js");
Object.defineProperty(exports, "sleep", { enumerable: true, get: function () { return utils_js_1.sleep; } });
Object.defineProperty(exports, "retry", { enumerable: true, get: function () { return utils_js_1.retry; } });
Object.defineProperty(exports, "deepClone", { enumerable: true, get: function () { return utils_js_1.deepClone; } });
Object.defineProperty(exports, "isValidJSON", { enumerable: true, get: function () { return utils_js_1.isValidJSON; } });
Object.defineProperty(exports, "safeJSONStringify", { enumerable: true, get: function () { return utils_js_1.safeJSONStringify; } });
Object.defineProperty(exports, "isValidFleetToolsId", { enumerable: true, get: function () { return utils_js_1.isValidFleetToolsId; } });
Object.defineProperty(exports, "extractUUIDFromId", { enumerable: true, get: function () { return utils_js_1.extractUUIDFromId; } });
Object.defineProperty(exports, "generateSafeFilename", { enumerable: true, get: function () { return utils_js_1.generateSafeFilename; } });
Object.defineProperty(exports, "formatBytes", { enumerable: true, get: function () { return utils_js_1.formatBytes; } });
Object.defineProperty(exports, "debounce", { enumerable: true, get: function () { return utils_js_1.debounce; } });
Object.defineProperty(exports, "throttle", { enumerable: true, get: function () { return utils_js_1.throttle; } });
//# sourceMappingURL=index.js.map