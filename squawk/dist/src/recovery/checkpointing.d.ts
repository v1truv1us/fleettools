/**
 * Phase 3: Checkpoint Triggering System
 *
 * Implements automatic checkpoint creation based on:
 * - Progress milestones (25%, 50%, 75%)
 * - Error conditions (exceptions, API errors, lock timeouts, message failures)
 * - Manual triggers (user-initiated)
 *
 * All checkpoint operations are non-blocking async to avoid delaying mission progress.
 *
 * @since 1.0.0
 */
import type { Checkpoint, CreateCheckpointInput, CheckpointTrigger, Mission, Sortie, Lock, Message, AppendEventInput } from '../db/types.js';
export interface ProgressCheckpointTriggerOptions {
    /** Milestones to trigger checkpoints at (default: [25, 50, 75]) */
    milestones?: number[];
    /** Minimum time between checkpoints in ms (default: 60000 = 1 minute) */
    minIntervalMs?: number;
}
/**
 * Monitors mission progress and creates checkpoints at milestones
 *
 * Triggers checkpoints at 25%, 50%, 75% completion to enable recovery
 * from context window compaction at natural breakpoints.
 */
export declare class ProgressCheckpointTrigger {
    private lastCheckpointProgress;
    private lastCheckpointTime;
    private milestones;
    private minIntervalMs;
    constructor(options?: ProgressCheckpointTriggerOptions);
    /**
     * Check if progress milestone has been reached
     *
     * Returns true if:
     * 1. Current progress crosses a milestone threshold
     * 2. Minimum interval since last checkpoint has passed
     */
    shouldCheckpoint(currentProgress: number): boolean;
    /**
     * Record that a checkpoint was created at this progress level
     */
    recordCheckpoint(progress: number): void;
    /**
     * Get the next milestone after current progress
     */
    getNextMilestone(currentProgress: number): number | null;
}
export interface BlockerInfo {
    type: 'lock_timeout' | 'api_error' | 'dependency' | 'exception' | 'message_failure' | 'other';
    description: string;
    affected_sortie?: string;
    resolution_hint?: string;
    timestamp?: string;
    error_code?: string;
    error_details?: Record<string, unknown>;
}
export interface ErrorCheckpointTriggerOptions {
    /** Enable automatic error checkpoints (default: true) */
    enabled?: boolean;
    /** Minimum time between error checkpoints in ms (default: 30000 = 30 seconds) */
    minIntervalMs?: number;
}
/**
 * Detects error conditions and creates checkpoints to preserve state
 *
 * Monitors for:
 * - Unhandled exceptions in sorties
 * - API errors (4xx/5xx responses)
 * - Lock acquisition timeouts
 * - Message delivery failures
 *
 * Captures error details in recovery context for debugging and recovery.
 */
export declare class ErrorCheckpointTrigger {
    private lastErrorCheckpointTime;
    private minIntervalMs;
    private enabled;
    private recentErrors;
    constructor(options?: ErrorCheckpointTriggerOptions);
    /**
     * Check if error checkpoint should be created
     *
     * Returns true if:
     * 1. Error detection is enabled
     * 2. Minimum interval since last error checkpoint has passed
     */
    shouldCheckpoint(): boolean;
    /**
     * Record an unhandled exception
     */
    recordException(sortieId: string, error: Error | unknown, context?: Record<string, unknown>): BlockerInfo;
    /**
     * Record an API error
     */
    recordApiError(sortieId: string, statusCode: number, message: string, endpoint?: string): BlockerInfo;
    /**
     * Record a lock acquisition timeout
     */
    recordLockTimeout(sortieId: string, filePath: string, heldBy?: string): BlockerInfo;
    /**
     * Record a message delivery failure
     */
    recordMessageFailure(sortieId: string, messageId: string, reason: string): BlockerInfo;
    /**
     * Record a dependency blocker
     */
    recordDependencyBlocker(sortieId: string, dependsOn: string, reason?: string): BlockerInfo;
    /**
     * Record a generic blocker
     */
    recordBlocker(sortieId: string, blocker: BlockerInfo): BlockerInfo;
    /**
     * Get all blockers for a sortie
     */
    getBlockers(sortieId: string): BlockerInfo[];
    /**
     * Get all blockers across all sorties
     */
    getAllBlockers(): BlockerInfo[];
    /**
     * Clear blockers for a sortie (after recovery)
     */
    clearBlockers(sortieId: string): void;
    /**
     * Record that error checkpoint was created
     */
    recordCheckpoint(): void;
    /**
     * Internal: Add blocker to tracking
     */
    private addBlocker;
}
export interface CheckpointCreatorOptions {
    /** Database instance for storing checkpoints and events */
    db: {
        checkpoints: {
            create: (input: CreateCheckpointInput) => Promise<Checkpoint>;
        };
        events: {
            append: (input: AppendEventInput) => Promise<any>;
        };
        missions: {
            getById: (id: string) => Promise<Mission | null>;
        };
        sorties: {
            getByMission: (missionId: string) => Promise<Sortie[]>;
        };
        locks: {
            getActiveLocks: (missionId: string) => Promise<Lock[]>;
        };
        messages: {
            getPendingMessages: (missionId: string) => Promise<Message[]>;
        };
    };
    /** Agent ID creating the checkpoint */
    agentId: string;
}
/**
 * Creates checkpoints with full state snapshots
 *
 * Captures:
 * - Mission and sortie state
 * - Active file locks
 * - Pending messages
 * - Recovery context for LLM prompt injection
 */
export declare class CheckpointCreator {
    private db;
    private agentId;
    constructor(options: CheckpointCreatorOptions);
    /**
     * Create a checkpoint with full state snapshot
     *
     * Non-blocking: returns immediately, checkpoint creation happens in background
     */
    createCheckpoint(missionId: string, trigger: CheckpointTrigger, options?: {
        triggerDetails?: string;
        progressPercent?: number;
        blockers?: BlockerInfo[];
        ttlHours?: number;
    }): Promise<Checkpoint>;
    /**
     * Build recovery context for LLM prompt injection
     */
    private buildRecoveryContext;
    /**
     * Emit checkpoint_created event (non-blocking)
     */
    private emitCheckpointEvent;
}
export interface CheckpointCleanupOptions {
    /** TTL for checkpoints in days (default: 7) */
    ttlDays?: number;
    /** Minimum checkpoints to keep per mission (default: 3) */
    keepPerMission?: number;
    /** Include completed missions in cleanup (default: false) */
    includeCompletedMissions?: boolean;
    /** Run cleanup job automatically (default: true) */
    autoCleanup?: boolean;
    /** Cleanup job interval in ms (default: 86400000 = 24 hours) */
    cleanupIntervalMs?: number;
}
/**
 * Manages checkpoint lifecycle and cleanup
 *
 * Implements:
 * - TTL-based expiration (default 7 days)
 * - Per-mission retention (keep at least N checkpoints)
 * - Automatic cleanup job (runs daily)
 * - Archive support for old checkpoints
 */
export declare class CheckpointCleanupService {
    private db;
    private ttlDays;
    private keepPerMission;
    private includeCompletedMissions;
    private cleanupIntervalMs;
    private cleanupTimer?;
    constructor(db: CheckpointCleanupService['db'], options?: CheckpointCleanupOptions);
    /**
     * Start automatic cleanup job
     */
    startAutoCleanup(): void;
    /**
     * Stop automatic cleanup job
     */
    stopAutoCleanup(): void;
    /**
     * Run cleanup immediately
     *
     * Removes checkpoints older than TTL, keeping minimum per mission
     */
    cleanup(): Promise<number>;
    /**
     * Get cleanup statistics
     */
    getStats(): Promise<{
        total_checkpoints: number;
        expired_checkpoints: number;
        by_mission: Record<string, number>;
    }>;
}
//# sourceMappingURL=checkpointing.d.ts.map