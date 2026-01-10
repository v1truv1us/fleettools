/**
 * FleetTools Database Client Factory
 *
 * Creates and configures Drizzle database client.
 */
import { drizzle } from 'drizzle-orm/bun-sqlite';
import type { DatabaseConfig } from '@fleettools/core';
export type { DatabaseConfig };
export type DrizzleDB = ReturnType<typeof drizzle>;
/**
 * Options for creating FleetDB instance
 */
export interface CreateDbOptions {
    projectPath: string;
    filename?: string;
    readonly?: boolean;
}
/**
 * Create an in-memory database for testing
 */
export declare function createInMemoryDb(): DrizzleDB;
/**
 * Create a FleetDB instance for a project
 */
export declare function createFleetDb(options: CreateDbOptions): DrizzleDB;
/**
 * Create a configured Drizzle database client
 */
export declare function createDatabaseClient(config?: DatabaseConfig): DrizzleDB;
/**
 * Database health check function
 */
export declare function checkDatabaseHealth(db: DrizzleDB): Promise<{
    healthy: boolean;
    error?: string;
    latency?: number;
}>;
/**
 * Get database information
 */
export declare function getDatabaseInfo(db: DrizzleDB): Promise<{
    version: string;
    tables: Array<{
        name: string;
        rows: number;
    }>;
}>;
/**
 * Transaction helper with proper error handling
 */
export declare function withTransaction<T>(db: DrizzleDB, callback: (tx: any) => Promise<T>): Promise<T>;
/**
 * Create database connection pool (simplified for SQLite)
 */
export declare class DatabasePool {
    private clients;
    private readonly maxPoolSize;
    private readonly config;
    private currentIndex;
    constructor(config?: DatabaseConfig, maxPoolSize?: number);
    getClient(): DrizzleDB;
    initialize(): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=client.d.ts.map