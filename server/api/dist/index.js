// @bun
// ../../squawk/src/db/index.ts
import path2 from "path";
import fs2 from "fs";

// ../../squawk/src/db/sqlite.js
import Database from "bun:sqlite";
import fs from "fs";
import path from "path";

class SQLiteAdapter {
  version = "1.0.0";
  db = null;
  dbPath;
  schemaPath;
  missions = {};
  sorties = {};
  locks = {};
  events = {};
  checkpoints = {};
  specialists = {};
  messages = {};
  cursors = {};
  constructor(dbPath = ":memory:", schemaPath) {
    this.dbPath = dbPath;
    if (schemaPath) {
      this.schemaPath = schemaPath;
      return;
    }
    this.schemaPath = this.resolveSchemaPath();
  }
  resolveSchemaPath() {
    const possiblePaths = [];
    try {
      const __filename2 = new URL("", import.meta.url).pathname;
      const __dirname2 = path.dirname(__filename2);
      possiblePaths.push(path.join(__dirname2, "schema.sql"));
    } catch {}
    possiblePaths.push(path.join(process.cwd(), "squawk", "src", "db", "schema.sql"));
    const projectRoot = process.cwd();
    const modulePaths = [
      path.join(projectRoot, "src", "db", "schema.sql"),
      path.join(projectRoot, "db", "schema.sql"),
      path.join(projectRoot, "lib", "db", "schema.sql")
    ];
    possiblePaths.push(...modulePaths);
    try {
      const stack = new Error().stack;
      if (stack) {
        const match = stack.match(/at.*\((.*):.*\)/);
        if (match && match[1]) {
          const callerDir = path.dirname(match[1]);
          possiblePaths.push(path.join(callerDir, "schema.sql"));
          possiblePaths.push(path.join(callerDir, "..", "src", "db", "schema.sql"));
        }
      }
    } catch {}
    for (const candidatePath of possiblePaths) {
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    }
    return possiblePaths[0] || path.join(process.cwd(), "squawk", "src", "db", "schema.sql");
  }
  async initialize() {
    try {
      this.db = new Database(this.dbPath);
      if (this.dbPath !== ":memory:") {
        this.db.exec("PRAGMA journal_mode = WAL");
      }
      this.db.exec("PRAGMA foreign_keys = ON");
      if (fs.existsSync(this.schemaPath)) {
        const schema = fs.readFileSync(this.schemaPath, "utf-8");
        this.db.exec(schema);
      } else {
        throw new Error(`Schema file not found: ${this.schemaPath}`);
      }
      this.initializeOperations();
      console.log(`SQLite database initialized: ${this.dbPath}`);
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }
  initializeOperations() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    const adapter = this;
    adapter.mailboxes = {
      version: "1.0.0",
      create: async (input) => {
        const now = new Date().toISOString();
        const createdAt = input.created_at || now;
        const updatedAt = input.updated_at || now;
        this.db.prepare(`
          INSERT INTO mailboxes (id, created_at, updated_at)
          VALUES (?, ?, ?)
        `).run(input.id, createdAt, updatedAt);
        return { id: input.id, created_at: createdAt, updated_at: updatedAt };
      },
      getById: async (id) => {
        const row = this.db.prepare(`
          SELECT * FROM mailboxes WHERE id = ?
        `).get(id);
        return row || null;
      },
      getAll: async () => {
        const rows = this.db.prepare(`
          SELECT * FROM mailboxes ORDER BY created_at DESC
        `).all();
        return rows;
      },
      update: async (id, data) => {
        const now = new Date().toISOString();
        const result = this.db.prepare(`
          UPDATE mailboxes
          SET updated_at = COALESCE(?, updated_at)
          WHERE id = ?
        `).run(now, id);
        if (result.changes === 0)
          return null;
        return await this.mailboxes.getById(id);
      },
      delete: async (id) => {
        const result = this.db.prepare(`
          DELETE FROM mailboxes WHERE id = ?
        `).run(id);
        return result.changes > 0;
      }
    };
    this.cursors = {
      version: "1.0.0",
      create: async (input) => {
        const now = new Date().toISOString();
        this.db.prepare(`
          INSERT INTO cursors (id, stream_id, position, consumer_id, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(input.id, input.stream_id, input.position, input.consumer_id, now);
        return { id: input.id, stream_id: input.stream_id, position: input.position, consumer_id: input.consumer_id, updated_at: now };
      },
      getById: async (id) => {
        const row = this.db.prepare(`
          SELECT * FROM cursors WHERE id = ?
        `).get(id);
        return row || null;
      },
      getByStream: async (streamId) => {
        const row = this.db.prepare(`
          SELECT * FROM cursors WHERE stream_id = ?
        `).get(streamId);
        return row || null;
      },
      advance: async (streamId, position) => {
        const now = new Date().toISOString();
        this.db.prepare(`
          INSERT INTO cursors (id, stream_id, position, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(stream_id) DO UPDATE SET
            position = excluded.position,
            updated_at = excluded.updated_at
        `).run(`${streamId}_cursor`, streamId, position, now);
        return await adapter.cursors.getByStream(streamId);
      },
      update: async (id, data) => {
        const now = new Date().toISOString();
        this.db.prepare(`
          UPDATE cursors
          SET position = COALESCE(?, position),
              updated_at = COALESCE(?, updated_at)
          WHERE id = ?
        `).run(data.position, now, id);
        return await adapter.cursors.getById(id);
      },
      getAll: async (filter) => {
        let query = "SELECT * FROM cursors";
        const params = [];
        if (filter?.stream_type) {
          query += " WHERE stream_id LIKE ?";
          params.push(`${filter.stream_type}_%`);
        }
        query += " ORDER BY updated_at DESC";
        const rows = this.db.prepare(query).all(...params);
        return rows;
      }
    };
    this.locks = {
      version: "1.0.0",
      acquire: async (input) => {
        const id = `lock_${Math.random().toString(36).substring(2, 10)}`;
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + input.timeout_ms).toISOString();
        const existing = this.db.prepare(`
          SELECT * FROM locks
          WHERE file = ? AND released_at IS NULL AND expires_at > datetime('now')
        `).get(input.file);
        if (existing) {
          return {
            conflict: true,
            existing_lock: existing
          };
        }
        this.db.prepare(`
          INSERT INTO locks (id, file, reserved_by, reserved_at, purpose, timeout_ms, checksum, expires_at, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, input.file, input.specialist_id, now, input.purpose || "edit", input.timeout_ms, input.checksum, expiresAt, JSON.stringify(input.metadata || {}));
        const lock = await adapter.locks.getById(id);
        return {
          conflict: false,
          lock: {
            ...lock,
            status: "active",
            expires_at: expiresAt,
            normalized_path: input.file
          }
        };
      },
      release: async (id) => {
        const result = this.db.prepare(`
          UPDATE locks
          SET released_at = datetime('now'),
              status = 'released'
          WHERE id = ?
        `).run(id);
        return result.changes > 0;
      },
      getById: async (id) => {
        const row = this.db.prepare(`
          SELECT * FROM locks WHERE id = ?
        `).get(id);
        return row || null;
      },
      getByFile: async (file) => {
        const row = this.db.prepare(`
          SELECT * FROM locks
          WHERE file = ? AND released_at IS NULL AND expires_at > datetime('now')
        `).get(file);
        return row || null;
      },
      getActive: async () => {
        const rows = this.db.prepare(`
          SELECT * FROM locks
          WHERE released_at IS NULL AND expires_at > datetime('now')
        `).all();
        return rows.map((row) => ({
          ...row,
          status: "active",
          normalized_path: row.file
        }));
      },
      getAll: async () => {
        const rows = this.db.prepare(`
          SELECT * FROM locks ORDER BY reserved_at DESC
        `).all();
        return rows;
      },
      forceRelease: async (id) => {
        const result = this.db.prepare(`
          UPDATE locks
          SET released_at = datetime('now'),
              status = 'force_released'
          WHERE id = ?
        `).run(id);
        return result.changes > 0;
      },
      getExpired: async () => {
        const now = new Date().toISOString();
        const rows = this.db.prepare(`
          SELECT * FROM locks
          WHERE released_at IS NULL 
            AND timeout_ms IS NOT NULL
            AND expires_at IS NOT NULL
            AND expires_at < datetime('now')
        `).all();
        return rows;
      },
      releaseExpired: async () => {
        const result = this.db.prepare(`
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
      version: "1.0.0",
      append: async (input) => {
        const eventId = `evt_${Math.random().toString(36).substring(2, 10)}`;
        const lastSeq = this.db.prepare(`
          SELECT MAX(sequence_number) as last_seq
          FROM events
          WHERE stream_type = ? AND stream_id = ?
        `).get(input.stream_type, input.stream_id);
        const sequenceNumber = (lastSeq?.last_seq || 0) + 1;
        const now = new Date().toISOString();
        let mailboxId = input.stream_id;
        const existingMailbox = this.db.prepare(`
          SELECT id FROM mailboxes WHERE id = ?
        `).get(input.stream_id);
        if (!existingMailbox) {
          mailboxId = `mbx_${input.stream_type}_${input.stream_id}`;
          this.db.prepare(`
            INSERT OR IGNORE INTO mailboxes (id, created_at, updated_at)
            VALUES (?, ?, ?)
          `).run(mailboxId, now, now);
        }
        this.db.prepare(`
          INSERT INTO events (
            id, mailbox_id, type, stream_type, stream_id, sequence_number,
            data, occurred_at, causation_id, correlation_id, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(eventId, mailboxId, input.event_type, input.stream_type, input.stream_id, sequenceNumber, JSON.stringify(input.data), input.occurred_at || now, input.causation_id || null, input.correlation_id || null, JSON.stringify(input.metadata || {}));
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
      queryByStream: async (streamType, streamId, afterSequence) => {
        const query = `
          SELECT * FROM events
          WHERE stream_type = ? AND stream_id = ?
          ${afterSequence ? "AND sequence_number > ?" : ""}
          ORDER BY sequence_number ASC
        `;
        const params = [streamType, streamId];
        if (afterSequence !== undefined)
          params.push(afterSequence);
        const rows = this.db.prepare(query).all(...params);
        return rows.map((row) => ({
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
      queryByType: async (eventType) => {
        const rows = this.db.prepare(`
          SELECT * FROM events WHERE type = ? ORDER BY occurred_at ASC
        `).all(eventType);
        return rows.map((row) => ({
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
      getEvents: async (filter) => {
        let query = "SELECT * FROM events WHERE 1=1";
        const params = [];
        if (filter.event_type) {
          if (Array.isArray(filter.event_type)) {
            query += ` AND type IN (${filter.event_type.map(() => "?").join(",")})`;
            params.push(...filter.event_type);
          } else {
            query += " AND type = ?";
            params.push(filter.event_type);
          }
        }
        if (filter.stream_type) {
          if (Array.isArray(filter.stream_type)) {
            query += ` AND stream_type IN (${filter.stream_type.map(() => "?").join(",")})`;
            params.push(...filter.stream_type);
          } else {
            query += " AND stream_type = ?";
            params.push(filter.stream_type);
          }
        }
        if (filter.stream_id) {
          query += " AND stream_id = ?";
          params.push(filter.stream_id);
        }
        if (filter.after_sequence !== undefined) {
          query += " AND sequence_number > ?";
          params.push(filter.after_sequence);
        }
        query += " ORDER BY occurred_at ASC";
        const rows = this.db.prepare(query).all(...params);
        return rows.map((row) => ({
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
      getLatestByStream: async (streamType, streamId) => {
        const row = this.db.prepare(`
          SELECT * FROM events
          WHERE stream_type = ? AND stream_id = ?
          ORDER BY sequence_number DESC
          LIMIT 1
        `).get(streamType, streamId);
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
    this.missions = {};
    this.sorties = {};
    this.checkpoints = {};
    this.specialists = {};
    this.messages = {};
    adapter.checkpoints = {
      version: "1.0.0",
      create: async (input) => {
        const id = input.id || `chk_${Math.random().toString(36).substring(2, 10)}`;
        const now = new Date().toISOString();
        this.db.prepare(`
          INSERT INTO checkpoints (
            id, mission_id, mission_title, timestamp, trigger, trigger_details,
            progress_percent, sorties, active_locks, pending_messages,
            recovery_context, created_by, expires_at, version, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, input.mission_id, input.mission_title || null, input.timestamp || now, input.trigger, input.trigger_details || null, input.progress_percent || 0, JSON.stringify(input.sorties || []), JSON.stringify(input.active_locks || []), JSON.stringify(input.pending_messages || []), JSON.stringify(input.recovery_context || {}), input.created_by, input.expires_at || null, input.version || "1.0.0", JSON.stringify(input.metadata || {}));
        const checkpoint = await adapter.checkpoints.getById(id);
        return checkpoint;
      },
      getById: async (id) => {
        const row = this.db.prepare(`
          SELECT * FROM checkpoints WHERE id = ?
        `).get(id);
        if (!row)
          return null;
        return {
          id: row.id,
          mission_id: row.mission_id,
          mission_title: row.mission_title,
          timestamp: row.timestamp,
          trigger: row.trigger,
          trigger_details: row.trigger_details,
          progress_percent: row.progress_percent,
          sorties: row.sorties ? JSON.parse(row.sorties) : [],
          active_locks: row.active_locks ? JSON.parse(row.active_locks) : [],
          pending_messages: row.pending_messages ? JSON.parse(row.pending_messages) : [],
          recovery_context: row.recovery_context ? JSON.parse(row.recovery_context) : {},
          created_by: row.created_by,
          expires_at: row.expires_at,
          consumed_at: row.consumed_at,
          version: row.version,
          metadata: row.metadata ? JSON.parse(row.metadata) : {}
        };
      },
      getLatest: async (missionId) => {
        const row = this.db.prepare(`
          SELECT * FROM checkpoints
          WHERE mission_id = ? AND consumed_at IS NULL
          ORDER BY timestamp DESC
          LIMIT 1
        `).get(missionId);
        if (!row)
          return null;
        return await adapter.checkpoints.getById(row.id);
      },
      list: async (missionId) => {
        let query = "SELECT * FROM checkpoints";
        const params = [];
        if (missionId) {
          query += " WHERE mission_id = ?";
          params.push(missionId);
        }
        query += " ORDER BY timestamp DESC";
        const rows = this.db.prepare(query).all(...params);
        return rows.map((row) => ({
          id: row.id,
          mission_id: row.mission_id,
          mission_title: row.mission_title,
          timestamp: row.timestamp,
          trigger: row.trigger,
          trigger_details: row.trigger_details,
          progress_percent: row.progress_percent,
          sorties: row.sorties ? JSON.parse(row.sorties) : [],
          active_locks: row.active_locks ? JSON.parse(row.active_locks) : [],
          pending_messages: row.pending_messages ? JSON.parse(row.pending_messages) : [],
          recovery_context: row.recovery_context ? JSON.parse(row.recovery_context) : {},
          created_by: row.created_by,
          expires_at: row.expires_at,
          consumed_at: row.consumed_at,
          version: row.version,
          metadata: row.metadata ? JSON.parse(row.metadata) : {}
        }));
      },
      delete: async (id) => {
        const result = this.db.prepare(`
          DELETE FROM checkpoints WHERE id = ?
        `).run(id);
        return result.changes > 0;
      },
      markConsumed: async (id) => {
        const now = new Date().toISOString();
        const result = this.db.prepare(`
          UPDATE checkpoints
          SET consumed_at = ?
          WHERE id = ?
        `).run(now, id);
        if (result.changes > 0) {
          return await adapter.checkpoints.getById(id);
        }
        return null;
      }
    };
  }
  async close() {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
        console.log(`SQLite database closed: ${this.dbPath}`);
      }
    } catch (error) {
      console.error("Error closing database:", error);
      throw error;
    }
  }
  async isHealthy() {
    try {
      if (!this.db) {
        return false;
      }
      this.db.prepare("SELECT 1").get();
      return true;
    } catch {
      return false;
    }
  }
  async getStats() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    const eventCount = this.db.prepare("SELECT COUNT(*) as count FROM events").get();
    const missionCount = 0;
    const activeMissionCount = 0;
    const activeLockCount = this.db.prepare("SELECT COUNT(*) as count FROM locks WHERE released_at IS NULL AND expires_at > datetime('now')").get();
    const checkpointCount = 0;
    let dbSize = 0;
    let walSize = 0;
    if (this.dbPath !== ":memory:" && fs.existsSync(this.dbPath)) {
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
  async maintenance() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    try {
      this.db.exec("VACUUM");
      console.log("Database maintenance completed");
    } catch (error) {
      console.error("Error running database maintenance:", error);
      throw error;
    }
  }
  async beginTransaction() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    try {
      this.db.exec("BEGIN TRANSACTION");
    } catch (error) {
      console.error("Error beginning transaction:", error);
      throw error;
    }
  }
  async commitTransaction() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    try {
      this.db.exec("COMMIT");
    } catch (error) {
      console.error("Error committing transaction:", error);
      throw error;
    }
  }
  async rollbackTransaction() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    try {
      this.db.exec("ROLLBACK");
    } catch (error) {
      console.error("Error rolling back transaction:", error);
      throw error;
    }
  }
  getDatabase() {
    return this.db;
  }
}

// ../../squawk/src/db/index.ts
var __dirname = "/home/vitruvius/git/fleettools/squawk/src/db";
function getLegacyDbPath() {
  return path2.join(process.env.HOME || "", ".local", "share", "fleet", "squawk.json");
}
function getSqliteDbPath() {
  const isApi = process.env.PORT || process.env.API_SERVER;
  if (isApi) {
    return path2.join(process.env.HOME || "", ".local", "share", "fleet", "squawk.db");
  }
  return path2.join(process.env.HOME || "", ".local", "share", "fleet", "squawk.db");
}
var adapter = null;
async function initializeDatabase(dbPath) {
  const targetPath = dbPath || getSqliteDbPath();
  const dbDir = path2.dirname(targetPath);
  if (!fs2.existsSync(dbDir)) {
    fs2.mkdirSync(dbDir, { recursive: true });
  }
  const schemaPath = path2.join(__dirname, "schema.sql");
  adapter = new SQLiteAdapter(targetPath, schemaPath);
  await adapter.initialize();
  const legacyDbPath = getLegacyDbPath();
  if (fs2.existsSync(legacyDbPath)) {
    await migrateFromJson(legacyDbPath);
    const backupPath = legacyDbPath + ".backup";
    fs2.renameSync(legacyDbPath, backupPath);
    console.log(`[Migration] Legacy data migrated to SQLite`);
    console.log(`[Migration] Backup saved to: ${backupPath}`);
  }
}
function getAdapter() {
  if (!adapter) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return adapter;
}
async function closeDatabase() {
  if (adapter) {
    await adapter.close();
    adapter = null;
  }
}
async function migrateFromJson(jsonPath) {
  console.log(`[Migration] Starting migration from: ${jsonPath}`);
  try {
    const content = fs2.readFileSync(jsonPath, "utf-8");
    const legacyData = JSON.parse(content);
    const stats = {
      mailboxes: 0,
      events: 0,
      cursors: 0,
      locks: 0
    };
    for (const [id, mailbox] of Object.entries(legacyData.mailboxes || {})) {
      try {
        if (!mailbox.created_at || !mailbox.updated_at) {
          console.warn(`[Migration] Skipping mailbox ${id} due to missing required fields`);
          continue;
        }
        await adapter.mailboxes.create({
          id,
          created_at: mailbox.created_at,
          updated_at: mailbox.updated_at
        });
        stats.mailboxes++;
      } catch (error) {
        console.warn(`[Migration] Failed to migrate mailbox ${id}:`, error);
      }
    }
    for (const [mailboxId, events] of Object.entries(legacyData.events || {})) {
      if (!await adapter.mailboxes.getById(mailboxId)) {
        await adapter.mailboxes.create({
          id: mailboxId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        stats.mailboxes++;
      }
      for (const event of events) {
        try {
          if (!event.type) {
            console.warn(`[Migration] Skipping event without type field in mailbox ${mailboxId}`);
            continue;
          }
          await adapter.events.append({
            event_type: event.type,
            stream_type: "squawk",
            stream_id: mailboxId,
            data: typeof event.data === "string" ? JSON.parse(event.data) : event.data,
            occurred_at: event.occurred_at,
            causation_id: event.causation_id,
            correlation_id: event.correlation_id,
            metadata: event.metadata ? typeof event.metadata === "string" ? JSON.parse(event.metadata) : event.metadata : undefined
          });
          stats.events++;
        } catch (error) {
          console.warn(`[Migration] Failed to migrate event:`, error);
        }
      }
    }
    for (const [id, cursor] of Object.entries(legacyData.cursors || {})) {
      try {
        await adapter.cursors.create({
          id,
          stream_type: "squawk",
          stream_id: cursor.stream_id,
          position: cursor.position,
          consumer_id: cursor.consumer_id || "migrated"
        });
        stats.cursors++;
      } catch (error) {
        console.warn(`[Migration] Failed to migrate cursor ${id}:`, error);
      }
    }
    for (const [id, lock] of Object.entries(legacyData.locks || {})) {
      const lockData = lock;
      if (!lockData.released_at) {
        try {
          await adapter.locks.acquire({
            file: lockData.file,
            specialist_id: lockData.reserved_by,
            timeout_ms: lockData.timeout_ms || 30000,
            purpose: lockData.purpose === "delete" ? "delete" : lockData.purpose === "read" ? "read" : "edit",
            checksum: lockData.checksum
          });
          stats.locks++;
        } catch (error) {
          console.warn(`[Migration] Failed to migrate lock ${id}:`, error);
        }
      }
    }
    console.log(`[Migration] Complete:`);
    console.log(`  - Mailboxes: ${stats.mailboxes}`);
    console.log(`  - Events: ${stats.events}`);
    console.log(`  - Cursors: ${stats.cursors}`);
    console.log(`  - Locks: ${stats.locks}`);
  } catch (error) {
    console.error("[Migration] Failed:", error);
    throw error;
  }
}
var mailboxOps = {
  getAll: async () => {
    const adapter2 = getAdapter();
    const mailboxes = await adapter2.mailboxes.getAll();
    return mailboxes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  getById: async (id) => {
    const adapter2 = getAdapter();
    return adapter2.mailboxes.getById(id);
  },
  create: async (id) => {
    const adapter2 = getAdapter();
    const now = new Date().toISOString();
    return adapter2.mailboxes.create({
      id,
      created_at: now,
      updated_at: now
    });
  },
  exists: async (id) => {
    const adapter2 = getAdapter();
    const mailbox = await adapter2.mailboxes.getById(id);
    return mailbox !== null;
  }
};
var eventOps = {
  getByMailbox: async (mailboxId) => {
    const adapter2 = getAdapter();
    const events = await adapter2.events.queryByStream("squawk", mailboxId);
    return events.sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  },
  append: async (mailboxId, events) => {
    const adapter2 = getAdapter();
    if (!await adapter2.mailboxes.getById(mailboxId)) {
      await adapter2.mailboxes.create({
        id: mailboxId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    const inserted = [];
    for (const event of events) {
      const appended = await adapter2.events.append({
        event_type: event.type,
        stream_type: "squawk",
        stream_id: mailboxId,
        data: typeof event.data === "string" ? JSON.parse(event.data) : event.data,
        occurred_at: event.occurred_at,
        causation_id: event.causation_id,
        correlation_id: event.correlation_id,
        metadata: event.metadata ? typeof event.metadata === "string" ? JSON.parse(event.metadata) : event.metadata : undefined
      });
      inserted.push(appended);
    }
    return inserted;
  }
};
var cursorOps = {
  getById: async (id) => {
    const adapter2 = getAdapter();
    return adapter2.cursors.getById(id);
  },
  getByStream: async (streamId) => {
    const adapter2 = getAdapter();
    const cursors = await adapter2.cursors.getAll();
    return cursors.find((c) => c.stream_id === streamId) || null;
  },
  upsert: async (cursor) => {
    const adapter2 = getAdapter();
    const id = cursor.id || `${cursor.stream_id}_cursor`;
    const now = new Date().toISOString();
    const existing = await adapter2.cursors.getById(id);
    if (existing) {
      await adapter2.cursors.update(id, {
        position: cursor.position,
        updated_at: now
      });
      return existing;
    } else {
      return adapter2.cursors.create({
        id,
        stream_type: "squawk",
        stream_id: cursor.stream_id,
        position: cursor.position,
        consumer_id: cursor.consumer_id || "default"
      });
    }
  }
};
var lockOps = {
  getAll: async () => {
    const adapter2 = getAdapter();
    const allLocks = await adapter2.locks.getAll();
    const now = new Date().toISOString();
    return allLocks.filter((lock) => {
      if (lock.status === "released")
        return false;
      const expiresAt = lock.expires_at;
      return expiresAt > now;
    });
  },
  getById: async (id) => {
    const adapter2 = getAdapter();
    return adapter2.locks.getById(id);
  },
  acquire: async (lock) => {
    const adapter2 = getAdapter();
    const result = await adapter2.locks.acquire({
      file: lock.file,
      specialist_id: lock.reserved_by || lock.specialist_id,
      timeout_ms: lock.timeout_ms || 30000,
      purpose: lock.purpose === "delete" ? "delete" : lock.purpose === "read" ? "read" : "edit",
      checksum: lock.checksum
    });
    if (result.conflict) {
      return result.existing_lock || {
        id: result.lock?.id || "",
        file: lock.file,
        reserved_by: result.lock?.reserved_by || "",
        reserved_at: result.lock?.reserved_at || "",
        released_at: null,
        purpose: lock.purpose || "edit",
        checksum: lock.checksum,
        timeout_ms: lock.timeout_ms || 30000,
        metadata: lock.metadata
      };
    }
    return result.lock;
  },
  release: async (id) => {
    const adapter2 = getAdapter();
    const lock = await adapter2.locks.getById(id);
    if (lock) {
      await adapter2.locks.release(id);
      return lock;
    }
    return null;
  },
  getExpired: async () => {
    const adapter2 = getAdapter();
    const allLocks = await adapter2.locks.getAll();
    const now = new Date().toISOString();
    return allLocks.filter((lock) => {
      if (lock.status === "released")
        return false;
      const expiresAt = lock.expires_at;
      return expiresAt <= now;
    });
  },
  releaseExpired: async () => {
    const expired = await lockOps.getExpired();
    for (const lock of expired) {
      await lockOps.release(lock.id);
    }
    return expired.length;
  }
};

// ../../squawk/src/recovery/detector.ts
var DEFAULT_ACTIVITY_THRESHOLD_MS = 5 * 60 * 1000;
// src/flightline/work-orders.ts
import path3 from "path";
import fs3 from "fs";
import crypto from "crypto";
var FLIGHTLINE_DIR = path3.join(process.cwd(), ".flightline");
var WORK_ORDERS_DIR = path3.join(FLIGHTLINE_DIR, "work-orders");
function ensureDirectories() {
  if (!fs3.existsSync(FLIGHTLINE_DIR)) {
    fs3.mkdirSync(FLIGHTLINE_DIR, { recursive: true });
  }
  if (!fs3.existsSync(WORK_ORDERS_DIR)) {
    fs3.mkdirSync(WORK_ORDERS_DIR, { recursive: true });
  }
}
function generateId() {
  return "wo_" + crypto.randomUUID();
}
function getWorkOrderPath(orderId) {
  return path3.join(WORK_ORDERS_DIR, orderId, "manifest.json");
}
function registerWorkOrdersRoutes(router, headers) {
  ensureDirectories();
  router.get("/api/v1/work-orders", async (req) => {
    try {
      if (!fs3.existsSync(WORK_ORDERS_DIR)) {
        return new Response(JSON.stringify({ work_orders: [] }), {
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const directories = fs3.readdirSync(WORK_ORDERS_DIR);
      const workOrders = [];
      for (const dirName of directories) {
        const manifestPath = path3.join(WORK_ORDERS_DIR, dirName, "manifest.json");
        if (!fs3.existsSync(manifestPath))
          continue;
        const manifest = JSON.parse(fs3.readFileSync(manifestPath, "utf-8"));
        workOrders.push(manifest);
      }
      return new Response(JSON.stringify({ work_orders: workOrders }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error listing work orders:", error);
      return new Response(JSON.stringify({ error: "Failed to list work orders" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/work-orders", async (req) => {
    try {
      const body = await req.json();
      const { title, description, priority = "medium", assigned_to = [] } = body;
      if (!title) {
        return new Response(JSON.stringify({ error: "title is required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const orderId = generateId();
      const now = new Date().toISOString();
      const manifest = {
        id: orderId,
        title,
        description: description || "",
        status: "pending",
        priority,
        created_at: now,
        updated_at: now,
        assigned_to,
        cells: [],
        tech_orders: []
      };
      const orderDir = path3.join(WORK_ORDERS_DIR, orderId);
      const manifestPath = path3.join(orderDir, "manifest.json");
      fs3.mkdirSync(orderDir, { recursive: true });
      fs3.mkdirSync(path3.join(orderDir, "cells"), { recursive: true });
      fs3.mkdirSync(path3.join(orderDir, "events"), { recursive: true });
      fs3.mkdirSync(path3.join(orderDir, "artifacts"), { recursive: true });
      fs3.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`Created work order: ${orderId} - ${title}`);
      return new Response(JSON.stringify({ work_order: manifest }), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error creating work order:", error);
      return new Response(JSON.stringify({ error: "Failed to create work order" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/work-orders/:id", async (req, params) => {
    try {
      const manifestPath = getWorkOrderPath(params.id);
      if (!fs3.existsSync(manifestPath)) {
        return new Response(JSON.stringify({ error: "Work order not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const manifest = JSON.parse(fs3.readFileSync(manifestPath, "utf-8"));
      return new Response(JSON.stringify({ work_order: manifest }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting work order:", error);
      return new Response(JSON.stringify({ error: "Failed to get work order" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.patch("/api/v1/work-orders/:id", async (req, params) => {
    try {
      const body = await req.json();
      const manifestPath = getWorkOrderPath(params.id);
      if (!fs3.existsSync(manifestPath)) {
        return new Response(JSON.stringify({ error: "Work order not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const manifest = JSON.parse(fs3.readFileSync(manifestPath, "utf-8"));
      if (body.title)
        manifest.title = body.title;
      if (body.description !== undefined)
        manifest.description = body.description;
      if (body.status)
        manifest.status = body.status;
      if (body.priority)
        manifest.priority = body.priority;
      if (body.assigned_to)
        manifest.assigned_to = body.assigned_to;
      manifest.updated_at = new Date().toISOString();
      fs3.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`Updated work order: ${params.id}`);
      return new Response(JSON.stringify({ work_order: manifest }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error updating work order:", error);
      return new Response(JSON.stringify({ error: "Failed to update work order" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.delete("/api/v1/work-orders/:id", async (req, params) => {
    try {
      const orderDir = path3.join(WORK_ORDERS_DIR, params.id);
      if (!fs3.existsSync(orderDir)) {
        return new Response(JSON.stringify({ error: "Work order not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      fs3.rmSync(orderDir, { recursive: true, force: true });
      console.log(`Deleted work order: ${params.id}`);
      return new Response(null, {
        status: 204,
        headers: { ...headers }
      });
    } catch (error) {
      console.error("Error deleting work order:", error);
      return new Response(JSON.stringify({ error: "Failed to delete work order" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/flightline/ctk.ts
import path4 from "path";
import fs4 from "fs";
import crypto2 from "crypto";
var FLIGHTLINE_DIR2 = path4.join(process.cwd(), ".flightline");
var CTK_DIR = path4.join(FLIGHTLINE_DIR2, "ctk");
function ensureDirectory() {
  if (!fs4.existsSync(CTK_DIR)) {
    fs4.mkdirSync(CTK_DIR, { recursive: true });
  }
}
function checksumFile(filePath) {
  try {
    const content = fs4.readFileSync(filePath);
    return crypto2.createHash("sha256").update(content).digest("hex");
  } catch (error) {
    return null;
  }
}
function registerCtkRoutes(router, headers) {
  ensureDirectory();
  router.get("/api/v1/ctk/reservations", async (req) => {
    try {
      const files = fs4.readdirSync(CTK_DIR);
      const reservations = [];
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = fs4.readFileSync(path4.join(CTK_DIR, file), "utf-8");
          const reservation = JSON.parse(content);
          reservations.push(reservation);
        }
      }
      return new Response(JSON.stringify({ reservations }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error listing CTK reservations:", error);
      return new Response(JSON.stringify({ error: "Failed to list reservations" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/ctk/reserve", async (req) => {
    try {
      const body = await req.json();
      const { file, specialist_id, purpose = "edit" } = body;
      if (!file || !specialist_id) {
        return new Response(JSON.stringify({ error: "file and specialist_id are required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const reservation = {
        id: crypto2.randomUUID(),
        file,
        reserved_by: specialist_id,
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose,
        checksum: checksumFile(file)
      };
      const reservationPath = path4.join(CTK_DIR, `${reservation.id}.json`);
      fs4.writeFileSync(reservationPath, JSON.stringify(reservation, null, 2));
      console.log(`Reserved file ${file} for specialist ${specialist_id}`);
      return new Response(JSON.stringify({ reservation }), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error creating reservation:", error);
      return new Response(JSON.stringify({ error: "Failed to create reservation" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/ctk/release", async (req) => {
    try {
      const body = await req.json();
      const { reservation_id } = body;
      if (!reservation_id) {
        return new Response(JSON.stringify({ error: "reservation_id is required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const reservationPath = path4.join(CTK_DIR, `${reservation_id}.json`);
      if (!fs4.existsSync(reservationPath)) {
        return new Response(JSON.stringify({ error: "Reservation not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const reservation = JSON.parse(fs4.readFileSync(reservationPath, "utf-8"));
      reservation.released_at = new Date().toISOString();
      fs4.writeFileSync(reservationPath, JSON.stringify(reservation, null, 2));
      console.log(`Released reservation ${reservation_id}`);
      return new Response(JSON.stringify({ reservation }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error releasing reservation:", error);
      return new Response(JSON.stringify({ error: "Failed to release reservation" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/flightline/tech-orders.ts
import path5 from "path";
import fs5 from "fs";
import crypto3 from "crypto";
var FLIGHTLINE_DIR3 = path5.join(process.cwd(), ".flightline");
var TECH_ORDERS_DIR = path5.join(FLIGHTLINE_DIR3, "tech-orders");
function ensureDirectory2() {
  if (!fs5.existsSync(TECH_ORDERS_DIR)) {
    fs5.mkdirSync(TECH_ORDERS_DIR, { recursive: true });
  }
}
function registerTechOrdersRoutes(router, headers) {
  ensureDirectory2();
  router.get("/api/v1/tech-orders", async (req) => {
    try {
      const files = fs5.readdirSync(TECH_ORDERS_DIR);
      const techOrders = [];
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = fs5.readFileSync(path5.join(TECH_ORDERS_DIR, file), "utf-8");
          const techOrder = JSON.parse(content);
          techOrders.push(techOrder);
        }
      }
      return new Response(JSON.stringify({ tech_orders: techOrders }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error listing tech orders:", error);
      return new Response(JSON.stringify({ error: "Failed to list tech orders" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/tech-orders", async (req) => {
    try {
      const body = await req.json();
      const { name, pattern, context, usage_count = 0 } = body;
      if (!name || !pattern) {
        return new Response(JSON.stringify({ error: "name and pattern are required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const techOrder = {
        id: "to_" + crypto3.randomUUID(),
        name,
        pattern,
        context,
        usage_count,
        success_rate: 0,
        anti_pattern: false,
        created_at: new Date().toISOString(),
        last_used: null
      };
      const techOrderPath = path5.join(TECH_ORDERS_DIR, `${techOrder.id}.json`);
      fs5.writeFileSync(techOrderPath, JSON.stringify(techOrder, null, 2));
      console.log(`Created tech order: ${name}`);
      return new Response(JSON.stringify({ tech_order: techOrder }), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error creating tech order:", error);
      return new Response(JSON.stringify({ error: "Failed to create tech order" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/squawk/mailbox.ts
function registerMailboxRoutes(router, headers) {
  router.post("/api/v1/mailbox/append", async (req) => {
    try {
      const body = await req.json();
      const { stream_id, events } = body;
      if (!stream_id || !Array.isArray(events)) {
        return new Response(JSON.stringify({ error: "stream_id and events array are required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      if (!await mailboxOps.exists(stream_id)) {
        await mailboxOps.create(stream_id);
      }
      const formattedEvents = events.map((e) => ({
        type: e.type,
        stream_id,
        data: JSON.stringify(e.data),
        occurred_at: new Date().toISOString(),
        causation_id: e.causation_id || null,
        metadata: e.metadata ? JSON.stringify(e.metadata) : null
      }));
      const inserted = await eventOps.append(stream_id, formattedEvents);
      const mailbox = await mailboxOps.getById(stream_id);
      const mailboxEvents = await eventOps.getByMailbox(stream_id);
      return new Response(JSON.stringify({
        mailbox: { ...mailbox, events: mailboxEvents },
        inserted: inserted.length
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error appending to mailbox:", error);
      return new Response(JSON.stringify({ error: "Failed to append to mailbox" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/mailbox/:streamId", async (req, params) => {
    try {
      const streamId = params.streamId;
      const mailbox = await mailboxOps.getById(streamId);
      if (!mailbox) {
        return new Response(JSON.stringify({ error: "Mailbox not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const events = await eventOps.getByMailbox(streamId);
      return new Response(JSON.stringify({ mailbox: { ...mailbox, events } }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting mailbox:", error);
      return new Response(JSON.stringify({ error: "Failed to get mailbox" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/squawk/cursor.ts
function registerCursorRoutes(router, headers) {
  router.post("/api/v1/cursor/advance", async (req) => {
    try {
      const body = await req.json();
      const { stream_id, position } = body;
      if (!stream_id || typeof position !== "number") {
        return new Response(JSON.stringify({ error: "stream_id and position are required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      if (!await mailboxOps.exists(stream_id)) {
        return new Response(JSON.stringify({ error: "Mailbox not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const cursor = await cursorOps.upsert({ stream_id, position, updated_at: new Date().toISOString() });
      return new Response(JSON.stringify({ cursor }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error advancing cursor:", error);
      return new Response(JSON.stringify({ error: "Failed to advance cursor" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/cursor/:cursorId", async (req, params) => {
    try {
      const cursorId = params.cursorId;
      const cursor = cursorOps.getById(cursorId);
      if (!cursor) {
        return new Response(JSON.stringify({ error: "Cursor not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ cursor }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting cursor:", error);
      return new Response(JSON.stringify({ error: "Failed to get cursor" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/squawk/lock.ts
function registerLockRoutes(router, headers) {
  router.post("/api/v1/lock/acquire", async (req) => {
    try {
      const body = await req.json();
      const { file, specialist_id, timeout_ms = 30000 } = body;
      if (!file || !specialist_id) {
        return new Response(JSON.stringify({ error: "file and specialist_id are required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const lock = await lockOps.acquire({
        file,
        reserved_by: specialist_id,
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: "edit",
        checksum: null,
        timeout_ms,
        metadata: null
      });
      return new Response(JSON.stringify({ lock }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error acquiring lock:", error);
      return new Response(JSON.stringify({ error: "Failed to acquire lock" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/lock/release", async (req) => {
    try {
      const body = await req.json();
      const { lock_id, specialist_id } = body;
      if (!lock_id) {
        return new Response(JSON.stringify({ error: "lock_id is required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const lock = await lockOps.getById(lock_id);
      if (!lock) {
        return new Response(JSON.stringify({ error: "Lock not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      if (lock.reserved_by !== specialist_id) {
        return new Response(JSON.stringify({ error: "Cannot release lock: wrong specialist" }), {
          status: 403,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const updatedLock = await lockOps.release(lock_id);
      return new Response(JSON.stringify({ lock: updatedLock }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error releasing lock:", error);
      return new Response(JSON.stringify({ error: "Failed to release lock" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/locks", async (req) => {
    try {
      const locks = lockOps.getAll();
      return new Response(JSON.stringify({ locks }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error listing locks:", error);
      return new Response(JSON.stringify({ error: "Failed to list locks" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/squawk/coordinator.ts
function registerCoordinatorRoutes(router, headers) {
  router.get("/api/v1/coordinator/status", async (req) => {
    try {
      const mailboxes = await mailboxOps.getAll();
      const locks = await lockOps.getAll();
      return new Response(JSON.stringify({
        active_mailboxes: mailboxes.length,
        active_locks: locks.length,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting coordinator status:", error);
      return new Response(JSON.stringify({ error: "Failed to get status" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/agents/routes.ts
import { randomUUID } from "crypto";
var agents = new Map;
var assignments = new Map;
agents.set("FSD-001", {
  id: randomUUID(),
  agent_type: "full-stack-developer",
  callsign: "FSD-001",
  status: "idle",
  capabilities: [{
    id: "feature-implementation",
    name: "End-to-End Feature Implementation",
    trigger_words: ["implement", "feature", "build", "develop"]
  }],
  current_workload: 0,
  max_workload: 2,
  last_heartbeat: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});
agents.set("CR-001", {
  id: randomUUID(),
  agent_type: "code-reviewer",
  callsign: "CR-001",
  status: "idle",
  capabilities: [{
    id: "code-quality",
    name: "Code Quality Review",
    trigger_words: ["review", "quality", "audit", "refactor"]
  }],
  current_workload: 1,
  max_workload: 4,
  last_heartbeat: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});
function registerAgentRoutes(router, headers) {
  router.get("/api/v1/agents", async (req) => {
    try {
      const agentList = Array.from(agents.values());
      return new Response(JSON.stringify({
        agents: agentList,
        count: agentList.length,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting agents:", error);
      return new Response(JSON.stringify({ error: "Failed to get agents" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/agents/:callsign", async (req, params) => {
    try {
      const agent = agents.get(params.callsign);
      if (!agent) {
        return new Response(JSON.stringify({ error: "Agent not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({
        agent,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting agent:", error);
      return new Response(JSON.stringify({ error: "Failed to get agent" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/agents/register", async (req) => {
    try {
      const body = await req.json();
      for (const agent of agents.values()) {
        if (agent.callsign === body.callsign) {
          return new Response(JSON.stringify({ error: "Agent callsign already exists" }), {
            status: 409,
            headers: { ...headers, "Content-Type": "application/json" }
          });
        }
      }
      const newAgent = {
        id: randomUUID(),
        agent_type: body.agent_type,
        callsign: body.callsign,
        status: "offline",
        capabilities: body.capabilities || [],
        current_workload: 0,
        max_workload: body.max_workload || 1,
        last_heartbeat: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      agents.set(body.callsign, newAgent);
      console.log(`Agent registered: ${body.callsign} (${body.agent_type})`);
      return new Response(JSON.stringify({
        agent: newAgent,
        message: "Agent registered successfully",
        timestamp: new Date().toISOString()
      }), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error registering agent:", error);
      return new Response(JSON.stringify({ error: "Failed to register agent" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.patch("/api/v1/agents/:callsign/status", async (req, params) => {
    try {
      const body = await req.json();
      const agent = agents.get(params.callsign);
      if (!agent) {
        return new Response(JSON.stringify({ error: "Agent not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      agent.status = body.status;
      agent.last_heartbeat = new Date().toISOString();
      agent.updated_at = new Date().toISOString();
      if (body.workload !== undefined) {
        agent.current_workload = body.workload;
      }
      agents.set(params.callsign, agent);
      return new Response(JSON.stringify({
        agent,
        message: "Agent status updated",
        timestamp: new Date().toISOString()
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error updating agent status:", error);
      return new Response(JSON.stringify({ error: "Failed to update agent status" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/agents/:callsign/assignments", async (req, params) => {
    try {
      const agent = agents.get(params.callsign);
      if (!agent) {
        return new Response(JSON.stringify({ error: "Agent not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const agentAssignments = Array.from(assignments.values()).filter((assignment) => assignment.agent_callsign === params.callsign);
      return new Response(JSON.stringify({
        assignments: agentAssignments,
        count: agentAssignments.length,
        agent: {
          id: agent.id,
          callsign: agent.callsign,
          agent_type: agent.agent_type,
          status: agent.status,
          current_workload: agent.current_workload,
          max_workload: agent.max_workload
        },
        timestamp: new Date().toISOString()
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting agent assignments:", error);
      return new Response(JSON.stringify({ error: "Failed to get agent assignments" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.patch("/api/v1/assignments/:id/status", async (req, params) => {
    try {
      const body = await req.json();
      const assignment = assignments.get(params.id);
      if (!assignment) {
        return new Response(JSON.stringify({ error: "Assignment not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      assignment.status = body.status;
      if (body.progress_percent !== undefined) {
        assignment.progress_percent = body.progress_percent;
      }
      assignments.set(params.id, assignment);
      return new Response(JSON.stringify({
        assignment,
        message: "Assignment status updated",
        timestamp: new Date().toISOString()
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error updating assignment status:", error);
      return new Response(JSON.stringify({ error: "Failed to update assignment status" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/assignments", async (req) => {
    try {
      const body = await req.json();
      const suitableAgent = Array.from(agents.values()).find((agent) => agent.status === "idle" && agent.current_workload < agent.max_workload && agent.capabilities.some((cap) => cap.trigger_words.some((trigger) => body.work_type.toLowerCase().includes(trigger.toLowerCase()))));
      if (!suitableAgent) {
        return new Response(JSON.stringify({
          error: "No suitable agent available for this work type",
          work_type: body.work_type,
          available_agents: Array.from(agents.values()).map((a) => ({
            callsign: a.callsign,
            agent_type: a.agent_type,
            status: a.status,
            workload: `${a.current_workload}/${a.max_workload}`
          }))
        }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const assignment = {
        id: randomUUID(),
        agent_id: suitableAgent.id,
        agent_callsign: suitableAgent.callsign,
        work_order_id: body.work_order_id,
        work_type: body.work_type,
        priority: body.priority || "medium",
        assigned_at: new Date().toISOString(),
        status: "assigned",
        progress_percent: 0,
        context: body.context
      };
      assignments.set(assignment.id, assignment);
      suitableAgent.current_workload++;
      suitableAgent.status = "busy";
      suitableAgent.updated_at = new Date().toISOString();
      console.log(`Work assigned: ${body.work_order_id} to ${suitableAgent.callsign}`);
      return new Response(JSON.stringify({
        assignment,
        agent: {
          id: suitableAgent.id,
          callsign: suitableAgent.callsign,
          agent_type: suitableAgent.agent_type
        },
        message: "Work assigned successfully",
        timestamp: new Date().toISOString()
      }), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error creating assignment:", error);
      return new Response(JSON.stringify({ error: "Failed to create assignment" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/assignments", async (req) => {
    try {
      const assignmentList = Array.from(assignments.values());
      const url = new URL(req.url);
      const statusFilter = url.searchParams.get("status");
      const filteredAssignments = statusFilter ? assignmentList.filter((a) => a.status === statusFilter) : assignmentList;
      return new Response(JSON.stringify({
        assignments: filteredAssignments,
        count: filteredAssignments.length,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting assignments:", error);
      return new Response(JSON.stringify({ error: "Failed to get assignments" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/agents/coordinate", async (req) => {
    try {
      const body = await req.json();
      const coordinationId = randomUUID();
      console.log(`Coordination requested: ${body.coordination_type} by ${body.coordinator_agent}`);
      return new Response(JSON.stringify({
        coordination_id: coordinationId,
        coordinator_agent: body.coordinator_agent,
        participating_agents: body.participating_agents,
        coordination_type: body.coordination_type,
        status: "initiated",
        started_at: new Date().toISOString(),
        message: "Coordination session initiated",
        timestamp: new Date().toISOString()
      }), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error initiating coordination:", error);
      return new Response(JSON.stringify({ error: "Failed to initiate coordination" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/agents/stats", async (req) => {
    try {
      const agentList = Array.from(agents.values());
      const assignmentList = Array.from(assignments.values());
      const stats = {
        total_agents: agentList.length,
        agents_by_type: agentList.reduce((acc, agent) => {
          acc[agent.agent_type] = (acc[agent.agent_type] || 0) + 1;
          return acc;
        }, {}),
        agents_by_status: agentList.reduce((acc, agent) => {
          acc[agent.status] = (acc[agent.status] || 0) + 1;
          return acc;
        }, {}),
        total_assignments: assignmentList.length,
        assignments_by_status: assignmentList.reduce((acc, assignment) => {
          acc[assignment.status] = (acc[assignment.status] || 0) + 1;
          return acc;
        }, {}),
        active_workload: agentList.reduce((sum, agent) => sum + agent.current_workload, 0),
        max_workload: agentList.reduce((sum, agent) => sum + agent.max_workload, 0),
        utilization_rate: agentList.length > 0 ? agentList.reduce((sum, agent) => sum + agent.current_workload, 0) / agentList.reduce((sum, agent) => sum + agent.max_workload, 0) * 100 : 0,
        timestamp: new Date().toISOString()
      };
      return new Response(JSON.stringify(stats), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting agent stats:", error);
      return new Response(JSON.stringify({ error: "Failed to get agent stats" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/index.ts
var headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
var routes = [];
function parsePathPattern(pathPattern) {
  const paramNames = [];
  const regexPattern = pathPattern.replace(/:([^/]+)/g, (_, paramName) => {
    paramNames.push(paramName);
    return "([^/]+)";
  });
  return {
    regex: new RegExp(`^${regexPattern}$`),
    paramNames
  };
}
function createRouter() {
  const addRoute = (method, path6, handler, paramNames, regex) => {
    routes.push({ method, pathPattern: path6, regex, paramNames, handler });
  };
  return {
    get: (path6, handler) => {
      const { regex, paramNames } = parsePathPattern(path6);
      if (path6.includes(":")) {
        addRoute("GET", path6, handler, paramNames, regex);
      } else {
        addRoute("GET", path6, handler, [], regex);
      }
    },
    post: (path6, handler) => {
      const { regex, paramNames } = parsePathPattern(path6);
      if (path6.includes(":")) {
        addRoute("POST", path6, handler, paramNames, regex);
      } else {
        addRoute("POST", path6, handler, [], regex);
      }
    },
    patch: (path6, handler) => {
      const { regex, paramNames } = parsePathPattern(path6);
      if (path6.includes(":")) {
        addRoute("PATCH", path6, handler, paramNames, regex);
      } else {
        addRoute("PATCH", path6, handler, [], regex);
      }
    },
    delete: (path6, handler) => {
      const { regex, paramNames } = parsePathPattern(path6);
      if (path6.includes(":")) {
        addRoute("DELETE", path6, handler, paramNames, regex);
      } else {
        addRoute("DELETE", path6, handler, [], regex);
      }
    }
  };
}
function registerRoutes() {
  registerWorkOrdersRoutes(createRouter(), headers);
  registerCtkRoutes(createRouter(), headers);
  registerTechOrdersRoutes(createRouter(), headers);
  registerMailboxRoutes(createRouter(), headers);
  registerCursorRoutes(createRouter(), headers);
  registerLockRoutes(createRouter(), headers);
  registerCoordinatorRoutes(createRouter(), headers);
  registerAgentRoutes(createRouter(), headers);
}
async function startServer() {
  try {
    await initializeDatabase();
    console.log("Squawk database initialized");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }
  registerRoutes();
  const server = Bun.serve({
    port: parseInt(process.env.PORT || "3001", 10),
    async fetch(request) {
      const url = new URL(request.url);
      const path6 = url.pathname;
      const method = request.method;
      if (method === "OPTIONS") {
        return new Response(null, { headers });
      }
      if (path6 === "/health") {
        return new Response(JSON.stringify({
          status: "healthy",
          service: "fleettools-consolidated",
          timestamp: new Date().toISOString(),
          version: "1.0.0"
        }), {
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      for (const route of routes) {
        if (route.method !== method)
          continue;
        const match = path6.match(route.regex);
        if (match) {
          try {
            const params = {};
            route.paramNames.forEach((name, i) => {
              params[name] = match[i + 1];
            });
            return await route.handler(request, params);
          } catch (error) {
            console.error("Route handler error:", error);
            return new Response(JSON.stringify({
              error: "Internal server error",
              message: error instanceof Error ? error.message : "Unknown error"
            }), {
              status: 500,
              headers: { ...headers, "Content-Type": "application/json" }
            });
          }
        }
      }
      return new Response(JSON.stringify({
        error: "Not found",
        path: path6,
        method
      }), {
        status: 404,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  setInterval(async () => {
    try {
      const released = await lockOps.releaseExpired();
      if (released > 0) {
        console.log(`Released ${released} expired locks`);
      }
      if (released > 0) {
        console.log(`Released ${released} expired locks`);
      }
    } catch (error) {
      console.error("Error releasing expired locks:", error);
    }
  }, 30000);
  console.log(`FleetTools Consolidated API server listening on port ${server.port}`);
  console.log(`Health check: http://localhost:${server.port}/health`);
  console.log(`
Flightline Endpoints:`);
  console.log("  GET    /api/v1/work-orders         - List work orders");
  console.log("  POST   /api/v1/work-orders         - Create work order");
  console.log("  GET    /api/v1/work-orders/:id     - Get work order");
  console.log("  PATCH  /api/v1/work-orders/:id     - Update work order");
  console.log("  DELETE /api/v1/work-orders/:id     - Delete work order");
  console.log("  GET    /api/v1/ctk/reservations    - List CTK reservations");
  console.log("  POST   /api/v1/ctk/reserve         - Reserve file");
  console.log("  POST   /api/v1/ctk/release         - Release reservation");
  console.log("  GET    /api/v1/tech-orders         - List tech orders");
  console.log("  POST   /api/v1/tech-orders         - Create tech order");
  console.log(`
Squawk Endpoints:`);
  console.log("  POST   /api/v1/mailbox/append      - Append events to mailbox");
  console.log("  GET    /api/v1/mailbox/:streamId   - Get mailbox contents");
  console.log("  POST   /api/v1/cursor/advance      - Advance cursor position");
  console.log("  GET    /api/v1/cursor/:cursorId    - Get cursor position");
  console.log("  POST   /api/v1/lock/acquire        - Acquire file lock");
  console.log("  POST   /api/v1/lock/release        - Release file lock");
  console.log("  GET    /api/v1/locks               - List all active locks");
  console.log("  GET    /api/v1/coordinator/status  - Get coordinator status");
  console.log(`
Agent Coordination Endpoints:`);
  console.log("  GET    /api/v1/agents                 - List all agents");
  console.log("  GET    /api/v1/agents/:callsign      - Get agent by callsign");
  console.log("  POST   /api/v1/agents/register      - Register new agent");
  console.log("  PATCH  /api/v1/agents/:callsign/status - Update agent status");
  console.log("  GET    /api/v1/agents/:callsign/assignments - Get agent assignments");
  console.log("  POST   /api/v1/assignments           - Create work assignment");
  console.log("  GET    /api/v1/assignments           - List all assignments");
  console.log("  PATCH  /api/v1/assignments/:id/status - Update assignment status");
  console.log("  POST   /api/v1/agents/coordinate    - Start agent coordination");
  console.log("  GET    /api/v1/agents/stats          - Get agent statistics");
  process.on("SIGINT", () => {
    console.log(`
Shutting down...`);
    closeDatabase();
    server.stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    console.log(`
Shutting down...`);
    closeDatabase();
    server.stop();
    process.exit(0);
  });
  return server;
}
var server = await startServer();
export {
  server
};
