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
import type { Sortie } from '../../../../squawk/src/db/types.js';
/**
 * Sortie with dependency information
 */
export interface SortieWithDeps extends Sortie {
    dependencies?: string[];
    estimated_duration_ms?: number;
}
/**
 * Dependency graph node
 */
export interface DependencyNode {
    sortie_id: string;
    dependencies: string[];
    dependents: string[];
    depth: number;
    critical_path_length: number;
}
/**
 * Dependency resolution result
 */
export interface DependencyResolution {
    success: boolean;
    topological_order: string[];
    parallel_groups: string[][];
    critical_path: string[];
    estimated_duration_ms: number;
    has_cycles: boolean;
    cycle_nodes?: string[];
    error?: string;
}
/**
 * Dependency Resolver
 * Analyzes sortie dependencies and determines execution order
 */
export declare class DependencyResolver {
    private sorties;
    private graph;
    private logger;
    /**
     * Create new resolver
     */
    constructor(sorties: SortieWithDeps[]);
    /**
     * Build dependency graph
     */
    private buildGraph;
    /**
     * Calculate depth of each node (distance from root)
     */
    private calculateDepths;
    /**
     * Calculate critical path length for each node
     */
    private calculateCriticalPaths;
    /**
     * Detect cycles in dependency graph
     */
    private detectCycles;
    /**
     * Topological sort using Kahn's algorithm
     */
    private topologicalSort;
    /**
     * Identify parallel groups
     * Sorties in the same group have no inter-group dependencies
     */
    private identifyParallelGroups;
    /**
     * Find critical path (longest dependency chain)
     */
    private findCriticalPath;
    /**
     * Resolve dependencies
     */
    resolve(): DependencyResolution;
}
/**
 * Resolve dependencies for sorties
 */
export declare function resolveDependencies(sorties: SortieWithDeps[]): DependencyResolution;
/**
 * Check if sorties have dependencies
 */
export declare function hasDependencies(sorties: SortieWithDeps[]): boolean;
/**
 * Get sorties with no dependencies
 */
export declare function getIndependentSorties(sorties: SortieWithDeps[]): SortieWithDeps[];
/**
 * Get sorties that depend on a specific sortie
 */
export declare function getDependentSorties(sorties: SortieWithDeps[], sortieId: string): SortieWithDeps[];
//# sourceMappingURL=dependency-resolver.d.ts.map