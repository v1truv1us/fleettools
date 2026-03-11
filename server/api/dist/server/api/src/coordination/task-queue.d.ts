/**
 * Task Queue for FleetTools Coordination System
 *
 * Manages task queuing, assignment, and completion tracking
 * Uses SQLite for persistence with tsk_ prefixed IDs
 */
export declare enum TaskStatus {
    PENDING = "pending",
    ASSIGNED = "assigned",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export interface Task {
    id: string;
    type: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignedTo?: string;
    missionId?: string;
    dependencies?: string[];
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}
export interface TaskQueueConfig {
    dbPath?: string;
    maxRetries?: number;
    retryDelay?: number;
}
export declare class TaskQueue {
    private db;
    private config;
    constructor(config?: TaskQueueConfig);
    /**
     * Initialize database schema
     */
    private initializeDatabase;
    /**
     * Enqueue a new task
     */
    enqueue(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
    /**
     * Dequeue next available task for agent type
     */
    dequeue(agentType?: string, limit?: number): Promise<Task[]>;
    /**
     * Mark task as in progress
     */
    markAsInProgress(taskId: string): Promise<void>;
    /**
     * Complete a task
     */
    complete(taskId: string, result?: any): Promise<void>;
    /**
     * Mark task as failed
     */
    fail(taskId: string, error: string): Promise<void>;
    /**
     * Get task by ID
     */
    getTask(taskId: string): Promise<Task | null>;
    /**
     * Get tasks by status
     */
    getTasksByStatus(status: TaskStatus): Promise<Task[]>;
    /**
     * Get tasks for mission
     */
    getTasksByMission(missionId: string): Promise<Task[]>;
    /**
     * Get tasks assigned to agent
     */
    getTasksByAgent(agentId: string): Promise<Task[]>;
    /**
     * Retry failed tasks
     */
    retryFailedTasks(): Promise<number>;
    /**
     * Get queue statistics
     */
    getStats(): Promise<{
        total: number;
        pending: number;
        assigned: number;
        inProgress: number;
        completed: number;
        failed: number;
    }>;
    private markAsAssigned;
    private updateTaskStatus;
    private resetTask;
    private checkDependencies;
    private rowToTask;
    /**
     * Close database connection
     */
    close(): void;
}
//# sourceMappingURL=task-queue.d.ts.map