/**
 * Agent Validation Schemas
 *
 * Zod validation schemas for agent coordination
 */
import { z } from 'zod';
// Agent Type Schema
export const AgentTypeSchema = z.enum([
    'frontend',
    'backend',
    'testing',
    'documentation',
    'security',
    'performance'
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
     * Check if agent type is suitable for task type
     */
    static isAgentSuitableForTask(agentType, taskType) {
        const suitabilityMap = {
            'frontend': ['ui', 'frontend', 'component', 'interface'],
            'backend': ['api', 'backend', 'server', 'database'],
            'testing': ['test', 'testing', 'qa', 'validation'],
            'documentation': ['docs', 'documentation', 'readme', 'guide'],
            'security': ['security', 'audit', 'vulnerability', 'scan'],
            'performance': ['performance', 'optimization', 'benchmark', 'metrics']
        };
        const agentCapabilities = suitabilityMap[agentType] || [];
        return agentCapabilities.includes(taskType.toLowerCase());
    }
    /**
     * Get recommended agents for task type
     */
    static getRecommendedAgents(taskType) {
        const taskToAgents = {
            'ui': ['frontend'],
            'frontend': ['frontend'],
            'api': ['backend'],
            'backend': ['backend'],
            'test': ['testing'],
            'security': ['security'],
            'docs': ['documentation'],
            'performance': ['performance'],
            'general': ['backend', 'frontend'] // General tasks can go to multiple types
        };
        return taskToAgents[taskType.toLowerCase()] || ['backend']; // Default to backend
    }
}
//# sourceMappingURL=agent-validation.js.map