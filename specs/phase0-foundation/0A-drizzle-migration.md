# Stream 0A: Drizzle Migration

**Package:** `packages/db`
**Dependencies:** None
**Estimated Tasks:** 10
**Ralph Loop:** Yes - TDD with `bun test` verification

## Objective

Set up Drizzle ORM with libSQL as the database layer for FleetTools. Create type-safe schema definitions using FleetTools naming conventions. Establish per-project database at `.fleet/fleet.db`.

## Package Structure

```
packages/db/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── src/
│   ├── index.ts           # Main exports
│   ├── client.ts          # Database client factory
│   ├── schema/
│   │   ├── index.ts       # Schema exports
│   │   ├── streams.ts     # Events, pilots, messages
│   │   ├── flightline.ts  # Sorties, missions, work orders
│   │   └── memory.ts      # Future: semantic memory
│   └── migrations/
│       └── 0000_initial.sql
└── tests/
    ├── client.test.ts
    └── schema.test.ts
```

## Implementation Tasks

### Task 0A-1: Initialize Package
**Completion:** `packages/db/package.json` exists with correct dependencies

```bash
# Create package directory
mkdir -p packages/db/src/schema packages/db/tests

# package.json content:
{
  "name": "@fleettools/db",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./schema": "./dist/schema/index.js"
  },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target node && tsc --emitDeclarationOnly",
    "test": "bun test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "@libsql/client": "^0.17.0",
    "drizzle-orm": "^0.45.1"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.8",
    "typescript": "^5.9.3"
  }
}
```

**Verification:**
```bash
cd packages/db && bun install && echo "TASK_0A_1_COMPLETE"
```

### Task 0A-2: Create tsconfig.json
**Completion:** TypeScript compiles without errors

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationDir": "./dist",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Verification:**
```bash
cd packages/db && bunx tsc --noEmit && echo "TASK_0A_2_COMPLETE"
```

### Task 0A-3: Create Drizzle Config
**Completion:** `drizzle.config.ts` exists and is valid

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'sqlite',
  driver: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:.fleet/fleet.db',
  },
});
```

**Verification:**
```bash
cd packages/db && bunx drizzle-kit check && echo "TASK_0A_3_COMPLETE"
```

### Task 0A-4: Define Streams Schema
**Completion:** `src/schema/streams.ts` compiles and exports tables

Schema for event store and pilot coordination:

```typescript
// src/schema/streams.ts
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Events table - append-only event log
 * Core of event store. All state changes recorded as events.
 */
export const eventsTable = sqliteTable(
  'events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type').notNull(),
    project_key: text('project_key').notNull(),
    timestamp: integer('timestamp').notNull(),
    sequence: integer('sequence').generatedAlwaysAs(sql`id`),
    data: text('data').notNull(), // JSON string
  },
  (table) => ({
    projectKeyIdx: index('idx_events_project_key').on(table.project_key),
    typeIdx: index('idx_events_type').on(table.type),
    timestampIdx: index('idx_events_timestamp').on(table.timestamp),
    projectTypeIdx: index('idx_events_project_type').on(table.project_key, table.type),
  })
);

/**
 * Pilots table - registered AI agents
 * Materialized view of pilot registrations from event stream.
 */
export const pilotsTable = sqliteTable(
  'pilots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    project_key: text('project_key').notNull(),
    callsign: text('callsign').notNull(),
    program: text('program').default('opencode'),
    model: text('model').default('unknown'),
    task_description: text('task_description'),
    registered_at: integer('registered_at').notNull(),
    last_active_at: integer('last_active_at').notNull(),
  },
  (table) => ({
    projectIdx: index('idx_pilots_project').on(table.project_key),
    callsignIdx: index('idx_pilots_callsign').on(table.callsign),
  })
);

/**
 * Messages table - inter-pilot communication
 */
export const messagesTable = sqliteTable(
  'messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    project_key: text('project_key').notNull(),
    from_callsign: text('from_callsign').notNull(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    thread_id: text('thread_id'),
    importance: text('importance').default('normal'),
    ack_required: integer('ack_required', { mode: 'boolean' }).default(false),
    created_at: integer('created_at').notNull(),
  },
  (table) => ({
    projectIdx: index('idx_messages_project').on(table.project_key),
    threadIdx: index('idx_messages_thread').on(table.thread_id),
    createdIdx: index('idx_messages_created').on(table.created_at),
  })
);

/**
 * Message Recipients - many-to-many
 */
export const messageRecipientsTable = sqliteTable(
  'message_recipients',
  {
    message_id: integer('message_id').notNull(),
    callsign: text('callsign').notNull(),
    read_at: integer('read_at'),
    acked_at: integer('acked_at'),
  },
  (table) => ({
    callsignIdx: index('idx_recipients_callsign').on(table.callsign),
  })
);

/**
 * Reservations - file locks for coordination
 */
export const reservationsTable = sqliteTable(
  'reservations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    project_key: text('project_key').notNull(),
    callsign: text('callsign').notNull(),
    path_pattern: text('path_pattern').notNull(),
    exclusive: integer('exclusive', { mode: 'boolean' }).default(true),
    reason: text('reason'),
    created_at: integer('created_at').notNull(),
    expires_at: integer('expires_at').notNull(),
    released_at: integer('released_at'),
  },
  (table) => ({
    projectIdx: index('idx_reservations_project').on(table.project_key),
    callsignIdx: index('idx_reservations_callsign').on(table.callsign),
    expiresIdx: index('idx_reservations_expires').on(table.expires_at),
  })
);

/**
 * Cursors - stream position tracking
 */
export const cursorsTable = sqliteTable(
  'cursors',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    project_key: text('project_key').notNull(),
    consumer_id: text('consumer_id').notNull(),
    position: integer('position').notNull().default(0),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    consumerIdx: index('idx_cursors_consumer').on(table.project_key, table.consumer_id),
  })
);

/**
 * Locks - distributed mutex
 */
export const locksTable = sqliteTable(
  'locks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    project_key: text('project_key').notNull(),
    lock_key: text('lock_key').notNull(),
    holder_id: text('holder_id').notNull(),
    acquired_at: integer('acquired_at').notNull(),
    expires_at: integer('expires_at').notNull(),
    released_at: integer('released_at'),
  },
  (table) => ({
    lockKeyIdx: index('idx_locks_key').on(table.project_key, table.lock_key),
  })
);
```

**Verification:**
```bash
cd packages/db && bunx tsc --noEmit && echo "TASK_0A_4_COMPLETE"
```

### Task 0A-5: Define Flightline Schema
**Completion:** `src/schema/flightline.ts` compiles

Schema for work tracking (sorties, missions):

```typescript
// src/schema/flightline.ts
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Missions - large grouped work items
 */
export const missionsTable = sqliteTable(
  'missions',
  {
    id: text('id').primaryKey(),
    project_key: text('project_key').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('pending'),
    priority: integer('priority').notNull().default(1),
    created_at: integer('created_at').notNull(),
    started_at: integer('started_at'),
    completed_at: integer('completed_at'),
    created_by: text('created_by'),
  },
  (table) => ({
    projectIdx: index('idx_missions_project').on(table.project_key),
    statusIdx: index('idx_missions_status').on(table.status),
  })
);

/**
 * Sorties - individual work items within missions
 */
export const sortiesTable = sqliteTable(
  'sorties',
  {
    id: text('id').primaryKey(),
    project_key: text('project_key').notNull(),
    mission_id: text('mission_id'),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('open'),
    priority: integer('priority').notNull().default(1),
    assigned_to: text('assigned_to'), // callsign
    files: text('files'), // JSON array
    created_at: integer('created_at').notNull(),
    started_at: integer('started_at'),
    completed_at: integer('completed_at'),
    blocked_reason: text('blocked_reason'),
  },
  (table) => ({
    projectIdx: index('idx_sorties_project').on(table.project_key),
    missionIdx: index('idx_sorties_mission').on(table.mission_id),
    statusIdx: index('idx_sorties_status').on(table.status),
    assignedIdx: index('idx_sorties_assigned').on(table.assigned_to),
  })
);

/**
 * Work Orders - low-level tasks within sorties
 */
export const workOrdersTable = sqliteTable(
  'work_orders',
  {
    id: text('id').primaryKey(),
    project_key: text('project_key').notNull(),
    sortie_id: text('sortie_id'),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('pending'),
    assigned_to: text('assigned_to'),
    created_at: integer('created_at').notNull(),
    completed_at: integer('completed_at'),
  },
  (table) => ({
    sortieIdx: index('idx_work_orders_sortie').on(table.sortie_id),
    statusIdx: index('idx_work_orders_status').on(table.status),
  })
);

/**
 * Checkpoints - context survival snapshots
 */
export const checkpointsTable = sqliteTable(
  'checkpoints',
  {
    id: text('id').primaryKey(),
    project_key: text('project_key').notNull(),
    mission_id: text('mission_id'),
    sortie_id: text('sortie_id'),
    callsign: text('callsign').notNull(),
    trigger: text('trigger').notNull(), // 'auto' | 'manual' | 'error'
    progress_percent: integer('progress_percent'),
    summary: text('summary'),
    context_data: text('context_data'), // JSON
    created_at: integer('created_at').notNull(),
  },
  (table) => ({
    missionIdx: index('idx_checkpoints_mission').on(table.mission_id),
    callsignIdx: index('idx_checkpoints_callsign').on(table.callsign),
  })
);
```

**Verification:**
```bash
cd packages/db && bunx tsc --noEmit && echo "TASK_0A_5_COMPLETE"
```

### Task 0A-6: Create Schema Index
**Completion:** `src/schema/index.ts` exports all tables

```typescript
// src/schema/index.ts
export * from './streams.js';
export * from './flightline.js';
// export * from './memory.js'; // Future phase
```

**Verification:**
```bash
cd packages/db && bunx tsc --noEmit && echo "TASK_0A_6_COMPLETE"
```

### Task 0A-7: Create Database Client
**Completion:** Client connects to `.fleet/fleet.db`

```typescript
// src/client.ts
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema/index.js';
import { existsSync, mkdirSync } from 'node:fs';

export type FleetDB = LibSQLDatabase<typeof schema>;

export interface CreateDbOptions {
  /** Project root directory */
  projectPath: string;
  /** Database filename (default: fleet.db) */
  filename?: string;
}

/**
 * Create a database client for a project
 * Database stored at: {projectPath}/.fleet/{filename}
 */
export function createFleetDb(options: CreateDbOptions): FleetDB {
  const { projectPath, filename = 'fleet.db' } = options;
  const dbDir = `${projectPath}/.fleet`;
  const dbPath = `${dbDir}/${filename}`;

  // Ensure .fleet directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const client = createClient({
    url: `file:${dbPath}`,
  });

  return drizzle(client, { schema });
}

/**
 * Create an in-memory database (for testing)
 */
export function createInMemoryDb(): FleetDB {
  const client = createClient({
    url: ':memory:',
  });
  return drizzle(client, { schema });
}
```

**Verification:**
```bash
cd packages/db && bunx tsc --noEmit && echo "TASK_0A_7_COMPLETE"
```

### Task 0A-8: Create Main Exports
**Completion:** `src/index.ts` exports everything

```typescript
// src/index.ts
export * from './client.js';
export * from './schema/index.js';
```

**Verification:**
```bash
cd packages/db && bun run build && echo "TASK_0A_8_COMPLETE"
```

### Task 0A-9: Write Client Tests
**Completion:** All tests pass

```typescript
// tests/client.test.ts
import { describe, test, expect } from 'bun:test';
import { createInMemoryDb } from '../src/client.js';
import { pilotsTable, eventsTable } from '../src/schema/index.js';

describe('FleetDB Client', () => {
  test('creates in-memory database', () => {
    const db = createInMemoryDb();
    expect(db).toBeDefined();
  });

  test('inserts and queries pilots', async () => {
    const db = createInMemoryDb();
    
    // Run migrations (for in-memory, we need to create tables)
    await db.run(`CREATE TABLE IF NOT EXISTS pilots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_key TEXT NOT NULL,
      callsign TEXT NOT NULL,
      program TEXT DEFAULT 'opencode',
      model TEXT DEFAULT 'unknown',
      task_description TEXT,
      registered_at INTEGER NOT NULL,
      last_active_at INTEGER NOT NULL
    )`);

    const now = Date.now();
    await db.insert(pilotsTable).values({
      project_key: '/test/project',
      callsign: 'viper-1',
      program: 'opencode',
      model: 'claude-sonnet',
      registered_at: now,
      last_active_at: now,
    });

    const pilots = await db.select().from(pilotsTable);
    expect(pilots).toHaveLength(1);
    expect(pilots[0].callsign).toBe('viper-1');
  });

  test('inserts and queries events', async () => {
    const db = createInMemoryDb();
    
    await db.run(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      project_key TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      sequence INTEGER GENERATED ALWAYS AS (id),
      data TEXT NOT NULL
    )`);

    const now = Date.now();
    await db.insert(eventsTable).values({
      type: 'pilot_registered',
      project_key: '/test/project',
      timestamp: now,
      data: JSON.stringify({ callsign: 'viper-1' }),
    });

    const events = await db.select().from(eventsTable);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('pilot_registered');
  });
});
```

**Verification:**
```bash
cd packages/db && bun test && echo "TASK_0A_9_COMPLETE"
```

### Task 0A-10: Generate Initial Migration
**Completion:** Migration file exists in `src/migrations/`

```bash
cd packages/db && bunx drizzle-kit generate --name initial
```

**Verification:**
```bash
ls packages/db/src/migrations/*.sql && echo "TASK_0A_10_COMPLETE"
```

## Success Criteria

- [ ] `packages/db/package.json` has correct dependencies
- [ ] `bun install` succeeds in `packages/db`
- [ ] `bun run build` succeeds in `packages/db`
- [ ] `bun test` passes in `packages/db`
- [ ] Schema exports all tables: events, pilots, messages, reservations, cursors, locks, missions, sorties, work_orders, checkpoints
- [ ] Client creates database at `.fleet/fleet.db`
- [ ] In-memory client works for testing

## Ralph Loop Completion

```
When all tasks complete and tests pass:
Output: <promise>STREAM_0A_COMPLETE</promise>
```

## Delegation Notes

This stream is **self-contained**. The implementing agent should:

1. Follow TDD - write tests before implementation where possible
2. Use Bun for all operations (not npm/node)
3. Use `.js` extensions for local imports
4. Follow FleetTools naming (pilots, callsigns, not agents)
5. Verify each task with provided command before moving on
