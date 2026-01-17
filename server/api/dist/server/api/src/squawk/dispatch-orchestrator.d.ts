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
import type { Mission, Sortie, Specialist, Checkpoint } from '../../../../squawk/src/db/types.js';
/**
 * Specialist instance being managed by orchestrator
 */
export interface ManagedSpecialist {
    id: string;
    name: string;
    sortie_id: string;
    status: 'spawned' | 'registered' | 'working' | 'blocked' | 'completed' | 'failed';
    progress_percent: number;
    last_heartbeat: number;
    blockers: Array<{
        type: string;
        description: string;
        timestamp: number;
    }>;
}
/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
    /** Maximum concurrent specialists */
    max_concurrent?: number;
    /** Heartbeat timeout (ms) */
    heartbeat_timeout_ms?: number;
    /** Checkpoint interval (ms) */
    checkpoint_interval_ms?: number;
    /** Enable auto-recovery */
    auto_recovery?: boolean;
}
/**
 * Orchestrator state
 */
export interface OrchestratorState {
    mission_id: string;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
    specialists: Map<string, ManagedSpecialist>;
    active_sorties: Map<string, Sortie>;
    pending_sorties: Sortie[];
    completed_sorties: Sortie[];
    failed_sorties: Sortie[];
    checkpoints: Checkpoint[];
    last_checkpoint_time: number;
}
/**
 * Dispatch Orchestrator
 * Manages specialist spawning and coordination
 */
export declare class DispatchOrchestrator {
    private state;
    private config;
    private logger;
    /**
     * Create new orchestrator
     */
    constructor(missionId: string, config?: OrchestratorConfig);
    /**
     * Initialize orchestrator
     */
    initialize(): Promise<void>;
    /**
     * Spawn specialists for mission
     */
    spawnSpecialists(mission: Mission): Promise<Specialist[]>;
    /**
     * Monitor specialist progress
     */
    monitorProgress(): Promise<void>;
    /**
     * Resolve blocker
     */
    resolveBlocker(specialistId: string, blocker: any): Promise<void>;
    /**
     * Coordinate file locks
     */
    coordinateLocks(sorties: Sortie[]): Promise<void>;
    /**
     * Create checkpoint
     */
    createCheckpoint(trigger: 'progress' | 'error' | 'manual'): Promise<Checkpoint | null>;
    /**
     * Handle specialist completion
     */
    onSpecialistComplete(specialistId: string, result: any): Promise<void>;
    /**
     * Get orchestrator status
     */
    getStatus(): OrchestratorState;
    /**
     * Shutdown orchestrator
     */
    shutdown(): Promise<void>;
}
/**
 * Get or create orchestrator instance
 */
export declare function getOrchestrator(missionId: string, config?: OrchestratorConfig): DispatchOrchestrator;
/**
 * Reset orchestrator instance
 */
export declare function resetOrchestrator(): void;
//# sourceMappingURL=dispatch-orchestrator.d.ts.map