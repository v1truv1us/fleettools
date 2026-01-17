/**
 * FleetTools Phase 4: LLM Planner
 *
 * Uses Claude API to generate SortieTree from task description and codebase context.
 * Handles prompt generation, API calls, response parsing, and validation.
 *
 * @since 4.0.0 - Initial implementation
 * @last-updated 2026-01-08
 */
/**
 * LLMPlanner - Generates SortieTree using Claude API
 */
export class LLMPlanner {
    apiKey;
    apiBaseUrl = 'https://api.anthropic.com/v1';
    model = 'claude-3-5-sonnet-20241022';
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
        if (!this.apiKey) {
            throw new Error('ANTHROPIC_API_KEY environment variable is required');
        }
    }
    /**
     * Generate SortieTree from task description
     */
    async plan(input) {
        // Generate prompt
        const prompt = this.generatePrompt(input);
        // Call Claude API
        const response = await this.callClaudeAPI(prompt);
        // Parse response
        const parsed = this.parseResponse(response);
        // Convert to SortieTree
        const sortieTree = this.convertToSortieTree(parsed, input.strategy);
        return sortieTree;
    }
    /**
     * Generate prompt for Claude
     */
    generatePrompt(input) {
        return `You are an expert task decomposition system. Your job is to break down a high-level task into parallelizable work units (Sorties) that AI specialists can execute independently.

TASK: ${input.task_description}
STRATEGY: ${input.strategy}

CODEBASE CONTEXT:
${input.codebase_analysis.context_summary}

STRUCTURE OVERVIEW:
${input.codebase_analysis.structure_overview}

TECH ORDERS:
${input.tech_orders_context}

REQUIREMENTS:
1. Create a SortieTree with Mission and Sorties
2. Ensure no file overlap between concurrent sorties
3. Order sorties correctly based on dependencies
4. Estimate effort for each sortie (in hours)
5. Identify parallelization opportunities
6. Each sortie should be independently executable
7. Dependencies should be explicit and justified

OUTPUT FORMAT (MUST BE VALID JSON):
{
  "mission": {
    "title": "...",
    "description": "...",
    "strategy": "${input.strategy}",
    "estimated_effort_hours": <number>
  },
  "sorties": [
    {
      "title": "...",
      "description": "...",
      "scope": {
        "files": ["..."],
        "components": ["..."],
        "functions": ["..."]
      },
      "complexity": "low|medium|high",
      "estimated_effort_hours": <number>,
      "dependencies": [<indices into sorties array>]
    }
  ],
  "parallelization": {
    "parallel_groups": [[<sortie indices>], [<sortie indices>]],
    "critical_path": [<sortie indices>],
    "estimated_duration_ms": <number>
  }
}

IMPORTANT:
- Return ONLY valid JSON, no markdown formatting
- Each sortie must have unique scope (no file overlap)
- Dependencies must reference sortie indices (0-based)
- Complexity must be one of: low, medium, high
- Effort estimates must be positive numbers
- Parallel groups must not have inter-group dependencies`;
    }
    /**
     * Call Claude API
     */
    async callClaudeAPI(prompt) {
        const response = await fetch(`${this.apiBaseUrl}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: this.model,
                max_tokens: 4096,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Claude API error: ${response.status} - ${error}`);
        }
        const data = await response.json();
        const content = data.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected response type from Claude API');
        }
        return content.text;
    }
    /**
     * Parse Claude response
     */
    parseResponse(response) {
        // Try to extract JSON from response
        let jsonStr = response.trim();
        // Remove markdown code blocks if present
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.slice(7); // Remove ```json
        }
        else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.slice(3); // Remove ```
        }
        if (jsonStr.endsWith('```')) {
            jsonStr = jsonStr.slice(0, -3); // Remove trailing ```
        }
        jsonStr = jsonStr.trim();
        try {
            const parsed = JSON.parse(jsonStr);
            this.validateParsedOutput(parsed);
            return parsed;
        }
        catch (error) {
            throw new Error(`Failed to parse Claude response: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Validate parsed output
     */
    validateParsedOutput(output) {
        // Validate mission
        if (!output.mission) {
            throw new Error('Missing mission in response');
        }
        if (!output.mission.title || !output.mission.description) {
            throw new Error('Mission missing title or description');
        }
        if (typeof output.mission.estimated_effort_hours !== 'number' || output.mission.estimated_effort_hours <= 0) {
            throw new Error('Mission estimated_effort_hours must be a positive number');
        }
        // Validate sorties
        if (!Array.isArray(output.sorties) || output.sorties.length === 0) {
            throw new Error('Must have at least one sortie');
        }
        for (let i = 0; i < output.sorties.length; i++) {
            const sortie = output.sorties[i];
            if (!sortie.title || !sortie.description) {
                throw new Error(`Sortie ${i} missing title or description`);
            }
            if (!sortie.scope || !Array.isArray(sortie.scope.files)) {
                throw new Error(`Sortie ${i} missing scope.files`);
            }
            if (!['low', 'medium', 'high'].includes(sortie.complexity)) {
                throw new Error(`Sortie ${i} has invalid complexity: ${sortie.complexity}`);
            }
            if (typeof sortie.estimated_effort_hours !== 'number' || sortie.estimated_effort_hours <= 0) {
                throw new Error(`Sortie ${i} estimated_effort_hours must be a positive number`);
            }
            if (!Array.isArray(sortie.dependencies)) {
                throw new Error(`Sortie ${i} dependencies must be an array`);
            }
            // Validate dependency indices
            for (const depIdx of sortie.dependencies) {
                if (typeof depIdx !== 'number' || depIdx < 0 || depIdx >= output.sorties.length) {
                    throw new Error(`Sortie ${i} has invalid dependency index: ${depIdx}`);
                }
                if (depIdx === i) {
                    throw new Error(`Sortie ${i} cannot depend on itself`);
                }
            }
        }
        // Validate parallelization if present
        if (output.parallelization) {
            if (!Array.isArray(output.parallelization.parallel_groups)) {
                throw new Error('parallelization.parallel_groups must be an array');
            }
            if (!Array.isArray(output.parallelization.critical_path)) {
                throw new Error('parallelization.critical_path must be an array');
            }
            if (typeof output.parallelization.estimated_duration_ms !== 'number' || output.parallelization.estimated_duration_ms <= 0) {
                throw new Error('parallelization.estimated_duration_ms must be a positive number');
            }
        }
    }
    /**
     * Convert parsed output to SortieTree
     */
    convertToSortieTree(parsed, strategy) {
        // Generate IDs
        const missionId = this.generateId('msn');
        const sortieIds = parsed.sorties.map(() => this.generateId('srt'));
        // Create mission
        const mission = {
            id: missionId,
            title: parsed.mission.title,
            description: parsed.mission.description,
            strategy,
            status: 'pending',
            total_sorties: parsed.sorties.length,
            estimated_effort_hours: parsed.mission.estimated_effort_hours,
            created_at: new Date().toISOString(),
        };
        // Create sorties
        const sorties = parsed.sorties.map((s, idx) => ({
            id: sortieIds[idx],
            mission_id: missionId,
            title: s.title,
            description: s.description,
            scope: {
                files: s.scope.files || [],
                components: s.scope.components || [],
                functions: s.scope.functions || [],
            },
            complexity: s.complexity,
            estimated_effort_hours: s.estimated_effort_hours,
            dependencies: s.dependencies.map(depIdx => sortieIds[depIdx]),
            status: 'pending',
        }));
        // Create dependencies
        const dependencies = [];
        for (let i = 0; i < parsed.sorties.length; i++) {
            for (const depIdx of parsed.sorties[i].dependencies) {
                dependencies.push({
                    from_sortie: sortieIds[depIdx],
                    to_sortie: sortieIds[i],
                    reason: `Sortie ${i} depends on sortie ${depIdx}`,
                });
            }
        }
        // Create parallelization info
        const parallelization = this.generateParallelizationInfo(parsed, sorties, sortieIds);
        return {
            mission,
            sorties,
            dependencies,
            parallelization,
        };
    }
    /**
     * Generate parallelization info
     */
    generateParallelizationInfo(parsed, sorties, sortieIds) {
        if (parsed.parallelization) {
            return {
                parallel_groups: parsed.parallelization.parallel_groups.map(group => group.map(idx => sorties[idx])),
                critical_path: parsed.parallelization.critical_path.map(idx => sorties[idx]),
                estimated_duration_ms: parsed.parallelization.estimated_duration_ms,
                parallelization_potential: this.calculateParallelizationPotential(parsed.sorties),
                estimated_speedup: this.calculateSpeedup(parsed.sorties),
            };
        }
        // Generate default parallelization info
        const parallelGroups = this.identifyParallelGroups(sorties);
        const criticalPath = this.calculateCriticalPath(sorties);
        const estimatedDuration = this.estimateDuration(sorties, criticalPath);
        return {
            parallel_groups: parallelGroups,
            critical_path: criticalPath,
            estimated_duration_ms: estimatedDuration,
            parallelization_potential: this.calculateParallelizationPotential(parsed.sorties),
            estimated_speedup: this.calculateSpeedup(parsed.sorties),
        };
    }
    /**
     * Identify parallel groups
     */
    identifyParallelGroups(sorties) {
        const groups = [];
        const processed = new Set();
        for (const sortie of sorties) {
            if (processed.has(sortie.id))
                continue;
            const group = [sortie];
            processed.add(sortie.id);
            // Find other sorties that can run in parallel
            for (const other of sorties) {
                if (processed.has(other.id))
                    continue;
                if (this.canRunInParallel(sortie, other, sorties)) {
                    group.push(other);
                    processed.add(other.id);
                }
            }
            groups.push(group);
        }
        return groups;
    }
    /**
     * Check if two sorties can run in parallel
     */
    canRunInParallel(s1, s2, allSorties) {
        // Check for file overlap
        const files1 = new Set(s1.scope.files);
        const files2 = new Set(s2.scope.files);
        for (const file of files1) {
            if (files2.has(file))
                return false;
        }
        // Check for dependencies
        if (s1.dependencies.includes(s2.id) || s2.dependencies.includes(s1.id)) {
            return false;
        }
        return true;
    }
    /**
     * Calculate critical path
     */
    calculateCriticalPath(sorties) {
        // Find the longest dependency chain
        const paths = [];
        for (const sortie of sorties) {
            if (sortie.dependencies.length === 0) {
                // Start from sorties with no dependencies
                const path = this.buildPath(sortie, sorties);
                paths.push(path);
            }
        }
        return paths.reduce((longest, current) => current.length > longest.length ? current : longest, []);
    }
    /**
     * Build dependency path
     */
    buildPath(sortie, allSorties) {
        const path = [sortie];
        const dependents = allSorties.filter(s => s.dependencies.includes(sortie.id));
        if (dependents.length === 0) {
            return path;
        }
        // Find the dependent with the longest path
        const longestDependent = dependents.reduce((longest, current) => {
            const currentPath = this.buildPath(current, allSorties);
            return currentPath.length > longest.length ? currentPath : longest;
        }, []);
        return [...path, ...longestDependent];
    }
    /**
     * Estimate total duration
     */
    estimateDuration(sorties, criticalPath) {
        // Duration is the sum of critical path effort
        const criticalPathEffort = criticalPath.reduce((sum, s) => sum + s.estimated_effort_hours, 0);
        return criticalPathEffort * 3600000; // Convert hours to milliseconds
    }
    /**
     * Calculate parallelization potential
     */
    calculateParallelizationPotential(sorties) {
        if (sorties.length <= 1)
            return 0;
        // Count sorties with no dependencies
        const independent = sorties.filter(s => s.dependencies.length === 0).length;
        return Math.min(1, independent / sorties.length);
    }
    /**
     * Calculate estimated speedup
     */
    calculateSpeedup(sorties) {
        if (sorties.length <= 1)
            return 1;
        // Estimate based on parallelization potential
        const potential = this.calculateParallelizationPotential(sorties);
        return 1 + potential * (sorties.length - 1);
    }
    /**
     * Generate unique ID
     */
    generateId(prefix) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = prefix + '-';
        for (let i = 0; i < 8; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }
}
/**
 * Create a new LLM planner instance
 */
export function createLLMPlanner(apiKey) {
    return new LLMPlanner(apiKey);
}
//# sourceMappingURL=planner.js.map