/**
 * Agent Types and Validation Schemas
 *
 * Zod validation schemas for agent coordination
 */
import { z } from 'zod';
export declare enum AgentType {
    FRONTEND = "frontend",
    BACKEND = "backend",
    TESTING = "testing",
    DOCUMENTATION = "documentation",
    SECURITY = "security",
    PERFORMANCE = "performance"
}
export interface AgentConfig {
    timeout?: number;
    retries?: number;
    resources?: {
        memory?: string;
        cpu?: string;
    };
    environment?: Record<string, string>;
}
export interface AgentSpawnRequest {
    type: AgentType;
    task?: string;
    metadata?: Record<string, any>;
    config?: AgentConfig;
}
export declare const AgentTypeSchema: z.ZodEnum<[AgentType.FRONTEND, AgentType.BACKEND, AgentType.TESTING, AgentType.DOCUMENTATION, AgentType.SECURITY, AgentType.PERFORMANCE]>;
export declare const AgentConfigSchema: z.ZodObject<{
    timeout: z.ZodOptional<z.ZodNumber>;
    retries: z.ZodOptional<z.ZodNumber>;
    resources: z.ZodOptional<z.ZodObject<{
        memory: z.ZodOptional<z.ZodString>;
        cpu: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        memory?: string | undefined;
        cpu?: string | undefined;
    }, {
        memory?: string | undefined;
        cpu?: string | undefined;
    }>>;
    environment: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    timeout?: number | undefined;
    retries?: number | undefined;
    resources?: {
        memory?: string | undefined;
        cpu?: string | undefined;
    } | undefined;
    environment?: Record<string, string> | undefined;
}, {
    timeout?: number | undefined;
    retries?: number | undefined;
    resources?: {
        memory?: string | undefined;
        cpu?: string | undefined;
    } | undefined;
    environment?: Record<string, string> | undefined;
}>;
export declare const AgentSpawnRequestSchema: z.ZodObject<{
    type: z.ZodEnum<[AgentType.FRONTEND, AgentType.BACKEND, AgentType.TESTING, AgentType.DOCUMENTATION, AgentType.SECURITY, AgentType.PERFORMANCE]>;
    task: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    config: z.ZodOptional<z.ZodObject<{
        timeout: z.ZodOptional<z.ZodNumber>;
        retries: z.ZodOptional<z.ZodNumber>;
        resources: z.ZodOptional<z.ZodObject<{
            memory: z.ZodOptional<z.ZodString>;
            cpu: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            memory?: string | undefined;
            cpu?: string | undefined;
        }, {
            memory?: string | undefined;
            cpu?: string | undefined;
        }>>;
        environment: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        timeout?: number | undefined;
        retries?: number | undefined;
        resources?: {
            memory?: string | undefined;
            cpu?: string | undefined;
        } | undefined;
        environment?: Record<string, string> | undefined;
    }, {
        timeout?: number | undefined;
        retries?: number | undefined;
        resources?: {
            memory?: string | undefined;
            cpu?: string | undefined;
        } | undefined;
        environment?: Record<string, string> | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: AgentType;
    metadata?: Record<string, unknown> | undefined;
    config?: {
        timeout?: number | undefined;
        retries?: number | undefined;
        resources?: {
            memory?: string | undefined;
            cpu?: string | undefined;
        } | undefined;
        environment?: Record<string, string> | undefined;
    } | undefined;
    task?: string | undefined;
}, {
    type: AgentType;
    metadata?: Record<string, unknown> | undefined;
    config?: {
        timeout?: number | undefined;
        retries?: number | undefined;
        resources?: {
            memory?: string | undefined;
            cpu?: string | undefined;
        } | undefined;
        environment?: Record<string, string> | undefined;
    } | undefined;
    task?: string | undefined;
}>;
export declare const AgentUpdateRequestSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["idle", "busy", "error"]>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    heartbeat: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status?: "idle" | "busy" | "error" | undefined;
    metadata?: Record<string, unknown> | undefined;
    heartbeat?: boolean | undefined;
}, {
    status?: "idle" | "busy" | "error" | undefined;
    metadata?: Record<string, unknown> | undefined;
    heartbeat?: boolean | undefined;
}>;
export declare const AgentCapabilitySchema: z.ZodObject<{
    id: z.ZodString;
    agentId: z.ZodString;
    capability: z.ZodString;
    version: z.ZodString;
    enabled: z.ZodBoolean;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    agentId: string;
    capability: string;
    enabled: boolean;
    config?: Record<string, unknown> | undefined;
}, {
    id: string;
    version: string;
    agentId: string;
    capability: string;
    enabled: boolean;
    config?: Record<string, unknown> | undefined;
}>;
export declare const AgentSpecializationSchema: z.ZodObject<{
    id: z.ZodString;
    agentId: z.ZodString;
    specialization: z.ZodString;
    proficiency: z.ZodNumber;
    experience: z.ZodNumber;
    certifications: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    agentId: string;
    specialization: string;
    proficiency: number;
    experience: number;
    certifications?: string[] | undefined;
}, {
    id: string;
    agentId: string;
    specialization: string;
    proficiency: number;
    experience: number;
    certifications?: string[] | undefined;
}>;
export declare const TaskAssignmentSchema: z.ZodObject<{
    taskId: z.ZodString;
    agentId: z.ZodString;
    assignedAt: z.ZodString;
    deadline: z.ZodOptional<z.ZodString>;
    priority: z.ZodEnum<["low", "medium", "high", "critical"]>;
    requirements: z.ZodOptional<z.ZodObject<{
        skills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        resources: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        resources?: Record<string, string> | undefined;
        skills?: string[] | undefined;
        tools?: string[] | undefined;
    }, {
        resources?: Record<string, string> | undefined;
        skills?: string[] | undefined;
        tools?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    priority: "medium" | "low" | "high" | "critical";
    agentId: string;
    taskId: string;
    assignedAt: string;
    deadline?: string | undefined;
    requirements?: {
        resources?: Record<string, string> | undefined;
        skills?: string[] | undefined;
        tools?: string[] | undefined;
    } | undefined;
}, {
    priority: "medium" | "low" | "high" | "critical";
    agentId: string;
    taskId: string;
    assignedAt: string;
    deadline?: string | undefined;
    requirements?: {
        resources?: Record<string, string> | undefined;
        skills?: string[] | undefined;
        tools?: string[] | undefined;
    } | undefined;
}>;
export declare const AgentPerformanceSchema: z.ZodObject<{
    agentId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    metrics: z.ZodObject<{
        executionTime: z.ZodNumber;
        accuracy: z.ZodNumber;
        efficiency: z.ZodNumber;
        resourceUsage: z.ZodObject<{
            memory: z.ZodNumber;
            cpu: z.ZodNumber;
            disk: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            memory: number;
            cpu: number;
            disk?: number | undefined;
        }, {
            memory: number;
            cpu: number;
            disk?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        resourceUsage: {
            memory: number;
            cpu: number;
            disk?: number | undefined;
        };
        executionTime: number;
        accuracy: number;
        efficiency: number;
    }, {
        resourceUsage: {
            memory: number;
            cpu: number;
            disk?: number | undefined;
        };
        executionTime: number;
        accuracy: number;
        efficiency: number;
    }>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    metrics: {
        resourceUsage: {
            memory: number;
            cpu: number;
            disk?: number | undefined;
        };
        executionTime: number;
        accuracy: number;
        efficiency: number;
    };
    agentId: string;
    taskId?: string | undefined;
}, {
    timestamp: string;
    metrics: {
        resourceUsage: {
            memory: number;
            cpu: number;
            disk?: number | undefined;
        };
        executionTime: number;
        accuracy: number;
        efficiency: number;
    };
    agentId: string;
    taskId?: string | undefined;
}>;
export declare class AgentValidator {
    /**
     * Validate agent spawn request
     */
    static validateSpawnRequest(data: unknown): AgentSpawnRequest;
    /**
     * Validate agent configuration
     */
    static validateConfig(data: unknown): AgentConfig;
    /**
     * Validate agent type
     */
    static validateAgentType(type: string): AgentType;
    /**
     * Validate agent ID format
     */
    static validateAgentId(id: string): boolean;
    /**
     * Validate task assignment
     */
    static validateTaskAssignment(data: unknown): z.infer<typeof TaskAssignmentSchema>;
    /**
     * Check if agent type is suitable for task type
     */
    static isAgentSuitableForTask(agentType: AgentType, taskType: string): boolean;
    /**
     * Get recommended agents for task type
     */
    static getRecommendedAgents(taskType: string): AgentType[];
}
//# sourceMappingURL=validation.d.ts.map