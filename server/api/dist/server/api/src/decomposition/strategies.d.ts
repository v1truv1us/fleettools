/**
 * FleetTools Phase 4: Strategy Selection
 *
 * Analyzes task keywords and codebase patterns to select the optimal
 * decomposition strategy (file-based, feature-based, risk-based, research-based).
 *
 * @since 4.0.0 - Initial implementation
 * @last-updated 2026-01-08
 */
import { StrategyAnalysis } from './types.js';
/**
 * StrategySelector - Selects optimal decomposition strategy
 *
 * Uses keyword analysis and codebase pattern detection to choose
 * the best strategy for decomposing a task.
 */
export declare class StrategySelector {
    /**
     * Keywords that indicate each strategy
     */
    private readonly strategyKeywords;
    /**
     * Analyze task and select optimal strategy
     */
    selectStrategy(taskDescription: string): StrategyAnalysis;
    /**
     * Score a strategy based on keyword matches
     */
    private scoreStrategy;
    /**
     * Get keywords that matched for a strategy
     */
    private getMatchedKeywords;
    /**
     * Detect patterns in the task description
     */
    private detectPatterns;
}
/**
 * Create a new strategy selector instance
 */
export declare function createStrategySelector(): StrategySelector;
//# sourceMappingURL=strategies.d.ts.map