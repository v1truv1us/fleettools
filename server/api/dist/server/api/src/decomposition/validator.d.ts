/**
 * FleetTools Phase 4: SortieTree Validator
 *
 * Validates SortieTree for correctness, detecting file overlaps, circular
 * dependencies, and other issues that would prevent execution.
 *
 * @since 4.0.0 - Initial implementation
 * @last-updated 2026-01-08
 */
import { SortieTree, ValidationResult } from './types.js';
/**
 * SortieTreeValidator - Validates SortieTree correctness
 */
export declare class SortieTreeValidator {
    /**
     * Validate a SortieTree
     */
    validate(sortieTree: SortieTree): ValidationResult;
    /**
     * Check for file overlaps between concurrent sorties
     */
    private checkFileOverlaps;
    /**
     * Check for circular dependencies
     */
    private checkCircularDependencies;
    /**
     * Check for missing dependencies
     */
    private checkMissingDependencies;
    /**
     * Check for invalid scopes
     */
    private checkInvalidScopes;
    /**
     * Check for high complexity sorties
     */
    private checkHighComplexity;
    /**
     * Check for long dependency chains
     */
    private checkLongDependencyChains;
    /**
     * Check for unbalanced effort distribution
     */
    private checkUnbalancedEffort;
    /**
     * Find file overlap between two sorties
     */
    private findFileOverlap;
    /**
     * Count total file overlaps
     */
    private countFileOverlaps;
    /**
     * Check if there's a direct dependency between two sorties
     */
    private hasDirectDependency;
    /**
     * Find a cycle in the dependency graph
     */
    private findCycle;
    /**
     * Calculate maximum dependency depth
     */
    private calculateMaxDependencyDepth;
    /**
     * Calculate depth of a sortie in the dependency graph
     */
    private calculateDepth;
    /**
     * Find the longest dependency chain
     */
    private findLongestChain;
    /**
     * Build dependency chain
     */
    private buildChain;
}
/**
 * Create a new validator instance
 */
export declare function createValidator(): SortieTreeValidator;
//# sourceMappingURL=validator.d.ts.map