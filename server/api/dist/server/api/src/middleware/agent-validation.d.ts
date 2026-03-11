/**
 * Agent Validation Schemas
 *
 * Zod validation schemas for agent coordination
 */
import { z } from 'zod';
export declare const AgentTypeSchema: z.ZodEnum<["frontend", "backend", "testing", "documentation", "security", "performance"]>;
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
    type: z.ZodEnum<["frontend", "backend", "testing", "documentation", "security", "performance"]>;
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
    type: "testing" | "backend" | "frontend" | "security" | "performance" | "documentation";
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
    type: "testing" | "backend" | "frontend" | "security" | "performance" | "documentation";
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
export declare class AgentValidator {
    /**
     * Validate agent spawn request
     */
    static validateSpawnRequest(data: unknown): {
        type: "testing" | "backend" | "frontend" | "security" | "performance" | "documentation";
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
    };
    /**
     * Validate agent configuration
     */
    static validateConfig(data: unknown): {
        timeout?: number | undefined;
        retries?: number | undefined;
        resources?: {
            memory?: string | undefined;
            cpu?: string | undefined;
        } | undefined;
        environment?: Record<string, string> | undefined;
    };
    /**
     * Validate agent type
     */
    static validateAgentType(type: string): "testing" | "backend" | "frontend" | "security" | "performance" | "documentation";
    /**
     * Validate agent ID format
     */
    static validateAgentId(id: string): boolean;
    /**
     * Check if agent type is suitable for task type
     */
    static isAgentSuitableForTask(agentType: string, taskType: string): boolean;
    /**
     * Get recommended agents for task type
     */
    static getRecommendedAgents(taskType: string): string[];
}
//# sourceMappingURL=agent-validation.d.ts.map