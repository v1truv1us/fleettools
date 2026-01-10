# Data Model - P0 Recovery Integration

## Overview

This document describes the data model enhancements for P0 Recovery Integration features, including migrations, recovery tracking, and checkpoint metadata.

## Entities

### Mission (Enhanced)

```typescript
interface Mission {
  id: string;                    // Format: msn-<uuid8>
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;            // ISO 8601
  started_at?: string;           // ISO 8601 (when status → in_progress)
  completed_at?: string;         // ISO 8601 (when status → completed)
  total_sorties: number;
  completed_sorties: number;
  result?: {
    success: boolean;
    summary?: string;
    artifacts?: string[];
    metrics?: Record<string, number>;
    errors?: string[];
  };
  metadata?: Record<string, unknown>;
}
```

**Changes from Day 2**: None (MissionOps is new)

### Checkpoint (Existing, Enhanced)

```typescript
interface Checkpoint {
  id: string;                    // Format: chk-<uuid8>
  mission_id: string;
  timestamp: string;             // ISO 8601
  trigger: 'progress' | 'error' | 'manual' | 'compaction';
  trigger_details?: string;
  progress_percent: number;        // 0-100
  sorties: SortieSnapshot[];
  active_locks: LockSnapshot[];
  pending_messages: MessageSnapshot[];
  recovery_context: RecoveryContext;
  created_by: string;            // 'cli', 'agent', or system
  expires_at?: string;           // ISO 8601 (optional TTL)
  consumed_at?: string;          // ISO 8601 (set when used for recovery)
  version: string;               // '1.0.0'
  metadata?: Record<string, unknown>;
}

interface SortieSnapshot {
  id: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'blocked' | 'review' | 'completed' | 'failed' | 'cancelled';
  assigned_to?: string;
  files?: string[];
  started_at?: string;
  progress?: number;
  progress_notes?: string;
}

interface LockSnapshot {
  id: string;
  file: string;
  held_by: string;              // specialist_id
  acquired_at: string;          // ISO 8601
  purpose: string;              // 'edit' | 'read' | 'delete'
  timeout_ms: number;
}

interface MessageSnapshot {
  id: string;
  from: string;
  to: string[];
  subject: string;
  sent_at: string;
  delivered: boolean;
}

interface RecoveryContext {
  last_action: string;
  next_steps: string[];
  blockers: string[];
  files_modified: string[];
  mission_summary: string;
  elapsed_time_ms: number;
  last_activity_at: string;       // ISO 8601
}
```

**Enhancements from Day 2**:
- Added `consumed_at` field for tracking recovery usage
- RecoveryContext now includes `last_activity_at` for inactivity detection

### Legacy Data (Migration Only)

**JSON Format (to be migrated)**:
```json
{
  "mailboxes": {
    "mbx-001": {
      "id": "mbx-001",
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  },
  "events": {
    "mbx-001": [
      {
        "id": "evt-001",
        "mailbox_id": "mbx-001",
        "type": "mission_created",
        "stream_id": "msn-001",
        "data": "{...}",
        "occurred_at": "2026-01-01T00:00:00.000Z",
        "causation_id": null,
        "metadata": null
      }
    ]
  },
  "cursors": {
    "mission_msn-001_cursor": {
      "id": "cursor-001",
      "stream_id": "msn-001",
      "position": 5,
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  },
  "locks": {
    "lock-001": {
      "id": "lock-001",
      "file": "src/example.ts",
      "reserved_by": "spec-001",
      "reserved_at": "2026-01-01T00:00:00.000Z",
      "released_at": null,
      "purpose": "edit",
      "checksum": null,
      "timeout_ms": 30000,
      "metadata": null
    }
  }
}
```

**Migration Strategy**:
1. Read JSON file from `~/.local/share/fleet/squawk.json`
2. Migrate each entity type to SQLite tables
3. Validate counts after migration
4. Rename to `squawk.json.backup` on success

## Relationships

### Mission → Checkpoints (One-to-Many)
```
Mission.id ──< Checkpoint.mission_id
```

### Mission → Events (One-to-Many)
```
Mission.id ──< Event.stream_id (where stream_type = 'mission')
```

### Checkpoint → Sorties (One-to-Many)
```
Checkpoint.id contains SortieSnapshot[] (embedded, not foreign key)
```

### Checkpoint → Locks (One-to-Many)
```
Checkpoint.id contains LockSnapshot[] (embedded, not foreign key)
```

### Checkpoint → Messages (One-to-Many)
```
Checkpoint.id contains MessageSnapshot[] (embedded, not foreign key)
```

### Specialist → Locks (One-to-Many)
```
Specialist.id ──< Lock.reserved_by
```

## Database Schema Changes

### New Table: missions

```sql
CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'review', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    total_sorties INTEGER NOT NULL DEFAULT 0,
    completed_sorties INTEGER NOT NULL DEFAULT 0,
    result TEXT,                 -- JSON serialized
    metadata TEXT,                -- JSON serialized
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_created_at ON missions(created_at);
```

### New Table: checkpoints (if not in schema)

```sql
CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    trigger TEXT NOT NULL CHECK(trigger IN ('progress', 'error', 'manual', 'compaction')),
    trigger_details TEXT,
    progress_percent INTEGER NOT NULL CHECK(progress_percent >= 0 AND progress_percent <= 100),
    sorties TEXT NOT NULL,          -- JSON array of SortieSnapshot
    active_locks TEXT NOT NULL,      -- JSON array of LockSnapshot
    pending_messages TEXT NOT NULL,   -- JSON array of MessageSnapshot
    recovery_context TEXT NOT NULL,   -- JSON of RecoveryContext
    created_by TEXT NOT NULL,
    expires_at TEXT,
    consumed_at TEXT,
    version TEXT NOT NULL DEFAULT '1.0.0',
    metadata TEXT,                  -- JSON serialized
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_mission_id ON checkpoints(mission_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON checkpoints(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_checkpoints_consumed ON checkpoints(consumed_at) WHERE consumed_at IS NULL;
```

### Enhanced Table: locks (add status field if not present)

```sql
-- Check if status column exists, add if missing
ALTER TABLE locks ADD COLUMN status TEXT DEFAULT 'active' CHECK(status IN ('active', 'released', 'expired', 'force_released'));

-- Add expires_at if not present (calculate from reserved_at + timeout_ms)
ALTER TABLE locks ADD COLUMN expires_at TEXT GENERATED ALWAYS AS (
    datetime(reserved_at, '+' || (timeout_ms / 1000) || ' seconds')
) STORED;

CREATE INDEX IF NOT EXISTS idx_locks_status ON locks(status);
CREATE INDEX IF NOT EXISTS idx_locks_expires_at ON locks(expires_at);
```

## Data Flow

### Checkpoint Creation Flow

```
1. Agent or CLI triggers checkpoint
   ↓
2. Capture current state:
   - Sortie states (status, progress, notes)
   - Active locks (held_by, timeout, purpose)
   - Pending messages (undelivered only)
   - Recovery context (last action, next steps, blockers)
   ↓
3. Create Checkpoint record in SQLite
   - Insert with metadata JSON
   - Generate ID (chk-<uuid8>)
   ↓
4. Write JSON file backup:
   - ~/.flightline/checkpoints/<id>.json
   ↓
5. Update latest.json symlink
   - Point to newest checkpoint file
   ↓
6. Emit checkpoint_created event
```

### Recovery Detection Flow

```
1. On agent startup or user request
   ↓
2. Query missions WHERE status = 'in_progress'
   ↓
3. For each mission:
   - Get latest event (SELECT * FROM events WHERE stream_id = ? ORDER BY occurred_at DESC LIMIT 1)
   - Calculate inactivity = now - latest_event.occurred_at
   - If inactivity > threshold (5 min default):
     - Check for checkpoint: SELECT * FROM checkpoints WHERE mission_id = ? ORDER BY timestamp DESC LIMIT 1
     - If checkpoint exists → add to recovery candidates
   ↓
4. Return list of recovery candidates
   ↓
5. If candidates exist:
   - Emit context_compacted event
   - Prompt user for recovery (or auto-resume if flag set)
```

### State Restoration Flow

```
1. User selects checkpoint (CLI or auto)
   ↓
2. Begin transaction
   ↓
3. Restore sortie states:
   - For each SortieSnapshot:
     UPDATE sorties SET status = ?, assigned_to = ?, progress = ?, progress_notes = ?
     WHERE id = ?
   ↓
4. Re-acquire locks:
   - For each LockSnapshot:
     - Check if expired: now > (acquired_at + timeout_ms)
     - If expired → skip, add to warnings
     - If not expired → attempt acquire:
       SELECT * FROM locks WHERE file = ? AND status = 'active' AND released_at IS NULL
       If conflict:
         - Add to recovery_context.blockers
         - Option: force-release (DELETE, then INSERT)
       If no conflict:
         INSERT INTO locks (...)
   ↓
5. Requeue pending messages:
   - For each MessageSnapshot WHERE delivered = false:
     UPDATE messages SET status = 'pending', read_at = NULL, acked_at = NULL
     WHERE id = ?
   ↓
6. Mark checkpoint as consumed:
   UPDATE checkpoints SET consumed_at = datetime('now') WHERE id = ?
   ↓
7. Emit fleet_recovered event
   ↓
8. Commit transaction
   ↓
9. Format recovery context for LLM prompt injection
```

## Indexes

### Performance Indexes

```sql
-- Mission queries
idx_missions_status: ON missions(status)                    -- For getByStatus()
idx_missions_created_at: ON missions(created_at DESC)         -- For listing

-- Checkpoint queries
idx_checkpoints_mission_id: ON checkpoints(mission_id, timestamp DESC) -- For getLatest()
idx_checkpoints_timestamp: ON checkpoints(timestamp DESC)          -- For list()
idx_checkpoints_consumed: ON checkpoints(consumed_at) WHERE consumed_at IS NULL -- For unconsumed checkpoints

-- Lock queries
idx_locks_status: ON locks(status)                             -- For getActive()
idx_locks_expires_at: ON locks(expires_at)                     -- For expiration checks
idx_locks_file: ON locks(file)                                  -- For getByFile()

-- Event queries
idx_events_stream: ON events(stream_type, stream_id, occurred_at DESC)  -- For getLatest()
idx_events_type: ON events(type)                                   -- For queryByType()
```

## Constraints

### Data Integrity

```sql
-- Mission status transitions
CHECK(status IN ('pending', 'in_progress', 'review', 'completed', 'cancelled'))

-- Checkpoint progress range
CHECK(progress_percent >= 0 AND progress_percent <= 100)

-- Lock status transitions
CHECK(status IN ('active', 'released', 'expired', 'force_released'))

-- Checkpoint trigger types
CHECK(trigger IN ('progress', 'error', 'manual', 'compaction'))
```

### Foreign Keys

```sql
-- If implementing normalized schema (not used in P0)
FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
FOREIGN KEY (mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE
```

## Migration Notes

### JSON to SQLite Type Mapping

| JSON Type | SQLite Type | Notes |
|------------|--------------|--------|
| mailboxes: {id, created_at, updated_at} | mailboxes table | Direct mapping |
| events: {mbx_id: [events]} | events table | Flatten array to rows |
| cursors: {id: cursor} | cursors table | Direct mapping |
| locks: {id: lock} | locks table | Direct mapping (skip if released) |

### Migration Validation

```typescript
interface MigrationValidation {
  before: {
    mailboxCount: number;
    eventCount: number;
    cursorCount: number;
    lockCount: number;
  };
  after: {
    mailboxCount: number;
    eventCount: number;
    cursorCount: number;
    lockCount: number;
  };
  success: boolean;
}
```

Validate:
- All counts match after migration
- No data loss (same IDs present)
- Timestamps preserved
- Relationships maintained

## Backup Strategy

### SQLite WAL Mode

```sql
PRAGMA journal_mode = WAL;  -- Write-Ahead Logging
```

Benefits:
- Concurrent readers and writers
- Faster writes
- Crash recovery
- Separate `.wal` and `.shm` files

### File System Backup

Checkpoints stored as JSON in `~/.flightline/checkpoints/`:
- Dual storage: SQLite (primary) + JSON (backup)
- Fallback: Read from JSON if SQLite unavailable
- Symlink: `latest.json` → newest checkpoint

### Backup Retention

- Migration backup: `squawk.json.backup` (indefinite)
- Checkpoint backups: Keep N most recent per mission (configurable)
- Prune old checkpoints after N days (configurable)

---

**Version**: 1.0.0
**Last Updated**: 2026-01-05
