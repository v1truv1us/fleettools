/**
 * Phase 3: Inactivity Detection
 *
 * Monitors mission activity and detects when a mission has been inactive
 * for longer than a threshold. Triggers recovery prompts to help users
 * resume work after context window compaction.
 *
 * @since 1.0.0
 */
import type { Mission, Event } from '../db/types.js';
export interface InactivityDetectorOptions {
    /** Inactivity threshold in milliseconds (default: 5 minutes) */
    inactivityThresholdMs?: number;
    /** Enable auto-resume flag support (default: true) */
    autoResumeEnabled?: boolean;
}
export interface InactivityStatus {
    mission_id: string;
    mission_title: string;
    is_inactive: boolean;
    inactivity_duration_ms: number;
    last_activity_at: string;
    last_activity_type?: string;
    should_prompt_recovery: boolean;
    recovery_checkpoint_available: boolean;
}
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
export declare class InactivityDetector {
    private inactivityThresholdMs;
    private autoResumeEnabled;
    constructor(options?: InactivityDetectorOptions);
    /**
     * Check if a mission is inactive
     *
     * Returns true if no events have been recorded for the mission
     * within the inactivity threshold.
     */
    isInactive(lastActivityTime: number): boolean;
    /**
     * Get inactivity duration in milliseconds
     */
    getInactivityDuration(lastActivityTime: number): number;
    /**
     * Format inactivity duration as human-readable string
     */
    formatDuration(durationMs: number): string;
    /**
     * Check inactivity status for a mission
     */
    checkStatus(mission: Mission, lastEventTime: number, hasCheckpoint: boolean): InactivityStatus;
    /**
     * Generate recovery prompt for user
     */
    generateRecoveryPrompt(status: InactivityStatus): string;
    /**
     * Check if auto-resume should be triggered
     *
     * Returns true if:
     * 1. Mission is inactive
     * 2. Checkpoint is available
     * 3. Auto-resume is enabled
     */
    shouldAutoResume(status: InactivityStatus): boolean;
    /**
     * Set inactivity threshold
     */
    setInactivityThreshold(thresholdMs: number): void;
    /**
     * Enable/disable auto-resume
     */
    setAutoResumeEnabled(enabled: boolean): void;
}
export interface InactivityMonitorOptions {
    /** Database instance for querying missions and events */
    db: {
        missions: {
            getByStatus: (status: string) => Promise<Mission[]>;
        };
        events: {
            getLatestByStream: (type: string, id: string) => Promise<Event | null>;
        };
        checkpoints: {
            getLatestByMission: (missionId: string) => Promise<any | null>;
        };
    };
    /** Detector instance */
    detector: InactivityDetector;
    /** Callback when inactivity is detected */
    onInactivityDetected?: (status: InactivityStatus) => Promise<void>;
}
/**
 * Monitors multiple missions for inactivity
 *
 * Periodically checks all in-progress missions and triggers
 * recovery prompts when inactivity is detected.
 */
export declare class InactivityMonitor {
    private db;
    private detector;
    private onInactivityDetected?;
    private monitoringTimer?;
    private isMonitoring;
    constructor(options: InactivityMonitorOptions);
    /**
     * Start monitoring missions for inactivity
     *
     * Runs check every 30 seconds by default
     */
    startMonitoring(intervalMs?: number): void;
    /**
     * Stop monitoring missions
     */
    stopMonitoring(): void;
    /**
     * Check all in-progress missions for inactivity
     */
    checkAllMissions(): Promise<InactivityStatus[]>;
    /**
     * Check specific mission for inactivity
     */
    checkMission(missionId: string): Promise<InactivityStatus | null>;
    /**
     * Get monitoring status
     */
    isActive(): boolean;
}
//# sourceMappingURL=detection.d.ts.map