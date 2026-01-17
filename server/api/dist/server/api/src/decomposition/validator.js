/**
 * FleetTools Phase 4: SortieTree Validator
 *
 * Validates SortieTree for correctness, detecting file overlaps, circular
 * dependencies, and other issues that would prevent execution.
 *
 * @since 4.0.0 - Initial implementation
 * @last-updated 2026-01-08
 */
/**
 * SortieTreeValidator - Validates SortieTree correctness
 */
export class SortieTreeValidator {
    /**
     * Validate a SortieTree
     */
    validate(sortieTree) {
        const errors = [];
        const warnings = [];
        // Run all validation checks
        this.checkFileOverlaps(sortieTree, errors);
        this.checkCircularDependencies(sortieTree, errors);
        this.checkMissingDependencies(sortieTree, errors);
        this.checkInvalidScopes(sortieTree, errors);
        this.checkHighComplexity(sortieTree, warnings);
        this.checkLongDependencyChains(sortieTree, warnings);
        this.checkUnbalancedEffort(sortieTree, warnings);
        // Calculate metrics
        const metrics = {
            total_sorties: sortieTree.sorties.length,
            total_dependencies: sortieTree.dependencies.length,
            max_dependency_depth: this.calculateMaxDependencyDepth(sortieTree),
            parallel_groups_count: sortieTree.parallelization.parallel_groups.length,
            file_overlap_count: this.countFileOverlaps(sortieTree),
        };
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            metrics,
        };
    }
    /**
     * Check for file overlaps between concurrent sorties
     */
    checkFileOverlaps(sortieTree, errors) {
        const sortieMap = new Map(sortieTree.sorties.map(s => [s.id, s]));
        for (let i = 0; i < sortieTree.sorties.length; i++) {
            for (let j = i + 1; j < sortieTree.sorties.length; j++) {
                const s1 = sortieTree.sorties[i];
                const s2 = sortieTree.sorties[j];
                // Check if they can run in parallel
                if (!this.hasDirectDependency(s1, s2, sortieMap) && !this.hasDirectDependency(s2, s1, sortieMap)) {
                    // They can run in parallel, check for file overlap
                    const overlap = this.findFileOverlap(s1, s2);
                    if (overlap.length > 0) {
                        errors.push({
                            type: 'file_overlap',
                            message: `Sorties "${s1.title}" and "${s2.title}" both modify the same files: ${overlap.join(', ')}`,
                            affected_sorties: [s1.id, s2.id],
                            suggestion: `Merge these sorties or add a dependency between them to ensure sequential execution`,
                        });
                    }
                }
            }
        }
    }
    /**
     * Check for circular dependencies
     */
    checkCircularDependencies(sortieTree, errors) {
        const sortieMap = new Map(sortieTree.sorties.map(s => [s.id, s]));
        for (const sortie of sortieTree.sorties) {
            const visited = new Set();
            const cycle = this.findCycle(sortie.id, sortieMap, visited);
            if (cycle.length > 0) {
                errors.push({
                    type: 'circular_dependency',
                    message: `Circular dependency detected: ${cycle.join(' -> ')}`,
                    affected_sorties: cycle,
                    suggestion: `Remove or reorder dependencies to break the cycle`,
                });
            }
        }
    }
    /**
     * Check for missing dependencies
     */
    checkMissingDependencies(sortieTree, errors) {
        const sortieIds = new Set(sortieTree.sorties.map(s => s.id));
        for (const sortie of sortieTree.sorties) {
            for (const depId of sortie.dependencies) {
                if (!sortieIds.has(depId)) {
                    errors.push({
                        type: 'missing_dependency',
                        message: `Sortie "${sortie.title}" depends on non-existent sortie: ${depId}`,
                        affected_sorties: [sortie.id],
                        suggestion: `Remove the dependency or ensure the referenced sortie exists`,
                    });
                }
            }
        }
    }
    /**
     * Check for invalid scopes
     */
    checkInvalidScopes(sortieTree, errors) {
        for (const sortie of sortieTree.sorties) {
            // Check for empty scope
            if ((!sortie.scope.files || sortie.scope.files.length === 0) &&
                (!sortie.scope.components || sortie.scope.components.length === 0) &&
                (!sortie.scope.functions || sortie.scope.functions.length === 0)) {
                errors.push({
                    type: 'invalid_scope',
                    message: `Sortie "${sortie.title}" has empty scope (no files, components, or functions)`,
                    affected_sorties: [sortie.id],
                    suggestion: `Define at least one file, component, or function that this sortie will modify`,
                });
            }
            // Check for invalid file paths
            for (const file of sortie.scope.files || []) {
                if (!file || typeof file !== 'string' || file.trim().length === 0) {
                    errors.push({
                        type: 'invalid_scope',
                        message: `Sortie "${sortie.title}" has invalid file path: "${file}"`,
                        affected_sorties: [sortie.id],
                        suggestion: `Provide valid file paths in the scope`,
                    });
                }
            }
        }
    }
    /**
     * Check for high complexity sorties
     */
    checkHighComplexity(sortieTree, warnings) {
        const highComplexitySorties = sortieTree.sorties.filter(s => s.complexity === 'high');
        if (highComplexitySorties.length > 0) {
            warnings.push({
                type: 'high_complexity',
                message: `${highComplexitySorties.length} sortie(s) have high complexity and may be difficult to execute`,
                affected_sorties: highComplexitySorties.map(s => s.id),
            });
        }
    }
    /**
     * Check for long dependency chains
     */
    checkLongDependencyChains(sortieTree, warnings) {
        const maxDepth = this.calculateMaxDependencyDepth(sortieTree);
        if (maxDepth > 5) {
            warnings.push({
                type: 'long_dependency_chain',
                message: `Dependency chain is very long (depth: ${maxDepth}), which may limit parallelization`,
                affected_sorties: this.findLongestChain(sortieTree),
            });
        }
    }
    /**
     * Check for unbalanced effort distribution
     */
    checkUnbalancedEffort(sortieTree, warnings) {
        if (sortieTree.sorties.length < 2)
            return;
        const efforts = sortieTree.sorties.map(s => s.estimated_effort_hours);
        const avgEffort = efforts.reduce((a, b) => a + b, 0) / efforts.length;
        const maxEffort = Math.max(...efforts);
        const minEffort = Math.min(...efforts);
        // Check if effort is very unbalanced
        if (maxEffort > avgEffort * 3 || minEffort < avgEffort / 3) {
            const unbalancedSorties = sortieTree.sorties
                .filter(s => s.estimated_effort_hours > avgEffort * 2 || s.estimated_effort_hours < avgEffort / 2)
                .map(s => s.id);
            warnings.push({
                type: 'unbalanced_effort',
                message: `Effort distribution is unbalanced (avg: ${avgEffort.toFixed(1)}h, max: ${maxEffort}h, min: ${minEffort}h)`,
                affected_sorties: unbalancedSorties,
            });
        }
    }
    /**
     * Find file overlap between two sorties
     */
    findFileOverlap(s1, s2) {
        const files1 = new Set(s1.scope.files || []);
        const files2 = new Set(s2.scope.files || []);
        const overlap = [];
        for (const file of files1) {
            if (files2.has(file)) {
                overlap.push(file);
            }
        }
        return overlap;
    }
    /**
     * Count total file overlaps
     */
    countFileOverlaps(sortieTree) {
        let count = 0;
        for (let i = 0; i < sortieTree.sorties.length; i++) {
            for (let j = i + 1; j < sortieTree.sorties.length; j++) {
                const overlap = this.findFileOverlap(sortieTree.sorties[i], sortieTree.sorties[j]);
                if (overlap.length > 0) {
                    count += overlap.length;
                }
            }
        }
        return count;
    }
    /**
     * Check if there's a direct dependency between two sorties
     */
    hasDirectDependency(s1, s2, sortieMap) {
        return s1.dependencies.includes(s2.id);
    }
    /**
     * Find a cycle in the dependency graph
     */
    findCycle(sortieId, sortieMap, visited, path = []) {
        if (visited.has(sortieId)) {
            // Found a cycle
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
    /**
     * Calculate maximum dependency depth
     */
    calculateMaxDependencyDepth(sortieTree) {
        const sortieMap = new Map(sortieTree.sorties.map(s => [s.id, s]));
        let maxDepth = 0;
        for (const sortie of sortieTree.sorties) {
            const depth = this.calculateDepth(sortie.id, sortieMap, new Set());
            maxDepth = Math.max(maxDepth, depth);
        }
        return maxDepth;
    }
    /**
     * Calculate depth of a sortie in the dependency graph
     */
    calculateDepth(sortieId, sortieMap, visited) {
        if (visited.has(sortieId)) {
            return 0; // Cycle detected, return 0
        }
        const sortie = sortieMap.get(sortieId);
        if (!sortie || sortie.dependencies.length === 0) {
            return 1;
        }
        visited.add(sortieId);
        let maxDepth = 0;
        for (const depId of sortie.dependencies) {
            const depth = this.calculateDepth(depId, sortieMap, new Set(visited));
            maxDepth = Math.max(maxDepth, depth);
        }
        return maxDepth + 1;
    }
    /**
     * Find the longest dependency chain
     */
    findLongestChain(sortieTree) {
        const sortieMap = new Map(sortieTree.sorties.map(s => [s.id, s]));
        let longestChain = [];
        for (const sortie of sortieTree.sorties) {
            const chain = this.buildChain(sortie.id, sortieMap, new Set());
            if (chain.length > longestChain.length) {
                longestChain = chain;
            }
        }
        return longestChain;
    }
    /**
     * Build dependency chain
     */
    buildChain(sortieId, sortieMap, visited) {
        if (visited.has(sortieId)) {
            return [sortieId];
        }
        const sortie = sortieMap.get(sortieId);
        if (!sortie || sortie.dependencies.length === 0) {
            return [sortieId];
        }
        visited.add(sortieId);
        let longestDependencyChain = [];
        for (const depId of sortie.dependencies) {
            const chain = this.buildChain(depId, sortieMap, new Set(visited));
            if (chain.length > longestDependencyChain.length) {
                longestDependencyChain = chain;
            }
        }
        return [sortieId, ...longestDependencyChain];
    }
}
/**
 * Create a new validator instance
 */
export function createValidator() {
    return new SortieTreeValidator();
}
//# sourceMappingURL=validator.js.map