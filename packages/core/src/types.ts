/**
 * FleetTools Core Types
 */

/**
 * Status types for various entities
 */
export type MissionStatus = 
  | 'draft'
  | 'active'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'archived';

export type WorkOrderStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type CheckpointStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'skipped';

/**
 * Priority levels
 */
export type Priority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

/**
 * Aggregate types for event sourcing
 */
export type AggregateType = 
  | 'mission'
  | 'workorder'
  | 'checkpoint';

/**
 * Event metadata for correlation and causation
 */
export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

/**
 * Base event interface
 */
export interface BaseEvent {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: AggregateType;
  timestamp: string;
  version: number;
  data: unknown;
  metadata?: EventMetadata;
}

/**
 * Snapshot interface for event store
 */
export interface Snapshot {
  id: string;
  aggregateId: string;
  aggregateType: AggregateType;
  data: unknown;
  version: number;
  timestamp: string;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Time range options
 */
export interface TimeRange {
  from: string;
  to: string;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  path?: string;
  readonly?: boolean;
}

/**
 * Result type for operations that may fail
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };
