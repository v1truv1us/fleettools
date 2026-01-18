/**
 * Agent Registry Service
 *
 * Manages agent registration, capabilities, and availability for ai-eng-system integration.
 * Using raw SQL to avoid Drizzle ORM type conflicts.
 */
import type { AgentRegistry, AgentCapability, AgentType } from '@fleettools/events/types/agents.js';
export declare class AgentRegistryService {
    private static instance;
    private db;
    private agentCapabilities;
    private constructor();
    static getInstance(): AgentRegistryService;
    /**
     * Initialize agent capabilities from ai-eng-system integration
     */
    private initializeAgentCapabilities;
    /**
     * Register a new agent
     */
    registerAgent(agentData: Omit<AgentRegistry, 'id' | 'created_at' | 'updated_at'>): Promise<AgentRegistry>;
    /**
     * Get agent by ID
     */
    getAgent(id: string): Promise<AgentRegistry | null>;
    /**
     * Get agent by callsign
     */
    getAgentByCallsign(callsign: string): Promise<AgentRegistry | null>;
    /**
     * Get all agents
     */
    getAllAgents(): Promise<AgentRegistry[]>;
    /**
     * Get agents by type
     */
    getAgentsByType(agentType: AgentType): Promise<AgentRegistry[]>;
    /**
     * Get available agents for assignment
     */
    getAvailableAgents(agentType?: AgentType): Promise<AgentRegistry[]>;
    /**
     * Update agent status
     */
    updateAgentStatus(id: string, status: AgentRegistry['status']): Promise<void>;
    /**
     * Update agent workload
     */
    updateAgentWorkload(id: string, workload: number): Promise<void>;
    /**
     * Update agent heartbeat
     */
    updateAgentHeartbeat(id: string): Promise<void>;
    /**
     * Get capabilities for agent type
     */
    getAgentCapabilities(agentType: AgentType): AgentCapability[];
    /**
     * Find agents by capability
     */
    findAgentsByCapability(triggerWord: string): Promise<AgentRegistry[]>;
    /**
     * Remove agent (deregister)
     */
    removeAgent(id: string): Promise<void>;
    /**
     * Initialize agent health record
     */
    private initializeAgentHealth;
    /**
     * Get stale agents (missed heartbeats)
     */
    getStaleAgents(timeoutMs?: number): Promise<AgentRegistry[]>;
}
//# sourceMappingURL=registry.d.ts.map