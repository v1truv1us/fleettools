/**
 * FleetTools Phase 4: Decomposition API Routes
 *
 * Provides REST API endpoints for task decomposition.
 *
 * @since 4.0.0 - Initial implementation
 * @last-updated 2026-01-08
 */
import { StrategySelector, CodebaseAnalyzer, LLMPlanner, SortieTreeValidator, DecompositionDependencyResolver, ParallelizationAnalyzer, } from './index.js';
/**
 * Register decomposition routes
 */
export function registerDecompositionRoutes(router, headers) {
    // POST /api/v1/missions/decompose - Decompose a task
    router.post('/api/v1/missions/decompose', async (req) => {
        try {
            const body = await req.json();
            // Validate input
            if (!body.task_description || typeof body.task_description !== 'string') {
                return new Response(JSON.stringify({ error: 'task_description is required and must be a string' }), {
                    status: 400,
                    headers: { ...headers, 'Content-Type': 'application/json' },
                });
            }
            if (body.task_description.trim().length === 0) {
                return new Response(JSON.stringify({ error: 'task_description cannot be empty' }), {
                    status: 400,
                    headers: { ...headers, 'Content-Type': 'application/json' },
                });
            }
            // Initialize decomposition components
            const strategySelector = new StrategySelector();
            const codebaseAnalyzer = new CodebaseAnalyzer(process.cwd());
            const planner = new LLMPlanner();
            const validator = new SortieTreeValidator();
            const dependencyResolver = new DecompositionDependencyResolver();
            const parallelizationAnalyzer = new ParallelizationAnalyzer();
            // Step 1: Strategy Selection
            const strategyAnalysis = strategySelector.selectStrategy(body.task_description);
            const strategy = body.strategy || strategyAnalysis.selected_strategy;
            // Step 2: Codebase Analysis
            const codebaseAnalysis = await codebaseAnalyzer.analyze();
            // Step 3: Tech Orders Context
            const techOrdersContext = codebaseAnalysis.tech_orders
                .map(to => `- ${to.title}: ${to.key_points.join(', ')}`)
                .join('\n');
            // Step 4: LLM Planning
            const sortieTree = await planner.plan({
                task_description: body.task_description,
                strategy: strategy,
                codebase_analysis: codebaseAnalysis,
                tech_orders_context: techOrdersContext,
            });
            // Step 5: Validation
            const validationResult = validator.validate(sortieTree);
            if (!validationResult.valid) {
                return new Response(JSON.stringify({
                    error: 'Validation failed',
                    validation_errors: validationResult.errors.map(e => e.message),
                }), {
                    status: 400,
                    headers: { ...headers, 'Content-Type': 'application/json' },
                });
            }
            // Step 6: Dependency Resolution
            const dependencyResult = dependencyResolver.resolve(sortieTree);
            // Step 7: Parallelization Analysis
            const parallelizationResult = parallelizationAnalyzer.analyze(sortieTree);
            // Build response
            const response = {
                sortie_tree: sortieTree,
                validation_errors: validationResult.errors.length > 0 ? validationResult.errors.map(e => e.message) : undefined,
                warnings: validationResult.warnings.map(w => w.message),
                metadata: {
                    strategy_selected: strategy,
                    processing_time_ms: 0, // Would be calculated in real implementation
                    codebase_files_analyzed: codebaseAnalysis.total_files,
                },
            };
            return new Response(JSON.stringify(response), {
                status: 200,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
        catch (error) {
            console.error('Error decomposing task:', error);
            return new Response(JSON.stringify({
                error: 'Failed to decompose task',
                details: error instanceof Error ? error.message : String(error),
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
    });
    // GET /api/v1/missions/:missionId - Get mission details (placeholder)
    router.get('/api/v1/missions/:missionId', async (req, params) => {
        const missionId = params?.missionId;
        if (!missionId) {
            return new Response(JSON.stringify({ error: 'Mission ID is required' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
        // In a real implementation, this would fetch from the database
        return new Response(JSON.stringify({
            error: 'Mission not found',
        }), {
            status: 404,
            headers: { ...headers, 'Content-Type': 'application/json' },
        });
    });
}
//# sourceMappingURL=routes.js.map