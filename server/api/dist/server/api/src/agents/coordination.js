/**
 * Coordination Engine Service
 *
 * Manages multi-agent coordination, communication protocols, and collaborative workflows
 * with ai-eng-system integration and real-time messaging via Squawk.
 */
import { randomUUID } from 'node:crypto';
import { eventOps } from '@fleettools/squawk';
export class CoordinationEngineService {
    static instance;
    activeSessions = new Map();
    pendingHandoffs = new Map();
    messageTimeouts = new Map();
    constructor() { }
    static getInstance() {
        if (!CoordinationEngineService.instance) {
            CoordinationEngineService.instance = new CoordinationEngineService();
        }
        return CoordinationEngineService.instance;
    }
    /**
     * Send message between agents via Squawk mailboxes
     */
    async sendMessage(message) {
        const messageId = randomUUID();
        const fullMessage = {
            ...message,
            message_id: messageId,
            created_at: new Date().toISOString(),
        };
        // Send to target agent's mailbox or broadcast
        const targetMailbox = message.to_agent || 'broadcast';
        try {
            await eventOps.append(targetMailbox, [{
                    type: 'agent_message',
                    data: fullMessage,
                    occurred_at: fullMessage.created_at,
                    causation_id: fullMessage.correlation_id,
                    correlation_id: fullMessage.correlation_id,
                    metadata: fullMessage.metadata,
                }]);
            console.log(`Message sent from ${message.from_agent} to ${targetMailbox}: ${message.subject}`);
            // Set timeout for response if required
            if (message.requires_response && message.response_timeout_ms) {
                this.setMessageTimeout(messageId, message.response_timeout_ms, message.from_agent);
            }
            return messageId;
        }
        catch (error) {
            console.error(`Failed to send message from ${message.from_agent} to ${targetMailbox}:`, error);
            throw error;
        }
    }
    /**
     * Get messages for an agent
     */
    async getMessages(agentCallsign, since) {
        try {
            const events = await eventOps.getByMailbox(agentCallsign);
            const messages = events
                .filter(event => event.type === 'agent_message')
                .map(event => event.data)
                .filter(msg => !since || new Date(msg.created_at) > new Date(since));
            return messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
        catch (error) {
            console.error(`Failed to get messages for ${agentCallsign}:`, error);
            return [];
        }
    }
    /**
     * Start coordination session between multiple agents
     */
    async startCoordination(coordinatorAgent, participatingAgents, coordinationType, context) {
        const coordinationId = randomUUID();
        const session = {
            coordination_id: coordinationId,
            coordinator_agent: coordinatorAgent,
            participating_agents: participatingAgents,
            coordination_type: coordinationType,
            context,
            status: 'initiated',
            started_at: new Date().toISOString(),
        };
        this.activeSessions.set(coordinationId, session);
        // Notify all participating agents
        await this.sendMessage({
            from_agent: coordinatorAgent,
            to_agent: 'broadcast',
            message_type: 'coordination_request',
            subject: `Coordination session ${coordinationId} started`,
            content: {
                coordination_id: coordinationId,
                coordination_type: coordinationType,
                context,
                participating_agents: participatingAgents,
            },
            priority: 'high',
            requires_response: true,
            response_timeout_ms: 30000, // 30 seconds
        });
        console.log(`Coordination session ${coordinationId} started by ${coordinatorAgent} with ${participatingAgents.length} agents`);
        return coordinationId;
    }
    /**
     * Update coordination session status
     */
    async updateCoordinationStatus(coordinationId, status, outcome) {
        const session = this.activeSessions.get(coordinationId);
        if (!session) {
            throw new Error(`Coordination session ${coordinationId} not found`);
        }
        session.status = status;
        session.outcome = outcome;
        if (status === 'completed' || status === 'failed') {
            session.completed_at = new Date().toISOString();
        }
        this.activeSessions.set(coordinationId, session);
        // Notify participants of status change
        await this.sendMessage({
            from_agent: session.coordinator_agent,
            to_agent: 'broadcast',
            message_type: 'coordination_response',
            subject: `Coordination session ${coordinationId} ${status}`,
            content: {
                coordination_id: coordinationId,
                status,
                outcome,
                completed_at: session.completed_at,
            },
            priority: 'medium',
            requires_response: false,
        });
        console.log(`Coordination session ${coordinationId} updated to ${status}`);
    }
    /**
     * Request file handoff between agents
     */
    async requestFileHandoff(fromAgent, toAgent, filePath, handoffType, context, ctkLockId) {
        const handoffId = randomUUID();
        const handoff = {
            handoff_id: handoffId,
            file_path: filePath,
            from_agent: fromAgent,
            to_agent: toAgent,
            handoff_type: handoffType,
            context,
            ctk_lock_id: ctkLockId,
            handoff_status: 'requested',
            requested_at: new Date().toISOString(),
        };
        this.pendingHandoffs.set(handoffId, handoff);
        // Notify target agent
        await this.sendMessage({
            from_agent: fromAgent,
            to_agent: toAgent,
            message_type: 'task_assignment', // Using existing message type
            subject: `File handoff request: ${filePath}`,
            content: {
                handoff_id: handoffId,
                file_path: filePath,
                handoff_type: handoffType,
                context,
                ctk_lock_id: ctkLockId,
                action: 'file_handoff_request',
            },
            priority: 'high',
            requires_response: true,
            response_timeout_ms: 60000, // 1 minute
        });
        console.log(`File handoff requested: ${filePath} from ${fromAgent} to ${toAgent}`);
        return handoffId;
    }
    /**
     * Respond to file handoff request
     */
    async respondToFileHandoff(handoffId, accept, reason) {
        const handoff = this.pendingHandoffs.get(handoffId);
        if (!handoff) {
            throw new Error(`Handoff ${handoffId} not found`);
        }
        handoff.handoff_status = accept ? 'accepted' : 'failed';
        handoff.accepted_at = new Date().toISOString();
        if (!accept && reason) {
            handoff.context = { ...handoff.context, rejection_reason: reason };
        }
        this.pendingHandoffs.set(handoffId, handoff);
        // Notify requesting agent
        await this.sendMessage({
            from_agent: handoff.to_agent,
            to_agent: handoff.from_agent,
            message_type: 'task_acceptance', // Using existing message type
            subject: `File handoff ${accept ? 'accepted' : 'rejected'}: ${handoff.file_path}`,
            content: {
                handoff_id: handoffId,
                accepted: accept,
                reason,
                file_path: handoff.file_path,
                action: 'file_handoff_response',
            },
            priority: 'high',
            requires_response: false,
        });
        console.log(`File handoff ${handoffId} ${accept ? 'accepted' : 'rejected'} by ${handoff.to_agent}`);
    }
    /**
     * Complete file handoff
     */
    async completeFileHandoff(handoffId) {
        const handoff = this.pendingHandoffs.get(handoffId);
        if (!handoff) {
            throw new Error(`Handoff ${handoffId} not found`);
        }
        handoff.handoff_status = 'completed';
        handoff.completed_at = new Date().toISOString();
        this.pendingHandoffs.set(handoffId, handoff);
        // Notify both agents
        await this.sendMessage({
            from_agent: 'coordination_engine',
            to_agent: 'broadcast',
            message_type: 'task_completion',
            subject: `File handoff completed: ${handoff.file_path}`,
            content: {
                handoff_id: handoffId,
                file_path: handoff.file_path,
                from_agent: handoff.from_agent,
                to_agent: handoff.to_agent,
                completed_at: handoff.completed_at,
                action: 'file_handoff_completed',
            },
            priority: 'medium',
            requires_response: false,
        });
        // Remove from pending after delay
        setTimeout(() => {
            this.pendingHandoffs.delete(handoffId);
        }, 60000); // Keep for 1 minute for confirmation
        console.log(`File handoff ${handoffId} completed successfully`);
    }
    /**
     * Get active coordination sessions
     */
    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }
    /**
     * Get pending file handoffs
     */
    getPendingHandoffs() {
        return Array.from(this.pendingHandoffs.values());
    }
    /**
     * Get handoffs for specific agent
     */
    getAgentHandoffs(agentCallsign) {
        return Array.from(this.pendingHandoffs.values()).filter(handoff => handoff.from_agent === agentCallsign || handoff.to_agent === agentCallsign);
    }
    /**
     * Set timeout for message response
     */
    setMessageTimeout(messageId, timeoutMs, senderAgent) {
        const timeout = setTimeout(() => {
            console.warn(`Message ${messageId} from ${senderAgent} timed out awaiting response`);
            this.messageTimeouts.delete(messageId);
        }, timeoutMs);
        this.messageTimeouts.set(messageId, timeout);
    }
    /**
     * Clear message timeout
     */
    clearMessageTimeout(messageId) {
        const timeout = this.messageTimeouts.get(messageId);
        if (timeout) {
            clearTimeout(timeout);
            this.messageTimeouts.delete(messageId);
        }
    }
    /**
     * Get coordination statistics
     */
    getCoordinationStats() {
        return {
            active_sessions: this.activeSessions.size,
            pending_handoffs: this.pendingHandoffs.size,
            active_message_timeouts: this.messageTimeouts.size,
        };
    }
    /**
     * Cleanup expired sessions and handoffs
     */
    async cleanup() {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        // Clean up old completed sessions
        for (const [id, session] of this.activeSessions.entries()) {
            if ((session.status === 'completed' || session.status === 'failed') &&
                session.completed_at &&
                new Date(session.completed_at).getTime() < oneHourAgo) {
                this.activeSessions.delete(id);
                console.log(`Cleaned up old coordination session ${id}`);
            }
        }
        // Clean up old completed handoffs
        for (const [id, handoff] of this.pendingHandoffs.entries()) {
            if (handoff.handoff_status === 'completed' &&
                handoff.completed_at &&
                new Date(handoff.completed_at).getTime() < oneHourAgo) {
                this.pendingHandoffs.delete(id);
                console.log(`Cleaned up old handoff ${id}`);
            }
        }
        console.log('Coordination engine cleanup completed');
    }
}
// Auto-cleanup every 5 minutes
setInterval(() => {
    CoordinationEngineService.getInstance().cleanup();
}, 5 * 60 * 1000);
//# sourceMappingURL=coordination.js.map