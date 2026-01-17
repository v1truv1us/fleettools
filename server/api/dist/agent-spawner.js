/**
 * Agent Spawner for FleetTools Coordination System
 *
 * Manages agent lifecycle: spawning, monitoring, and termination
 * Integrates with Squawk mailbox system for coordination
 */
import { randomUUID } from 'node:crypto';
import path from 'node:path';
// Import types from coordination module (using local definition to avoid path issues)
export var AgentType;
(function (AgentType) {
    AgentType["FRONTEND"] = "frontend";
    AgentType["BACKEND"] = "backend";
    AgentType["TESTING"] = "testing";
    AgentType["DOCUMENTATION"] = "documentation";
    AgentType["SECURITY"] = "security";
    AgentType["PERFORMANCE"] = "performance";
})(AgentType || (AgentType = {}));
export var AgentStatus;
(function (AgentStatus) {
    AgentStatus["SPAWNING"] = "spawning";
    AgentStatus["RUNNING"] = "running";
    AgentStatus["IDLE"] = "idle";
    AgentStatus["BUSY"] = "busy";
    AgentStatus["ERROR"] = "error";
    AgentStatus["TERMINATED"] = "terminated";
    AgentStatus["FAILED"] = "failed";
})(AgentStatus || (AgentStatus = {}));
export class AgentSpawner {
    agents = new Map();
    mailboxPath;
    constructor(mailboxPath) {
        this.mailboxPath = mailboxPath || path.join(process.cwd(), '.flightline', 'mailboxes');
    }
    /**
     * Spawn a new agent with timeout and retry logic
     */
    async spawn(request) {
        const agentId = `agt_${randomUUID()}`;
        const mailboxId = `mbx_${randomUUID()}`;
        const timeout = request.config?.timeout || 300000; // 5 minutes default
        const maxRetries = request.config?.retries || 3;
        const agent = {
            id: agentId,
            type: request.type,
            status: AgentStatus.SPAWNING,
            mailboxId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
                ...request.metadata,
                spawnRequest: request,
                spawnAttempts: 0,
                maxRetries
            }
        };
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                agent.metadata.spawnAttempts = attempt;
                agent.updatedAt = new Date().toISOString();
                // Create mailbox for agent
                await this.createMailbox(mailboxId, agentId);
                // Spawn agent process with timeout
                const pid = await this.executeAgentSpawnWithTimeout(agent, request, timeout);
                agent.pid = pid;
                agent.status = AgentStatus.RUNNING;
                agent.updatedAt = new Date().toISOString();
                // Store agent
                this.agents.set(agentId, agent);
                console.log(`✓ Agent spawned: ${agentId} (${request.type}) - attempt ${attempt}`);
                return agent;
            }
            catch (error) {
                lastError = error;
                agent.status = AgentStatus.FAILED;
                agent.updatedAt = new Date().toISOString();
                console.error(`✗ Agent spawn attempt ${attempt} failed:`, error.message);
                if (attempt < maxRetries) {
                    // Wait before retry
                    const retryDelay = Math.min(5000 * attempt, 15000); // Exponential backoff
                    console.log(`Retrying agent spawn in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    // Clean up failed attempt
                    try {
                        await this.cleanupFailedSpawn(agentId);
                    }
                    catch (cleanupError) {
                        console.error(`Cleanup failed:`, cleanupError.message);
                    }
                }
            }
        }
        // All attempts failed
        agent.status = AgentStatus.FAILED;
        agent.updatedAt = new Date().toISOString();
        agent.metadata.lastError = lastError?.message || 'Unknown error';
        this.agents.set(agentId, agent);
        console.error(`✗ Agent spawn failed after ${maxRetries} attempts: ${agentId}`);
        throw new Error(`Agent spawn failed after ${maxRetries} attempts: ${lastError?.message}`);
    }
}
;
try {
    // Create mailbox for agent
    await this.createMailbox(mailboxId, agentId);
    // Spawn the agent process
    const pid = await this.executeAgentSpawn(agent, request);
    agent.pid = pid;
    agent.status = AgentStatus.RUNNING;
    agent.updatedAt = new Date().toISOString();
    // Store agent
    this.agents.set(agentId, agent);
    console.log(`✓ Agent spawned: ${agentId} (${request.type})`);
    return agent;
}
catch (error) {
    agent.status = AgentStatus.FAILED;
    agent.updatedAt = new Date().toISOString();
    this.agents.set(agentId, agent);
    console.error(`✗ Failed to spawn agent ${agentId}:`, error.message);
    throw new Error(`Agent spawn failed: ${error.message}`);
}
/**
 * Monitor agent status and health with comprehensive checks
 */
async;
monitor(agentId, string);
Promise < AgentMonitor > {
    const: agent = this.agents.get(agentId),
    if(, agent) {
        throw new Error(`Agent not found: ${agentId}`);
    },
    const: monitor, AgentMonitor = {
        status: agent.status,
        uptime: this.calculateUptime(agent.createdAt),
        lastHeartbeat: await this.getLastHeartbeat(agentId),
        resourceUsage: await this.getAgentResourceUsage(agentId),
        errors: await this.getAgentErrors(agentId)
    },
    // Check if process is still running
    if(agent) { }, : .pid
};
{
    try {
        process.kill(agent.pid, 0); // Signal 0 doesn't kill, just checks
        monitor.status = AgentStatus.RUNNING;
        // Update agent status if different
        if (agent.status !== AgentStatus.RUNNING) {
            agent.status = AgentStatus.RUNNING;
            agent.updatedAt = new Date().toISOString();
            this.agents.set(agentId, agent);
        }
    }
    catch {
        monitor.status = AgentStatus.TERMINATED;
        agent.status = AgentStatus.TERMINATED;
        agent.updatedAt = new Date().toISOString();
        this.agents.set(agentId, agent);
    }
}
// Health assessment
if (monitor.errors && monitor.errors.length > 5) {
    monitor.status = AgentStatus.ERROR;
    agent.status = AgentStatus.ERROR;
    agent.updatedAt = new Date().toISOString();
    this.agents.set(agentId, agent);
}
return monitor;
/**
 * Terminate an agent
 */
async;
terminate(agentId, string, graceful = true);
Promise < void  > {
    const: agent = this.agents.get(agentId),
    if(, agent) {
        throw new Error(`Agent not found: ${agentId}`);
    },
    console, : .log(`Terminating agent: ${agentId} (${agent.type})`),
    try: {
        if(agent) { }, : .pid
    }
};
{
    if (graceful) {
        // Send SIGTERM for graceful shutdown
        process.kill(agent.pid, 'SIGTERM');
        // Wait for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Check if process is still running
        try {
            process.kill(agent.pid, 0);
            // Force kill if still running
            process.kill(agent.pid, 'SIGKILL');
            console.log(`⚠️  Force killed agent: ${agentId}`);
        }
        catch {
            // Process already terminated
            console.log(`✓ Agent terminated gracefully: ${agentId}`);
        }
    }
    else {
        // Force kill immediately
        process.kill(agent.pid, 'SIGKILL');
        console.log(`✓ Agent terminated: ${agentId}`);
    }
}
// Cleanup mailbox
await this.cleanupMailbox(agent.mailboxId);
// Update agent status
agent.status = AgentStatus.TERMINATED;
agent.updatedAt = new Date().toISOString();
console.log(`✓ Agent cleanup complete: ${agentId}`);
try { }
catch (error) {
    agent.status = AgentStatus.ERROR;
    agent.updatedAt = new Date().toISOString();
    console.error(`✗ Error terminating agent ${agentId}:`, error.message);
    throw new Error(`Agent termination failed: ${error.message}`);
}
/**
 * Get all active agents
 */
getActiveAgents();
AgentHandle[];
{
    return Array.from(this.agents.values()).filter(agent => agent.status === AgentStatus.RUNNING ||
        agent.status === AgentStatus.IDLE ||
        agent.status === AgentStatus.BUSY);
}
/**
 * Get agents by type
 */
getAgentsByType(type, AgentType);
AgentHandle[];
{
    return Array.from(this.agents.values()).filter(agent => agent.type === type);
}
/**
 * Get agent by ID
 */
getAgent(agentId, string);
AgentHandle | undefined;
{
    return this.agents.get(agentId);
}
async;
createMailbox(mailboxId, string, agentId, string);
Promise < void  > {
    const: mailboxDir = path.join(this.mailboxPath, mailboxId),
    // Create mailbox directory
    await, this: .ensureDirectory(mailboxDir),
    // Create mailbox manifest
    const: manifest = {
        id: mailboxId,
        agentId,
        createdAt: new Date().toISOString(),
        type: 'agent-mailbox'
    },
    const: manifestPath = path.join(mailboxDir, 'manifest.json'),
    await, this: .writeFile(manifestPath, JSON.stringify(manifest, null, 2))
};
async;
cleanupMailbox(mailboxId, string);
Promise < void  > {
    const: mailboxDir = path.join(this.mailboxPath, mailboxId),
    try: {
        await, this: .removeDirectory(mailboxDir),
        console, : .log(`✓ Cleaned up mailbox: ${mailboxId}`)
    }, catch(error) {
        console.error(`⚠️  Failed to cleanup mailbox ${mailboxId}:`, error.message);
    }
};
async;
executeAgentSpawn(agent, AgentHandle, request, AgentSpawnRequest);
Promise < number > {
    // This is a placeholder implementation
    // In a real system, this would spawn the actual agent process
    // For now, we'll simulate with a child process
    const: { spawn } = await import('node:child_process'),
    return: new Promise((resolve, reject) => {
        const args = [
            '--agent-id', agent.id,
            '--agent-type', agent.type,
            '--mailbox-id', agent.mailboxId,
            '--task', request.task || ''
        ];
        if (request.config?.timeout) {
            args.push('--timeout', request.config.timeout.toString());
        }
        const childProcess = spawn('node', ['src/agent-runner.js', ...args], {
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: false
        });
        childProcess.on('spawn', () => {
            console.log(`Agent process spawned with PID: ${childProcess.pid}`);
            resolve(childProcess.pid);
        });
        childProcess.on('error', (error) => {
            console.error(`Failed to spawn agent process:`, error);
            reject(error);
        });
        // Handle agent output
        if (childProcess.stdout) {
            childProcess.stdout.on('data', (data) => {
                console.log(`[${agent.id}] ${data.toString().trim()}`);
            });
        }
        if (childProcess.stderr) {
            childProcess.stderr.on('data', (data) => {
                console.error(`[${agent.id}] ERROR: ${data.toString().trim()}`);
            });
        }
        childProcess.on('close', (code) => {
            if (code !== 0) {
                console.log(`Agent ${agent.id} exited with code: ${code}`);
            }
        });
    })
};
async;
executeAgentSpawnWithTimeout(agent, AgentHandle, request, AgentSpawnRequest, timeout, number);
Promise < number > {
    return: Promise.race([
        this.executeAgentSpawn(agent, request),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Agent spawn timeout')), timeout))
    ])
};
async;
cleanupFailedSpawn(agentId, string);
Promise < void  > {
    try: {
        // Terminate any existing process
        const: agent = this.agents.get(agentId),
        if(agent, pid) {
            try {
                process.kill(agent.pid, 'SIGKILL');
                console.log(`✓ Cleaned up process ${agent.pid}`);
            }
            catch {
                // Process already terminated
            }
        }
        // Cleanup mailbox
        ,
        // Cleanup mailbox
        const: agentHandle = this.agents.get(agentId),
        if(agentHandle, mailboxId) {
            await this.cleanupMailbox(agentHandle.mailboxId);
        }
    }, catch(error) {
        console.error(`Cleanup error for ${agentId}:`, error.message);
    }
};
async;
getLastHeartbeat(agentId, string);
Promise < string | undefined > {
    // Placeholder: In real implementation, read from Squawk mailbox
    return: new Date().toISOString()
};
async;
getAgentErrors(agentId, string);
Promise < Array < { timestamp: string, error: string, count: number } >> {
    // Placeholder: In real implementation, read from error logs or database
    const: agent = this.agents.get(agentId),
    if(agent, metadata, errors) {
        return agent.metadata.errors;
    },
    return: []
};
async;
getAgentResourceUsage(agentId, string);
Promise < { memory: number, cpu: number } | undefined > {
    // Placeholder: In real implementation, get from process monitoring
    const: agent = this.agents.get(agentId),
    if(agent, pid) {
        try {
            // This would use system monitoring APIs in a real implementation
            // For now, return simulated values
            return {
                memory: Math.floor(Math.random() * 500) + 100, // MB
                cpu: Math.floor(Math.random() * 80) + 10 // percentage
            };
        }
        catch {
            return undefined;
        }
    },
    return: undefined
};
/**
 * Update agent heartbeat
 */
async;
updateHeartbeat(agentId, string);
Promise < void  > {
    const: agent = this.agents.get(agentId),
    if(, agent) { }, return: ,
    agent, : .metadata = {
        ...agent.metadata,
        lastHeartbeat: new Date().toISOString()
    },
    agent, : .updatedAt = new Date().toISOString(),
    this: .agents.set(agentId, agent)
};
/**
 * Log agent error
 */
async;
logError(agentId, string, error, string);
Promise < void  > {
    const: agent = this.agents.get(agentId),
    if(, agent) { }, return: ,
    const: errors = agent.metadata?.errors || [],
    const: errorEntry = {
        timestamp: new Date().toISOString(),
        error,
        count: 1
    },
    // Check if this error type already exists
    const: existingError = errors.find(e => e.error === error),
    if(existingError) {
        existingError.count++;
        existingError.timestamp = new Date().toISOString();
    }, else: {
        errors, : .push(errorEntry)
    },
    agent, : .metadata = {
        ...agent.metadata,
        errors: errors.slice(-10) // Keep last 10 errors
    },
    agent, : .updatedAt = new Date().toISOString(),
    this: .agents.set(agentId, agent)
};
calculateUptime(createdAt, string);
number;
{
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return Math.floor((now - created) / 1000);
}
async;
ensureDirectory(dirPath, string);
Promise < void  > {
    const: { mkdir } = await import('node:fs/promises'),
    await
};
async;
writeFile(filePath, string, content, string);
Promise < void  > {
    const: { writeFile } = await import('node:fs/promises'),
    await
};
async;
removeDirectory(dirPath, string);
Promise < void  > {
    const: { rm } = await import('node:fs/promises'),
    await
};
