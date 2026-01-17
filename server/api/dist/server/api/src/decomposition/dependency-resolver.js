/**
 * FleetTools Phase 4: Dependency Resolution
 *
 * Analyzes sortie dependencies to identify parallel groups, calculate
 * critical path, and estimate total duration.
 *
 * @since 4.0.0 - Initial implementation
 * @last-updated 2026-01-08
 */
/**
 * DecompositionDependencyResolver - Resolves sortie dependencies
 */
export class DecompositionDependencyResolver {
    /**
     * Resolve dependencies in a SortieTree
     */
    resolve(sortieTree) {
        const sortieMap = new Map(sortieTree.sorties.map(s => [s.id, s]));
        // Topologically sort sorties
        const sortedSorties = this.topologicalSort(sortieTree.sorties, sortieMap);
        // Identify parallel groups
        const parallelGroups = this.identifyParallelGroups(sortedSorties, sortieMap);
        // Calculate critical path
        const criticalPath = this.calculateCriticalPath(sortieTree.sorties, sortieMap);
        // Estimate total duration
        const estimatedDuration = this.estimateDuration(criticalPath);
        // Calculate max depth
        const maxDepth = this.calculateMaxDepth(sortieTree.sorties, sortieMap);
        // Check for circular dependencies
        const circularDependencies = this.findCircularDependencies(sortieTree.sorties, sortieMap);
        return {
            sorted_sorties: sortedSorties,
            parallel_groups: parallelGroups,
            critical_path: criticalPath,
            estimated_duration_ms: estimatedDuration,
            max_depth: maxDepth,
            circular_dependencies: circularDependencies.length > 0 ? circularDependencies : undefined,
        };
    }
    /**
     * Topologically sort sorties
     */
    topologicalSort(sorties, sortieMap) {
        const visited = new Set();
        const sorted = [];
        const visit = (sortieId) => {
            if (visited.has(sortieId))
                return;
            visited.add(sortieId);
            const sortie = sortieMap.get(sortieId);
            if (!sortie)
                return;
            // Visit dependencies first
            for (const depId of sortie.dependencies) {
                visit(depId);
            }
            sorted.push(sortie);
        };
        for (const sortie of sorties) {
            visit(sortie.id);
        }
        return sorted;
    }
    /**
     * Identify parallel groups
     */
    identifyParallelGroups(sortedSorties, sortieMap) {
        const groups = [];
        const processed = new Set();
        for (const sortie of sortedSorties) {
            if (processed.has(sortie.id))
                continue;
            const group = [sortie];
            processed.add(sortie.id);
            // Find other sorties that can run in parallel with this one
            for (const other of sortedSorties) {
                if (processed.has(other.id))
                    continue;
                // Check if other can run in parallel with all sorties in the group
                let canRunInParallel = true;
                for (const groupMember of group) {
                    if (!this.canRunInParallel(groupMember, other, sortieMap)) {
                        canRunInParallel = false;
                        break;
                    }
                }
                if (canRunInParallel) {
                    group.push(other);
                    processed.add(other.id);
                }
            }
            groups.push(group);
        }
        return groups;
    }
    /**
     * Check if two sorties can run in parallel
     */
    canRunInParallel(s1, s2, sortieMap) {
        // Check for direct dependencies
        if (s1.dependencies.includes(s2.id) || s2.dependencies.includes(s1.id)) {
            return false;
        }
        // Check for file overlap
        const files1 = new Set(s1.scope.files || []);
        const files2 = new Set(s2.scope.files || []);
        for (const file of files1) {
            if (files2.has(file)) {
                return false;
            }
        }
        // Check for transitive dependencies
        if (this.hasTransitiveDependency(s1.id, s2.id, sortieMap) ||
            this.hasTransitiveDependency(s2.id, s1.id, sortieMap)) {
            return false;
        }
        return true;
    }
    /**
     * Check if there's a transitive dependency
     */
    hasTransitiveDependency(fromId, toId, sortieMap, visited = new Set()) {
        if (visited.has(fromId))
            return false;
        visited.add(fromId);
        const sortie = sortieMap.get(fromId);
        if (!sortie)
            return false;
        for (const depId of sortie.dependencies) {
            if (depId === toId)
                return true;
            if (this.hasTransitiveDependency(depId, toId, sortieMap, visited)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Calculate critical path (longest dependency chain)
     */
    calculateCriticalPath(sorties, sortieMap) {
        let longestPath = [];
        for (const sortie of sorties) {
            const path = this.buildPath(sortie.id, sortieMap, new Set());
            if (path.length > longestPath.length) {
                longestPath = path;
            }
        }
        return longestPath;
    }
    /**
     * Build dependency path from a sortie
     */
    buildPath(sortieId, sortieMap, visited) {
        if (visited.has(sortieId))
            return [];
        visited.add(sortieId);
        const sortie = sortieMap.get(sortieId);
        if (!sortie)
            return [];
        if (sortie.dependencies.length === 0) {
            return [sortie];
        }
        let longestDependencyPath = [];
        for (const depId of sortie.dependencies) {
            const depPath = this.buildPath(depId, sortieMap, new Set(visited));
            if (depPath.length > longestDependencyPath.length) {
                longestDependencyPath = depPath;
            }
        }
        return [...longestDependencyPath, sortie];
    }
    /**
     * Estimate total duration based on critical path
     */
    estimateDuration(criticalPath) {
        const totalHours = criticalPath.reduce((sum, s) => sum + s.estimated_effort_hours, 0);
        return totalHours * 3600000; // Convert hours to milliseconds
    }
    /**
     * Calculate maximum dependency depth
     */
    calculateMaxDepth(sorties, sortieMap) {
        let maxDepth = 0;
        for (const sortie of sorties) {
            const depth = this.calculateDepth(sortie.id, sortieMap, new Set());
            maxDepth = Math.max(maxDepth, depth);
        }
        return maxDepth;
    }
    /**
     * Calculate depth of a sortie in the dependency graph
     */
    calculateDepth(sortieId, sortieMap, visited) {
        if (visited.has(sortieId))
            return 0;
        visited.add(sortieId);
        const sortie = sortieMap.get(sortieId);
        if (!sortie || sortie.dependencies.length === 0) {
            return 1;
        }
        let maxDependencyDepth = 0;
        for (const depId of sortie.dependencies) {
            const depth = this.calculateDepth(depId, sortieMap, new Set(visited));
            maxDependencyDepth = Math.max(maxDependencyDepth, depth);
        }
        return maxDependencyDepth + 1;
    }
    /**
     * Find circular dependencies
     */
    findCircularDependencies(sorties, sortieMap) {
        const cycles = [];
        const visited = new Set();
        for (const sortie of sorties) {
            if (visited.has(sortie.id))
                continue;
            const cycle = this.findCycle(sortie.id, sortieMap, new Set(), []);
            if (cycle.length > 0) {
                cycles.push(cycle);
                // Mark all sorties in the cycle as visited
                for (const id of cycle) {
                    visited.add(id);
                }
            }
        }
        return cycles;
    }
    /**
     * Find a cycle starting from a sortie
     */
    findCycle(sortieId, sortieMap, visited, path) {
        if (visited.has(sortieId)) {
            // Check if this sortie is in the current path (indicating a cycle)
            const cycleStart = path.indexOf(sortieId);
            if (cycleStart !== -1) {
                return path.slice(cycleStart).concat(sortieId);
            }
            return [];
        }
        visited.add(sortieId);
        const sortie = sortieMap.get(sortieId);
        if (!sortie) {
            return [];
        }
        for (const depId of sortie.dependencies) {
            const cycle = this.findCycle(depId, sortieMap, new Set(visited), [...path, sortieId]);
            if (cycle.length > 0) {
                return cycle;
            }
        }
        return [];
    }
}
/**
 * Create a new dependency resolver instance
 */
export function createDependencyResolver() {
    return new DecompositionDependencyResolver();
}
//# sourceMappingURL=dependency-resolver.js.map