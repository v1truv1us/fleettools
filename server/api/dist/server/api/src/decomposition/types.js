/**
 * FleetTools Phase 4: Task Decomposition - Type Definitions
 *
 * Defines the SortieTree schema and related types for LLM-powered task decomposition.
 * These types bridge human intent to actionable work units (Sorties) that can be
 * executed in parallel or sequentially by specialist agents.
 *
 * @since 4.0.0 - Initial implementation
 * @last-updated 2026-01-08
 */
import { z } from 'zod';
// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================
/**
 * Zod schemas for runtime validation of decomposition types
 */
export const MissionSchema = z.object({
    id: z.string().regex(/^msn-[a-z0-9]{8}$/),
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    strategy: z.enum(['file-based', 'feature-based', 'risk-based', 'research-based']),
    status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
    total_sorties: z.number().int().positive(),
    estimated_effort_hours: z.number().positive(),
    created_at: z.string().datetime(),
    metadata: z.record(z.unknown()).optional(),
});
export const SortieScopeSchema = z.object({
    files: z.array(z.string()),
    components: z.array(z.string()),
    functions: z.array(z.string()),
});
export const SortieSchema = z.object({
    id: z.string().regex(/^srt-[a-z0-9]{8}$/),
    mission_id: z.string().regex(/^msn-[a-z0-9]{8}$/),
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    scope: SortieScopeSchema,
    complexity: z.enum(['low', 'medium', 'high']),
    estimated_effort_hours: z.number().positive(),
    dependencies: z.array(z.string().regex(/^srt-[a-z0-9]{8}$/)),
    status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
    assigned_to: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
});
export const SortieDependencySchema = z.object({
    from_sortie: z.string().regex(/^srt-[a-z0-9]{8}$/),
    to_sortie: z.string().regex(/^srt-[a-z0-9]{8}$/),
    reason: z.string().min(1).max(500),
});
export const ParallelizationInfoSchema = z.object({
    parallel_groups: z.array(z.array(SortieSchema)),
    critical_path: z.array(SortieSchema),
    estimated_duration_ms: z.number().int().positive(),
    parallelization_potential: z.number().min(0).max(1),
    estimated_speedup: z.number().positive(),
});
export const SortieTreeSchema = z.object({
    mission: MissionSchema,
    sorties: z.array(SortieSchema),
    dependencies: z.array(SortieDependencySchema),
    parallelization: ParallelizationInfoSchema,
});
//# sourceMappingURL=types.js.map