"use strict";
/**
 * FleetTools Agent Coordination System
 *
 * Comprehensive agent coordination layer that transforms FleetTools from
 * passive coordination to active multi-agent platform with ai-eng-system integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCoordinationConfigSchema = exports.AgentHealthSchema = exports.TaskDependencySchema = exports.AgentMetricsSchema = exports.AgentFileHandoffSchema = exports.AgentCoordinationSchema = exports.AgentTerminatedSchema = exports.AgentSpawnedSchema = exports.AgentMessageSchema = exports.AgentMessageTypeSchema = exports.AgentAssignmentSchema = exports.AssignmentConfigSchema = exports.WorkPrioritySchema = exports.AgentRegistrySchema = exports.AgentCapabilitySchema = exports.AgentTypeSchema = void 0;
const zod_1 = require("zod");
const base_js_1 = require("../../../../packages/events/src/types/base.js");
/**
 * Agent Types from ai-eng-system integration
 */
exports.AgentTypeSchema = zod_1.z.enum([
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
/**
 * Agent Capability Definition
 */
exports.AgentCapabilitySchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    trigger_words: zod_1.z.array(zod_1.z.string()),
    max_concurrent_tasks: zod_1.z.number().int().positive().default(1),
    estimated_duration_ms: zod_1.z.number().int().positive().optional(),
    dependencies: zod_1.z.array(zod_1.z.string()).optional(),
    resource_requirements: zod_1.z.object({
        memory_mb: zod_1.z.number().int().positive().optional(),
        cpu_units: zod_1.z.number().int().positive().optional(),
        special_permissions: zod_1.z.array(zod_1.z.string()).optional(),
    }).optional(),
});
/**
 * Agent Registry Entry
 */
exports.AgentRegistrySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    agent_type: exports.AgentTypeSchema,
    callsign: zod_1.z.string(),
    status: zod_1.z.enum(['idle', 'busy', 'offline', 'error']),
    capabilities: zod_1.z.array(exports.AgentCapabilitySchema),
    current_workload: zod_1.z.number().int().min(0).default(0),
    max_workload: zod_1.z.number().int().positive().default(1),
    last_heartbeat: zod_1.z.string().datetime(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
/**
 * Work Assignment Priority
 */
exports.WorkPrioritySchema = zod_1.z.enum(['low', 'medium', 'high', 'critical', 'emergency']);
/**
 * Task Assignment Algorithm Configuration
 */
exports.AssignmentConfigSchema = zod_1.z.object({
    algorithm: zod_1.z.enum(['round_robin', 'capability_match', 'workload_balance', 'priority_first']).default('capability_match'),
    capability_weight: zod_1.z.number().min(0).max(1).default(0.4),
    workload_weight: zod_1.z.number().min(0).max(1).default(0.3),
    priority_weight: zod_1.z.number().min(0).max(1).default(0.3),
    max_assignment_attempts: zod_1.z.number().int().positive().default(3),
    assignment_timeout_ms: zod_1.z.number().int().positive().default(30000),
});
/**
 * Agent Work Assignment
 */
exports.AgentAssignmentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    agent_id: zod_1.z.string().uuid(),
    agent_callsign: zod_1.z.string(),
    work_order_id: zod_1.z.string(),
    work_type: zod_1.z.string(),
    priority: exports.WorkPrioritySchema,
    assigned_at: zod_1.z.string().datetime(),
    status: zod_1.z.enum(['assigned', 'accepted', 'in_progress', 'completed', 'failed', 'cancelled']),
    started_at: zod_1.z.string().datetime().optional(),
    completed_at: zod_1.z.string().datetime().optional(),
    estimated_completion: zod_1.z.string().datetime().optional(),
    progress_percent: zod_1.z.number().int().min(0).max(100).default(0),
    context: zod_1.z.record(zod_1.z.unknown()).optional(),
    error_details: zod_1.z.object({
        message: zod_1.z.string(),
        retry_count: zod_1.z.number().int().min(0).default(0),
        last_retry_at: zod_1.z.string().datetime().optional(),
    }).optional(),
});
/**
 * Agent Communication Message Types
 */
exports.AgentMessageTypeSchema = zod_1.z.enum([
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
exports.AgentMessageSchema = base_js_1.BaseEventSchema.extend({
    type: zod_1.z.literal('agent_message'),
    data: zod_1.z.object({
        message_id: zod_1.z.string().uuid(),
        from_agent: zod_1.z.string(),
        to_agent: zod_1.z.string().optional(), // undefined for broadcast
        message_type: exports.AgentMessageTypeSchema,
        subject: zod_1.z.string(),
        content: zod_1.z.record(zod_1.z.unknown()),
        priority: exports.WorkPrioritySchema.default('medium'),
        correlation_id: zod_1.z.string().uuid().optional(),
        requires_response: zod_1.z.boolean().default(false),
        response_timeout_ms: zod_1.z.number().int().positive().optional(),
        metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    }),
});
/**
 * Agent Lifecycle Events
 */
exports.AgentSpawnedSchema = base_js_1.BaseEventSchema.extend({
    type: zod_1.z.literal('agent_spawned'),
    data: zod_1.z.object({
        agent_id: zod_1.z.string().uuid(),
        agent_type: exports.AgentTypeSchema,
        callsign: zod_1.z.string(),
        spawned_by: zod_1.z.string(),
        config: zod_1.z.record(zod_1.z.unknown()).optional(),
        capabilities: zod_1.z.array(exports.AgentCapabilitySchema),
    }),
});
exports.AgentTerminatedSchema = base_js_1.BaseEventSchema.extend({
    type: zod_1.z.literal('agent_terminated'),
    data: zod_1.z.object({
        agent_id: zod_1.z.string().uuid(),
        callsign: zod_1.z.string(),
        terminated_by: zod_1.z.string(),
        reason: zod_1.z.enum(['completed', 'error', 'timeout', 'manual', 'resource_limit', 'escalation']),
        exit_code: zod_1.z.number().optional(),
        final_state: zod_1.z.record(zod_1.z.unknown()).optional(),
        active_assignments: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    }),
});
/**
 * Agent Coordination Events
 */
exports.AgentCoordinationSchema = base_js_1.BaseEventSchema.extend({
    type: zod_1.z.literal('agent_coordination'),
    data: zod_1.z.object({
        coordination_id: zod_1.z.string().uuid(),
        coordinator_agent: zod_1.z.string(),
        participating_agents: zod_1.z.array(zod_1.z.string()),
        coordination_type: zod_1.z.enum(['sequential', 'parallel', 'hierarchical', 'peer_review']),
        context: zod_1.z.record(zod_1.z.unknown()),
        status: zod_1.z.enum(['initiated', 'in_progress', 'completed', 'failed']),
        started_at: zod_1.z.string().datetime(),
        completed_at: zod_1.z.string().datetime().optional(),
    }),
});
/**
 * File Coordination for Agent Handoffs
 */
exports.AgentFileHandoffSchema = base_js_1.BaseEventSchema.extend({
    type: zod_1.z.literal('agent_file_handoff'),
    data: zod_1.z.object({
        handoff_id: zod_1.z.string().uuid(),
        file_path: zod_1.z.string(),
        from_agent: zod_1.z.string(),
        to_agent: zod_1.z.string(),
        handoff_type: zod_1.z.enum(['edit_continuation', 'review', 'testing', 'deployment']),
        context: zod_1.z.record(zod_1.z.unknown()).optional(),
        ctk_lock_id: zod_1.z.string().optional(),
        handoff_status: zod_1.z.enum(['requested', 'accepted', 'in_progress', 'completed', 'failed']),
        requested_at: zod_1.z.string().datetime(),
        completed_at: zod_1.z.string().datetime().optional(),
    }),
});
/**
 * Agent Performance Metrics
 */
exports.AgentMetricsSchema = zod_1.z.object({
    agent_id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    metrics: zod_1.z.object({
        tasks_completed: zod_1.z.number().int().min(0),
        tasks_failed: zod_1.z.number().int().min(0),
        average_task_duration_ms: zod_1.z.number().int().min(0),
        success_rate: zod_1.z.number().min(0).max(1),
        current_workload: zod_1.z.number().int().min(0),
        resource_usage: zod_1.z.object({
            memory_mb: zod_1.z.number().int().min(0),
            cpu_percent: zod_1.z.number().min(0).max(100),
            active_connections: zod_1.z.number().int().min(0),
        }),
        communication_metrics: zod_1.z.object({
            messages_sent: zod_1.z.number().int().min(0),
            messages_received: zod_1.z.number().int().min(0),
            average_response_time_ms: zod_1.z.number().int().min(0),
        }),
    }),
});
/**
 * Agent Task Dependencies
 */
exports.TaskDependencySchema = zod_1.z.object({
    dependency_id: zod_1.z.string().uuid(),
    task_id: zod_1.z.string(),
    depends_on_task: zod_1.z.string(),
    dependency_type: zod_1.z.enum(['completion', 'success', 'data', 'resource']),
    required_agent: zod_1.z.string().optional(),
});
/**
 * Agent Health Status
 */
exports.AgentHealthSchema = zod_1.z.object({
    agent_id: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['healthy', 'degraded', 'unhealthy', 'offline']),
    last_check: zod_1.z.string().datetime(),
    checks: zod_1.z.object({
        heartbeat: zod_1.z.boolean(),
        memory_usage: zod_1.z.boolean(),
        cpu_usage: zod_1.z.boolean(),
        communication: zod_1.z.boolean(),
        task_processing: zod_1.z.boolean(),
    }),
    issues: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        severity: zod_1.z.enum(['info', 'warning', 'error', 'critical']),
        message: zod_1.z.string(),
        detected_at: zod_1.z.string().datetime(),
    })).optional(),
});
/**
 * Agent Coordination System Configuration
 */
exports.AgentCoordinationConfigSchema = zod_1.z.object({
    max_concurrent_agents: zod_1.z.number().int().positive().default(50),
    default_assignment_timeout_ms: zod_1.z.number().int().positive().default(300000), // 5 minutes
    heartbeat_interval_ms: zod_1.z.number().int().positive().default(30000), // 30 seconds
    agent_timeout_ms: zod_1.z.number().int().positive().default(180000), // 3 minutes
    task_retry_limit: zod_1.z.number().int().min(0).default(3),
    escalation_threshold: zod_1.z.number().int().positive().default(3),
    communication_timeout_ms: zod_1.z.number().int().positive().default(60000), // 1 minute
    enable_auto_scaling: zod_1.z.boolean().default(true),
    enable_load_balancing: zod_1.z.boolean().default(true),
    enable_priority_routing: zod_1.z.boolean().default(true),
});
//# sourceMappingURL=agents.js.map