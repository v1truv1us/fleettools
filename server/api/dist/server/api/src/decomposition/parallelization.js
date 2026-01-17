/**
 * FleetTools Phase 4: Parallelization Analysis
 *
 * Analyzes parallelization opportunities and provides recommendations
 * for optimizing task execution.
 *
 * @since 4.0.0 - Initial implementation
 * @last-updated 2026-01-08
 */
/**
 * ParallelizationAnalyzer - Analyzes parallelization opportunities
 */
export class ParallelizationAnalyzer {
    /**
     * Analyze parallelization opportunities
     */
    analyze(sortieTree) {
        const parallelGroups = sortieTree.parallelization.parallel_groups;
        const criticalPath = sortieTree.parallelization.critical_path;
        const estimatedDuration = sortieTree.parallelization.estimated_duration_ms;
        // Calculate parallelization potential
        const parallelizationPotential = this.calculateParallelizationPotential(sortieTree.sorties, parallelGroups);
        // Calculate estimated speedup
        const estimatedSpeedup = this.calculateSpeedup(sortieTree.sorties, criticalPath, estimatedDuration);
        // Generate recommendations
        const recommendations = this.generateRecommendations(sortieTree, parallelGroups, criticalPath, parallelizationPotential);
        // Identify bottlenecks
        const bottlenecks = this.identifyBottlenecks(sortieTree, parallelGroups, criticalPath);
        return {
            parallel_groups: parallelGroups,
            parallelization_potential: parallelizationPotential,
            estimated_speedup: estimatedSpeedup,
            recommendations,
            bottlenecks,
        };
    }
    /**
     * Calculate parallelization potential (0-1)
     */
    calculateParallelizationPotential(sorties, parallelGroups) {
        if (sorties.length <= 1)
            return 0;
        // Potential is based on how many sorties can run in parallel
        const maxParallelSize = Math.max(...parallelGroups.map(g => g.length));
        return maxParallelSize / sorties.length;
    }
    /**
     * Calculate estimated speedup from parallelization
     */
    calculateSpeedup(sorties, criticalPath, estimatedDuration) {
        if (sorties.length <= 1)
            return 1;
        // Total effort if executed sequentially
        const totalEffort = sorties.reduce((sum, s) => sum + s.estimated_effort_hours, 0);
        // Critical path effort
        const criticalPathEffort = criticalPath.reduce((sum, s) => sum + s.estimated_effort_hours, 0);
        // Speedup is the ratio of sequential to parallel execution
        if (criticalPathEffort === 0)
            return 1;
        return totalEffort / criticalPathEffort;
    }
    /**
     * Generate recommendations for optimization
     */
    generateRecommendations(sortieTree, parallelGroups, criticalPath, parallelizationPotential) {
        const recommendations = [];
        // Check if parallelization potential is low
        if (parallelizationPotential < 0.3) {
            recommendations.push('Low parallelization potential: Consider breaking down sorties with high complexity into smaller, independent tasks');
        }
        // Check for long critical path
        if (criticalPath.length > 5) {
            recommendations.push(`Long critical path (${criticalPath.length} sorties): Consider reordering dependencies to reduce sequential execution`);
        }
        // Check for unbalanced effort
        const efforts = sortieTree.sorties.map(s => s.estimated_effort_hours);
        const avgEffort = efforts.reduce((a, b) => a + b, 0) / efforts.length;
        const maxEffort = Math.max(...efforts);
        if (maxEffort > avgEffort * 2) {
            const heavySorties = sortieTree.sorties
                .filter(s => s.estimated_effort_hours > avgEffort * 1.5)
                .map(s => s.title);
            recommendations.push(`Unbalanced effort distribution: Consider breaking down heavy sorties (${heavySorties.join(', ')}) into smaller tasks`);
        }
        // Check for high complexity sorties
        const highComplexitySorties = sortieTree.sorties.filter(s => s.complexity === 'high');
        if (highComplexitySorties.length > 0) {
            recommendations.push(`High complexity sorties detected: Consider adding intermediate milestones or breaking them into smaller tasks`);
        }
        // Check for sorties with many dependencies
        const heavilyDependentSorties = sortieTree.sorties.filter(s => s.dependencies.length > 2);
        if (heavilyDependentSorties.length > 0) {
            recommendations.push(`Some sorties have many dependencies: Consider reordering to reduce dependency depth`);
        }
        // Positive recommendations
        if (parallelizationPotential > 0.7) {
            recommendations.push('Good parallelization potential: Most sorties can run in parallel for efficient execution');
        }
        if (criticalPath.length <= 3) {
            recommendations.push('Short critical path: Task can be completed quickly with parallel execution');
        }
        return recommendations;
    }
    /**
     * Identify bottlenecks in execution
     */
    identifyBottlenecks(sortieTree, parallelGroups, criticalPath) {
        const bottlenecks = [];
        // Sorties on the critical path are bottlenecks
        const criticalPathIds = new Set(criticalPath.map(s => s.id));
        for (const sortie of criticalPath) {
            if (sortie.complexity === 'high') {
                bottlenecks.push(`High complexity sortie on critical path: "${sortie.title}" (${sortie.estimated_effort_hours}h)`);
            }
            if (sortie.estimated_effort_hours > 4) {
                bottlenecks.push(`Long-running sortie on critical path: "${sortie.title}" (${sortie.estimated_effort_hours}h)`);
            }
        }
        // Sorties with many dependents are bottlenecks
        for (const sortie of sortieTree.sorties) {
            const dependentCount = sortieTree.sorties.filter(s => s.dependencies.includes(sortie.id)).length;
            if (dependentCount > 2) {
                bottlenecks.push(`Sortie with many dependents: "${sortie.title}" (${dependentCount} sorties depend on it)`);
            }
        }
        // Identify sequential chains
        for (const group of parallelGroups) {
            if (group.length === 1) {
                const sortie = group[0];
                if (sortie.dependencies.length > 0 && sortieTree.sorties.filter(s => s.dependencies.includes(sortie.id)).length > 0) {
                    bottlenecks.push(`Sequential chain: "${sortie.title}" is part of a sequential dependency chain`);
                }
            }
        }
        return bottlenecks;
    }
}
/**
 * Create a new parallelization analyzer instance
 */
export function createParallelizationAnalyzer() {
    return new ParallelizationAnalyzer();
}
//# sourceMappingURL=parallelization.js.map