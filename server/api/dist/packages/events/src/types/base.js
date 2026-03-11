"use strict";
/**
 * FleetTools Base Event Schema
 *
 * Base event schema with common fields for all FleetTools events.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseEventSchema = void 0;
const zod_1 = require("zod");
/**
 * Base event schema with common fields
 */
exports.BaseEventSchema = zod_1.z.object({
    id: zod_1.z.string().min(1), // Accept our prefixed UUID format
    type: zod_1.z.string(),
    project_key: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(), // ISO 8601
    sequence: zod_1.z.number().int().positive(),
    data: zod_1.z.unknown(),
});
//# sourceMappingURL=base.js.map