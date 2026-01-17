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
import { getAdapter } from '../../../../squawk/src/db/index.js';
// ============================================================================
// BLOCKER HANDLER CLASS
// ============================================================================
/**
 * Blocker Handler
 * Categorizes blockers and implements resolution flows
 */
export class BlockerHandler {
    blockers;
    logger;
    // Retry configuration
    INITIAL_RETRY_DELAY_MS = 1000; // 1 second
    MAX_RETRY_DELAY_MS = 60000; // 1 minute
    MAX_RETRIES = 5;
    BACKOFF_MULTIPLIER = 2;
    /**
     * Create new blocker handler
     */
    constructor() {
        this.blockers = new Map();
        this.logger = console;
    }
    /**
     * Handle blocker
     */
    async handleBlocker(context) {
        this.logger.log(`[BlockerHandler] Handling blocker for specialist ${context.specialist_id}:`, context.blocker);
        // Store blocker context
        const blockerId = `${context.specialist_id}-${context.sortie_id}`;
        this.blockers.set(blockerId, context);
        // Route to appropriate handler
        switch (context.blocker.type) {
            case 'lock_timeout':
                return this.handleLockTimeout(context);
            case 'api_error':
                return this.handleApiError(context);
            case 'dependency':
                return this.handleDependency(context);
            case 'other':
                return this.handleOther(context);
            default:
                return {
                    status: 'manual_intervention_required',
                    resolution_hint: 'Unknown blocker type',
                };
        }
    }
    /**
     * Handle lock timeout blocker
     * Retry with exponential backoff
     */
    async handleLockTimeout(context) {
        this.logger.log(`[BlockerHandler] Handling lock timeout for specialist ${context.specialist_id}`);
        // Check if we've exceeded max retries
        if (context.retry_count >= this.MAX_RETRIES) {
            this.logger.error(`[BlockerHandler] Max retries exceeded for specialist ${context.specialist_id}`);
            return {
                status: 'manual_intervention_required',
                resolution_hint: 'Lock timeout: Max retries exceeded. Manual intervention required.',
            };
        }
        // Calculate retry delay with exponential backoff
        const retryDelay = Math.min(this.INITIAL_RETRY_DELAY_MS * Math.pow(this.BACKOFF_MULTIPLIER, context.retry_count), this.MAX_RETRY_DELAY_MS);
        this.logger.log(`[BlockerHandler] Retrying lock acquisition in ${retryDelay}ms (attempt ${context.retry_count + 1}/${this.MAX_RETRIES})`);
        // Emit event
        const db = getAdapter();
        await db.events.append({
            event_type: 'specialist_blocker_handled',
            stream_type: 'specialist',
            stream_id: context.specialist_id,
            data: {
                mission_id: context.mission_id,
                sortie_id: context.sortie_id,
                blocker_type: 'lock_timeout',
                retry_count: context.retry_count + 1,
                retry_delay_ms: retryDelay,
            },
        });
        return {
            status: 'retrying',
            resolution_hint: `Lock timeout. Retrying in ${retryDelay}ms...`,
            retry_after_ms: retryDelay,
            next_action: 'retry_lock_acquisition',
        };
    }
    /**
     * Handle API error blocker
     * Retry with exponential backoff
     */
    async handleApiError(context) {
        this.logger.log(`[BlockerHandler] Handling API error for specialist ${context.specialist_id}`);
        // Check if we've exceeded max retries
        if (context.retry_count >= this.MAX_RETRIES) {
            this.logger.error(`[BlockerHandler] Max retries exceeded for specialist ${context.specialist_id}`);
            return {
                status: 'manual_intervention_required',
                resolution_hint: 'API error: Max retries exceeded. Manual intervention required.',
            };
        }
        // Calculate retry delay with exponential backoff
        const retryDelay = Math.min(this.INITIAL_RETRY_DELAY_MS * Math.pow(this.BACKOFF_MULTIPLIER, context.retry_count), this.MAX_RETRY_DELAY_MS);
        this.logger.log(`[BlockerHandler] Retrying API call in ${retryDelay}ms (attempt ${context.retry_count + 1}/${this.MAX_RETRIES})`);
        // Emit event
        const db = getAdapter();
        await db.events.append({
            event_type: 'specialist_blocker_handled',
            stream_type: 'specialist',
            stream_id: context.specialist_id,
            data: {
                mission_id: context.mission_id,
                sortie_id: context.sortie_id,
                blocker_type: 'api_error',
                retry_count: context.retry_count + 1,
                retry_delay_ms: retryDelay,
            },
        });
        return {
            status: 'retrying',
            resolution_hint: `API error. Retrying in ${retryDelay}ms...`,
            retry_after_ms: retryDelay,
            next_action: 'retry_api_call',
        };
    }
    /**
     * Handle dependency blocker
     * Wait for dependency to complete
     */
    async handleDependency(context) {
        this.logger.log(`[BlockerHandler] Handling dependency blocker for specialist ${context.specialist_id}`);
        const affectedSortie = context.blocker.affected_sortie;
        if (!affectedSortie) {
            return {
                status: 'manual_intervention_required',
                resolution_hint: 'Dependency blocker: No affected sortie specified.',
            };
        }
        // Check if dependency is complete
        const db = getAdapter();
        const dependencySortie = await db.sorties.getById(affectedSortie);
        if (!dependencySortie) {
            return {
                status: 'manual_intervention_required',
                resolution_hint: `Dependency blocker: Sortie ${affectedSortie} not found.`,
            };
        }
        if (dependencySortie.status === 'completed') {
            this.logger.log(`[BlockerHandler] Dependency ${affectedSortie} is complete, resuming specialist ${context.specialist_id}`);
            return {
                status: 'resolved',
                resolution_hint: `Dependency ${affectedSortie} is complete. Resuming work.`,
                next_action: 'resume_work',
            };
        }
        // Dependency not complete, wait
        this.logger.log(`[BlockerHandler] Waiting for dependency ${affectedSortie} to complete`);
        // Emit event
        await db.events.append({
            event_type: 'specialist_blocker_handled',
            stream_type: 'specialist',
            stream_id: context.specialist_id,
            data: {
                mission_id: context.mission_id,
                sortie_id: context.sortie_id,
                blocker_type: 'dependency',
                waiting_for_sortie: affectedSortie,
            },
        });
        return {
            status: 'waiting',
            resolution_hint: `Waiting for dependency ${affectedSortie} to complete...`,
            next_action: 'wait_for_dependency',
        };
    }
    /**
     * Handle other blocker
     * Manual intervention required
     */
    async handleOther(context) {
        this.logger.log(`[BlockerHandler] Handling other blocker for specialist ${context.specialist_id}`);
        // Emit event
        const db = getAdapter();
        await db.events.append({
            event_type: 'specialist_blocker_handled',
            stream_type: 'specialist',
            stream_id: context.specialist_id,
            data: {
                mission_id: context.mission_id,
                sortie_id: context.sortie_id,
                blocker_type: 'other',
                description: context.blocker.description,
            },
        });
        return {
            status: 'manual_intervention_required',
            resolution_hint: `Manual intervention required: ${context.blocker.description}`,
        };
    }
    /**
     * Get blocker status
     */
    getBlockerStatus(blockerId) {
        return this.blockers.get(blockerId);
    }
    /**
     * Clear blocker
     */
    clearBlocker(blockerId) {
        this.blockers.delete(blockerId);
        this.logger.log(`[BlockerHandler] Cleared blocker ${blockerId}`);
    }
    /**
     * Get all active blockers
     */
    getActiveBlockers() {
        return Array.from(this.blockers.values());
    }
    /**
     * Get blockers for specialist
     */
    getBlockersForSpecialist(specialistId) {
        return Array.from(this.blockers.values()).filter(b => b.specialist_id === specialistId);
    }
    /**
     * Get blockers for mission
     */
    getBlockersForMission(missionId) {
        return Array.from(this.blockers.values()).filter(b => b.mission_id === missionId);
    }
}
// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
let handlerInstance = null;
/**
 * Get or create blocker handler instance
 */
export function getBlockerHandler() {
    if (!handlerInstance) {
        handlerInstance = new BlockerHandler();
    }
    return handlerInstance;
}
/**
 * Reset blocker handler instance
 */
export function resetBlockerHandler() {
    handlerInstance = null;
}
//# sourceMappingURL=blocker-handler.js.map