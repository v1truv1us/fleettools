// @bun
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// src/db/index.ts
import path2 from "path";
import fs2 from "fs";

// src/db/sqlite.js
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

// src/db/index.ts
var __dirname = "/home/vitruvius/git/fleettools/squawk/src/db";
function getLegacyDbPath() {
  return path2.join(process.env.HOME || "", ".local", "share", "fleet", "squawk.json");
}
function getSqliteDbPath() {
  const preferredPath = path2.join(process.env.HOME || "", ".local", "share", "fleet", "squawk.db");
  const preferredDir = path2.dirname(preferredPath);
  try {
    if (!fs2.existsSync(preferredDir)) {
      fs2.mkdirSync(preferredDir, { recursive: true });
    }
    const testFile = path2.join(preferredDir, ".write-test");
    fs2.writeFileSync(testFile, "");
    fs2.unlinkSync(testFile);
    console.log(`[Database] \u2713 Preferred path is writable: ${preferredPath}`);
    return preferredPath;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[Database] Preferred path not writable (${errorMsg})`);
    console.warn(`[Database] Trying fallback path: /tmp/fleet/`);
    const tmpPath = path2.join("/tmp", "fleet", `squawk-${process.pid}.db`);
    const tmpDir = path2.dirname(tmpPath);
    try {
      if (!fs2.existsSync(tmpDir)) {
        fs2.mkdirSync(tmpDir, { recursive: true });
      }
      const testFile = path2.join(tmpDir, ".write-test");
      fs2.writeFileSync(testFile, "");
      fs2.unlinkSync(testFile);
      console.log(`[Database] \u2713 Fallback path is writable: ${tmpPath}`);
      return tmpPath;
    } catch (fallbackError) {
      const fallbackErrorMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      console.warn(`[Database] Fallback path also not writable (${fallbackErrorMsg})`);
      console.warn(`[Database] Using in-memory database as last resort`);
      return ":memory:";
    }
  }
}
var adapter = null;
async function initializeDatabase(dbPath) {
  console.log("[Database] Determining database path...");
  const targetPath = dbPath || getSqliteDbPath();
  console.log(`[Database] Using database path: ${targetPath}`);
  if (targetPath !== ":memory:") {
    const dbDir = path2.dirname(targetPath);
    try {
      if (!fs2.existsSync(dbDir)) {
        console.log(`[Database] Creating directory: ${dbDir}`);
        fs2.mkdirSync(dbDir, { recursive: true });
      }
    } catch (error) {
      console.warn(`[Database] Warning: Could not create directory ${dbDir}, attempting with selected path anyway`);
      console.warn(`[Database] Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log("[Database] Initializing SQLite adapter...");
  const schemaPath = path2.join(__dirname, "schema.sql");
  adapter = new SQLiteAdapter(targetPath, schemaPath);
  await adapter.initialize();
  console.log("[Database] \u2713 Adapter initialized successfully");
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

// src/recovery/index.ts
var exports_recovery = {};
__export(exports_recovery, {
  StateRestorer: () => StateRestorer,
  RecoveryDetector: () => RecoveryDetector
});

// src/recovery/detector.ts
var DEFAULT_ACTIVITY_THRESHOLD_MS = 5 * 60 * 1000;

class RecoveryDetector {
  db;
  constructor(db) {
    this.db = db;
  }
  async detectRecoveryCandidates(options = {}) {
    const {
      activityThresholdMs = DEFAULT_ACTIVITY_THRESHOLD_MS,
      includeCompleted = false
    } = options;
    const now = Date.now();
    const candidates = [];
    const activeMissions = await this.db.missions.getByStatus("in_progress");
    for (const mission of activeMissions) {
      const latestEvent = await this.db.events.getLatestByStream("mission", mission.id);
      if (!latestEvent)
        continue;
      const lastActivityAt = new Date(latestEvent.occurred_at).getTime();
      const inactivityDuration = now - lastActivityAt;
      if (inactivityDuration > activityThresholdMs) {
        const checkpoint = await this.db.checkpoints.getLatestByMission(mission.id);
        candidates.push({
          mission_id: mission.id,
          mission_title: mission.title,
          last_activity_at: latestEvent.occurred_at,
          inactivity_duration_ms: inactivityDuration,
          checkpoint_id: checkpoint?.id,
          checkpoint_progress: checkpoint?.progress_percent,
          checkpoint_timestamp: checkpoint?.timestamp
        });
      }
    }
    return candidates;
  }
  async checkForRecovery(options = {}) {
    const candidates = await this.detectRecoveryCandidates(options);
    const recoverableCandidates = candidates.filter((c) => c.checkpoint_id);
    return {
      needed: recoverableCandidates.length > 0,
      candidates: recoverableCandidates
    };
  }
}
// src/recovery/restorer.ts
class StateRestorer {
  db;
  constructor(db) {
    this.db = db;
  }
  async restoreFromCheckpoint(checkpointId, options = {}) {
    const { dryRun = false, forceLocks = false } = options;
    try {
      const checkpoint = await this.db.checkpoints.getById(checkpointId);
      if (!checkpoint) {
        return {
          success: false,
          checkpoint_id: checkpointId,
          mission_id: "",
          recovery_context: {},
          restored: { sorties: 0, locks: 0, messages: 0 },
          errors: [`Checkpoint not found: ${checkpointId}`],
          warnings: []
        };
      }
      return await this.restore(checkpoint, { dryRun, forceLocks });
    } catch (error) {
      return {
        success: false,
        checkpoint_id: checkpointId,
        mission_id: "",
        recovery_context: {},
        restored: { sorties: 0, locks: 0, messages: 0 },
        errors: [`Restore failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }
  async restoreLatest(missionId, options = {}) {
    const { dryRun = false, forceLocks = false } = options;
    try {
      const checkpoint = await this.db.checkpoints.getLatestByMission(missionId);
      if (!checkpoint) {
        return {
          success: false,
          checkpoint_id: "",
          mission_id: missionId,
          recovery_context: {},
          restored: { sorties: 0, locks: 0, messages: 0 },
          errors: [`No checkpoints found for mission: ${missionId}`],
          warnings: []
        };
      }
      return await this.restore(checkpoint, { dryRun, forceLocks });
    } catch (error) {
      return {
        success: false,
        checkpoint_id: "",
        mission_id: missionId,
        recovery_context: {},
        restored: { sorties: 0, locks: 0, messages: 0 },
        errors: [`Restore failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }
  async restore(checkpoint, options) {
    const { dryRun = false, forceLocks = false } = options;
    const now = new Date().toISOString();
    const result = {
      success: true,
      checkpoint_id: checkpoint.id,
      mission_id: checkpoint.mission_id,
      recovery_context: {
        last_action: "Restored from checkpoint",
        next_steps: this.extractNextSteps(checkpoint),
        blockers: [],
        files_modified: this.extractModifiedFiles(checkpoint),
        mission_summary: `${checkpoint.mission_id} checkpoint restoration`,
        elapsed_time_ms: Date.now() - new Date(checkpoint.timestamp).getTime(),
        last_activity_at: checkpoint.timestamp
      },
      restored: { sorties: 0, locks: 0, messages: 0 },
      errors: [],
      warnings: []
    };
    try {
      if (!dryRun) {
        await this.db.beginTransaction();
      }
      for (const sortie of checkpoint.sorties || []) {
        try {
          if (!dryRun) {
            await this.db.sorties.update(sortie.id, {
              status: sortie.status,
              assigned_to: sortie.assigned_to,
              files: sortie.files,
              progress: sortie.progress,
              progress_notes: sortie.progress_notes
            });
          }
          result.restored.sorties++;
        } catch (error) {
          result.errors.push(`Failed to restore sortie ${sortie.id}: ${error}`);
        }
      }
      for (const lock of checkpoint.active_locks || []) {
        try {
          const lockAge = Date.now() - new Date(lock.acquired_at).getTime();
          const isExpired = lockAge > (lock.timeout_ms || 30000);
          if (isExpired) {
            result.warnings.push(`Lock ${lock.id} expired, skipping re-acquisition`);
            result.recovery_context.blockers.push(`Expired lock on ${lock.file} (held by ${lock.held_by})`);
            continue;
          }
          if (!dryRun) {
            const lockResult = await this.db.locks.acquire({
              file: lock.file,
              specialist_id: lock.held_by,
              timeout_ms: lock.timeout_ms,
              purpose: lock.purpose
            });
            if (lockResult.conflict) {
              if (forceLocks) {
                await this.db.locks.forceRelease(lockResult.existing_lock?.id || "");
                await this.db.locks.acquire({
                  file: lock.file,
                  specialist_id: lock.held_by,
                  timeout_ms: lock.timeout_ms,
                  purpose: lock.purpose
                });
              } else {
                result.warnings.push(`Lock conflict on ${lock.file}, skipping re-acquisition`);
                result.recovery_context.blockers.push(`Lock conflict on ${lock.file} (held by ${lock.held_by})`);
                continue;
              }
            }
          }
          result.restored.locks++;
        } catch (error) {
          result.errors.push(`Failed to restore lock ${lock.id}: ${error}`);
        }
      }
      for (const message of checkpoint.pending_messages || []) {
        try {
          if (!message.delivered) {
            if (!dryRun) {
              await this.db.messages.requeue(message.id);
            }
            result.restored.messages++;
          }
        } catch (error) {
          result.errors.push(`Failed to requeue message ${message.id}: ${error}`);
        }
      }
      if (!dryRun && result.errors.length === 0) {
        await this.db.checkpoints.markConsumed(checkpoint.id);
      }
      if (!dryRun && result.errors.length === 0) {
        await this.db.events.append({
          event_type: "fleet_recovered",
          stream_type: "mission",
          stream_id: checkpoint.mission_id,
          data: {
            checkpoint_id: checkpoint.id,
            restored_at: now,
            sorties_restored: result.restored.sorties,
            locks_restored: result.restored.locks,
            messages_requeued: result.restored.messages,
            warnings: result.warnings.length
          },
          occurred_at: now
        });
      }
      if (!dryRun) {
        await this.db.commitTransaction();
      }
      return result;
    } catch (error) {
      if (!dryRun) {
        try {
          await this.db.rollbackTransaction();
        } catch (rollbackError) {
          result.errors.push(`Failed to rollback transaction: ${rollbackError}`);
        }
      }
      result.success = false;
      result.errors.push(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }
  extractNextSteps(checkpoint) {
    const steps = [];
    const inProgressSorties = checkpoint.sorties?.filter((s) => s.status === "in_progress") || [];
    const blockedSorties = checkpoint.sorties?.filter((s) => s.progress_notes && s.progress_notes.toLowerCase().includes("blocked")) || [];
    if (inProgressSorties && inProgressSorties.length > 0) {
      steps.push("Continue work on in-progress sorties");
    }
    if (blockedSorties && blockedSorties.length > 0) {
      steps.push("Resolve blockers for stuck sorties");
    }
    if (checkpoint.active_locks && checkpoint.active_locks.length > 0) {
      steps.push("Verify file lock integrity");
    }
    if (checkpoint.pending_messages && checkpoint.pending_messages.length > 0) {
      steps.push("Process pending messages");
    }
    if (steps.length === 0) {
      steps.push("Review mission status and continue");
    }
    return steps;
  }
  extractModifiedFiles(checkpoint) {
    const files = new Set;
    checkpoint.sorties?.forEach((sortie) => {
      sortie.files?.forEach((file) => files.add(file));
    });
    checkpoint.active_locks?.forEach((lock) => {
      files.add(lock.file);
    });
    return Array.from(files);
  }
  formatRecoveryPrompt(result) {
    const { recovery_context, restored, errors, warnings } = result;
    const sections = [
      "# Mission Recovery Context",
      "",
      "## Mission Summary",
      recovery_context.mission_summary,
      "",
      "## Last Action",
      recovery_context.last_action,
      "",
      "## Time Context",
      `- Last activity: ${recovery_context.last_activity_at}`,
      `- Elapsed time: ${Math.round(recovery_context.elapsed_time_ms / 60000)} minutes`,
      "",
      "## Next Steps",
      ...recovery_context.next_steps.map((step) => `- ${step}`),
      ""
    ];
    if (recovery_context.files_modified.length > 0) {
      sections.push("## Files Modified", ...recovery_context.files_modified.map((file) => `- ${file}`), "");
    }
    if (recovery_context.blockers.length > 0) {
      sections.push("## Blockers", ...recovery_context.blockers.map((blocker) => `- ${blocker}`), "");
    }
    sections.push("## Restoration Summary", `- Sorties restored: ${restored.sorties}`, `- Locks restored: ${restored.locks}`, `- Messages requeued: ${restored.messages}`, "");
    if (warnings.length > 0) {
      sections.push("## Warnings", ...warnings.map((warning) => `- ${warning}`), "");
    }
    if (errors.length > 0) {
      sections.push("## Errors", ...errors.map((error) => `- ${error}`), "");
    }
    sections.push("---", "*This context was automatically generated from checkpoint restoration.*");
    return sections.join(`
`);
  }
}
export {
  exports_recovery as recovery,
  mailboxOps,
  lockOps,
  initializeDatabase,
  eventOps,
  cursorOps,
  closeDatabase
};
