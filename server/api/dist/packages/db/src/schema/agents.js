"use strict";
/**
 * FleetTools Agent Database Schema
 *
 * Database schema for agent coordination system with ai-eng-system integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentConfigTable = exports.agentCoordinationTable = exports.taskDependenciesTable = exports.agentFileHandoffsTable = exports.agentMetricsTable = exports.agentHealthTable = exports.agentMessagesTable = exports.agentAssignmentsTable = exports.agentsTable = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
/**
 * Agent Registry - Tracks all available agents and their capabilities
 */
exports.agentsTable = (0, sqlite_core_1.sqliteTable)('agents', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    agent_type: (0, sqlite_core_1.text)('agent_type').notNull(),
    callsign: (0, sqlite_core_1.text)('callsign').notNull().unique(),
    status: (0, sqlite_core_1.text)('status').notNull().default('offline'),
    capabilities: (0, sqlite_core_1.text)('capabilities'), // JSON array of capabilities
    current_workload: (0, sqlite_core_1.integer)('current_workload').notNull().default(0),
    max_workload: (0, sqlite_core_1.integer)('max_workload').notNull().default(1),
    last_heartbeat: (0, sqlite_core_1.integer)('last_heartbeat'),
    metadata: (0, sqlite_core_1.text)('metadata'), // JSON object
    created_at: (0, sqlite_core_1.integer)('created_at').notNull(),
    updated_at: (0, sqlite_core_1.integer)('updated_at').notNull(),
}, (table) => ({
    typeIdx: (0, sqlite_core_1.index)('idx_agents_type').on(table.agent_type),
    statusIdx: (0, sqlite_core_1.index)('idx_agents_status').on(table.status),
    callsignIdx: (0, sqlite_core_1.index)('idx_agents_callsign').on(table.callsign),
    workloadIdx: (0, sqlite_core_1.index)('idx_agents_workload').on(table.current_workload),
}));
/**
 * Agent Work Assignments - Tracks task assignments to agents
 */
exports.agentAssignmentsTable = (0, sqlite_core_1.sqliteTable)('agent_assignments', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    agent_id: (0, sqlite_core_1.text)('agent_id').notNull(),
    agent_callsign: (0, sqlite_core_1.text)('agent_callsign').notNull(),
    work_order_id: (0, sqlite_core_1.text)('work_order_id').notNull(),
    work_type: (0, sqlite_core_1.text)('work_type').notNull(),
    priority: (0, sqlite_core_1.text)('priority').notNull().default('medium'),
    assigned_at: (0, sqlite_core_1.integer)('assigned_at').notNull(),
    status: (0, sqlite_core_1.text)('status').notNull().default('assigned'),
    started_at: (0, sqlite_core_1.integer)('started_at'),
    completed_at: (0, sqlite_core_1.integer)('completed_at'),
    estimated_completion: (0, sqlite_core_1.integer)('estimated_completion'),
    progress_percent: (0, sqlite_core_1.integer)('progress_percent').notNull().default(0),
    context: (0, sqlite_core_1.text)('context'), // JSON object
    error_details: (0, sqlite_core_1.text)('error_details'), // JSON object
}, (table) => ({
    agentIdx: (0, sqlite_core_1.index)('idx_agent_assignments_agent').on(table.agent_id),
    workOrderIdx: (0, sqlite_core_1.index)('idx_agent_assignments_work_order').on(table.work_order_id),
    statusIdx: (0, sqlite_core_1.index)('idx_agent_assignments_status').on(table.status),
    priorityIdx: (0, sqlite_core_1.index)('idx_agent_assignments_priority').on(table.priority),
    agentCallsignIdx: (0, sqlite_core_1.index)('idx_agent_assignments_callsign').on(table.agent_callsign),
}));
/**
 * Agent Messages - Inter-agent communication
 */
exports.agentMessagesTable = (0, sqlite_core_1.sqliteTable)('agent_messages', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    message_id: (0, sqlite_core_1.text)('message_id').notNull().unique(),
    from_agent: (0, sqlite_core_1.text)('from_agent').notNull(),
    to_agent: (0, sqlite_core_1.text)('to_agent'), // null for broadcast
    message_type: (0, sqlite_core_1.text)('message_type').notNull(),
    subject: (0, sqlite_core_1.text)('subject').notNull(),
    content: (0, sqlite_core_1.text)('content').notNull(), // JSON object
    priority: (0, sqlite_core_1.text)('priority').notNull().default('medium'),
    correlation_id: (0, sqlite_core_1.text)('correlation_id'),
    requires_response: (0, sqlite_core_1.integer)('requires_response', { mode: 'boolean' }).notNull().default(false),
    response_timeout_ms: (0, sqlite_core_1.integer)('response_timeout_ms'),
    responded_at: (0, sqlite_core_1.integer)('responded_at'),
    metadata: (0, sqlite_core_1.text)('metadata'), // JSON object
    created_at: (0, sqlite_core_1.integer)('created_at').notNull(),
}, (table) => ({
    fromAgentIdx: (0, sqlite_core_1.index)('idx_agent_messages_from').on(table.from_agent),
    toAgentIdx: (0, sqlite_core_1.index)('idx_agent_messages_to').on(table.to_agent),
    messageTypeIdx: (0, sqlite_core_1.index)('idx_agent_messages_type').on(table.message_type),
    correlationIdx: (0, sqlite_core_1.index)('idx_agent_messages_correlation').on(table.correlation_id),
    priorityIdx: (0, sqlite_core_1.index)('idx_agent_messages_priority').on(table.priority),
}));
/**
 * Agent Health Monitoring - Tracks agent health status
 */
exports.agentHealthTable = (0, sqlite_core_1.sqliteTable)('agent_health', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    agent_id: (0, sqlite_core_1.text)('agent_id').notNull().unique(),
    status: (0, sqlite_core_1.text)('status').notNull().default('offline'),
    last_check: (0, sqlite_core_1.integer)('last_check').notNull(),
    heartbeat_ok: (0, sqlite_core_1.integer)('heartbeat_ok', { mode: 'boolean' }).notNull().default(false),
    memory_usage_ok: (0, sqlite_core_1.integer)('memory_usage_ok', { mode: 'boolean' }).notNull().default(true),
    cpu_usage_ok: (0, sqlite_core_1.integer)('cpu_usage_ok', { mode: 'boolean' }).notNull().default(true),
    communication_ok: (0, sqlite_core_1.integer)('communication_ok', { mode: 'boolean' }).notNull().default(true),
    task_processing_ok: (0, sqlite_core_1.integer)('task_processing_ok', { mode: 'boolean' }).notNull().default(true),
    issues: (0, sqlite_core_1.text)('issues'), // JSON array of issues
    created_at: (0, sqlite_core_1.integer)('created_at').notNull(),
    updated_at: (0, sqlite_core_1.integer)('updated_at').notNull(),
}, (table) => ({
    agentIdx: (0, sqlite_core_1.index)('idx_agent_health_agent').on(table.agent_id),
    statusIdx: (0, sqlite_core_1.index)('idx_agent_health_status').on(table.status),
    lastCheckIdx: (0, sqlite_core_1.index)('idx_agent_health_last_check').on(table.last_check),
}));
/**
 * Agent Metrics - Performance and usage metrics
 */
exports.agentMetricsTable = (0, sqlite_core_1.sqliteTable)('agent_metrics', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    agent_id: (0, sqlite_core_1.text)('agent_id').notNull(),
    timestamp: (0, sqlite_core_1.integer)('timestamp').notNull(),
    tasks_completed: (0, sqlite_core_1.integer)('tasks_completed').notNull().default(0),
    tasks_failed: (0, sqlite_core_1.integer)('tasks_failed').notNull().default(0),
    average_task_duration_ms: (0, sqlite_core_1.integer)('average_task_duration_ms').notNull().default(0),
    success_rate: (0, sqlite_core_1.integer)('success_rate').notNull(), // Store as integer (0-100)
    current_workload: (0, sqlite_core_1.integer)('current_workload').notNull().default(0),
    memory_mb: (0, sqlite_core_1.integer)('memory_mb').notNull().default(0),
    cpu_percent: (0, sqlite_core_1.integer)('cpu_percent').notNull().default(0),
    active_connections: (0, sqlite_core_1.integer)('active_connections').notNull().default(0),
    messages_sent: (0, sqlite_core_1.integer)('messages_sent').notNull().default(0),
    messages_received: (0, sqlite_core_1.integer)('messages_received').notNull().default(0),
    average_response_time_ms: (0, sqlite_core_1.integer)('average_response_time_ms').notNull().default(0),
}, (table) => ({
    agentIdx: (0, sqlite_core_1.index)('idx_agent_metrics_agent').on(table.agent_id),
    timestampIdx: (0, sqlite_core_1.index)('idx_agent_metrics_timestamp').on(table.timestamp),
}));
/**
 * Agent File Handoffs - Tracks file coordination between agents
 */
exports.agentFileHandoffsTable = (0, sqlite_core_1.sqliteTable)('agent_file_handoffs', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    handoff_id: (0, sqlite_core_1.text)('handoff_id').notNull().unique(),
    file_path: (0, sqlite_core_1.text)('file_path').notNull(),
    from_agent: (0, sqlite_core_1.text)('from_agent').notNull(),
    to_agent: (0, sqlite_core_1.text)('to_agent').notNull(),
    handoff_type: (0, sqlite_core_1.text)('handoff_type').notNull(),
    context: (0, sqlite_core_1.text)('context'), // JSON object
    ctk_lock_id: (0, sqlite_core_1.text)('ctk_lock_id'),
    handoff_status: (0, sqlite_core_1.text)('handoff_status').notNull().default('requested'),
    requested_at: (0, sqlite_core_1.integer)('requested_at').notNull(),
    accepted_at: (0, sqlite_core_1.integer)('accepted_at'),
    completed_at: (0, sqlite_core_1.integer)('completed_at'),
}, (table) => ({
    handoffIdx: (0, sqlite_core_1.index)('idx_agent_handoffs_handoff').on(table.handoff_id),
    fileIdx: (0, sqlite_core_1.index)('idx_agent_handoffs_file').on(table.file_path),
    fromAgentIdx: (0, sqlite_core_1.index)('idx_agent_handoffs_from').on(table.from_agent),
    toAgentIdx: (0, sqlite_core_1.index)('idx_agent_handoffs_to').on(table.to_agent),
    statusIdx: (0, sqlite_core_1.index)('idx_agent_handoffs_status').on(table.handoff_status),
}));
/**
 * Task Dependencies - Defines dependencies between agent tasks
 */
exports.taskDependenciesTable = (0, sqlite_core_1.sqliteTable)('task_dependencies', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    dependency_id: (0, sqlite_core_1.text)('dependency_id').notNull().unique(),
    task_id: (0, sqlite_core_1.text)('task_id').notNull(),
    depends_on_task: (0, sqlite_core_1.text)('depends_on_task').notNull(),
    dependency_type: (0, sqlite_core_1.text)('dependency_type').notNull(),
    required_agent: (0, sqlite_core_1.text)('required_agent'),
    created_at: (0, sqlite_core_1.integer)('created_at').notNull(),
    resolved_at: (0, sqlite_core_1.integer)('resolved_at'),
    status: (0, sqlite_core_1.text)('status').notNull().default('pending'),
}, (table) => ({
    taskIdx: (0, sqlite_core_1.index)('idx_task_dependencies_task').on(table.task_id),
    dependsOnIdx: (0, sqlite_core_1.index)('idx_task_dependencies_depends_on').on(table.depends_on_task),
    dependencyTypeIdx: (0, sqlite_core_1.index)('idx_task_dependencies_type').on(table.dependency_type),
    requiredAgentIdx: (0, sqlite_core_1.index)('idx_task_dependencies_required_agent').on(table.required_agent),
    statusIdx: (0, sqlite_core_1.index)('idx_task_dependencies_status').on(table.status),
}));
/**
 * Agent Coordination Sessions - Tracks multi-agent coordination workflows
 */
exports.agentCoordinationTable = (0, sqlite_core_1.sqliteTable)('agent_coordination', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    coordination_id: (0, sqlite_core_1.text)('coordination_id').notNull().unique(),
    coordinator_agent: (0, sqlite_core_1.text)('coordinator_agent').notNull(),
    participating_agents: (0, sqlite_core_1.text)('participating_agents').notNull(), // JSON array
    coordination_type: (0, sqlite_core_1.text)('coordination_type').notNull(),
    context: (0, sqlite_core_1.text)('context'), // JSON object
    status: (0, sqlite_core_1.text)('status').notNull().default('initiated'),
    started_at: (0, sqlite_core_1.integer)('started_at').notNull(),
    completed_at: (0, sqlite_core_1.integer)('completed_at'),
    outcome: (0, sqlite_core_1.text)('outcome'), // JSON object
}, (table) => ({
    coordinationIdx: (0, sqlite_core_1.index)('idx_agent_coordination_coordination').on(table.coordination_id),
    coordinatorIdx: (0, sqlite_core_1.index)('idx_agent_coordination_coordinator').on(table.coordinator_agent),
    statusIdx: (0, sqlite_core_1.index)('idx_agent_coordination_status').on(table.status),
    typeIdx: (0, sqlite_core_1.index)('idx_agent_coordination_type').on(table.coordination_type),
}));
/**
 * Agent Configuration - Global coordination system configuration
 */
exports.agentConfigTable = (0, sqlite_core_1.sqliteTable)('agent_config', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    config_key: (0, sqlite_core_1.text)('config_key').notNull().unique(),
    config_value: (0, sqlite_core_1.text)('config_value').notNull(), // JSON value
    description: (0, sqlite_core_1.text)('description'),
    created_at: (0, sqlite_core_1.integer)('created_at').notNull(),
    updated_at: (0, sqlite_core_1.integer)('updated_at').notNull(),
}, (table) => ({
    keyIdx: (0, sqlite_core_1.index)('idx_agent_config_key').on(table.config_key),
}));
//# sourceMappingURL=agents.js.map