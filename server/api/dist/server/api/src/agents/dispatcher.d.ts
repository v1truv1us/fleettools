/**
 * Task Dispatcher Service
 *
 * Intelligently assigns work orders to appropriate agents based on capabilities,
 * workload, and priority using ai-eng-system integration.
 * Using raw SQL to avoid Drizzle ORM type conflicts.
 */
import type { AgentAssignment, AgentType, WorkPriority, AssignmentConfig } from '@fleettools/events/types/agents.js';
export declare class TaskDispatcherService {
    private static instance;
    private db;
    private assignmentConfig;
    private constructor();
    static getInstance(): TaskDispatcherService;
    /**
     * Set assignment configuration
     */
    setAssignmentConfig(config: Partial<AssignmentConfig>): void;
    /**
     * Assign work order to best-fit agent
     */
    assignWorkOrder(workOrderId: string, workType: string, description: string, priority?: WorkPriority, preferredAgentType?: AgentType, context?: Record<string, any>): Promise<AgentAssignment | null>;
    /**
     * Find best agents for a specific work order
     */
    private findBestAgents;
    /**
     * Check if agent can handle specific work
     */
    private canHandleWork;
    /**
     * Calculate agent fitness score
     */
    private calculateAgentScore;
    /**
     * Calculate how well agent capabilities match work
     */
    private calculateCapabilityScore;
    /**
     * Get priority multiplier
     */
    private getPriorityScore;
    /**
     * Extract keywords from text
     */
    private extractKeywords;
    /**
     * Update assignment status
     */
    updateAssignmentStatus(assignmentId: string, status: AgentAssignment['status'], progressPercent?: number, errorDetails?: {
        message: string;
        retry_count: number;
    }): Promise<void>;
    /**
     * Get assignment by ID
     */
    getAssignment(assignmentId: string): Promise<AgentAssignment | null>;
    /**
     * Get assignments for agent
     */
    getAgentAssignments(agentId: string): Promise<AgentAssignment[]>;
    /**
     * Get all active assignments
     */
    getActiveAssignments(): Promise<AgentAssignment[]>;
    /**
     * Cancel assignment
     */
    cancelAssignment(assignmentId: string, reason: string): Promise<void>;
}
//# sourceMappingURL=dispatcher.d.ts.map