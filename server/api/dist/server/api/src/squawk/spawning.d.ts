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
import type { Sortie, Mission } from '../../../../squawk/src/db/types.js';
/**
 * Sortie with dependency information
 */
export interface SortieWithDeps extends Sortie {
    dependencies?: string[];
}
/**
 * Spawning result
 */
export interface SpawningResult {
    success: boolean;
    parallel_groups: Sortie[][];
    total_sorties: number;
    completed_sorties: number;
    failed_sorties: number;
    errors: string[];
}
/**
 * Identify independent sorties (no dependencies)
 */
export declare function identifyIndependentSorties(sorties: SortieWithDeps[]): Sortie[];
/**
 * Identify dependent sorties
 */
export declare function identifyDependentSorties(sorties: SortieWithDeps[]): SortieWithDeps[];
/**
 * Spawn sorties in parallel
 *
 * Independent sorties are spawned simultaneously using background tasks.
 * The function waits for all parallel sorties to complete before returning.
 */
export declare function spawnParallel(sorties: Sortie[]): Promise<SpawningResult>;
/**
 * Spawn sorties sequentially
 *
 * Dependent sorties are spawned one at a time, waiting for each to complete
 * before spawning the next. Dependencies are respected.
 */
export declare function spawnSequential(sorties: SortieWithDeps[]): Promise<SpawningResult>;
/**
 * Spawn sorties with mixed parallel and sequential groups
 *
 * This is the main spawning function that:
 * 1. Identifies independent sorties (parallel group)
 * 2. Spawns them in parallel
 * 3. Identifies dependent sorties (sequential groups)
 * 4. Spawns them sequentially after dependencies complete
 */
export declare function spawnMixed(sorties: SortieWithDeps[]): Promise<SpawningResult>;
/**
 * Spawn all sorties for a mission
 *
 * This is the main entry point that:
 * 1. Gets all sorties for the mission
 * 2. Determines spawning strategy (parallel, sequential, or mixed)
 * 3. Spawns specialists for each sortie
 * 4. Waits for completion
 */
export declare function spawnForMission(mission: Mission): Promise<SpawningResult>;
//# sourceMappingURL=spawning.d.ts.map