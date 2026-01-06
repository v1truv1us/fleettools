/**
 * SQLite Database Adapter
 *
 * Provides SQLite-based persistence using Bun's built-in SQLite support.
 * This adapter implements the DatabaseAdapter interface for Phase 2.
 *
 * @version 1.0.0
 */

import Database from 'bun:sqlite';
import fs from 'fs';
import path from 'path';
import type {
  DatabaseAdapter,
  DatabaseStats,
  VersionedInterface,
  MissionOps,
  SortieOps,
  LockOps,
  EventOps,
  CheckpointOps,
  SpecialistOps,
  MessageOps,
  CursorOps,
  Event,
  AppendEventInput,
  EventFilter,
  StreamType,
  Lock,
  Mailbox,
  Cursor
} from './types';

/**
 * SQLite database adapter implementation
 */
export class SQLiteAdapter implements DatabaseAdapter {
  version = '1.0.0' as const;

  private db: Database | null = null;
  private dbPath: string;
  private schemaPath: string;

  // Operations - initialize as stubs, will be replaced in initializeOperations
  public missions: MissionOps = {} as MissionOps;
  public sorties: SortieOps = {} as SortieOps;
  public locks: LockOps = {} as LockOps;
  public events: EventOps = {} as EventOps;
  public checkpoints: CheckpointOps = {} as CheckpointOps;
  public specialists: SpecialistOps = {} as SpecialistOps;
  public messages: MessageOps = {} as MessageOps;
  public cursors: CursorOps = {} as CursorOps;

  /**
   * Create a new SQLite adapter
   * @param dbPath - Path to database file (or ':memory:' for in-memory)
   * @param schemaPath - Optional custom schema path (for testing)
   */
  constructor(dbPath: string = ':memory:', schemaPath?: string) {
    this.dbPath = dbPath;

    // If schema path is explicitly provided (e.g., for testing), use it
    if (schemaPath) {
      this.schemaPath = schemaPath;
      return;
    }

    // Path to schema.sql file - use multiple fallback strategies
    this.schemaPath = this.resolveSchemaPath();
  }

  /**
   * Resolve schema.sql path using multiple fallback strategies
   */
  private resolveSchemaPath(): string {
    const possiblePaths: string[] = [];

    // Strategy 1: Try import.meta.url (standard in Node.js/Bun)
    try {
      const __filename = new URL('', import.meta.url).pathname;
      const __dirname = path.dirname(__filename);
      possiblePaths.push(path.join(__dirname, 'schema.sql'));
    } catch {
      // Ignore errors and continue with other strategies
    }

    // Strategy 2: Try relative path from current working directory
    possiblePaths.push(path.join(process.cwd(), 'squawk', 'src', 'db', 'schema.sql'));

    // Strategy 3: Try from common module locations
    const projectRoot = process.cwd();
    const modulePaths = [
      path.join(projectRoot, 'src', 'db', 'schema.sql'),
      path.join(projectRoot, 'db', 'schema.sql'),
      path.join(projectRoot, 'lib', 'db', 'schema.sql'),
    ];
    possiblePaths.push(...modulePaths);

    // Strategy 4: Try relative to this file's directory using stack trace
    try {
      const stack = new Error().stack;
      if (stack) {
        const match = stack.match(/at.*\((.*):.*\)/);
        if (match && match[1]) {
          const callerDir = path.dirname(match[1]);
          possiblePaths.push(path.join(callerDir, 'schema.sql'));
          possiblePaths.push(path.join(callerDir, '..', 'src', 'db', 'schema.sql'));
        }
      }
    } catch {
      // Ignore errors and continue
    }

    // Find first existing path
    for (const candidatePath of possiblePaths) {
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    }

    // If no existing path found, return the most likely candidate
    // This will fail with a clear error message showing the attempted path
    return possiblePaths[0] || path.join(process.cwd(), 'squawk', 'src', 'db', 'schema.sql');
  }

  /**
   * Initialize database connection and schema
   */
  async initialize(): Promise<void> {
    try {
      // Create database instance
      this.db = new Database(this.dbPath);

      // Enable WAL mode for better concurrency
      if (this.dbPath !== ':memory:') {
        this.db!.exec('PRAGMA journal_mode = WAL');
      }

      // Enable foreign keys
      this.db!.exec('PRAGMA foreign_keys = ON');

      // Load schema
      if (fs.existsSync(this.schemaPath)) {
        const schema = fs.readFileSync(this.schemaPath, 'utf-8');
        this.db!.exec(schema);
      } else {
        throw new Error(`Schema file not found: ${this.schemaPath}`);
      }

      // Initialize operations
      this.initializeOperations();

      console.log(`SQLite database initialized: ${this.dbPath}`);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Initialize operation objects
   */
  private initializeOperations(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // TypeScript workaround for property access
    const adapter = this as any;

    // Mailbox Operations implementation
    adapter.mailboxes = {
      version: '1.0.0',

      create: async (input: any): Promise<any> => {
        const now = new Date().toISOString();
        const createdAt = input.created_at || now;
        const updatedAt = input.updated_at || now;
        this.db!.prepare(`
          INSERT INTO mailboxes (id, created_at, updated_at)
          VALUES (?, ?, ?)
        `).run(input.id, createdAt, updatedAt);
        return { id: input.id, created_at: createdAt, updated_at: updatedAt };
      },

      getById: async (id: string): Promise<any | null> => {
        const row = this.db!.prepare(`
          SELECT * FROM mailboxes WHERE id = ?
        `).get(id) as any;
        return row || null;
      },

      getAll: async (): Promise<any[]> => {
        const rows = this.db!.prepare(`
          SELECT * FROM mailboxes ORDER BY created_at DESC
        `).all() as any[];
        return rows;
      },

      update: async (id: string, data: any): Promise<any | null> => {
        const now = new Date().toISOString();
        const result = this.db!.prepare(`
          UPDATE mailboxes
          SET updated_at = COALESCE(?, updated_at)
          WHERE id = ?
        `).run(now, id);
        if (result.changes === 0) return null;
        return await (this as any).mailboxes.getById(id);
      },

      delete: async (id: string): Promise<boolean> => {
        const result = this.db!.prepare(`
          DELETE FROM mailboxes WHERE id = ?
        `).run(id);
        return result.changes > 0;
      }
    };

    // Cursor Operations implementation
    this.cursors = {
      version: '1.0.0',

      create: async (input: any): Promise<any> => {
        const now = new Date().toISOString();
        this.db!.prepare(`
          INSERT INTO cursors (id, stream_id, position, consumer_id, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(input.id, input.stream_id, input.position, input.consumer_id, now);
        return { id: input.id, stream_id: input.stream_id, position: input.position, consumer_id: input.consumer_id, updated_at: now };
      },

      getById: async (id: string): Promise<any | null> => {
        const row = this.db!.prepare(`
          SELECT * FROM cursors WHERE id = ?
        `).get(id) as any;
        return row || null;
      },

      getByStream: async (streamId: string): Promise<any | null> => {
        const row = this.db!.prepare(`
          SELECT * FROM cursors WHERE stream_id = ?
        `).get(streamId) as any;
        return row || null;
      },

      advance: async (streamId: string, position: number): Promise<any> => {
        const now = new Date().toISOString();
        this.db!.prepare(`
          INSERT INTO cursors (id, stream_id, position, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(stream_id) DO UPDATE SET
            position = excluded.position,
            updated_at = excluded.updated_at
        `).run(`${streamId}_cursor`, streamId, position, now);
        return await adapter.cursors.getByStream(streamId);
      },

      update: async (id: string, data: any): Promise<any> => {
        const now = new Date().toISOString();
        this.db!.prepare(`
          UPDATE cursors
          SET position = COALESCE(?, position),
              updated_at = COALESCE(?, updated_at)
          WHERE id = ?
        `).run(data.position, now, id);
        return await adapter.cursors.getById(id);
      },

      getAll: async (filter?: any): Promise<any[]> => {
        let query = 'SELECT * FROM cursors';
        const params: any[] = [];

        if (filter?.stream_type) {
          query += ' WHERE stream_id LIKE ?';
          params.push(`${filter.stream_type}_%`);
        }

        query += ' ORDER BY updated_at DESC';

        const rows = this.db!.prepare(query).all(...params) as any[];
        return rows;
      }
    };

    // Lock Operations implementation
    this.locks = {
      version: '1.0.0',

      acquire: async (input: any): Promise<any> => {
        const id = `lock_${Math.random().toString(36).substring(2, 10)}`;
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + input.timeout_ms).toISOString();

        // Check for existing active locks
        const existing = this.db!.prepare(`
          SELECT * FROM locks
          WHERE file = ? AND released_at IS NULL AND expires_at > datetime('now')
        `).get(input.file) as any;

        if (existing) {
          return {
            conflict: true,
            existing_lock: existing
          };
        }

        this.db!.prepare(`
          INSERT INTO locks (id, file, reserved_by, reserved_at, purpose, timeout_ms, checksum, expires_at, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, input.file, input.specialist_id, now, input.purpose || 'edit', input.timeout_ms, input.checksum, expiresAt, JSON.stringify(input.metadata || {}));

        const lock = await adapter.locks.getById(id);
        return {
          conflict: false,
          lock: {
            ...lock,
            status: 'active',
            expires_at: expiresAt,
            normalized_path: input.file
          }
        };
      },

      release: async (id: string): Promise<boolean> => {
        const result = this.db!.prepare(`
          UPDATE locks
          SET released_at = datetime('now'),
              status = 'released'
          WHERE id = ?
        `).run(id);
        return result.changes > 0;
      },

      getById: async (id: string): Promise<any | null> => {
        const row = this.db!.prepare(`
          SELECT * FROM locks WHERE id = ?
        `).get(id) as any;
        return row || null;
      },

      getByFile: async (file: string): Promise<any | null> => {
        const row = this.db!.prepare(`
          SELECT * FROM locks
          WHERE file = ? AND released_at IS NULL AND expires_at > datetime('now')
        `).get(file) as any;
        return row || null;
      },

      getActive: async (): Promise<any[]> => {
        const rows = this.db!.prepare(`
          SELECT * FROM locks
          WHERE released_at IS NULL AND expires_at > datetime('now')
        `).all() as any[];
        return rows.map((row: any) => ({
          ...row,
          status: 'active',
          normalized_path: row.file
        }));
      },

      getAll: async (): Promise<any[]> => {
        const rows = this.db!.prepare(`
          SELECT * FROM locks ORDER BY reserved_at DESC
        `).all() as any[];
        return rows;
      },

      forceRelease: async (id: string): Promise<boolean> => {
        const result = this.db!.prepare(`
          UPDATE locks
          SET released_at = datetime('now'),
              status = 'force_released'
          WHERE id = ?
        `).run(id);
        return result.changes > 0;
      }
    };

    // Event Operations implementation
    this.events = {
      version: '1.0.0',

      append: async (input: AppendEventInput): Promise<Event> => {
        // Generate unique event_id
        const eventId = `evt_${Math.random().toString(36).substring(2, 10)}`;

        // Get next sequence number for this stream
        const lastSeq = this.db!.prepare(`
          SELECT MAX(sequence_number) as last_seq
          FROM events
          WHERE stream_type = ? AND stream_id = ?
        `).get(input.stream_type, input.stream_id) as { last_seq: number | null } | undefined;

        const sequenceNumber = (lastSeq?.last_seq || 0) + 1;

        const now = new Date().toISOString();

        // Try to use existing mailbox with stream_id first, otherwise create prefixed one
        let mailboxId = input.stream_id;
        const existingMailbox = this.db!.prepare(`
          SELECT id FROM mailboxes WHERE id = ?
        `).get(input.stream_id);
        
        if (!existingMailbox) {
          // Create prefixed mailbox if original doesn't exist
          mailboxId = `mbx_${input.stream_type}_${input.stream_id}`;
          this.db!.prepare(`
            INSERT OR IGNORE INTO mailboxes (id, created_at, updated_at)
            VALUES (?, ?, ?)
          `).run(mailboxId, now, now);
        }

        // Insert event into database
        this.db!.prepare(`
          INSERT INTO events (
            id, mailbox_id, type, stream_type, stream_id, sequence_number,
            data, occurred_at, causation_id, correlation_id, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          eventId,
          mailboxId,
          input.event_type,
          input.stream_type,
          input.stream_id,
          sequenceNumber,
          JSON.stringify(input.data),
          input.occurred_at || now,
          input.causation_id,
          input.correlation_id,
          JSON.stringify(input.metadata || {})
        );

        return {
          sequence_number: sequenceNumber,
          event_id: eventId,
          event_type: input.event_type,
          stream_type: input.stream_type,
          stream_id: input.stream_id,
          data: input.data,
          causation_id: input.causation_id,
          correlation_id: input.correlation_id,
          metadata: input.metadata,
          occurred_at: input.occurred_at || now,
          recorded_at: now,
          schema_version: input.schema_version || 1
        };
      },

      queryByStream: async (streamType: string, streamId: string, afterSequence?: number): Promise<Event[]> => {
        const query = `
          SELECT * FROM events
          WHERE stream_type = ? AND stream_id = ?
          ${afterSequence ? 'AND sequence_number > ?' : ''}
          ORDER BY sequence_number ASC
        `;

        const params: any[] = [streamType, streamId];
        if (afterSequence !== undefined) params.push(afterSequence);

        const rows = this.db!.prepare(query).all(...params) as any[];

        return rows.map(row => ({
          sequence_number: row.sequence_number,
          event_id: row.id,
          event_type: row.type,
          stream_type: row.stream_type,
          stream_id: row.stream_id,
          data: JSON.parse(row.data),
          causation_id: row.causation_id,
          correlation_id: row.correlation_id,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
          occurred_at: row.occurred_at,
          recorded_at: row.occurred_at,
          schema_version: 1
        }));
      },

      queryByType: async (eventType: string): Promise<Event[]> => {
        const rows = this.db!.prepare(`
          SELECT * FROM events WHERE type = ? ORDER BY occurred_at ASC
        `).all(eventType) as any[];

        return rows.map(row => ({
          sequence_number: row.sequence_number,
          event_id: row.id,
          event_type: row.type,
          stream_type: row.stream_type,
          stream_id: row.stream_id,
          data: JSON.parse(row.data),
          causation_id: row.causation_id,
          correlation_id: row.correlation_id,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
          occurred_at: row.occurred_at,
          recorded_at: row.occurred_at,
          schema_version: 1
        }));
      },

      getEvents: async (filter: EventFilter): Promise<Event[]> => {
        let query = 'SELECT * FROM events WHERE 1=1';
        const params: any[] = [];

        if (filter.event_type) {
          if (Array.isArray(filter.event_type)) {
            query += ` AND type IN (${filter.event_type.map(() => '?').join(',')})`;
            params.push(...filter.event_type);
          } else {
            query += ' AND type = ?';
            params.push(filter.event_type);
          }
        }

        if (filter.stream_type) {
          if (Array.isArray(filter.stream_type)) {
            query += ` AND stream_type IN (${filter.stream_type.map(() => '?').join(',')})`;
            params.push(...filter.stream_type);
          } else {
            query += ' AND stream_type = ?';
            params.push(filter.stream_type);
          }
        }

        if (filter.stream_id) {
          query += ' AND stream_id = ?';
          params.push(filter.stream_id);
        }

        if (filter.after_sequence !== undefined) {
          query += ' AND sequence_number > ?';
          params.push(filter.after_sequence);
        }

        query += ' ORDER BY occurred_at ASC';

        const rows = this.db!.prepare(query).all(...params) as any[];

        return rows.map(row => ({
          sequence_number: row.sequence_number,
          event_id: row.id,
          event_type: row.type,
          stream_type: row.stream_type,
          stream_id: row.stream_id,
          data: JSON.parse(row.data),
          causation_id: row.causation_id,
          correlation_id: row.correlation_id,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
          occurred_at: row.occurred_at,
          recorded_at: row.occurred_at,
          schema_version: 1
        }));
      },

      getLatestByStream: async (streamType: string, streamId: string): Promise<any | null> => {
        const row = this.db!.prepare(`
          SELECT * FROM events
          WHERE stream_type = ? AND stream_id = ?
          ORDER BY sequence_number DESC
          LIMIT 1
        `).get(streamType, streamId) as any;
        return row ? {
          sequence_number: row.sequence_number,
          event_id: row.id,
          event_type: row.type,
          stream_type: row.stream_type,
          stream_id: row.stream_id,
          data: JSON.parse(row.data),
          causation_id: row.causation_id,
          correlation_id: row.correlation_id,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
          occurred_at: row.occurred_at,
          recorded_at: row.occurred_at,
          schema_version: 1
        } : null;
      }
    };

    // Placeholder for other operations (will be implemented in future tasks)
    this.missions = {} as MissionOps;
    this.sorties = {} as SortieOps;
    this.checkpoints = {} as CheckpointOps;
    this.specialists = {} as SpecialistOps;
    this.messages = {} as MessageOps;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
        console.log(`SQLite database closed: ${this.dbPath}`);
      }
    } catch (error) {
      console.error('Error closing database:', error);
      throw error;
    }
  }

  /**
   * Check if database is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.db) {
        return false;
      }

      // Execute simple query to check connection
      this.db.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<DatabaseStats> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Count events
    const eventCount = this.db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
    
    // Count missions (from mission_stats view or table - will be implemented later)
    const missionCount = 0; // TODO: Implement when mission table exists
    const activeMissionCount = 0; // TODO: Implement
    
    // Count active locks
    const activeLockCount = this.db.prepare(
      "SELECT COUNT(*) as count FROM locks WHERE released_at IS NULL AND expires_at > datetime('now')"
    ).get() as { count: number };
    
    // Count checkpoints (will be implemented later)
    const checkpointCount = 0; // TODO: Implement
    
    // Get database file size
    let dbSize = 0;
    let walSize = 0;
    
    if (this.dbPath !== ':memory:' && fs.existsSync(this.dbPath)) {
      dbSize = fs.statSync(this.dbPath).size;
      
      const walPath = `${this.dbPath}-wal`;
      if (fs.existsSync(walPath)) {
        walSize = fs.statSync(walPath).size;
      }
    }

    return {
      total_events: eventCount.count,
      total_missions: missionCount,
      active_missions: activeMissionCount,
      active_locks: activeLockCount.count,
      total_checkpoints: checkpointCount,
      database_size_bytes: dbSize,
      wal_size_bytes: walSize
    };
  }

  /**
   * Run database maintenance (VACUUM, etc.)
   */
  async maintenance(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Run VACUUM to compact database
      this.db.exec('VACUUM');
      console.log('Database maintenance completed');
    } catch (error) {
      console.error('Error running database maintenance:', error);
      throw error;
    }
  }

  /**
   * Begin database transaction
   */
  async beginTransaction(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.exec('BEGIN TRANSACTION');
    } catch (error) {
      console.error('Error beginning transaction:', error);
      throw error;
    }
  }

  /**
   * Commit database transaction
   */
  async commitTransaction(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.exec('COMMIT');
    } catch (error) {
      console.error('Error committing transaction:', error);
      throw error;
    }
  }

  /**
   * Rollback database transaction
   */
  async rollbackTransaction(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.exec('ROLLBACK');
    } catch (error) {
      console.error('Error rolling back transaction:', error);
      throw error;
    }
  }

  /**
   * Get the underlying database instance (for advanced usage)
   */
  getDatabase(): Database | null {
    return this.db;
  }
}

/**
 * Factory function to create a SQLite adapter
 * @param dbPath - Path to database file (or ':memory:' for in-memory)
 * @returns Initialized SQLite adapter
 */
export async function createSQLiteAdapter(dbPath: string = ':memory:'): Promise<SQLiteAdapter> {
  const adapter = new SQLiteAdapter(dbPath);
  await adapter.initialize();
  return adapter;
}

/**
 * Factory function to create an in-memory SQLite adapter (for testing)
 * @returns Initialized in-memory SQLite adapter
 */
export async function createInMemoryAdapter(): Promise<SQLiteAdapter> {
  return createSQLiteAdapter(':memory:');
}
