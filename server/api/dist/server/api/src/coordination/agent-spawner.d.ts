/**
 * Agent Spawner for FleetTools Coordination System
 *
 * Manages agent lifecycle: spawning, monitoring, and termination
 * Integrates with Squawk mailbox system for coordination
 */
export declare enum AgentType {
    FRONTEND = "frontend",
    BACKEND = "backend",
    TESTING = "testing",
    DOCUMENTATION = "documentation",
    SECURITY = "security",
    PERFORMANCE = "performance"
}
export declare enum AgentStatus {
    SPAWNING = "spawning",
    RUNNING = "running",
    IDLE = "idle",
    BUSY = "busy",
    ERROR = "error",
    TERMINATED = "terminated",
    FAILED = "failed"
}
export interface AgentHandle {
    id: string;
    type: AgentType;
    pid?: number;
    status: AgentStatus;
    mailboxId: string;
    createdAt: string;
    updatedAt: string;
    metadata: Record<string, any>;
}
export interface AgentSpawnRequest {
    type: AgentType;
    task?: string;
    metadata?: Record<string, any>;
    config?: AgentConfig;
}
export interface AgentConfig {
    timeout?: number;
    retries?: number;
    resources?: {
        memory?: string;
        cpu?: string;
    };
    environment?: Record<string, string>;
}
export interface AgentMonitor {
    status: AgentStatus;
    uptime?: number;
    lastHeartbeat?: string;
    resourceUsage?: {
        memory: number;
        cpu: number;
    };
    errors: Array<{
        timestamp: string;
        error: string;
        count: number;
    }>;
}
export declare class AgentSpawner {
    private agents;
    private mailboxPath;
    private heartbeatInterval?;
    private recoveryInterval?;
    private readonly heartbeatTimeout;
    private readonly recoveryEnabled;
    constructor(mailboxPath?: string);
    /**
     * Spawn a new agent with timeout and retry logic
     */
    spawn(request: AgentSpawnRequest): Promise<AgentHandle>;
    /**
     * Monitor agent status and health with comprehensive checks
     */
    monitor(agentId: string): Promise<AgentMonitor>;
    /**
     * Terminate an agent
     */
    terminate(agentId: string, graceful?: boolean): Promise<void>;
    /**
     * Get all active agents
     */
    getActiveAgents(): AgentHandle[];
    /**
     * Get agents by type
     */
    getAgentsByType(type: AgentType): AgentHandle[];
    /**
     * Get agent by ID
     */
    getAgent(agentId: string): AgentHandle | undefined;
    private createMailbox;
    private cleanupMailbox;
    private executeAgentSpawn;
    private cleanupFailedSpawn;
    private getLastHeartbeat;
    private getAgentErrors;
    private getAgentResourceUsage;
    private getProcessResourceUsage;
    private getLinuxProcessUsage;
    private getMacOSProcessUsage;
    private getMockResourceUsage;
    private storeResourceHistory;
    getResourceHistory(agentId: string): Promise<Array<{
        timestamp: string;
        memory: number;
        cpu: number;
    }>>;
    getResourceTrends(agentId: string): Promise<{
        avgMemory: number;
        avgCpu: number;
        peakMemory: number;
        peakCpu: number;
    }>;
    updateHeartbeat(agentId: string): Promise<void>;
    logError(agentId: string, error: string): Promise<void>;
    private calculateUptime;
    private ensureDirectory;
    private writeFile;
    private removeDirectory;
    /**
     * Start heartbeat monitoring for all agents
     */
    private startHeartbeatMonitoring;
    /**
     * Start automatic recovery monitoring
     */
    private startRecoveryMonitoring;
    /**
     * Check heartbeats for all running agents
     */
    private checkAgentHeartbeats;
    /**
     * Handle missed heartbeat scenarios
     */
    private handleMissedHeartbeat;
    /**
     * Perform recovery checks and attempts
     */
    private performRecoveryChecks;
    /**
     * Attempt to recover a failed agent
     */
    private attemptAgentRecovery;
    /**
     * Send recovery event notifications
     */
    private sendRecoveryEvent;
    /**
     * Get agent health status with detailed metrics
     */
    getAgentHealth(agentId: string): Promise<{
        status: AgentStatus;
        isHealthy: boolean;
        lastHeartbeat?: string;
        uptime?: number;
        resourceUsage?: {
            memory: number;
            cpu: number;
        };
        errors: Array<{
            timestamp: string;
            error: string;
            count: number;
        }>;
        recoveryAttempts?: number;
    }>;
    /**
     * Get system-wide agent health summary
     */
    getSystemHealth(): Promise<{
        totalAgents: number;
        healthyAgents: number;
        unhealthyAgents: number;
        recoveringAgents: number;
        failedAgents: number;
        overallHealth: 'healthy' | 'degraded' | 'critical';
    }>;
    /**
     * Cleanup method to stop monitoring intervals
     */
    cleanup(): void;
}
//# sourceMappingURL=agent-spawner.d.ts.map