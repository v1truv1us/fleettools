/**
 * FleetTools Blocker Handler
 *
 * Handles blockers reported by specialists and implements resolution flows:
 * - Lock timeout: Retry with exponential backoff
 * - API error: Retry with exponential backoff
 * - Dependency: Wait for dependency to complete
 * - Other: Manual intervention required
 *
 * @version 1.0.0
 * @since 2026-01-08
 */
/**
 * Blocker information
 */
export interface BlockerInfo {
    type: 'lock_timeout' | 'api_error' | 'dependency' | 'other';
    description: string;
    affected_sortie?: string;
    resolution_hint?: string;
}
/**
 * Blocker context
 */
export interface BlockerContext {
    specialist_id: string;
    mission_id: string;
    sortie_id: string;
    blocker: BlockerInfo;
    timestamp: number;
    retry_count: number;
    last_retry_time?: number;
}
/**
 * Resolution result
 */
export interface ResolutionResult {
    status: 'resolved' | 'retrying' | 'waiting' | 'manual_intervention_required';
    resolution_hint: string;
    retry_after_ms?: number;
    next_action?: string;
}
/**
 * Blocker Handler
 * Categorizes blockers and implements resolution flows
 */
export declare class BlockerHandler {
    private blockers;
    private logger;
    private readonly INITIAL_RETRY_DELAY_MS;
    private readonly MAX_RETRY_DELAY_MS;
    private readonly MAX_RETRIES;
    private readonly BACKOFF_MULTIPLIER;
    /**
     * Create new blocker handler
     */
    constructor();
    /**
     * Handle blocker
     */
    handleBlocker(context: BlockerContext): Promise<ResolutionResult>;
    /**
     * Handle lock timeout blocker
     * Retry with exponential backoff
     */
    private handleLockTimeout;
    /**
     * Handle API error blocker
     * Retry with exponential backoff
     */
    private handleApiError;
    /**
     * Handle dependency blocker
     * Wait for dependency to complete
     */
    private handleDependency;
    /**
     * Handle other blocker
     * Manual intervention required
     */
    private handleOther;
    /**
     * Get blocker status
     */
    getBlockerStatus(blockerId: string): BlockerContext | undefined;
    /**
     * Clear blocker
     */
    clearBlocker(blockerId: string): void;
    /**
     * Get all active blockers
     */
    getActiveBlockers(): BlockerContext[];
    /**
     * Get blockers for specialist
     */
    getBlockersForSpecialist(specialistId: string): BlockerContext[];
    /**
     * Get blockers for mission
     */
    getBlockersForMission(missionId: string): BlockerContext[];
}
/**
 * Get or create blocker handler instance
 */
export declare function getBlockerHandler(): BlockerHandler;
/**
 * Reset blocker handler instance
 */
export declare function resetBlockerHandler(): void;
//# sourceMappingURL=blocker-handler.d.ts.map