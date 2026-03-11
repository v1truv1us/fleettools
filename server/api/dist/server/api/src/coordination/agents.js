/**
 * Agent API Routes
 *
 * RESTful endpoints for agent lifecycle management
 * POST /api/v1/agents/spawn - Spawn new agent
 * GET /api/v1/agents - List all agents
 * GET /api/v1/agents/:id - Get agent details
 * DELETE /api/v1/agents/:id - Terminate agent
 * POST /api/v1/agents/:id/progress - Report agent progress
 * POST /api/v1/agents/:id/heartbeat - Agent heartbeat
 */
import { AgentSpawner, AgentType, AgentStatus } from './agent-spawner.js';
const spawner = new AgentSpawner();
export function registerAgentRoutes(router, headers) {
    router.post('/api/v1/agents/spawn', async (req) => {
        try {
            const body = (await req.json());
            const { type, task, metadata, config } = body;
            if (!type || !Object.values(AgentType).includes(type)) {
                return new Response(JSON.stringify({
                    error: 'Invalid agent type',
                    validTypes: Object.values(AgentType)
                }), {
                    status: 400,
                    headers: { ...headers, 'Content-Type': 'application/json' }
                });
            }
            const agent = await spawner.spawn({
                type,
                task,
                metadata,
                config
            });
            return new Response(JSON.stringify({
                success: true,
                data: {
                    agent: {
                        id: agent.id,
                        type: agent.type,
                        status: agent.status,
                        mailboxId: agent.mailboxId,
                        pid: agent.pid,
                        createdAt: agent.createdAt,
                        updatedAt: agent.updatedAt,
                        metadata: agent.metadata
                    }
                }
            }), {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('Agent spawn error:', error);
            return new Response(JSON.stringify({
                error: 'Failed to spawn agent',
                message: error?.message || 'Unknown error'
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
    });
    router.get('/api/v1/agents', async (req) => {
        try {
            const url = new URL(req.url);
            const typeParam = url.searchParams.get('type');
            const statusParam = url.searchParams.get('status');
            let agents = spawner.getActiveAgents();
            if (typeParam && Object.values(AgentType).includes(typeParam)) {
                agents = spawner.getAgentsByType(typeParam);
            }
            if (statusParam && Object.values(AgentStatus).includes(statusParam)) {
                agents = agents.filter(a => a.status === statusParam);
            }
            const agentsWithStatus = await Promise.all(agents.map(async (agent) => {
                const monitor = await spawner.monitor(agent.id);
                return {
                    id: agent.id,
                    type: agent.type,
                    callsign: `${agent.type}-${agent.id.slice(0, 8)}`,
                    status: monitor.status,
                    pid: agent.pid,
                    mailboxId: agent.mailboxId,
                    createdAt: agent.createdAt,
                    updatedAt: agent.updatedAt,
                    uptime: monitor.uptime,
                    lastHeartbeat: monitor.lastHeartbeat,
                    resourceUsage: monitor.resourceUsage,
                    errors: monitor.errors,
                    metadata: agent.metadata
                };
            }));
            return new Response(JSON.stringify({
                success: true,
                data: {
                    agents: agentsWithStatus,
                    total: agentsWithStatus.length
                }
            }), {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('List agents error:', error);
            return new Response(JSON.stringify({
                error: 'Failed to list agents',
                message: error?.message || 'Unknown error'
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
    });
    router.get('/api/v1/agents/:id', async (req, params) => {
        try {
            const agent = spawner.getAgent(params.id);
            if (!agent) {
                return new Response(JSON.stringify({
                    error: 'Agent not found',
                    id: params.id
                }), {
                    status: 404,
                    headers: { ...headers, 'Content-Type': 'application/json' }
                });
            }
            const monitor = await spawner.monitor(agent.id);
            return new Response(JSON.stringify({
                success: true,
                data: {
                    agent: {
                        id: agent.id,
                        type: agent.type,
                        callsign: `${agent.type}-${agent.id.slice(0, 8)}`,
                        status: monitor.status,
                        pid: agent.pid,
                        mailboxId: agent.mailboxId,
                        createdAt: agent.createdAt,
                        updatedAt: agent.updatedAt,
                        uptime: monitor.uptime,
                        lastHeartbeat: monitor.lastHeartbeat,
                        resourceUsage: monitor.resourceUsage,
                        errors: monitor.errors,
                        metadata: agent.metadata
                    }
                }
            }), {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('Get agent error:', error);
            return new Response(JSON.stringify({
                error: 'Failed to get agent',
                message: error?.message || 'Unknown error'
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
    });
    router.delete('/api/v1/agents/:id', async (req, params) => {
        try {
            const url = new URL(req.url);
            const forceParam = url.searchParams.get('force');
            const reasonParam = url.searchParams.get('reason') || 'manual';
            const agent = spawner.getAgent(params.id);
            if (!agent) {
                return new Response(JSON.stringify({
                    error: 'Agent not found',
                    id: params.id
                }), {
                    status: 404,
                    headers: { ...headers, 'Content-Type': 'application/json' }
                });
            }
            await spawner.terminate(params.id, forceParam === 'true');
            return new Response(JSON.stringify({
                success: true,
                data: {
                    agent: {
                        id: agent.id,
                        type: agent.type,
                        callsign: `${agent.type}-${agent.id.slice(0, 8)}`,
                        status: AgentStatus.TERMINATED,
                        reason: reasonParam
                    }
                }
            }), {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('Terminate agent error:', error);
            return new Response(JSON.stringify({
                error: 'Failed to terminate agent',
                message: error?.message || 'Unknown error'
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
    });
    router.post('/api/v1/agents/:id/progress', async (req, params) => {
        try {
            const body = (await req.json());
            const { status, progress, message } = body;
            const agent = spawner.getAgent(params.id);
            if (!agent) {
                return new Response(JSON.stringify({
                    error: 'Agent not found',
                    id: params.id
                }), {
                    status: 404,
                    headers: { ...headers, 'Content-Type': 'application/json' }
                });
            }
            if (status && Object.values(AgentStatus).includes(status)) {
                agent.status = status;
            }
            if (typeof progress === 'number' && progress >= 0 && progress <= 100) {
                agent.metadata = agent.metadata || {};
                agent.metadata.progress = progress;
            }
            if (message) {
                agent.metadata = agent.metadata || {};
                agent.metadata.lastMessage = message;
            }
            agent.updatedAt = new Date().toISOString();
            return new Response(JSON.stringify({
                success: true,
                data: {
                    agentId: agent.id,
                    status: agent.status,
                    progress: agent.metadata?.progress,
                    timestamp: new Date().toISOString()
                }
            }), {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('Progress update error:', error);
            return new Response(JSON.stringify({
                error: 'Failed to update progress',
                message: error?.message || 'Unknown error'
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
    });
    router.post('/api/v1/agents/:id/heartbeat', async (req, params) => {
        try {
            const body = (await req.json());
            const { timestamp, resourceUsage } = body;
            const agent = spawner.getAgent(params.id);
            if (!agent) {
                return new Response(JSON.stringify({
                    error: 'Agent not found',
                    id: params.id
                }), {
                    status: 404,
                    headers: { ...headers, 'Content-Type': 'application/json' }
                });
            }
            await spawner.updateHeartbeat(params.id);
            if (timestamp) {
                agent.metadata = agent.metadata || {};
                agent.metadata.lastHeartbeat = timestamp;
            }
            if (resourceUsage) {
                agent.metadata = agent.metadata || {};
                agent.metadata.resourceUsage = resourceUsage;
            }
            agent.updatedAt = new Date().toISOString();
            return new Response(JSON.stringify({
                success: true,
                data: {
                    agentId: agent.id,
                    heartbeatReceived: true,
                    timestamp: new Date().toISOString()
                }
            }), {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('Heartbeat error:', error);
            return new Response(JSON.stringify({
                error: 'Failed to process heartbeat',
                message: error?.message || 'Unknown error'
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
    });
    router.get('/api/v1/agents/:id/health', async (req, params) => {
        try {
            const health = await spawner.getAgentHealth(params.id);
            if (!health) {
                return new Response(JSON.stringify({
                    error: 'Agent not found',
                    id: params.id
                }), {
                    status: 404,
                    headers: { ...headers, 'Content-Type': 'application/json' }
                });
            }
            return new Response(JSON.stringify({
                success: true,
                data: {
                    id: params.id,
                    ...health
                }
            }), {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('Agent health error:', error);
            return new Response(JSON.stringify({
                error: 'Failed to get agent health',
                message: error?.message || 'Unknown error'
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
    });
    router.get('/api/v1/agents/system-health', async (req) => {
        try {
            const systemHealth = await spawner.getSystemHealth();
            return new Response(JSON.stringify({
                success: true,
                data: systemHealth
            }), {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('System health error:', error);
            return new Response(JSON.stringify({
                error: 'Failed to get system health',
                message: error?.message || 'Unknown error'
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
    });
    router.get('/api/v1/agents/:id/resource-history', async (req, params) => {
        try {
            const history = await spawner.getResourceHistory(params.id);
            return new Response(JSON.stringify({
                success: true,
                data: {
                    agentId: params.id,
                    history
                }
            }), {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('Resource history error:', error);
            return new Response(JSON.stringify({
                error: 'Failed to get resource history',
                message: error?.message || 'Unknown error'
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
    });
    router.get('/api/v1/agents/:id/resource-trends', async (req, params) => {
        try {
            const trends = await spawner.getResourceTrends(params.id);
            return new Response(JSON.stringify({
                success: true,
                data: {
                    agentId: params.id,
                    ...trends
                }
            }), {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('Resource trends error:', error);
            return new Response(JSON.stringify({
                error: 'Failed to get resource trends',
                message: error?.message || 'Unknown error'
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
    });
    router.get('/api/v1/agents/:id/logs', async (req, params) => {
        try {
            const url = new URL(req.url);
            const linesParam = url.searchParams.get('lines');
            const eventsOnlyParam = url.searchParams.get('eventsOnly');
            const lines = linesParam ? parseInt(linesParam) : 50;
            const eventsOnly = eventsOnlyParam === 'true';
            // In a real implementation, this would query actual logs
            // For now, return mock log data
            const logs = generateMockLogs(params.id, lines, eventsOnly);
            return new Response(JSON.stringify({
                success: true,
                data: {
                    agentId: params.id,
                    logs
                }
            }), {
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('Agent logs error:', error);
            return new Response(JSON.stringify({
                error: 'Failed to get agent logs',
                message: error?.message || 'Unknown error'
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
    });
}
/**
 * Generate mock log data for demonstration
 * In real implementation, this would query actual log storage
 */
function generateMockLogs(agentId, limit, eventsOnly) {
    const logs = [];
    const now = Date.now();
    const levels = ['INFO', 'DEBUG', 'WARN', 'ERROR'];
    const eventTypes = ['agent_started', 'task_progress', 'heartbeat', 'agent_completed'];
    for (let i = 0; i < limit; i++) {
        const timestamp = new Date(now - (i * 60000)).toISOString(); // 1 minute intervals
        if (eventsOnly && Math.random() > 0.3)
            continue; // Fewer events when filtering
        const isEvent = eventsOnly || Math.random() > 0.7;
        const logEntry = {
            timestamp,
            level: isEvent ? 'EVENT' : levels[Math.floor(Math.random() * levels.length)],
            message: isEvent
                ? `${eventTypes[Math.floor(Math.random() * eventTypes.length)]} event occurred`
                : `Agent ${agentId} ${['is processing', 'completed task', 'updated status', 'checking resources'][Math.floor(Math.random() * 4)]}`
        };
        if (isEvent) {
            logEntry.data = {
                agentId,
                progress: Math.floor(Math.random() * 100),
                stage: ['analysis', 'implementation', 'testing', 'completion'][Math.floor(Math.random() * 4)]
            };
        }
        logs.push(logEntry);
    }
    return logs.reverse(); // Most recent first
}
//# sourceMappingURL=agents.js.map