/**
 * FleetTools Phase 4: Decomposition CLI Handler
 *
 * Handles the decompose command for task decomposition.
 *
 * @since 4.0.0 - Initial implementation
 * @last-updated 2026-01-08
 */
import { StrategySelector, CodebaseAnalyzer, LLMPlanner, SortieTreeValidator, DecompositionDependencyResolver, ParallelizationAnalyzer, } from './index.js';
/**
 * Decompose a task via CLI
 */
export async function decomposeTaskCLI(taskDescription, options) {
    const strategySelector = new StrategySelector();
    const codebaseAnalyzer = new CodebaseAnalyzer(process.cwd());
    const planner = new LLMPlanner();
    const validator = new SortieTreeValidator();
    const dependencyResolver = new DecompositionDependencyResolver();
    const parallelizationAnalyzer = new ParallelizationAnalyzer();
    if (options.verbose) {
        console.log('🚀 Starting task decomposition...\n');
    }
    // Step 1: Strategy Selection
    if (options.verbose) {
        console.log('📊 Step 1: Selecting decomposition strategy...');
    }
    const strategyAnalysis = strategySelector.selectStrategy(taskDescription);
    const strategy = options.strategy || strategyAnalysis.selected_strategy;
    if (options.verbose) {
        console.log(`   Selected strategy: ${strategy} (confidence: ${(strategyAnalysis.confidence * 100).toFixed(1)}%)`);
        console.log(`   Matched keywords: ${strategyAnalysis.matched_keywords.join(', ')}`);
        console.log(`   Detected patterns: ${strategyAnalysis.detected_patterns.join(', ')}\n`);
    }
    // Step 2: Codebase Analysis
    if (options.verbose) {
        console.log('📁 Step 2: Analyzing codebase...');
    }
    const codebaseAnalysis = await codebaseAnalyzer.analyze();
    if (options.verbose) {
        console.log(`   Scanned ${codebaseAnalysis.total_files} files`);
        console.log(`   Found ${codebaseAnalysis.file_groups.length} file groups`);
        console.log(`   Detected ${codebaseAnalysis.patterns.length} patterns\n`);
    }
    // Step 3: Tech Orders Context
    if (options.verbose) {
        console.log('📚 Step 3: Loading Tech Orders...');
    }
    const techOrdersContext = codebaseAnalysis.tech_orders
        .map(to => `- ${to.title}: ${to.key_points.join(', ')}`)
        .join('\n');
    if (options.verbose) {
        console.log(`   Loaded ${codebaseAnalysis.tech_orders.length} Tech Orders\n`);
    }
    // Step 4: LLM Planning
    if (options.verbose) {
        console.log('🤖 Step 4: Generating SortieTree with LLM...');
    }
    const sortieTree = await planner.plan({
        task_description: taskDescription,
        strategy: strategy,
        codebase_analysis: codebaseAnalysis,
        tech_orders_context: techOrdersContext,
    });
    if (options.verbose) {
        console.log(`   Generated ${sortieTree.sorties.length} sorties\n`);
    }
    // Step 5: Validation
    if (options.verbose) {
        console.log('✅ Step 5: Validating SortieTree...');
    }
    const validationResult = validator.validate(sortieTree);
    if (!validationResult.valid) {
        console.error('\n❌ Validation failed:');
        for (const error of validationResult.errors) {
            console.error(`   - ${error.message}`);
            if (error.suggestion) {
                console.error(`     Suggestion: ${error.suggestion}`);
            }
        }
        process.exit(1);
    }
    if (options.verbose) {
        console.log('   Validation passed');
        if (validationResult.warnings.length > 0) {
            console.log(`   ${validationResult.warnings.length} warning(s):`);
            for (const warning of validationResult.warnings) {
                console.log(`     - ${warning.message}`);
            }
        }
        console.log();
    }
    // Step 6: Dependency Resolution
    if (options.verbose) {
        console.log('🔗 Step 6: Resolving dependencies...');
    }
    const dependencyResult = dependencyResolver.resolve(sortieTree);
    if (options.verbose) {
        console.log(`   Identified ${dependencyResult.parallel_groups.length} parallel groups`);
        console.log(`   Critical path length: ${dependencyResult.critical_path.length}`);
        console.log(`   Max dependency depth: ${dependencyResult.max_depth}\n`);
    }
    // Step 7: Parallelization Analysis
    if (options.verbose) {
        console.log('⚡ Step 7: Analyzing parallelization...');
    }
    const parallelizationResult = parallelizationAnalyzer.analyze(sortieTree);
    if (options.verbose) {
        console.log(`   Parallelization potential: ${(parallelizationResult.parallelization_potential * 100).toFixed(1)}%`);
        console.log(`   Estimated speedup: ${parallelizationResult.estimated_speedup.toFixed(2)}x\n`);
    }
    // Output results
    if (options.json) {
        // JSON output
        console.log(JSON.stringify({
            mission: sortieTree.mission,
            sorties: sortieTree.sorties,
            dependencies: sortieTree.dependencies,
            parallelization: sortieTree.parallelization,
            validation: {
                valid: validationResult.valid,
                errors: validationResult.errors,
                warnings: validationResult.warnings,
            },
            analysis: {
                parallelization_potential: parallelizationResult.parallelization_potential,
                estimated_speedup: parallelizationResult.estimated_speedup,
            },
        }, null, 2));
    }
    else {
        // Human-readable output
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📋 MISSION DECOMPOSITION RESULT');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`Mission: ${sortieTree.mission.title}`);
        console.log(`Strategy: ${sortieTree.mission.strategy}`);
        console.log(`Total Sorties: ${sortieTree.mission.total_sorties}`);
        console.log(`Estimated Effort: ${sortieTree.mission.estimated_effort_hours} hours\n`);
        console.log('───────────────────────────────────────────────────────────────');
        console.log('🎯 SORTIES');
        console.log('───────────────────────────────────────────────────────────────\n');
        for (let i = 0; i < sortieTree.sorties.length; i++) {
            const sortie = sortieTree.sorties[i];
            console.log(`${i + 1}. ${sortie.title}`);
            console.log(`   ID: ${sortie.id}`);
            console.log(`   Complexity: ${sortie.complexity}`);
            console.log(`   Effort: ${sortie.estimated_effort_hours} hours`);
            console.log(`   Files: ${sortie.scope.files.length}`);
            if (sortie.dependencies.length > 0) {
                const depIndices = sortieTree.sorties
                    .map((s, idx) => sortie.dependencies.includes(s.id) ? idx + 1 : null)
                    .filter((idx) => idx !== null);
                console.log(`   Depends on: Sortie(s) ${depIndices.join(', ')}`);
            }
            console.log();
        }
        console.log('───────────────────────────────────────────────────────────────');
        console.log('⚡ PARALLELIZATION');
        console.log('───────────────────────────────────────────────────────────────\n');
        console.log(`Parallel Groups: ${parallelizationResult.parallel_groups.length}`);
        for (let i = 0; i < parallelizationResult.parallel_groups.length; i++) {
            const group = parallelizationResult.parallel_groups[i];
            const titles = group.map((s) => s.title).join(', ');
            console.log(`  Group ${i + 1}: ${titles}`);
        }
        console.log(`\nCritical Path: ${sortieTree.parallelization.critical_path.map(s => s.title).join(' → ')}`);
        console.log(`Parallelization Potential: ${(parallelizationResult.parallelization_potential * 100).toFixed(1)}%`);
        console.log(`Estimated Speedup: ${parallelizationResult.estimated_speedup.toFixed(2)}x`);
        if (parallelizationResult.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            for (const rec of parallelizationResult.recommendations) {
                console.log(`  - ${rec}`);
            }
        }
        if (parallelizationResult.bottlenecks.length > 0) {
            console.log('\n⚠️  Bottlenecks:');
            for (const bottleneck of parallelizationResult.bottlenecks) {
                console.log(`  - ${bottleneck}`);
            }
        }
        console.log('\n═══════════════════════════════════════════════════════════════');
        if (!options.dryRun) {
            console.log(`\n✅ Mission created: ${sortieTree.mission.id}`);
            console.log('Ready to spawn specialists and begin execution.');
        }
        else {
            console.log('\n📋 Dry-run complete. No mission was created.');
        }
    }
}
//# sourceMappingURL=cli.js.map