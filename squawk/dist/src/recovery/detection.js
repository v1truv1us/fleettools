/**
 * Phase 3: Inactivity Detection
 *
 * Monitors mission activity and detects when a mission has been inactive
 * for longer than a threshold. Triggers recovery prompts to help users
 * resume work after context window compaction.
 *
 * @since 1.0.0
 */
/**
 * Detects mission inactivity and triggers recovery prompts
 *
 * Monitors:
 * - Time since last event for a mission
 * - Availability of recovery checkpoints
 * - User preference for auto-resume
 *
 * Helps users recover from context window compaction by detecting
 * when a mission has been idle and offering to resume from checkpoint.
 */
export class InactivityDetector {
    inactivityThresholdMs;
    autoResumeEnabled;
    constructor(options = {}) {
        this.inactivityThresholdMs = options.inactivityThresholdMs ?? 5 * 60 * 1000; // 5 minutes
        this.autoResumeEnabled = options.autoResumeEnabled ?? true;
    }
    /**
     * Check if a mission is inactive
     *
     * Returns true if no events have been recorded for the mission
     * within the inactivity threshold.
     */
    isInactive(lastActivityTime) {
        const now = Date.now();
        const inactivityDuration = now - lastActivityTime;
        return inactivityDuration > this.inactivityThresholdMs;
    }
    /**
     * Get inactivity duration in milliseconds
     */
    getInactivityDuration(lastActivityTime) {
        return Date.now() - lastActivityTime;
    }
    /**
     * Format inactivity duration as human-readable string
     */
    formatDuration(durationMs) {
        const seconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
        if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        }
        if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        }
        return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
    }
    /**
     * Check inactivity status for a mission
     */
    checkStatus(mission, lastEventTime, hasCheckpoint) {
        const inactivityDuration = this.getInactivityDuration(lastEventTime);
        const isInactive = this.isInactive(lastEventTime);
        return {
            mission_id: mission.id,
            mission_title: mission.title,
            is_inactive: isInactive,
            inactivity_duration_ms: inactivityDuration,
            last_activity_at: new Date(lastEventTime).toISOString(),
            should_prompt_recovery: isInactive && hasCheckpoint,
            recovery_checkpoint_available: hasCheckpoint,
        };
    }
    /**
     * Generate recovery prompt for user
     */
    generateRecoveryPrompt(status) {
        const duration = this.formatDuration(status.inactivity_duration_ms);
        const lines = [
            `🔄 Mission "${status.mission_title}" has been inactive for ${duration}.`,
            '',
            'Would you like to resume from the last checkpoint?',
            '',
            'Options:',
            '  --auto-resume    Resume automatically from checkpoint',
            '  --manual-resume  Review checkpoint before resuming',
            '  --start-fresh    Start a new mission',
            '',
            'Use: fleet resume --mission <id> [--auto-resume]',
        ];
        return lines.join('\n');
    }
    /**
     * Check if auto-resume should be triggered
     *
     * Returns true if:
     * 1. Mission is inactive
     * 2. Checkpoint is available
     * 3. Auto-resume is enabled
     */
    shouldAutoResume(status) {
        return (status.is_inactive &&
            status.recovery_checkpoint_available &&
            this.autoResumeEnabled);
    }
    /**
     * Set inactivity threshold
     */
    setInactivityThreshold(thresholdMs) {
        this.inactivityThresholdMs = thresholdMs;
    }
    /**
     * Enable/disable auto-resume
     */
    setAutoResumeEnabled(enabled) {
        this.autoResumeEnabled = enabled;
    }
}
/**
 * Monitors multiple missions for inactivity
 *
 * Periodically checks all in-progress missions and triggers
 * recovery prompts when inactivity is detected.
 */
export class InactivityMonitor {
    db;
    detector;
    onInactivityDetected;
    monitoringTimer;
    isMonitoring = false;
    constructor(options) {
        this.db = options.db;
        this.detector = options.detector;
        this.onInactivityDetected = options.onInactivityDetected;
    }
    /**
     * Start monitoring missions for inactivity
     *
     * Runs check every 30 seconds by default
     */
    startMonitoring(intervalMs = 30000) {
        if (this.isMonitoring) {
            return; // Already monitoring
        }
        this.isMonitoring = true;
        this.monitoringTimer = setInterval(() => {
            this.checkAllMissions().catch((err) => {
                console.error('Inactivity monitoring failed:', err);
            });
        }, intervalMs);
        // Run initial check immediately
        this.checkAllMissions().catch((err) => {
            console.error('Initial inactivity check failed:', err);
        });
    }
    /**
     * Stop monitoring missions
     */
    stopMonitoring() {
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = undefined;
        }
        this.isMonitoring = false;
    }
    /**
     * Check all in-progress missions for inactivity
     */
    async checkAllMissions() {
        const inactiveStatuses = [];
        try {
            // Get all in-progress missions
            const missions = await this.db.missions.getByStatus('in_progress');
            for (const mission of missions) {
                // Get latest event for this mission
                const latestEvent = await this.db.events.getLatestByStream('mission', mission.id);
                if (!latestEvent) {
                    continue; // No events yet
                }
                // Get latest checkpoint
                const checkpoint = await this.db.checkpoints.getLatestByMission(mission.id);
                // Check inactivity status
                const lastActivityTime = new Date(latestEvent.occurred_at).getTime();
                const status = this.detector.checkStatus(mission, lastActivityTime, !!checkpoint);
                if (status.is_inactive) {
                    inactiveStatuses.push(status);
                    // Trigger callback if provided
                    if (this.onInactivityDetected) {
                        try {
                            await this.onInactivityDetected(status);
                        }
                        catch (err) {
                            console.error('Inactivity callback failed:', err);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('Error checking missions for inactivity:', error);
        }
        return inactiveStatuses;
    }
    /**
     * Check specific mission for inactivity
     */
    async checkMission(missionId) {
        try {
            const mission = await this.db.missions.getByStatus('in_progress');
            const targetMission = mission.find((m) => m.id === missionId);
            if (!targetMission) {
                return null; // Mission not found or not in progress
            }
            const latestEvent = await this.db.events.getLatestByStream('mission', missionId);
            if (!latestEvent) {
                return null; // No events yet
            }
            const checkpoint = await this.db.checkpoints.getLatestByMission(missionId);
            const lastActivityTime = new Date(latestEvent.occurred_at).getTime();
            return this.detector.checkStatus(targetMission, lastActivityTime, !!checkpoint);
        }
        catch (error) {
            console.error(`Error checking mission ${missionId}:`, error);
            return null;
        }
    }
    /**
     * Get monitoring status
     */
    isActive() {
        return this.isMonitoring;
    }
}
//# sourceMappingURL=detection.js.map