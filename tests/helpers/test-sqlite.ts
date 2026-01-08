
import Database from 'bun:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'squawk', 'src', 'db', 'schema.sql');

export function createTestDatabase(): Database {
  const db = new Database(':memory:');

  db.exec('PRAGMA journal_mode = WAL');

  db.exec('PRAGMA foreign_keys = ON');

  return db;
}

export function initializeSchema(db: Database): void {
  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(`Schema file not found: ${SCHEMA_PATH}`);
  }

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

  try {
    db.exec(schema);
  } catch (error) {
    console.error('Error executing schema:', error);
    throw error;
  }
}

export function createInitializedDatabase(): Database {
  const db = createTestDatabase();
  initializeSchema(db);
  return db;
}

export function cleanupDatabase(db: Database): void {
  try {
    db.close();
  } catch (error) {
    console.warn('Error closing database:', error);
  }
}

export function getRowCount(db: Database, tableName: string): number {
  const result = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
  return result.count;
}

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

export function queryAll(db: Database, query: string, params: any[] = []): any[] {
  return db.prepare(query).all(...params);
}

export function queryOne(db: Database, query: string, params: any[] = []): any | null {
  return db.prepare(query).get(...params) || null;
}

export function isWalEnabled(db: Database): boolean {
  const result = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
  
  const mode = result.journal_mode.toLowerCase();
  return mode === 'wal' || mode === 'memory';
}

export function isHealthy(db: Database): boolean {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}

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

export function loadFixtures(db: Database): void {
  insertTestData(db, 'mailboxes', fixtures.mailboxes);
  insertTestData(db, 'specialists', fixtures.specialists);
  insertTestData(db, 'locks', fixtures.locks);
  insertTestData(db, 'events', fixtures.events);
}
