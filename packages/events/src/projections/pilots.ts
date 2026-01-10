/**
 * FleetTools Pilot Projection (Simplified)
 * 
 * Updates pilots table from pilot events using raw SQL.
 */

import Database from 'bun:sqlite';
import type { DrizzleDB } from '@fleettools/db';
import type { 
  PilotRegisteredEvent, 
  PilotActiveEvent, 
  PilotDeregisteredEvent 
} from '../types/pilots.js';

/**
 * Get underlying SQLite database for raw SQL access
 */
function getSQLiteDb(db: DrizzleDB): Database {
  // Access underlying SQLite database from Drizzle client
  return (db as any).$client;
}

/**
 * Handle pilot registered event
 */
export async function handlePilotRegistered(
  db: DrizzleDB, 
  event: PilotRegisteredEvent, 
  projectKey: string
) {
  const sqlite = getSQLiteDb(db);
  
  // Create pilots table if it doesn't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS pilots (
      project_key TEXT NOT NULL,
      callsign TEXT NOT NULL,
      program TEXT NOT NULL,
      model TEXT NOT NULL,
      task_description TEXT,
      registered_at INTEGER NOT NULL,
      last_active_at INTEGER NOT NULL,
      PRIMARY KEY (project_key, callsign)
    )
  `);
  
  // Create indexes for performance
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_pilots_project ON pilots(project_key);
    CREATE INDEX IF NOT EXISTS idx_pilots_callsign ON pilots(callsign);
  `);

  const stmt = sqlite.prepare(`
    INSERT OR REPLACE INTO pilots (
      project_key, callsign, program, model, task_description, registered_at, last_active_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    projectKey,
    event.data.callsign,
    event.data.program,
    event.data.model,
    event.data.task_description || null,
    new Date(event.timestamp).getTime(),
    new Date(event.timestamp).getTime(),
  );
}

/**
 * Handle pilot active event
 */
export async function handlePilotActive(
  db: DrizzleDB, 
  event: PilotActiveEvent, 
  projectKey: string
) {
  const sqlite = getSQLiteDb(db);
  
  const stmt = sqlite.prepare(`
    UPDATE pilots 
    SET task_description = ?, last_active_at = ?
    WHERE project_key = ? AND callsign = ?
  `);
  
  stmt.run(
    event.data.current_task || null,
    new Date(event.timestamp).getTime(),
    projectKey,
    event.data.callsign,
  );
}

/**
 * Handle pilot deregistered event
 */
export async function handlePilotDeregistered(
  db: DrizzleDB, 
  event: PilotDeregisteredEvent, 
  projectKey: string
) {
  const sqlite = getSQLiteDb(db);
  
  const stmt = sqlite.prepare(`
    DELETE FROM pilots 
    WHERE project_key = ? AND callsign = ?
  `);
  
  stmt.run(
    projectKey,
    event.data.callsign,
  );
}