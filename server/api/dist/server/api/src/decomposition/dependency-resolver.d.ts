/**
 * FleetTools Phase 4: Dependency Resolution
 *
 * Analyzes sortie dependencies to identify parallel groups, calculate
 * critical path, and estimate total duration.
 *
 * @since 4.0.0 - Initial implementation
 * @last-updated 2026-01-08
 */
import { SortieTree, DependencyResolutionResult } from './types.js';
/**
 * DecompositionDependencyResolver - Resolves sortie dependencies
 */
export declare class DecompositionDependencyResolver {
    /**
     * Resolve dependencies in a SortieTree
     */
    resolve(sortieTree: SortieTree): DependencyResolutionResult;
    /**
     * Topologically sort sorties
     */
    private topologicalSort;
    /**
     * Identify parallel groups
     */
    private identifyParallelGroups;
    /**
     * Check if two sorties can run in parallel
     */
    private canRunInParallel;
    /**
     * Check if there's a transitive dependency
     */
    private hasTransitiveDependency;
    /**
     * Calculate critical path (longest dependency chain)
     */
    private calculateCriticalPath;
    /**
     * Build dependency path from a sortie
     */
    private buildPath;
    /**
     * Estimate total duration based on critical path
     */
    private estimateDuration;
    /**
     * Calculate maximum dependency depth
     */
    private calculateMaxDepth;
    /**
     * Calculate depth of a sortie in the dependency graph
     */
    private calculateDepth;
    /**
     * Find circular dependencies
     */
    private findCircularDependencies;
    /**
     * Find a cycle starting from a sortie
     */
    private findCycle;
}
/**
 * Create a new dependency resolver instance
 */
export declare function createDependencyResolver(): DecompositionDependencyResolver;
//# sourceMappingURL=dependency-resolver.d.ts.map