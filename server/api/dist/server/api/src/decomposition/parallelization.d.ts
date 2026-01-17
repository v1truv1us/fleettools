/**
 * FleetTools Phase 4: Parallelization Analysis
 *
 * Analyzes parallelization opportunities and provides recommendations
 * for optimizing task execution.
 *
 * @since 4.0.0 - Initial implementation
 * @last-updated 2026-01-08
 */
import { SortieTree, ParallelizationAnalysisResult } from './types.js';
/**
 * ParallelizationAnalyzer - Analyzes parallelization opportunities
 */
export declare class ParallelizationAnalyzer {
    /**
     * Analyze parallelization opportunities
     */
    analyze(sortieTree: SortieTree): ParallelizationAnalysisResult;
    /**
     * Calculate parallelization potential (0-1)
     */
    private calculateParallelizationPotential;
    /**
     * Calculate estimated speedup from parallelization
     */
    private calculateSpeedup;
    /**
     * Generate recommendations for optimization
     */
    private generateRecommendations;
    /**
     * Identify bottlenecks in execution
     */
    private identifyBottlenecks;
}
/**
 * Create a new parallelization analyzer instance
 */
export declare function createParallelizationAnalyzer(): ParallelizationAnalyzer;
//# sourceMappingURL=parallelization.d.ts.map