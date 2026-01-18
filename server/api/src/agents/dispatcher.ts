/**
 * Task Dispatcher Service
 * 
 * Intelligently assigns work orders to appropriate agents based on capabilities,
 * workload, and priority using ai-eng-system integration.
 * Using raw SQL to avoid Drizzle ORM type conflicts.
 */

import { randomUUID } from 'node:crypto';
import type { 
  AgentRegistry, 
  AgentAssignment, 
  AgentType, 
  WorkPriority,
  AssignmentConfig 
} from '@fleettools/events/types/agents.js';
import { agentAssignmentsTable } from '@fleettools/db/schema/agents.js';
import { createDatabaseClient, type DrizzleDB } from '@fleettools/db/client.js';

export class TaskDispatcherService {
  private static instance: TaskDispatcherService;
  private db: DrizzleDB;
  private assignmentConfig: AssignmentConfig = {
    algorithm: 'capability_match',
    capability_weight: 0.4,
    workload_weight: 0.3,
    priority_weight: 0.3,
    max_assignment_attempts: 3,
    assignment_timeout_ms: 30000,
  };

  private constructor() {
    this.db = createDatabaseClient();
  }

  static getInstance(): TaskDispatcherService {
    if (!TaskDispatcherService.instance) {
      TaskDispatcherService.instance = new TaskDispatcherService();
    }
    return TaskDispatcherService.instance;
  }

  /**
   * Set assignment configuration
   */
  setAssignmentConfig(config: Partial<AssignmentConfig>): void {
    this.assignmentConfig = { ...this.assignmentConfig, ...config };
  }

  /**
   * Assign work order to best-fit agent
   */
  async assignWorkOrder(
    workOrderId: string,
    workType: string,
    description: string,
    priority: WorkPriority = 'medium',
    preferredAgentType?: AgentType,
    context?: Record<string, any>
  ): Promise<AgentAssignment | null> {
    const availableAgents = await this.findBestAgents(
      workType,
      description,
      priority,
      preferredAgentType
    );

    if (availableAgents.length === 0) {
      console.warn(`No available agents found for work order ${workOrderId}`);
      return null;
    }

    const selectedAgent = availableAgents[0];
    const assignmentId = randomUUID();
    const now = new Date();

    const assignment: AgentAssignment = {
      id: assignmentId,
      agent_id: selectedAgent.id,
      agent_callsign: selectedAgent.callsign,
      work_order_id: workOrderId,
      work_type: workType,
      priority,
      assigned_at: now.toISOString(),
      status: 'assigned',
      context: context || {},
      progress_percent: 0,
    };

    // Store assignment in database using raw SQL
    const sqlite = (this.db as any).$client;
    const stmt = sqlite.prepare(`
      INSERT INTO agent_assignments (
        id, agent_id, agent_callsign, work_order_id, work_type, priority,
        assigned_at, status, context, progress_percent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      assignment.id,
      assignment.agent_id,
      assignment.agent_callsign,
      assignment.work_order_id,
      assignment.work_type,
      assignment.priority,
      Math.floor(new Date(assignment.assigned_at).getTime() / 1000),
      assignment.status,
      assignment.context ? JSON.stringify(assignment.context) : null,
      assignment.progress_percent
    );

    console.log(`Assigned work order ${workOrderId} to agent ${selectedAgent.callsign} (${selectedAgent.agent_type})`);
    return assignment;
  }

  /**
   * Find best agents for a specific work order
   */
  private async findBestAgents(
    workType: string,
    description: string,
    priority: WorkPriority,
    preferredAgentType?: AgentType
  ): Promise<AgentRegistry[]> {
    // This would integrate with actual agent registry service
    // For now, return a mock list to demonstrate the algorithm
    const mockAgents: AgentRegistry[] = [
      {
        id: randomUUID(),
        agent_type: 'full-stack-developer',
        callsign: 'FSD-001',
        status: 'idle',
        capabilities: [{
          id: 'feature-implementation',
          name: 'End-to-End Feature Implementation',
          description: 'Implement complete features from frontend to backend',
          trigger_words: ['implement', 'feature', 'build', 'develop'],
          max_concurrent_tasks: 2,
          estimated_duration_ms: 900000,
        }],
        current_workload: 0,
        max_workload: 2,
        last_heartbeat: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        agent_type: 'code-reviewer',
        callsign: 'CR-001',
        status: 'idle',
        capabilities: [{
          id: 'code-quality',
          name: 'Code Quality Review',
          description: 'Review code for quality, maintainability, and best practices',
          trigger_words: ['review', 'quality', 'audit', 'refactor'],
          max_concurrent_tasks: 4,
          estimated_duration_ms: 450000,
        }],
        current_workload: 1,
        max_workload: 4,
        last_heartbeat: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];

    // Filter agents that can handle work type
    const capableAgents = mockAgents.filter(agent => 
      agent.status === 'idle' && 
      agent.current_workload < agent.max_workload &&
      this.canHandleWork(agent, workType, description)
    );

    // Score agents based on configuration
    const scoredAgents = capableAgents.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, workType, description, priority)
    }));

    // Sort by score (descending) and return agent objects
    return scoredAgents
      .sort((a, b) => b.score - a.score)
      .map(item => item.agent);
  }

  /**
   * Check if agent can handle specific work
   */
  private canHandleWork(agent: AgentRegistry, workType: string, description: string): boolean {
    const keywords = this.extractKeywords(workType + ' ' + description);
    
    return agent.capabilities.some(capability =>
      capability.trigger_words.some(trigger => 
        keywords.some(keyword => keyword.toLowerCase().includes(trigger.toLowerCase()))
      )
    );
  }

  /**
   * Calculate agent fitness score
   */
  private calculateAgentScore(
    agent: AgentRegistry, 
    workType: string, 
    description: string, 
    priority: WorkPriority
  ): number {
    const config = this.assignmentConfig;
    
    // Capability match score
    const capabilityScore = this.calculateCapabilityScore(agent, workType, description);
    
    // Workload score (lower workload = higher score)
    const workloadScore = 1 - (agent.current_workload / agent.max_workload);
    
    // Priority score (higher priority agents get preference)
    const priorityScore = this.getPriorityScore(priority);
    
    // Weighted combination
    return (capabilityScore * config.capability_weight) +
           (workloadScore * config.workload_weight) +
           (priorityScore * config.priority_weight);
  }

  /**
   * Calculate how well agent capabilities match work
   */
  private calculateCapabilityScore(agent: AgentRegistry, workType: string, description: string): number {
    const keywords = this.extractKeywords(workType + ' ' + description);
    let bestScore = 0;
    
    for (const capability of agent.capabilities) {
      let matchScore = 0;
      for (const trigger of capability.trigger_words) {
        for (const keyword of keywords) {
          if (keyword.toLowerCase().includes(trigger.toLowerCase())) {
            matchScore = Math.max(matchScore, 1);
          }
        }
      }
      bestScore = Math.max(bestScore, matchScore);
    }
    
    return bestScore;
  }

  /**
   * Get priority multiplier
   */
  private getPriorityScore(priority: WorkPriority): number {
    switch (priority) {
      case 'emergency': return 1.0;
      case 'critical': return 0.9;
      case 'high': return 0.8;
      case 'medium': return 0.6;
      case 'low': return 0.4;
      default: return 0.5;
    }
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    return text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'for', 'with', 'are', 'was', 'will', 'been'].includes(word));
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(
    assignmentId: string, 
    status: AgentAssignment['status'],
    progressPercent?: number,
    errorDetails?: { message: string; retry_count: number }
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const sqlite = (this.db as any).$client;
    
    let setClause = 'status = ?, updated_at = ?';
    const params: any[] = [status, now];

    if (status === 'in_progress') {
      setClause += ', started_at = ?';
      params.push(now);
    } else if (status === 'completed' || status === 'failed') {
      setClause += ', completed_at = ?';
      params.push(now);
    }

    if (progressPercent !== undefined) {
      setClause += ', progress_percent = ?';
      params.push(progressPercent);
    }

    if (errorDetails) {
      setClause += ', error_details = ?';
      params.push(JSON.stringify(errorDetails));
    }

    const stmt = sqlite.prepare(`UPDATE agent_assignments SET ${setClause} WHERE id = ?`);
    params.push(assignmentId);
    stmt.run(...params);
  }

  /**
   * Get assignment by ID
   */
  async getAssignment(assignmentId: string): Promise<AgentAssignment | null> {
    const sqlite = (this.db as any).$client;
    const stmt = sqlite.prepare('SELECT * FROM agent_assignments WHERE id = ? LIMIT 1');
    const row = stmt.get(assignmentId);

    if (!row) return null;

    return {
      id: row.id,
      agent_id: row.agent_id,
      agent_callsign: row.agent_callsign,
      work_order_id: row.work_order_id,
      work_type: row.work_type,
      priority: row.priority as WorkPriority,
      assigned_at: new Date(row.assigned_at * 1000).toISOString(),
      status: row.status as any,
      started_at: row.started_at ? new Date(row.started_at * 1000).toISOString() : undefined,
      completed_at: row.completed_at ? new Date(row.completed_at * 1000).toISOString() : undefined,
      progress_percent: row.progress_percent,
      context: row.context ? JSON.parse(row.context) : undefined,
      error_details: row.error_details ? JSON.parse(row.error_details) : undefined,
    };
  }

  /**
   * Get assignments for agent
   */
  async getAgentAssignments(agentId: string): Promise<AgentAssignment[]> {
    const sqlite = (this.db as any).$client;
    const stmt = sqlite.prepare('SELECT * FROM agent_assignments WHERE agent_id = ? ORDER BY assigned_at DESC');
    const rows = stmt.all(agentId) as any[];

    return rows.map(row => ({
      id: row.id,
      agent_id: row.agent_id,
      agent_callsign: row.agent_callsign,
      work_order_id: row.work_order_id,
      work_type: row.work_type,
      priority: row.priority as WorkPriority,
      assigned_at: new Date(row.assigned_at * 1000).toISOString(),
      status: row.status as any,
      started_at: row.started_at ? new Date(row.started_at * 1000).toISOString() : undefined,
      completed_at: row.completed_at ? new Date(row.completed_at * 1000).toISOString() : undefined,
      progress_percent: row.progress_percent,
      context: row.context ? JSON.parse(row.context) : undefined,
      error_details: row.error_details ? JSON.parse(row.error_details) : undefined,
    }));
  }

  /**
   * Get all active assignments
   */
  async getActiveAssignments(): Promise<AgentAssignment[]> {
    const activeStatuses = ['assigned', 'accepted', 'in_progress'];
    const sqlite = (this.db as any).$client;
    
    // Create placeholders for IN clause
    const placeholders = activeStatuses.map(() => '?').join(',');
    const stmt = sqlite.prepare(`
      SELECT * FROM agent_assignments 
      WHERE status IN (${placeholders}) 
      ORDER BY assigned_at DESC
    `);
    
    const rows = stmt.all(...activeStatuses) as any[];

    return rows.map(row => ({
      id: row.id,
      agent_id: row.agent_id,
      agent_callsign: row.agent_callsign,
      work_order_id: row.work_order_id,
      work_type: row.work_type,
      priority: row.priority as WorkPriority,
      assigned_at: new Date(row.assigned_at * 1000).toISOString(),
      status: row.status as any,
      started_at: row.started_at ? new Date(row.started_at * 1000).toISOString() : undefined,
      completed_at: row.completed_at ? new Date(row.completed_at * 1000).toISOString() : undefined,
      progress_percent: row.progress_percent,
      context: row.context ? JSON.parse(row.context) : undefined,
      error_details: row.error_details ? JSON.parse(row.error_details) : undefined,
    }));
  }

  /**
   * Cancel assignment
   */
  async cancelAssignment(assignmentId: string, reason: string): Promise<void> {
    await this.updateAssignmentStatus(assignmentId, 'cancelled', undefined, {
      message: reason,
      retry_count: 0,
    });
  }
}