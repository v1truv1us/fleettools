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
/**
 * Lock queue entry
 */
export interface LockQueueEntry {
    specialist_id: string;
    file_path: string;
    timestamp: number;
    timeout_ms: number;
    purpose: 'edit' | 'read' | 'delete';
}
/**
 * Lock conflict
 */
export interface LockConflict {
    file_path: string;
    current_holder: string;
    current_holder_expires_at: string;
    requestor: string;
    timestamp: number;
}
/**
 * Lock acquisition result
 */
export interface LockAcquisitionResult {
    success: boolean;
    lock_id?: string;
    conflict?: LockConflict;
    queued?: boolean;
    queue_position?: number;
    error?: string;
}
/**
 * Lock Coordinator
 * Manages file locks and prevents conflicts
 */
export declare class LockCoordinator {
    private lockQueues;
    private conflicts;
    private logger;
    private readonly LOCK_EXPIRATION_MS;
    private readonly QUEUE_CHECK_INTERVAL_MS;
    /**
     * Create new lock coordinator
     */
    constructor();
    /**
     * Acquire lock for file
     */
    acquireLock(specialistId: string, filePath: string, durationMs: number, purpose?: 'edit' | 'read' | 'delete'): Promise<LockAcquisitionResult>;
    /**
     * Release lock
     */
    releaseLock(lockId: string): Promise<boolean>;
    /**
     * Queue lock request
     */
    private queueLockRequest;
    /**
     * Process lock queues
     */
    private processQueues;
    /**
     * Start queue processor
     */
    private startQueueProcessor;
    /**
     * Detect conflicts
     */
    detectConflicts(): Promise<LockConflict[]>;
    /**
     * Get lock queue for file
     */
    getQueueForFile(filePath: string): LockQueueEntry[];
    /**
     * Get all queued requests
     */
    getAllQueued(): LockQueueEntry[];
    /**
     * Get conflicts for file
     */
    getConflictsForFile(filePath: string): LockConflict[];
    /**
     * Clear old conflicts
     */
    clearOldConflicts(olderThanMs?: number): void;
    /**
     * Get coordinator status
     */
    getStatus(): {
        queued_requests: number;
        conflicts: number;
        files_with_queues: string[];
    };
}
/**
 * Get or create lock coordinator instance
 */
export declare function getLockCoordinator(): LockCoordinator;
/**
 * Reset lock coordinator instance
 */
export declare function resetLockCoordinator(): void;
//# sourceMappingURL=lock-coordinator.d.ts.map