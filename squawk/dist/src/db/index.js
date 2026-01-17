import path from 'path';
import fs from 'fs';
import { SQLiteAdapter } from './sqlite.js';
// CONFIGURATION
function getLegacyDbPath() {
    return path.join(process.env.HOME || '', '.local', 'share', 'fleet', 'squawk.json');
}
function getSqliteDbPath() {
    return path.join(process.env.HOME || '', '.local', 'share', 'fleet', 'squawk.db');
}
// PRIVATE STATE
let adapter = null;
// INITIALIZATION
export async function initializeDatabase(dbPath) {
    const targetPath = dbPath || getSqliteDbPath();
    const dbDir = path.dirname(targetPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    adapter = new SQLiteAdapter(targetPath, schemaPath);
    await adapter.initialize();
    const legacyDbPath = getLegacyDbPath();
    if (fs.existsSync(legacyDbPath)) {
        await migrateFromJson(legacyDbPath);
        const backupPath = legacyDbPath + '.backup';
        fs.renameSync(legacyDbPath, backupPath);
        console.log(`[Migration] Legacy data migrated to SQLite`);
        console.log(`[Migration] Backup saved to: ${backupPath}`);
    }
}
export function getAdapter() {
    if (!adapter) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return adapter;
}
export async function closeDatabase() {
    if (adapter) {
        await adapter.close();
        adapter = null;
    }
}
async function migrateFromJson(jsonPath) {
    console.log(`[Migration] Starting migration from: ${jsonPath}`);
    try {
        const content = fs.readFileSync(jsonPath, 'utf-8');
        const legacyData = JSON.parse(content);
        const stats = {
            mailboxes: 0,
            events: 0,
            cursors: 0,
            locks: 0,
        };
        for (const [id, mailbox] of Object.entries(legacyData.mailboxes || {})) {
            try {
                if (!mailbox.created_at || !mailbox.updated_at) {
                    console.warn(`[Migration] Skipping mailbox ${id} due to missing required fields`);
                    continue;
                }
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
        for (const [mailboxId, events] of Object.entries(legacyData.events || {})) {
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
export const mailboxOps = {
    getAll: async () => {
        const adapter = getAdapter();
        const mailboxes = await adapter.mailboxes.getAll();
        return mailboxes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    getById: async (id) => {
        const adapter = getAdapter();
        return adapter.mailboxes.getById(id);
    },
    create: async (id) => {
        const adapter = getAdapter();
        const now = new Date().toISOString();
        return adapter.mailboxes.create({
            id,
            created_at: now,
            updated_at: now,
        });
    },
    exists: async (id) => {
        const adapter = getAdapter();
        const mailbox = await adapter.mailboxes.getById(id);
        return mailbox !== null;
    },
};
export const eventOps = {
    getByMailbox: async (mailboxId) => {
        const adapter = getAdapter();
        const events = await adapter.events.queryByStream('squawk', mailboxId);
        return events.sort((a, b) => new Date(a.occurred_at).getTime() -
            new Date(b.occurred_at).getTime());
    },
    append: async (mailboxId, events) => {
        const adapter = getAdapter();
        if (!(await adapter.mailboxes.getById(mailboxId))) {
            await adapter.mailboxes.create({
                id: mailboxId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }
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
export const cursorOps = {
    getById: async (id) => {
        const adapter = getAdapter();
        return adapter.cursors.getById(id);
    },
    getByStream: async (streamId) => {
        const adapter = getAdapter();
        const cursors = await adapter.cursors.getAll();
        return (cursors.find((c) => c.stream_id === streamId) ||
            null);
    },
    upsert: async (cursor) => {
        const adapter = getAdapter();
        const id = cursor.id || `${cursor.stream_id}_cursor`;
        const now = new Date().toISOString();
        const existing = await adapter.cursors.getById(id);
        if (existing) {
            await adapter.cursors.update(id, {
                position: cursor.position,
                updated_at: now,
            });
            return existing;
        }
        else {
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
export const lockOps = {
    getAll: async () => {
        const adapter = getAdapter();
        const allLocks = await adapter.locks.getAll();
        const now = new Date().toISOString();
        return allLocks.filter((lock) => {
            if (lock.status === 'released')
                return false;
            const expiresAt = lock.expires_at;
            return expiresAt > now;
        });
    },
    getById: async (id) => {
        const adapter = getAdapter();
        return adapter.locks.getById(id);
    },
    acquire: async (lock) => {
        const adapter = getAdapter();
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
    release: async (id) => {
        const adapter = getAdapter();
        const lock = await adapter.locks.getById(id);
        if (lock) {
            await adapter.locks.release(id);
            return lock;
        }
        return null;
    },
    getExpired: async () => {
        const adapter = getAdapter();
        const allLocks = await adapter.locks.getAll();
        const now = new Date().toISOString();
        return allLocks.filter((lock) => {
            if (lock.status === 'released')
                return false;
            const expiresAt = lock.expires_at;
            return expiresAt <= now;
        });
    },
    releaseExpired: async () => {
        const expired = await lockOps.getExpired();
        for (const lock of expired) {
            await lockOps.release(lock.id);
        }
        return expired.length;
    },
};
//# sourceMappingURL=index.js.map