/**
 * FleetTools Dependency Resolver
 *
 * Resolves dependencies between sorties to determine:
 * - Topological ordering
 * - Parallel groups (sorties with no inter-group dependencies)
 * - Critical path (longest dependency chain)
 * - Cycle detection (error if circular dependencies exist)
 * - Duration estimation
 *
 * @version 1.0.0
 * @since 2026-01-08
 */
// ============================================================================
// DEPENDENCY RESOLVER CLASS
// ============================================================================
/**
 * Dependency Resolver
 * Analyzes sortie dependencies and determines execution order
 */
export class DependencyResolver {
    sorties;
    graph;
    logger;
    /**
     * Create new resolver
     */
    constructor(sorties) {
        this.sorties = new Map(sorties.map(s => [s.id, s]));
        this.graph = new Map();
        this.logger = console;
        this.buildGraph();
    }
    /**
     * Build dependency graph
     */
    buildGraph() {
        // Initialize nodes
        for (const sortie of this.sorties.values()) {
            this.graph.set(sortie.id, {
                sortie_id: sortie.id,
                dependencies: sortie.dependencies || [],
                dependents: [],
                depth: 0,
                critical_path_length: 0,
            });
        }
        // Build reverse edges (dependents)
        for (const node of this.graph.values()) {
            for (const depId of node.dependencies) {
                const depNode = this.graph.get(depId);
                if (depNode) {
                    depNode.dependents.push(node.sortie_id);
                }
            }
        }
        // Calculate depths
        this.calculateDepths();
        // Calculate critical path lengths
        this.calculateCriticalPaths();
    }
    /**
     * Calculate depth of each node (distance from root)
     */
    calculateDepths() {
        const visited = new Set();
        const queue = [];
        // Find root nodes (no dependencies)
        for (const node of this.graph.values()) {
            if (node.dependencies.length === 0) {
                queue.push(node.sortie_id);
                node.depth = 0;
                visited.add(node.sortie_id);
            }
        }
        // BFS to calculate depths
        while (queue.length > 0) {
            const nodeId = queue.shift();
            const node = this.graph.get(nodeId);
            for (const dependentId of node.dependents) {
                const dependent = this.graph.get(dependentId);
                dependent.depth = Math.max(dependent.depth, node.depth + 1);
                if (!visited.has(dependentId)) {
                    visited.add(dependentId);
                    queue.push(dependentId);
                }
            }
        }
    }
    /**
     * Calculate critical path length for each node
     */
    calculateCriticalPaths() {
        const visited = new Set();
        // DFS from leaf nodes
        const dfs = (nodeId) => {
            if (visited.has(nodeId)) {
                return this.graph.get(nodeId).critical_path_length;
            }
            visited.add(nodeId);
            const node = this.graph.get(nodeId);
            const sortie = this.sorties.get(nodeId);
            const duration = sortie.estimated_duration_ms || 1000; // Default 1 second
            if (node.dependents.length === 0) {
                // Leaf node
                node.critical_path_length = duration;
            }
            else {
                // Internal node
                const maxDependentPath = Math.max(...node.dependents.map(depId => dfs(depId)));
                node.critical_path_length = duration + maxDependentPath;
            }
            return node.critical_path_length;
        };
        for (const nodeId of this.graph.keys()) {
            dfs(nodeId);
        }
    }
    /**
     * Detect cycles in dependency graph
     */
    detectCycles() {
        const visited = new Set();
        const recursionStack = new Set();
        const cycleNodes = [];
        const hasCycle = (nodeId) => {
            visited.add(nodeId);
            recursionStack.add(nodeId);
            const node = this.graph.get(nodeId);
            for (const depId of node.dependencies) {
                if (!visited.has(depId)) {
                    if (hasCycle(depId)) {
                        return true;
                    }
                }
                else if (recursionStack.has(depId)) {
                    cycleNodes.push(nodeId, depId);
                    return true;
                }
            }
            recursionStack.delete(nodeId);
            return false;
        };
        for (const nodeId of this.graph.keys()) {
            if (!visited.has(nodeId)) {
                if (hasCycle(nodeId)) {
                    return { hasCycles: true, cycleNodes };
                }
            }
        }
        return { hasCycles: false };
    }
    /**
     * Topological sort using Kahn's algorithm
     */
    topologicalSort() {
        const inDegree = new Map();
        const queue = [];
        // Initialize in-degrees
        for (const node of this.graph.values()) {
            inDegree.set(node.sortie_id, node.dependencies.length);
            if (node.dependencies.length === 0) {
                queue.push(node.sortie_id);
            }
        }
        const result = [];
        while (queue.length > 0) {
            const nodeId = queue.shift();
            result.push(nodeId);
            const node = this.graph.get(nodeId);
            for (const dependentId of node.dependents) {
                const degree = inDegree.get(dependentId) - 1;
                inDegree.set(dependentId, degree);
                if (degree === 0) {
                    queue.push(dependentId);
                }
            }
        }
        return result;
    }
    /**
     * Identify parallel groups
     * Sorties in the same group have no inter-group dependencies
     */
    identifyParallelGroups() {
        const groups = [];
        const assigned = new Set();
        // Group by depth
        const depthGroups = new Map();
        for (const node of this.graph.values()) {
            if (!depthGroups.has(node.depth)) {
                depthGroups.set(node.depth, []);
            }
            depthGroups.get(node.depth).push(node.sortie_id);
        }
        // Create groups from depth levels
        for (let depth = 0; depth < Math.max(...Array.from(depthGroups.keys())); depth++) {
            const group = depthGroups.get(depth) || [];
            if (group.length > 0) {
                groups.push(group);
            }
        }
        return groups;
    }
    /**
     * Find critical path (longest dependency chain)
     */
    findCriticalPath() {
        let maxLength = 0;
        let criticalPathStart = null;
        // Find root node with longest critical path
        for (const node of this.graph.values()) {
            if (node.dependencies.length === 0 && node.critical_path_length > maxLength) {
                maxLength = node.critical_path_length;
                criticalPathStart = node.sortie_id;
            }
        }
        if (!criticalPathStart) {
            return [];
        }
        // Trace path
        const path = [criticalPathStart];
        let current = criticalPathStart;
        while (true) {
            const node = this.graph.get(current);
            if (node.dependents.length === 0) {
                break;
            }
            // Find dependent with longest critical path
            let nextNode = null;
            let maxPath = 0;
            for (const depId of node.dependents) {
                const depNode = this.graph.get(depId);
                if (depNode.critical_path_length > maxPath) {
                    maxPath = depNode.critical_path_length;
                    nextNode = depId;
                }
            }
            if (!nextNode) {
                break;
            }
            path.push(nextNode);
            current = nextNode;
        }
        return path;
    }
    /**
     * Resolve dependencies
     */
    resolve() {
        this.logger.log('[DependencyResolver] Resolving dependencies');
        // Check for cycles
        const cycleCheck = this.detectCycles();
        if (cycleCheck.hasCycles) {
            this.logger.error('[DependencyResolver] Circular dependencies detected:', cycleCheck.cycleNodes);
            return {
                success: false,
                topological_order: [],
                parallel_groups: [],
                critical_path: [],
                estimated_duration_ms: 0,
                has_cycles: true,
                cycle_nodes: cycleCheck.cycleNodes,
                error: `Circular dependencies detected: ${cycleCheck.cycleNodes?.join(', ')}`,
            };
        }
        // Topological sort
        const topologicalOrder = this.topologicalSort();
        // Identify parallel groups
        const parallelGroups = this.identifyParallelGroups();
        // Find critical path
        const criticalPath = this.findCriticalPath();
        // Calculate total duration
        let estimatedDuration = 0;
        for (const nodeId of criticalPath) {
            const sortie = this.sorties.get(nodeId);
            if (sortie) {
                estimatedDuration += sortie.estimated_duration_ms || 1000;
            }
        }
        this.logger.log('[DependencyResolver] Resolution complete');
        this.logger.log(`  - Topological order: ${topologicalOrder.length} sorties`);
        this.logger.log(`  - Parallel groups: ${parallelGroups.length}`);
        this.logger.log(`  - Critical path: ${criticalPath.length} sorties`);
        this.logger.log(`  - Estimated duration: ${estimatedDuration}ms`);
        return {
            success: true,
            topological_order: topologicalOrder,
            parallel_groups: parallelGroups,
            critical_path: criticalPath,
            estimated_duration_ms: estimatedDuration,
            has_cycles: false,
        };
    }
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Resolve dependencies for sorties
 */
export function resolveDependencies(sorties) {
    const resolver = new DependencyResolver(sorties);
    return resolver.resolve();
}
/**
 * Check if sorties have dependencies
 */
export function hasDependencies(sorties) {
    return sorties.some(s => s.dependencies && s.dependencies.length > 0);
}
/**
 * Get sorties with no dependencies
 */
export function getIndependentSorties(sorties) {
    return sorties.filter(s => !s.dependencies || s.dependencies.length === 0);
}
/**
 * Get sorties that depend on a specific sortie
 */
export function getDependentSorties(sorties, sortieId) {
    return sorties.filter(s => s.dependencies && s.dependencies.includes(sortieId));
}
//# sourceMappingURL=dependency-resolver.js.map