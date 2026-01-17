/**
 * FleetTools Agent Database Schema
 * 
 * Database schema for agent coordination system with ai-eng-system integration.
 */

import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Agent Registry - Tracks all available agents and their capabilities
 */
export const agentsTable = sqliteTable(
  'agents',
  {
    id: text('id').primaryKey(),
    agent_type: text('agent_type').notNull(),
    callsign: text('callsign').notNull().unique(),
    status: text('status').notNull().default('offline'),
    capabilities: text('capabilities'), // JSON array of capabilities
    current_workload: integer('current_workload').notNull().default(0),
    max_workload: integer('max_workload').notNull().default(1),
    last_heartbeat: integer('last_heartbeat'),
    metadata: text('metadata'), // JSON object
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    typeIdx: index('idx_agents_type').on(table.agent_type),
    statusIdx: index('idx_agents_status').on(table.status),
    callsignIdx: index('idx_agents_callsign').on(table.callsign),
    workloadIdx: index('idx_agents_workload').on(table.current_workload),
  })
);

/**
 * Agent Work Assignments - Tracks task assignments to agents
 */
export const agentAssignmentsTable = sqliteTable(
  'agent_assignments',
  {
    id: text('id').primaryKey(),
    agent_id: text('agent_id').notNull(),
    agent_callsign: text('agent_callsign').notNull(),
    work_order_id: text('work_order_id').notNull(),
    work_type: text('work_type').notNull(),
    priority: text('priority').notNull().default('medium'),
    assigned_at: integer('assigned_at').notNull(),
    status: text('status').notNull().default('assigned'),
    started_at: integer('started_at'),
    completed_at: integer('completed_at'),
    estimated_completion: integer('estimated_completion'),
    progress_percent: integer('progress_percent').notNull().default(0),
    context: text('context'), // JSON object
    error_details: text('error_details'), // JSON object
  },
  (table) => ({
    agentIdx: index('idx_agent_assignments_agent').on(table.agent_id),
    workOrderIdx: index('idx_agent_assignments_work_order').on(table.work_order_id),
    statusIdx: index('idx_agent_assignments_status').on(table.status),
    priorityIdx: index('idx_agent_assignments_priority').on(table.priority),
    agentCallsignIdx: index('idx_agent_assignments_callsign').on(table.agent_callsign),
  })
);

/**
 * Agent Messages - Inter-agent communication
 */
export const agentMessagesTable = sqliteTable(
  'agent_messages',
  {
    id: text('id').primaryKey(),
    message_id: text('message_id').notNull().unique(),
    from_agent: text('from_agent').notNull(),
    to_agent: text('to_agent'), // null for broadcast
    message_type: text('message_type').notNull(),
    subject: text('subject').notNull(),
    content: text('content').notNull(), // JSON object
    priority: text('priority').notNull().default('medium'),
    correlation_id: text('correlation_id'),
    requires_response: integer('requires_response', { mode: 'boolean' }).notNull().default(false),
    response_timeout_ms: integer('response_timeout_ms'),
    responded_at: integer('responded_at'),
    metadata: text('metadata'), // JSON object
    created_at: integer('created_at').notNull(),
  },
  (table) => ({
    fromAgentIdx: index('idx_agent_messages_from').on(table.from_agent),
    toAgentIdx: index('idx_agent_messages_to').on(table.to_agent),
    messageTypeIdx: index('idx_agent_messages_type').on(table.message_type),
    correlationIdx: index('idx_agent_messages_correlation').on(table.correlation_id),
    priorityIdx: index('idx_agent_messages_priority').on(table.priority),
  })
);

/**
 * Agent Health Monitoring - Tracks agent health status
 */
export const agentHealthTable = sqliteTable(
  'agent_health',
  {
    id: text('id').primaryKey(),
    agent_id: text('agent_id').notNull().unique(),
    status: text('status').notNull().default('offline'),
    last_check: integer('last_check').notNull(),
    heartbeat_ok: integer('heartbeat_ok', { mode: 'boolean' }).notNull().default(false),
    memory_usage_ok: integer('memory_usage_ok', { mode: 'boolean' }).notNull().default(true),
    cpu_usage_ok: integer('cpu_usage_ok', { mode: 'boolean' }).notNull().default(true),
    communication_ok: integer('communication_ok', { mode: 'boolean' }).notNull().default(true),
    task_processing_ok: integer('task_processing_ok', { mode: 'boolean' }).notNull().default(true),
    issues: text('issues'), // JSON array of issues
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    agentIdx: index('idx_agent_health_agent').on(table.agent_id),
    statusIdx: index('idx_agent_health_status').on(table.status),
    lastCheckIdx: index('idx_agent_health_last_check').on(table.last_check),
  })
);

/**
 * Agent Metrics - Performance and usage metrics
 */
export const agentMetricsTable = sqliteTable(
  'agent_metrics',
  {
    id: text('id').primaryKey(),
    agent_id: text('agent_id').notNull(),
    timestamp: integer('timestamp').notNull(),
    tasks_completed: integer('tasks_completed').notNull().default(0),
    tasks_failed: integer('tasks_failed').notNull().default(0),
    average_task_duration_ms: integer('average_task_duration_ms').notNull().default(0),
    success_rate: integer('success_rate').notNull(), // Store as integer (0-100)
    current_workload: integer('current_workload').notNull().default(0),
    memory_mb: integer('memory_mb').notNull().default(0),
    cpu_percent: integer('cpu_percent').notNull().default(0),
    active_connections: integer('active_connections').notNull().default(0),
    messages_sent: integer('messages_sent').notNull().default(0),
    messages_received: integer('messages_received').notNull().default(0),
    average_response_time_ms: integer('average_response_time_ms').notNull().default(0),
  },
  (table) => ({
    agentIdx: index('idx_agent_metrics_agent').on(table.agent_id),
    timestampIdx: index('idx_agent_metrics_timestamp').on(table.timestamp),
  })
);

/**
 * Agent File Handoffs - Tracks file coordination between agents
 */
export const agentFileHandoffsTable = sqliteTable(
  'agent_file_handoffs',
  {
    id: text('id').primaryKey(),
    handoff_id: text('handoff_id').notNull().unique(),
    file_path: text('file_path').notNull(),
    from_agent: text('from_agent').notNull(),
    to_agent: text('to_agent').notNull(),
    handoff_type: text('handoff_type').notNull(),
    context: text('context'), // JSON object
    ctk_lock_id: text('ctk_lock_id'),
    handoff_status: text('handoff_status').notNull().default('requested'),
    requested_at: integer('requested_at').notNull(),
    accepted_at: integer('accepted_at'),
    completed_at: integer('completed_at'),
  },
  (table) => ({
    handoffIdx: index('idx_agent_handoffs_handoff').on(table.handoff_id),
    fileIdx: index('idx_agent_handoffs_file').on(table.file_path),
    fromAgentIdx: index('idx_agent_handoffs_from').on(table.from_agent),
    toAgentIdx: index('idx_agent_handoffs_to').on(table.to_agent),
    statusIdx: index('idx_agent_handoffs_status').on(table.handoff_status),
  })
);

/**
 * Task Dependencies - Defines dependencies between agent tasks
 */
export const taskDependenciesTable = sqliteTable(
  'task_dependencies',
  {
    id: text('id').primaryKey(),
    dependency_id: text('dependency_id').notNull().unique(),
    task_id: text('task_id').notNull(),
    depends_on_task: text('depends_on_task').notNull(),
    dependency_type: text('dependency_type').notNull(),
    required_agent: text('required_agent'),
    created_at: integer('created_at').notNull(),
    resolved_at: integer('resolved_at'),
    status: text('status').notNull().default('pending'),
  },
  (table) => ({
    taskIdx: index('idx_task_dependencies_task').on(table.task_id),
    dependsOnIdx: index('idx_task_dependencies_depends_on').on(table.depends_on_task),
    dependencyTypeIdx: index('idx_task_dependencies_type').on(table.dependency_type),
    requiredAgentIdx: index('idx_task_dependencies_required_agent').on(table.required_agent),
    statusIdx: index('idx_task_dependencies_status').on(table.status),
  })
);

/**
 * Agent Coordination Sessions - Tracks multi-agent coordination workflows
 */
export const agentCoordinationTable = sqliteTable(
  'agent_coordination',
  {
    id: text('id').primaryKey(),
    coordination_id: text('coordination_id').notNull().unique(),
    coordinator_agent: text('coordinator_agent').notNull(),
    participating_agents: text('participating_agents').notNull(), // JSON array
    coordination_type: text('coordination_type').notNull(),
    context: text('context'), // JSON object
    status: text('status').notNull().default('initiated'),
    started_at: integer('started_at').notNull(),
    completed_at: integer('completed_at'),
    outcome: text('outcome'), // JSON object
  },
  (table) => ({
    coordinationIdx: index('idx_agent_coordination_coordination').on(table.coordination_id),
    coordinatorIdx: index('idx_agent_coordination_coordinator').on(table.coordinator_agent),
    statusIdx: index('idx_agent_coordination_status').on(table.status),
    typeIdx: index('idx_agent_coordination_type').on(table.coordination_type),
  })
);

/**
 * Agent Configuration - Global coordination system configuration
 */
export const agentConfigTable = sqliteTable(
  'agent_config',
  {
    id: text('id').primaryKey(),
    config_key: text('config_key').notNull().unique(),
    config_value: text('config_value').notNull(), // JSON value
    description: text('description'),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    keyIdx: index('idx_agent_config_key').on(table.config_key),
  })
);