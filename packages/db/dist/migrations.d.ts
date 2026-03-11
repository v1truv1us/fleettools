/**
 * FleetTools Database Migrations
 *
 * Migration management for Drizzle schema.
 */
import type { DrizzleDB } from './client.js';
/**
 * Run all pending migrations
 */
export declare function runMigrations(db: DrizzleDB): Promise<void>;
/**
 * Get migration status
 */
export declare function getMigrationStatus(db: DrizzleDB): Promise<{
    current: string | null;
    available: string[];
    pending: string[];
}>;
/**
 * Rollback to specific migration (simplified)
 */
export declare function rollbackMigration(db: DrizzleDB, targetVersion: string): Promise<void>;
//# sourceMappingURL=migrations.d.ts.map