/**
 * Agent Management API Routes
 * 
 * REST API endpoints for agent coordination system management.
 */

import { randomUUID } from 'node:crypto';

// Simple in-memory agent registry for demonstration
interface Agent {
  id: string;
  agent_type: string;
  callsign: string;
  status: 'idle' | 'busy' | 'offline' | 'error';
  capabilities: Array<{
    id: string;
    name: string;
    trigger_words: string[];
  }>;
  current_workload: number;
  max_workload: number;
  last_heartbeat: string;
  created_at: string;
  updated_at: string;
}

interface Assignment {
  id: string;
  agent_id: string;
  agent_callsign: string;
  work_order_id: string;
  work_type: string;
  priority: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  assigned_at: string;
  status: 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress_percent: number;
  context?: Record<string, any>;
}

// In-memory storage for demonstration
const agents = new Map<string, Agent>();
const assignments = new Map<string, Assignment>();

// Initialize with some demo agents
agents.set('FSD-001', {
  id: randomUUID(),
  agent_type: 'full-stack-developer',
  callsign: 'FSD-001',
  status: 'idle',
  capabilities: [{
    id: 'feature-implementation',
    name: 'End-to-End Feature Implementation',
    trigger_words: ['implement', 'feature', 'build', 'develop'],
  }],
  current_workload: 0,
  max_workload: 2,
  last_heartbeat: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

agents.set('CR-001', {
  id: randomUUID(),
  agent_type: 'code-reviewer',
  callsign: 'CR-001',
  status: 'idle',
  capabilities: [{
    id: 'code-quality',
    name: 'Code Quality Review',
    trigger_words: ['review', 'quality', 'audit', 'refactor'],
  }],
  current_workload: 1,
  max_workload: 4,
  last_heartbeat: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export function registerAgentRoutes(router: any, headers: Record<string, string>) {
  
  // Get all agents
  router.get('/api/v1/agents', async (req: Request) => {
    try {
      const agentList = Array.from(agents.values());
      return new Response(JSON.stringify({
        agents: agentList,
        count: agentList.length,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error getting agents:', error);
      return new Response(JSON.stringify({ error: 'Failed to get agents' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Get agent by callsign
  router.get('/api/v1/agents/:callsign', async (req: Request, params: any) => {
    try {
      const agent = agents.get(params.callsign);
      if (!agent) {
        return new Response(JSON.stringify({ error: 'Agent not found' }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        agent,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error getting agent:', error);
      return new Response(JSON.stringify({ error: 'Failed to get agent' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Register new agent
  router.post('/api/v1/agents/register', async (req: Request) => {
    try {
      const body = await req.json() as any;
      
      // Check if callsign already exists
      for (const agent of agents.values()) {
        if (agent.callsign === body.callsign) {
          return new Response(JSON.stringify({ error: 'Agent callsign already exists' }), {
            status: 409,
            headers: { ...headers, 'Content-Type': 'application/json' },
          });
        }
      }

      const newAgent: Agent = {
        id: randomUUID(),
        agent_type: body.agent_type,
        callsign: body.callsign,
        status: 'offline',
        capabilities: body.capabilities || [],
        current_workload: 0,
        max_workload: body.max_workload || 1,
        last_heartbeat: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      agents.set(body.callsign, newAgent);

      console.log(`Agent registered: ${body.callsign} (${body.agent_type})`);

      return new Response(JSON.stringify({
        agent: newAgent,
        message: 'Agent registered successfully',
        timestamp: new Date().toISOString(),
      }), {
        status: 201,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error registering agent:', error);
      return new Response(JSON.stringify({ error: 'Failed to register agent' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Update agent status
  router.patch('/api/v1/agents/:callsign/status', async (req: Request, params: any) => {
    try {
      const body = await req.json();
      const agent = agents.get(params.callsign);
      
      if (!agent) {
        return new Response(JSON.stringify({ error: 'Agent not found' }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      agent.status = body.status;
      agent.last_heartbeat = new Date().toISOString();
      agent.updated_at = new Date().toISOString();

      if (body.workload !== undefined) {
        agent.current_workload = body.workload;
      }

      agents.set(params.callsign, agent);

      return new Response(JSON.stringify({
        agent,
        message: 'Agent status updated',
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error updating agent status:', error);
      return new Response(JSON.stringify({ error: 'Failed to update agent status' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Get agent assignments
  router.get('/api/v1/agents/:callsign/assignments', async (req: Request, params: any) => {
    try {
      const agent = agents.get(params.callsign);
      if (!agent) {
        return new Response(JSON.stringify({ error: 'Agent not found' }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const agentAssignments = Array.from(assignments.values())
        .filter(assignment => assignment.agent_callsign === params.callsign);

      return new Response(JSON.stringify({
        assignments: agentAssignments,
        count: agentAssignments.length,
        agent: {
          id: agent.id,
          callsign: agent.callsign,
          agent_type: agent.agent_type,
          status: agent.status,
          current_workload: agent.current_workload,
          max_workload: agent.max_workload,
        },
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error getting agent assignments:', error);
      return new Response(JSON.stringify({ error: 'Failed to get agent assignments' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Update assignment status
  router.patch('/api/v1/assignments/:id/status', async (req: Request, params: any) => {
    try {
      const body = await req.json();
      const assignment = assignments.get(params.id);
      
      if (!assignment) {
        return new Response(JSON.stringify({ error: 'Assignment not found' }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      assignment.status = body.status;
      if (body.progress_percent !== undefined) {
        assignment.progress_percent = body.progress_percent;
      }

      assignments.set(params.id, assignment);

      return new Response(JSON.stringify({
        assignment,
        message: 'Assignment status updated',
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error updating assignment status:', error);
      return new Response(JSON.stringify({ error: 'Failed to update assignment status' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Create work assignment
  router.post('/api/v1/assignments', async (req: Request) => {
    try {
      const body = await req.json();
      
      // Find suitable agent
      const suitableAgent = Array.from(agents.values()).find(agent => 
        agent.status === 'idle' && 
        agent.current_workload < agent.max_workload &&
        agent.capabilities.some(cap => 
          cap.trigger_words.some(trigger => 
            body.work_type.toLowerCase().includes(trigger.toLowerCase())
          )
        )
      );

      if (!suitableAgent) {
        return new Response(JSON.stringify({ 
          error: 'No suitable agent available for this work type',
          work_type: body.work_type,
          available_agents: Array.from(agents.values()).map(a => ({
            callsign: a.callsign,
            agent_type: a.agent_type,
            status: a.status,
            workload: `${a.current_workload}/${a.max_workload}`
          }))
        }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const assignment: Assignment = {
        id: randomUUID(),
        agent_id: suitableAgent.id,
        agent_callsign: suitableAgent.callsign,
        work_order_id: body.work_order_id,
        work_type: body.work_type,
        priority: body.priority || 'medium',
        assigned_at: new Date().toISOString(),
        status: 'assigned',
        progress_percent: 0,
        context: body.context,
      };

      assignments.set(assignment.id, assignment);

      // Update agent workload
      suitableAgent.current_workload++;
      suitableAgent.status = 'busy';
      suitableAgent.updated_at = new Date().toISOString();

      console.log(`Work assigned: ${body.work_order_id} to ${suitableAgent.callsign}`);

      return new Response(JSON.stringify({
        assignment,
        agent: {
          id: suitableAgent.id,
          callsign: suitableAgent.callsign,
          agent_type: suitableAgent.agent_type,
        },
        message: 'Work assigned successfully',
        timestamp: new Date().toISOString(),
      }), {
        status: 201,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      return new Response(JSON.stringify({ error: 'Failed to create assignment' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Get all assignments
  router.get('/api/v1/assignments', async (req: Request) => {
    try {
      const assignmentList = Array.from(assignments.values());
      
      // Filter by status if provided
      const url = new URL(req.url);
      const statusFilter = url.searchParams.get('status');
      const filteredAssignments = statusFilter 
        ? assignmentList.filter(a => a.status === statusFilter)
        : assignmentList;

      return new Response(JSON.stringify({
        assignments: filteredAssignments,
        count: filteredAssignments.length,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error getting assignments:', error);
      return new Response(JSON.stringify({ error: 'Failed to get assignments' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Agent coordination endpoint
  router.post('/api/v1/agents/coordinate', async (req: Request) => {
    try {
      const body = await req.json();
      
      // This would integrate with the coordination engine
      const coordinationId = randomUUID();
      
      console.log(`Coordination requested: ${body.coordination_type} by ${body.coordinator_agent}`);
      
      return new Response(JSON.stringify({
        coordination_id: coordinationId,
        coordinator_agent: body.coordinator_agent,
        participating_agents: body.participating_agents,
        coordination_type: body.coordination_type,
        status: 'initiated',
        started_at: new Date().toISOString(),
        message: 'Coordination session initiated',
        timestamp: new Date().toISOString(),
      }), {
        status: 201,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error initiating coordination:', error);
      return new Response(JSON.stringify({ error: 'Failed to initiate coordination' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Agent statistics
  router.get('/api/v1/agents/stats', async (req: Request) => {
    try {
      const agentList = Array.from(agents.values());
      const assignmentList = Array.from(assignments.values());
      
      const stats = {
        total_agents: agentList.length,
        agents_by_type: agentList.reduce((acc, agent) => {
          acc[agent.agent_type] = (acc[agent.agent_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        agents_by_status: agentList.reduce((acc, agent) => {
          acc[agent.status] = (acc[agent.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        total_assignments: assignmentList.length,
        assignments_by_status: assignmentList.reduce((acc, assignment) => {
          acc[assignment.status] = (acc[assignment.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        active_workload: agentList.reduce((sum, agent) => sum + agent.current_workload, 0),
        max_workload: agentList.reduce((sum, agent) => sum + agent.max_workload, 0),
        utilization_rate: agentList.length > 0 
          ? (agentList.reduce((sum, agent) => sum + agent.current_workload, 0) / 
             agentList.reduce((sum, agent) => sum + agent.max_workload, 0)) * 100
          : 0,
        timestamp: new Date().toISOString(),
      };

      return new Response(JSON.stringify(stats), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error getting agent stats:', error);
      return new Response(JSON.stringify({ error: 'Failed to get agent stats' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });
}