import { describe, test, expect, beforeEach } from 'bun:test';
import { createInMemoryDb } from '../src/client.js';
import { pilotsTable, eventsTable } from '../src/schema/index.js';

describe('FleetDB Client', () => {
  let db: ReturnType<typeof createInMemoryDb>;

  beforeEach(() => {
    db = createInMemoryDb();
  });

  test('creates in-memory database', () => {
    expect(db).toBeDefined();
  });

  test('inserts and queries pilots', async () => {
    await db.run(`CREATE TABLE IF NOT EXISTS pilots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_key TEXT NOT NULL,
      callsign TEXT NOT NULL,
      program TEXT DEFAULT 'opencode',
      model TEXT DEFAULT 'unknown',
      task_description TEXT,
      registered_at INTEGER NOT NULL,
      last_active_at INTEGER NOT NULL
    )`);

    const now = Date.now();
    await db.insert(pilotsTable).values({
      project_key: '/test/project',
      callsign: 'viper-1',
      program: 'opencode',
      model: 'claude-sonnet',
      registered_at: now,
      last_active_at: now,
    });

    const pilots = await db.select().from(pilotsTable);
    expect(pilots).toHaveLength(1);
    expect(pilots[0].callsign).toBe('viper-1');
  });

  test('inserts and queries events', async () => {
    await db.run(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      project_key TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      sequence INTEGER GENERATED ALWAYS AS (id),
      data TEXT NOT NULL
    )`);

    const now = Date.now();
    await db.insert(eventsTable).values({
      type: 'pilot_registered',
      project_key: '/test/project',
      timestamp: now,
      data: JSON.stringify({ callsign: 'viper-1' }),
    });

    const events = await db.select().from(eventsTable);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('pilot_registered');
  });
});
