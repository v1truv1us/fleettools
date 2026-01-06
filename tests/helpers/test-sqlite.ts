/**
 * SQLite Test Helper
 * Provides utilities for testing SQLite databases using Bun's built-in SQLite
 */

import Database from 'bun:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Schema SQL file path
 */
const SCHEMA_PATH = path.join(__dirname, '..', '..', 'squawk', 'src', 'db', 'schema.sql');

/**
 * Create an in-memory SQLite database for testing
 * @returns Database instance
 */
export function createTestDatabase(): Database {
  const db = new Database(':memory:');

  // Enable WAL mode for better concurrency
  db.exec('PRAGMA journal_mode = WAL');

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');

  return db;
}

/**
 * Initialize database schema
 * @param db - Database instance
 */
export function initializeSchema(db: Database): void {
  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(`Schema file not found: ${SCHEMA_PATH}`);
  }

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

  // Execute the entire schema at once - SQLite will handle multiple statements
  try {
    db.exec(schema);
  } catch (error) {
    console.error('Error executing schema:', error);
    throw error;
  }
}

/**
 * Create and initialize a test database
 * @returns Initialized database instance
 */
export function createInitializedDatabase(): Database {
  const db = createTestDatabase();
  initializeSchema(db);
  return db;
}

/**
 * Clean up test database
 * @param db - Database instance to close
 */
export function cleanupDatabase(db: Database): void {
  try {
    db.close();
  } catch (error) {
    // Ignore errors during cleanup
    console.warn('Error closing database:', error);
  }
}

/**
 * Get table row count
 * @param db - Database instance
 * @param tableName - Table name
 * @returns Number of rows in table
 */
export function getRowCount(db: Database, tableName: string): number {
  const result = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
  return result.count;
}

/**
 * Insert test data into a table
 * @param db - Database instance
 * @param tableName - Table name
 * @param data - Array of objects to insert
 */
export function insertTestData(db: Database, tableName: string, data: Record<string, unknown>[]): void {
  if (data.length === 0) return;

  const columns = Object.keys(data[0]);
  const placeholders = columns.map(() => '?').join(', ');

  const insert = db.prepare(
    `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`
  );

  const insertMany = db.transaction((rows: Record<string, unknown>[]) => {
    for (const row of rows) {
      insert.run(...Object.values(row));
    }
  });

  insertMany(data);
}

/**
 * Execute a query and return all results
 * @param db - Database instance
 * @param query - SQL query
 * @param params - Query parameters
 * @returns Query results
 */
export function queryAll(db: Database, query: string, params: any[] = []): any[] {
  return db.prepare(query).all(...params);
}

/**
 * Execute a query and return first result
 * @param db - Database instance
 * @param query - SQL query
 * @param params - Query parameters
 * @returns First result or null
 */
export function queryOne(db: Database, query: string, params: any[] = []): any | null {
  return db.prepare(query).get(...params) || null;
}

/**
 * Check if WAL mode is enabled
 * @param db - Database instance
 * @returns True if WAL mode is enabled (or memory mode for in-memory DBs)
 */
export function isWalEnabled(db: Database): boolean {
  const result = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
  // In-memory databases use 'memory' mode instead of 'wal'
  const mode = result.journal_mode.toLowerCase();
  return mode === 'wal' || mode === 'memory';
}

/**
 * Check if database is healthy (can execute query)
 * @param db - Database instance
 * @returns True if database is healthy
 */
export function isHealthy(db: Database): boolean {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}

/**
 * Test fixture data
 */
export const fixtures = {
  mailboxes: [
    {
      id: 'mbx-test-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],

  specialists: [
    {
      id: 'spec-test-001',
      name: 'Test Specialist',
      status: 'active',
      last_seen: new Date().toISOString(),
      metadata: null
    }
  ],

  locks: [
    {
      id: 'lock-test-001',
      file: '/test/file.txt',
      reserved_by: 'spec-test-001',
      reserved_at: new Date().toISOString(),
      released_at: null,
      purpose: 'edit',
      checksum: 'abc123',
      timeout_ms: 30000,
      metadata: null
    }
  ],

  events: [
    {
      id: 'evt-001',
      mailbox_id: 'mbx-test-001',
      type: 'test_event',
      stream_type: 'mission',
      stream_id: 'stream-001',
      sequence_number: 1,
      data: '{"test": true}',
      occurred_at: new Date().toISOString(),
      causation_id: null,
      correlation_id: null,
      metadata: null
    }
  ]
};

/**
 * Load all test fixtures into database
 * @param db - Database instance
 */
export function loadFixtures(db: Database): void {
  insertTestData(db, 'mailboxes', fixtures.mailboxes);
  insertTestData(db, 'specialists', fixtures.specialists);
  insertTestData(db, 'locks', fixtures.locks);
  insertTestData(db, 'events', fixtures.events);
}
