/**
 * FleetTools Agent Coordination System
 * 
 * Comprehensive agent coordination layer that transforms FleetTools from
 * passive coordination to active multi-agent platform with ai-eng-system integration.
 */

import { z } from 'zod';
import { BaseEventSchema } from '../../../../packages/events/src/types/base.js';

/**
 * Agent Types from ai-eng-system integration
 */
export const AgentTypeSchema = z.enum([
  'architect-advisor',
  'backend-architect', 
  'infrastructure-builder',
  'full-stack-developer',
  'frontend-reviewer',
  'api-builder-advanced',
  'code-reviewer',
  'test-generator',
  'security-scanner',
  'deployment-engineer',
  'monitoring-expert',
  'accessibility-pro',
  'ux-optimizer',
  'compliance-expert',
  'performance-engineer',
  'database-expert'
]);

export type AgentType = z.infer<typeof AgentTypeSchema>;

/**
 * Agent Capability Definition
 */
export const AgentCapabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  trigger_words: z.array(z.string()),
  max_concurrent_tasks: z.number().int().positive().default(1),
  estimated_duration_ms: z.number().int().positive().optional(),
  dependencies: z.array(z.string()).optional(),
  resource_requirements: z.object({
    memory_mb: z.number().int().positive().optional(),
    cpu_units: z.number().int().positive().optional(),
    special_permissions: z.array(z.string()).optional(),
  }).optional(),
});

/**
 * Agent Registry Entry
 */
export const AgentRegistrySchema = z.object({
  id: z.string().uuid(),
  agent_type: AgentTypeSchema,
  callsign: z.string(),
  status: z.enum(['idle', 'busy', 'offline', 'error']),
  capabilities: z.array(AgentCapabilitySchema),
  current_workload: z.number().int().min(0).default(0),
  max_workload: z.number().int().positive().default(1),
  last_heartbeat: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Work Assignment Priority
 */
export const WorkPrioritySchema = z.enum(['low', 'medium', 'high', 'critical', 'emergency']);

/**
 * Task Assignment Algorithm Configuration
 */
export const AssignmentConfigSchema = z.object({
  algorithm: z.enum(['round_robin', 'capability_match', 'workload_balance', 'priority_first']).default('capability_match'),
  capability_weight: z.number().min(0).max(1).default(0.4),
  workload_weight: z.number().min(0).max(1).default(0.3),
  priority_weight: z.number().min(0).max(1).default(0.3),
  max_assignment_attempts: z.number().int().positive().default(3),
  assignment_timeout_ms: z.number().int().positive().default(30000),
});

/**
 * Agent Work Assignment
 */
export const AgentAssignmentSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  agent_callsign: z.string(),
  work_order_id: z.string(),
  work_type: z.string(),
  priority: WorkPrioritySchema,
  assigned_at: z.string().datetime(),
  status: z.enum(['assigned', 'accepted', 'in_progress', 'completed', 'failed', 'cancelled']),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  estimated_completion: z.string().datetime().optional(),
  progress_percent: z.number().int().min(0).max(100).default(0),
  context: z.record(z.unknown()).optional(),
  error_details: z.object({
    message: z.string(),
    retry_count: z.number().int().min(0).default(0),
    last_retry_at: z.string().datetime().optional(),
  }).optional(),
});

/**
 * Agent Communication Message Types
 */
export const AgentMessageTypeSchema = z.enum([
  'task_assignment',
  'task_acceptance',
  'task_progress',
  'task_completion',
  'task_failure',
  'coordination_request',
  'coordination_response',
  'resource_request',
  'resource_release',
  'handoff_request',
  'handoff_acceptance',
  'status_update',
  'error_report'
]);

/**
 * Inter-Agent Communication
 */
export const AgentMessageSchema = BaseEventSchema.extend({
  type: z.literal('agent_message'),
  data: z.object({
    message_id: z.string().uuid(),
    from_agent: z.string(),
    to_agent: z.string().optional(), // undefined for broadcast
    message_type: AgentMessageTypeSchema,
    subject: z.string(),
    content: z.record(z.unknown()),
    priority: WorkPrioritySchema.default('medium'),
    correlation_id: z.string().uuid().optional(),
    requires_response: z.boolean().default(false),
    response_timeout_ms: z.number().int().positive().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Agent Lifecycle Events
 */
export const AgentSpawnedSchema = BaseEventSchema.extend({
  type: z.literal('agent_spawned'),
  data: z.object({
    agent_id: z.string().uuid(),
    agent_type: AgentTypeSchema,
    callsign: z.string(),
    spawned_by: z.string(),
    config: z.record(z.unknown()).optional(),
    capabilities: z.array(AgentCapabilitySchema),
  }),
});

export const AgentTerminatedSchema = BaseEventSchema.extend({
  type: z.literal('agent_terminated'),
  data: z.object({
    agent_id: z.string().uuid(),
    callsign: z.string(),
    terminated_by: z.string(),
    reason: z.enum(['completed', 'error', 'timeout', 'manual', 'resource_limit', 'escalation']),
    exit_code: z.number().optional(),
    final_state: z.record(z.unknown()).optional(),
    active_assignments: z.array(z.string().uuid()).optional(),
  }),
});

/**
 * Agent Coordination Events
 */
export const AgentCoordinationSchema = BaseEventSchema.extend({
  type: z.literal('agent_coordination'),
  data: z.object({
    coordination_id: z.string().uuid(),
    coordinator_agent: z.string(),
    participating_agents: z.array(z.string()),
    coordination_type: z.enum(['sequential', 'parallel', 'hierarchical', 'peer_review']),
    context: z.record(z.unknown()),
    status: z.enum(['initiated', 'in_progress', 'completed', 'failed']),
    started_at: z.string().datetime(),
    completed_at: z.string().datetime().optional(),
  }),
});

/**
 * File Coordination for Agent Handoffs
 */
export const AgentFileHandoffSchema = BaseEventSchema.extend({
  type: z.literal('agent_file_handoff'),
  data: z.object({
    handoff_id: z.string().uuid(),
    file_path: z.string(),
    from_agent: z.string(),
    to_agent: z.string(),
    handoff_type: z.enum(['edit_continuation', 'review', 'testing', 'deployment']),
    context: z.record(z.unknown()).optional(),
    ctk_lock_id: z.string().optional(),
    handoff_status: z.enum(['requested', 'accepted', 'in_progress', 'completed', 'failed']),
    requested_at: z.string().datetime(),
    completed_at: z.string().datetime().optional(),
  }),
});

/**
 * Agent Performance Metrics
 */
export const AgentMetricsSchema = z.object({
  agent_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  metrics: z.object({
    tasks_completed: z.number().int().min(0),
    tasks_failed: z.number().int().min(0),
    average_task_duration_ms: z.number().int().min(0),
    success_rate: z.number().min(0).max(1),
    current_workload: z.number().int().min(0),
    resource_usage: z.object({
      memory_mb: z.number().int().min(0),
      cpu_percent: z.number().min(0).max(100),
      active_connections: z.number().int().min(0),
    }),
    communication_metrics: z.object({
      messages_sent: z.number().int().min(0),
      messages_received: z.number().int().min(0),
      average_response_time_ms: z.number().int().min(0),
    }),
  }),
});

/**
 * Agent Task Dependencies
 */
export const TaskDependencySchema = z.object({
  dependency_id: z.string().uuid(),
  task_id: z.string(),
  depends_on_task: z.string(),
  dependency_type: z.enum(['completion', 'success', 'data', 'resource']),
  required_agent: z.string().optional(),
});

/**
 * Agent Health Status
 */
export const AgentHealthSchema = z.object({
  agent_id: z.string().uuid(),
  status: z.enum(['healthy', 'degraded', 'unhealthy', 'offline']),
  last_check: z.string().datetime(),
  checks: z.object({
    heartbeat: z.boolean(),
    memory_usage: z.boolean(),
    cpu_usage: z.boolean(),
    communication: z.boolean(),
    task_processing: z.boolean(),
  }),
  issues: z.array(z.object({
    type: z.string(),
    severity: z.enum(['info', 'warning', 'error', 'critical']),
    message: z.string(),
    detected_at: z.string().datetime(),
  })).optional(),
});

/**
 * Type Exports
 */
export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;
export type AgentRegistry = z.infer<typeof AgentRegistrySchema>;
export type AgentAssignment = z.infer<typeof AgentAssignmentSchema>;
export type AgentMessage = z.infer<typeof AgentMessageSchema>;
export type WorkPriority = z.infer<typeof WorkPrioritySchema>;
export type AssignmentConfig = z.infer<typeof AssignmentConfigSchema>;
export type AgentSpawnedEvent = z.infer<typeof AgentSpawnedSchema>;
export type AgentTerminatedEvent = z.infer<typeof AgentTerminatedSchema>;
export type AgentCoordinationEvent = z.infer<typeof AgentCoordinationSchema>;
export type AgentFileHandoffEvent = z.infer<typeof AgentFileHandoffSchema>;
export type AgentMetrics = z.infer<typeof AgentMetricsSchema>;
export type TaskDependency = z.infer<typeof TaskDependencySchema>;
export type AgentHealth = z.infer<typeof AgentHealthSchema>;

/**
 * Agent Coordination System Configuration
 */
export const AgentCoordinationConfigSchema = z.object({
  max_concurrent_agents: z.number().int().positive().default(50),
  default_assignment_timeout_ms: z.number().int().positive().default(300000), // 5 minutes
  heartbeat_interval_ms: z.number().int().positive().default(30000), // 30 seconds
  agent_timeout_ms: z.number().int().positive().default(180000), // 3 minutes
  task_retry_limit: z.number().int().min(0).default(3),
  escalation_threshold: z.number().int().positive().default(3),
  communication_timeout_ms: z.number().int().positive().default(60000), // 1 minute
  enable_auto_scaling: z.boolean().default(true),
  enable_load_balancing: z.boolean().default(true),
  enable_priority_routing: z.boolean().default(true),
});

export type AgentCoordinationConfig = z.infer<typeof AgentCoordinationConfigSchema>;