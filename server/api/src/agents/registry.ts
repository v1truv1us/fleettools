/**
 * Agent Registry Service
 * 
 * Manages agent registration, capabilities, and availability for ai-eng-system integration.
 * Using raw SQL to avoid Drizzle ORM type conflicts.
 */

import { randomUUID } from 'node:crypto';
import type { AgentRegistry, AgentCapability, AgentType, AgentHealth } from '@fleettools/events/types/agents.js';
import { agentsTable, agentHealthTable } from '@fleettools/db/schema/agents.js';
import { createDatabaseClient, type DrizzleDB } from '@fleettools/db/client.js';

export class AgentRegistryService {
  private static instance: AgentRegistryService;
  private db: DrizzleDB;
  private agentCapabilities: Map<AgentType, AgentCapability[]> = new Map();

  private constructor() {
    this.db = createDatabaseClient();
    this.initializeAgentCapabilities();
  }

  static getInstance(): AgentRegistryService {
    if (!AgentRegistryService.instance) {
      AgentRegistryService.instance = new AgentRegistryService();
    }
    return AgentRegistryService.instance;
  }

  /**
   * Initialize agent capabilities from ai-eng-system integration
   */
  private initializeAgentCapabilities(): void {
    const capabilities: Record<AgentType, AgentCapability[]> = {
      'architect-advisor': [
        {
          id: 'system-design',
          name: 'System Architecture Design',
          description: 'Design scalable system architectures',
          trigger_words: ['design', 'architecture', 'structure', 'scalability'],
          max_concurrent_tasks: 2,
          estimated_duration_ms: 600000, // 10 minutes
          resource_requirements: { memory_mb: 512, cpu_units: 2 }
        },
        {
          id: 'tech-stack-selection',
          name: 'Technology Stack Selection',
          description: 'Select appropriate technologies for projects',
          trigger_words: ['technology', 'stack', 'framework', 'selection'],
          max_concurrent_tasks: 1,
          estimated_duration_ms: 300000, // 5 minutes
        }
      ],
      'backend-architect': [
        {
          id: 'api-design',
          name: 'API Design & Architecture',
          description: 'Design REST/GraphQL APIs and backend services',
          trigger_words: ['api', 'backend', 'service', 'endpoint'],
          max_concurrent_tasks: 3,
          estimated_duration_ms: 450000, // 7.5 minutes
          resource_requirements: { memory_mb: 256, cpu_units: 1 }
        }
      ],
      'infrastructure-builder': [
        {
          id: 'cloud-setup',
          name: 'Cloud Infrastructure Setup',
          description: 'Set up cloud infrastructure and deployment pipelines',
          trigger_words: ['infra', 'cloud', 'deployment', 'ci/cd'],
          max_concurrent_tasks: 1,
          estimated_duration_ms: 1200000, // 20 minutes
          resource_requirements: { memory_mb: 1024, cpu_units: 4 }
        }
      ],
      'full-stack-developer': [
        {
          id: 'feature-implementation',
          name: 'End-to-End Feature Implementation',
          description: 'Implement complete features from frontend to backend',
          trigger_words: ['implement', 'feature', 'build', 'develop'],
          max_concurrent_tasks: 2,
          estimated_duration_ms: 900000, // 15 minutes
          resource_requirements: { memory_mb: 768, cpu_units: 2 }
        }
      ],
      'frontend-reviewer': [
        {
          id: 'ui-review',
          name: 'Frontend Code Review',
          description: 'Review frontend code for quality and best practices',
          trigger_words: ['frontend', 'react', 'vue', 'ui', 'review'],
          max_concurrent_tasks: 3,
          estimated_duration_ms: 300000, // 5 minutes
        }
      ],
      'api-builder-advanced': [
        {
          id: 'api-development',
          name: 'Advanced API Development',
          description: 'Build complex APIs and data models',
          trigger_words: ['api', 'endpoint', 'graphql', 'rest'],
          max_concurrent_tasks: 2,
          estimated_duration_ms: 600000, // 10 minutes
        }
      ],
      'code-reviewer': [
        {
          id: 'code-quality',
          name: 'Code Quality Review',
          description: 'Review code for quality, maintainability, and best practices',
          trigger_words: ['review', 'quality', 'audit', 'refactor'],
          max_concurrent_tasks: 4,
          estimated_duration_ms: 450000, // 7.5 minutes
        }
      ],
      'test-generator': [
        {
          id: 'test-creation',
          name: 'Test Suite Generation',
          description: 'Generate comprehensive test suites',
          trigger_words: ['test', 'spec', 'verify', 'coverage'],
          max_concurrent_tasks: 3,
          estimated_duration_ms: 600000, // 10 minutes
        }
      ],
      'security-scanner': [
        {
          id: 'security-analysis',
          name: 'Security Vulnerability Analysis',
          description: 'Analyze code for security vulnerabilities',
          trigger_words: ['security', 'vulnerability', 'auth', 'encryption'],
          max_concurrent_tasks: 2,
          estimated_duration_ms: 900000, // 15 minutes
          resource_requirements: { memory_mb: 512, cpu_units: 3 }
        }
      ],
      'deployment-engineer': [
        {
          id: 'deployment-setup',
          name: 'Deployment Pipeline Setup',
          description: 'Set up CI/CD pipelines and deployment processes',
          trigger_words: ['deploy', 'ci/cd', 'pipeline', 'release'],
          max_concurrent_tasks: 1,
          estimated_duration_ms: 900000, // 15 minutes
        }
      ],
      'monitoring-expert': [
        {
          id: 'monitoring-setup',
          name: 'System Monitoring Setup',
          description: 'Set up monitoring, logging, and alerting',
          trigger_words: ['monitoring', 'metrics', 'alerting', 'logging'],
          max_concurrent_tasks: 2,
          estimated_duration_ms: 600000, // 10 minutes
        }
      ],
      'accessibility-pro': [
        {
          id: 'accessibility-review',
          name: 'Accessibility Compliance',
          description: 'Ensure code meets accessibility standards',
          trigger_words: ['accessibility', 'a11y', 'wcag', 'screen-reader'],
          max_concurrent_tasks: 2,
          estimated_duration_ms: 450000, // 7.5 minutes
        }
      ],
      'ux-optimizer': [
        {
          id: 'ux-improvement',
          name: 'User Experience Optimization',
          description: 'Optimize user experience and interaction design',
          trigger_words: ['ux', 'user-experience', 'interaction', 'usability'],
          max_concurrent_tasks: 1,
          estimated_duration_ms: 600000, // 10 minutes
        }
      ],
      'compliance-expert': [
        {
          id: 'compliance-check',
          name: 'Regulatory Compliance Review',
          description: 'Ensure compliance with regulations and standards',
          trigger_words: ['compliance', 'regulation', 'gdpr', 'security'],
          max_concurrent_tasks: 1,
          estimated_duration_ms: 750000, // 12.5 minutes
        }
      ],
      'performance-engineer': [
        {
          id: 'performance-optimization',
          name: 'Performance Optimization',
          description: 'Optimize application performance and bottlenecks',
          trigger_words: ['performance', 'optimization', 'speed', 'bottleneck'],
          max_concurrent_tasks: 2,
          estimated_duration_ms: 900000, // 15 minutes
          resource_requirements: { memory_mb: 1024, cpu_units: 4 }
        }
      ],
      'database-expert': [
        {
          id: 'database-optimization',
          name: 'Database Design & Optimization',
          description: 'Design and optimize database schemas and queries',
          trigger_words: ['database', 'query', 'schema', 'optimization'],
          max_concurrent_tasks: 2,
          estimated_duration_ms: 750000, // 12.5 minutes
          resource_requirements: { memory_mb: 512, cpu_units: 2 }
        }
      ]
    };

    this.agentCapabilities = new Map(Object.entries(capabilities) as [AgentType, AgentCapability[]][]);
  }

  /**
   * Register a new agent
   */
  async registerAgent(agentData: Omit<AgentRegistry, 'id' | 'created_at' | 'updated_at'>): Promise<AgentRegistry> {
    const now = Math.floor(Date.now() / 1000);
    const agent: AgentRegistry = {
      id: randomUUID(),
      ...agentData,
      created_at: new Date(now * 1000).toISOString(),
      updated_at: new Date(now * 1000).toISOString(),
    };

    // Use raw SQL to avoid type conflicts
    const sqlite = (this.db as any).$client;
    const stmt = sqlite.prepare(`
      INSERT INTO agents (
        id, agent_type, callsign, status, capabilities, current_workload, max_workload,
        last_heartbeat, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      agent.id,
      agent.agent_type,
      agent.callsign,
      agent.status,
      JSON.stringify(agent.capabilities),
      agent.current_workload,
      agent.max_workload,
      Math.floor(new Date(agent.last_heartbeat).getTime() / 1000),
      agent.metadata ? JSON.stringify(agent.metadata) : null,
      Math.floor(new Date(agent.created_at).getTime() / 1000),
      Math.floor(new Date(agent.updated_at).getTime() / 1000)
    );

    // Initialize health record
    await this.initializeAgentHealth(agent.id, agent.callsign);

    return agent;
  }

  /**
   * Get agent by ID
   */
  async getAgent(id: string): Promise<AgentRegistry | null> {
    const sqlite = (this.db as any).$client;
    const stmt = sqlite.prepare('SELECT * FROM agents WHERE id = ? LIMIT 1');
    const row = stmt.get(id);
    
    if (!row) return null;
    
    return {
      id: row.id,
      agent_type: row.agent_type as AgentType,
      callsign: row.callsign,
      status: row.status as any,
      capabilities: row.capabilities ? JSON.parse(row.capabilities) : [],
      current_workload: row.current_workload,
      max_workload: row.max_workload,
      last_heartbeat: new Date((row.last_heartbeat || 0) * 1000).toISOString(),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: new Date(row.created_at * 1000).toISOString(),
      updated_at: new Date(row.updated_at * 1000).toISOString(),
    };
  }

  /**
   * Get agent by callsign
   */
  async getAgentByCallsign(callsign: string): Promise<AgentRegistry | null> {
    const sqlite = (this.db as any).$client;
    const stmt = sqlite.prepare('SELECT * FROM agents WHERE callsign = ? LIMIT 1');
    const row = stmt.get(callsign);
    
    if (!row) return null;
    
    return {
      id: row.id,
      agent_type: row.agent_type as AgentType,
      callsign: row.callsign,
      status: row.status as any,
      capabilities: row.capabilities ? JSON.parse(row.capabilities) : [],
      current_workload: row.current_workload,
      max_workload: row.max_workload,
      last_heartbeat: new Date((row.last_heartbeat || 0) * 1000).toISOString(),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: new Date(row.created_at * 1000).toISOString(),
      updated_at: new Date(row.updated_at * 1000).toISOString(),
    };
  }

  /**
   * Get all agents
   */
  async getAllAgents(): Promise<AgentRegistry[]> {
    const sqlite = (this.db as any).$client;
    const stmt = sqlite.prepare('SELECT * FROM agents ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      agent_type: row.agent_type as AgentType,
      callsign: row.callsign,
      status: row.status as any,
      capabilities: row.capabilities ? JSON.parse(row.capabilities) : [],
      current_workload: row.current_workload,
      max_workload: row.max_workload,
      last_heartbeat: new Date((row.last_heartbeat || 0) * 1000).toISOString(),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: new Date(row.created_at * 1000).toISOString(),
      updated_at: new Date(row.updated_at * 1000).toISOString(),
    }));
  }

  /**
   * Get agents by type
   */
  async getAgentsByType(agentType: AgentType): Promise<AgentRegistry[]> {
    const sqlite = (this.db as any).$client;
    const stmt = sqlite.prepare('SELECT * FROM agents WHERE agent_type = ? ORDER BY created_at DESC');
    const rows = stmt.all(agentType) as any[];
    
    return rows.map(row => ({
      id: row.id,
      agent_type: row.agent_type as AgentType,
      callsign: row.callsign,
      status: row.status as any,
      capabilities: row.capabilities ? JSON.parse(row.capabilities) : [],
      current_workload: row.current_workload,
      max_workload: row.max_workload,
      last_heartbeat: new Date((row.last_heartbeat || 0) * 1000).toISOString(),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: new Date(row.created_at * 1000).toISOString(),
      updated_at: new Date(row.updated_at * 1000).toISOString(),
    }));
  }

  /**
   * Get available agents for assignment
   */
  async getAvailableAgents(agentType?: AgentType): Promise<AgentRegistry[]> {
    const sqlite = (this.db as any).$client;
    let stmt: any;
    
    if (agentType) {
      stmt = sqlite.prepare(`
        SELECT * FROM agents 
        WHERE status = 'idle' AND current_workload < max_workload AND agent_type = ?
        ORDER BY created_at DESC
      `);
    } else {
      stmt = sqlite.prepare(`
        SELECT * FROM agents 
        WHERE status = 'idle' AND current_workload < max_workload
        ORDER BY created_at DESC
      `);
    }
    
    const rows = stmt.all(agentType || null) as any[];
    
    return rows.map(row => ({
      id: row.id,
      agent_type: row.agent_type as AgentType,
      callsign: row.callsign,
      status: row.status as any,
      capabilities: row.capabilities ? JSON.parse(row.capabilities) : [],
      current_workload: row.current_workload,
      max_workload: row.max_workload,
      last_heartbeat: new Date((row.last_heartbeat || 0) * 1000).toISOString(),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: new Date(row.created_at * 1000).toISOString(),
      updated_at: new Date(row.updated_at * 1000).toISOString(),
    }));
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(id: string, status: AgentRegistry['status']): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const sqlite = (this.db as any).$client;
    const stmt = sqlite.prepare(`
      UPDATE agents 
      SET status = ?, updated_at = ?, last_heartbeat = ?
      WHERE id = ?
    `);
    stmt.run(status, now, now, id);
  }

  /**
   * Update agent workload
   */
  async updateAgentWorkload(id: string, workload: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const sqlite = (this.db as any).$client;
    const stmt = sqlite.prepare(`
      UPDATE agents 
      SET current_workload = ?, updated_at = ?, last_heartbeat = ?
      WHERE id = ?
    `);
    stmt.run(workload, now, now, id);
  }

  /**
   * Update agent heartbeat
   */
  async updateAgentHeartbeat(id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const sqlite = (this.db as any).$client;
    const stmt = sqlite.prepare(`
      UPDATE agents 
      SET last_heartbeat = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, now, id);
  }

  /**
   * Get capabilities for agent type
   */
  getAgentCapabilities(agentType: AgentType): AgentCapability[] {
    return this.agentCapabilities.get(agentType) || [];
  }

  /**
   * Find agents by capability
   */
  async findAgentsByCapability(triggerWord: string): Promise<AgentRegistry[]> {
    const allAgents = await this.getAllAgents();
    const matchingAgents: AgentRegistry[] = [];

    for (const agent of allAgents) {
      for (const capability of agent.capabilities) {
        if (capability.trigger_words.includes(triggerWord.toLowerCase())) {
          matchingAgents.push(agent);
          break;
        }
      }
    }

    return matchingAgents;
  }

  /**
   * Remove agent (deregister)
   */
  async removeAgent(id: string): Promise<void> {
    const sqlite = (this.db as any).$client;
    const stmt = sqlite.prepare('DELETE FROM agents WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Initialize agent health record
   */
  private async initializeAgentHealth(agentId: string, callsign: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const sqlite = (this.db as any).$client;
    const stmt = sqlite.prepare(`
      INSERT INTO agent_health (
        id, agent_id, status, last_check, heartbeat_ok, memory_usage_ok, cpu_usage_ok,
        communication_ok, task_processing_ok, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      randomUUID(),
      agentId,
      'offline',
      now,
      false,
      true,
      true,
      true,
      true,
      now,
      now
    );
  }

  /**
   * Get stale agents (missed heartbeats)
   */
  async getStaleAgents(timeoutMs: number = 180000): Promise<AgentRegistry[]> {
    const staleTime = Math.floor((Date.now() - timeoutMs) / 1000);
    const sqlite = (this.db as any).$client;
    const stmt = sqlite.prepare('SELECT * FROM agents WHERE last_heartbeat < ? ORDER BY last_heartbeat DESC');
    const rows = stmt.all(staleTime) as any[];

    return rows.map(row => ({
      id: row.id,
      agent_type: row.agent_type as AgentType,
      callsign: row.callsign,
      status: row.status as any,
      capabilities: row.capabilities ? JSON.parse(row.capabilities) : [],
      current_workload: row.current_workload,
      max_workload: row.max_workload,
      last_heartbeat: new Date((row.last_heartbeat || 0) * 1000).toISOString(),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: new Date(row.created_at * 1000).toISOString(),
      updated_at: new Date(row.updated_at * 1000).toISOString(),
    }));
  }
}