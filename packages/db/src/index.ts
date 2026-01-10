/**
 * FleetTools Database Package
 * 
 * Database layer using Drizzle ORM and libSQL for event sourcing.
 */

// Export schema and types
export * from './schema.js';

// Export client factory and utilities
export * from './client.js';

// Export migration utilities
export * from './migrations.js';

// Re-export commonly used types
export type { DrizzleDB, DatabaseConfig } from './client.js';
export type { 
  EventRow, 
  NewEventRow, 
  SnapshotRow, 
  NewSnapshotRow, 
  MetadataRow, 
  NewMetadataRow,
  AggregateType 
} from './schema.js';
