/**
 * Agent Types and Validation Schemas
 *
 * Zod validation schemas for agent coordination
 */
import { z } from 'zod';
// Define AgentType locally to avoid import conflicts
export var AgentType;
(function (AgentType) {
    AgentType["FRONTEND"] = "frontend";
    AgentType["BACKEND"] = "backend";
    AgentType["TESTING"] = "testing";
    AgentType["DOCUMENTATION"] = "documentation";
    AgentType["SECURITY"] = "security";
    AgentType["PERFORMANCE"] = "performance";
})(AgentType || (AgentType = {}));
// Enhanced AgentType with validation
export const AgentTypeSchema = z.enum([
    AgentType.FRONTEND,
    AgentType.BACKEND,
    AgentType.TESTING,
    AgentType.DOCUMENTATION,
    AgentType.SECURITY,
    AgentType.PERFORMANCE
]);
// Agent Configuration Schema
export const AgentConfigSchema = z.object({
    timeout: z.number().int().positive().optional(),
    retries: z.number().int().min(0).max(10).optional(),
    resources: z.object({
        memory: z.string().optional(),
        cpu: z.string().optional(),
    }).optional(),
    environment: z.record(z.string()).optional(),
});
// Agent Spawn Request Schema
export const AgentSpawnRequestSchema = z.object({
    type: AgentTypeSchema,
    task: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    config: AgentConfigSchema.optional(),
});
// Agent Update Request Schema
export const AgentUpdateRequestSchema = z.object({
    status: z.enum(['idle', 'busy', 'error']).optional(),
    metadata: z.record(z.unknown()).optional(),
    heartbeat: z.boolean().optional(),
});
// Agent Capability Schema
export const AgentCapabilitySchema = z.object({
    id: z.string().uuid(),
    agentId: z.string(),
    capability: z.string(),
    version: z.string(),
    enabled: z.boolean(),
    config: z.record(z.unknown()).optional(),
});
// Agent Specialization Schema
export const AgentSpecializationSchema = z.object({
    id: z.string().uuid(),
    agentId: z.string(),
    specialization: z.string(),
    proficiency: z.number().min(0).max(1), // 0-1 scale
    experience: z.number().int().min(0), // years
    certifications: z.array(z.string()).optional(),
});
// Task Assignment Schema
export const TaskAssignmentSchema = z.object({
    taskId: z.string(),
    agentId: z.string(),
    assignedAt: z.string().datetime(),
    deadline: z.string().datetime().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    requirements: z.object({
        skills: z.array(z.string()).optional(),
        tools: z.array(z.string()).optional(),
        resources: z.record(z.string()).optional(),
    }).optional(),
});
// Agent Performance Schema
export const AgentPerformanceSchema = z.object({
    agentId: z.string(),
    taskId: z.string().optional(),
    metrics: z.object({
        executionTime: z.number().min(0),
        accuracy: z.number().min(0).max(1),
        efficiency: z.number().min(0).max(1),
        resourceUsage: z.object({
            memory: z.number().min(0),
            cpu: z.number().min(0),
            disk: z.number().min(0).optional(),
        }),
    }),
    timestamp: z.string().datetime(),
});
// Validation functions
export class AgentValidator {
    /**
     * Validate agent spawn request
     */
    static validateSpawnRequest(data) {
        const result = AgentSpawnRequestSchema.safeParse(data);
        if (!result.success) {
            throw new Error(`Invalid spawn request: ${result.error.message}`);
        }
        return result.data;
    }
    /**
     * Validate agent configuration
     */
    static validateConfig(data) {
        const result = AgentConfigSchema.safeParse(data);
        if (!result.success) {
            throw new Error(`Invalid agent config: ${result.error.message}`);
        }
        return result.data;
    }
    /**
     * Validate agent type
     */
    static validateAgentType(type) {
        const result = AgentTypeSchema.safeParse(type);
        if (!result.success) {
            throw new Error(`Invalid agent type: ${result.error.message}`);
        }
        return result.data;
    }
    /**
     * Validate agent ID format
     */
    static validateAgentId(id) {
        // Agent IDs should follow pattern: agt_<uuid>
        const agentIdPattern = /^agt_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
        return agentIdPattern.test(id);
    }
    /**
     * Validate task assignment
     */
    static validateTaskAssignment(data) {
        const result = TaskAssignmentSchema.safeParse(data);
        if (!result.success) {
            throw new Error(`Invalid task assignment: ${result.error.message}`);
        }
        return result.data;
    }
    /**
     * Check if agent type is suitable for task type
     */
    static isAgentSuitableForTask(agentType, taskType) {
        const suitabilityMap = {
            [AgentType.FRONTEND]: ['ui', 'frontend', 'component', 'interface'],
            [AgentType.BACKEND]: ['api', 'backend', 'server', 'database'],
            [AgentType.TESTING]: ['test', 'testing', 'qa', 'validation'],
            [AgentType.DOCUMENTATION]: ['docs', 'documentation', 'readme', 'guide'],
            [AgentType.SECURITY]: ['security', 'audit', 'vulnerability', 'scan'],
            [AgentType.PERFORMANCE]: ['performance', 'optimization', 'benchmark', 'metrics']
        };
        const agentCapabilities = suitabilityMap[agentType] || [];
        return agentCapabilities.some(capability => taskType.toLowerCase().includes(capability));
    }
    /**
     * Get recommended agents for task type
     */
    static getRecommendedAgents(taskType) {
        const taskToAgents = {
            'ui': [AgentType.FRONTEND],
            'frontend': [AgentType.FRONTEND],
            'api': [AgentType.BACKEND],
            'backend': [AgentType.BACKEND],
            'test': [AgentType.TESTING],
            'security': [AgentType.SECURITY],
            'docs': [AgentType.DOCUMENTATION],
            'performance': [AgentType.PERFORMANCE],
            'general': [AgentType.BACKEND, AgentType.FRONTEND] // General tasks can go to multiple types
        };
        return taskToAgents[taskType.toLowerCase()] || [AgentType.BACKEND]; // Default to backend
    }
}
// Common task categories for validation
const AgentCapabilities = [
    'ui', 'frontend', 'component', 'interface',
    'api', 'backend', 'server', 'database',
    'test', 'testing', 'qa', 'validation',
    'docs', 'documentation', 'readme', 'guide',
    'security', 'audit', 'vulnerability', 'scan',
    'performance', 'optimization', 'benchmark', 'metrics',
    'general', 'utility', 'helper', 'tool'
];
//# sourceMappingURL=validation.js.map