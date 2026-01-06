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
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { SQLiteAdapter } from './sqlite';
// ============================================================================
// CONFIGURATION
// ============================================================================
function getLegacyDbPath() {
    return path.join(process.env.HOME || '', '.local', 'share', 'fleet', 'squawk.json');
}
function getSqliteDbPath() {
    return path.join(process.env.HOME || '', '.local', 'share', 'fleet', 'squawk.db');
}
// ============================================================================
// PRIVATE STATE
// ============================================================================
let adapter = null;
// ============================================================================
// INITIALIZATION
// ============================================================================
/**
 * Initialize database with automatic migration from JSON if needed
 * @param dbPath - Optional custom database path (default: ~/.local/share/fleet/squawk.db)
 */
export async function initializeDatabase(dbPath) {
    const targetPath = dbPath || getSqliteDbPath();
    // Ensure directory exists
    const dbDir = path.dirname(targetPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    // Create and initialize SQLite adapter
    adapter = new SQLiteAdapter(targetPath);
    await adapter.initialize();
    // Check for legacy JSON data and migrate
    const legacyDbPath = getLegacyDbPath();
    if (fs.existsSync(legacyDbPath)) {
        await migrateFromJson(legacyDbPath);
        // Rename old JSON file to .backup
        const backupPath = legacyDbPath + '.backup';
        fs.renameSync(legacyDbPath, backupPath);
        console.log(`[Migration] Legacy data migrated to SQLite`);
        console.log(`[Migration] Backup saved to: ${backupPath}`);
    }
}
/**
 * Get the database adapter (throws if not initialized)
 * @throws {Error} If database not initialized
 */
export function getAdapter() {
    if (!adapter) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return adapter;
}
/**
 * Close database connection
 */
export async function closeDatabase() {
    if (adapter) {
        await adapter.close();
        adapter = null;
    }
}
/**
 * Migrate data from legacy JSON file to SQLite
 * @param jsonPath - Path to legacy JSON file
 */
async function migrateFromJson(jsonPath) {
    console.log(`[Migration] Starting migration from: ${jsonPath}`);
    try {
        // Read and parse legacy JSON
        const content = fs.readFileSync(jsonPath, 'utf-8');
        const legacyData = JSON.parse(content);
        // Migration statistics
        const stats = {
            mailboxes: 0,
            events: 0,
            cursors: 0,
            locks: 0,
        };
        // Migrate mailboxes
        for (const [id, mailbox] of Object.entries(legacyData.mailboxes || {})) {
            try {
                // Skip mailboxes without required fields
                if (!mailbox.created_at || !mailbox.updated_at) {
                    console.warn(`[Migration] Skipping mailbox ${id} due to missing required fields`);
                    continue;
                }
                // Create mailbox with original ID for direct compatibility
                await adapter.mailboxes.create({
                    id,
                    created_at: mailbox.created_at,
                    updated_at: mailbox.updated_at,
                });
                stats.mailboxes++;
            }
            catch (error) {
                console.warn(`[Migration] Failed to migrate mailbox ${id}:`, error);
            }
        }
        // Migrate events
        for (const [mailboxId, events] of Object.entries(legacyData.events || {})) {
            // Ensure mailbox exists (auto-create behavior)
            if (!(await adapter.mailboxes.getById(mailboxId))) {
                await adapter.mailboxes.create({
                    id: mailboxId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
                stats.mailboxes++;
            }
            for (const event of events) {
                try {
                    // Skip events without required type field
                    if (!event.type) {
                        console.warn(`[Migration] Skipping event without type field in mailbox ${mailboxId}`);
                        continue;
                    }
                    await adapter.events.append({
                        event_type: event.type,
                        stream_type: 'squawk',
                        stream_id: mailboxId,
                        data: typeof event.data === 'string'
                            ? JSON.parse(event.data)
                            : event.data,
                        occurred_at: event.occurred_at,
                        causation_id: event.causation_id,
                        correlation_id: event.correlation_id,
                        metadata: event.metadata
                            ? typeof event.metadata === 'string'
                                ? JSON.parse(event.metadata)
                                : event.metadata
                            : undefined,
                    });
                    stats.events++;
                }
                catch (error) {
                    console.warn(`[Migration] Failed to migrate event:`, error);
                }
            }
        }
        // Migrate cursors
        for (const [id, cursor] of Object.entries(legacyData.cursors || {})) {
            try {
                await adapter.cursors.create({
                    id,
                    stream_type: 'squawk',
                    stream_id: cursor.stream_id,
                    position: cursor.position,
                    consumer_id: cursor.consumer_id || 'migrated',
                });
                stats.cursors++;
            }
            catch (error) {
                console.warn(`[Migration] Failed to migrate cursor ${id}:`, error);
            }
        }
        // Migrate locks (only active ones - skip released locks)
        for (const [id, lock] of Object.entries(legacyData.locks || {})) {
            const lockData = lock;
            if (!lockData.released_at) {
                try {
                    await adapter.locks.acquire({
                        file: lockData.file,
                        specialist_id: lockData.reserved_by,
                        timeout_ms: lockData.timeout_ms || 30000,
                        purpose: lockData.purpose === 'delete'
                            ? 'delete'
                            : lockData.purpose === 'read'
                                ? 'read'
                                : 'edit',
                        checksum: lockData.checksum,
                    });
                    stats.locks++;
                }
                catch (error) {
                    console.warn(`[Migration] Failed to migrate lock ${id}:`, error);
                }
            }
        }
        console.log(`[Migration] Complete:`);
        console.log(`  - Mailboxes: ${stats.mailboxes}`);
        console.log(`  - Events: ${stats.events}`);
        console.log(`  - Cursors: ${stats.cursors}`);
        console.log(`  - Locks: ${stats.locks}`);
    }
    catch (error) {
        console.error('[Migration] Failed:', error);
        throw error;
    }
}
// ============================================================================
// BACKWARD-COMPATIBLE API
// ============================================================================
/**
 * Mailbox operations - backward compatible with legacy API
 */
export const mailboxOps = {
    /**
     * Get all mailboxes sorted by created_at descending (newest first)
     */
    getAll: async () => {
        const adapter = getAdapter();
        const mailboxes = await adapter.mailboxes.getAll();
        // Sort by created_at descending (legacy behavior)
        return mailboxes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    /**
     * Get mailbox by ID
     */
    getById: async (id) => {
        const adapter = getAdapter();
        return adapter.mailboxes.getById(id);
    },
    /**
     * Create new mailbox
     */
    create: async (id) => {
        const adapter = getAdapter();
        const now = new Date().toISOString();
        return adapter.mailboxes.create({
            id,
            created_at: now,
            updated_at: now,
        });
    },
    /**
     * Check if mailbox exists
     */
    exists: async (id) => {
        const adapter = getAdapter();
        const mailbox = await adapter.mailboxes.getById(id);
        return mailbox !== null;
    },
};
/**
 * Event operations - backward compatible with legacy API
 */
export const eventOps = {
    /**
     * Get events for a mailbox (sorted by occurred_at ascending)
     */
    getByMailbox: async (mailboxId) => {
        const adapter = getAdapter();
        // Query events by stream (mailbox)
        const events = await adapter.events.queryByStream('squawk', mailboxId);
        // Sort by occurred_at ascending (oldest first) - legacy behavior
        return events.sort((a, b) => new Date(a.occurred_at).getTime() -
            new Date(b.occurred_at).getTime());
    },
    /**
     * Append events to mailbox (array input, returns inserted events)
     */
    append: async (mailboxId, events) => {
        const adapter = getAdapter();
        // Ensure mailbox exists (auto-create behavior from legacy)
        if (!(await adapter.mailboxes.getById(mailboxId))) {
            await adapter.mailboxes.create({
                id: mailboxId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }
        // Append each event
        const inserted = [];
        for (const event of events) {
            const appended = await adapter.events.append({
                event_type: event.type,
                stream_type: 'squawk',
                stream_id: mailboxId,
                data: typeof event.data === 'string'
                    ? JSON.parse(event.data)
                    : event.data,
                occurred_at: event.occurred_at,
                causation_id: event.causation_id,
                correlation_id: event.correlation_id,
                metadata: event.metadata
                    ? typeof event.metadata === 'string'
                        ? JSON.parse(event.metadata)
                        : event.metadata
                    : undefined,
            });
            inserted.push(appended);
        }
        return inserted;
    },
};
/**
 * Cursor operations - backward compatible with legacy API
 */
export const cursorOps = {
    /**
     * Get cursor by ID
     */
    getById: async (id) => {
        const adapter = getAdapter();
        return adapter.cursors.getById(id);
    },
    /**
     * Get cursor by stream ID (legacy: getByStream)
     */
    getByStream: async (streamId) => {
        const adapter = getAdapter();
        // Get cursor by stream_id (we'll query by stream)
        const cursors = await adapter.cursors.getAll();
        return (cursors.find((c) => c.stream_id === streamId) ||
            null);
    },
    /**
     * Create or update cursor (legacy: upsert)
     */
    upsert: async (cursor) => {
        const adapter = getAdapter();
        const id = cursor.id || `${cursor.stream_id}_cursor`;
        const now = new Date().toISOString();
        // Try to get existing cursor
        const existing = await adapter.cursors.getById(id);
        if (existing) {
            // Update existing
            await adapter.cursors.update(id, {
                position: cursor.position,
                updated_at: now,
            });
            return existing;
        }
        else {
            // Create new
            return adapter.cursors.create({
                id,
                stream_type: 'squawk',
                stream_id: cursor.stream_id,
                position: cursor.position,
                consumer_id: cursor.consumer_id || 'default',
            });
        }
    },
};
/**
 * Lock operations - backward compatible with legacy API
 */
export const lockOps = {
    /**
     * Get all active locks (not released, not expired)
     */
    getAll: async () => {
        const adapter = getAdapter();
        const allLocks = await adapter.locks.getAll();
        const now = new Date().toISOString();
        // Filter to only active locks (not released, not expired)
        return allLocks.filter((lock) => {
            if (lock.status === 'released')
                return false;
            // Check if expired
            const expiresAt = lock.expires_at;
            return expiresAt > now;
        });
    },
    /**
     * Get lock by ID
     */
    getById: async (id) => {
        const adapter = getAdapter();
        return adapter.locks.getById(id);
    },
    /**
     * Acquire lock
     */
    acquire: async (lock) => {
        const adapter = getAdapter();
        const id = lock.id || randomUUID();
        const result = await adapter.locks.acquire({
            file: lock.file,
            specialist_id: lock.reserved_by || lock.specialist_id,
            timeout_ms: lock.timeout_ms || 30000,
            purpose: lock.purpose === 'delete'
                ? 'delete'
                : lock.purpose === 'read'
                    ? 'read'
                    : 'edit',
            checksum: lock.checksum,
        });
        if (result.conflict) {
            // Return the existing lock as if it was acquired
            // (legacy behavior: acquire always returns a lock object)
            return result.existing_lock || {
                id: result.lock?.id || '',
                file: lock.file,
                reserved_by: result.lock?.reserved_by || '',
                reserved_at: result.lock?.reserved_at || '',
                released_at: null,
                purpose: lock.purpose || 'edit',
                checksum: lock.checksum,
                timeout_ms: lock.timeout_ms || 30000,
                metadata: lock.metadata,
            };
        }
        return result.lock;
    },
    /**
     * Release lock by ID
     */
    release: async (id) => {
        const adapter = getAdapter();
        const lock = await adapter.locks.getById(id);
        if (lock) {
            await adapter.locks.release(id);
            return lock;
        }
        return null;
    },
    /**
     * Get expired locks
     */
    getExpired: async () => {
        const adapter = getAdapter();
        const allLocks = await adapter.locks.getAll();
        const now = new Date().toISOString();
        return allLocks.filter((lock) => {
            if (lock.status === 'released')
                return false;
            // Check if expired
            const expiresAt = lock.expires_at;
            return expiresAt <= now;
        });
    },
    /**
     * Release all expired locks
     */
    releaseExpired: async () => {
        const expired = await lockOps.getExpired();
        for (const lock of expired) {
            await lockOps.release(lock.id);
        }
        return expired.length;
    },
};
//# sourceMappingURL=index.js.map