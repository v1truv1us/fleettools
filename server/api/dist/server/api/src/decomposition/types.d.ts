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
/**
 * Mission - High-level task description
 *
 * Represents a user's intent that has been decomposed into parallelizable sorties.
 * A mission is the parent container for all related sorties.
 */
export interface Mission {
    /** Unique identifier (format: msn-<uuid8>) */
    id: string;
    /** User-provided task title */
    title: string;
    /** Detailed task description */
    description: string;
    /** Decomposition strategy used */
    strategy: DecompositionStrategy;
    /** Current mission status */
    status: MissionStatus;
    /** Total number of sorties in this mission */
    total_sorties: number;
    /** Estimated effort in hours */
    estimated_effort_hours: number;
    /** When mission was created (ISO 8601) */
    created_at: string;
    /** Optional metadata */
    metadata?: Record<string, unknown>;
}
export type MissionStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type DecompositionStrategy = 'file-based' | 'feature-based' | 'risk-based' | 'research-based';
/**
 * Sortie - Atomic work unit
 *
 * Represents a single, parallelizable task that a specialist can execute.
 * Sorties can have dependencies on other sorties.
 */
export interface Sortie {
    /** Unique identifier (format: srt-<uuid8>) */
    id: string;
    /** Parent mission ID */
    mission_id: string;
    /** Sortie title */
    title: string;
    /** Detailed description of work to be done */
    description: string;
    /** Scope of work */
    scope: SortieScope;
    /** Complexity level */
    complexity: ComplexityLevel;
    /** Estimated effort in hours */
    estimated_effort_hours: number;
    /** IDs of sorties this depends on */
    dependencies: string[];
    /** Current status */
    status: SortieStatus;
    /** Optional specialist ID assigned to this sortie */
    assigned_to?: string;
    /** Optional metadata */
    metadata?: Record<string, unknown>;
}
export type SortieStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type ComplexityLevel = 'low' | 'medium' | 'high';
/**
 * SortieScope - Defines what a sortie will touch
 */
export interface SortieScope {
    /** File paths to be modified */
    files: string[];
    /** Component names to be modified */
    components: string[];
    /** Function names to be modified */
    functions: string[];
}
/**
 * SortieDependency - Explicit dependency relationship
 */
export interface SortieDependency {
    /** ID of the sortie that must complete first */
    from_sortie: string;
    /** ID of the sortie that depends on from_sortie */
    to_sortie: string;
    /** Reason for the dependency */
    reason: string;
}
/**
 * ParallelizationInfo - Analysis of parallelization opportunities
 */
export interface ParallelizationInfo {
    /** Groups of sorties that can run in parallel */
    parallel_groups: Sortie[][];
    /** Critical path (longest dependency chain) */
    critical_path: Sortie[];
    /** Estimated total duration in milliseconds */
    estimated_duration_ms: number;
    /** Parallelization potential (0-1) */
    parallelization_potential: number;
    /** Estimated speedup from parallelization */
    estimated_speedup: number;
}
/**
 * SortieTree - Complete decomposition result
 *
 * Contains the mission, all sorties, dependencies, and parallelization analysis.
 * This is the output of the LLM planner and input to the spawning system.
 */
export interface SortieTree {
    /** The mission being decomposed */
    mission: Mission;
    /** All sorties in the mission */
    sorties: Sortie[];
    /** Explicit dependencies between sorties */
    dependencies: SortieDependency[];
    /** Parallelization analysis */
    parallelization: ParallelizationInfo;
}
/**
 * Zod schemas for runtime validation of decomposition types
 */
export declare const MissionSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    strategy: z.ZodEnum<["file-based", "feature-based", "risk-based", "research-based"]>;
    status: z.ZodEnum<["pending", "in_progress", "completed", "failed"]>;
    total_sorties: z.ZodNumber;
    estimated_effort_hours: z.ZodNumber;
    created_at: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    total_sorties?: number;
    id?: string;
    created_at?: string;
    metadata?: Record<string, unknown>;
    title?: string;
    description?: string;
    strategy?: "file-based" | "feature-based" | "risk-based" | "research-based";
    status?: "pending" | "in_progress" | "completed" | "failed";
    estimated_effort_hours?: number;
}, {
    total_sorties?: number;
    id?: string;
    created_at?: string;
    metadata?: Record<string, unknown>;
    title?: string;
    description?: string;
    strategy?: "file-based" | "feature-based" | "risk-based" | "research-based";
    status?: "pending" | "in_progress" | "completed" | "failed";
    estimated_effort_hours?: number;
}>;
export declare const SortieScopeSchema: z.ZodObject<{
    files: z.ZodArray<z.ZodString, "many">;
    components: z.ZodArray<z.ZodString, "many">;
    functions: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    files?: string[];
    components?: string[];
    functions?: string[];
}, {
    files?: string[];
    components?: string[];
    functions?: string[];
}>;
export declare const SortieSchema: z.ZodObject<{
    id: z.ZodString;
    mission_id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    scope: z.ZodObject<{
        files: z.ZodArray<z.ZodString, "many">;
        components: z.ZodArray<z.ZodString, "many">;
        functions: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        files?: string[];
        components?: string[];
        functions?: string[];
    }, {
        files?: string[];
        components?: string[];
        functions?: string[];
    }>;
    complexity: z.ZodEnum<["low", "medium", "high"]>;
    estimated_effort_hours: z.ZodNumber;
    dependencies: z.ZodArray<z.ZodString, "many">;
    status: z.ZodEnum<["pending", "in_progress", "completed", "failed"]>;
    assigned_to: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    metadata?: Record<string, unknown>;
    title?: string;
    description?: string;
    status?: "pending" | "in_progress" | "completed" | "failed";
    estimated_effort_hours?: number;
    mission_id?: string;
    scope?: {
        files?: string[];
        components?: string[];
        functions?: string[];
    };
    complexity?: "low" | "medium" | "high";
    dependencies?: string[];
    assigned_to?: string;
}, {
    id?: string;
    metadata?: Record<string, unknown>;
    title?: string;
    description?: string;
    status?: "pending" | "in_progress" | "completed" | "failed";
    estimated_effort_hours?: number;
    mission_id?: string;
    scope?: {
        files?: string[];
        components?: string[];
        functions?: string[];
    };
    complexity?: "low" | "medium" | "high";
    dependencies?: string[];
    assigned_to?: string;
}>;
export declare const SortieDependencySchema: z.ZodObject<{
    from_sortie: z.ZodString;
    to_sortie: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    from_sortie?: string;
    to_sortie?: string;
    reason?: string;
}, {
    from_sortie?: string;
    to_sortie?: string;
    reason?: string;
}>;
export declare const ParallelizationInfoSchema: z.ZodObject<{
    parallel_groups: z.ZodArray<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        mission_id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        scope: z.ZodObject<{
            files: z.ZodArray<z.ZodString, "many">;
            components: z.ZodArray<z.ZodString, "many">;
            functions: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            files?: string[];
            components?: string[];
            functions?: string[];
        }, {
            files?: string[];
            components?: string[];
            functions?: string[];
        }>;
        complexity: z.ZodEnum<["low", "medium", "high"]>;
        estimated_effort_hours: z.ZodNumber;
        dependencies: z.ZodArray<z.ZodString, "many">;
        status: z.ZodEnum<["pending", "in_progress", "completed", "failed"]>;
        assigned_to: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
        mission_id?: string;
        scope?: {
            files?: string[];
            components?: string[];
            functions?: string[];
        };
        complexity?: "low" | "medium" | "high";
        dependencies?: string[];
        assigned_to?: string;
    }, {
        id?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
        mission_id?: string;
        scope?: {
            files?: string[];
            components?: string[];
            functions?: string[];
        };
        complexity?: "low" | "medium" | "high";
        dependencies?: string[];
        assigned_to?: string;
    }>, "many">, "many">;
    critical_path: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        mission_id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        scope: z.ZodObject<{
            files: z.ZodArray<z.ZodString, "many">;
            components: z.ZodArray<z.ZodString, "many">;
            functions: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            files?: string[];
            components?: string[];
            functions?: string[];
        }, {
            files?: string[];
            components?: string[];
            functions?: string[];
        }>;
        complexity: z.ZodEnum<["low", "medium", "high"]>;
        estimated_effort_hours: z.ZodNumber;
        dependencies: z.ZodArray<z.ZodString, "many">;
        status: z.ZodEnum<["pending", "in_progress", "completed", "failed"]>;
        assigned_to: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
        mission_id?: string;
        scope?: {
            files?: string[];
            components?: string[];
            functions?: string[];
        };
        complexity?: "low" | "medium" | "high";
        dependencies?: string[];
        assigned_to?: string;
    }, {
        id?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
        mission_id?: string;
        scope?: {
            files?: string[];
            components?: string[];
            functions?: string[];
        };
        complexity?: "low" | "medium" | "high";
        dependencies?: string[];
        assigned_to?: string;
    }>, "many">;
    estimated_duration_ms: z.ZodNumber;
    parallelization_potential: z.ZodNumber;
    estimated_speedup: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    parallel_groups?: {
        id?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
        mission_id?: string;
        scope?: {
            files?: string[];
            components?: string[];
            functions?: string[];
        };
        complexity?: "low" | "medium" | "high";
        dependencies?: string[];
        assigned_to?: string;
    }[][];
    critical_path?: {
        id?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
        mission_id?: string;
        scope?: {
            files?: string[];
            components?: string[];
            functions?: string[];
        };
        complexity?: "low" | "medium" | "high";
        dependencies?: string[];
        assigned_to?: string;
    }[];
    estimated_duration_ms?: number;
    parallelization_potential?: number;
    estimated_speedup?: number;
}, {
    parallel_groups?: {
        id?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
        mission_id?: string;
        scope?: {
            files?: string[];
            components?: string[];
            functions?: string[];
        };
        complexity?: "low" | "medium" | "high";
        dependencies?: string[];
        assigned_to?: string;
    }[][];
    critical_path?: {
        id?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
        mission_id?: string;
        scope?: {
            files?: string[];
            components?: string[];
            functions?: string[];
        };
        complexity?: "low" | "medium" | "high";
        dependencies?: string[];
        assigned_to?: string;
    }[];
    estimated_duration_ms?: number;
    parallelization_potential?: number;
    estimated_speedup?: number;
}>;
export declare const SortieTreeSchema: z.ZodObject<{
    mission: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        strategy: z.ZodEnum<["file-based", "feature-based", "risk-based", "research-based"]>;
        status: z.ZodEnum<["pending", "in_progress", "completed", "failed"]>;
        total_sorties: z.ZodNumber;
        estimated_effort_hours: z.ZodNumber;
        created_at: z.ZodString;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        total_sorties?: number;
        id?: string;
        created_at?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        strategy?: "file-based" | "feature-based" | "risk-based" | "research-based";
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
    }, {
        total_sorties?: number;
        id?: string;
        created_at?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        strategy?: "file-based" | "feature-based" | "risk-based" | "research-based";
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
    }>;
    sorties: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        mission_id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        scope: z.ZodObject<{
            files: z.ZodArray<z.ZodString, "many">;
            components: z.ZodArray<z.ZodString, "many">;
            functions: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            files?: string[];
            components?: string[];
            functions?: string[];
        }, {
            files?: string[];
            components?: string[];
            functions?: string[];
        }>;
        complexity: z.ZodEnum<["low", "medium", "high"]>;
        estimated_effort_hours: z.ZodNumber;
        dependencies: z.ZodArray<z.ZodString, "many">;
        status: z.ZodEnum<["pending", "in_progress", "completed", "failed"]>;
        assigned_to: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
        mission_id?: string;
        scope?: {
            files?: string[];
            components?: string[];
            functions?: string[];
        };
        complexity?: "low" | "medium" | "high";
        dependencies?: string[];
        assigned_to?: string;
    }, {
        id?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
        mission_id?: string;
        scope?: {
            files?: string[];
            components?: string[];
            functions?: string[];
        };
        complexity?: "low" | "medium" | "high";
        dependencies?: string[];
        assigned_to?: string;
    }>, "many">;
    dependencies: z.ZodArray<z.ZodObject<{
        from_sortie: z.ZodString;
        to_sortie: z.ZodString;
        reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        from_sortie?: string;
        to_sortie?: string;
        reason?: string;
    }, {
        from_sortie?: string;
        to_sortie?: string;
        reason?: string;
    }>, "many">;
    parallelization: z.ZodObject<{
        parallel_groups: z.ZodArray<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            mission_id: z.ZodString;
            title: z.ZodString;
            description: z.ZodString;
            scope: z.ZodObject<{
                files: z.ZodArray<z.ZodString, "many">;
                components: z.ZodArray<z.ZodString, "many">;
                functions: z.ZodArray<z.ZodString, "many">;
            }, "strip", z.ZodTypeAny, {
                files?: string[];
                components?: string[];
                functions?: string[];
            }, {
                files?: string[];
                components?: string[];
                functions?: string[];
            }>;
            complexity: z.ZodEnum<["low", "medium", "high"]>;
            estimated_effort_hours: z.ZodNumber;
            dependencies: z.ZodArray<z.ZodString, "many">;
            status: z.ZodEnum<["pending", "in_progress", "completed", "failed"]>;
            assigned_to: z.ZodOptional<z.ZodString>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            metadata?: Record<string, unknown>;
            title?: string;
            description?: string;
            status?: "pending" | "in_progress" | "completed" | "failed";
            estimated_effort_hours?: number;
            mission_id?: string;
            scope?: {
                files?: string[];
                components?: string[];
                functions?: string[];
            };
            complexity?: "low" | "medium" | "high";
            dependencies?: string[];
            assigned_to?: string;
        }, {
            id?: string;
            metadata?: Record<string, unknown>;
            title?: string;
            description?: string;
            status?: "pending" | "in_progress" | "completed" | "failed";
            estimated_effort_hours?: number;
            mission_id?: string;
            scope?: {
                files?: string[];
                components?: string[];
                functions?: string[];
            };
            complexity?: "low" | "medium" | "high";
            dependencies?: string[];
            assigned_to?: string;
        }>, "many">, "many">;
        critical_path: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            mission_id: z.ZodString;
            title: z.ZodString;
            description: z.ZodString;
            scope: z.ZodObject<{
                files: z.ZodArray<z.ZodString, "many">;
                components: z.ZodArray<z.ZodString, "many">;
                functions: z.ZodArray<z.ZodString, "many">;
            }, "strip", z.ZodTypeAny, {
                files?: string[];
                components?: string[];
                functions?: string[];
            }, {
                files?: string[];
                components?: string[];
                functions?: string[];
            }>;
            complexity: z.ZodEnum<["low", "medium", "high"]>;
            estimated_effort_hours: z.ZodNumber;
            dependencies: z.ZodArray<z.ZodString, "many">;
            status: z.ZodEnum<["pending", "in_progress", "completed", "failed"]>;
            assigned_to: z.ZodOptional<z.ZodString>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            metadata?: Record<string, unknown>;
            title?: string;
            description?: string;
            status?: "pending" | "in_progress" | "completed" | "failed";
            estimated_effort_hours?: number;
            mission_id?: string;
            scope?: {
                files?: string[];
                components?: string[];
                functions?: string[];
            };
            complexity?: "low" | "medium" | "high";
            dependencies?: string[];
            assigned_to?: string;
        }, {
            id?: string;
            metadata?: Record<string, unknown>;
            title?: string;
            description?: string;
            status?: "pending" | "in_progress" | "completed" | "failed";
            estimated_effort_hours?: number;
            mission_id?: string;
            scope?: {
                files?: string[];
                components?: string[];
                functions?: string[];
            };
            complexity?: "low" | "medium" | "high";
            dependencies?: string[];
            assigned_to?: string;
        }>, "many">;
        estimated_duration_ms: z.ZodNumber;
        parallelization_potential: z.ZodNumber;
        estimated_speedup: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        parallel_groups?: {
            id?: string;
            metadata?: Record<string, unknown>;
            title?: string;
            description?: string;
            status?: "pending" | "in_progress" | "completed" | "failed";
            estimated_effort_hours?: number;
            mission_id?: string;
            scope?: {
                files?: string[];
                components?: string[];
                functions?: string[];
            };
            complexity?: "low" | "medium" | "high";
            dependencies?: string[];
            assigned_to?: string;
        }[][];
        critical_path?: {
            id?: string;
            metadata?: Record<string, unknown>;
            title?: string;
            description?: string;
            status?: "pending" | "in_progress" | "completed" | "failed";
            estimated_effort_hours?: number;
            mission_id?: string;
            scope?: {
                files?: string[];
                components?: string[];
                functions?: string[];
            };
            complexity?: "low" | "medium" | "high";
            dependencies?: string[];
            assigned_to?: string;
        }[];
        estimated_duration_ms?: number;
        parallelization_potential?: number;
        estimated_speedup?: number;
    }, {
        parallel_groups?: {
            id?: string;
            metadata?: Record<string, unknown>;
            title?: string;
            description?: string;
            status?: "pending" | "in_progress" | "completed" | "failed";
            estimated_effort_hours?: number;
            mission_id?: string;
            scope?: {
                files?: string[];
                components?: string[];
                functions?: string[];
            };
            complexity?: "low" | "medium" | "high";
            dependencies?: string[];
            assigned_to?: string;
        }[][];
        critical_path?: {
            id?: string;
            metadata?: Record<string, unknown>;
            title?: string;
            description?: string;
            status?: "pending" | "in_progress" | "completed" | "failed";
            estimated_effort_hours?: number;
            mission_id?: string;
            scope?: {
                files?: string[];
                components?: string[];
                functions?: string[];
            };
            complexity?: "low" | "medium" | "high";
            dependencies?: string[];
            assigned_to?: string;
        }[];
        estimated_duration_ms?: number;
        parallelization_potential?: number;
        estimated_speedup?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    mission?: {
        total_sorties?: number;
        id?: string;
        created_at?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        strategy?: "file-based" | "feature-based" | "risk-based" | "research-based";
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
    };
    dependencies?: {
        from_sortie?: string;
        to_sortie?: string;
        reason?: string;
    }[];
    sorties?: {
        id?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
        mission_id?: string;
        scope?: {
            files?: string[];
            components?: string[];
            functions?: string[];
        };
        complexity?: "low" | "medium" | "high";
        dependencies?: string[];
        assigned_to?: string;
    }[];
    parallelization?: {
        parallel_groups?: {
            id?: string;
            metadata?: Record<string, unknown>;
            title?: string;
            description?: string;
            status?: "pending" | "in_progress" | "completed" | "failed";
            estimated_effort_hours?: number;
            mission_id?: string;
            scope?: {
                files?: string[];
                components?: string[];
                functions?: string[];
            };
            complexity?: "low" | "medium" | "high";
            dependencies?: string[];
            assigned_to?: string;
        }[][];
        critical_path?: {
            id?: string;
            metadata?: Record<string, unknown>;
            title?: string;
            description?: string;
            status?: "pending" | "in_progress" | "completed" | "failed";
            estimated_effort_hours?: number;
            mission_id?: string;
            scope?: {
                files?: string[];
                components?: string[];
                functions?: string[];
            };
            complexity?: "low" | "medium" | "high";
            dependencies?: string[];
            assigned_to?: string;
        }[];
        estimated_duration_ms?: number;
        parallelization_potential?: number;
        estimated_speedup?: number;
    };
}, {
    mission?: {
        total_sorties?: number;
        id?: string;
        created_at?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        strategy?: "file-based" | "feature-based" | "risk-based" | "research-based";
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
    };
    dependencies?: {
        from_sortie?: string;
        to_sortie?: string;
        reason?: string;
    }[];
    sorties?: {
        id?: string;
        metadata?: Record<string, unknown>;
        title?: string;
        description?: string;
        status?: "pending" | "in_progress" | "completed" | "failed";
        estimated_effort_hours?: number;
        mission_id?: string;
        scope?: {
            files?: string[];
            components?: string[];
            functions?: string[];
        };
        complexity?: "low" | "medium" | "high";
        dependencies?: string[];
        assigned_to?: string;
    }[];
    parallelization?: {
        parallel_groups?: {
            id?: string;
            metadata?: Record<string, unknown>;
            title?: string;
            description?: string;
            status?: "pending" | "in_progress" | "completed" | "failed";
            estimated_effort_hours?: number;
            mission_id?: string;
            scope?: {
                files?: string[];
                components?: string[];
                functions?: string[];
            };
            complexity?: "low" | "medium" | "high";
            dependencies?: string[];
            assigned_to?: string;
        }[][];
        critical_path?: {
            id?: string;
            metadata?: Record<string, unknown>;
            title?: string;
            description?: string;
            status?: "pending" | "in_progress" | "completed" | "failed";
            estimated_effort_hours?: number;
            mission_id?: string;
            scope?: {
                files?: string[];
                components?: string[];
                functions?: string[];
            };
            complexity?: "low" | "medium" | "high";
            dependencies?: string[];
            assigned_to?: string;
        }[];
        estimated_duration_ms?: number;
        parallelization_potential?: number;
        estimated_speedup?: number;
    };
}>;
/**
 * DecompositionRequest - Input to the decomposition system
 */
export interface DecompositionRequest {
    /** User's high-level task description */
    task_description: string;
    /** Optional strategy hint (auto-selected if not provided) */
    strategy?: DecompositionStrategy;
    /** Optional context about the codebase */
    context?: string;
    /** Optional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * DecompositionResponse - Output from the decomposition system
 */
export interface DecompositionResponse {
    /** The generated SortieTree */
    sortie_tree: SortieTree;
    /** Validation errors (if any) */
    validation_errors?: string[];
    /** Warnings (if any) */
    warnings?: string[];
    /** Metadata about the decomposition process */
    metadata?: {
        strategy_selected: DecompositionStrategy;
        llm_model?: string;
        processing_time_ms?: number;
        codebase_files_analyzed?: number;
    };
}
/**
 * ValidationResult - Result of SortieTree validation
 */
export interface ValidationResult {
    /** Whether validation passed */
    valid: boolean;
    /** List of errors found */
    errors: ValidationError[];
    /** List of warnings */
    warnings: ValidationWarning[];
    /** Metrics about the SortieTree */
    metrics?: {
        total_sorties: number;
        total_dependencies: number;
        max_dependency_depth: number;
        parallel_groups_count: number;
        file_overlap_count: number;
    };
}
export interface ValidationError {
    /** Error type */
    type: 'file_overlap' | 'circular_dependency' | 'missing_dependency' | 'invalid_scope' | 'other';
    /** Human-readable error message */
    message: string;
    /** Affected sortie IDs (if applicable) */
    affected_sorties?: string[];
    /** Suggested fix */
    suggestion?: string;
}
export interface ValidationWarning {
    /** Warning type */
    type: 'high_complexity' | 'long_dependency_chain' | 'unbalanced_effort' | 'other';
    /** Human-readable warning message */
    message: string;
    /** Affected sortie IDs (if applicable) */
    affected_sorties?: string[];
}
/**
 * StrategyAnalysis - Result of strategy selection analysis
 */
export interface StrategyAnalysis {
    /** Selected strategy */
    selected_strategy: DecompositionStrategy;
    /** Confidence score (0-1) */
    confidence: number;
    /** Scores for each strategy */
    strategy_scores: {
        'file-based': number;
        'feature-based': number;
        'risk-based': number;
        'research-based': number;
    };
    /** Keywords that influenced the selection */
    matched_keywords: string[];
    /** Patterns detected in codebase */
    detected_patterns: string[];
}
/**
 * CodebaseAnalysis - Result of codebase analysis
 */
export interface CodebaseAnalysis {
    /** Total files analyzed */
    total_files: number;
    /** File groups by type */
    file_groups: FileGroup[];
    /** Detected patterns and conventions */
    patterns: CodebasePattern[];
    /** Relevant Tech Orders */
    tech_orders: TechOrderReference[];
    /** Generated context for LLM */
    context_summary: string;
    /** File structure overview */
    structure_overview: string;
}
export interface FileGroup {
    /** Group name (e.g., "components", "services") */
    name: string;
    /** Files in this group */
    files: string[];
    /** Group description */
    description: string;
}
export interface CodebasePattern {
    /** Pattern name */
    name: string;
    /** Pattern description */
    description: string;
    /** Examples of this pattern */
    examples: string[];
    /** Confidence (0-1) */
    confidence: number;
}
export interface TechOrderReference {
    /** Tech Order ID */
    id: string;
    /** Tech Order title */
    title: string;
    /** Relevance score (0-1) */
    relevance: number;
    /** Key points from the Tech Order */
    key_points: string[];
}
/**
 * LLMPlannerInput - Input to the LLM planner
 */
export interface LLMPlannerInput {
    /** User's task description */
    task_description: string;
    /** Selected decomposition strategy */
    strategy: DecompositionStrategy;
    /** Codebase analysis results */
    codebase_analysis: CodebaseAnalysis;
    /** Tech Orders context */
    tech_orders_context: string;
}
/**
 * LLMPlannerOutput - Raw output from LLM (before validation)
 */
export interface LLMPlannerOutput {
    /** Mission details */
    mission: {
        title: string;
        description: string;
        strategy: DecompositionStrategy;
        estimated_effort_hours: number;
    };
    /** Sorties */
    sorties: Array<{
        title: string;
        description: string;
        scope: {
            files: string[];
            components: string[];
            functions: string[];
        };
        complexity: ComplexityLevel;
        estimated_effort_hours: number;
        dependencies: number[];
    }>;
    /** Dependencies */
    parallelization?: {
        parallel_groups: number[][];
        critical_path: number[];
        estimated_duration_ms: number;
    };
}
/**
 * DependencyResolutionResult - Result of dependency analysis
 */
export interface DependencyResolutionResult {
    /** Topologically sorted sorties */
    sorted_sorties: Sortie[];
    /** Groups of sorties that can run in parallel */
    parallel_groups: Sortie[][];
    /** Critical path (longest dependency chain) */
    critical_path: Sortie[];
    /** Estimated total duration */
    estimated_duration_ms: number;
    /** Maximum dependency depth */
    max_depth: number;
    /** Circular dependencies found (if any) */
    circular_dependencies?: Array<string[]>;
}
/**
 * ParallelizationAnalysisResult - Result of parallelization analysis
 */
export interface ParallelizationAnalysisResult {
    /** Parallel groups */
    parallel_groups: Sortie[][];
    /** Parallelization potential (0-1) */
    parallelization_potential: number;
    /** Estimated speedup from parallelization */
    estimated_speedup: number;
    /** Recommendations for optimization */
    recommendations: string[];
    /** Bottlenecks identified */
    bottlenecks: string[];
}
//# sourceMappingURL=types.d.ts.map