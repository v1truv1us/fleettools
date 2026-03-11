/**
 * Progress Tracker for FleetTools Mission Management
 *
 * Tracks mission progress, agent status updates, and provides real-time metrics
 * Integrates with Squawk event system for coordination
 */
export declare enum MissionStatus {
    PLANNED = "planned",
    ACTIVE = "active",
    PAUSED = "paused",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export interface ProgressUpdate {
    missionId: string;
    agentId: string;
    progress: number;
    message?: string;
    timestamp: string;
}
export interface Mission {
    id: string;
    title: string;
    description: string;
    status: MissionStatus;
    progress: number;
    tasks: string[];
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    metadata: Record<string, any>;
}
export interface ProgressTrackerConfig {
    dbPath?: string;
    updateInterval?: number;
    eventRetention?: number;
}
export declare class ProgressTracker {
    private db;
    private config;
    private updateInterval?;
    constructor(config?: ProgressTrackerConfig);
    /**
     * Initialize database tables for progress tracking
     */
    private initializeDatabase;
    /**
     * Start a new mission
     */
    startMission(mission: Omit<Mission, 'id' | 'createdAt' | 'updatedAt' | 'progress'>): Promise<string>;
    /**
     * Update mission progress
     */
    updateProgress(update: ProgressUpdate): Promise<void>;
    /**
     * Recalculate mission progress based on latest updates
     */
    private recalculateMissionProgress;
    /**
     * Complete a mission
     */
    completeMission(missionId: string): Promise<void>;
    /**
     * Get mission details
     */
    getMission(missionId: string): Promise<Mission | null>;
    /**
     * Get all missions with optional status filter
     */
    getMissions(status?: MissionStatus): Promise<Mission[]>;
    /**
     * Get progress history for a mission
     */
    getProgressHistory(missionId: string, limit?: number): Promise<ProgressUpdate[]>;
    /**
     * Get real-time progress metrics
     */
    getProgressMetrics(): Promise<{
        totalMissions: number;
        activeMissions: number;
        completedMissions: number;
        averageProgress: number;
    }>;
    /**
     * Start periodic updates for real-time tracking
     */
    private startPeriodicUpdates;
    /**
     * Perform periodic maintenance tasks
     */
    private performPeriodicUpdate;
    /**
     * Close the progress tracker and cleanup resources
     */
    close(): Promise<void>;
}
//# sourceMappingURL=progress-tracker.d.ts.map