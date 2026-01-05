/**
 * FleetTools Shared Database Interfaces
 *
 * This file defines the contract between Phase 2 (SQLite Persistence) and Phase 3 (Context Survival).
 * Both phases implement these interfaces to enable parallel development.
 *
 * @since 1.0.0 - Initial interface definitions
 * @last-updated 2026-01-04
 *
 * Architecture:
 * Phase 2: SQLite-backed operations (real implementation)
 * Phase 3: Mock implementations (for parallel development)
 * Contract tests ensure both implementations behave identically
 *
 */
export {};
// ============================================================================
// JSDOC REFERENCES
// ============================================================================
/**
 * @see [MissionOps](#) for mission operation details
 * @see [SortieOps](#) for sortie operation details
 * @see [LockOps](#) for lock operation details
 * @see [EventOps](#) for event operation details
 * @see [MessageOps](#) for message operation details
 * @see [CursorOps](#) for cursor operation details
 * @see [CheckpointOps](#) for checkpoint operation details
 * @see [SpecialistOps](#) for specialist operation details
 * @see [DatabaseAdapter](#) for database adapter details
 * @see [DatabaseStats](#) for database statistics details
 * @since [1.0.0](https://) for versioning information
 */ 
//# sourceMappingURL=types.js.map