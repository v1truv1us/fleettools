/**
 * FleetTools Specialist Spawning
 *
 * Handles parallel and sequential spawning of specialists for sorties.
 *
 * Parallel Spawning:
 * - Independent sorties spawn simultaneously
 * - Use Task tool with run_in_background: true
 * - Wait for all parallel sorties to complete
 *
 * Sequential Spawning:
 * - Dependent sorties spawn after dependencies complete
 * - Use Task tool with run_in_background: false
 * - Wait for each sortie before spawning next
 *
 * @version 1.0.0
 * @since 2026-01-08
 */
import { getAdapter } from '../../../../squawk/src/db/index.js';
// ============================================================================
// PARALLEL SPAWNING
// ============================================================================
/**
 * Identify independent sorties (no dependencies)
 */
export function identifyIndependentSorties(sorties) {
    return sorties.filter(s => !s.dependencies || s.dependencies.length === 0);
}
/**
 * Identify dependent sorties
 */
export function identifyDependentSorties(sorties) {
    return sorties.filter(s => s.dependencies && s.dependencies.length > 0);
}
/**
 * Spawn sorties in parallel
 *
 * Independent sorties are spawned simultaneously using background tasks.
 * The function waits for all parallel sorties to complete before returning.
 */
export async function spawnParallel(sorties) {
    console.log(`[Spawning] Spawning ${sorties.length} sorties in parallel`);
    const db = getAdapter();
    const results = {
        success: true,
        parallel_groups: [sorties],
        total_sorties: sorties.length,
        completed_sorties: 0,
        failed_sorties: 0,
        errors: [],
    };
    // Spawn all sorties in parallel
    const spawnPromises = sorties.map(async (sortie) => {
        try {
            console.log(`[Spawning] Spawning specialist for sortie ${sortie.id}`);
            // In a real implementation, this would use the Task tool with run_in_background: true
            // For now, we just mark the sortie as assigned
            await db.sorties.update(sortie.id, {
                assigned_to: `specialist-${sortie.id.substring(0, 8)}`,
            });
            results.completed_sorties++;
            return { success: true, sortie_id: sortie.id };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[Spawning] Error spawning sortie ${sortie.id}:`, message);
            results.failed_sorties++;
            results.errors.push(`Failed to spawn sortie ${sortie.id}: ${message}`);
            return { success: false, sortie_id: sortie.id, error: message };
        }
    });
    // Wait for all parallel spawns to complete
    const spawnResults = await Promise.all(spawnPromises);
    // Check if all succeeded
    const allSucceeded = spawnResults.every(r => r.success);
    results.success = allSucceeded;
    console.log(`[Spawning] Parallel spawning complete: ${results.completed_sorties}/${results.total_sorties} succeeded`);
    return results;
}
// ============================================================================
// SEQUENTIAL SPAWNING
// ============================================================================
/**
 * Spawn sorties sequentially
 *
 * Dependent sorties are spawned one at a time, waiting for each to complete
 * before spawning the next. Dependencies are respected.
 */
export async function spawnSequential(sorties) {
    console.log(`[Spawning] Spawning ${sorties.length} sorties sequentially`);
    const db = getAdapter();
    const results = {
        success: true,
        parallel_groups: sorties.map(s => [s]),
        total_sorties: sorties.length,
        completed_sorties: 0,
        failed_sorties: 0,
        errors: [],
    };
    const completedSortieIds = new Set();
    // Spawn sorties one at a time
    for (const sortie of sorties) {
        try {
            // Check if dependencies are met
            if (sortie.dependencies && sortie.dependencies.length > 0) {
                const depsNotMet = sortie.dependencies.filter(depId => !completedSortieIds.has(depId));
                if (depsNotMet.length > 0) {
                    const message = `Dependencies not met: ${depsNotMet.join(', ')}`;
                    console.warn(`[Spawning] Skipping sortie ${sortie.id}: ${message}`);
                    results.errors.push(`Sortie ${sortie.id}: ${message}`);
                    results.failed_sorties++;
                    continue;
                }
            }
            console.log(`[Spawning] Spawning specialist for sortie ${sortie.id}`);
            // In a real implementation, this would use the Task tool with run_in_background: false
            // For now, we just mark the sortie as assigned
            await db.sorties.update(sortie.id, {
                assigned_to: `specialist-${sortie.id.substring(0, 8)}`,
            });
            completedSortieIds.add(sortie.id);
            results.completed_sorties++;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[Spawning] Error spawning sortie ${sortie.id}:`, message);
            results.failed_sorties++;
            results.errors.push(`Failed to spawn sortie ${sortie.id}: ${message}`);
        }
    }
    console.log(`[Spawning] Sequential spawning complete: ${results.completed_sorties}/${results.total_sorties} succeeded`);
    return results;
}
// ============================================================================
// MIXED SPAWNING (Parallel + Sequential)
// ============================================================================
/**
 * Spawn sorties with mixed parallel and sequential groups
 *
 * This is the main spawning function that:
 * 1. Identifies independent sorties (parallel group)
 * 2. Spawns them in parallel
 * 3. Identifies dependent sorties (sequential groups)
 * 4. Spawns them sequentially after dependencies complete
 */
export async function spawnMixed(sorties) {
    console.log(`[Spawning] Spawning ${sorties.length} sorties with mixed strategy`);
    const results = {
        success: true,
        parallel_groups: [],
        total_sorties: sorties.length,
        completed_sorties: 0,
        failed_sorties: 0,
        errors: [],
    };
    // Identify independent sorties
    const independentSorties = identifyIndependentSorties(sorties);
    const dependentSorties = identifyDependentSorties(sorties);
    // Spawn independent sorties in parallel
    if (independentSorties.length > 0) {
        console.log(`[Spawning] Spawning ${independentSorties.length} independent sorties in parallel`);
        const parallelResults = await spawnParallel(independentSorties);
        results.parallel_groups.push(independentSorties);
        results.completed_sorties += parallelResults.completed_sorties;
        results.failed_sorties += parallelResults.failed_sorties;
        results.errors.push(...parallelResults.errors);
        results.success = results.success && parallelResults.success;
    }
    // Spawn dependent sorties sequentially
    if (dependentSorties.length > 0) {
        console.log(`[Spawning] Spawning ${dependentSorties.length} dependent sorties sequentially`);
        const sequentialResults = await spawnSequential(dependentSorties);
        results.parallel_groups.push(...sequentialResults.parallel_groups);
        results.completed_sorties += sequentialResults.completed_sorties;
        results.failed_sorties += sequentialResults.failed_sorties;
        results.errors.push(...sequentialResults.errors);
        results.success = results.success && sequentialResults.success;
    }
    console.log(`[Spawning] Mixed spawning complete: ${results.completed_sorties}/${results.total_sorties} succeeded`);
    return results;
}
// ============================================================================
// MAIN SPAWNING ORCHESTRATION
// ============================================================================
/**
 * Spawn all sorties for a mission
 *
 * This is the main entry point that:
 * 1. Gets all sorties for the mission
 * 2. Determines spawning strategy (parallel, sequential, or mixed)
 * 3. Spawns specialists for each sortie
 * 4. Waits for completion
 */
export async function spawnForMission(mission) {
    console.log(`[Spawning] Starting spawning for mission ${mission.id}`);
    const db = getAdapter();
    // Get all sorties
    const sorties = await db.sorties.getByMission(mission.id);
    const pendingSorties = sorties.filter(s => s.status === 'pending');
    if (pendingSorties.length === 0) {
        console.log(`[Spawning] No pending sorties for mission ${mission.id}`);
        return {
            success: true,
            parallel_groups: [],
            total_sorties: 0,
            completed_sorties: 0,
            failed_sorties: 0,
            errors: [],
        };
    }
    // Determine if we have dependencies
    const hasDependencies = pendingSorties.some(s => s.metadata?.dependencies);
    if (hasDependencies) {
        // Use mixed spawning strategy
        const sortiesWithDeps = pendingSorties.map(s => ({
            ...s,
            dependencies: s.metadata?.dependencies || [],
        }));
        return spawnMixed(sortiesWithDeps);
    }
    else {
        // Use parallel spawning strategy
        return spawnParallel(pendingSorties);
    }
}
//# sourceMappingURL=spawning.js.map