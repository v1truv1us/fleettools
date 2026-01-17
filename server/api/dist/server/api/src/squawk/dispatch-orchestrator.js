/**
 * FleetTools Dispatch Orchestrator
 *
 * The Dispatch Orchestrator manages the lifecycle of specialist agents working on sorties.
 * It coordinates:
 * - Specialist spawning (parallel and sequential)
 * - Progress monitoring
 * - Blocker resolution
 * - File lock coordination
 * - Checkpoint creation
 * - Completion handling
 *
 * @version 1.0.0
 * @since 2026-01-08
 */
import { randomUUID } from 'crypto';
import { getAdapter } from '../../../../squawk/src/db/index.js';
// ============================================================================
// DISPATCH ORCHESTRATOR CLASS
// ============================================================================
/**
 * Dispatch Orchestrator
 * Manages specialist spawning and coordination
 */
export class DispatchOrchestrator {
    state;
    config;
    logger;
    /**
     * Create new orchestrator
     */
    constructor(missionId, config) {
        this.state = {
            mission_id: missionId,
            status: 'idle',
            specialists: new Map(),
            active_sorties: new Map(),
            pending_sorties: [],
            completed_sorties: [],
            failed_sorties: [],
            checkpoints: [],
            last_checkpoint_time: Date.now(),
        };
        this.config = {
            max_concurrent: config?.max_concurrent || 5,
            heartbeat_timeout_ms: config?.heartbeat_timeout_ms || 300000, // 5 minutes
            checkpoint_interval_ms: config?.checkpoint_interval_ms || 60000, // 1 minute
            auto_recovery: config?.auto_recovery !== false,
        };
        this.logger = console;
    }
    /**
     * Initialize orchestrator
     */
    async initialize() {
        this.logger.log(`[Orchestrator] Initializing for mission ${this.state.mission_id}`);
        this.state.status = 'running';
    }
    /**
     * Spawn specialists for mission
     */
    async spawnSpecialists(mission) {
        this.logger.log(`[Orchestrator] Spawning specialists for mission ${mission.id}`);
        const db = getAdapter();
        // Get all sorties for mission
        const sorties = await db.sorties.getByMission(mission.id);
        this.state.pending_sorties = sorties.filter(s => s.status === 'pending');
        const spawnedSpecialists = [];
        // Spawn one specialist per sortie
        for (const sortie of this.state.pending_sorties) {
            const specialistId = `specialist-${randomUUID().substring(0, 8)}`;
            // Register specialist
            const specialist = await db.specialists.register({
                id: specialistId,
                name: `Specialist-${specialistId.substring(0, 8)}`,
                capabilities: ['code-review', 'testing', 'implementation'],
            });
            // Track specialist
            this.state.specialists.set(specialistId, {
                id: specialistId,
                name: specialist.name,
                sortie_id: sortie.id,
                status: 'spawned',
                progress_percent: 0,
                last_heartbeat: Date.now(),
                blockers: [],
            });
            // Add to active sorties
            this.state.active_sorties.set(sortie.id, sortie);
            spawnedSpecialists.push(specialist);
            this.logger.log(`[Orchestrator] Spawned specialist ${specialistId} for sortie ${sortie.id}`);
        }
        return spawnedSpecialists;
    }
    /**
     * Monitor specialist progress
     */
    async monitorProgress() {
        this.logger.log(`[Orchestrator] Monitoring progress for ${this.state.specialists.size} specialists`);
        const db = getAdapter();
        const now = Date.now();
        // Check each specialist
        for (const [specialistId, specialist] of this.state.specialists) {
            // Check heartbeat
            const timeSinceHeartbeat = now - specialist.last_heartbeat;
            if (timeSinceHeartbeat > this.config.heartbeat_timeout_ms) {
                this.logger.warn(`[Orchestrator] Specialist ${specialistId} heartbeat timeout`);
                specialist.status = 'failed';
                continue;
            }
            // Get specialist from DB
            const dbSpecialist = await db.specialists.getById(specialistId);
            if (dbSpecialist) {
                specialist.last_heartbeat = now;
            }
        }
        // Check if checkpoint needed
        const timeSinceCheckpoint = now - this.state.last_checkpoint_time;
        if (timeSinceCheckpoint > this.config.checkpoint_interval_ms) {
            await this.createCheckpoint('progress');
            this.state.last_checkpoint_time = now;
        }
    }
    /**
     * Resolve blocker
     */
    async resolveBlocker(specialistId, blocker) {
        this.logger.log(`[Orchestrator] Resolving blocker for specialist ${specialistId}:`, blocker);
        const specialist = this.state.specialists.get(specialistId);
        if (!specialist) {
            this.logger.error(`[Orchestrator] Specialist ${specialistId} not found`);
            return;
        }
        // Record blocker
        specialist.blockers.push({
            type: blocker.type,
            description: blocker.description,
            timestamp: Date.now(),
        });
        // Handle based on type
        switch (blocker.type) {
            case 'lock_timeout':
                this.logger.log(`[Orchestrator] Lock timeout for specialist ${specialistId}, retrying...`);
                // Retry logic would be implemented here
                break;
            case 'api_error':
                this.logger.log(`[Orchestrator] API error for specialist ${specialistId}, retrying...`);
                // Retry logic would be implemented here
                break;
            case 'dependency':
                this.logger.log(`[Orchestrator] Dependency blocker for specialist ${specialistId}, waiting...`);
                // Wait for dependency logic would be implemented here
                break;
            case 'other':
                this.logger.warn(`[Orchestrator] Manual intervention needed for specialist ${specialistId}`);
                specialist.status = 'blocked';
                break;
        }
    }
    /**
     * Coordinate file locks
     */
    async coordinateLocks(sorties) {
        this.logger.log(`[Orchestrator] Coordinating locks for ${sorties.length} sorties`);
        const db = getAdapter();
        // Get all active locks
        const activeLocks = await db.locks.getActive();
        // Check for conflicts
        const fileToSorties = new Map();
        for (const sortie of sorties) {
            if (sortie.files) {
                for (const file of sortie.files) {
                    if (!fileToSorties.has(file)) {
                        fileToSorties.set(file, []);
                    }
                    fileToSorties.get(file).push(sortie.id);
                }
            }
        }
        // Log conflicts
        for (const [file, sortieIds] of fileToSorties) {
            if (sortieIds.length > 1) {
                this.logger.warn(`[Orchestrator] File conflict detected: ${file} used by ${sortieIds.length} sorties`);
            }
        }
    }
    /**
     * Create checkpoint
     */
    async createCheckpoint(trigger) {
        this.logger.log(`[Orchestrator] Creating checkpoint (trigger: ${trigger})`);
        const db = getAdapter();
        // Calculate progress
        const totalSorties = this.state.pending_sorties.length + this.state.completed_sorties.length + this.state.failed_sorties.length;
        const completedSorties = this.state.completed_sorties.length;
        const progressPercent = totalSorties > 0 ? (completedSorties / totalSorties) * 100 : 0;
        // Create checkpoint
        const checkpoint = await db.checkpoints.save({
            mission_id: this.state.mission_id,
            trigger,
            progress_percent: progressPercent,
            created_by: 'dispatch-orchestrator',
            sorties: this.state.completed_sorties.map(s => ({
                id: s.id,
                status: s.status,
                assigned_to: s.assigned_to,
                files: s.files,
                started_at: s.started_at,
                progress: s.progress,
                progress_notes: s.progress_notes,
            })),
            active_locks: [],
            pending_messages: [],
            recovery_context: {
                last_action: `Checkpoint created with trigger: ${trigger}`,
                next_steps: this.state.pending_sorties.map(s => `Complete sortie: ${s.title}`),
                blockers: Array.from(this.state.specialists.values())
                    .flatMap(s => s.blockers.map(b => `${b.type}: ${b.description}`)),
                files_modified: [],
                mission_summary: `Mission ${this.state.mission_id}: ${completedSorties}/${totalSorties} sorties completed`,
                elapsed_time_ms: Date.now() - (this.state.checkpoints[0]?.timestamp ? new Date(this.state.checkpoints[0].timestamp).getTime() : Date.now()),
                last_activity_at: new Date().toISOString(),
            },
        });
        this.state.checkpoints.push(checkpoint);
        return checkpoint;
    }
    /**
     * Handle specialist completion
     */
    async onSpecialistComplete(specialistId, result) {
        this.logger.log(`[Orchestrator] Specialist ${specialistId} completed`);
        const specialist = this.state.specialists.get(specialistId);
        if (!specialist) {
            this.logger.error(`[Orchestrator] Specialist ${specialistId} not found`);
            return;
        }
        // Update specialist status
        specialist.status = 'completed';
        specialist.progress_percent = 100;
        // Get sortie
        const db = getAdapter();
        const sortie = await db.sorties.getById(specialist.sortie_id);
        if (sortie) {
            // Move to completed
            this.state.active_sorties.delete(sortie.id);
            this.state.completed_sorties.push(sortie);
            this.logger.log(`[Orchestrator] Sortie ${sortie.id} completed`);
        }
        // Release locks
        const activeLocks = await db.locks.getActive();
        for (const lock of activeLocks) {
            if (lock.reserved_by === specialistId) {
                await db.locks.release(lock.id);
                this.logger.log(`[Orchestrator] Released lock ${lock.id}`);
            }
        }
    }
    /**
     * Get orchestrator status
     */
    getStatus() {
        return {
            ...this.state,
            specialists: new Map(this.state.specialists),
            active_sorties: new Map(this.state.active_sorties),
        };
    }
    /**
     * Shutdown orchestrator
     */
    async shutdown() {
        this.logger.log(`[Orchestrator] Shutting down for mission ${this.state.mission_id}`);
        this.state.status = 'completed';
    }
}
// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
let orchestratorInstance = null;
/**
 * Get or create orchestrator instance
 */
export function getOrchestrator(missionId, config) {
    if (!orchestratorInstance) {
        orchestratorInstance = new DispatchOrchestrator(missionId, config);
    }
    return orchestratorInstance;
}
/**
 * Reset orchestrator instance
 */
export function resetOrchestrator() {
    orchestratorInstance = null;
}
//# sourceMappingURL=dispatch-orchestrator.js.map