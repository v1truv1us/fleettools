

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
} from './types.js';

export class SQLiteAdapter implements DatabaseAdapter {
  version = '1.0.0' as const;

  private db: Database | null = null;
  private dbPath: string;
  private schemaPath: string;

  public missions: MissionOps = {} as MissionOps;
  public sorties: SortieOps = {} as SortieOps;
  public locks: LockOps = {} as LockOps;
  public events: EventOps = {} as EventOps;
  public checkpoints: CheckpointOps = {} as CheckpointOps;
  public specialists: SpecialistOps = {} as SpecialistOps;
  public messages: MessageOps = {} as MessageOps;
  public cursors: CursorOps = {} as CursorOps;

  constructor(dbPath: string = ':memory:', schemaPath?: string) {
    this.dbPath = dbPath;

    if (schemaPath) {
      this.schemaPath = schemaPath;
      return;
    }

    this.schemaPath = this.resolveSchemaPath();
  }

  private resolveSchemaPath(): string {
    const possiblePaths: string[] = [];

    try {
      const __filename = new URL('', import.meta.url).pathname;
      const __dirname = path.dirname(__filename);
      possiblePaths.push(path.join(__dirname, 'schema.sql'));
    } catch {
    }

    possiblePaths.push(path.join(process.cwd(), 'squawk', 'src', 'db', 'schema.sql'));

    const projectRoot = process.cwd();
    const modulePaths = [
      path.join(projectRoot, 'src', 'db', 'schema.sql'),
      path.join(projectRoot, 'db', 'schema.sql'),
      path.join(projectRoot, 'lib', 'db', 'schema.sql'),
    ];
    possiblePaths.push(...modulePaths);

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
    }

    for (const candidatePath of possiblePaths) {
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    }

    return possiblePaths[0] || path.join(process.cwd(), 'squawk', 'src', 'db', 'schema.sql');
  }

  async initialize(): Promise<void> {
    try {
      this.db = new Database(this.dbPath);

      if (this.dbPath !== ':memory:') {
        this.db!.exec('PRAGMA journal_mode = WAL');
      }

      this.db!.exec('PRAGMA foreign_keys = ON');

      if (fs.existsSync(this.schemaPath)) {
        const schema = fs.readFileSync(this.schemaPath, 'utf-8');
        this.db!.exec(schema);
      } else {
        throw new Error(`Schema file not found: ${this.schemaPath}`);
      }

      this.initializeOperations();

      console.log(`SQLite database initialized: ${this.dbPath}`);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private initializeOperations(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // TypeScript workaround for property access
    const adapter = this as any;

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

    this.locks = {
      version: '1.0.0',

      acquire: async (input: any): Promise<any> => {
        const id = `lock_${Math.random().toString(36).substring(2, 10)}`;
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + input.timeout_ms).toISOString();

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
      },

      releaseExpired: async (): Promise<number> => {
        const result = this.db!.prepare(`
          UPDATE locks
          SET released_at = datetime('now'),
              status = 'expired'
          WHERE released_at IS NULL 
            AND timeout_ms IS NOT NULL
            AND expires_at IS NOT NULL
            AND expires_at < datetime('now')
        `).run();
        return result.changes;
      }
    };

    this.events = {
      version: '1.0.0',

      append: async (input: AppendEventInput): Promise<Event> => {
        const eventId = `evt_${Math.random().toString(36).substring(2, 10)}`;

        const lastSeq = this.db!.prepare(`
          SELECT MAX(sequence_number) as last_seq
          FROM events
          WHERE stream_type = ? AND stream_id = ?
        `).get(input.stream_type, input.stream_id) as { last_seq: number | null } | undefined;

        const sequenceNumber = (lastSeq?.last_seq || 0) + 1;

        const now = new Date().toISOString();

        let mailboxId = input.stream_id;
        const existingMailbox = this.db!.prepare(`
          SELECT id FROM mailboxes WHERE id = ?
        `).get(input.stream_id);
        
        if (!existingMailbox) {
          mailboxId = `mbx_${input.stream_type}_${input.stream_id}`;
          this.db!.prepare(`
            INSERT OR IGNORE INTO mailboxes (id, created_at, updated_at)
            VALUES (?, ?, ?)
          `).run(mailboxId, now, now);
        }

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

    this.missions = {} as MissionOps;
    this.sorties = {} as SortieOps;
    this.checkpoints = {} as CheckpointOps;
    this.specialists = {} as SpecialistOps;
    this.messages = {} as MessageOps;
  }

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

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.db) {
        return false;
      }

      this.db.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  async getStats(): Promise<DatabaseStats> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const eventCount = this.db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
    
    const missionCount = 0; // TODO: Implement when mission table exists
    const activeMissionCount = 0; // TODO: Implement
    
    const activeLockCount = this.db.prepare(
      "SELECT COUNT(*) as count FROM locks WHERE released_at IS NULL AND expires_at > datetime('now')"
    ).get() as { count: number };
    
    const checkpointCount = 0; // TODO: Implement
    
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

  async maintenance(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.exec('VACUUM');
      console.log('Database maintenance completed');
    } catch (error) {
      console.error('Error running database maintenance:', error);
      throw error;
    }
  }

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

  getDatabase(): Database | null {
    return this.db;
  }
}

export async function createSQLiteAdapter(dbPath: string = ':memory:'): Promise<SQLiteAdapter> {
  const adapter = new SQLiteAdapter(dbPath);
  await adapter.initialize();
  return adapter;
}

export async function createInMemoryAdapter(): Promise<SQLiteAdapter> {
  return createSQLiteAdapter(':memory:');
}
