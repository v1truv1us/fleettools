/**
 * Conflict Resolver for FleetTools Coordination System
 *
 * Detects and resolves conflicts between agents
 * Handles resource, task, and data conflicts
 */
export declare enum ConflictType {
    RESOURCE = "resource",
    TASK = "task",
    DATA = "data"
}
export declare enum ConflictSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum ConflictResolution {
    FIRST_COME_FIRST_SERVE = "first_come_first_serve",
    PRIORITY_BASED = "priority_based",
    RESOURCE_SHARING = "resource_sharing",
    TASK_SPLITTING = "task_splitting",
    AGENT_COOPERATION = "agent_cooperation",
    ARBITRATION = "arbitration"
}
export interface Conflict {
    id: string;
    type: ConflictType;
    agents: string[];
    description: string;
    severity: ConflictSeverity;
    detectedAt: string;
    resolvedAt?: string;
    resolution?: ConflictResolution;
    resolutionDetails?: string;
    metadata: Record<string, any>;
}
export interface Resource {
    id: string;
    type: 'file' | 'directory' | 'port' | 'memory' | 'cpu' | 'database_connection';
    name: string;
    lockedBy?: string;
    lockType?: 'exclusive' | 'shared';
    lockExpiry?: string;
}
export interface ConflictResolutionStrategy {
    conflictType: ConflictType;
    severity: ConflictSeverity;
    strategy: ConflictResolution;
    conditions?: Record<string, any>;
    priority: number;
}
export interface ConflictResolverConfig {
    strategies: ConflictResolutionStrategy[];
    autoResolveThreshold: ConflictSeverity;
    arbitrationRequired: boolean;
    conflictRetentionDays: number;
}
export declare class ConflictResolver {
    private config;
    private conflicts;
    private resources;
    constructor(config?: Partial<ConflictResolverConfig>);
    /**
     * Detect potential conflicts between agents
     */
    detectConflicts(agents: Array<{
        id: string;
        type: string;
        currentTask?: string;
        resources?: string[];
        metadata?: Record<string, any>;
    }>): Promise<Conflict[]>;
    /**
     * Detect resource conflicts between agents
     */
    private detectResourceConflicts;
    /**
     * Detect task conflicts between agents
     */
    private detectTaskConflicts;
    /**
     * Detect data conflicts between agents
     */
    private detectDataConflicts;
    /**
     * Resolve detected conflicts
     */
    resolveConflict(conflictId: string): Promise<Conflict>;
    /**
     * Find appropriate resolution strategy for conflict
     */
    private findResolutionStrategy;
    /**
     * Apply resolution strategy to conflict
     */
    private applyResolution;
    /**
     * Apply first-come-first-serve resolution
     */
    private applyFirstComeFirstServe;
    /**
     * Apply priority-based resolution
     */
    private applyPriorityBased;
    /**
     * Apply resource sharing resolution
     */
    private applyResourceSharing;
    /**
     * Apply task splitting resolution
     */
    private applyTaskSplitting;
    /**
     * Apply agent cooperation resolution
     */
    private applyAgentCooperation;
    /**
     * Apply arbitration resolution
     */
    private applyArbitration;
    /**
     * Get all conflicts
     */
    getConflicts(): Conflict[];
    /**
     * Get unresolved conflicts
     */
    getUnresolvedConflicts(): Conflict[];
    /**
     * Auto-resolve conflicts below threshold
     */
    autoResolveConflicts(): Promise<Conflict[]>;
    /**
     * Helper methods
     */
    private assessResourceConflictSeverity;
    private assessDataConflictSeverity;
    private inferResourceType;
    private inferTaskType;
    private extractAccessedData;
    private isSeverityBelowThreshold;
    /**
     * Get default resolution strategies
     */
    private getDefaultStrategies;
    /**
     * Clean up old resolved conflicts
     */
    cleanupOldConflicts(): void;
}
//# sourceMappingURL=conflict-resolver.d.ts.map