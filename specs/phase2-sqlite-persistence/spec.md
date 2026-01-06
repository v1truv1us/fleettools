# FleetTools Phase 2: SQLite Event-Sourced Persistence Layer

**Version:** 1.0.0  
**Status:** Draft  
**Author:** Database Architecture Team  
**Date:** 2026-01-04

---

## 1. Overview

### 1.1 Executive Summary

This specification defines the migration from JSON file-based persistence to a SQLite event-sourced storage layer using `bun:sqlite`. The new architecture provides:

- **Append-only event log** for complete audit trail and time-travel debugging
- **Project isolation** via hashed database paths
- **ACID guarantees** with WAL mode for concurrent access
- **Materialized views** for efficient query patterns
- **Zero-downtime migration** from existing JSON storage

### 1.2 Current State

| Component | Current Implementation | Issues |
|-----------|----------------------|--------|
| Storage | `~/.local/share/fleet/squawk.json` | Single file, no isolation, corruption risk |
| Persistence | In-memory with 5-second flush | Data loss on crash, race conditions |
| Concurrency | None | Multiple agents can corrupt data |
| Events | Stored in nested objects | No ordering guarantees, no causation tracking |
| Queries | Full file scan | O(n) for all operations |

### 1.3 Target State

| Component | New Implementation | Benefits |
|-----------|-------------------|----------|
| Storage | `~/.local/share/fleet/<hash>/squawk.db` | Project isolation, atomic operations |
| Persistence | SQLite WAL mode | Immediate durability, concurrent reads |
| Concurrency | Row-level locking | Safe multi-agent access |
| Events | Append-only log with sequence numbers | Ordered, causation chains, replayable |
| Queries | Indexed materialized views | O(log n) lookups |

### 1.4 Design Principles

1. **Events are immutable** - Never update or delete events; append corrections
2. **State is derived** - All current state computed from event replay
3. **Causation is tracked** - Every event links to its cause
4. **Projections are disposable** - Materialized views can be rebuilt from events
5. **Backward compatible** - Existing API contracts preserved

---

## 2. User Stories

### 2.1 Specialist Registration

**US-001: Specialist joins fleet**

> As a specialist agent, I want to register with the fleet so that I can receive work assignments and communicate with other specialists.

**Acceptance Criteria:**
- [ ] Specialist can register with unique ID and capabilities
- [ ] Registration emits `specialist_registered` event
- [ ] Duplicate registration updates existing record
- [ ] Registration persists across server restarts
- [ ] API returns specialist details with registration timestamp

**API Contract:**
```http
POST /api/v1/specialists/register
Content-Type: application/json

{
  "specialist_id": "spec_abc123",
  "name": "code-reviewer",
  "capabilities": ["review", "refactor"],
  "metadata": { "version": "1.0.0" }
}

Response 201:
{
  "specialist": {
    "id": "spec_abc123",
    "name": "code-reviewer",
    "status": "active",
    "registered_at": "2026-01-04T12:00:00.000Z",
    "last_seen": "2026-01-04T12:00:00.000Z"
  }
}
```

---

**US-002: Specialist heartbeat**

> As a specialist agent, I want to send periodic heartbeats so that the coordinator knows I'm still active.

**Acceptance Criteria:**
- [ ] Heartbeat updates `last_seen` timestamp
- [ ] Heartbeat emits `specialist_active` event
- [ ] Stale specialists (no heartbeat > 60s) marked inactive
- [ ] Heartbeat returns current specialist status

---

### 2.2 Squawk Messaging

**US-003: Send message to mailbox**

> As a specialist, I want to send messages to other specialists' mailboxes so that we can coordinate work.

**Acceptance Criteria:**
- [ ] Message appended to target mailbox
- [ ] Emits `squawk_sent` event with message details
- [ ] Message assigned unique ID and sequence number
- [ ] Sender receives confirmation with message ID
- [ ] Message persists across restarts

**API Contract (existing - must preserve):**
```http
POST /api/v1/mailbox/append
Content-Type: application/json

{
  "stream_id": "specialist-123",
  "events": [
    {
      "type": "TaskAssigned",
      "data": { "task_id": "task-456", "priority": "high" },
      "causation_id": "evt-789",
      "metadata": { "source": "coordinator" }
    }
  ]
}

Response 200:
{
  "mailbox": {
    "id": "specialist-123",
    "created_at": "2026-01-04T12:00:00.000Z",
    "updated_at": "2026-01-04T12:00:05.000Z",
    "events": [...]
  },
  "inserted": 1
}
```

---

**US-004: Read mailbox messages**

> As a specialist, I want to read messages from my mailbox so that I can process assigned work.

**Acceptance Criteria:**
- [ ] Returns all events in mailbox ordered by sequence
- [ ] Emits `squawk_read` event for audit
- [ ] Supports pagination via cursor
- [ ] Returns 404 for non-existent mailbox

---

**US-005: Acknowledge message**

> As a specialist, I want to acknowledge messages so that senders know I received them.

**Acceptance Criteria:**
- [ ] Acknowledgment emits `squawk_acked` event
- [ ] Links to original message via causation_id
- [ ] Updates message status in projection

---

**US-006: Create message thread**

> As a specialist, I want to create threaded conversations so that related messages are grouped.

**Acceptance Criteria:**
- [ ] Thread created with unique ID
- [ ] Emits `squawk_thread_created` event
- [ ] Messages can reference thread_id
- [ ] Thread activity tracked via `squawk_thread_activity`

---

### 2.3 CTK File Locking

**US-007: Reserve file for editing**

> As a specialist, I want to reserve a file so that no other specialist modifies it while I'm working.

**Acceptance Criteria:**
- [ ] Lock acquired if file not already locked
- [ ] Emits `ctk_reserved` event
- [ ] Returns lock ID and expiration time
- [ ] Conflict returns 409 with current lock holder
- [ ] Lock includes file checksum for conflict detection

**API Contract (existing - must preserve):**
```http
POST /api/v1/lock/acquire
Content-Type: application/json

{
  "file": "/src/index.ts",
  "specialist_id": "spec_abc123",
  "timeout_ms": 30000
}

Response 200:
{
  "lock": {
    "id": "lock_xyz789",
    "file": "/src/index.ts",
    "reserved_by": "spec_abc123",
    "reserved_at": "2026-01-04T12:00:00.000Z",
    "timeout_ms": 30000,
    "checksum": "sha256:abc..."
  }
}

Response 409 (conflict):
{
  "error": "File already locked",
  "lock": {
    "id": "lock_existing",
    "reserved_by": "spec_other",
    "expires_at": "2026-01-04T12:00:30.000Z"
  }
}
```

---

**US-008: Release file lock**

> As a specialist, I want to release my file lock so that other specialists can edit the file.

**Acceptance Criteria:**
- [ ] Lock released if owned by requesting specialist
- [ ] Emits `ctk_released` event
- [ ] Returns 403 if specialist doesn't own lock
- [ ] Returns 404 if lock doesn't exist

---

**US-009: Detect lock conflicts**

> As a coordinator, I want to detect when specialists attempt conflicting file access so that I can resolve contention.

**Acceptance Criteria:**
- [ ] Conflict emits `ctk_conflict` event
- [ ] Event includes both specialists and file path
- [ ] Conflict logged for analysis

---

### 2.4 Sortie Management

**US-010: Create sortie**

> As a coordinator, I want to create a sortie (work item) so that specialists can be assigned tasks.

**Acceptance Criteria:**
- [ ] Sortie created with unique ID
- [ ] Emits `sortie_created` event
- [ ] Sortie linked to parent mission if provided
- [ ] Returns sortie details with status "pending"

**API Contract (new):**
```http
POST /api/v1/sorties
Content-Type: application/json

{
  "title": "Implement user authentication",
  "description": "Add JWT-based auth to API",
  "mission_id": "mission_abc123",
  "assigned_to": "spec_backend",
  "priority": "high",
  "metadata": { "estimated_hours": 4 }
}

Response 201:
{
  "sortie": {
    "id": "sortie_xyz789",
    "title": "Implement user authentication",
    "status": "pending",
    "mission_id": "mission_abc123",
    "created_at": "2026-01-04T12:00:00.000Z"
  }
}
```

---

**US-011: Start sortie**

> As a specialist, I want to start working on a sortie so that the coordinator knows I'm actively engaged.

**Acceptance Criteria:**
- [ ] Status changes to "in_progress"
- [ ] Emits `sortie_started` event
- [ ] Records start timestamp
- [ ] Only assigned specialist can start

---

**US-012: Report sortie progress**

> As a specialist, I want to report progress on a sortie so that the coordinator can track completion.

**Acceptance Criteria:**
- [ ] Progress percentage updated (0-100)
- [ ] Emits `sortie_progress` event
- [ ] Optional status message included
- [ ] Progress history maintained

---

**US-013: Complete sortie**

> As a specialist, I want to mark a sortie complete so that the mission can proceed.

**Acceptance Criteria:**
- [ ] Status changes to "completed"
- [ ] Emits `sortie_completed` event
- [ ] Records completion timestamp and duration
- [ ] Optional result/artifact reference included

---

**US-014: Block sortie**

> As a specialist, I want to mark a sortie as blocked so that the coordinator can help resolve issues.

**Acceptance Criteria:**
- [ ] Status changes to "blocked"
- [ ] Emits `sortie_blocked` event
- [ ] Blocking reason required
- [ ] Optional blocker reference (another sortie/specialist)

---

### 2.5 Mission Management

**US-015: Create mission**

> As a coordinator, I want to create a mission (parent work item) so that related sorties are grouped.

**Acceptance Criteria:**
- [ ] Mission created with unique ID
- [ ] Emits `mission_created` event
- [ ] Mission can contain multiple sorties
- [ ] Returns mission details with status "pending"

---

**US-016: Start mission**

> As a coordinator, I want to start a mission so that specialists can begin work.

**Acceptance Criteria:**
- [ ] Status changes to "in_progress"
- [ ] Emits `mission_started` event
- [ ] All pending sorties become available for assignment

---

**US-017: Complete mission**

> As a coordinator, I want to complete a mission when all sorties are done.

**Acceptance Criteria:**
- [ ] Status changes to "completed"
- [ ] Emits `mission_completed` event
- [ ] All sorties must be completed or cancelled
- [ ] Records mission duration and statistics

---

### 2.6 Checkpointing

**US-018: Create checkpoint**

> As a specialist, I want to create a checkpoint so that my context can survive session boundaries.

**Acceptance Criteria:**
- [ ] Checkpoint created with current state snapshot
- [ ] Emits `checkpoint_created` event
- [ ] Checkpoint includes specialist context, active sorties, pending messages
- [ ] Returns checkpoint ID for later recovery

**API Contract (new):**
```http
POST /api/v1/checkpoints
Content-Type: application/json

{
  "specialist_id": "spec_abc123",
  "context": {
    "current_sortie": "sortie_xyz",
    "working_files": ["/src/auth.ts"],
    "notes": "Implementing JWT validation"
  },
  "ttl_hours": 24
}

Response 201:
{
  "checkpoint": {
    "id": "ckpt_abc123",
    "specialist_id": "spec_abc123",
    "created_at": "2026-01-04T12:00:00.000Z",
    "expires_at": "2026-01-05T12:00:00.000Z"
  }
}
```

---

**US-019: Recover from checkpoint**

> As a specialist, I want to recover from a checkpoint so that I can resume work after a session break.

**Acceptance Criteria:**
- [ ] Checkpoint loaded and context restored
- [ ] Emits `fleet_recovered` event
- [ ] Returns full checkpoint context
- [ ] Marks checkpoint as consumed (optional)

---

**US-020: Compact context**

> As a system, I want to compact old events so that storage remains efficient.

**Acceptance Criteria:**
- [ ] Events older than threshold compacted into snapshot
- [ ] Emits `context_compacted` event
- [ ] Original events archived (not deleted)
- [ ] Projections rebuilt from snapshot + recent events

---

### 2.7 Fleet Lifecycle

**US-021: Spawn specialist**

> As a coordinator, I want to spawn a new specialist so that work can be parallelized.

**Acceptance Criteria:**
- [ ] Specialist process initiated
- [ ] Emits `specialist_spawned` event
- [ ] Specialist registered in fleet
- [ ] Returns specialist ID and connection details

---

**US-022: Complete specialist work**

> As a specialist, I want to signal completion so that the coordinator knows I'm done.

**Acceptance Criteria:**
- [ ] Specialist marked as completed
- [ ] Emits `specialist_completed` event
- [ ] All locks released
- [ ] Final checkpoint created

---

**US-023: Start review**

> As a coordinator, I want to initiate a review so that completed work is validated.

**Acceptance Criteria:**
- [ ] Review created for completed sortie
- [ ] Emits `review_started` event
- [ ] Reviewer specialist assigned
- [ ] Returns review ID

---

**US-024: Complete review**

> As a reviewer, I want to complete a review so that work can be approved or rejected.

**Acceptance Criteria:**
- [ ] Review marked complete with verdict
- [ ] Emits `review_completed` event
- [ ] Sortie status updated based on verdict
- [ ] Feedback recorded for learning

---

---

## 3. Database Schema

### 3.1 Core Tables

```sql
-- FleetTools SQLite Event-Sourced Schema
-- Version: 2.0.0
-- Uses WAL mode for concurrent access

PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

-- ============================================================================
-- CORE EVENT LOG (Append-Only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
    -- Primary key: monotonically increasing sequence number
    sequence_number INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Event identity
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    
    -- Stream partitioning (for efficient queries)
    stream_type TEXT NOT NULL,  -- 'specialist', 'squawk', 'ctk', 'sortie', 'mission', 'checkpoint'
    stream_id TEXT NOT NULL,
    
    -- Event payload (JSON)
    data TEXT NOT NULL,
    
    -- Causation chain
    causation_id TEXT,          -- Event that caused this event
    correlation_id TEXT,        -- Root event in causation chain
    
    -- Metadata
    metadata TEXT,              -- JSON: source, version, etc.
    occurred_at TEXT NOT NULL,  -- ISO 8601 timestamp
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Schema version for migrations
    schema_version INTEGER NOT NULL DEFAULT 1
);

-- Indexes for event queries
CREATE INDEX IF NOT EXISTS idx_events_stream 
    ON events(stream_type, stream_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_events_type 
    ON events(event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_causation 
    ON events(causation_id) WHERE causation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_correlation 
    ON events(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_occurred 
    ON events(occurred_at);

-- ============================================================================
-- MATERIALIZED VIEWS (Projections)
-- ============================================================================

-- Specialists: Current state derived from events
CREATE TABLE IF NOT EXISTS specialists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',  -- 'active', 'inactive', 'completed'
    capabilities TEXT,          -- JSON array
    registered_at TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    metadata TEXT,              -- JSON
    
    -- Projection metadata
    last_event_sequence INTEGER NOT NULL,
    projected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_specialists_status 
    ON specialists(status);
CREATE INDEX IF NOT EXISTS idx_specialists_last_seen 
    ON specialists(last_seen);

-- Messages: Squawk mailbox messages
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    mailbox_id TEXT NOT NULL,   -- Target specialist/stream
    sender_id TEXT,             -- Source specialist
    thread_id TEXT,             -- Optional thread grouping
    
    message_type TEXT NOT NULL,
    content TEXT NOT NULL,      -- JSON payload
    
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'read', 'acked'
    priority TEXT DEFAULT 'normal',          -- 'low', 'normal', 'high', 'urgent'
    
    sent_at TEXT NOT NULL,
    read_at TEXT,
    acked_at TEXT,
    
    causation_id TEXT,
    metadata TEXT,
    
    -- Projection metadata
    last_event_sequence INTEGER NOT NULL,
    projected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_mailbox 
    ON messages(mailbox_id, status, sent_at);
CREATE INDEX IF NOT EXISTS idx_messages_thread 
    ON messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_sender 
    ON messages(sender_id) WHERE sender_id IS NOT NULL;

-- Locks: CTK file reservations
CREATE TABLE IF NOT EXISTS locks (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    normalized_path TEXT NOT NULL,  -- Absolute, normalized path
    
    reserved_by TEXT NOT NULL,      -- Specialist ID
    reserved_at TEXT NOT NULL,
    released_at TEXT,
    expires_at TEXT NOT NULL,
    
    purpose TEXT DEFAULT 'edit',    -- 'edit', 'read', 'delete'
    checksum TEXT,                  -- File hash at reservation time
    
    status TEXT NOT NULL DEFAULT 'active',  -- 'active', 'released', 'expired'
    
    metadata TEXT,
    
    -- Projection metadata
    last_event_sequence INTEGER NOT NULL,
    projected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_locks_file 
    ON locks(normalized_path, status);
CREATE INDEX IF NOT EXISTS idx_locks_specialist 
    ON locks(reserved_by, status);
CREATE INDEX IF NOT EXISTS idx_locks_expires 
    ON locks(expires_at) WHERE status = 'active';

-- Cursors: Stream position tracking
CREATE TABLE IF NOT EXISTS cursors (
    id TEXT PRIMARY KEY,
    stream_type TEXT NOT NULL,
    stream_id TEXT NOT NULL,
    
    position INTEGER NOT NULL,      -- Last processed sequence number
    
    consumer_id TEXT,               -- Who owns this cursor
    
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    
    metadata TEXT,
    
    UNIQUE(stream_type, stream_id, consumer_id)
);

CREATE INDEX IF NOT EXISTS idx_cursors_stream 
    ON cursors(stream_type, stream_id);

-- Sorties: Work items (child of missions)
CREATE TABLE IF NOT EXISTS sorties (
    id TEXT PRIMARY KEY,
    mission_id TEXT,                -- Parent mission (optional)
    
    title TEXT NOT NULL,
    description TEXT,
    
    status TEXT NOT NULL DEFAULT 'pending',  
    -- 'pending', 'assigned', 'in_progress', 'blocked', 'review', 'completed', 'cancelled'
    
    priority TEXT DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
    
    assigned_to TEXT,               -- Specialist ID
    
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    
    progress INTEGER DEFAULT 0,     -- 0-100
    
    blocked_by TEXT,                -- Sortie ID or external reference
    blocked_reason TEXT,
    
    result TEXT,                    -- JSON: outcome, artifacts, etc.
    metadata TEXT,
    
    -- Projection metadata
    last_event_sequence INTEGER NOT NULL,
    projected_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE INDEX IF NOT EXISTS idx_sorties_mission 
    ON sorties(mission_id) WHERE mission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sorties_status 
    ON sorties(status);
CREATE INDEX IF NOT EXISTS idx_sorties_assigned 
    ON sorties(assigned_to) WHERE assigned_to IS NOT NULL;

-- Missions: Parent work items
CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    
    title TEXT NOT NULL,
    description TEXT,
    
    status TEXT NOT NULL DEFAULT 'pending',
    -- 'pending', 'in_progress', 'review', 'completed', 'cancelled'
    
    priority TEXT DEFAULT 'medium',
    
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    
    -- Aggregated statistics
    total_sorties INTEGER DEFAULT 0,
    completed_sorties INTEGER DEFAULT 0,
    
    result TEXT,                    -- JSON: summary, artifacts
    metadata TEXT,
    
    -- Projection metadata
    last_event_sequence INTEGER NOT NULL,
    projected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_missions_status 
    ON missions(status);

-- Checkpoints: Context survival snapshots
CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    specialist_id TEXT NOT NULL,
    
    -- Snapshot data
    context TEXT NOT NULL,          -- JSON: full specialist context
    active_sorties TEXT,            -- JSON array of sortie IDs
    pending_messages TEXT,          -- JSON array of message IDs
    held_locks TEXT,                -- JSON array of lock IDs
    
    created_at TEXT NOT NULL,
    expires_at TEXT,
    consumed_at TEXT,               -- When checkpoint was used for recovery
    
    -- Event reference for replay
    last_event_sequence INTEGER NOT NULL,
    
    metadata TEXT,
    
    -- Projection metadata
    projected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_specialist 
    ON checkpoints(specialist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkpoints_expires 
    ON checkpoints(expires_at) WHERE consumed_at IS NULL;

-- ============================================================================
-- LEGACY COMPATIBILITY (Mailboxes view)
-- ============================================================================

-- Mailboxes: Virtual table for backward compatibility
CREATE TABLE IF NOT EXISTS mailboxes (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    
    -- Projection metadata
    last_event_sequence INTEGER NOT NULL DEFAULT 0,
    projected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mailboxes_updated 
    ON mailboxes(updated_at DESC);

-- ============================================================================
-- COMPACTION & ARCHIVAL
-- ============================================================================

-- Snapshots: Compacted state at a point in time
CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY,
    stream_type TEXT NOT NULL,
    stream_id TEXT NOT NULL,
    
    -- Snapshot data
    state TEXT NOT NULL,            -- JSON: full state at this point
    
    -- Event range this snapshot covers
    from_sequence INTEGER NOT NULL,
    to_sequence INTEGER NOT NULL,
    
    created_at TEXT NOT NULL,
    
    UNIQUE(stream_type, stream_id, to_sequence)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_stream 
    ON snapshots(stream_type, stream_id, to_sequence DESC);

-- ============================================================================
-- SCHEMA METADATA
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    checksum TEXT
);

-- Insert initial migration
INSERT OR IGNORE INTO schema_migrations (version, name) 
VALUES (1, 'initial_event_sourced_schema');
```

### 3.2 Indexes Strategy

| Index | Purpose | Query Pattern |
|-------|---------|---------------|
| `idx_events_stream` | Stream replay | `WHERE stream_type = ? AND stream_id = ? ORDER BY sequence_number` |
| `idx_events_type` | Event type queries | `WHERE event_type = ? AND occurred_at > ?` |
| `idx_events_causation` | Causation chain traversal | `WHERE causation_id = ?` |
| `idx_locks_file` | Lock conflict detection | `WHERE normalized_path = ? AND status = 'active'` |
| `idx_sorties_status` | Work queue queries | `WHERE status = 'pending' ORDER BY priority` |

### 3.3 WAL Configuration

```sql
-- Optimal WAL settings for FleetTools workload
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;      -- Durability with performance
PRAGMA wal_autocheckpoint = 1000; -- Checkpoint every 1000 pages
PRAGMA busy_timeout = 5000;       -- 5 second busy timeout
PRAGMA cache_size = -64000;       -- 64MB cache
```

---

## 4. Event Type Definitions

### 4.1 Event Envelope Schema

```typescript
import { z } from 'zod';

// Base event envelope - all events extend this
export const EventEnvelopeSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.string(),
  stream_type: z.enum([
    'specialist', 'squawk', 'ctk', 'sortie', 
    'mission', 'checkpoint', 'fleet', 'system'
  ]),
  stream_id: z.string(),
  data: z.record(z.unknown()),
  causation_id: z.string().uuid().optional(),
  correlation_id: z.string().uuid().optional(),
  metadata: z.object({
    source: z.string().optional(),
    version: z.string().optional(),
    user_agent: z.string().optional(),
  }).optional(),
  occurred_at: z.string().datetime(),
  schema_version: z.number().int().positive().default(1),
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
```

### 4.2 Specialist Events (2)

```typescript
// specialist_registered
export const SpecialistRegisteredSchema = z.object({
  specialist_id: z.string(),
  name: z.string(),
  capabilities: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// specialist_active (heartbeat)
export const SpecialistActiveSchema = z.object({
  specialist_id: z.string(),
  status: z.enum(['active', 'busy', 'idle']).default('active'),
  current_sortie: z.string().optional(),
  metrics: z.object({
    memory_mb: z.number().optional(),
    uptime_seconds: z.number().optional(),
  }).optional(),
});
```

### 4.3 Squawk Events (5)

```typescript
// squawk_sent
export const SquawkSentSchema = z.object({
  message_id: z.string().uuid(),
  mailbox_id: z.string(),
  sender_id: z.string().optional(),
  thread_id: z.string().optional(),
  message_type: z.string(),
  content: z.record(z.unknown()),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

// squawk_read
export const SquawkReadSchema = z.object({
  message_id: z.string().uuid(),
  mailbox_id: z.string(),
  reader_id: z.string(),
});

// squawk_acked
export const SquawkAckedSchema = z.object({
  message_id: z.string().uuid(),
  mailbox_id: z.string(),
  acker_id: z.string(),
  response: z.record(z.unknown()).optional(),
});

// squawk_thread_created
export const SquawkThreadCreatedSchema = z.object({
  thread_id: z.string().uuid(),
  title: z.string().optional(),
  participants: z.array(z.string()),
  initial_message_id: z.string().uuid().optional(),
});

// squawk_thread_activity
export const SquawkThreadActivitySchema = z.object({
  thread_id: z.string().uuid(),
  activity_type: z.enum(['message', 'join', 'leave', 'close']),
  actor_id: z.string(),
  message_id: z.string().uuid().optional(),
});
```

### 4.4 CTK Events (3)

```typescript
// ctk_reserved
export const CtkReservedSchema = z.object({
  lock_id: z.string().uuid(),
  file_path: z.string(),
  normalized_path: z.string(),
  specialist_id: z.string(),
  purpose: z.enum(['edit', 'read', 'delete']).default('edit'),
  timeout_ms: z.number().int().positive().default(30000),
  checksum: z.string().optional(),
});

// ctk_released
export const CtkReleasedSchema = z.object({
  lock_id: z.string().uuid(),
  file_path: z.string(),
  specialist_id: z.string(),
  release_reason: z.enum(['explicit', 'timeout', 'crash']).default('explicit'),
  final_checksum: z.string().optional(),
});

// ctk_conflict
export const CtkConflictSchema = z.object({
  file_path: z.string(),
  requesting_specialist: z.string(),
  holding_specialist: z.string(),
  existing_lock_id: z.string().uuid(),
  conflict_type: z.enum(['concurrent_edit', 'stale_lock', 'checksum_mismatch']),
});
```

### 4.5 Sortie Events (4)

```typescript
// sortie_started
export const SortieStartedSchema = z.object({
  sortie_id: z.string(),
  specialist_id: z.string(),
  started_at: z.string().datetime(),
});

// sortie_progress
export const SortieProgressSchema = z.object({
  sortie_id: z.string(),
  specialist_id: z.string(),
  progress: z.number().int().min(0).max(100),
  status_message: z.string().optional(),
  artifacts: z.array(z.string()).optional(),
});

// sortie_completed
export const SortieCompletedSchema = z.object({
  sortie_id: z.string(),
  specialist_id: z.string(),
  completed_at: z.string().datetime(),
  duration_ms: z.number().int().positive(),
  result: z.object({
    success: z.boolean(),
    summary: z.string().optional(),
    artifacts: z.array(z.string()).optional(),
    metrics: z.record(z.number()).optional(),
  }),
});

// sortie_blocked
export const SortieBlockedSchema = z.object({
  sortie_id: z.string(),
  specialist_id: z.string(),
  blocked_at: z.string().datetime(),
  reason: z.string(),
  blocker_type: z.enum(['sortie', 'specialist', 'external', 'resource']),
  blocker_id: z.string().optional(),
});
```

### 4.6 Checkpoint Events (4)

```typescript
// checkpoint_created
export const CheckpointCreatedSchema = z.object({
  checkpoint_id: z.string().uuid(),
  specialist_id: z.string(),
  context: z.record(z.unknown()),
  active_sorties: z.array(z.string()),
  pending_messages: z.array(z.string()),
  held_locks: z.array(z.string()),
  ttl_hours: z.number().positive().optional(),
});

// fleet_checkpointed (system-wide checkpoint)
export const FleetCheckpointedSchema = z.object({
  checkpoint_id: z.string().uuid(),
  trigger: z.enum(['scheduled', 'manual', 'shutdown']),
  specialist_count: z.number().int(),
  event_sequence: z.number().int(),
});

// fleet_recovered
export const FleetRecoveredSchema = z.object({
  checkpoint_id: z.string().uuid(),
  specialist_id: z.string(),
  recovered_at: z.string().datetime(),
  context_restored: z.boolean(),
  sorties_resumed: z.array(z.string()),
});

// context_compacted
export const ContextCompactedSchema = z.object({
  stream_type: z.string(),
  stream_id: z.string(),
  from_sequence: z.number().int(),
  to_sequence: z.number().int(),
  events_compacted: z.number().int(),
  snapshot_id: z.string().uuid(),
});
```

### 4.7 Fleet Lifecycle Events (6)

```typescript
// mission_started
export const MissionStartedSchema = z.object({
  mission_id: z.string(),
  started_at: z.string().datetime(),
  initial_sorties: z.array(z.string()),
});

// specialist_spawned
export const SpecialistSpawnedSchema = z.object({
  specialist_id: z.string(),
  name: z.string(),
  spawned_by: z.string(),  // Coordinator or parent specialist
  mission_id: z.string().optional(),
  sortie_id: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

// specialist_completed
export const SpecialistCompletedSchema = z.object({
  specialist_id: z.string(),
  completed_at: z.string().datetime(),
  reason: z.enum(['success', 'error', 'timeout', 'cancelled']),
  final_checkpoint_id: z.string().uuid().optional(),
  summary: z.string().optional(),
});

// review_started
export const ReviewStartedSchema = z.object({
  review_id: z.string().uuid(),
  sortie_id: z.string(),
  reviewer_id: z.string(),
  review_type: z.enum(['code', 'design', 'security', 'general']),
});

// review_completed
export const ReviewCompletedSchema = z.object({
  review_id: z.string().uuid(),
  sortie_id: z.string(),
  reviewer_id: z.string(),
  verdict: z.enum(['approved', 'rejected', 'needs_changes']),
  feedback: z.string().optional(),
  issues: z.array(z.object({
    severity: z.enum(['info', 'warning', 'error', 'critical']),
    message: z.string(),
    location: z.string().optional(),
  })).optional(),
});

// mission_completed
export const MissionCompletedSchema = z.object({
  mission_id: z.string(),
  completed_at: z.string().datetime(),
  duration_ms: z.number().int().positive(),
  result: z.object({
    success: z.boolean(),
    sorties_completed: z.number().int(),
    sorties_failed: z.number().int(),
    summary: z.string().optional(),
  }),
});
```

### 4.8 Sortie/Mission Creation Events (5)

```typescript
// sortie_created
export const SortieCreatedSchema = z.object({
  sortie_id: z.string(),
  mission_id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assigned_to: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// sortie_updated
export const SortieUpdatedSchema = z.object({
  sortie_id: z.string(),
  changes: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assigned_to: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

// sortie_status_changed
export const SortieStatusChangedSchema = z.object({
  sortie_id: z.string(),
  previous_status: z.string(),
  new_status: z.string(),
  changed_by: z.string(),
  reason: z.string().optional(),
});

// sortie_closed
export const SortieClosedSchema = z.object({
  sortie_id: z.string(),
  closed_at: z.string().datetime(),
  close_reason: z.enum(['completed', 'cancelled', 'duplicate', 'invalid']),
  closed_by: z.string(),
});

// mission_created
export const MissionCreatedSchema = z.object({
  mission_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  initial_sorties: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});
```

### 4.9 Compaction Events (3)

```typescript
// compaction_triggered
export const CompactionTriggeredSchema = z.object({
  trigger: z.enum(['threshold', 'scheduled', 'manual']),
  stream_type: z.string().optional(),
  stream_id: z.string().optional(),
  threshold_events: z.number().int().optional(),
  threshold_age_hours: z.number().optional(),
});

// fleet_detected
export const FleetDetectedSchema = z.object({
  project_path: z.string(),
  project_hash: z.string(),
  detected_at: z.string().datetime(),
  existing_data: z.boolean(),
  migration_required: z.boolean(),
});

// context_injected
export const ContextInjectedSchema = z.object({
  specialist_id: z.string(),
  injection_type: z.enum(['checkpoint', 'manual', 'migration']),
  context: z.record(z.unknown()),
  source: z.string().optional(),
});
```

### 4.10 Stub Events (21 - Minimal Implementation)

```typescript
// Learning Events (5)
export const LearningEventSchemas = {
  pattern_learned: z.object({ pattern_id: z.string(), source: z.string() }),
  pattern_applied: z.object({ pattern_id: z.string(), sortie_id: z.string() }),
  pattern_deprecated: z.object({ pattern_id: z.string(), reason: z.string() }),
  feedback_received: z.object({ sortie_id: z.string(), rating: z.number() }),
  skill_acquired: z.object({ skill_id: z.string(), specialist_id: z.string() }),
};

// Memory Events (4)
export const MemoryEventSchemas = {
  memory_stored: z.object({ key: z.string(), ttl_hours: z.number().optional() }),
  memory_retrieved: z.object({ key: z.string(), hit: z.boolean() }),
  memory_expired: z.object({ key: z.string() }),
  memory_invalidated: z.object({ key: z.string(), reason: z.string() }),
};

// History Events (3)
export const HistoryEventSchemas = {
  history_recorded: z.object({ action: z.string(), actor: z.string() }),
  history_queried: z.object({ query: z.string(), results: z.number() }),
  history_pruned: z.object({ before: z.string(), count: z.number() }),
};

// Skills Events (3)
export const SkillsEventSchemas = {
  skill_registered: z.object({ skill_id: z.string(), name: z.string() }),
  skill_invoked: z.object({ skill_id: z.string(), specialist_id: z.string() }),
  skill_result: z.object({ skill_id: z.string(), success: z.boolean() }),
};

// Dispatch Eval Events (3)
export const DispatchEvalSchemas = {
  dispatch_evaluated: z.object({ sortie_id: z.string(), candidates: z.array(z.string()) }),
  dispatch_assigned: z.object({ sortie_id: z.string(), specialist_id: z.string() }),
  dispatch_rejected: z.object({ sortie_id: z.string(), reason: z.string() }),
};

// Validation Events (3)
export const ValidationEventSchemas = {
  validation_started: z.object({ target_id: z.string(), validator: z.string() }),
  validation_passed: z.object({ target_id: z.string() }),
  validation_failed: z.object({ target_id: z.string(), errors: z.array(z.string()) }),
};
```

### 4.11 Event Type Registry

```typescript
// Complete event type enumeration
export const EventTypes = {
  // Specialist (2)
  SPECIALIST_REGISTERED: 'specialist_registered',
  SPECIALIST_ACTIVE: 'specialist_active',
  
  // Squawk (5)
  SQUAWK_SENT: 'squawk_sent',
  SQUAWK_READ: 'squawk_read',
  SQUAWK_ACKED: 'squawk_acked',
  SQUAWK_THREAD_CREATED: 'squawk_thread_created',
  SQUAWK_THREAD_ACTIVITY: 'squawk_thread_activity',
  
  // CTK (3)
  CTK_RESERVED: 'ctk_reserved',
  CTK_RELEASED: 'ctk_released',
  CTK_CONFLICT: 'ctk_conflict',
  
  // Sortie (4)
  SORTIE_STARTED: 'sortie_started',
  SORTIE_PROGRESS: 'sortie_progress',
  SORTIE_COMPLETED: 'sortie_completed',
  SORTIE_BLOCKED: 'sortie_blocked',
  
  // Checkpoint (4)
  CHECKPOINT_CREATED: 'checkpoint_created',
  FLEET_CHECKPOINTED: 'fleet_checkpointed',
  FLEET_RECOVERED: 'fleet_recovered',
  CONTEXT_COMPACTED: 'context_compacted',
  
  // Fleet Lifecycle (6)
  MISSION_STARTED: 'mission_started',
  SPECIALIST_SPAWNED: 'specialist_spawned',
  SPECIALIST_COMPLETED: 'specialist_completed',
  REVIEW_STARTED: 'review_started',
  REVIEW_COMPLETED: 'review_completed',
  MISSION_COMPLETED: 'mission_completed',
  
  // Sortie/Mission Creation (5)
  SORTIE_CREATED: 'sortie_created',
  SORTIE_UPDATED: 'sortie_updated',
  SORTIE_STATUS_CHANGED: 'sortie_status_changed',
  SORTIE_CLOSED: 'sortie_closed',
  MISSION_CREATED: 'mission_created',
  
  // Compaction (3)
  COMPACTION_TRIGGERED: 'compaction_triggered',
  FLEET_DETECTED: 'fleet_detected',
  CONTEXT_INJECTED: 'context_injected',
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];
```

---

## 5. Migration Strategy

### 5.1 Migration Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Migration Flow                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Detect existing JSON file                                   │
│     └── ~/.local/share/fleet/squawk.json                        │
│                                                                  │
│  2. Create project-specific database                            │
│     └── ~/.local/share/fleet/<hash>/squawk.db                   │
│                                                                  │
│  3. Initialize schema                                           │
│     └── Run CREATE TABLE statements                             │
│                                                                  │
│  4. Migrate data (if JSON exists)                               │
│     ├── Convert mailboxes → events + mailboxes projection       │
│     ├── Convert events → events table                           │
│     ├── Convert cursors → cursors table                         │
│     └── Convert locks → events + locks projection               │
│                                                                  │
│  5. Verify migration                                            │
│     └── Compare record counts, validate data integrity          │
│                                                                  │
│  6. Archive JSON file                                           │
│     └── Rename to squawk.json.migrated.<timestamp>              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Project Hash Calculation

```typescript
import { createHash } from 'crypto';
import { resolve } from 'path';

/**
 * Generate project-specific database path
 * Uses SHA256 of absolute project path, first 12 chars
 */
export function getProjectDatabasePath(projectPath: string): string {
  const absolutePath = resolve(projectPath);
  const hash = createHash('sha256')
    .update(absolutePath)
    .digest('hex')
    .substring(0, 12);
  
  const baseDir = process.env.FLEET_DATA_DIR 
    || `${process.env.HOME}/.local/share/fleet`;
  
  return `${baseDir}/${hash}/squawk.db`;
}

// Example:
// Project: /home/user/projects/myapp
// Hash: a1b2c3d4e5f6
// Path: ~/.local/share/fleet/a1b2c3d4e5f6/squawk.db
```

### 5.3 Migration Script

```typescript
// squawk/src/db/migrate.ts

import { Database } from 'bun:sqlite';
import { existsSync, readFileSync, renameSync, mkdirSync } from 'fs';
import { dirname } from 'path';

interface LegacyData {
  mailboxes: Record<string, LegacyMailbox>;
  events: Record<string, LegacyEvent[]>;
  cursors: Record<string, LegacyCursor>;
  locks: Record<string, LegacyLock>;
}

interface MigrationResult {
  success: boolean;
  mailboxes_migrated: number;
  events_migrated: number;
  cursors_migrated: number;
  locks_migrated: number;
  errors: string[];
}

export async function migrateFromJson(
  jsonPath: string,
  dbPath: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    mailboxes_migrated: 0,
    events_migrated: 0,
    cursors_migrated: 0,
    locks_migrated: 0,
    errors: [],
  };

  try {
    // 1. Check if JSON file exists
    if (!existsSync(jsonPath)) {
      result.success = true; // No migration needed
      return result;
    }

    // 2. Read legacy data
    const legacyData: LegacyData = JSON.parse(
      readFileSync(jsonPath, 'utf-8')
    );

    // 3. Ensure database directory exists
    mkdirSync(dirname(dbPath), { recursive: true });

    // 4. Initialize database
    const db = new Database(dbPath);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');

    // 5. Run schema creation
    db.exec(SCHEMA_SQL); // Full schema from section 3

    // 6. Begin transaction
    db.exec('BEGIN TRANSACTION');

    try {
      let sequenceNumber = 0;

      // 6a. Migrate mailboxes
      for (const [id, mailbox] of Object.entries(legacyData.mailboxes)) {
        // Create mailbox projection
        db.run(`
          INSERT INTO mailboxes (id, created_at, updated_at, last_event_sequence)
          VALUES (?, ?, ?, ?)
        `, [id, mailbox.created_at, mailbox.updated_at, 0]);
        
        result.mailboxes_migrated++;
      }

      // 6b. Migrate events
      for (const [mailboxId, events] of Object.entries(legacyData.events)) {
        for (const event of events) {
          sequenceNumber++;
          
          db.run(`
            INSERT INTO events (
              event_id, event_type, stream_type, stream_id,
              data, causation_id, metadata, occurred_at, schema_version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            event.id,
            event.type,
            'squawk',
            mailboxId,
            event.data,
            event.causation_id,
            event.metadata,
            event.occurred_at,
            1
          ]);

          // Also create message projection
          db.run(`
            INSERT INTO messages (
              id, mailbox_id, message_type, content, status,
              sent_at, causation_id, last_event_sequence
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            event.id,
            mailboxId,
            event.type,
            event.data,
            'pending',
            event.occurred_at,
            event.causation_id,
            sequenceNumber
          ]);

          result.events_migrated++;
        }
      }

      // 6c. Migrate cursors
      for (const [id, cursor] of Object.entries(legacyData.cursors)) {
        db.run(`
          INSERT INTO cursors (
            id, stream_type, stream_id, position,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          id,
          'squawk',
          cursor.stream_id,
          cursor.position,
          cursor.updated_at,
          cursor.updated_at
        ]);
        
        result.cursors_migrated++;
      }

      // 6d. Migrate locks
      for (const [id, lock] of Object.entries(legacyData.locks)) {
        sequenceNumber++;
        
        // Create CTK event
        const eventId = crypto.randomUUID();
        db.run(`
          INSERT INTO events (
            event_id, event_type, stream_type, stream_id,
            data, occurred_at, schema_version
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          eventId,
          lock.released_at ? 'ctk_released' : 'ctk_reserved',
          'ctk',
          lock.file,
          JSON.stringify({
            lock_id: id,
            file_path: lock.file,
            specialist_id: lock.reserved_by,
            purpose: lock.purpose,
            timeout_ms: lock.timeout_ms,
          }),
          lock.reserved_at,
          1
        ]);

        // Create lock projection
        const expiresAt = new Date(
          new Date(lock.reserved_at).getTime() + lock.timeout_ms
        ).toISOString();

        db.run(`
          INSERT INTO locks (
            id, file_path, normalized_path, reserved_by,
            reserved_at, released_at, expires_at, purpose,
            checksum, status, last_event_sequence
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          lock.file,
          lock.file, // TODO: normalize path
          lock.reserved_by,
          lock.reserved_at,
          lock.released_at,
          expiresAt,
          lock.purpose,
          lock.checksum,
          lock.released_at ? 'released' : 'active',
          sequenceNumber
        ]);

        result.locks_migrated++;
      }

      // 7. Commit transaction
      db.exec('COMMIT');

      // 8. Archive JSON file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      renameSync(jsonPath, `${jsonPath}.migrated.${timestamp}`);

      result.success = true;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    } finally {
      db.close();
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
  }

  return result;
}
```

### 5.4 Rollback Procedure

```typescript
export async function rollbackMigration(
  dbPath: string,
  archivedJsonPath: string
): Promise<void> {
  // 1. Delete SQLite database
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
    unlinkSync(`${dbPath}-wal`);
    unlinkSync(`${dbPath}-shm`);
  }

  // 2. Restore JSON file
  if (existsSync(archivedJsonPath)) {
    const originalPath = archivedJsonPath.replace(/\.migrated\.\d{4}-.*$/, '');
    renameSync(archivedJsonPath, originalPath);
  }
}
```

---

## 6. API Compatibility Requirements

### 6.1 Existing Endpoints (Must Preserve)

| Endpoint | Method | Current Behavior | Migration Notes |
|----------|--------|------------------|-----------------|
| `/api/v1/mailbox/append` | POST | Append events to mailbox | Add event to log, update projection |
| `/api/v1/mailbox/:streamId` | GET | Get mailbox contents | Query projection, include events |
| `/api/v1/cursor/advance` | POST | Update cursor position | Emit event, update projection |
| `/api/v1/cursor/:cursorId` | GET | Get cursor position | Query projection |
| `/api/v1/lock/acquire` | POST | Acquire file lock | Emit `ctk_reserved`, update projection |
| `/api/v1/lock/release` | POST | Release file lock | Emit `ctk_released`, update projection |
| `/api/v1/locks` | GET | List active locks | Query projection |
| `/api/v1/coordinator/status` | GET | Get coordinator status | Aggregate from projections |
| `/health` | GET | Health check | Add database status |

### 6.2 Response Format Compatibility

All existing response formats must be preserved. Example:

```typescript
// Current response format (must maintain)
interface MailboxAppendResponse {
  mailbox: {
    id: string;
    created_at: string;
    updated_at: string;
    events: Array<{
      id: string;
      mailbox_id: string;
      type: string;
      stream_id: string;
      data: string;  // JSON string
      occurred_at: string;
      causation_id: string | null;
      metadata: string | null;
    }>;
  };
  inserted: number;
}
```

### 6.3 New Endpoints (Phase 2)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/specialists` | GET | List all specialists |
| `/api/v1/specialists/register` | POST | Register specialist |
| `/api/v1/specialists/:id/heartbeat` | POST | Specialist heartbeat |
| `/api/v1/sorties` | GET/POST | List/create sorties |
| `/api/v1/sorties/:id` | GET/PATCH | Get/update sortie |
| `/api/v1/sorties/:id/start` | POST | Start sortie |
| `/api/v1/sorties/:id/progress` | POST | Report progress |
| `/api/v1/sorties/:id/complete` | POST | Complete sortie |
| `/api/v1/missions` | GET/POST | List/create missions |
| `/api/v1/missions/:id` | GET/PATCH | Get/update mission |
| `/api/v1/checkpoints` | POST | Create checkpoint |
| `/api/v1/checkpoints/:id/recover` | POST | Recover from checkpoint |
| `/api/v1/events` | GET | Query event log |
| `/api/v1/events/stream/:type/:id` | GET | Get stream events |

### 6.4 Database Operations Interface

```typescript
// squawk/src/db/index.ts - New interface

import { Database } from 'bun:sqlite';

export interface DatabaseOperations {
  // Event operations
  appendEvent(event: EventEnvelope): Promise<number>;
  getEvents(streamType: string, streamId: string, afterSequence?: number): Promise<Event[]>;
  getEventsByType(eventType: string, limit?: number): Promise<Event[]>;
  
  // Projection operations
  getSpecialist(id: string): Promise<Specialist | null>;
  upsertSpecialist(specialist: Specialist): Promise<void>;
  
  getMessage(id: string): Promise<Message | null>;
  getMailboxMessages(mailboxId: string): Promise<Message[]>;
  
  getLock(id: string): Promise<Lock | null>;
  getActiveLocks(): Promise<Lock[]>;
  getLockByFile(filePath: string): Promise<Lock | null>;
  
  getCursor(id: string): Promise<Cursor | null>;
  upsertCursor(cursor: Cursor): Promise<void>;
  
  getSortie(id: string): Promise<Sortie | null>;
  getSortiesByMission(missionId: string): Promise<Sortie[]>;
  
  getMission(id: string): Promise<Mission | null>;
  
  getCheckpoint(id: string): Promise<Checkpoint | null>;
  getLatestCheckpoint(specialistId: string): Promise<Checkpoint | null>;
  
  // Maintenance
  compact(beforeSequence: number): Promise<number>;
  vacuum(): Promise<void>;
  close(): void;
}

export function createDatabase(dbPath: string): DatabaseOperations;
```

---

## 7. Non-Functional Requirements

### 7.1 Performance Requirements

| Metric | Requirement | Measurement |
|--------|-------------|-------------|
| Event append latency | < 5ms p99 | Time from API call to WAL write |
| Event query latency | < 10ms p99 | Time to retrieve 100 events |
| Lock acquisition | < 2ms p99 | Time to check + acquire lock |
| Projection query | < 5ms p99 | Time to query materialized view |
| Database size | < 100MB per 1M events | Storage efficiency |
| Concurrent readers | 10+ | Simultaneous read connections |
| Write throughput | 1000 events/sec | Sustained write rate |

### 7.2 Durability Requirements

| Requirement | Implementation |
|-------------|----------------|
| Crash recovery | WAL mode with NORMAL synchronous |
| Data integrity | Foreign keys, CHECK constraints |
| Backup support | Online backup via `.backup` command |
| Point-in-time recovery | Event replay from any sequence number |
| Corruption detection | Page checksums (default in SQLite) |

### 7.3 Concurrency Requirements

| Scenario | Behavior |
|----------|----------|
| Multiple readers | Concurrent access via WAL |
| Single writer | Serialized writes with busy timeout |
| Lock contention | 5 second busy timeout, retry with backoff |
| Connection pooling | Not required (bun:sqlite is synchronous) |

### 7.4 Storage Requirements

```
Database location: ~/.local/share/fleet/<project-hash>/squawk.db
WAL file: ~/.local/share/fleet/<project-hash>/squawk.db-wal
SHM file: ~/.local/share/fleet/<project-hash>/squawk.db-shm

Estimated sizes:
- Empty database: ~50KB
- 10,000 events: ~2MB
- 100,000 events: ~20MB
- 1,000,000 events: ~200MB (before compaction)
```

### 7.5 Configuration

```yaml
# fleet.yaml additions
database:
  # Override default location
  path: null  # Uses ~/.local/share/fleet/<hash>/squawk.db
  
  # WAL settings
  wal_autocheckpoint: 1000
  busy_timeout_ms: 5000
  cache_size_mb: 64
  
  # Compaction settings
  compaction:
    enabled: true
    threshold_events: 10000
    threshold_age_hours: 168  # 7 days
    schedule: "0 3 * * *"     # 3 AM daily
  
  # Backup settings
  backup:
    enabled: false
    path: null
    schedule: "0 4 * * *"     # 4 AM daily
```

---

## 8. Success Criteria

### 8.1 Functional Criteria

- [ ] All existing API endpoints return identical responses
- [ ] All existing tests pass without modification
- [ ] Migration from JSON completes without data loss
- [ ] Events are append-only (no updates or deletes)
- [ ] Causation chains are correctly maintained
- [ ] Projections are consistent with event log
- [ ] Lock conflicts are correctly detected
- [ ] Checkpoints enable context recovery

### 8.2 Performance Criteria

- [ ] Event append < 5ms p99
- [ ] Projection query < 5ms p99
- [ ] No performance regression vs JSON (for < 10K events)
- [ ] Linear scaling to 1M events

### 8.3 Reliability Criteria

- [ ] Zero data loss on crash
- [ ] Successful recovery from WAL
- [ ] Correct behavior under concurrent access
- [ ] Graceful handling of disk full
- [ ] Automatic lock expiration works correctly

### 8.4 Migration Criteria

- [ ] Automatic detection of legacy JSON
- [ ] Lossless migration of all data types
- [ ] Rollback procedure documented and tested
- [ ] Migration completes in < 30 seconds for typical data

---

## 9. Files to Create/Modify

### 9.1 New Files

```
squawk/src/db/
├── sqlite.ts              # SQLite database wrapper
├── schema.ts              # Schema as TypeScript constant
├── migrate.ts             # JSON → SQLite migration
├── events.ts              # Event store operations
├── projections.ts         # Projection update logic
├── types.ts               # TypeScript interfaces
└── compaction.ts          # Event compaction logic

squawk/src/events/
├── schemas.ts             # Zod schemas for all events
├── types.ts               # Event type definitions
└── registry.ts            # Event type registry

server/api/src/
├── specialists/
│   └── routes.ts          # New specialist endpoints
├── sorties/
│   └── routes.ts          # New sortie endpoints
├── missions/
│   └── routes.ts          # New mission endpoints
├── checkpoints/
│   └── routes.ts          # New checkpoint endpoints
└── events/
    └── routes.ts          # Event query endpoints

tests/
├── unit/db/
│   ├── sqlite.test.ts     # SQLite wrapper tests
│   ├── events.test.ts     # Event store tests
│   └── projections.test.ts # Projection tests
├── integration/
│   └── migration.test.ts  # Migration tests
└── fixtures/
    └── legacy-squawk.json # Test fixture for migration
```

### 9.2 Modified Files

```
squawk/src/db/index.ts
  - Replace JSON operations with SQLite
  - Maintain same export interface
  - Add database initialization

squawk/package.json
  - Add zod dependency

server/api/src/index.ts
  - Register new route modules
  - Update health check with DB status

config/fleet.yaml
  - Add database configuration section

tests/helpers/test-db.ts
  - Add SQLite test utilities
  - In-memory database for tests
```

### 9.3 Deprecated Files (Keep for Rollback)

```
squawk/src/db/schema.sql
  - Superseded by schema.ts
  - Keep for reference

tests/fixtures/squawk-test.json
  - Keep for migration testing
```

---

## 10. Implementation Phases

### Phase 2.1: Core Infrastructure (Week 1)
- SQLite wrapper with WAL mode
- Event store with append-only semantics
- Basic projection updates
- Unit tests

### Phase 2.2: Migration (Week 1-2)
- JSON detection and migration
- Data validation
- Rollback procedure
- Integration tests

### Phase 2.3: API Compatibility (Week 2)
- Update existing endpoints
- Verify response format compatibility
- Performance benchmarks
- Regression tests

### Phase 2.4: New Features (Week 3)
- Specialist management endpoints
- Sortie/Mission endpoints
- Checkpoint endpoints
- Event query endpoints

### Phase 2.5: Production Readiness (Week 3-4)
- Compaction implementation
- Monitoring integration
- Documentation
- Load testing

---

## Appendix A: Event Sourcing Patterns

### A.1 Append Event Pattern

```typescript
async function appendEvent<T>(
  db: Database,
  streamType: string,
  streamId: string,
  eventType: string,
  data: T,
  causationId?: string
): Promise<number> {
  const eventId = crypto.randomUUID();
  const correlationId = causationId 
    ? await getCorrelationId(db, causationId)
    : eventId;

  const result = db.run(`
    INSERT INTO events (
      event_id, event_type, stream_type, stream_id,
      data, causation_id, correlation_id, occurred_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    eventId,
    eventType,
    streamType,
    streamId,
    JSON.stringify(data),
    causationId,
    correlationId,
    new Date().toISOString()
  ]);

  // Update projection
  await updateProjection(db, streamType, streamId, eventType, data, result.lastInsertRowid);

  return result.lastInsertRowid as number;
}
```

### A.2 Projection Update Pattern

```typescript
async function updateProjection(
  db: Database,
  streamType: string,
  streamId: string,
  eventType: string,
  data: unknown,
  sequenceNumber: number
): Promise<void> {
  switch (eventType) {
    case 'specialist_registered':
      await upsertSpecialist(db, data as SpecialistRegistered, sequenceNumber);
      break;
    case 'ctk_reserved':
      await insertLock(db, data as CtkReserved, sequenceNumber);
      break;
    case 'ctk_released':
      await releaseLock(db, data as CtkReleased, sequenceNumber);
      break;
    // ... other event types
  }
}
```

### A.3 Stream Replay Pattern

```typescript
async function replayStream<T>(
  db: Database,
  streamType: string,
  streamId: string,
  fromSequence: number = 0
): Promise<T> {
  const events = db.query(`
    SELECT * FROM events
    WHERE stream_type = ? AND stream_id = ? AND sequence_number > ?
    ORDER BY sequence_number ASC
  `).all(streamType, streamId, fromSequence);

  let state = getInitialState<T>(streamType);
  
  for (const event of events) {
    state = applyEvent(state, event);
  }

  return state;
}
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Event** | Immutable record of something that happened |
| **Stream** | Ordered sequence of events for an entity |
| **Projection** | Materialized view derived from events |
| **Causation ID** | Reference to the event that caused this event |
| **Correlation ID** | Reference to the root event in a causation chain |
| **Compaction** | Process of creating snapshots and archiving old events |
| **Checkpoint** | Snapshot of specialist context for recovery |
| **Sortie** | Child work item (formerly "cell" or "bead") |
| **Mission** | Parent work item containing sorties (formerly "epic") |
| **Specialist** | AI agent worker in the fleet |
| **Squawk** | Messaging system between specialists |
| **CTK** | Composite Tool Kit - file locking system |

---

**Confidence Level:** 0.92

**Assumptions:**
1. `bun:sqlite` provides synchronous API suitable for event sourcing
2. WAL mode provides sufficient concurrency for typical fleet sizes (< 20 specialists)
3. Event compaction can be deferred to Phase 3 if needed
4. Existing tests provide adequate coverage for regression detection

**Limitations:**
1. No distributed database support (single-node only)
2. No real-time event streaming (polling required)
3. Compaction requires application-level coordination
