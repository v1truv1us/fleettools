/**
 * Task Decomposer for FleetTools Coordination System
 *
 * Automatically breaks down missions into assignable tasks
 * Handles task dependencies and agent type assignment
 */
export declare enum AgentType {
    FRONTEND = "frontend",
    BACKEND = "backend",
    TESTING = "testing",
    DOCUMENTATION = "documentation",
    SECURITY = "security",
    PERFORMANCE = "performance"
}
export interface Task {
    id: string;
    type: string;
    title: string;
    description: string;
    status: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignedTo?: string;
    missionId?: string;
    dependencies?: string[];
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}
export interface DecompositionRule {
    missionType: string;
    patterns: Array<{
        pattern: RegExp;
        taskTemplate: {
            type: string;
            title: string;
            description: string;
            agentType: AgentType;
            priority: 'low' | 'medium' | 'high' | 'critical';
            estimatedDuration?: number;
        };
    }>;
}
export interface DecompositionConfig {
    rules: DecompositionRule[];
    defaultAgentType: AgentType;
    maxTasksPerMission: number;
}
export declare class TaskDecomposer {
    private config;
    constructor(config?: Partial<DecompositionConfig>);
    /**
     * Decompose a mission into individual tasks
     */
    decomposeMission(mission: {
        title: string;
        description: string;
        type?: string;
        metadata?: Record<string, any>;
    }): Task[];
    /**
     * Infer mission type from title and description
     */
    private inferMissionType;
    /**
     * Create generic tasks for missions without specific rules
     */
    private createGenericTasks;
    /**
     * Create task from pattern template
     */
    private createTaskFromPattern;
    /**
     * Add logical dependencies between tasks
     */
    private addTaskDependencies;
    /**
     * Calculate task complexity score
     */
    calculateComplexity(task: Task): number;
    /**
     * Estimate task duration based on complexity
     */
    estimateTaskDuration(complexity: number): number;
    /**
     * Get default decomposition rules
     */
    private getDefaultRules;
}
//# sourceMappingURL=task-decomposer.d.ts.map