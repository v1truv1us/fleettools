/**
 * Coordination Engine Service
 *
 * Manages multi-agent coordination, communication protocols, and collaborative workflows
 * with ai-eng-system integration and real-time messaging via Squawk.
 */
export interface AgentMessage {
    message_id: string;
    from_agent: string;
    to_agent?: string;
    message_type: 'task_assignment' | 'task_acceptance' | 'task_progress' | 'task_completion' | 'coordination_request' | 'coordination_response';
    subject: string;
    content: Record<string, any>;
    priority: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
    correlation_id?: string;
    requires_response: boolean;
    response_timeout_ms?: number;
    metadata?: Record<string, any>;
    created_at: string;
}
export interface CoordinationSession {
    coordination_id: string;
    coordinator_agent: string;
    participating_agents: string[];
    coordination_type: 'sequential' | 'parallel' | 'hierarchical' | 'peer_review';
    context: Record<string, any>;
    status: 'initiated' | 'in_progress' | 'completed' | 'failed';
    started_at: string;
    completed_at?: string;
    outcome?: Record<string, any>;
}
export interface FileHandoff {
    handoff_id: string;
    file_path: string;
    from_agent: string;
    to_agent: string;
    handoff_type: 'edit_continuation' | 'review' | 'testing' | 'deployment';
    context?: Record<string, any>;
    ctk_lock_id?: string;
    handoff_status: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'failed';
    requested_at: string;
    accepted_at?: string;
    completed_at?: string;
}
export declare class CoordinationEngineService {
    private static instance;
    private activeSessions;
    private pendingHandoffs;
    private messageTimeouts;
    private constructor();
    static getInstance(): CoordinationEngineService;
    /**
     * Send message between agents via Squawk mailboxes
     */
    sendMessage(message: Omit<AgentMessage, 'message_id' | 'created_at'>): Promise<string>;
    /**
     * Get messages for an agent
     */
    getMessages(agentCallsign: string, since?: string): Promise<AgentMessage[]>;
    /**
     * Start coordination session between multiple agents
     */
    startCoordination(coordinatorAgent: string, participatingAgents: string[], coordinationType: CoordinationSession['coordination_type'], context: Record<string, any>): Promise<string>;
    /**
     * Update coordination session status
     */
    updateCoordinationStatus(coordinationId: string, status: CoordinationSession['status'], outcome?: Record<string, any>): Promise<void>;
    /**
     * Request file handoff between agents
     */
    requestFileHandoff(fromAgent: string, toAgent: string, filePath: string, handoffType: FileHandoff['handoff_type'], context?: Record<string, any>, ctkLockId?: string): Promise<string>;
    /**
     * Respond to file handoff request
     */
    respondToFileHandoff(handoffId: string, accept: boolean, reason?: string): Promise<void>;
    /**
     * Complete file handoff
     */
    completeFileHandoff(handoffId: string): Promise<void>;
    /**
     * Get active coordination sessions
     */
    getActiveSessions(): CoordinationSession[];
    /**
     * Get pending file handoffs
     */
    getPendingHandoffs(): FileHandoff[];
    /**
     * Get handoffs for specific agent
     */
    getAgentHandoffs(agentCallsign: string): FileHandoff[];
    /**
     * Set timeout for message response
     */
    private setMessageTimeout;
    /**
     * Clear message timeout
     */
    clearMessageTimeout(messageId: string): void;
    /**
     * Get coordination statistics
     */
    getCoordinationStats(): {
        active_sessions: number;
        pending_handoffs: number;
        active_message_timeouts: number;
    };
    /**
     * Cleanup expired sessions and handoffs
     */
    cleanup(): Promise<void>;
}
//# sourceMappingURL=coordination.d.ts.map