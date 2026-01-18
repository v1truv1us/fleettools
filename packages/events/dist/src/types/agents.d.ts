/**
 * FleetTools Agent Coordination System
 *
 * Comprehensive agent coordination layer that transforms FleetTools from
 * passive coordination to active multi-agent platform with ai-eng-system integration.
 */
import { z } from 'zod';
/**
 * Agent Types from ai-eng-system integration
 */
export declare const AgentTypeSchema: z.ZodEnum<["architect-advisor", "backend-architect", "infrastructure-builder", "full-stack-developer", "frontend-reviewer", "api-builder-advanced", "code-reviewer", "test-generator", "security-scanner", "deployment-engineer", "monitoring-expert", "accessibility-pro", "ux-optimizer", "compliance-expert", "performance-engineer", "database-expert"]>;
export type AgentType = z.infer<typeof AgentTypeSchema>;
/**
 * Agent Capability Definition
 */
export declare const AgentCapabilitySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    trigger_words: z.ZodArray<z.ZodString, "many">;
    max_concurrent_tasks: z.ZodDefault<z.ZodNumber>;
    estimated_duration_ms: z.ZodOptional<z.ZodNumber>;
    dependencies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    resource_requirements: z.ZodOptional<z.ZodObject<{
        memory_mb: z.ZodOptional<z.ZodNumber>;
        cpu_units: z.ZodOptional<z.ZodNumber>;
        special_permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        memory_mb?: number | undefined;
        cpu_units?: number | undefined;
        special_permissions?: string[] | undefined;
    }, {
        memory_mb?: number | undefined;
        cpu_units?: number | undefined;
        special_permissions?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    name: string;
    trigger_words: string[];
    max_concurrent_tasks: number;
    estimated_duration_ms?: number | undefined;
    dependencies?: string[] | undefined;
    resource_requirements?: {
        memory_mb?: number | undefined;
        cpu_units?: number | undefined;
        special_permissions?: string[] | undefined;
    } | undefined;
}, {
    id: string;
    description: string;
    name: string;
    trigger_words: string[];
    max_concurrent_tasks?: number | undefined;
    estimated_duration_ms?: number | undefined;
    dependencies?: string[] | undefined;
    resource_requirements?: {
        memory_mb?: number | undefined;
        cpu_units?: number | undefined;
        special_permissions?: string[] | undefined;
    } | undefined;
}>;
/**
 * Agent Registry Entry
 */
export declare const AgentRegistrySchema: z.ZodObject<{
    id: z.ZodString;
    agent_type: z.ZodEnum<["architect-advisor", "backend-architect", "infrastructure-builder", "full-stack-developer", "frontend-reviewer", "api-builder-advanced", "code-reviewer", "test-generator", "security-scanner", "deployment-engineer", "monitoring-expert", "accessibility-pro", "ux-optimizer", "compliance-expert", "performance-engineer", "database-expert"]>;
    callsign: z.ZodString;
    status: z.ZodEnum<["idle", "busy", "offline", "error"]>;
    capabilities: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        trigger_words: z.ZodArray<z.ZodString, "many">;
        max_concurrent_tasks: z.ZodDefault<z.ZodNumber>;
        estimated_duration_ms: z.ZodOptional<z.ZodNumber>;
        dependencies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        resource_requirements: z.ZodOptional<z.ZodObject<{
            memory_mb: z.ZodOptional<z.ZodNumber>;
            cpu_units: z.ZodOptional<z.ZodNumber>;
            special_permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            memory_mb?: number | undefined;
            cpu_units?: number | undefined;
            special_permissions?: string[] | undefined;
        }, {
            memory_mb?: number | undefined;
            cpu_units?: number | undefined;
            special_permissions?: string[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        name: string;
        trigger_words: string[];
        max_concurrent_tasks: number;
        estimated_duration_ms?: number | undefined;
        dependencies?: string[] | undefined;
        resource_requirements?: {
            memory_mb?: number | undefined;
            cpu_units?: number | undefined;
            special_permissions?: string[] | undefined;
        } | undefined;
    }, {
        id: string;
        description: string;
        name: string;
        trigger_words: string[];
        max_concurrent_tasks?: number | undefined;
        estimated_duration_ms?: number | undefined;
        dependencies?: string[] | undefined;
        resource_requirements?: {
            memory_mb?: number | undefined;
            cpu_units?: number | undefined;
            special_permissions?: string[] | undefined;
        } | undefined;
    }>, "many">;
    current_workload: z.ZodDefault<z.ZodNumber>;
    max_workload: z.ZodDefault<z.ZodNumber>;
    last_heartbeat: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "idle" | "busy" | "error" | "offline";
    callsign: string;
    updated_at: string;
    agent_type: "architect-advisor" | "backend-architect" | "infrastructure-builder" | "full-stack-developer" | "frontend-reviewer" | "api-builder-advanced" | "code-reviewer" | "test-generator" | "security-scanner" | "deployment-engineer" | "monitoring-expert" | "accessibility-pro" | "ux-optimizer" | "compliance-expert" | "performance-engineer" | "database-expert";
    capabilities: {
        id: string;
        description: string;
        name: string;
        trigger_words: string[];
        max_concurrent_tasks: number;
        estimated_duration_ms?: number | undefined;
        dependencies?: string[] | undefined;
        resource_requirements?: {
            memory_mb?: number | undefined;
            cpu_units?: number | undefined;
            special_permissions?: string[] | undefined;
        } | undefined;
    }[];
    current_workload: number;
    max_workload: number;
    last_heartbeat: string;
    created_at: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    status: "idle" | "busy" | "error" | "offline";
    callsign: string;
    updated_at: string;
    agent_type: "architect-advisor" | "backend-architect" | "infrastructure-builder" | "full-stack-developer" | "frontend-reviewer" | "api-builder-advanced" | "code-reviewer" | "test-generator" | "security-scanner" | "deployment-engineer" | "monitoring-expert" | "accessibility-pro" | "ux-optimizer" | "compliance-expert" | "performance-engineer" | "database-expert";
    capabilities: {
        id: string;
        description: string;
        name: string;
        trigger_words: string[];
        max_concurrent_tasks?: number | undefined;
        estimated_duration_ms?: number | undefined;
        dependencies?: string[] | undefined;
        resource_requirements?: {
            memory_mb?: number | undefined;
            cpu_units?: number | undefined;
            special_permissions?: string[] | undefined;
        } | undefined;
    }[];
    last_heartbeat: string;
    created_at: string;
    current_workload?: number | undefined;
    max_workload?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
/**
 * Work Assignment Priority
 */
export declare const WorkPrioritySchema: z.ZodEnum<["low", "medium", "high", "critical", "emergency"]>;
/**
 * Task Assignment Algorithm Configuration
 */
export declare const AssignmentConfigSchema: z.ZodObject<{
    algorithm: z.ZodDefault<z.ZodEnum<["round_robin", "capability_match", "workload_balance", "priority_first"]>>;
    capability_weight: z.ZodDefault<z.ZodNumber>;
    workload_weight: z.ZodDefault<z.ZodNumber>;
    priority_weight: z.ZodDefault<z.ZodNumber>;
    max_assignment_attempts: z.ZodDefault<z.ZodNumber>;
    assignment_timeout_ms: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    algorithm: "round_robin" | "capability_match" | "workload_balance" | "priority_first";
    capability_weight: number;
    workload_weight: number;
    priority_weight: number;
    max_assignment_attempts: number;
    assignment_timeout_ms: number;
}, {
    algorithm?: "round_robin" | "capability_match" | "workload_balance" | "priority_first" | undefined;
    capability_weight?: number | undefined;
    workload_weight?: number | undefined;
    priority_weight?: number | undefined;
    max_assignment_attempts?: number | undefined;
    assignment_timeout_ms?: number | undefined;
}>;
/**
 * Agent Work Assignment
 */
export declare const AgentAssignmentSchema: z.ZodObject<{
    id: z.ZodString;
    agent_id: z.ZodString;
    agent_callsign: z.ZodString;
    work_order_id: z.ZodString;
    work_type: z.ZodString;
    priority: z.ZodEnum<["low", "medium", "high", "critical", "emergency"]>;
    assigned_at: z.ZodString;
    status: z.ZodEnum<["assigned", "accepted", "in_progress", "completed", "failed", "cancelled"]>;
    started_at: z.ZodOptional<z.ZodString>;
    completed_at: z.ZodOptional<z.ZodString>;
    estimated_completion: z.ZodOptional<z.ZodString>;
    progress_percent: z.ZodDefault<z.ZodNumber>;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    error_details: z.ZodOptional<z.ZodObject<{
        message: z.ZodString;
        retry_count: z.ZodDefault<z.ZodNumber>;
        last_retry_at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        retry_count: number;
        last_retry_at?: string | undefined;
    }, {
        message: string;
        retry_count?: number | undefined;
        last_retry_at?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "completed" | "failed" | "assigned" | "accepted" | "in_progress" | "cancelled";
    priority: "low" | "high" | "critical" | "medium" | "emergency";
    progress_percent: number;
    agent_id: string;
    agent_callsign: string;
    work_order_id: string;
    work_type: string;
    assigned_at: string;
    started_at?: string | undefined;
    completed_at?: string | undefined;
    context?: Record<string, unknown> | undefined;
    estimated_completion?: string | undefined;
    error_details?: {
        message: string;
        retry_count: number;
        last_retry_at?: string | undefined;
    } | undefined;
}, {
    id: string;
    status: "completed" | "failed" | "assigned" | "accepted" | "in_progress" | "cancelled";
    priority: "low" | "high" | "critical" | "medium" | "emergency";
    agent_id: string;
    agent_callsign: string;
    work_order_id: string;
    work_type: string;
    assigned_at: string;
    started_at?: string | undefined;
    completed_at?: string | undefined;
    progress_percent?: number | undefined;
    context?: Record<string, unknown> | undefined;
    estimated_completion?: string | undefined;
    error_details?: {
        message: string;
        retry_count?: number | undefined;
        last_retry_at?: string | undefined;
    } | undefined;
}>;
/**
 * Agent Communication Message Types
 */
export declare const AgentMessageTypeSchema: z.ZodEnum<["task_assignment", "task_acceptance", "task_progress", "task_completion", "task_failure", "coordination_request", "coordination_response", "resource_request", "resource_release", "handoff_request", "handoff_acceptance", "status_update", "error_report"]>;
/**
 * Inter-Agent Communication
 */
export declare const AgentMessageSchema: z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"agent_message">;
    data: z.ZodObject<{
        message_id: z.ZodString;
        from_agent: z.ZodString;
        to_agent: z.ZodOptional<z.ZodString>;
        message_type: z.ZodEnum<["task_assignment", "task_acceptance", "task_progress", "task_completion", "task_failure", "coordination_request", "coordination_response", "resource_request", "resource_release", "handoff_request", "handoff_acceptance", "status_update", "error_report"]>;
        subject: z.ZodString;
        content: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical", "emergency"]>>;
        correlation_id: z.ZodOptional<z.ZodString>;
        requires_response: z.ZodDefault<z.ZodBoolean>;
        response_timeout_ms: z.ZodOptional<z.ZodNumber>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        subject: string;
        message_id: string;
        priority: "low" | "high" | "critical" | "medium" | "emergency";
        from_agent: string;
        message_type: "task_assignment" | "task_acceptance" | "task_progress" | "task_completion" | "task_failure" | "coordination_request" | "coordination_response" | "resource_request" | "resource_release" | "handoff_request" | "handoff_acceptance" | "status_update" | "error_report";
        content: Record<string, unknown>;
        requires_response: boolean;
        metadata?: Record<string, unknown> | undefined;
        to_agent?: string | undefined;
        correlation_id?: string | undefined;
        response_timeout_ms?: number | undefined;
    }, {
        subject: string;
        message_id: string;
        from_agent: string;
        message_type: "task_assignment" | "task_acceptance" | "task_progress" | "task_completion" | "task_failure" | "coordination_request" | "coordination_response" | "resource_request" | "resource_release" | "handoff_request" | "handoff_acceptance" | "status_update" | "error_report";
        content: Record<string, unknown>;
        priority?: "low" | "high" | "critical" | "medium" | "emergency" | undefined;
        metadata?: Record<string, unknown> | undefined;
        to_agent?: string | undefined;
        correlation_id?: string | undefined;
        requires_response?: boolean | undefined;
        response_timeout_ms?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "agent_message";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        subject: string;
        message_id: string;
        priority: "low" | "high" | "critical" | "medium" | "emergency";
        from_agent: string;
        message_type: "task_assignment" | "task_acceptance" | "task_progress" | "task_completion" | "task_failure" | "coordination_request" | "coordination_response" | "resource_request" | "resource_release" | "handoff_request" | "handoff_acceptance" | "status_update" | "error_report";
        content: Record<string, unknown>;
        requires_response: boolean;
        metadata?: Record<string, unknown> | undefined;
        to_agent?: string | undefined;
        correlation_id?: string | undefined;
        response_timeout_ms?: number | undefined;
    };
}, {
    id: string;
    type: "agent_message";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        subject: string;
        message_id: string;
        from_agent: string;
        message_type: "task_assignment" | "task_acceptance" | "task_progress" | "task_completion" | "task_failure" | "coordination_request" | "coordination_response" | "resource_request" | "resource_release" | "handoff_request" | "handoff_acceptance" | "status_update" | "error_report";
        content: Record<string, unknown>;
        priority?: "low" | "high" | "critical" | "medium" | "emergency" | undefined;
        metadata?: Record<string, unknown> | undefined;
        to_agent?: string | undefined;
        correlation_id?: string | undefined;
        requires_response?: boolean | undefined;
        response_timeout_ms?: number | undefined;
    };
}>;
/**
 * Agent Lifecycle Events
 */
export declare const AgentSpawnedSchema: z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"agent_spawned">;
    data: z.ZodObject<{
        agent_id: z.ZodString;
        agent_type: z.ZodEnum<["architect-advisor", "backend-architect", "infrastructure-builder", "full-stack-developer", "frontend-reviewer", "api-builder-advanced", "code-reviewer", "test-generator", "security-scanner", "deployment-engineer", "monitoring-expert", "accessibility-pro", "ux-optimizer", "compliance-expert", "performance-engineer", "database-expert"]>;
        callsign: z.ZodString;
        spawned_by: z.ZodString;
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        capabilities: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            trigger_words: z.ZodArray<z.ZodString, "many">;
            max_concurrent_tasks: z.ZodDefault<z.ZodNumber>;
            estimated_duration_ms: z.ZodOptional<z.ZodNumber>;
            dependencies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            resource_requirements: z.ZodOptional<z.ZodObject<{
                memory_mb: z.ZodOptional<z.ZodNumber>;
                cpu_units: z.ZodOptional<z.ZodNumber>;
                special_permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                memory_mb?: number | undefined;
                cpu_units?: number | undefined;
                special_permissions?: string[] | undefined;
            }, {
                memory_mb?: number | undefined;
                cpu_units?: number | undefined;
                special_permissions?: string[] | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            description: string;
            name: string;
            trigger_words: string[];
            max_concurrent_tasks: number;
            estimated_duration_ms?: number | undefined;
            dependencies?: string[] | undefined;
            resource_requirements?: {
                memory_mb?: number | undefined;
                cpu_units?: number | undefined;
                special_permissions?: string[] | undefined;
            } | undefined;
        }, {
            id: string;
            description: string;
            name: string;
            trigger_words: string[];
            max_concurrent_tasks?: number | undefined;
            estimated_duration_ms?: number | undefined;
            dependencies?: string[] | undefined;
            resource_requirements?: {
                memory_mb?: number | undefined;
                cpu_units?: number | undefined;
                special_permissions?: string[] | undefined;
            } | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        callsign: string;
        spawned_by: string;
        agent_type: "architect-advisor" | "backend-architect" | "infrastructure-builder" | "full-stack-developer" | "frontend-reviewer" | "api-builder-advanced" | "code-reviewer" | "test-generator" | "security-scanner" | "deployment-engineer" | "monitoring-expert" | "accessibility-pro" | "ux-optimizer" | "compliance-expert" | "performance-engineer" | "database-expert";
        capabilities: {
            id: string;
            description: string;
            name: string;
            trigger_words: string[];
            max_concurrent_tasks: number;
            estimated_duration_ms?: number | undefined;
            dependencies?: string[] | undefined;
            resource_requirements?: {
                memory_mb?: number | undefined;
                cpu_units?: number | undefined;
                special_permissions?: string[] | undefined;
            } | undefined;
        }[];
        agent_id: string;
        config?: Record<string, unknown> | undefined;
    }, {
        callsign: string;
        spawned_by: string;
        agent_type: "architect-advisor" | "backend-architect" | "infrastructure-builder" | "full-stack-developer" | "frontend-reviewer" | "api-builder-advanced" | "code-reviewer" | "test-generator" | "security-scanner" | "deployment-engineer" | "monitoring-expert" | "accessibility-pro" | "ux-optimizer" | "compliance-expert" | "performance-engineer" | "database-expert";
        capabilities: {
            id: string;
            description: string;
            name: string;
            trigger_words: string[];
            max_concurrent_tasks?: number | undefined;
            estimated_duration_ms?: number | undefined;
            dependencies?: string[] | undefined;
            resource_requirements?: {
                memory_mb?: number | undefined;
                cpu_units?: number | undefined;
                special_permissions?: string[] | undefined;
            } | undefined;
        }[];
        agent_id: string;
        config?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "agent_spawned";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        spawned_by: string;
        agent_type: "architect-advisor" | "backend-architect" | "infrastructure-builder" | "full-stack-developer" | "frontend-reviewer" | "api-builder-advanced" | "code-reviewer" | "test-generator" | "security-scanner" | "deployment-engineer" | "monitoring-expert" | "accessibility-pro" | "ux-optimizer" | "compliance-expert" | "performance-engineer" | "database-expert";
        capabilities: {
            id: string;
            description: string;
            name: string;
            trigger_words: string[];
            max_concurrent_tasks: number;
            estimated_duration_ms?: number | undefined;
            dependencies?: string[] | undefined;
            resource_requirements?: {
                memory_mb?: number | undefined;
                cpu_units?: number | undefined;
                special_permissions?: string[] | undefined;
            } | undefined;
        }[];
        agent_id: string;
        config?: Record<string, unknown> | undefined;
    };
}, {
    id: string;
    type: "agent_spawned";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        spawned_by: string;
        agent_type: "architect-advisor" | "backend-architect" | "infrastructure-builder" | "full-stack-developer" | "frontend-reviewer" | "api-builder-advanced" | "code-reviewer" | "test-generator" | "security-scanner" | "deployment-engineer" | "monitoring-expert" | "accessibility-pro" | "ux-optimizer" | "compliance-expert" | "performance-engineer" | "database-expert";
        capabilities: {
            id: string;
            description: string;
            name: string;
            trigger_words: string[];
            max_concurrent_tasks?: number | undefined;
            estimated_duration_ms?: number | undefined;
            dependencies?: string[] | undefined;
            resource_requirements?: {
                memory_mb?: number | undefined;
                cpu_units?: number | undefined;
                special_permissions?: string[] | undefined;
            } | undefined;
        }[];
        agent_id: string;
        config?: Record<string, unknown> | undefined;
    };
}>;
export declare const AgentTerminatedSchema: z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"agent_terminated">;
    data: z.ZodObject<{
        agent_id: z.ZodString;
        callsign: z.ZodString;
        terminated_by: z.ZodString;
        reason: z.ZodEnum<["completed", "error", "timeout", "manual", "resource_limit", "escalation"]>;
        exit_code: z.ZodOptional<z.ZodNumber>;
        final_state: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        active_assignments: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        callsign: string;
        reason: "completed" | "error" | "timeout" | "manual" | "resource_limit" | "escalation";
        terminated_by: string;
        agent_id: string;
        exit_code?: number | undefined;
        final_state?: Record<string, unknown> | undefined;
        active_assignments?: string[] | undefined;
    }, {
        callsign: string;
        reason: "completed" | "error" | "timeout" | "manual" | "resource_limit" | "escalation";
        terminated_by: string;
        agent_id: string;
        exit_code?: number | undefined;
        final_state?: Record<string, unknown> | undefined;
        active_assignments?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "agent_terminated";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        reason: "completed" | "error" | "timeout" | "manual" | "resource_limit" | "escalation";
        terminated_by: string;
        agent_id: string;
        exit_code?: number | undefined;
        final_state?: Record<string, unknown> | undefined;
        active_assignments?: string[] | undefined;
    };
}, {
    id: string;
    type: "agent_terminated";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        callsign: string;
        reason: "completed" | "error" | "timeout" | "manual" | "resource_limit" | "escalation";
        terminated_by: string;
        agent_id: string;
        exit_code?: number | undefined;
        final_state?: Record<string, unknown> | undefined;
        active_assignments?: string[] | undefined;
    };
}>;
/**
 * Agent Coordination Events
 */
export declare const AgentCoordinationSchema: z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"agent_coordination">;
    data: z.ZodObject<{
        coordination_id: z.ZodString;
        coordinator_agent: z.ZodString;
        participating_agents: z.ZodArray<z.ZodString, "many">;
        coordination_type: z.ZodEnum<["sequential", "parallel", "hierarchical", "peer_review"]>;
        context: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        status: z.ZodEnum<["initiated", "in_progress", "completed", "failed"]>;
        started_at: z.ZodString;
        completed_at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "completed" | "failed" | "in_progress" | "initiated";
        started_at: string;
        context: Record<string, unknown>;
        coordination_id: string;
        coordinator_agent: string;
        participating_agents: string[];
        coordination_type: "sequential" | "parallel" | "hierarchical" | "peer_review";
        completed_at?: string | undefined;
    }, {
        status: "completed" | "failed" | "in_progress" | "initiated";
        started_at: string;
        context: Record<string, unknown>;
        coordination_id: string;
        coordinator_agent: string;
        participating_agents: string[];
        coordination_type: "sequential" | "parallel" | "hierarchical" | "peer_review";
        completed_at?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "agent_coordination";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        status: "completed" | "failed" | "in_progress" | "initiated";
        started_at: string;
        context: Record<string, unknown>;
        coordination_id: string;
        coordinator_agent: string;
        participating_agents: string[];
        coordination_type: "sequential" | "parallel" | "hierarchical" | "peer_review";
        completed_at?: string | undefined;
    };
}, {
    id: string;
    type: "agent_coordination";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        status: "completed" | "failed" | "in_progress" | "initiated";
        started_at: string;
        context: Record<string, unknown>;
        coordination_id: string;
        coordinator_agent: string;
        participating_agents: string[];
        coordination_type: "sequential" | "parallel" | "hierarchical" | "peer_review";
        completed_at?: string | undefined;
    };
}>;
/**
 * File Coordination for Agent Handoffs
 */
export declare const AgentFileHandoffSchema: z.ZodObject<{
    id: z.ZodString;
    project_key: z.ZodString;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
} & {
    type: z.ZodLiteral<"agent_file_handoff">;
    data: z.ZodObject<{
        handoff_id: z.ZodString;
        file_path: z.ZodString;
        from_agent: z.ZodString;
        to_agent: z.ZodString;
        handoff_type: z.ZodEnum<["edit_continuation", "review", "testing", "deployment"]>;
        context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        ctk_lock_id: z.ZodOptional<z.ZodString>;
        handoff_status: z.ZodEnum<["requested", "accepted", "in_progress", "completed", "failed"]>;
        requested_at: z.ZodString;
        completed_at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        from_agent: string;
        to_agent: string;
        handoff_id: string;
        file_path: string;
        handoff_type: "edit_continuation" | "review" | "testing" | "deployment";
        handoff_status: "completed" | "failed" | "accepted" | "in_progress" | "requested";
        requested_at: string;
        completed_at?: string | undefined;
        context?: Record<string, unknown> | undefined;
        ctk_lock_id?: string | undefined;
    }, {
        from_agent: string;
        to_agent: string;
        handoff_id: string;
        file_path: string;
        handoff_type: "edit_continuation" | "review" | "testing" | "deployment";
        handoff_status: "completed" | "failed" | "accepted" | "in_progress" | "requested";
        requested_at: string;
        completed_at?: string | undefined;
        context?: Record<string, unknown> | undefined;
        ctk_lock_id?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "agent_file_handoff";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        from_agent: string;
        to_agent: string;
        handoff_id: string;
        file_path: string;
        handoff_type: "edit_continuation" | "review" | "testing" | "deployment";
        handoff_status: "completed" | "failed" | "accepted" | "in_progress" | "requested";
        requested_at: string;
        completed_at?: string | undefined;
        context?: Record<string, unknown> | undefined;
        ctk_lock_id?: string | undefined;
    };
}, {
    id: string;
    type: "agent_file_handoff";
    project_key: string;
    timestamp: string;
    sequence: number;
    data: {
        from_agent: string;
        to_agent: string;
        handoff_id: string;
        file_path: string;
        handoff_type: "edit_continuation" | "review" | "testing" | "deployment";
        handoff_status: "completed" | "failed" | "accepted" | "in_progress" | "requested";
        requested_at: string;
        completed_at?: string | undefined;
        context?: Record<string, unknown> | undefined;
        ctk_lock_id?: string | undefined;
    };
}>;
/**
 * Agent Performance Metrics
 */
export declare const AgentMetricsSchema: z.ZodObject<{
    agent_id: z.ZodString;
    timestamp: z.ZodString;
    metrics: z.ZodObject<{
        tasks_completed: z.ZodNumber;
        tasks_failed: z.ZodNumber;
        average_task_duration_ms: z.ZodNumber;
        success_rate: z.ZodNumber;
        current_workload: z.ZodNumber;
        resource_usage: z.ZodObject<{
            memory_mb: z.ZodNumber;
            cpu_percent: z.ZodNumber;
            active_connections: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            memory_mb: number;
            cpu_percent: number;
            active_connections: number;
        }, {
            memory_mb: number;
            cpu_percent: number;
            active_connections: number;
        }>;
        communication_metrics: z.ZodObject<{
            messages_sent: z.ZodNumber;
            messages_received: z.ZodNumber;
            average_response_time_ms: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            messages_sent: number;
            messages_received: number;
            average_response_time_ms: number;
        }, {
            messages_sent: number;
            messages_received: number;
            average_response_time_ms: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        current_workload: number;
        tasks_completed: number;
        tasks_failed: number;
        average_task_duration_ms: number;
        success_rate: number;
        resource_usage: {
            memory_mb: number;
            cpu_percent: number;
            active_connections: number;
        };
        communication_metrics: {
            messages_sent: number;
            messages_received: number;
            average_response_time_ms: number;
        };
    }, {
        current_workload: number;
        tasks_completed: number;
        tasks_failed: number;
        average_task_duration_ms: number;
        success_rate: number;
        resource_usage: {
            memory_mb: number;
            cpu_percent: number;
            active_connections: number;
        };
        communication_metrics: {
            messages_sent: number;
            messages_received: number;
            average_response_time_ms: number;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    metrics: {
        current_workload: number;
        tasks_completed: number;
        tasks_failed: number;
        average_task_duration_ms: number;
        success_rate: number;
        resource_usage: {
            memory_mb: number;
            cpu_percent: number;
            active_connections: number;
        };
        communication_metrics: {
            messages_sent: number;
            messages_received: number;
            average_response_time_ms: number;
        };
    };
    agent_id: string;
}, {
    timestamp: string;
    metrics: {
        current_workload: number;
        tasks_completed: number;
        tasks_failed: number;
        average_task_duration_ms: number;
        success_rate: number;
        resource_usage: {
            memory_mb: number;
            cpu_percent: number;
            active_connections: number;
        };
        communication_metrics: {
            messages_sent: number;
            messages_received: number;
            average_response_time_ms: number;
        };
    };
    agent_id: string;
}>;
/**
 * Agent Task Dependencies
 */
export declare const TaskDependencySchema: z.ZodObject<{
    dependency_id: z.ZodString;
    task_id: z.ZodString;
    depends_on_task: z.ZodString;
    dependency_type: z.ZodEnum<["completion", "success", "data", "resource"]>;
    required_agent: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    dependency_id: string;
    task_id: string;
    depends_on_task: string;
    dependency_type: "data" | "success" | "completion" | "resource";
    required_agent?: string | undefined;
}, {
    dependency_id: string;
    task_id: string;
    depends_on_task: string;
    dependency_type: "data" | "success" | "completion" | "resource";
    required_agent?: string | undefined;
}>;
/**
 * Agent Health Status
 */
export declare const AgentHealthSchema: z.ZodObject<{
    agent_id: z.ZodString;
    status: z.ZodEnum<["healthy", "degraded", "unhealthy", "offline"]>;
    last_check: z.ZodString;
    checks: z.ZodObject<{
        heartbeat: z.ZodBoolean;
        memory_usage: z.ZodBoolean;
        cpu_usage: z.ZodBoolean;
        communication: z.ZodBoolean;
        task_processing: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        heartbeat: boolean;
        memory_usage: boolean;
        cpu_usage: boolean;
        communication: boolean;
        task_processing: boolean;
    }, {
        heartbeat: boolean;
        memory_usage: boolean;
        cpu_usage: boolean;
        communication: boolean;
        task_processing: boolean;
    }>;
    issues: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        severity: z.ZodEnum<["info", "warning", "error", "critical"]>;
        message: z.ZodString;
        detected_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: string;
        message: string;
        severity: "error" | "critical" | "info" | "warning";
        detected_at: string;
    }, {
        type: string;
        message: string;
        severity: "error" | "critical" | "info" | "warning";
        detected_at: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    status: "offline" | "healthy" | "degraded" | "unhealthy";
    agent_id: string;
    last_check: string;
    checks: {
        heartbeat: boolean;
        memory_usage: boolean;
        cpu_usage: boolean;
        communication: boolean;
        task_processing: boolean;
    };
    issues?: {
        type: string;
        message: string;
        severity: "error" | "critical" | "info" | "warning";
        detected_at: string;
    }[] | undefined;
}, {
    status: "offline" | "healthy" | "degraded" | "unhealthy";
    agent_id: string;
    last_check: string;
    checks: {
        heartbeat: boolean;
        memory_usage: boolean;
        cpu_usage: boolean;
        communication: boolean;
        task_processing: boolean;
    };
    issues?: {
        type: string;
        message: string;
        severity: "error" | "critical" | "info" | "warning";
        detected_at: string;
    }[] | undefined;
}>;
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
export declare const AgentCoordinationConfigSchema: z.ZodObject<{
    max_concurrent_agents: z.ZodDefault<z.ZodNumber>;
    default_assignment_timeout_ms: z.ZodDefault<z.ZodNumber>;
    heartbeat_interval_ms: z.ZodDefault<z.ZodNumber>;
    agent_timeout_ms: z.ZodDefault<z.ZodNumber>;
    task_retry_limit: z.ZodDefault<z.ZodNumber>;
    escalation_threshold: z.ZodDefault<z.ZodNumber>;
    communication_timeout_ms: z.ZodDefault<z.ZodNumber>;
    enable_auto_scaling: z.ZodDefault<z.ZodBoolean>;
    enable_load_balancing: z.ZodDefault<z.ZodBoolean>;
    enable_priority_routing: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    max_concurrent_agents: number;
    default_assignment_timeout_ms: number;
    heartbeat_interval_ms: number;
    agent_timeout_ms: number;
    task_retry_limit: number;
    escalation_threshold: number;
    communication_timeout_ms: number;
    enable_auto_scaling: boolean;
    enable_load_balancing: boolean;
    enable_priority_routing: boolean;
}, {
    max_concurrent_agents?: number | undefined;
    default_assignment_timeout_ms?: number | undefined;
    heartbeat_interval_ms?: number | undefined;
    agent_timeout_ms?: number | undefined;
    task_retry_limit?: number | undefined;
    escalation_threshold?: number | undefined;
    communication_timeout_ms?: number | undefined;
    enable_auto_scaling?: boolean | undefined;
    enable_load_balancing?: boolean | undefined;
    enable_priority_routing?: boolean | undefined;
}>;
export type AgentCoordinationConfig = z.infer<typeof AgentCoordinationConfigSchema>;
//# sourceMappingURL=agents.d.ts.map