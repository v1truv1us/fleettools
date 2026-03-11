/**
 * FleetTools Event Store
 *
 * Simplified append-only event store using raw SQL for compatibility.
 */
import type { DrizzleDB } from '@fleettools/db';
import { type FleetEvent } from './types/index.js';
/**
 * Options for querying events
 */
export interface QueryEventsOptions {
    project_key: string;
    type?: string | string[];
    from_sequence?: number;
    to_sequence?: number;
    from_timestamp?: string;
    to_timestamp?: string;
    limit?: number;
    offset?: number;
    order?: 'asc' | 'desc';
}
/**
 * Event store class for append-only storage and retrieval
 */
export declare class EventStore {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Get the underlying SQLite database for raw SQL access
     */
    private getSQLiteDb;
    /**
     * Append an event to store
     */
    append(event: FleetEvent, projectKey: string): Promise<FleetEvent>;
    /**
     * Ensure events table exists
     */
    private ensureTablesExist;
    /**
     * Query events with filtering options
     */
    query(options: QueryEventsOptions): Promise<FleetEvent[]>;
    /**
     * Get the latest event for a project
     */
    getLatest(projectKey: string): Promise<FleetEvent | null>;
    /**
     * Get the latest sequence number for a project
     */
    getLatestSequence(projectKey: string): Promise<number>;
    /**
     * Count events matching the criteria
     */
    count(projectKey: string, options?: Partial<QueryEventsOptions>): Promise<number>;
    /**
     * Create an EventStore instance from a database connection
     */
    static fromDb(db: DrizzleDB): EventStore;
}
//# sourceMappingURL=store.d.ts.map