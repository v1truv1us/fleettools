# FleetTools Shared Interfaces Specification

**Version:** 1.0.0  
**Status:** Ready for Implementation  
**Date:** 2026-01-04  
**Purpose:** Enable parallel Phase 2 and Phase 3 development

---

## 1. Overview

### 1.1 Interface-First Development

This document defines the shared TypeScript interfaces that enable Phase 2 (SQLite Persistence) and Phase 3 (Context Survival) to be developed in parallel. By agreeing on interfaces upfront:

- Phase 2 implements the real SQLite-backed operations
- Phase 3 uses mock implementations until Phase 2 is ready
- Both phases can be tested independently
- Integration is seamless when mocks are swapped for real implementations

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Interface-First Architecture                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                      ┌──────────────────┐                           │
│                      │  Shared Interfaces│                           │
│                      │  (This Document)  │                           │
│                      └────────┬─────────┘                           │
│                               │                                      │
│              ┌────────────────┼────────────────┐                    │
│              │                │                │                    │
│              ▼                ▼                ▼                    │
│       ┌──────────┐     ┌──────────┐     ┌──────────┐              │
│       │ Phase 2  │     │ Phase 3  │     │ Contract │              │
│       │  (Real)  │     │  (Mock)  │     │  Tests   │              │
│       └──────────┘     └──────────┘     └──────────┘              │
│                                                                      │
│       SQLite-backed     In-memory         Verify both               │
│       implementations   implementations   satisfy contracts         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Interface Location Map

| Interface | File Location | Phase 2 Impl | Phase 3 Mock |
|-----------|---------------|--------------|--------------|
| `DatabaseAdapter` | `squawk/src/db/types.ts` | `squawk/src/db/sqlite.ts` | `tests/helpers/mock-database.ts` |
| `MissionOps` | `squawk/src/db/types.ts` | `squawk/src/db/operations/mission.ts` | `tests/helpers/mock-database.ts` |
| `SortieOps` | `squawk/src/db/types.ts` | `squawk/src/db/operations/sortie.ts` | `tests/helpers/mock-database.ts` |
| `LockOps` | `squawk/src/db/types.ts` | `squawk/src/db/operations/lock.ts` | `tests/helpers/mock-database.ts` |
| `EventOps` | `squawk/src/db/types.ts` | `squawk/src/db/operations/event.ts` | `tests/helpers/mock-database.ts` |
| `CheckpointOps` | `squawk/src/db/types.ts` | `squawk/src/db/operations/checkpoint.ts` | `tests/helpers/mock-database.ts` |

---

## 2. Core Interfaces

### 2.1 DatabaseAdapter

The root interface for all database operations.

```typescript
// squawk/src/db/types.ts

/**
 * DatabaseAdapter - Root interface for all database operations
 * 
 * Implementations:
 * - SQLiteAdapter (Phase 2): Real SQLite-backed storage
 * - MockAdapter (Phase 3): In-memory mock for testing
 */
export interface DatabaseAdapter {
  /** Mission operations */
  missions: MissionOps;
  
  /** Sortie operations */
  sorties: SortieOps;
  
  /** Lock operations */
  locks: LockOps;
  
  /** Event operations */
  events: EventOps;
  
  /** Checkpoint operations */
  checkpoints: CheckpointOps;
  
  /** Specialist operations */
  specialists: SpecialistOps;
  
  /** Message operations */
  messages: MessageOps;
  
  /** Cursor operations */
  cursors: CursorOps;
  
  /**
   * Initialize the database connection and schema
   */
  initialize(): Promise<void>;
  
  /**
   * Close the database connection
   */
  close(): Promise<void>;
  
  /**
   * Check if database is connected and healthy
   */
  isHealthy(): Promise<boolean>;
  
  /**
   * Get database statistics
   */
  getStats(): Promise<DatabaseStats>;
  
  /**
   * Run database maintenance (vacuum, checkpoint WAL, etc.)
   */
  maintenance(): Promise<void>;
}

export interface DatabaseStats {
  /** Total events in the event log */
  total_events: number;
  
  /** Total missions */
  total_missions: number;
  
  /** Active missions (in_progress) */
  active_missions: number;
  
  /** Total sorties */
  total_sorties: number;
  
  /** Active locks */
  active_locks: number;
  
  /** Total checkpoints */
  total_checkpoints: number;
  
  /** Database file size in bytes */
  database_size_bytes: number;
  
  /** WAL file size in bytes */
  wal_size_bytes: number;
  
  /** Last vacuum timestamp */
  last_vacuum_at?: string;
}
```

---

### 2.2 MissionOps Interface

```typescript
/**
 * MissionOps - Operations for mission management
 */
export interface MissionOps {
  /**
   * Create a new mission
   */
  create(input: CreateMissionInput): Promise<Mission>;
  
  /**
   * Get mission by ID
   * @returns Mission or null if not found
   */
  getById(id: string): Promise<Mission | null>;
  
  /**
   * Start a mission (status: pending -> in_progress)
   * @throws Error if mission not found or not in pending status
   */
  start(id: string): Promise<Mission>;
  
  /**
   * Complete a mission (status: in_progress -> completed)
   * @throws Error if mission has incomplete sorties
   */
  complete(id: string): Promise<Mission>;
  
  /**
   * Cancel a mission (any status -> cancelled)
   */
  cancel(id: string, reason?: string): Promise<Mission>;
  
  /**
   * Update mission metadata
   */
  update(id: string, input: UpdateMissionInput): Promise<Mission>;
  
  /**
   * List missions with optional filtering
   */
  list(filter?: MissionFilter): Promise<Mission[]>;
  
  /**
   * Get mission statistics
   */
  getStats(id: string): Promise<MissionStats>;
}

export interface Mission {
  /** Unique identifier (format: msn-<uuid8>) */
  id: string;
  
  /** Mission title */
  title: string;
  
  /** Optional description */
  description?: string;
  
  /** Current status */
  status: MissionStatus;
  
  /** Priority level */
  priority: Priority;
  
  /** Creation timestamp (ISO 8601) */
  created_at: string;
  
  /** Start timestamp (ISO 8601) */
  started_at?: string;
  
  /** Completion timestamp (ISO 8601) */
  completed_at?: string;
  
  /** Total number of sorties */
  total_sorties: number;
  
  /** Number of completed sorties */
  completed_sorties: number;
  
  /** Optional result/summary */
  result?: MissionResult;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export type MissionStatus = 
  | 'pending'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'cancelled';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface CreateMissionInput {
  title: string;
  description?: string;
  priority?: Priority;
  metadata?: Record<string, unknown>;
}

export interface UpdateMissionInput {
  title?: string;
  description?: string;
  priority?: Priority;
  metadata?: Record<string, unknown>;
}

export interface MissionFilter {
  status?: MissionStatus | MissionStatus[];
  priority?: Priority | Priority[];
  created_after?: string;
  created_before?: string;
  limit?: number;
  offset?: number;
}

export interface MissionStats {
  total_sorties: number;
  completed_sorties: number;
  failed_sorties: number;
  blocked_sorties: number;
  in_progress_sorties: number;
  pending_sorties: number;
  duration_ms?: number;
  average_sortie_duration_ms?: number;
}

export interface MissionResult {
  success: boolean;
  summary?: string;
  artifacts?: string[];
  metrics?: Record<string, number>;
}
```

---

### 2.3 SortieOps Interface

```typescript
/**
 * SortieOps - Operations for sortie (work item) management
 */
export interface SortieOps {
  /**
   * Create a new sortie
   */
  create(input: CreateSortieInput): Promise<Sortie>;
  
  /**
   * Get sortie by ID
   */
  getById(id: string): Promise<Sortie | null>;
  
  /**
   * Start a sortie (status: pending/assigned -> in_progress)
   * @param id Sortie ID
   * @param specialistId ID of specialist starting the sortie
   * @throws Error if specialist is not assigned
   */
  start(id: string, specialistId: string): Promise<Sortie>;
  
  /**
   * Report progress on a sortie
   * @param id Sortie ID
   * @param percent Progress percentage (0-100)
   * @param notes Optional progress notes
   */
  progress(id: string, percent: number, notes?: string): Promise<Sortie>;
  
  /**
   * Complete a sortie
   * @param id Sortie ID
   * @param result Optional result data
   */
  complete(id: string, result?: SortieResult): Promise<Sortie>;
  
  /**
   * Block a sortie
   * @param id Sortie ID
   * @param reason Blocking reason
   * @param blockerId Optional ID of blocking entity
   */
  block(id: string, reason: string, blockerId?: string): Promise<Sortie>;
  
  /**
   * Unblock a sortie
   */
  unblock(id: string): Promise<Sortie>;
  
  /**
   * Assign sortie to a specialist
   */
  assign(id: string, specialistId: string): Promise<Sortie>;
  
  /**
   * Update sortie metadata
   */
  update(id: string, input: UpdateSortieInput): Promise<Sortie>;
  
  /**
   * List sorties by mission
   */
  getByMission(missionId: string): Promise<Sortie[]>;
  
  /**
   * List sorties with optional filtering
   */
  list(filter?: SortieFilter): Promise<Sortie[]>;
  
  /**
   * Restore sortie to a previous state (for recovery)
   */
  restore(id: string, snapshot: SortieSnapshot): Promise<Sortie>;
}

export interface Sortie {
  /** Unique identifier (format: srt-<uuid8>) */
  id: string;
  
  /** Parent mission ID (optional) */
  mission_id?: string;
  
  /** Sortie title */
  title: string;
  
  /** Optional description */
  description?: string;
  
  /** Current status */
  status: SortieStatus;
  
  /** Priority level */
  priority: Priority;
  
  /** Assigned specialist ID */
  assigned_to?: string;
  
  /** Creation timestamp (ISO 8601) */
  created_at: string;
  
  /** Start timestamp (ISO 8601) */
  started_at?: string;
  
  /** Completion timestamp (ISO 8601) */
  completed_at?: string;
  
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Latest progress notes */
  progress_notes?: string;
  
  /** Blocking sortie/entity ID */
  blocked_by?: string;
  
  /** Blocking reason */
  blocked_reason?: string;
  
  /** Files being worked on */
  files?: string[];
  
  /** Result data */
  result?: SortieResult;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export type SortieStatus = 
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'blocked'
  | 'review'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface CreateSortieInput {
  title: string;
  description?: string;
  mission_id?: string;
  priority?: Priority;
  assigned_to?: string;
  files?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateSortieInput {
  title?: string;
  description?: string;
  priority?: Priority;
  assigned_to?: string;
  files?: string[];
  metadata?: Record<string, unknown>;
}

export interface SortieFilter {
  mission_id?: string;
  status?: SortieStatus | SortieStatus[];
  assigned_to?: string;
  priority?: Priority | Priority[];
  limit?: number;
  offset?: number;
}

export interface SortieResult {
  success: boolean;
  summary?: string;
  artifacts?: string[];
  metrics?: Record<string, number>;
  errors?: string[];
}

export interface SortieSnapshot {
  id: string;
  status: SortieStatus;
  assigned_to?: string;
  files?: string[];
  started_at?: string;
  progress?: number;
  progress_notes?: string;
}
```

---

### 2.4 LockOps Interface

```typescript
/**
 * LockOps - Operations for file lock management (CTK)
 */
export interface LockOps {
  /**
   * Acquire a lock on a file
   * @returns Lock if acquired, or conflict info if already locked
   */
  acquire(input: AcquireLockInput): Promise<LockResult>;
  
  /**
   * Release a lock
   * @param id Lock ID
   * @param specialistId ID of specialist releasing (must be owner)
   * @throws Error if specialist is not the lock owner
   */
  release(id: string, specialistId: string): Promise<Lock>;
  
  /**
   * Force release a lock (admin operation)
   * @param id Lock ID
   * @param reason Reason for force release
   */
  forceRelease(id: string, reason: string): Promise<Lock>;
  
  /**
   * Get lock by ID
   */
  getById(id: string): Promise<Lock | null>;
  
  /**
   * Get lock by file path
   */
  getByFile(filePath: string): Promise<Lock | null>;
  
  /**
   * Get all active (non-expired, non-released) locks
   */
  getActive(): Promise<Lock[]>;
  
  /**
   * Get locks held by a specialist
   */
  getBySpecialist(specialistId: string): Promise<Lock[]>;
  
  /**
   * Get expired locks
   */
  getExpired(): Promise<Lock[]>;
  
  /**
   * Release all expired locks
   * @returns Number of locks released
   */
  releaseExpired(): Promise<number>;
  
  /**
   * Extend lock timeout
   */
  extend(id: string, additionalMs: number): Promise<Lock>;
  
  /**
   * Check if a file is locked
   */
  isLocked(filePath: string): Promise<boolean>;
  
  /**
   * Re-acquire locks from a checkpoint (for recovery)
   * @returns Array of results (success or conflict for each)
   */
  reacquire(locks: LockSnapshot[]): Promise<LockReacquireResult[]>;
}

export interface Lock {
  /** Unique identifier (format: lock-<uuid8>) */
  id: string;
  
  /** File path (as provided) */
  file: string;
  
  /** Normalized absolute file path */
  normalized_path: string;
  
  /** Specialist ID holding the lock */
  reserved_by: string;
  
  /** Lock acquisition timestamp (ISO 8601) */
  reserved_at: string;
  
  /** Lock release timestamp (ISO 8601) */
  released_at?: string;
  
  /** Lock expiration timestamp (ISO 8601) */
  expires_at: string;
  
  /** Lock purpose */
  purpose: LockPurpose;
  
  /** File checksum at lock time */
  checksum?: string;
  
  /** Lock status */
  status: LockStatus;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export type LockPurpose = 'edit' | 'read' | 'delete';

export type LockStatus = 'active' | 'released' | 'expired' | 'force_released';

export interface AcquireLockInput {
  /** File path to lock */
  file: string;
  
  /** Specialist ID acquiring the lock */
  specialist_id: string;
  
  /** Lock timeout in milliseconds */
  timeout_ms: number;
  
  /** Lock purpose (default: 'edit') */
  purpose?: LockPurpose;
  
  /** File checksum for conflict detection */
  checksum?: string;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export interface LockResult {
  /** Whether there was a conflict */
  conflict: boolean;
  
  /** The acquired lock (if no conflict) */
  lock?: Lock;
  
  /** The existing lock (if conflict) */
  existing_lock?: Lock;
}

export interface LockSnapshot {
  id: string;
  file: string;
  held_by: string;
  acquired_at: string;
  purpose: string;
  timeout_ms: number;
}

export interface LockReacquireResult {
  original_lock_id: string;
  success: boolean;
  new_lock?: Lock;
  conflict?: Lock;
  error?: string;
}
```

---

### 2.5 EventOps Interface

```typescript
/**
 * EventOps - Operations for the append-only event log
 */
export interface EventOps {
  /**
   * Append an event to the log
   * @returns The appended event with sequence number
   */
  append(input: AppendEventInput): Promise<Event>;
  
  /**
   * Append multiple events atomically
   */
  appendBatch(inputs: AppendEventInput[]): Promise<Event[]>;
  
  /**
   * Get event by ID
   */
  getById(eventId: string): Promise<Event | null>;
  
  /**
   * Get events by stream
   * @param streamType Stream type (e.g., 'mission', 'sortie', 'ctk')
   * @param streamId Stream identifier
   * @param afterSequence Only return events after this sequence number
   */
  getByStream(
    streamType: StreamType,
    streamId: string,
    afterSequence?: number
  ): Promise<Event[]>;
  
  /**
   * Get events by type
   */
  getByType(
    eventType: string,
    options?: EventQueryOptions
  ): Promise<Event[]>;
  
  /**
   * Get events by causation chain
   */
  getByCausation(causationId: string): Promise<Event[]>;
  
  /**
   * Get events by correlation
   */
  getByCorrelation(correlationId: string): Promise<Event[]>;
  
  /**
   * Get the latest sequence number
   */
  getLatestSequence(): Promise<number>;
  
  /**
   * Get events after a sequence number (for replay)
   */
  getAfterSequence(sequence: number, limit?: number): Promise<Event[]>;
  
  /**
   * Count events matching criteria
   */
  count(filter?: EventFilter): Promise<number>;
}

export interface Event {
  /** Monotonically increasing sequence number */
  sequence_number: number;
  
  /** Unique event identifier (UUID) */
  event_id: string;
  
  /** Event type (e.g., 'mission_created', 'sortie_started') */
  event_type: string;
  
  /** Stream type for partitioning */
  stream_type: StreamType;
  
  /** Stream identifier */
  stream_id: string;
  
  /** Event payload (JSON) */
  data: Record<string, unknown>;
  
  /** ID of event that caused this event */
  causation_id?: string;
  
  /** Root event ID in causation chain */
  correlation_id?: string;
  
  /** Event metadata */
  metadata?: EventMetadata;
  
  /** When the event occurred (ISO 8601) */
  occurred_at: string;
  
  /** When the event was recorded (ISO 8601) */
  recorded_at: string;
  
  /** Schema version for migrations */
  schema_version: number;
}

export type StreamType = 
  | 'specialist'
  | 'squawk'
  | 'ctk'
  | 'sortie'
  | 'mission'
  | 'checkpoint'
  | 'fleet'
  | 'system';

export interface AppendEventInput {
  event_type: string;
  stream_type: StreamType;
  stream_id: string;
  data: Record<string, unknown>;
  causation_id?: string;
  correlation_id?: string;
  metadata?: EventMetadata;
  occurred_at?: string;
}

export interface EventMetadata {
  source?: string;
  version?: string;
  user_agent?: string;
  [key: string]: unknown;
}

export interface EventQueryOptions {
  after?: string;  // ISO 8601 timestamp
  before?: string; // ISO 8601 timestamp
  limit?: number;
  offset?: number;
}

export interface EventFilter {
  event_type?: string | string[];
  stream_type?: StreamType | StreamType[];
  stream_id?: string;
  after_sequence?: number;
  before_sequence?: number;
  after?: string;
  before?: string;
}
```

---

### 2.6 CheckpointOps Interface

```typescript
/**
 * CheckpointOps - Operations for checkpoint management (Phase 3)
 */
export interface CheckpointOps {
  /**
   * Create a new checkpoint
   */
  create(input: CreateCheckpointInput): Promise<Checkpoint>;
  
  /**
   * Get checkpoint by ID
   */
  getById(id: string): Promise<Checkpoint | null>;
  
  /**
   * Get the latest checkpoint for a mission
   */
  getLatest(missionId: string): Promise<Checkpoint | null>;
  
  /**
   * List checkpoints for a mission
   */
  listByMission(missionId: string, limit?: number): Promise<Checkpoint[]>;
  
  /**
   * Delete a checkpoint
   */
  delete(id: string): Promise<void>;
  
  /**
   * Delete checkpoints matching criteria
   * @returns Number of checkpoints deleted
   */
  deleteMany(filter: CheckpointDeleteFilter): Promise<number>;
  
  /**
   * Mark checkpoint as consumed (used for recovery)
   */
  markConsumed(id: string): Promise<Checkpoint>;
  
  /**
   * Get checkpoints eligible for pruning
   */
  getPrunable(options: PruneOptions): Promise<Checkpoint[]>;
}

export interface Checkpoint {
  /** Unique identifier (format: chk-<uuid8>) */
  id: string;
  
  /** Parent mission ID */
  mission_id: string;
  
  /** Checkpoint creation timestamp (ISO 8601) */
  timestamp: string;
  
  /** What triggered the checkpoint */
  trigger: CheckpointTrigger;
  
  /** Additional trigger context */
  trigger_details?: string;
  
  /** Mission progress at checkpoint time (0-100) */
  progress_percent: number;
  
  /** Snapshot of all sorties */
  sorties: SortieSnapshot[];
  
  /** Snapshot of all active locks */
  active_locks: LockSnapshot[];
  
  /** Snapshot of pending messages */
  pending_messages: MessageSnapshot[];
  
  /** Recovery context for LLM */
  recovery_context: RecoveryContext;
  
  /** Agent that created the checkpoint */
  created_by: string;
  
  /** Checkpoint expiration (ISO 8601) */
  expires_at?: string;
  
  /** When checkpoint was used for recovery (ISO 8601) */
  consumed_at?: string;
  
  /** Schema version */
  version: string;
}

export type CheckpointTrigger = 
  | 'progress'    // Milestone reached (25/50/75%)
  | 'error'       // Exception or failure
  | 'manual'      // User-triggered
  | 'compaction'; // Pre-compaction (if detectable)

export interface CreateCheckpointInput {
  mission_id: string;
  trigger: CheckpointTrigger;
  trigger_details?: string;
  created_by: string;
  progress_percent?: number;
  ttl_hours?: number;
}

export interface CheckpointDeleteFilter {
  mission_id?: string;
  older_than?: string;  // ISO 8601 timestamp
  trigger?: CheckpointTrigger;
  consumed?: boolean;
}

export interface PruneOptions {
  older_than_days: number;
  keep_per_mission: number;
  include_completed_missions?: boolean;
}

export interface RecoveryContext {
  /** What was happening when checkpoint was created */
  last_action: string;
  
  /** Recommended next steps */
  next_steps: string[];
  
  /** Current blockers */
  blockers: string[];
  
  /** Files modified in this session */
  files_modified: string[];
  
  /** Mission-level summary */
  mission_summary: string;
  
  /** Time since mission start (ms) */
  elapsed_time_ms: number;
  
  /** Last activity timestamp (ISO 8601) */
  last_activity_at: string;
}

export interface MessageSnapshot {
  id: string;
  from: string;
  to: string[];
  subject: string;
  sent_at: string;
  delivered: boolean;
}
```

---

### 2.7 SpecialistOps Interface

```typescript
/**
 * SpecialistOps - Operations for specialist (agent) management
 */
export interface SpecialistOps {
  /**
   * Register a new specialist
   */
  register(input: RegisterSpecialistInput): Promise<Specialist>;
  
  /**
   * Get specialist by ID
   */
  getById(id: string): Promise<Specialist | null>;
  
  /**
   * Update specialist heartbeat
   */
  heartbeat(id: string, status?: SpecialistStatus): Promise<Specialist>;
  
  /**
   * Mark specialist as completed
   */
  complete(id: string, reason?: string): Promise<Specialist>;
  
  /**
   * List all specialists
   */
  list(filter?: SpecialistFilter): Promise<Specialist[]>;
  
  /**
   * Get active specialists (heartbeat within threshold)
   */
  getActive(thresholdMs?: number): Promise<Specialist[]>;
  
  /**
   * Get stale specialists (no heartbeat within threshold)
   */
  getStale(thresholdMs?: number): Promise<Specialist[]>;
}

export interface Specialist {
  /** Unique identifier */
  id: string;
  
  /** Specialist name/type */
  name: string;
  
  /** Current status */
  status: SpecialistStatus;
  
  /** Capabilities */
  capabilities?: string[];
  
  /** Registration timestamp (ISO 8601) */
  registered_at: string;
  
  /** Last heartbeat timestamp (ISO 8601) */
  last_seen: string;
  
  /** Current sortie being worked on */
  current_sortie?: string;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export type SpecialistStatus = 
  | 'active'
  | 'busy'
  | 'idle'
  | 'inactive'
  | 'completed';

export interface RegisterSpecialistInput {
  id?: string;
  name: string;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

export interface SpecialistFilter {
  status?: SpecialistStatus | SpecialistStatus[];
  name?: string;
  capability?: string;
}
```

---

### 2.8 MessageOps Interface

```typescript
/**
 * MessageOps - Operations for squawk mailbox messages
 */
export interface MessageOps {
  /**
   * Send a message to a mailbox
   */
  send(input: SendMessageInput): Promise<Message>;
  
  /**
   * Get message by ID
   */
  getById(id: string): Promise<Message | null>;
  
  /**
   * Get messages in a mailbox
   */
  getByMailbox(mailboxId: string, options?: MessageQueryOptions): Promise<Message[]>;
  
  /**
   * Mark message as read
   */
  markRead(id: string, readerId: string): Promise<Message>;
  
  /**
   * Acknowledge message
   */
  acknowledge(id: string, ackerId: string, response?: Record<string, unknown>): Promise<Message>;
  
  /**
   * Get pending (unread) messages for a mailbox
   */
  getPending(mailboxId: string): Promise<Message[]>;
  
  /**
   * Requeue a message (for recovery)
   */
  requeue(id: string): Promise<Message>;
}

export interface Message {
  /** Unique identifier */
  id: string;
  
  /** Target mailbox ID */
  mailbox_id: string;
  
  /** Sender ID */
  sender_id?: string;
  
  /** Thread ID for grouping */
  thread_id?: string;
  
  /** Message type */
  message_type: string;
  
  /** Message content (JSON) */
  content: Record<string, unknown>;
  
  /** Message status */
  status: MessageStatus;
  
  /** Priority */
  priority: MessagePriority;
  
  /** Sent timestamp (ISO 8601) */
  sent_at: string;
  
  /** Read timestamp (ISO 8601) */
  read_at?: string;
  
  /** Acknowledged timestamp (ISO 8601) */
  acked_at?: string;
  
  /** Causation ID */
  causation_id?: string;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export type MessageStatus = 'pending' | 'read' | 'acked';

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface SendMessageInput {
  mailbox_id: string;
  sender_id?: string;
  thread_id?: string;
  message_type: string;
  content: Record<string, unknown>;
  priority?: MessagePriority;
  causation_id?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageQueryOptions {
  status?: MessageStatus;
  after?: string;
  limit?: number;
}
```

---

### 2.9 CursorOps Interface

```typescript
/**
 * CursorOps - Operations for stream cursor management
 */
export interface CursorOps {
  /**
   * Get or create a cursor for a stream
   */
  getOrCreate(streamType: StreamType, streamId: string, consumerId?: string): Promise<Cursor>;
  
  /**
   * Get cursor by ID
   */
  getById(id: string): Promise<Cursor | null>;
  
  /**
   * Advance cursor position
   */
  advance(id: string, position: number): Promise<Cursor>;
  
  /**
   * Reset cursor to beginning
   */
  reset(id: string): Promise<Cursor>;
  
  /**
   * Delete cursor
   */
  delete(id: string): Promise<void>;
}

export interface Cursor {
  /** Unique identifier */
  id: string;
  
  /** Stream type */
  stream_type: StreamType;
  
  /** Stream identifier */
  stream_id: string;
  
  /** Current position (last processed sequence number) */
  position: number;
  
  /** Consumer ID (who owns this cursor) */
  consumer_id?: string;
  
  /** Creation timestamp (ISO 8601) */
  created_at: string;
  
  /** Last update timestamp (ISO 8601) */
  updated_at: string;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}
```

---

## 3. Contract Test Requirements

### 3.1 Contract Test Structure

Every interface implementation (real or mock) must pass the same contract tests:

```typescript
// tests/helpers/contract-tests.ts

import { describe, it, expect, beforeEach } from 'bun:test';

/**
 * Contract test suite for MissionOps
 * Both SQLite and Mock implementations must pass these tests
 */
export function testMissionOpsContract(
  createOps: () => MissionOps,
  cleanup?: () => Promise<void>
): void {
  describe('MissionOps Contract', () => {
    let ops: MissionOps;

    beforeEach(async () => {
      ops = createOps();
      if (cleanup) await cleanup();
    });

    describe('create()', () => {
      it('returns Mission with required fields', async () => {
        const mission = await ops.create({ title: 'Test Mission' });
        
        expect(mission.id).toMatch(/^msn-[a-z0-9]+$/);
        expect(mission.title).toBe('Test Mission');
        expect(mission.status).toBe('pending');
        expect(mission.priority).toBe('medium');
        expect(mission.created_at).toBeDefined();
        expect(mission.total_sorties).toBe(0);
        expect(mission.completed_sorties).toBe(0);
      });

      it('accepts optional fields', async () => {
        const mission = await ops.create({
          title: 'Test',
          description: 'Description',
          priority: 'high',
          metadata: { key: 'value' }
        });
        
        expect(mission.description).toBe('Description');
        expect(mission.priority).toBe('high');
        expect(mission.metadata).toEqual({ key: 'value' });
      });

      it('generates unique IDs', async () => {
        const m1 = await ops.create({ title: 'Mission 1' });
        const m2 = await ops.create({ title: 'Mission 2' });
        
        expect(m1.id).not.toBe(m2.id);
      });
    });

    describe('getById()', () => {
      it('returns Mission when exists', async () => {
        const created = await ops.create({ title: 'Test' });
        const retrieved = await ops.getById(created.id);
        
        expect(retrieved).not.toBeNull();
        expect(retrieved!.id).toBe(created.id);
      });

      it('returns null when not exists', async () => {
        const result = await ops.getById('msn-nonexistent');
        expect(result).toBeNull();
      });
    });

    describe('start()', () => {
      it('changes status to in_progress', async () => {
        const mission = await ops.create({ title: 'Test' });
        const started = await ops.start(mission.id);
        
        expect(started.status).toBe('in_progress');
        expect(started.started_at).toBeDefined();
      });

      it('throws for non-existent mission', async () => {
        await expect(ops.start('msn-nonexistent'))
          .rejects.toThrow();
      });

      it('throws for already started mission', async () => {
        const mission = await ops.create({ title: 'Test' });
        await ops.start(mission.id);
        
        await expect(ops.start(mission.id))
          .rejects.toThrow();
      });
    });

    describe('complete()', () => {
      it('changes status to completed', async () => {
        const mission = await ops.create({ title: 'Test' });
        await ops.start(mission.id);
        const completed = await ops.complete(mission.id);
        
        expect(completed.status).toBe('completed');
        expect(completed.completed_at).toBeDefined();
      });
    });

    describe('list()', () => {
      it('returns all missions', async () => {
        await ops.create({ title: 'Mission 1' });
        await ops.create({ title: 'Mission 2' });
        
        const missions = await ops.list();
        expect(missions.length).toBeGreaterThanOrEqual(2);
      });

      it('filters by status', async () => {
        const m1 = await ops.create({ title: 'Mission 1' });
        await ops.create({ title: 'Mission 2' });
        await ops.start(m1.id);
        
        const inProgress = await ops.list({ status: 'in_progress' });
        expect(inProgress.every(m => m.status === 'in_progress')).toBe(true);
      });
    });
  });
}

/**
 * Contract test suite for SortieOps
 */
export function testSortieOpsContract(
  createOps: () => SortieOps,
  cleanup?: () => Promise<void>
): void {
  describe('SortieOps Contract', () => {
    let ops: SortieOps;

    beforeEach(async () => {
      ops = createOps();
      if (cleanup) await cleanup();
    });

    describe('create()', () => {
      it('returns Sortie with required fields', async () => {
        const sortie = await ops.create({ title: 'Test Sortie' });
        
        expect(sortie.id).toMatch(/^srt-[a-z0-9]+$/);
        expect(sortie.title).toBe('Test Sortie');
        expect(sortie.status).toBe('pending');
        expect(sortie.progress).toBe(0);
      });
    });

    describe('progress()', () => {
      it('updates progress percentage', async () => {
        const sortie = await ops.create({ title: 'Test' });
        const updated = await ops.progress(sortie.id, 50, 'Halfway');
        
        expect(updated.progress).toBe(50);
        expect(updated.progress_notes).toBe('Halfway');
      });

      it('rejects progress < 0', async () => {
        const sortie = await ops.create({ title: 'Test' });
        
        await expect(ops.progress(sortie.id, -1))
          .rejects.toThrow();
      });

      it('rejects progress > 100', async () => {
        const sortie = await ops.create({ title: 'Test' });
        
        await expect(ops.progress(sortie.id, 101))
          .rejects.toThrow();
      });
    });
  });
}

/**
 * Contract test suite for LockOps
 */
export function testLockOpsContract(
  createOps: () => LockOps,
  cleanup?: () => Promise<void>
): void {
  describe('LockOps Contract', () => {
    let ops: LockOps;

    beforeEach(async () => {
      ops = createOps();
      if (cleanup) await cleanup();
    });

    describe('acquire()', () => {
      it('returns Lock when file is available', async () => {
        const result = await ops.acquire({
          file: '/test/file.ts',
          specialist_id: 'spec-1',
          timeout_ms: 30000
        });
        
        expect(result.conflict).toBe(false);
        expect(result.lock).toBeDefined();
        expect(result.lock!.file).toBe('/test/file.ts');
        expect(result.lock!.status).toBe('active');
      });

      it('returns conflict when file is locked', async () => {
        await ops.acquire({
          file: '/test/file.ts',
          specialist_id: 'spec-1',
          timeout_ms: 30000
        });
        
        const result = await ops.acquire({
          file: '/test/file.ts',
          specialist_id: 'spec-2',
          timeout_ms: 30000
        });
        
        expect(result.conflict).toBe(true);
        expect(result.existing_lock).toBeDefined();
        expect(result.existing_lock!.reserved_by).toBe('spec-1');
      });
    });

    describe('release()', () => {
      it('releases lock when owner', async () => {
        const { lock } = await ops.acquire({
          file: '/test/file.ts',
          specialist_id: 'spec-1',
          timeout_ms: 30000
        });
        
        const released = await ops.release(lock!.id, 'spec-1');
        expect(released.status).toBe('released');
      });

      it('throws when not owner', async () => {
        const { lock } = await ops.acquire({
          file: '/test/file.ts',
          specialist_id: 'spec-1',
          timeout_ms: 30000
        });
        
        await expect(ops.release(lock!.id, 'spec-2'))
          .rejects.toThrow();
      });
    });
  });
}

/**
 * Contract test suite for CheckpointOps
 */
export function testCheckpointOpsContract(
  createOps: () => CheckpointOps,
  cleanup?: () => Promise<void>
): void {
  describe('CheckpointOps Contract', () => {
    let ops: CheckpointOps;

    beforeEach(async () => {
      ops = createOps();
      if (cleanup) await cleanup();
    });

    describe('create()', () => {
      it('returns Checkpoint with required fields', async () => {
        const checkpoint = await ops.create({
          mission_id: 'msn-test',
          trigger: 'manual',
          created_by: 'dispatch-1'
        });
        
        expect(checkpoint.id).toMatch(/^chk-[a-z0-9]+$/);
        expect(checkpoint.mission_id).toBe('msn-test');
        expect(checkpoint.trigger).toBe('manual');
        expect(checkpoint.version).toBe('1.0.0');
      });
    });

    describe('getLatest()', () => {
      it('returns most recent checkpoint', async () => {
        await ops.create({
          mission_id: 'msn-test',
          trigger: 'progress',
          created_by: 'dispatch-1'
        });
        
        const latest = await ops.create({
          mission_id: 'msn-test',
          trigger: 'manual',
          created_by: 'dispatch-1'
        });
        
        const retrieved = await ops.getLatest('msn-test');
        expect(retrieved?.id).toBe(latest.id);
      });

      it('returns null when no checkpoints', async () => {
        const result = await ops.getLatest('msn-nonexistent');
        expect(result).toBeNull();
      });
    });
  });
}
```

### 3.2 Running Contract Tests

```typescript
// tests/contract/mission-ops.contract.test.ts

import { testMissionOpsContract } from '../helpers/contract-tests';
import { createSQLiteMissionOps } from '../../squawk/src/db/operations/mission';
import { mockMissionOps, resetMockDatabase } from '../helpers/mock-database';
import { createTestDatabase, destroyTestDatabase } from '../helpers/test-sqlite';

describe('MissionOps Implementations', () => {
  // Test SQLite implementation
  describe('SQLite Implementation', () => {
    let db: Database;
    
    testMissionOpsContract(
      () => {
        db = createTestDatabase();
        return createSQLiteMissionOps(db);
      },
      async () => {
        destroyTestDatabase(db);
      }
    );
  });

  // Test Mock implementation
  describe('Mock Implementation', () => {
    testMissionOpsContract(
      () => mockMissionOps,
      async () => resetMockDatabase()
    );
  });
});
```

---

## 4. Mock Implementation Guidelines

### 4.1 Mock Implementation Requirements

All mock implementations must:

1. **Pass contract tests** - Same behavior as real implementations
2. **Be stateful** - Maintain in-memory state between calls
3. **Be resettable** - Provide `reset()` function for test isolation
4. **Be seedable** - Provide `seed()` function for test data
5. **Be synchronous** - Return Promises but execute synchronously

### 4.2 Mock Implementation Pattern

```typescript
// tests/helpers/mock-database.ts

// In-memory storage
const storage = {
  missions: new Map<string, Mission>(),
  sorties: new Map<string, Sortie>(),
  locks: new Map<string, Lock>(),
  events: [] as Event[],
  checkpoints: new Map<string, Checkpoint>(),
};

/**
 * Reset all mock storage
 */
export function resetMockDatabase(): void {
  storage.missions.clear();
  storage.sorties.clear();
  storage.locks.clear();
  storage.events = [];
  storage.checkpoints.clear();
}

/**
 * Seed mock database with test data
 */
export function seedMockDatabase(data: SeedData): void {
  if (data.missions) {
    data.missions.forEach(m => storage.missions.set(m.id, m));
  }
  if (data.sorties) {
    data.sorties.forEach(s => storage.sorties.set(s.id, s));
  }
  // ... etc
}

/**
 * Mock MissionOps implementation
 */
export const mockMissionOps: MissionOps = {
  async create(input: CreateMissionInput): Promise<Mission> {
    const mission: Mission = {
      id: `msn-${generateId()}`,
      title: input.title,
      description: input.description,
      status: 'pending',
      priority: input.priority || 'medium',
      created_at: new Date().toISOString(),
      total_sorties: 0,
      completed_sorties: 0,
      metadata: input.metadata,
    };
    storage.missions.set(mission.id, mission);
    return mission;
  },

  async getById(id: string): Promise<Mission | null> {
    return storage.missions.get(id) || null;
  },

  async start(id: string): Promise<Mission> {
    const mission = storage.missions.get(id);
    if (!mission) throw new Error('Mission not found');
    if (mission.status !== 'pending') {
      throw new Error('Mission already started');
    }
    mission.status = 'in_progress';
    mission.started_at = new Date().toISOString();
    return mission;
  },

  // ... implement all interface methods
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}
```

### 4.3 Swapping Mocks for Real Implementations

When Phase 2 is complete, Phase 3 tests swap mocks for real implementations:

```typescript
// tests/integration/phase3/with-real-db.test.ts

import { createSQLiteAdapter } from '../../../squawk/src/db/sqlite';
import { CheckpointService } from '../../../server/api/src/checkpoints/service';

describe('Phase 3 with Real Database', () => {
  let db: DatabaseAdapter;
  let checkpointService: CheckpointService;

  beforeAll(async () => {
    // Use real SQLite instead of mocks
    db = await createSQLiteAdapter(':memory:');
    await db.initialize();
    
    checkpointService = new CheckpointService({
      missionOps: db.missions,
      sortieOps: db.sorties,
      lockOps: db.locks,
      checkpointOps: db.checkpoints,
    });
  });

  afterAll(async () => {
    await db.close();
  });

  // All Phase 3 tests run against real database
  it('creates checkpoint with real database', async () => {
    const mission = await db.missions.create({ title: 'Test' });
    await db.missions.start(mission.id);
    
    const checkpoint = await checkpointService.createCheckpoint({
      mission_id: mission.id,
      trigger: 'manual',
      created_by: 'test'
    });
    
    expect(checkpoint.id).toBeDefined();
    
    // Verify persisted in real database
    const retrieved = await db.checkpoints.getById(checkpoint.id);
    expect(retrieved).not.toBeNull();
  });
});
```

---

## 5. Type Export Summary

### 5.1 Main Export File

```typescript
// squawk/src/db/types.ts

// Re-export all interfaces
export type {
  // Core adapter
  DatabaseAdapter,
  DatabaseStats,
  
  // Mission types
  MissionOps,
  Mission,
  MissionStatus,
  MissionResult,
  MissionStats,
  MissionFilter,
  CreateMissionInput,
  UpdateMissionInput,
  
  // Sortie types
  SortieOps,
  Sortie,
  SortieStatus,
  SortieResult,
  SortieFilter,
  SortieSnapshot,
  CreateSortieInput,
  UpdateSortieInput,
  
  // Lock types
  LockOps,
  Lock,
  LockStatus,
  LockPurpose,
  LockResult,
  LockSnapshot,
  LockReacquireResult,
  AcquireLockInput,
  
  // Event types
  EventOps,
  Event,
  StreamType,
  EventMetadata,
  EventFilter,
  EventQueryOptions,
  AppendEventInput,
  
  // Checkpoint types
  CheckpointOps,
  Checkpoint,
  CheckpointTrigger,
  CheckpointDeleteFilter,
  RecoveryContext,
  MessageSnapshot,
  PruneOptions,
  CreateCheckpointInput,
  
  // Specialist types
  SpecialistOps,
  Specialist,
  SpecialistStatus,
  SpecialistFilter,
  RegisterSpecialistInput,
  
  // Message types
  MessageOps,
  Message,
  MessageStatus,
  MessagePriority,
  MessageQueryOptions,
  SendMessageInput,
  
  // Cursor types
  CursorOps,
  Cursor,
  
  // Common types
  Priority,
};
```

---

## 6. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-04 | Initial interface definitions |

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-01-04  
**Author:** Documentation Specialist
