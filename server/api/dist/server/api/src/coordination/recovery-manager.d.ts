/**
 * Recovery Manager for FleetTools Checkpoint/Resume System
 *
 * Handles restoring system state from checkpoints including:
 * - Agent state restoration
 * - Task recovery
 * - Lock restoration
 * - Message queue recovery
 */
import { AgentType } from './agent-spawner.js';
interface RecoveryPlan {
    checkpointId: string;
    missionId: string;
    agentsToRestore: AgentRestorePlan[];
    tasksToResume: TaskRestorePlan[];
    locksToRestore: LockRestorePlan[];
    estimatedDuration: number;
    risks: string[];
}
interface AgentRestorePlan {
    agentId: string;
    agentType: AgentType;
    previousState: any;
    task?: string;
    priority: 'high' | 'medium' | 'low';
    estimatedRestoreTime: number;
}
interface TaskRestorePlan {
    taskId: string;
    missionId: string;
    previousState: any;
    assignedAgent?: string;
    progress: number;
    nextSteps: string[];
}
interface LockRestorePlan {
    lockId: string;
    filePath: string;
    originalAgent: string;
    purpose: string;
    needsConflictResolution: boolean;
}
export declare class RecoveryManager {
    private agentSpawner;
    private checkpointManager;
    private recoveryLogPath;
    constructor();
    /**
     * Create a recovery plan from a checkpoint
     */
    createRecoveryPlan(checkpointId: string, force?: boolean): Promise<RecoveryPlan>;
    /**
     * Execute recovery from a checkpoint
     */
    executeRecovery(checkpointId: string, options?: {
        force?: boolean;
        dryRun?: boolean;
    }): Promise<{
        success: boolean;
        restoredAgents: string[];
        restoredTasks: string[];
        restoredLocks: string[];
        errors: string[];
    }>;
    /**
     * Analyze what agents need to be restored
     */
    private analyzeAgentRestore;
    /**
     * Analyze what tasks need to be resumed
     */
    private analyzeTaskResume;
    /**
     * Analyze what locks need to be restored
     */
    private analyzeLockRestore;
    /**
     * Assess potential recovery risks
     */
    private assessRecoveryRisks;
    /**
     * Restore an individual agent
     */
    private restoreAgent;
    /**
     * Resume an individual task
     */
    private resumeTask;
    /**
     * Restore an individual lock
     */
    private restoreLock;
    /**
     * Check if there are active agents
     */
    private hasActiveAgents;
    /**
     * Check for lock conflicts
     */
    private checkLockConflict;
    /**
     * Map sortie assignment to agent type
     */
    private mapSortieToAgentType;
    /**
     * Determine agent priority based on state
     */
    private determineAgentPriority;
    /**
     * Estimate agent restore time in seconds
     */
    private estimateAgentRestoreTime;
    /**
     * Generate next steps for task resumption
     */
    private generateNextSteps;
    /**
     * Calculate estimated total duration
     */
    private calculateEstimatedDuration;
    /**
     * Calculate acceptable error count
     */
    private calculateAcceptableErrorCount;
    /**
     * Sanitize plan for logging
     */
    private sanitizePlanForLogging;
    /**
     * Log recovery events
     */
    private logRecoveryEvent;
}
export {};
//# sourceMappingURL=recovery-manager.d.ts.map