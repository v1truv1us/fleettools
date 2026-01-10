# Stream 0C: Event Store

**Package:** `packages/events` (extends from Stream 0B)
**Dependencies:** Stream 0A (Drizzle client), Stream 0B (Event types)
**Estimated Tasks:** 10
**Ralph Loop:** Yes - TDD with database integration tests

## Objective

Implement append-only event store using Drizzle ORM. Create stream projections for pilots, sorties, missions. Support event replay, querying by type/stream/time, and materialized view updates.

## Package Structure (Extended from Stream 0B)

```
packages/events/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── types/              # From Stream 0B
│   ├── store.ts            # NEW: EventStore class
│   ├── projections/         # NEW: Projection handlers
│   │   ├── pilots.ts
│   │   ├── messages.ts
│   │   ├── sorties.ts
│   │   ├── missions.ts
│   │   └── checkpoints.ts
│   └── replay.ts           # NEW: Event replay logic
└── tests/
    ├── store.test.ts
    ├── projections.test.ts
    └── replay.test.ts
```

## Implementation Tasks

### Task 0C-1: Create EventStore Class
**Completion:** EventStore appends events and queries

```typescript
// src/store.ts
import { createFleetDb, type FleetDB, eventsTable } from '@fleettools/db';
import { type FleetEvent, FleetEventSchema, validateEvent } from './types/index.js';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';

export interface AppendEventOptions {
  /** Project key (path) */
  project_key: string;
  /** Event to append */
  event: FleetEvent;
}

export interface QueryEventsOptions {
  /** Project key (path) */
  project_key: string;
  /** Filter by event types */
  types?: string[];
  /** Filter by stream_id (sortie_id, mission_id) */
  stream_ids?: string[];
  /** Time range: from timestamp (ms) */
  from?: number;
  /** Time range: to timestamp (ms) */
  to?: number;
  /** Maximum results */
  limit?: number;
  /** Order: 'asc' (default) or 'desc' */
  order?: 'asc' | 'desc';
}

/**
 * Event Store - append-only event storage
 * 
 * Core event sourcing operations:
 * - append(event) - Write immutable event
 * - query(options) - Read events with filters
 * - getLatest(projectKey) - Get latest event for position tracking
 */
export class EventStore {
  constructor(private db: FleetDB) {}

  /**
   * Append event to store
   * Validates event and inserts into events table
   * Returns event with auto-generated id, sequence
   */
  async append(event: FleetEvent, projectKey: string): Promise<FleetEvent> {
    // Validate event
    const validated = validateEvent(event);

    // Insert event (id and sequence auto-generated)
    const result = await this.db.insert(eventsTable).values({
      type: validated.type,
      project_key: projectKey,
      timestamp: validated.timestamp,
      data: JSON.stringify(validated),
    }).returning();

    if (result.length === 0) {
      throw new Error('Failed to append event');
    }

    const inserted = result[0];
    
    // Return event with generated fields
    return {
      ...validated,
      id: inserted.id,
      sequence: inserted.sequence,
    } as FleetEvent;
  }

  /**
   * Query events with filters
   */
  async query(options: QueryEventsOptions): Promise<FleetEvent[]> {
    const { project_key, types, stream_ids, from, to, limit = 100, order = 'asc' } = options;

    let query = this.db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.project_key, project_key));

    // Filter by event types
    if (types && types.length > 0) {
      query = query.where(and(
        eq(eventsTable.project_key, project_key),
        inArray(eventsTable.type, types)
      ));
    }

    // Filter by stream IDs (extract from event data JSON)
    if (stream_ids && stream_ids.length > 0) {
      // SQL filtering: check if data contains any stream_id
      const streamIdConditions = stream_ids.map(id => 
        sql`json_extract(${eventsTable.data}, '$.sortie_id') = ${id} OR 
           json_extract(${eventsTable.data}, '$.mission_id') = ${id} OR
           json_extract(${eventsTable.data}, '$.callsign') = ${id}`
      );
      
      query = query.where(and(
        eq(eventsTable.project_key, project_key),
        sql`(${sql.join(streamIdConditions, sql` OR `)})`
      ));
    }

    // Time range
    if (from) {
      query = query.where(and(
        eq(eventsTable.project_key, project_key),
        gte(eventsTable.timestamp, from)
      ));
    }
    if (to) {
      query = query.where(and(
        eq(eventsTable.project_key, project_key),
        lte(eventsTable.timestamp, to)
      ));
    }

    // Ordering
    const orderBy = order === 'desc' 
      ? desc(eventsTable.timestamp)
      : sql`${eventsTable.timestamp} ASC`;

    query = query.orderBy(orderBy).limit(limit);

    const rows = await query;
    
    // Deserialize JSON data
    return rows.map(row => {
      const data = JSON.parse(row.data);
      return {
        ...data,
        id: row.id,
        sequence: row.sequence,
      } as FleetEvent;
    });
  }

  /**
   * Get latest event for position tracking
   */
  async getLatest(projectKey: string): Promise<FleetEvent | null> {
    const rows = await this.db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.project_key, projectKey))
      .orderBy(desc(eventsTable.timestamp))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    const data = JSON.parse(row.data);
    return {
      ...data,
      id: row.id,
      sequence: row.sequence,
    } as FleetEvent;
  }

  /**
   * Get latest event sequence number
   */
  async getLatestSequence(projectKey: string): Promise<number> {
    const result = await this.db
      .select({ seq: eventsTable.sequence })
      .from(eventsTable)
      .where(eq(eventsTable.project_key, projectKey))
      .orderBy(desc(eventsTable.sequence))
      .limit(1);

    return result[0]?.seq ?? 0;
  }

  /**
   * Count events in project
   */
  async count(projectKey: string, filters?: { types?: string[] }): Promise<number> {
    let query = this.db
      .select({ count: sql<number>`count(*)` })
      .from(eventsTable)
      .where(eq(eventsTable.project_key, projectKey));

    if (filters?.types && filters.types.length > 0) {
      query = query.where(and(
        eq(eventsTable.project_key, projectKey),
        inArray(eventsTable.type, filters.types)
      ));
    }

    const result = await query;
    return result[0].count;
  }

  /**
   * Create event store instance from database client
   */
  static fromDb(db: FleetDB): EventStore {
    return new EventStore(db);
  }
}
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0C_1_COMPLETE"
```

### Task 0C-2: Create Pilot Projection Handler
**Completion:** Updates pilots table from pilot_registered events

```typescript
// src/projections/pilots.ts
import { type FleetDB, pilotsTable } from '@fleettools/db';
import { type FleetEvent, isEventType } from '../types/index.js';
import { eq } from 'drizzle-orm';

export interface PilotProjectionResult {
  /** Number of pilots updated */
  updated: number;
  /** Callsigns updated */
  callsigns: string[];
}

/**
 * Handle pilot events to update pilots table
 * 
 * Events handled:
 * - pilot_registered: Insert new pilot
 * - pilot_active: Update last_active_at
 * - pilot_deregistered: Mark as inactive (future: delete)
 */
export async function handlePilotEvent(
  db: FleetDB,
  event: FleetEvent,
  projectKey: string
): Promise<PilotProjectionResult | null> {
  // Only handle pilot events
  if (!['pilot_registered', 'pilot_active', 'pilot_deregistered'].includes(event.type)) {
    return null;
  }

  const now = Date.now();

  if (isEventType(event, 'pilot_registered')) {
    // Insert new pilot
    await db.insert(pilotsTable).values({
      project_key: projectKey,
      callsign: event.callsign,
      program: event.program || 'opencode',
      model: event.model || 'unknown',
      task_description: event.task_description,
      registered_at: now,
      last_active_at: now,
    });
    
    return { updated: 1, callsigns: [event.callsign] };
  }

  if (isEventType(event, 'pilot_active')) {
    // Update last_active_at
    await db
      .update(pilotsTable)
      .set({ last_active_at: now })
      .where(and(
        eq(pilotsTable.project_key, projectKey),
        eq(pilotsTable.callsign, event.callsign)
      ));
    
    return { updated: 1, callsigns: [event.callsign] };
  }

  if (isEventType(event, 'pilot_deregistered')) {
    // Update pilot status (future: add status field)
    // For now, just update last_active_at
    await db
      .update(pilotsTable)
      .set({ last_active_at: now })
      .where(and(
        eq(pilotsTable.project_key, projectKey),
        eq(pilotsTable.callsign, event.callsign)
      ));
    
    return { updated: 1, callsigns: [event.callsign] };
  }

  return null;
}

/**
 * Rebuild pilot projection from event stream
 * Clears and recreates pilots table from pilot_registered events
 */
export async function rebuildPilotProjection(
  db: FleetDB,
  events: FleetEvent[],
  projectKey: string
): Promise<number> {
  // Delete existing pilots for project
  await db
    .delete(pilotsTable)
    .where(eq(pilotsTable.project_key, projectKey));

  // Process events
  let count = 0;
  for (const event of events) {
    const result = await handlePilotEvent(db, event, projectKey);
    if (result) {
      count += result.updated;
    }
  }

  return count;
}
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0C_2_COMPLETE"
```

### Task 0C-3: Create Message Projection Handler
**Completion:** Updates messages table from message events

```typescript
// src/projections/messages.ts
import { type FleetDB, messagesTable, messageRecipientsTable } from '@fleettools/db';
import { type FleetEvent, isEventType } from '../types/index.js';
import { eq } from 'drizzle-orm';

export interface MessageProjectionResult {
  /** Number of messages updated */
  updated: number;
  /** Message IDs affected */
  message_ids?: number[];
}

/**
 * Handle message events to update messages table
 * 
 * Events handled:
 * - message_sent: Insert new message + recipients
 * - message_read: Update read_at timestamp
 * - message_acked: Update acked_at timestamp
 */
export async function handleMessageEvent(
  db: FleetDB,
  event: FleetEvent,
  projectKey: string
): Promise<MessageProjectionResult | null> {
  const now = Date.now();

  if (isEventType(event, 'message_sent')) {
    // Insert message
    const result = await db.insert(messagesTable).values({
      project_key: projectKey,
      from_callsign: event.from_callsign,
      subject: event.subject,
      body: event.body,
      thread_id: event.thread_id || `thread-${now}`,
      importance: event.importance || 'normal',
      ack_required: event.ack_required ? 1 : 0,
      created_at: now,
    }).returning();

    if (result.length === 0) {
      throw new Error('Failed to insert message');
    }

    const message = result[0];

    // Insert recipients
    if (event.to_callsigns && event.to_callsigns.length > 0) {
      for (const callsign of event.to_callsigns) {
        await db.insert(messageRecipientsTable).values({
          message_id: message.id,
          callsign: callsign,
        });
      }
    }

    return { updated: 1, message_ids: [message.id] };
  }

  if (isEventType(event, 'message_read')) {
    // Update read_at
    await db
      .update(messageRecipientsTable)
      .set({ read_at: now })
      .where(and(
        eq(messageRecipientsTable.message_id, event.message_id),
        eq(messageRecipientsTable.callsign, event.callsign)
      ));
    
    return { updated: 1 };
  }

  if (isEventType(event, 'message_acked')) {
    // Update acked_at
    await db
      .update(messageRecipientsTable)
      .set({ acked_at: now })
      .where(and(
        eq(messageRecipientsTable.message_id, event.message_id),
        eq(messageRecipientsTable.callsign, event.callsign)
      ));
    
    return { updated: 1 };
  }

  return null;
}
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0C_3_COMPLETE"
```

### Task 0C-4: Create Sortie Projection Handler
**Completion:** Updates sorties table from sortie events

```typescript
// src/projections/sorties.ts
import { type FleetDB, sortiesTable } from '@fleettools/db';
import { type FleetEvent, isEventType } from '../types/index.js';
import { eq, and, sql } from 'drizzle-orm';

export interface SortieProjectionResult {
  updated: number;
  sortie_ids: string[];
}

/**
 * Handle sortie events to update sorties table
 * 
 * Events handled:
 * - sortie_created: Insert new sortie
 * - sortie_started: Update started_at, status = 'in_progress'
 * - sortie_progress: Update progress notes
 * - sortie_completed: Update completed_at, status = 'closed', summary
 * - sortie_blocked: Update blocked_reason, status = 'blocked'
 * - sortie_status_changed: Update status
 */
export async function handleSortieEvent(
  db: FleetDB,
  event: FleetEvent,
  projectKey: string
): Promise<SortieProjectionResult | null> {
  const now = Date.now();

  if (isEventType(event, 'sortie_created')) {
    await db.insert(sortiesTable).values({
      id: event.sortie_id,
      project_key: projectKey,
      mission_id: event.mission_id,
      title: event.title,
      description: event.description,
      status: 'open',
      priority: event.priority ?? 1,
      created_at: now,
    });
    
    return { updated: 1, sortie_ids: [event.sortie_id] };
  }

  if (isEventType(event, 'sortie_started')) {
    await db
      .update(sortiesTable)
      .set({
        started_at: now,
        status: 'in_progress',
        assigned_to: event.callsign,
      })
      .where(and(
        eq(sortiesTable.project_key, projectKey),
        eq(sortiesTable.id, event.sortie_id)
      ));
    
    return { updated: 1, sortie_ids: [event.sortie_id] };
  }

  if (isEventType(event, 'sortie_progress')) {
    // Store progress as JSON in description or metadata
    const progressData = {
      percent: event.progress_percent,
      message: event.message,
      files_touched: event.files_touched,
      timestamp: now,
    };

    await db
      .update(sortiesTable)
      .set({
        description: sql`json_object('progress', json_extract(${sortiesTable.description}, '$.progress') || json('[]'))`,
      })
      .where(and(
        eq(sortiesTable.project_key, projectKey),
        eq(sortiesTable.id, event.sortie_id)
      ));
    
    return { updated: 1, sortie_ids: [event.sortie_id] };
  }

  if (isEventType(event, 'sortie_completed')) {
    await db
      .update(sortiesTable)
      .set({
        completed_at: now,
        status: 'closed',
        description: sql`json_object('summary', ${JSON.stringify(event.summary)})`,
      })
      .where(and(
        eq(sortiesTable.project_key, projectKey),
        eq(sortiesTable.id, event.sortie_id)
      ));
    
    return { updated: 1, sortie_ids: [event.sortie_id] };
  }

  if (isEventType(event, 'sortie_blocked')) {
    await db
      .update(sortiesTable)
      .set({
        status: 'blocked',
        blocked_reason: event.reason,
      })
      .where(and(
        eq(sortiesTable.project_key, projectKey),
        eq(sortiesTable.id, event.sortie_id)
      ));
    
    return { updated: 1, sortie_ids: [event.sortie_id] };
  }

  if (isEventType(event, 'sortie_status_changed')) {
    await db
      .update(sortiesTable)
      .set({ status: event.new_status })
      .where(and(
        eq(sortiesTable.project_key, projectKey),
        eq(sortiesTable.id, event.sortie_id)
      ));
    
    return { updated: 1, sortie_ids: [event.sortie_id] };
  }

  return null;
}
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0C_4_COMPLETE"
```

### Task 0C-5: Create Mission Projection Handler
**Completion:** Updates missions table from mission events

```typescript
// src/projections/missions.ts
import { type FleetDB, missionsTable } from '@fleettools/db';
import { type FleetEvent, isEventType } from '../types/index.js';
import { eq, and } from 'drizzle-orm';

export interface MissionProjectionResult {
  updated: number;
  mission_ids: string[];
}

/**
 * Handle mission events to update missions table
 * 
 * Events handled:
 * - mission_created: Insert new mission
 * - mission_started: Update started_at, status = 'in_progress'
 * - mission_completed: Update completed_at, status = 'closed', summary
 * - mission_synced: Log sync activity
 */
export async function handleMissionEvent(
  db: FleetDB,
  event: FleetEvent,
  projectKey: string
): Promise<MissionProjectionResult | null> {
  const now = Date.now();

  if (isEventType(event, 'mission_created')) {
    await db.insert(missionsTable).values({
      id: event.mission_id,
      project_key: projectKey,
      title: event.title,
      description: event.description,
      status: 'pending',
      priority: 1,
      created_at: now,
      created_by: event.created_by,
    });
    
    return { updated: 1, mission_ids: [event.mission_id] };
  }

  if (isEventType(event, 'mission_started')) {
    await db
      .update(missionsTable)
      .set({
        started_at: now,
        status: 'in_progress',
      })
      .where(and(
        eq(missionsTable.project_key, projectKey),
        eq(missionsTable.id, event.mission_id)
      ));
    
    return { updated: 1, mission_ids: [event.mission_id] };
  }

  if (isEventType(event, 'mission_completed')) {
    await db
      .update(missionsTable)
      .set({
        completed_at: now,
        status: 'completed',
      })
      .where(and(
        eq(missionsTable.project_key, projectKey),
        eq(missionsTable.id, event.mission_id)
      ));
    
    return { updated: 1, mission_ids: [event.mission_id] };
  }

  // mission_synced just logs, no state change
  if (isEventType(event, 'mission_synced')) {
    return { updated: 0, mission_ids: [event.mission_id] };
  }

  return null;
}
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0C_5_COMPLETE"
```

### Task 0C-6: Create Checkpoint Projection Handler
**Completion:** Updates checkpoints table from checkpoint events

```typescript
// src/projections/checkpoints.ts
import { type FleetDB, checkpointsTable } from '@fleettools/db';
import { type FleetEvent, isEventType } from '../types/index.js';
import { eq, and } from 'drizzle-orm';

export interface CheckpointProjectionResult {
  updated: number;
  checkpoint_ids: string[];
}

/**
 * Handle checkpoint events to update checkpoints table
 * 
 * Events handled:
 * - checkpoint_created: Insert new checkpoint
 * - context_compacted: Insert compacted checkpoint
 * - fleet_recovered: Log recovery activity
 */
export async function handleCheckpointEvent(
  db: FleetDB,
  event: FleetEvent,
  projectKey: string
): Promise<CheckpointProjectionResult | null> {
  const now = Date.now();

  if (isEventType(event, 'checkpoint_created')) {
    const checkpointId = event.checkpoint_id || `chk-${now}`;
    
    await db.insert(checkpointsTable).values({
      id: checkpointId,
      project_key: projectKey,
      mission_id: event.mission_id,
      sortie_id: event.sortie_id,
      callsign: event.callsign,
      trigger: event.trigger,
      progress_percent: event.progress_percent,
      summary: event.summary,
      created_at: now,
    });
    
    return { updated: 1, checkpoint_ids: [checkpointId] };
  }

  if (isEventType(event, 'context_compacted')) {
    // Insert checkpoint for compaction
    const checkpointId = `compact-${now}`;
    
    await db.insert(checkpointsTable).values({
      id: checkpointId,
      project_key: projectKey,
      callsign: 'system',
      trigger: 'auto',
      summary: `Context compacted. Size before: ${event.context_size_before}, after: ${event.context_size_after}`,
      created_at: now,
    });
    
    return { updated: 1, checkpoint_ids: [checkpointId] };
  }

  // fleet_recovered just logs recovery
  if (isEventType(event, 'fleet_recovered')) {
    return { updated: 0, checkpoint_ids: [event.checkpoint_id] };
  }

  return null;
}
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0C_6_COMPLETE"
```

### Task 0C-7: Create Unified Projection Handler
**Completion:** Single entry point for all projections

```typescript
// src/projections/index.ts
import { type FleetDB } from '@fleettools/db';
import { type FleetEvent } from '../types/index.js';
import { handlePilotEvent, type PilotProjectionResult } from './pilots.js';
import { handleMessageEvent, type MessageProjectionResult } from './messages.js';
import { handleSortieEvent, type SortieProjectionResult } from './sorties.js';
import { handleMissionEvent, type MissionProjectionResult } from './missions.js';
import { handleCheckpointEvent, type CheckpointProjectionResult } from './checkpoints.js';

export interface ProjectionResult {
  pilots?: PilotProjectionResult;
  messages?: MessageProjectionResult;
  sorties?: SortieProjectionResult;
  missions?: MissionProjectionResult;
  checkpoints?: CheckpointProjectionResult;
}

/**
 * Handle any event and update all relevant projections
 * Returns summary of which projections were updated
 */
export async function handleEvent(
  db: FleetDB,
  event: FleetEvent,
  projectKey: string
): Promise<ProjectionResult> {
  const results: ProjectionResult = {};

  // Pilot events
  const pilotResult = await handlePilotEvent(db, event, projectKey);
  if (pilotResult) {
    results.pilots = pilotResult;
  }

  // Message events
  const messageResult = await handleMessageEvent(db, event, projectKey);
  if (messageResult) {
    results.messages = messageResult;
  }

  // Sortie events
  const sortieResult = await handleSortieEvent(db, event, projectKey);
  if (sortieResult) {
    results.sorties = sortieResult;
  }

  // Mission events
  const missionResult = await handleMissionEvent(db, event, projectKey);
  if (missionResult) {
    results.missions = missionResult;
  }

  // Checkpoint events
  const checkpointResult = await handleCheckpointEvent(db, event, projectKey);
  if (checkpointResult) {
    results.checkpoints = checkpointResult;
  }

  return results;
}

/**
 * Handle batch of events (for replay)
 */
export async function handleEvents(
  db: FleetDB,
  events: FleetEvent[],
  projectKey: string
): Promise<ProjectionResult[]> {
  const results: ProjectionResult[] = [];

  for (const event of events) {
    const result = await handleEvent(db, event, projectKey);
    results.push(result);
  }

  return results;
}

// Re-export individual handlers
export * from './pilots.js';
export * from './messages.js';
export * from './sorties.js';
export * from './missions.js';
export * from './checkpoints.js';
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0C_7_COMPLETE"
```

### Task 0C-8: Create Event Replay Logic
**Completion:** Can replay events from specific point

```typescript
// src/replay.ts
import { type FleetDB } from '@fleettools/db';
import { EventStore } from './store.js';
import { handleEvents } from './projections/index.js';

export interface ReplayOptions {
  /** Project key (path) */
  project_key: string;
  /** Starting sequence number (default: 0) */
  from_sequence?: number;
  /** Starting timestamp (ms) - alternative to from_sequence */
  from_timestamp?: number;
  /** Ending timestamp (ms) - default: now */
  to_timestamp?: number;
  /** Event types to replay (default: all) */
  types?: string[];
  /** Stop after N events (for testing) */
  limit?: number;
}

export interface ReplayResult {
  /** Number of events replayed */
  event_count: number;
  /** Number of projections updated */
  projection_count: number;
  /** Duration in ms */
  duration_ms: number;
  /** Final sequence number */
  final_sequence: number;
}

/**
 * Replay events from event store into projections
 * Useful for:
 * - Rebuilding projections after corruption
 * - Catching up missed events
 * - Testing event handling
 */
export async function replayEvents(
  db: FleetDB,
  options: ReplayOptions
): Promise<ReplayResult> {
  const startTime = Date.now();
  const store = EventStore.fromDb(db);

  const {
    project_key,
    from_sequence,
    from_timestamp,
    to_timestamp = Date.now(),
    types,
    limit,
  } = options;

  // Query events
  let queryOptions: Parameters<typeof store['query']>[0] = {
    project_key,
    order: 'asc',
  };

  if (from_sequence) {
    // Convert sequence to timestamp by querying first event
    // This is simplified - in production, track sequence->timestamp mapping
    queryOptions.from = from_sequence * 1000; // Approximate
  }
  if (from_timestamp) {
    queryOptions.from = from_timestamp;
  }
  if (to_timestamp) {
    queryOptions.to = to_timestamp;
  }
  if (types && types.length > 0) {
    queryOptions.types = types;
  }
  if (limit) {
    queryOptions.limit = limit;
  }

  const events = await store.query(queryOptions);

  // Process events through projections
  const results = await handleEvents(db, events, project_key);

  const endTime = Date.now();

  return {
    event_count: events.length,
    projection_count: results.length,
    duration_ms: endTime - startTime,
    final_sequence: events[events.length - 1]?.sequence ?? 0,
  };
}

/**
 * Rebuild all projections from scratch
 * Deletes existing data and replays all events
 */
export async function rebuildAllProjections(
  db: FleetDB,
  projectKey: string
): Promise<ReplayResult> {
  // TODO: Delete existing data from projection tables
  // For now, just replay all events
  
  return replayEvents(db, {
    project_key: projectKey,
  });
}
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0C_8_COMPLETE"
```

### Task 0C-9: Update Main Exports
**Completion:** All store/projections exported

```typescript
// src/index.ts (updated)
export * from './types/index.js';
export * from './helpers.js';
export * from './store.js';
export * from './projections/index.js';
export * from './replay.js';
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0C_9_COMPLETE"
```

### Task 0C-10: Write Integration Tests
**Completion:** All tests pass with in-memory database

```typescript
// tests/store.test.ts
import { describe, test, expect, beforeAll } from 'bun:test';
import { createInMemoryDb } from '@fleettools/db';
import { EventStore } from '../src/store.js';
import { createEvent } from '../src/index.js';

describe('EventStore', () => {
  let db: ReturnType<typeof createInMemoryDb>;

  beforeAll(() => {
    // TODO: Run migrations for in-memory DB
    db = createInMemoryDb();
  });

  test('appends event and returns with id/sequence', async () => {
    const store = EventStore.fromDb(db);
    const event = createEvent('pilot_registered', {
      project_key: '/test/project',
      callsign: 'viper-1',
    });

    const appended = await store.append(event, '/test/project');

    expect(appended.id).toBeDefined();
    expect(appended.sequence).toBeDefined();
    expect(appended.callsign).toBe('viper-1');
  });

  test('queries events by project_key', async () => {
    const store = EventStore.fromDb(db);
    
    await store.append(
      createEvent('pilot_registered', { project_key: '/test', callsign: 'viper-1' }),
      '/test'
    );
    await store.append(
      createEvent('message_sent', { project_key: '/test', from_callsign: 'viper-1', to_callsigns: ['viper-2'], subject: 'Test', body: 'Hello' }),
      '/test'
    );

    const events = await store.query({ project_key: '/test' });
    expect(events).toHaveLength(2);
  });

  test('queries events with type filter', async () => {
    const store = EventStore.fromDb(db);
    
    await store.append(
      createEvent('pilot_registered', { project_key: '/test', callsign: 'viper-1' }),
      '/test'
    );
    await store.append(
      createEvent('sortie_created', { project_key: '/test', sortie_id: 's-1', title: 'Test' }),
      '/test'
    );
    await store.append(
      createEvent('pilot_active', { project_key: '/test', callsign: 'viper-1' }),
      '/test'
    );

    const pilotEvents = await store.query({ project_key: '/test', types: ['pilot_registered', 'pilot_active'] });
    expect(pilotEvents).toHaveLength(2);
    expect(pilotEvents.every(e => e.type.startsWith('pilot'))).toBe(true);
  });

  test('gets latest event', async () => {
    const store = EventStore.fromDb(db);
    
    await store.append(
      createEvent('pilot_registered', { project_key: '/test', callsign: 'viper-1' }),
      '/test'
    );
    await store.append(
      createEvent('pilot_active', { project_key: '/test', callsign: 'viper-1' }),
      '/test'
    );

    const latest = await store.getLatest('/test');
    expect(latest?.type).toBe('pilot_active');
  });
});

```

**Verification:**
```bash
cd packages/events && bun run build && bun test && echo "TASK_0C_10_COMPLETE"
```

## Success Criteria

- [ ] EventStore appends events and returns id/sequence
- [ ] EventStore queries events with filters (types, time, limit)
- [ ] EventStore gets latest event by project_key
- [ ] All projection handlers update correct tables
- [ ] Unified `handleEvent` routes to correct handler
- [ ] `replayEvents` replays events through projections
- [ ] All tests pass with in-memory database
- [ ] Package builds successfully
- [ ] Integration tests show end-to-end event flow

## Ralph Loop Completion

```
When all tasks complete and tests pass:
Output: <promise>STREAM_0C_COMPLETE</promise>
```

## Delegation Notes

Key requirements:
- Event store is append-only - no update/delete of events
- Projections are derived from events - not source of truth
- Replay must be deterministic - same events → same projections
- Use in-memory DB for tests (no file I/O)
- Ensure projections handle all event types (null return for unhandled)
