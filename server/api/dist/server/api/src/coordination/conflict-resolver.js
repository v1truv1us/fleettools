/**
 * Conflict Resolver for FleetTools Coordination System
 *
 * Detects and resolves conflicts between agents
 * Handles resource, task, and data conflicts
 */
import { randomUUID } from 'node:crypto';
export var ConflictType;
(function (ConflictType) {
    ConflictType["RESOURCE"] = "resource";
    ConflictType["TASK"] = "task";
    ConflictType["DATA"] = "data";
})(ConflictType || (ConflictType = {}));
export var ConflictSeverity;
(function (ConflictSeverity) {
    ConflictSeverity["LOW"] = "low";
    ConflictSeverity["MEDIUM"] = "medium";
    ConflictSeverity["HIGH"] = "high";
    ConflictSeverity["CRITICAL"] = "critical";
})(ConflictSeverity || (ConflictSeverity = {}));
export var ConflictResolution;
(function (ConflictResolution) {
    ConflictResolution["FIRST_COME_FIRST_SERVE"] = "first_come_first_serve";
    ConflictResolution["PRIORITY_BASED"] = "priority_based";
    ConflictResolution["RESOURCE_SHARING"] = "resource_sharing";
    ConflictResolution["TASK_SPLITTING"] = "task_splitting";
    ConflictResolution["AGENT_COOPERATION"] = "agent_cooperation";
    ConflictResolution["ARBITRATION"] = "arbitration";
})(ConflictResolution || (ConflictResolution = {}));
export class ConflictResolver {
    config;
    conflicts = new Map();
    resources = new Map();
    constructor(config = {}) {
        this.config = {
            strategies: this.getDefaultStrategies(),
            autoResolveThreshold: ConflictSeverity.MEDIUM,
            arbitrationRequired: false,
            conflictRetentionDays: 7,
            ...config
        };
        console.log('✓ ConflictResolver initialized');
    }
    /**
     * Detect potential conflicts between agents
     */
    async detectConflicts(agents) {
        const detectedConflicts = [];
        // Check for resource conflicts
        const resourceConflicts = await this.detectResourceConflicts(agents);
        detectedConflicts.push(...resourceConflicts);
        // Check for task conflicts
        const taskConflicts = await this.detectTaskConflicts(agents);
        detectedConflicts.push(...taskConflicts);
        // Check for data conflicts
        const dataConflicts = await this.detectDataConflicts(agents);
        detectedConflicts.push(...dataConflicts);
        // Store detected conflicts
        detectedConflicts.forEach(conflict => {
            this.conflicts.set(conflict.id, conflict);
        });
        if (detectedConflicts.length > 0) {
            console.log(`⚠️ Detected ${detectedConflicts.length} conflicts`);
        }
        return detectedConflicts;
    }
    /**
     * Detect resource conflicts between agents
     */
    async detectResourceConflicts(agents) {
        const conflicts = [];
        const resourceUsage = new Map(); // resource -> agents
        // Map resource usage
        agents.forEach(agent => {
            if (agent.resources) {
                agent.resources.forEach(resource => {
                    if (!resourceUsage.has(resource)) {
                        resourceUsage.set(resource, []);
                    }
                    resourceUsage.get(resource).push(agent.id);
                });
            }
        });
        // Find conflicts (multiple agents using same resource)
        for (const [resource, agentIds] of resourceUsage.entries()) {
            if (agentIds.length > 1) {
                const conflict = {
                    id: `cfl_${randomUUID()}`,
                    type: ConflictType.RESOURCE,
                    agents: agentIds,
                    description: `Multiple agents accessing resource: ${resource}`,
                    severity: this.assessResourceConflictSeverity(resource, agentIds),
                    detectedAt: new Date().toISOString(),
                    metadata: {
                        resource,
                        resourceType: this.inferResourceType(resource),
                        conflictingAgents: agentIds
                    }
                };
                conflicts.push(conflict);
            }
        }
        return conflicts;
    }
    /**
     * Detect task conflicts between agents
     */
    async detectTaskConflicts(agents) {
        const conflicts = [];
        const taskAssignments = new Map(); // task -> agents
        // Map task assignments
        agents.forEach(agent => {
            if (agent.currentTask) {
                if (!taskAssignments.has(agent.currentTask)) {
                    taskAssignments.set(agent.currentTask, []);
                }
                taskAssignments.get(agent.currentTask).push(agent.id);
            }
        });
        // Find conflicts (multiple agents working on same task)
        for (const [task, agentIds] of taskAssignments.entries()) {
            if (agentIds.length > 1) {
                const conflict = {
                    id: `cfl_${randomUUID()}`,
                    type: ConflictType.TASK,
                    agents: agentIds,
                    description: `Multiple agents working on task: ${task}`,
                    severity: ConflictSeverity.HIGH,
                    detectedAt: new Date().toISOString(),
                    metadata: {
                        task,
                        conflictingAgents: agentIds,
                        taskType: this.inferTaskType(task)
                    }
                };
                conflicts.push(conflict);
            }
        }
        return conflicts;
    }
    /**
     * Detect data conflicts between agents
     */
    async detectDataConflicts(agents) {
        const conflicts = [];
        const dataAccess = new Map(); // data -> agents
        // Map data access based on metadata
        agents.forEach(agent => {
            if (agent.metadata) {
                const accessedData = this.extractAccessedData(agent.metadata);
                accessedData.forEach(data => {
                    if (!dataAccess.has(data)) {
                        dataAccess.set(data, []);
                    }
                    dataAccess.get(data).push(agent.id);
                });
            }
        });
        // Find conflicts (simultaneous write access)
        for (const [data, agentIds] of dataAccess.entries()) {
            if (agentIds.length > 1) {
                const conflict = {
                    id: `cfl_${randomUUID()}`,
                    type: ConflictType.DATA,
                    agents: agentIds,
                    description: `Concurrent data access: ${data}`,
                    severity: this.assessDataConflictSeverity(data, agentIds),
                    detectedAt: new Date().toISOString(),
                    metadata: {
                        data,
                        conflictingAgents: agentIds,
                        accessType: 'write'
                    }
                };
                conflicts.push(conflict);
            }
        }
        return conflicts;
    }
    /**
     * Resolve detected conflicts
     */
    async resolveConflict(conflictId) {
        const conflict = this.conflicts.get(conflictId);
        if (!conflict) {
            throw new Error(`Conflict not found: ${conflictId}`);
        }
        // Check if already resolved
        if (conflict.resolvedAt) {
            return conflict;
        }
        // Find applicable resolution strategy
        const strategy = this.findResolutionStrategy(conflict);
        // Apply resolution
        const resolutionResult = await this.applyResolution(conflict, strategy);
        // Update conflict
        conflict.resolvedAt = new Date().toISOString();
        conflict.resolution = strategy;
        conflict.resolutionDetails = resolutionResult.description;
        this.conflicts.set(conflictId, conflict);
        console.log(`✓ Resolved conflict ${conflictId} using ${strategy} strategy`);
        return conflict;
    }
    /**
     * Find appropriate resolution strategy for conflict
     */
    findResolutionStrategy(conflict) {
        // Find matching strategies
        const applicableStrategies = this.config.strategies.filter(strategy => strategy.conflictType === conflict.type &&
            (strategy.severity === conflict.severity || strategy.severity === ConflictSeverity.CRITICAL));
        if (applicableStrategies.length === 0) {
            return ConflictResolution.FIRST_COME_FIRST_SERVE;
        }
        // Sort by priority and return highest priority
        applicableStrategies.sort((a, b) => b.priority - a.priority);
        return applicableStrategies[0].strategy;
    }
    /**
     * Apply resolution strategy to conflict
     */
    async applyResolution(conflict, strategy) {
        switch (strategy) {
            case ConflictResolution.FIRST_COME_FIRST_SERVE:
                return this.applyFirstComeFirstServe(conflict);
            case ConflictResolution.PRIORITY_BASED:
                return this.applyPriorityBased(conflict);
            case ConflictResolution.RESOURCE_SHARING:
                return this.applyResourceSharing(conflict);
            case ConflictResolution.TASK_SPLITTING:
                return this.applyTaskSplitting(conflict);
            case ConflictResolution.AGENT_COOPERATION:
                return this.applyAgentCooperation(conflict);
            case ConflictResolution.ARBITRATION:
                return this.applyArbitration(conflict);
            default:
                return this.applyFirstComeFirstServe(conflict);
        }
    }
    /**
     * Apply first-come-first-serve resolution
     */
    applyFirstComeFirstServe(conflict) {
        const winner = conflict.agents[0]; // First agent gets priority
        const losers = conflict.agents.slice(1);
        return {
            description: `Agent ${winner} retains access, others must wait`,
            actions: [
                `Grant continued access to agent ${winner}`,
                `Request ${losers.join(', ')} to release resources`,
                `Queue ${losers.join(', ')} for later access`
            ]
        };
    }
    /**
     * Apply priority-based resolution
     */
    applyPriorityBased(conflict) {
        // For now, use agent order as priority (in real implementation, this would use agent priorities)
        const winner = conflict.agents[0];
        const losers = conflict.agents.slice(1);
        return {
            description: `Higher priority agent ${winner} wins conflict`,
            actions: [
                `Assign priority to agent ${winner}`,
                `Suspend work for ${losers.join(', ')}`,
                `Resume suspended agents when resource available`
            ]
        };
    }
    /**
     * Apply resource sharing resolution
     */
    applyResourceSharing(conflict) {
        return {
            description: `Enable resource sharing between agents ${conflict.agents.join(', ')}`,
            actions: [
                `Convert resource locks to shared mode`,
                `Coordinate access between all agents`,
                `Monitor for additional conflicts`
            ]
        };
    }
    /**
     * Apply task splitting resolution
     */
    applyTaskSplitting(conflict) {
        return {
            description: `Split task to avoid agent conflicts`,
            actions: [
                `Divide task into subtasks`,
                `Assign subtasks to different agents`,
                `Coordinate subtask integration`
            ]
        };
    }
    /**
     * Apply agent cooperation resolution
     */
    applyAgentCooperation(conflict) {
        return {
            description: `Enable cooperation between agents ${conflict.agents.join(', ')}`,
            actions: [
                `Establish communication channel between agents`,
                `Define shared responsibility areas`,
                `Create cooperation protocol`
            ]
        };
    }
    /**
     * Apply arbitration resolution
     */
    applyArbitration(conflict) {
        // Simple arbitration based on agent ID (in real implementation, this would be more sophisticated)
        const winner = conflict.agents.sort()[0];
        return {
            description: `Arbitration awards resource to agent ${winner}`,
            actions: [
                `Conduct arbitration between agents`,
                `Award resource access to agent ${winner}`,
                `Document arbitration decision`
            ]
        };
    }
    /**
     * Get all conflicts
     */
    getConflicts() {
        return Array.from(this.conflicts.values());
    }
    /**
     * Get unresolved conflicts
     */
    getUnresolvedConflicts() {
        return Array.from(this.conflicts.values()).filter(conflict => !conflict.resolvedAt);
    }
    /**
     * Auto-resolve conflicts below threshold
     */
    async autoResolveConflicts() {
        const unresolvedConflicts = this.getUnresolvedConflicts();
        const autoResolvable = unresolvedConflicts.filter(conflict => this.isSeverityBelowThreshold(conflict.severity));
        const resolved = [];
        for (const conflict of autoResolvable) {
            try {
                const resolvedConflict = await this.resolveConflict(conflict.id);
                resolved.push(resolvedConflict);
            }
            catch (error) {
                console.error(`Failed to auto-resolve conflict ${conflict.id}:`, error);
            }
        }
        if (resolved.length > 0) {
            console.log(`🤖 Auto-resolved ${resolved.length} conflicts`);
        }
        return resolved;
    }
    /**
     * Helper methods
     */
    assessResourceConflictSeverity(resource, agentIds) {
        if (resource.includes('critical') || resource.includes('system')) {
            return ConflictSeverity.CRITICAL;
        }
        if (resource.includes('database') || resource.includes('auth')) {
            return ConflictSeverity.HIGH;
        }
        if (agentIds.length > 3) {
            return ConflictSeverity.HIGH;
        }
        return ConflictSeverity.MEDIUM;
    }
    assessDataConflictSeverity(data, agentIds) {
        if (data.includes('sensitive') || data.includes('critical')) {
            return ConflictSeverity.CRITICAL;
        }
        if (agentIds.length > 2) {
            return ConflictSeverity.HIGH;
        }
        return ConflictSeverity.MEDIUM;
    }
    inferResourceType(resource) {
        if (resource.includes('file'))
            return 'file';
        if (resource.includes('port'))
            return 'port';
        if (resource.includes('memory') || resource.includes('cpu'))
            return 'system';
        return 'unknown';
    }
    inferTaskType(task) {
        if (task.includes('api'))
            return 'api_development';
        if (task.includes('test'))
            return 'testing';
        if (task.includes('doc'))
            return 'documentation';
        return 'general';
    }
    extractAccessedData(metadata) {
        const accessedData = [];
        if (metadata.files) {
            accessedData.push(...metadata.files);
        }
        if (metadata.databases) {
            accessedData.push(...metadata.databases);
        }
        if (metadata.endpoints) {
            accessedData.push(...metadata.endpoints);
        }
        return accessedData;
    }
    isSeverityBelowThreshold(severity) {
        const severityOrder = [
            ConflictSeverity.LOW,
            ConflictSeverity.MEDIUM,
            ConflictSeverity.HIGH,
            ConflictSeverity.CRITICAL
        ];
        const thresholdIndex = severityOrder.indexOf(this.config.autoResolveThreshold);
        const severityIndex = severityOrder.indexOf(severity);
        return severityIndex <= thresholdIndex;
    }
    /**
     * Get default resolution strategies
     */
    getDefaultStrategies() {
        return [
            {
                conflictType: ConflictType.RESOURCE,
                severity: ConflictSeverity.LOW,
                strategy: ConflictResolution.RESOURCE_SHARING,
                priority: 1
            },
            {
                conflictType: ConflictType.RESOURCE,
                severity: ConflictSeverity.MEDIUM,
                strategy: ConflictResolution.PRIORITY_BASED,
                priority: 2
            },
            {
                conflictType: ConflictType.RESOURCE,
                severity: ConflictSeverity.HIGH,
                strategy: ConflictResolution.FIRST_COME_FIRST_SERVE,
                priority: 3
            },
            {
                conflictType: ConflictType.RESOURCE,
                severity: ConflictSeverity.CRITICAL,
                strategy: ConflictResolution.ARBITRATION,
                priority: 4
            },
            {
                conflictType: ConflictType.TASK,
                severity: ConflictSeverity.MEDIUM,
                strategy: ConflictResolution.TASK_SPLITTING,
                priority: 2
            },
            {
                conflictType: ConflictType.TASK,
                severity: ConflictSeverity.HIGH,
                strategy: ConflictResolution.AGENT_COOPERATION,
                priority: 3
            },
            {
                conflictType: ConflictType.DATA,
                severity: ConflictSeverity.LOW,
                strategy: ConflictResolution.RESOURCE_SHARING,
                priority: 1
            },
            {
                conflictType: ConflictType.DATA,
                severity: ConflictSeverity.MEDIUM,
                strategy: ConflictResolution.FIRST_COME_FIRST_SERVE,
                priority: 2
            },
            {
                conflictType: ConflictType.DATA,
                severity: ConflictSeverity.HIGH,
                strategy: ConflictResolution.ARBITRATION,
                priority: 3
            }
        ];
    }
    /**
     * Clean up old resolved conflicts
     */
    cleanupOldConflicts() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.conflictRetentionDays);
        let cleanedCount = 0;
        for (const [conflictId, conflict] of this.conflicts.entries()) {
            if (conflict.resolvedAt && new Date(conflict.resolvedAt) < cutoffDate) {
                this.conflicts.delete(conflictId);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} old conflicts`);
        }
    }
}
//# sourceMappingURL=conflict-resolver.js.map