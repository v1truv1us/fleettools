/**
 * FleetTools Squawk Database Module - SQLite Adapter Wrapper
 *
 * This module provides backward-compatible wrapper over SQLiteAdapter
 * while maintaining the same public API as the legacy JSON implementation.
 *
 * Migration Strategy:
 * - On first run, detect legacy JSON file and migrate to SQLite
 * - Rename old JSON file to .backup after successful migration
 * - Maintain all existing API signatures for backward compatibility
 *
 * @version 2.0.0 (migrated from legacy JSON implementation)
 */
import { SQLiteAdapter } from './sqlite';
import type { Event, Mailbox, Cursor, Lock } from './types';
/**
 * Initialize database with automatic migration from JSON if needed
 * @param dbPath - Optional custom database path (default: ~/.local/share/fleet/squawk.db)
 */
export declare function initializeDatabase(dbPath?: string): Promise<void>;
/**
 * Get the database adapter (throws if not initialized)
 * @throws {Error} If database not initialized
 */
export declare function getAdapter(): SQLiteAdapter;
/**
 * Close database connection
 */
export declare function closeDatabase(): Promise<void>;
/**
 * Mailbox operations - backward compatible with legacy API
 */
export declare const mailboxOps: {
    /**
     * Get all mailboxes sorted by created_at descending (newest first)
     */
    getAll: () => Promise<any>;
    /**
     * Get mailbox by ID
     */
    getById: (id: string) => Promise<any>;
    /**
     * Create new mailbox
     */
    create: (id: string) => Promise<any>;
    /**
     * Check if mailbox exists
     */
    exists: (id: string) => Promise<boolean>;
};
/**
 * Event operations - backward compatible with legacy API
 */
export declare const eventOps: {
    /**
     * Get events for a mailbox (sorted by occurred_at ascending)
     */
    getByMailbox: (mailboxId: string) => Promise<any>;
    /**
     * Append events to mailbox (array input, returns inserted events)
     */
    append: (mailboxId: string, events: any[]) => Promise<Event[]>;
};
/**
 * Cursor operations - backward compatible with legacy API
 */
export declare const cursorOps: {
    /**
     * Get cursor by ID
     */
    getById: (id: string) => Promise<any>;
    /**
     * Get cursor by stream ID (legacy: getByStream)
     */
    getByStream: (streamId: string) => Promise<any>;
    /**
     * Create or update cursor (legacy: upsert)
     */
    upsert: (cursor: any) => Promise<any>;
};
/**
 * Lock operations - backward compatible with legacy API
 */
export declare const lockOps: {
    /**
     * Get all active locks (not released, not expired)
     */
    getAll: () => Promise<any>;
    /**
     * Get lock by ID
     */
    getById: (id: string) => Promise<any>;
    /**
     * Acquire lock
     */
    acquire: (lock: any) => Promise<any>;
    /**
     * Release lock by ID
     */
    release: (id: string) => Promise<any>;
    /**
     * Get expired locks
     */
    getExpired: () => Promise<any>;
    /**
     * Release all expired locks
     */
    releaseExpired: () => Promise<any>;
};
export type { Mailbox, Event, Cursor, Lock };
//# sourceMappingURL=index.d.ts.map