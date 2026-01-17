/**
 * FleetTools Event Store (Simplified)
 *
 * Simplified append-only event store to avoid Drizzle API issues.
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
    constructor(db: DrizzleDB & {
        run: (sql: string, params?: any[]) => Promise<any>;
        all: (sql: string, params?: any[]) => Promise<any[]>;
        get: (sql: string, params?: any[]) => Promise<any>;
    });
    /**
     * Append an event to store
     */
    append(event: FleetEvent, projectKey: string): Promise<FleetEvent>;
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
