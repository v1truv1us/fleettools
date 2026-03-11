/**
 * Agent Spawner Routes for FleetTools Coordination System
 * 
 * Provides REST API endpoints for agent lifecycle management
 */

import { AgentSpawner, AgentType } from './agent-spawner.js';
import type { SpawnAgentRequest } from '../types/api.js';

const agentSpawner = new AgentSpawner();

export function registerAgentSpawnerRoutes(router: any, headers: Record<string, string>): void {
  // Spawn a new agent
  router.post('/api/v1/agents/spawn', async (request: Request) => {
    try {
      const body = await request.json() as SpawnAgentRequest;
      
      if (!body.type || !Object.values(AgentType).includes(body.type as AgentType)) {
        return new Response(JSON.stringify({
          error: 'Invalid agent type. Must be one of: ' + Object.values(AgentType).join(', ')
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const agent = await agentSpawner.spawn({
        type: body.type as AgentType,
        task: body.task,
        metadata: body.metadata,
        config: body.config
      });

      return new Response(JSON.stringify({
        success: true,
        data: agent
      }), {
        status: 201,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to spawn agent',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Get all agents
  router.get('/api/v1/agents', async (request: Request) => {
    try {
      const agents = agentSpawner.getActiveAgents();
      
      return new Response(JSON.stringify({
        success: true,
        data: agents,
        count: agents.length
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to get agents',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Get specific agent details
  router.get('/api/v1/agents/:id', async (request: Request, params: { id: string }) => {
    try {
      const agent = agentSpawner.getAgent(params.id);
      
      if (!agent) {
        return new Response(JSON.stringify({
          error: 'Agent not found'
        }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: agent
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to get agent',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Terminate an agent
  router.delete('/api/v1/agents/:id', async (request: Request, params: { id: string }) => {
    try {
      await agentSpawner.terminate(params.id);
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          agent: {
            id: params.id,
            status: 'terminated'
          }
        }
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to terminate agent',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Report agent progress
  router.post('/api/v1/agents/:id/progress', async (request: Request, params: { id: string }) => {
    try {
      const body = await request.json() as any;
      
      const agent = agentSpawner.getAgent(params.id);
      if (!agent) {
        return new Response(JSON.stringify({
          error: 'Agent not found'
        }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      // Update agent metadata with progress information
      agent.metadata = {
        ...agent.metadata,
        progress: body.progress,
        progressUpdated: new Date().toISOString()
      };
      agent.updatedAt = new Date().toISOString();

      return new Response(JSON.stringify({
        success: true,
        data: {
          agent: {
            id: params.id,
            status: 'terminated'
          }
        }
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to update progress',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Agent heartbeat
  router.post('/api/v1/agents/:id/heartbeat', async (request: Request, params: { id: string }) => {
    try {
      await agentSpawner.updateHeartbeat(params.id);
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          agent: {
            id: params.id,
            status: 'terminated'
          }
        }
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to process heartbeat',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Get agent health
  router.get('/api/v1/agents/:id/health', async (request: Request, params: { id: string }) => {
    try {
      const health = await agentSpawner.getAgentHealth(params.id);
      
      return new Response(JSON.stringify({
        success: true,
        data: health
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to get agent health',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Get system health
  router.get('/api/v1/agents/system/health', async (request: Request) => {
    try {
      const health = await agentSpawner.getSystemHealth();
      
      return new Response(JSON.stringify({
        success: true,
        data: health
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to get system health',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Get agent resource history
  router.get('/api/v1/agents/:id/resource-history', async (request: Request, params: { id: string }) => {
    try {
      const history = await agentSpawner.getResourceHistory(params.id);
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          history
        }
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to get resource history',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Get agent resource trends
  router.get('/api/v1/agents/:id/resource-trends', async (request: Request, params: { id: string }) => {
    try {
      const trends = await agentSpawner.getResourceTrends(params.id);
      
      return new Response(JSON.stringify({
        success: true,
        data: trends
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to get resource trends',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Get agent logs
  router.get('/api/v1/agents/:id/logs', async (request: Request, params: { id: string }) => {
    try {
      const url = new URL(request.url);
      const lines = parseInt(url.searchParams.get('lines') || '50');
      const eventsOnly = url.searchParams.get('events') === 'true';
      
      // Mock logs for now - in real implementation would store logs
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Agent started successfully',
          data: { agentId: params.id }
        }
      ].slice(0, lines);
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          logs: eventsOnly ? logs.filter(log => log.level === 'EVENT') : logs
        }
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to get logs',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });
}