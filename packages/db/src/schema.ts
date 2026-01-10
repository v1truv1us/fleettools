/**
 * FleetTools Database Schema
 * 
 * Drizzle ORM schema definitions for event sourcing.
 */

import { 
  sqliteTable, 
  text, 
  integer, 
  index, 
  uniqueIndex,
  primaryKey 
} from 'drizzle-orm/sqlite-core';
import type { MissionId, WorkOrderId, CheckpointId, EventId } from '@fleettools/core';

/**
 * Events table - append-only storage for all domain events
 */
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  aggregateId: text('aggregate_id').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  eventType: text('event_type').notNull(),
  eventData: text('event_data').notNull(),
  metadata: text('metadata'),
  version: integer('version', { mode: 'number' }).notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  aggregateIdx: index('idx_events_aggregate').on(table.aggregateId),
  typeIdx: index('idx_events_type').on(table.eventType),
  createdIdx: index('idx_events_created').on(table.createdAt),
  versionIdx: index('idx_events_version').on(table.aggregateId, table.version),
}));

/**
 * Snapshots table - periodic state snapshots for performance
 */
export const snapshots = sqliteTable('snapshots', {
  id: text('id').primaryKey(),
  aggregateId: text('aggregate_id').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  snapshotData: text('snapshot_data').notNull(),
  version: integer('version', { mode: 'number' }).notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  aggregateIdx: index('idx_snapshots_aggregate').on(table.aggregateId),
  versionUniqueIdx: uniqueIndex('uq_snapshot_version').on(table.aggregateId, table.version),
}));

/**
 * Metadata table - correlation and causation tracking
 */
export const metadata = sqliteTable('metadata', {
  id: text('id').primaryKey(),
  correlationId: text('correlation_id'),
  causationId: text('causation_id'),
  eventId: text('event_id').notNull(),
  metadata: text('metadata').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  correlationIdx: index('idx_metadata_correlation').on(table.correlationId),
  causationIdx: index('idx_metadata_causation').on(table.causationId),
  eventIdx: index('idx_metadata_event').on(table.eventId),
}));

/**
 * Type definitions for the schema
 */
export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
export type SnapshotRow = typeof snapshots.$inferSelect;
export type NewSnapshotRow = typeof snapshots.$inferInsert;
export type MetadataRow = typeof metadata.$inferSelect;
export type NewMetadataRow = typeof metadata.$inferInsert;

/**
 * Aggregate types for type safety
 */
export const AGGREGATE_TYPES = {
  MISSION: 'mission',
  WORK_ORDER: 'workorder',
  CHECKPOINT: 'checkpoint',
} as const;

export type AggregateType = typeof AGGREGATE_TYPES[keyof typeof AGGREGATE_TYPES];
