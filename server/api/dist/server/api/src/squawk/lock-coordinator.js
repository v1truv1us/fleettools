/**
 * FleetTools Lock Coordinator
 *
 * Coordinates file locks across specialists to prevent conflicts.
 * Features:
 * - Lock acquisition with timeout
 * - Lock release
 * - Conflict detection
 * - Conflict resolution (queue)
 * - Lock expiration
 * - Integration with CTK (file system)
 *
 * @version 1.0.0
 * @since 2026-01-08
 */
import { getAdapter } from '../../../../squawk/src/db/index.js';
// ============================================================================
// LOCK COORDINATOR CLASS
// ============================================================================
/**
 * Lock Coordinator
 * Manages file locks and prevents conflicts
 */
export class LockCoordinator {
    lockQueues;
    conflicts;
    logger;
    // Configuration
    LOCK_EXPIRATION_MS = 300000; // 5 minutes
    QUEUE_CHECK_INTERVAL_MS = 1000; // 1 second
    /**
     * Create new lock coordinator
     */
    constructor() {
        this.lockQueues = new Map();
        this.conflicts = new Map();
        this.logger = console;
        this.startQueueProcessor();
    }
    /**
     * Acquire lock for file
     */
    async acquireLock(specialistId, filePath, durationMs, purpose = 'edit') {
        this.logger.log(`[LockCoordinator] Acquiring lock for ${filePath} by ${specialistId}`);
        const db = getAdapter();
        // Check for existing lock
        const existingLock = await db.locks.getByFile(filePath);
        if (existingLock && existingLock.status === 'active') {
            // Conflict detected
            this.logger.warn(`[LockCoordinator] Lock conflict for ${filePath}: held by ${existingLock.reserved_by}`);
            const conflict = {
                file_path: filePath,
                current_holder: existingLock.reserved_by,
                current_holder_expires_at: existingLock.expires_at,
                requestor: specialistId,
                timestamp: Date.now(),
            };
            // Record conflict
            if (!this.conflicts.has(filePath)) {
                this.conflicts.set(filePath, []);
            }
            this.conflicts.get(filePath).push(conflict);
            // Add to queue
            return this.queueLockRequest(specialistId, filePath, durationMs, purpose);
        }
        // Try to acquire lock
        try {
            const result = await db.locks.acquire({
                file: filePath,
                specialist_id: specialistId,
                timeout_ms: durationMs,
                purpose,
            });
            if (result.lock) {
                this.logger.log(`[LockCoordinator] Lock acquired for ${filePath}: ${result.lock.id}`);
                return {
                    success: true,
                    lock_id: result.lock.id,
                };
            }
            else if (result.existing_lock) {
                // Conflict
                const conflict = {
                    file_path: filePath,
                    current_holder: result.existing_lock.reserved_by,
                    current_holder_expires_at: result.existing_lock.expires_at,
                    requestor: specialistId,
                    timestamp: Date.now(),
                };
                if (!this.conflicts.has(filePath)) {
                    this.conflicts.set(filePath, []);
                }
                this.conflicts.get(filePath).push(conflict);
                return this.queueLockRequest(specialistId, filePath, durationMs, purpose);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`[LockCoordinator] Error acquiring lock for ${filePath}:`, message);
            return {
                success: false,
                error: message,
            };
        }
        return {
            success: false,
            error: 'Unknown error',
        };
    }
    /**
     * Release lock
     */
    async releaseLock(lockId) {
        this.logger.log(`[LockCoordinator] Releasing lock ${lockId}`);
        const db = getAdapter();
        try {
            const released = await db.locks.release(lockId);
            if (released) {
                this.logger.log(`[LockCoordinator] Lock released: ${lockId}`);
                return true;
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`[LockCoordinator] Error releasing lock ${lockId}:`, message);
        }
        return false;
    }
    /**
     * Queue lock request
     */
    async queueLockRequest(specialistId, filePath, durationMs, purpose) {
        this.logger.log(`[LockCoordinator] Queueing lock request for ${filePath} by ${specialistId}`);
        if (!this.lockQueues.has(filePath)) {
            this.lockQueues.set(filePath, []);
        }
        const queue = this.lockQueues.get(filePath);
        const entry = {
            specialist_id: specialistId,
            file_path: filePath,
            timestamp: Date.now(),
            timeout_ms: durationMs,
            purpose,
        };
        queue.push(entry);
        const queuePosition = queue.length;
        this.logger.log(`[LockCoordinator] Lock request queued at position ${queuePosition}`);
        return {
            success: false,
            queued: true,
            queue_position: queuePosition,
            error: `Lock conflict. Queued at position ${queuePosition}`,
        };
    }
    /**
     * Process lock queues
     */
    async processQueues() {
        const db = getAdapter();
        for (const [filePath, queue] of this.lockQueues) {
            if (queue.length === 0) {
                continue;
            }
            // Check if current lock is released
            const currentLock = await db.locks.getByFile(filePath);
            if (!currentLock || currentLock.status !== 'active') {
                // Lock is free, try to acquire for next in queue
                const nextEntry = queue.shift();
                if (nextEntry) {
                    this.logger.log(`[LockCoordinator] Processing queue for ${filePath}, trying specialist ${nextEntry.specialist_id}`);
                    try {
                        const result = await db.locks.acquire({
                            file: filePath,
                            specialist_id: nextEntry.specialist_id,
                            timeout_ms: nextEntry.timeout_ms,
                            purpose: nextEntry.purpose,
                        });
                        if (result.lock) {
                            this.logger.log(`[LockCoordinator] Lock acquired for queued request: ${result.lock.id}`);
                        }
                    }
                    catch (error) {
                        const message = error instanceof Error ? error.message : 'Unknown error';
                        this.logger.error(`[LockCoordinator] Error acquiring queued lock:`, message);
                        // Re-queue the entry
                        queue.unshift(nextEntry);
                    }
                }
            }
        }
    }
    /**
     * Start queue processor
     */
    startQueueProcessor() {
        setInterval(() => {
            this.processQueues().catch(error => {
                this.logger.error('[LockCoordinator] Error processing queues:', error);
            });
        }, this.QUEUE_CHECK_INTERVAL_MS);
    }
    /**
     * Detect conflicts
     */
    async detectConflicts() {
        const allConflicts = [];
        for (const conflicts of this.conflicts.values()) {
            allConflicts.push(...conflicts);
        }
        return allConflicts;
    }
    /**
     * Get lock queue for file
     */
    getQueueForFile(filePath) {
        return this.lockQueues.get(filePath) || [];
    }
    /**
     * Get all queued requests
     */
    getAllQueued() {
        const allQueued = [];
        for (const queue of this.lockQueues.values()) {
            allQueued.push(...queue);
        }
        return allQueued;
    }
    /**
     * Get conflicts for file
     */
    getConflictsForFile(filePath) {
        return this.conflicts.get(filePath) || [];
    }
    /**
     * Clear old conflicts
     */
    clearOldConflicts(olderThanMs = 3600000) {
        const now = Date.now();
        for (const [filePath, conflicts] of this.conflicts) {
            const filtered = conflicts.filter(c => now - c.timestamp < olderThanMs);
            if (filtered.length === 0) {
                this.conflicts.delete(filePath);
            }
            else {
                this.conflicts.set(filePath, filtered);
            }
        }
    }
    /**
     * Get coordinator status
     */
    getStatus() {
        return {
            queued_requests: Array.from(this.lockQueues.values()).reduce((sum, q) => sum + q.length, 0),
            conflicts: Array.from(this.conflicts.values()).reduce((sum, c) => sum + c.length, 0),
            files_with_queues: Array.from(this.lockQueues.keys()),
        };
    }
}
// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
let coordinatorInstance = null;
/**
 * Get or create lock coordinator instance
 */
export function getLockCoordinator() {
    if (!coordinatorInstance) {
        coordinatorInstance = new LockCoordinator();
    }
    return coordinatorInstance;
}
/**
 * Reset lock coordinator instance
 */
export function resetLockCoordinator() {
    coordinatorInstance = null;
}
//# sourceMappingURL=lock-coordinator.js.map