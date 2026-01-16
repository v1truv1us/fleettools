/**
 * FleetTools Database Migrations
 * 
 * Migration management for Drizzle schema.
 */

import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import type { DrizzleDB } from './client.js';
import migrationConfig from './drizzle.config.js';

/**
 * Run all pending migrations
 */
export async function runMigrations(db: DrizzleDB): Promise<void> {
  try {
    await migrate(db, { ...migrationConfig, migrationsFolder: './drizzle/migrations' });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(db: DrizzleDB): Promise<{
  current: string | null;
  available: string[];
  pending: string[];
}> {
  try {
    // Check if migrations table exists
    const tableCheck = await db.get<{ name: string }>(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='__drizzle_migrations'
    `);

    if (!tableCheck) {
      return {
        current: null,
        available: await getAvailableMigrations(),
        pending: await getAvailableMigrations(),
      };
    }

    // Get current migration
    const current = await db.get<{ migration_name: string }>(`
      SELECT migration_name FROM __drizzle_migrations 
      ORDER BY id DESC LIMIT 1
    `);

    const available = await getAvailableMigrations();
    const currentIndex = current ? available.indexOf(current.migration_name) : -1;
    const pending = available.slice(currentIndex + 1);

    return {
      current: current?.migration_name || null,
      available,
      pending,
    };
  } catch (error) {
    console.error('Failed to get migration status:', error);
    return {
      current: null,
      available: [],
      pending: [],
    };
  }
}

/**
 * Rollback to specific migration (simplified)
 */
export async function rollbackMigration(
  db: DrizzleDB, 
  targetVersion: string
): Promise<void> {
  try {
    console.warn(`Rollback to ${targetVersion} requested - not implemented`);
    console.warn('For production, implement proper rollback using backup/restore');
    throw new Error('Rollback not implemented in this simplified version');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

/**
 * Get available migration files
 */
async function getAvailableMigrations(): Promise<string[]> {
  try {
    // This would typically scan migration files
    // For now, return the initial migration
    return ['0001_initial_schema'];
  } catch (error) {
    console.error('Failed to get available migrations:', error);
    return [];
  }
}
