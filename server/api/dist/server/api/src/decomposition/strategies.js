/**
 * FleetTools Phase 4: Strategy Selection
 *
 * Analyzes task keywords and codebase patterns to select the optimal
 * decomposition strategy (file-based, feature-based, risk-based, research-based).
 *
 * @since 4.0.0 - Initial implementation
 * @last-updated 2026-01-08
 */
/**
 * StrategySelector - Selects optimal decomposition strategy
 *
 * Uses keyword analysis and codebase pattern detection to choose
 * the best strategy for decomposing a task.
 */
export class StrategySelector {
    /**
     * Keywords that indicate each strategy
     */
    strategyKeywords = {
        'file-based': [
            'refactor', 'migrate', 'rename', 'update all', 'replace', 'convert',
            'standardize', 'reorganize', 'restructure', 'consolidate', 'move',
            'extract', 'inline', 'simplify', 'cleanup', 'modernize',
        ],
        'feature-based': [
            'add', 'implement', 'build', 'create', 'develop', 'new',
            'feature', 'endpoint', 'component', 'service', 'integration',
            'support', 'enable', 'introduce', 'establish',
        ],
        'risk-based': [
            'fix', 'bug', 'security', 'critical', 'urgent', 'hotfix',
            'patch', 'resolve', 'issue', 'problem', 'error', 'crash',
            'vulnerability', 'exploit', 'breach', 'regression',
        ],
        'research-based': [
            'investigate', 'explore', 'analyze', 'understand', 'research',
            'evaluate', 'assess', 'study', 'examine', 'review', 'audit',
            'discover', 'learn', 'prototype', 'poc', 'proof of concept',
        ],
    };
    /**
     * Analyze task and select optimal strategy
     */
    selectStrategy(taskDescription) {
        const lowerTask = taskDescription.toLowerCase();
        // Calculate scores for each strategy
        const scores = {
            'file-based': this.scoreStrategy(lowerTask, 'file-based'),
            'feature-based': this.scoreStrategy(lowerTask, 'feature-based'),
            'risk-based': this.scoreStrategy(lowerTask, 'risk-based'),
            'research-based': this.scoreStrategy(lowerTask, 'research-based'),
        };
        // Find best strategy
        const entries = Object.entries(scores);
        const [selectedStrategy, maxScore] = entries.reduce((best, current) => current[1] > best[1] ? current : best);
        // Normalize scores to 0-1 range
        const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
        const normalizedScores = {
            'file-based': scores['file-based'] / (totalScore || 1),
            'feature-based': scores['feature-based'] / (totalScore || 1),
            'risk-based': scores['risk-based'] / (totalScore || 1),
            'research-based': scores['research-based'] / (totalScore || 1),
        };
        // Get matched keywords
        const matchedKeywords = this.getMatchedKeywords(lowerTask, selectedStrategy);
        // Calculate confidence
        const confidence = Math.min(1, normalizedScores[selectedStrategy] * 1.5);
        return {
            selected_strategy: selectedStrategy,
            confidence,
            strategy_scores: normalizedScores,
            matched_keywords: matchedKeywords,
            detected_patterns: this.detectPatterns(taskDescription),
        };
    }
    /**
     * Score a strategy based on keyword matches
     */
    scoreStrategy(taskDescription, strategy) {
        const keywords = this.strategyKeywords[strategy];
        let score = 0;
        for (const keyword of keywords) {
            // Count occurrences of keyword
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = taskDescription.match(regex);
            if (matches) {
                score += matches.length;
            }
        }
        return score;
    }
    /**
     * Get keywords that matched for a strategy
     */
    getMatchedKeywords(taskDescription, strategy) {
        const keywords = this.strategyKeywords[strategy];
        const matched = [];
        for (const keyword of keywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(taskDescription)) {
                matched.push(keyword);
            }
        }
        return matched;
    }
    /**
     * Detect patterns in the task description
     */
    detectPatterns(taskDescription) {
        const patterns = [];
        const lowerTask = taskDescription.toLowerCase();
        // Pattern detection
        if (/multiple\s+files|across\s+files|all\s+files/.test(lowerTask)) {
            patterns.push('multi-file-change');
        }
        if (/database|schema|migration|table/.test(lowerTask)) {
            patterns.push('database-change');
        }
        if (/api|endpoint|route|controller/.test(lowerTask)) {
            patterns.push('api-change');
        }
        if (/ui|component|frontend|react|vue/.test(lowerTask)) {
            patterns.push('ui-change');
        }
        if (/test|spec|coverage/.test(lowerTask)) {
            patterns.push('testing-focus');
        }
        if (/performance|optimize|speed|latency/.test(lowerTask)) {
            patterns.push('performance-focus');
        }
        if (/security|auth|permission|access|encrypt/.test(lowerTask)) {
            patterns.push('security-focus');
        }
        if (/parallel|concurrent|async|background/.test(lowerTask)) {
            patterns.push('concurrency-focus');
        }
        return patterns;
    }
}
/**
 * Create a new strategy selector instance
 */
export function createStrategySelector() {
    return new StrategySelector();
}
//# sourceMappingURL=strategies.js.map