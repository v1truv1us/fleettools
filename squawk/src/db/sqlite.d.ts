/**
 * SQLite Database Adapter
 *
 * Provides SQLite-based persistence using Bun's built-in SQLite support.
 * This adapter implements the DatabaseAdapter interface for Phase 2.
 *
 * @version 1.0.0
 */
import Database from 'bun:sqlite';
import type { DatabaseAdapter, DatabaseStats, MissionOps, SortieOps, LockOps, EventOps, CheckpointOps, SpecialistOps, MessageOps, CursorOps } from './types.js';
/**
 * SQLite database adapter implementation
 */
export declare class SQLiteAdapter implements DatabaseAdapter {
    version: "1.0.0";
    private db;
    private dbPath;
    private schemaPath;
    missions: MissionOps;
    sorties: SortieOps;
    locks: LockOps;
    events: EventOps;
    checkpoints: CheckpointOps;
    specialists: SpecialistOps;
    messages: MessageOps;
    cursors: CursorOps;
    /**
     * Create a new SQLite adapter
     * @param dbPath - Path to database file (or ':memory:' for in-memory)
     * @param schemaPath - Optional custom schema path (for testing)
     */
    constructor(dbPath?: string, schemaPath?: string);
    /**
     * Resolve schema.sql path using multiple fallback strategies
     */
    private resolveSchemaPath;
    /**
     * Initialize database connection and schema
     */
    initialize(): Promise<void>;
    /**
     * Initialize operation objects
     */
    private initializeOperations;
    /**
     * Close database connection
     */
    close(): Promise<void>;
    /**
     * Check if database is healthy
     */
    isHealthy(): Promise<boolean>;
    /**
     * Get database statistics
     */
    getStats(): Promise<DatabaseStats>;
    /**
     * Run database maintenance (VACUUM, etc.)
     */
    maintenance(): Promise<void>;
    /**
     * Begin database transaction
     */
    beginTransaction(): Promise<void>;
    /**
     * Commit database transaction
     */
    commitTransaction(): Promise<void>;
    /**
     * Rollback database transaction
     */
    rollbackTransaction(): Promise<void>;
    /**
     * Get the underlying database instance (for advanced usage)
     */
    getDatabase(): Database | null;
}
/**
 * Factory function to create a SQLite adapter
 * @param dbPath - Path to database file (or ':memory:' for in-memory)
 * @returns Initialized SQLite adapter
 */
export declare function createSQLiteAdapter(dbPath?: string): Promise<SQLiteAdapter>;
/**
 * Factory function to create an in-memory SQLite adapter (for testing)
 * @returns Initialized in-memory SQLite adapter
 */
export declare function createInMemoryAdapter(): Promise<SQLiteAdapter>;
//# sourceMappingURL=sqlite.d.ts.map