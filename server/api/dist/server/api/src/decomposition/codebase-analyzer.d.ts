/**
 * FleetTools Phase 4: Codebase Analysis
 *
 * Analyzes the codebase to extract patterns, conventions, and relevant
 * Tech Orders for context injection into the LLM planner.
 *
 * @since 4.0.0 - Initial implementation
 * @last-updated 2026-01-08
 */
import { CodebaseAnalysis } from './types.js';
/**
 * CodebaseAnalyzer - Analyzes codebase structure and patterns
 */
export declare class CodebaseAnalyzer {
    private readonly rootPath;
    private readonly ignoredDirs;
    constructor(rootPath?: string);
    /**
     * Analyze the codebase
     */
    analyze(): Promise<CodebaseAnalysis>;
    /**
     * Scan all files in the codebase
     */
    private scanFiles;
    /**
     * Check if a file is relevant for analysis
     */
    private isRelevantFile;
    /**
     * Group files by directory/type
     */
    private groupFiles;
    /**
     * Generate description for a file group
     */
    private describeFileGroup;
    /**
     * Detect patterns in the codebase
     */
    private detectPatterns;
    /**
     * Load relevant Tech Orders
     */
    private loadTechOrders;
    /**
     * Generate context summary for LLM
     */
    private generateContextSummary;
    /**
     * Generate structure overview
     */
    private generateStructureOverview;
}
/**
 * Create a new codebase analyzer instance
 */
export declare function createCodebaseAnalyzer(rootPath?: string): CodebaseAnalyzer;
//# sourceMappingURL=codebase-analyzer.d.ts.map