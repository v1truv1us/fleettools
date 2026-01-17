/**
 * FleetTools Phase 4: LLM Planner
 *
 * Uses Claude API to generate SortieTree from task description and codebase context.
 * Handles prompt generation, API calls, response parsing, and validation.
 *
 * @since 4.0.0 - Initial implementation
 * @last-updated 2026-01-08
 */
import { LLMPlannerInput, SortieTree } from './types.js';
/**
 * LLMPlanner - Generates SortieTree using Claude API
 */
export declare class LLMPlanner {
    private readonly apiKey;
    private readonly apiBaseUrl;
    private readonly model;
    constructor(apiKey?: string);
    /**
     * Generate SortieTree from task description
     */
    plan(input: LLMPlannerInput): Promise<SortieTree>;
    /**
     * Generate prompt for Claude
     */
    private generatePrompt;
    /**
     * Call Claude API
     */
    private callClaudeAPI;
    /**
     * Parse Claude response
     */
    private parseResponse;
    /**
     * Validate parsed output
     */
    private validateParsedOutput;
    /**
     * Convert parsed output to SortieTree
     */
    private convertToSortieTree;
    /**
     * Generate parallelization info
     */
    private generateParallelizationInfo;
    /**
     * Identify parallel groups
     */
    private identifyParallelGroups;
    /**
     * Check if two sorties can run in parallel
     */
    private canRunInParallel;
    /**
     * Calculate critical path
     */
    private calculateCriticalPath;
    /**
     * Build dependency path
     */
    private buildPath;
    /**
     * Estimate total duration
     */
    private estimateDuration;
    /**
     * Calculate parallelization potential
     */
    private calculateParallelizationPotential;
    /**
     * Calculate estimated speedup
     */
    private calculateSpeedup;
    /**
     * Generate unique ID
     */
    private generateId;
}
/**
 * Create a new LLM planner instance
 */
export declare function createLLMPlanner(apiKey?: string): LLMPlanner;
//# sourceMappingURL=planner.d.ts.map