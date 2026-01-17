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
/**
 * Monitors mission progress and creates checkpoints at milestones
 *
 * Triggers checkpoints at 25%, 50%, 75% completion to enable recovery
 * from context window compaction at natural breakpoints.
 */
export class ProgressCheckpointTrigger {
    lastCheckpointProgress = 0;
    lastCheckpointTime = 0;
    milestones;
    minIntervalMs;
    constructor(options = {}) {
        this.milestones = options.milestones ?? [25, 50, 75];
        this.minIntervalMs = options.minIntervalMs ?? 60000; // 1 minute
    }
    /**
     * Check if progress milestone has been reached
     *
     * Returns true if:
     * 1. Current progress crosses a milestone threshold
     * 2. Minimum interval since last checkpoint has passed
     */
    shouldCheckpoint(currentProgress) {
        const now = Date.now();
        const timeSinceLastCheckpoint = now - this.lastCheckpointTime;
        // Check if minimum interval has passed
        if (timeSinceLastCheckpoint < this.minIntervalMs) {
            return false;
        }
        // Check if we've crossed a milestone
        for (const milestone of this.milestones) {
            if (this.lastCheckpointProgress < milestone &&
                currentProgress >= milestone) {
                return true;
            }
        }
        return false;
    }
    /**
     * Record that a checkpoint was created at this progress level
     */
    recordCheckpoint(progress) {
        this.lastCheckpointProgress = progress;
        this.lastCheckpointTime = Date.now();
    }
    /**
     * Get the next milestone after current progress
     */
    getNextMilestone(currentProgress) {
        for (const milestone of this.milestones) {
            if (currentProgress < milestone) {
                return milestone;
            }
        }
        return null;
    }
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
export class ErrorCheckpointTrigger {
    lastErrorCheckpointTime = 0;
    minIntervalMs;
    enabled;
    recentErrors = new Map();
    constructor(options = {}) {
        this.enabled = options.enabled ?? true;
        this.minIntervalMs = options.minIntervalMs ?? 30000; // 30 seconds
    }
    /**
     * Check if error checkpoint should be created
     *
     * Returns true if:
     * 1. Error detection is enabled
     * 2. Minimum interval since last error checkpoint has passed
     */
    shouldCheckpoint() {
        if (!this.enabled) {
            return false;
        }
        const now = Date.now();
        const timeSinceLastCheckpoint = now - this.lastErrorCheckpointTime;
        return timeSinceLastCheckpoint >= this.minIntervalMs;
    }
    /**
     * Record an unhandled exception
     */
    recordException(sortieId, error, context) {
        const blocker = {
            type: 'exception',
            description: `Unhandled exception in sortie ${sortieId}: ${error instanceof Error ? error.message : String(error)}`,
            affected_sortie: sortieId,
            resolution_hint: 'Review error details and retry sortie',
            timestamp: new Date().toISOString(),
            error_details: context,
        };
        this.addBlocker(sortieId, blocker);
        return blocker;
    }
    /**
     * Record an API error
     */
    recordApiError(sortieId, statusCode, message, endpoint) {
        const blocker = {
            type: 'api_error',
            description: `API error ${statusCode} from ${endpoint || 'unknown endpoint'}: ${message}`,
            affected_sortie: sortieId,
            resolution_hint: statusCode >= 500
                ? 'Server error - retry after delay'
                : 'Client error - check request and retry',
            timestamp: new Date().toISOString(),
            error_code: String(statusCode),
        };
        this.addBlocker(sortieId, blocker);
        return blocker;
    }
    /**
     * Record a lock acquisition timeout
     */
    recordLockTimeout(sortieId, filePath, heldBy) {
        const blocker = {
            type: 'lock_timeout',
            description: `Lock timeout on file ${filePath}${heldBy ? ` (held by ${heldBy})` : ''}`,
            affected_sortie: sortieId,
            resolution_hint: `Release lock on ${filePath} or wait for holder to complete`,
            timestamp: new Date().toISOString(),
        };
        this.addBlocker(sortieId, blocker);
        return blocker;
    }
    /**
     * Record a message delivery failure
     */
    recordMessageFailure(sortieId, messageId, reason) {
        const blocker = {
            type: 'message_failure',
            description: `Message delivery failed for ${messageId}: ${reason}`,
            affected_sortie: sortieId,
            resolution_hint: 'Verify recipient is available and retry message',
            timestamp: new Date().toISOString(),
        };
        this.addBlocker(sortieId, blocker);
        return blocker;
    }
    /**
     * Record a dependency blocker
     */
    recordDependencyBlocker(sortieId, dependsOn, reason) {
        const blocker = {
            type: 'dependency',
            description: `Blocked waiting for sortie ${dependsOn}${reason ? `: ${reason}` : ''}`,
            affected_sortie: sortieId,
            resolution_hint: `Wait for sortie ${dependsOn} to complete`,
            timestamp: new Date().toISOString(),
        };
        this.addBlocker(sortieId, blocker);
        return blocker;
    }
    /**
     * Record a generic blocker
     */
    recordBlocker(sortieId, blocker) {
        if (!blocker.timestamp) {
            blocker.timestamp = new Date().toISOString();
        }
        this.addBlocker(sortieId, blocker);
        return blocker;
    }
    /**
     * Get all blockers for a sortie
     */
    getBlockers(sortieId) {
        return this.recentErrors.get(sortieId) ?? [];
    }
    /**
     * Get all blockers across all sorties
     */
    getAllBlockers() {
        const all = [];
        for (const blockers of this.recentErrors.values()) {
            all.push(...blockers);
        }
        return all;
    }
    /**
     * Clear blockers for a sortie (after recovery)
     */
    clearBlockers(sortieId) {
        this.recentErrors.delete(sortieId);
    }
    /**
     * Record that error checkpoint was created
     */
    recordCheckpoint() {
        this.lastErrorCheckpointTime = Date.now();
    }
    /**
     * Internal: Add blocker to tracking
     */
    addBlocker(sortieId, blocker) {
        if (!this.recentErrors.has(sortieId)) {
            this.recentErrors.set(sortieId, []);
        }
        this.recentErrors.get(sortieId).push(blocker);
    }
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
export class CheckpointCreator {
    db;
    agentId;
    constructor(options) {
        this.db = options.db;
        this.agentId = options.agentId;
    }
    /**
     * Create a checkpoint with full state snapshot
     *
     * Non-blocking: returns immediately, checkpoint creation happens in background
     */
    async createCheckpoint(missionId, trigger, options) {
        // Get mission
        const mission = await this.db.missions.getById(missionId);
        if (!mission) {
            throw new Error(`Mission not found: ${missionId}`);
        }
        // Calculate progress
        const progressPercent = options?.progressPercent ??
            (mission.total_sorties > 0
                ? (mission.completed_sorties / mission.total_sorties) * 100
                : 0);
        // Get sorties
        const sorties = await this.db.sorties.getByMission(missionId);
        const sortieSnapshots = sorties.map((s) => ({
            id: s.id,
            status: s.status,
            assigned_to: s.assigned_to,
            files: s.files,
            started_at: s.started_at,
            progress: s.progress,
            progress_notes: s.progress_notes,
        }));
        // Get active locks
        const locks = await this.db.locks.getActiveLocks(missionId);
        const lockSnapshots = locks.map((l) => ({
            id: l.id,
            file: l.file,
            held_by: l.reserved_by,
            acquired_at: l.reserved_at,
            purpose: l.purpose,
            timeout_ms: new Date(l.expires_at).getTime() - Date.now(),
        }));
        // Get pending messages
        const messages = await this.db.messages.getPendingMessages(missionId);
        const messageSnapshots = messages.map((m) => ({
            id: m.id,
            from: m.sender_id ?? 'system',
            to: [m.mailbox_id],
            subject: m.message_type,
            sent_at: m.sent_at,
            delivered: m.status === 'acked',
        }));
        // Build recovery context
        const recoveryContext = this.buildRecoveryContext(mission, sorties, options?.blockers ?? []);
        // Create checkpoint
        const checkpoint = await this.db.checkpoints.create({
            mission_id: missionId,
            trigger,
            trigger_details: options?.triggerDetails,
            progress_percent: progressPercent,
            created_by: this.agentId,
            sorties: sortieSnapshots,
            active_locks: lockSnapshots,
            pending_messages: messageSnapshots,
            recovery_context: recoveryContext,
            ttl_hours: options?.ttlHours ?? 168, // 7 days default
        });
        // Emit checkpoint_created event (non-blocking)
        if (checkpoint) {
            this.emitCheckpointEvent(checkpoint).catch((err) => {
                console.error('Failed to emit checkpoint event:', err);
            });
        }
        return checkpoint;
    }
    /**
     * Build recovery context for LLM prompt injection
     */
    buildRecoveryContext(mission, sorties, blockers) {
        const completedSorties = sorties.filter((s) => s.status === 'completed');
        const inProgressSorties = sorties.filter((s) => s.status === 'in_progress');
        const blockedSorties = sorties.filter((s) => s.status === 'blocked');
        const pendingSorties = sorties.filter((s) => s.status === 'pending');
        // Build next steps
        const nextSteps = [];
        if (inProgressSorties.length > 0) {
            nextSteps.push(`Continue work on ${inProgressSorties.length} in-progress sortie(s)`);
        }
        if (blockedSorties.length > 0) {
            nextSteps.push(`Resolve blockers for ${blockedSorties.length} sortie(s)`);
        }
        if (pendingSorties.length > 0) {
            nextSteps.push(`Start ${pendingSorties.length} pending sortie(s)`);
        }
        if (nextSteps.length === 0) {
            nextSteps.push('Review mission status and continue');
        }
        // Build blocker descriptions
        const blockerDescriptions = blockers.map((b) => `${b.type}: ${b.description}`);
        // Build files modified
        const filesModified = new Set();
        for (const sortie of sorties) {
            if (sortie.files) {
                sortie.files.forEach((f) => filesModified.add(f));
            }
        }
        // Calculate elapsed time
        const startTime = mission.started_at
            ? new Date(mission.started_at).getTime()
            : new Date(mission.created_at).getTime();
        const elapsedMs = Date.now() - startTime;
        return {
            last_action: `Checkpoint created at ${progressPercent(mission)}% progress`,
            next_steps: nextSteps,
            blockers: blockerDescriptions,
            files_modified: Array.from(filesModified),
            mission_summary: `${mission.title}: ${completedSorties.length}/${mission.total_sorties} sorties completed`,
            elapsed_time_ms: elapsedMs,
            last_activity_at: new Date().toISOString(),
        };
    }
    /**
     * Emit checkpoint_created event (non-blocking)
     */
    async emitCheckpointEvent(checkpoint) {
        try {
            await this.db.events.append({
                event_type: 'checkpoint_created',
                stream_type: 'checkpoint',
                stream_id: checkpoint.id,
                data: {
                    checkpoint_id: checkpoint.id,
                    mission_id: checkpoint.mission_id,
                    trigger: checkpoint.trigger,
                    progress_percent: checkpoint.progress_percent,
                    created_by: checkpoint.created_by,
                },
                occurred_at: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('Failed to emit checkpoint_created event:', error);
            // Don't throw - checkpoint was already created
        }
    }
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
export class CheckpointCleanupService {
    db;
    ttlDays;
    keepPerMission;
    includeCompletedMissions;
    cleanupIntervalMs;
    cleanupTimer;
    constructor(db, options = {}) {
        this.db = db;
        this.ttlDays = options.ttlDays ?? 7;
        this.keepPerMission = options.keepPerMission ?? 3;
        this.includeCompletedMissions = options.includeCompletedMissions ?? false;
        this.cleanupIntervalMs = options.cleanupIntervalMs ?? 86400000; // 24 hours
        if (options.autoCleanup ?? true) {
            this.startAutoCleanup();
        }
    }
    /**
     * Start automatic cleanup job
     */
    startAutoCleanup() {
        if (this.cleanupTimer) {
            return; // Already running
        }
        this.cleanupTimer = setInterval(() => {
            this.cleanup().catch((err) => {
                console.error('Checkpoint cleanup failed:', err);
            });
        }, this.cleanupIntervalMs);
    }
    /**
     * Stop automatic cleanup job
     */
    stopAutoCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
    }
    /**
     * Run cleanup immediately
     *
     * Removes checkpoints older than TTL, keeping minimum per mission
     */
    async cleanup() {
        let deletedCount = 0;
        const now = Date.now();
        const ttlMs = this.ttlDays * 24 * 60 * 60 * 1000;
        // Get all checkpoints
        const allCheckpoints = await this.db.checkpoints.list();
        // Group by mission
        const byMission = new Map();
        for (const checkpoint of allCheckpoints) {
            if (!byMission.has(checkpoint.mission_id)) {
                byMission.set(checkpoint.mission_id, []);
            }
            byMission.get(checkpoint.mission_id).push(checkpoint);
        }
        // Process each mission
        for (const [missionId, checkpoints] of byMission) {
            // Check if mission is completed
            const mission = await this.db.missions.getById(missionId);
            if (mission?.status === 'completed' && !this.includeCompletedMissions) {
                continue;
            }
            // Sort by timestamp (newest first)
            checkpoints.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            // Keep minimum checkpoints, delete old ones
            for (let i = this.keepPerMission; i < checkpoints.length; i++) {
                const cp = checkpoints[i];
                if (!cp)
                    continue;
                const age = now - new Date(cp.timestamp).getTime();
                if (age > ttlMs) {
                    const deleted = await this.db.checkpoints.delete(cp.id);
                    if (deleted) {
                        deletedCount++;
                    }
                }
            }
        }
        return deletedCount;
    }
    /**
     * Get cleanup statistics
     */
    async getStats() {
        const now = Date.now();
        const ttlMs = this.ttlDays * 24 * 60 * 60 * 1000;
        const allCheckpoints = await this.db.checkpoints.list();
        let expiredCount = 0;
        const byMission = {};
        for (const checkpoint of allCheckpoints) {
            const age = now - new Date(checkpoint.timestamp).getTime();
            if (age > ttlMs) {
                expiredCount++;
            }
            const missionId = checkpoint.mission_id;
            if (!byMission[missionId]) {
                byMission[missionId] = 0;
            }
            byMission[missionId]++;
        }
        return {
            total_checkpoints: allCheckpoints.length,
            expired_checkpoints: expiredCount,
            by_mission: byMission,
        };
    }
}
// ============================================================================
// HELPER FUNCTION
// ============================================================================
function progressPercent(mission) {
    if (mission.total_sorties === 0)
        return 0;
    return Math.round((mission.completed_sorties / mission.total_sorties) * 100);
}
//# sourceMappingURL=checkpointing.js.map