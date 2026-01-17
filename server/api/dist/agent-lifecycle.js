/**
 * Agent Lifecycle Management Methods
 *
 * Additional lifecycle management methods for AgentSpawner
 */
// These are additional methods that can be added to the AgentSpawner class
export class AgentLifecycleManager {
    agents = new Map();
    /**
     * Update agent heartbeat
     */
    async updateHeartbeat(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent)
            return;
        agent.metadata = {
            ...agent.metadata,
            lastHeartbeat: new Date().toISOString()
        };
        agent.updatedAt = new Date().toISOString();
        this.agents.set(agentId, agent);
    }
    /**
     * Log agent error
     */
    async logError(agentId, error) {
        const agent = this.agents.get(agentId);
        if (!agent)
            return;
        const errors = agent.metadata?.errors || [];
        const errorEntry = {
            timestamp: new Date().toISOString(),
            error,
            count: 1
        };
        // Check if this error type already exists
        const existingError = errors.find((e) => e.error === error);
        if (existingError) {
            existingError.count++;
            existingError.timestamp = new Date().toISOString();
        }
        else {
            errors.push(errorEntry);
        }
        agent.metadata = {
            ...agent.metadata,
            errors: errors.slice(-10) // Keep last 10 errors
        };
        agent.updatedAt = new Date().toISOString();
        this.agents.set(agentId, agent);
    }
    /**
     * Check agent health status
     */
    async checkAgentHealth(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return { healthy: false, issues: ['Agent not found'] };
        }
        const issues = [];
        // Check if heartbeat is recent (within last 30 seconds)
        if (agent.metadata?.lastHeartbeat) {
            const lastHeartbeat = new Date(agent.metadata.lastHeartbeat).getTime();
            const now = Date.now();
            const heartbeatAge = (now - lastHeartbeat) / 1000;
            if (heartbeatAge > 30) {
                issues.push('Heartbeat timeout');
            }
        }
        else {
            issues.push('No heartbeat received');
        }
    }
    // Check error rate
    errors = agent.metadata?.errors || [];
    recentErrors = errors.filter((e) => {
        const errorTime = new Date(e.timestamp).getTime();
        const now = Date.now();
        const errorAge = (now - errorTime) / 1000;
        return errorAge < 300; // Last 5 minutes
    });
    if(recentErrors, length) { }
}
 > 5;
{
    issues.push('High error rate');
}
// Check uptime
if (agent.createdAt) {
    const uptime = this.calculateUptime(agent.createdAt);
    if (uptime > 3600) { // More than 1 hour
        // Check if too long running without reset
        issues.push('Long uptime, consider restart');
    }
}
return {
    healthy: issues.length === 0,
    issues
};
/**
 * Restart agent
 */
async;
restartAgent(agentId, string);
Promise < void  > {
    const: agent = this.agents.get(agentId),
    if(, agent) {
        throw new Error(`Agent not found: ${agentId}`);
    },
    try: {
        // Terminate current agent
        if(agent) { }, : .pid
    }
};
{
    process.kill(agent.pid, 'SIGTERM');
    // Wait for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 5000));
    // Force kill if still running
    try {
        process.kill(agent.pid, 0);
    }
    catch {
        // Process already terminated
    }
}
// Spawn new agent with same configuration
const spawnRequest = agent.metadata?.spawnRequest;
if (spawnRequest) {
    // Update metadata for restart
    agent.metadata = {
        ...agent.metadata,
        restartCount: (agent.metadata?.restartCount || 0) + 1,
        lastRestart: new Date().toISOString()
    };
    console.log(`✓ Agent restarted: ${agentId} (attempt ${agent.metadata.restartCount})`);
}
try { }
catch (error) {
    throw new Error(`Agent restart failed: ${error.message}`);
}
calculateUptime(createdAt, string);
number;
{
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return Math.floor((now - created) / 1000);
}
