"use strict";
/**
 * FleetTools Database Schema
 *
 * Drizzle ORM schema definitions for event sourcing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGGREGATE_TYPES = exports.metadata = exports.snapshots = exports.events = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
/**
 * Events table - append-only storage for all domain events
 */
exports.events = (0, sqlite_core_1.sqliteTable)('events', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    aggregateId: (0, sqlite_core_1.text)('aggregate_id').notNull(),
    aggregateType: (0, sqlite_core_1.text)('aggregate_type').notNull(),
    eventType: (0, sqlite_core_1.text)('event_type').notNull(),
    eventData: (0, sqlite_core_1.text)('event_data').notNull(),
    metadata: (0, sqlite_core_1.text)('metadata'),
    version: (0, sqlite_core_1.integer)('version', { mode: 'number' }).notNull(),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull(),
}, (table) => ({
    aggregateIdx: (0, sqlite_core_1.index)('idx_events_aggregate').on(table.aggregateId),
    typeIdx: (0, sqlite_core_1.index)('idx_events_type').on(table.eventType),
    createdIdx: (0, sqlite_core_1.index)('idx_events_created').on(table.createdAt),
    versionIdx: (0, sqlite_core_1.index)('idx_events_version').on(table.aggregateId, table.version),
}));
/**
 * Snapshots table - periodic state snapshots for performance
 */
exports.snapshots = (0, sqlite_core_1.sqliteTable)('snapshots', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    aggregateId: (0, sqlite_core_1.text)('aggregate_id').notNull(),
    aggregateType: (0, sqlite_core_1.text)('aggregate_type').notNull(),
    snapshotData: (0, sqlite_core_1.text)('snapshot_data').notNull(),
    version: (0, sqlite_core_1.integer)('version', { mode: 'number' }).notNull(),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull(),
}, (table) => ({
    aggregateIdx: (0, sqlite_core_1.index)('idx_snapshots_aggregate').on(table.aggregateId),
    versionUniqueIdx: (0, sqlite_core_1.uniqueIndex)('uq_snapshot_version').on(table.aggregateId, table.version),
}));
/**
 * Metadata table - correlation and causation tracking
 */
exports.metadata = (0, sqlite_core_1.sqliteTable)('metadata', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    correlationId: (0, sqlite_core_1.text)('correlation_id'),
    causationId: (0, sqlite_core_1.text)('causation_id'),
    eventId: (0, sqlite_core_1.text)('event_id').notNull(),
    metadata: (0, sqlite_core_1.text)('metadata').notNull(),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull(),
}, (table) => ({
    correlationIdx: (0, sqlite_core_1.index)('idx_metadata_correlation').on(table.correlationId),
    causationIdx: (0, sqlite_core_1.index)('idx_metadata_causation').on(table.causationId),
    eventIdx: (0, sqlite_core_1.index)('idx_metadata_event').on(table.eventId),
}));
/**
 * Aggregate types for type safety
 */
exports.AGGREGATE_TYPES = {
    MISSION: 'mission',
    WORK_ORDER: 'workorder',
    CHECKPOINT: 'checkpoint',
};
//# sourceMappingURL=schema.js.map