# Stream 0D: Core Types

**Package:** `packages/core`
**Dependencies:** None
**Estimated Tasks:** 7
**Ralph Loop:** Yes - TypeScript compilation + tests

## Objective

Create shared TypeScript types, ID generators with prefixes, timestamp utilities (ISO 8601), and common constants for FleetTools. Foundation for all other packages.

## Package Structure

```
packages/core/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Main exports
│   ├── ids.ts             # ID generators with prefixes
│   ├── timestamps.ts      # ISO 8601 utilities
│   ├── constants.ts       # Common constants
│   └── types.ts           # Shared TypeScript types
└── tests/
    ├── ids.test.ts
    ├── timestamps.test.ts
    └── types.test.ts
```

## Implementation Tasks

### Task 0D-1: Initialize Package
**Completion:** `packages/core/package.json` exists

```json
{
  "name": "@fleettools/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./ids": "./dist/ids.js",
    "./timestamps": "./dist/timestamps.js",
    "./constants": "./dist/constants.js",
    "./types": "./dist/types.js"
  },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target node && tsc --emitDeclarationOnly",
    "test": "bun test"
  },
  "dependencies": {
    "nanoid": "^5.1.6"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

**Verification:**
```bash
mkdir -p packages/core/src packages/core/tests && echo "TASK_0D_1_COMPLETE"
```

### Task 0D-2: Create ID Generators with Prefixes
**Completion:** `src/ids.ts` exports prefix-based ID generators

```typescript
// src/ids.ts
import { nanoid } from 'nanoid';

/**
 * FleetTools ID prefixes for self-documenting identifiers
 */
export const ID_PREFIXES = {
  /** Pilot (agent) IDs: e.g., callsign-viper-1-abc123 */
  CALLSIGN: 'callsign',
  
  /** Sortie IDs: e.g., sortie-123def456 */
  SORTIE: 'sortie',
  
  /** Mission IDs: e.g., mission-789ghi012 */
  MISSION: 'mission',
  
  /** Work Order IDs: e.g., workorder-jkl345mno678 */
  WORKORDER: 'workorder',
  
  /** Checkpoint IDs: e.g., checkpoint-pqr901stu234 */
  CHECKPOINT: 'checkpoint',
  
  /** Thread IDs: e.g., thread-vwx567yza890 */
  THREAD: 'thread',
  
  /** Message IDs: e.g., message-bcd123efg456 */
  MESSAGE: 'message',
  
  /** Event IDs: e.g., event-hij789klm012 */
  EVENT: 'event',
  
  /** Reservation IDs: e.g., reservation-nop345qrs678 */
  RESERVATION: 'reservation',
  
  /** Lock IDs: e.g., lock-tuv901wxy234 */
  LOCK: 'lock',
  
  /** Cursor IDs: e.g., cursor-zab567cde890 */
  CURSOR: 'cursor',
  
  /** Session IDs: e.g., session-def345ghi678 */
  SESSION: 'session',
} as const;

export type IdPrefix = typeof ID_PREFIXES[keyof typeof ID_PREFIXES];

/**
 * Generate ID with prefix and nanoid
 * Format: {prefix}-{nanoid}
 * 
 * @example
 * generateId('sortie') // 'sortie-abc123def456'
 */
export function generateId(prefix: IdPrefix): string {
  const id = nanoid();
  return `${prefix}-${id}`;
}

/**
 * Generate pilot callsign ID
 * Format: callsign-{nanoid}
 */
export function generateCallsign(): string {
  return generateId(ID_PREFIXES.CALLSIGN);
}

/**
 * Generate sortie ID
 * Format: sortie-{nanoid}
 */
export function generateSortieId(): string {
  return generateId(ID_PREFIXES.SORTIE);
}

/**
 * Generate mission ID
 * Format: mission-{nanoid}
 */
export function generateMissionId(): string {
  return generateId(ID_PREFIXES.MISSION);
}

/**
 * Generate work order ID
 * Format: workorder-{nanoid}
 */
export function generateWorkOrderId(): string {
  return generateId(ID_PREFIXES.WORKORDER);
}

/**
 * Generate checkpoint ID
 * Format: checkpoint-{nanoid}
 */
export function generateCheckpointId(): string {
  return generateId(ID_PREFIXES.CHECKPOINT);
}

/**
 * Generate thread ID
 * Format: thread-{nanoid}
 */
export function generateThreadId(): string {
  return generateId(ID_PREFIXES.THREAD);
}

/**
 * Generate message ID (for internal tracking)
 * Format: message-{nanoid}
 * Note: message_id in DB is auto-increment integer
 */
export function generateMessageId(): string {
  return generateId(ID_PREFIXES.MESSAGE);
}

/**
 * Generate session ID
 * Format: session-{nanoid}
 */
export function generateSessionId(): string {
  return generateId(ID_PREFIXES.SESSION);
}

/**
 * Parse ID prefix from string
 * 
 * @example
 * parseIdPrefix('sortie-abc123') // 'sortie'
 * parseIdPrefix('invalid-id') // null
 */
export function parseIdPrefix(id: string): IdPrefix | null {
  const parts = id.split('-');
  if (parts.length < 2) {
    return null;
  }

  const prefix = parts[0];
  const validPrefixes = Object.values(ID_PREFIXES);

  if (validPrefixes.includes(prefix as any)) {
    return prefix as IdPrefix;
  }

  return null;
}

/**
 * Check if ID matches expected prefix
 */
export function isValidId(id: string, expectedPrefix: IdPrefix): boolean {
  const prefix = parseIdPrefix(id);
  return prefix === expectedPrefix;
}

/**
 * Validate ID format
 * Returns false if:
 * - No prefix
 * - Invalid prefix
 * - No nanoid part
 */
export function validateId(id: string): boolean {
  const prefix = parseIdPrefix(id);
  if (!prefix) {
    return false;
  }

  const parts = id.split('-');
  return parts.length >= 2 && parts[1].length > 0;
}
```

**Verification:**
```bash
cd packages/core && bunx tsc --noEmit && echo "TASK_0D_2_COMPLETE"
```

### Task 0D-3: Create Timestamp Utilities
**Completion:** `src/timestamps.ts` exports ISO 8601 functions

```typescript
// src/timestamps.ts

/**
 * Get current timestamp as ISO 8601 string
 * 
 * @example
 * nowIso() // '2025-01-09T14:30:00.000Z'
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Convert Date to ISO 8601 string
 */
export function toIso(date: Date): string {
  return date.toISOString();
}

/**
 * Convert Unix timestamp (ms) to ISO 8601 string
 */
export function fromUnixMs(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Convert ISO 8601 string to Date
 */
export function fromIso(iso: string): Date {
  return new Date(iso);
}

/**
 * Get Unix timestamp (ms) from Date
 */
export function toUnixMs(date: Date): number {
  return date.getTime();
}

/**
 * Get current Unix timestamp (ms)
 */
export function nowUnixMs(): number {
  return Date.now();
}

/**
 * Format duration as human-readable string
 * 
 * @example
 * formatDuration(3600000) // '1h 0m 0s'
 * formatDuration(90000) // '0h 1m 30s'
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const h = hours;
  const m = minutes % 60;
  const s = seconds % 60;

  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

/**
 * Calculate duration between two ISO timestamps
 * Returns difference in milliseconds
 */
export function durationBetween(startIso: string, endIso: string): number {
  const start = fromIso(startIso);
  const end = fromIso(endIso);
  return end.getTime() - start.getTime();
}

/**
 * Add duration to ISO timestamp
 * Returns new ISO timestamp
 * 
 * @example
 * addDuration('2025-01-09T10:00:00.000Z', 3600000)
 * // '2025-01-09T11:00:00.000Z'
 */
export function addDuration(iso: string, ms: number): string {
  const date = fromIso(iso);
  date.setTime(date.getTime() + ms);
  return toIso(date);
}

/**
 * Check if ISO timestamp is in the past
 */
export function isPast(iso: string): boolean {
  return fromIso(iso).getTime() < Date.now();
}

/**
 * Check if ISO timestamp is in the future
 */
export function isFuture(iso: string): boolean {
  return fromIso(iso).getTime() > Date.now();
}

/**
 * Format ISO timestamp for display
 * Short format without milliseconds for UI
 * 
 * @example
 * formatDisplay('2025-01-09T14:30:00.000Z')
 * // '2025-01-09 14:30:00'
 */
export function formatDisplay(iso: string): string {
  return iso.replace('T', ' ').replace(/\.\d+Z$/, '');
}
```

**Verification:**
```bash
cd packages/core && bunx tsc --noEmit && echo "TASK_0D_3_COMPLETE"
```

### Task 0D-4: Create Common Constants
**Completion:** `src/constants.ts` exports FleetTools constants

```typescript
// src/constants.ts

/**
 * FleetTools version
 */
export const VERSION = '0.1.0';

/**
 * Default TTL (Time-To-Live) in milliseconds
 * Used for: reservations, locks, sessions
 */
export const TTL = {
  /** Default reservation TTL: 1 hour */
  RESERVATION: 60 * 60 * 1000, // 3600000ms
  
  /** Default lock TTL: 5 minutes */
  LOCK: 5 * 60 * 1000, // 300000ms
  
  /** Default session TTL: 24 hours */
  SESSION: 24 * 60 * 60 * 1000, // 86400000ms
  
  /** Short-lived operation TTL: 30 seconds */
  OPERATION: 30 * 1000, // 30000ms
} as const;

/**
 * Message importance levels
 */
export const IMPORTANCE = {
  /** Low priority, informational */
  LOW: 'low',
  
  /** Normal priority, default */
  NORMAL: 'normal',
  
  /** High priority, requires attention */
  HIGH: 'high',
  
  /** Urgent, requires immediate attention */
  URGENT: 'urgent',
} as const;

export type Importance = typeof IMPORTANCE[keyof typeof IMPORTANCE];

/**
 * Sortie status values
 */
export const SORTIE_STATUS = {
  /** New, not started */
  OPEN: 'open',
  
  /** Currently being worked on */
  IN_PROGRESS: 'in_progress',
  
  /** Blocked, waiting for something */
  BLOCKED: 'blocked',
  
  /** Completed, closed */
  CLOSED: 'closed',
} as const;

export type SortieStatus = typeof SORTIE_STATUS[keyof typeof SORTIE_STATUS];

/**
 * Mission status values
 */
export const MISSION_STATUS = {
  /** New, not started */
  PENDING: 'pending',
  
  /** Currently being worked on */
  IN_PROGRESS: 'in_progress',
  
  /** Completed, closed */
  COMPLETED: 'completed',
} as const;

export type MissionStatus = typeof MISSION_STATUS[keyof typeof MISSION_STATUS];

/**
 * Priority levels (0-3, 0 = highest)
 */
export const PRIORITY = {
  /** Highest priority, block everything else */
  CRITICAL: 0,
  
  /** High priority, should be done soon */
  HIGH: 1,
  
  /** Normal priority, default */
  MEDIUM: 2,
  
  /** Low priority, backlog */
  LOW: 3,
} as const;

export type Priority = typeof PRIORITY[keyof typeof PRIORITY];

/**
 * Event type categories
 */
export const EVENT_CATEGORIES = {
  /** Pilot lifecycle events */
  PILOT: ['pilot_registered', 'pilot_active', 'pilot_deregistered'],
  
  /** Communication events */
  MESSAGE: ['message_sent', 'message_read', 'message_acked', 'thread_created', 'thread_activity'],
  
  /** File coordination events */
  RESERVATION: ['file_reserved', 'file_released', 'file_conflict'],
  
  /** Work tracking events */
  SORTIE: ['sortie_created', 'sortie_started', 'sortie_progress', 'sortie_completed', 'sortie_blocked', 'sortie_status_changed'],
  
  /** Mission events */
  MISSION: ['mission_created', 'mission_started', 'mission_completed', 'mission_synced'],
  
  /** Checkpoint/context events */
  CHECKPOINT: ['checkpoint_created', 'context_compacted', 'fleet_recovered', 'context_injected'],
  
  /** Coordination events */
  COORDINATION: ['coordinator_decision', 'coordinator_violation', 'pilot_spawned', 'pilot_completed', 'review_started', 'review_completed'],
} as const;

/**
 * FleetTools program types (editor integration)
 */
export const PROGRAM_TYPE = {
  /** OpenCode editor */
  OPENCODE: 'opencode',
  
  /** Claude Code editor */
  CLAUDE: 'claude',
  
  /** Standalone/CLI */
  STANDALONE: 'standalone',
  
  /** Custom/unknown */
  UNKNOWN: 'unknown',
} as const;

export type ProgramType = typeof PROGRAM_TYPE[keyof typeof PROGRAM_TYPE];

/**
 * Default database filename
 */
export const DB_FILENAME = 'fleet.db';

/**
 * Default FleetTools directory
 */
export const FLEET_DIR = '.fleet';

/**
 * Maximum events per query (performance guard)
 */
export const MAX_QUERY_RESULTS = 1000;

/**
 * Event compaction threshold (number of events)
 * After this many events, trigger compaction
 */
export const COMPACTION_THRESHOLD = 10000;

/**
 * Checkpoint triggers
 */
export const CHECKPOINT_TRIGGER = {
  /** Automatic checkpoint at progress intervals */
  AUTO: 'auto',
  
  /** Manual checkpoint by user */
  MANUAL: 'manual',
  
  /** Checkpoint triggered by error */
  ERROR: 'error',
  
  /** Checkpoint triggered by context limit */
  CONTEXT_LIMIT: 'context_limit',
} as const;

export type CheckpointTrigger = typeof CHECKPOINT_TRIGGER[keyof typeof CHECKPOINT_TRIGGER];
```

**Verification:**
```bash
cd packages/core && bunx tsc --noEmit && echo "TASK_0D_4_COMPLETE"
```

### Task 0D-5: Create Shared TypeScript Types
**Completion:** `src/types.ts` exports common types

```typescript
// src/types.ts

/**
 * Project key (usually absolute file path)
 * Identifies a FleetTools project
 */
export type ProjectKey = string;

/**
 * Pilot callsign (unique identifier)
 * Format: callsign-{nanoid}
 */
export type Callsign = string;

/**
 * Sortie ID
 * Format: sortie-{nanoid}
 */
export type SortieId = string;

/**
 * Mission ID
 * Format: mission-{nanoid}
 */
export type MissionId = string;

/**
 * Work Order ID
 * Format: workorder-{nanoid}
 */
export type WorkOrderId = string;

/**
 * Checkpoint ID
 * Format: checkpoint-{nanoid}
 */
export type CheckpointId = string;

/**
 * Session ID
 * Format: session-{nanoid}
 */
export type SessionId = string;

/**
 * File path (relative or absolute)
 */
export type FilePath = string;

/**
 * JSON-serializable metadata
 */
export type Metadata = Record<string, unknown>;

/**
 * Progress percentage (0-100)
 */
export type ProgressPercent = number;

/**
 * Unix timestamp (milliseconds since epoch)
 */
export type UnixTimestamp = number;

/**
 * ISO 8601 timestamp string
 */
export type IsoTimestamp = string;

/**
 * Result of event append operation
 */
export interface AppendResult<T> {
  success: boolean;
  event?: T;
  error?: Error;
}

/**
 * Result of projection update
 */
export interface ProjectionUpdate {
  updated: boolean;
  id?: string | number;
}

/**
 * Query options with pagination
 */
export interface QueryOptions {
  offset?: number;
  limit?: number;
  orderBy?: 'asc' | 'desc';
}

/**
 * Paged query result
 */
export interface PagedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/**
 * File lock options
 */
export interface LockOptions {
  /** File path to lock */
  path: FilePath;
  /** Requesting callsign */
  callsign: Callsign;
  /** Lock purpose/reason */
  reason?: string;
  /** TTL in milliseconds */
  ttl?: number;
  /** Exclusive lock (default: true) */
  exclusive?: boolean;
}

/**
 * File reservation options
 */
export interface ReservationOptions {
  /** File paths to reserve */
  paths: FilePath[];
  /** Requesting callsign */
  callsign: Callsign;
  /** Reservation reason */
  reason?: string;
  /** TTL in seconds */
  ttl_seconds?: number;
  /** Exclusive reservation (default: true) */
  exclusive?: boolean;
  /** Associated sortie ID */
  sortie_id?: SortieId;
  /** Associated mission ID */
  mission_id?: MissionId;
}

/**
 * Message delivery options
 */
export interface SendMessageOptions {
  /** Sending callsign */
  from: Callsign;
  /** Receiving callsigns */
  to: Callsign[];
  /** Message subject */
  subject: string;
  /** Message body */
  body: string;
  /** Thread ID (creates new if not provided) */
  thread_id?: string;
  /** Importance level */
  importance?: 'low' | 'normal' | 'high' | 'urgent';
  /** Require acknowledgment */
  ack_required?: boolean;
  /** Associated sortie ID */
  sortie_id?: SortieId;
  /** Associated mission ID */
  mission_id?: MissionId;
}
```

**Verification:**
```bash
cd packages/core && bunx tsc --noEmit && echo "TASK_0D_5_COMPLETE"
```

### Task 0D-6: Create Main Exports
**Completion:** `src/index.ts` exports everything

```typescript
// src/index.ts
export * from './ids.js';
export * from './timestamps.js';
export * from './constants.js';
export * from './types.js';

// Version
export { VERSION } from './constants.js';
```

**Verification:**
```bash
cd packages/core && bunx tsc --noEmit && echo "TASK_0D_6_COMPLETE"
```

### Task 0D-7: Write Tests
**Completion:** All tests pass

```typescript
// tests/ids.test.ts
import { describe, test, expect } from 'bun:test';
import {
  generateId,
  generateCallsign,
  generateSortieId,
  generateMissionId,
  parseIdPrefix,
  isValidId,
  validateId,
  ID_PREFIXES,
} from '../src/index.js';

describe('ID Generators', () => {
  test('generateId creates prefixed ID', () => {
    const id = generateId('sortie');
    expect(id).toMatch(/^sortie-[a-z0-9]+$/);
  });

  test('generateCallsign creates valid callsign', () => {
    const id = generateCallsign();
    expect(id).toMatch(/^callsign-[a-z0-9]+$/);
  });

  test('generateSortieId creates valid sortie ID', () => {
    const id = generateSortieId();
    expect(id).toMatch(/^sortie-[a-z0-9]+$/);
  });

  test('generateMissionId creates valid mission ID', () => {
    const id = generateMissionId();
    expect(id).toMatch(/^mission-[a-z0-9]+$/);
  });

  test('parseIdPrefix extracts prefix correctly', () => {
    expect(parseIdPrefix('sortie-abc123')).toBe('sortie');
    expect(parseIdPrefix('callsign-def456')).toBe('callsign');
    expect(parseIdPrefix('invalid')).toBeNull();
    expect(parseIdPrefix('no-dash')).toBeNull();
  });

  test('isValidId checks prefix match', () => {
    expect(isValidId('sortie-abc123', ID_PREFIXES.SORTIE)).toBe(true);
    expect(isValidId('sortie-abc123', ID_PREFIXES.CALLSIGN)).toBe(false);
  });

  test('validateId returns false for invalid IDs', () => {
    expect(validateId('sortie-abc123')).toBe(true);
    expect(validateId('invalid')).toBe(false);
    expect(validateId('sortie-')).toBe(false);
    expect(validateId('sortie')).toBe(false);
  });
});

// tests/timestamps.test.ts
import { describe, test, expect } from 'bun:test';
import {
  nowIso,
  toIso,
  fromUnixMs,
  fromIso,
  toUnixMs,
  nowUnixMs,
  formatDuration,
  durationBetween,
  addDuration,
  isPast,
  isFuture,
  formatDisplay,
} from '../src/index.js';

describe('Timestamp Utilities', () => {
  test('nowIso returns valid ISO 8601', () => {
    const iso = nowIso();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test('toIso converts Date to ISO', () => {
    const date = new Date('2025-01-09T10:00:00.000Z');
    expect(toIso(date)).toBe('2025-01-09T10:00:00.000Z');
  });

  test('fromUnixMs converts ms to ISO', () => {
    const ms = 1736429200000; // 2025-01-09T10:00:00.000Z
    const iso = fromUnixMs(ms);
    expect(iso).toBe('2025-01-09T10:00:00.000Z');
  });

  test('fromIso parses ISO string', () => {
    const iso = '2025-01-09T10:30:00.000Z';
    const date = fromIso(iso);
    expect(date.getTime()).toBe(new Date(iso).getTime());
  });

  test('toUnixMs returns milliseconds', () => {
    const date = new Date('2025-01-09T10:00:00.000Z');
    expect(toUnixMs(date)).toBe(1736429200000);
  });

  test('formatDuration humanizes milliseconds', () => {
    expect(formatDuration(3600000)).toBe('1h 0m 0s');
    expect(formatDuration(90000)).toBe('0h 1m 30s');
    expect(formatDuration(54000)).toBe('0h 0m 54s');
  });

  test('durationBetween calculates difference', () => {
    const start = '2025-01-09T10:00:00.000Z';
    const end = '2025-01-09T11:00:00.000Z';
    const ms = durationBetween(start, end);
    expect(ms).toBe(3600000);
  });

  test('addDuration adds milliseconds to ISO', () => {
    const iso = '2025-01-09T10:00:00.000Z';
    const result = addDuration(iso, 3600000);
    expect(result).toBe('2025-01-09T11:00:00.000Z');
  });

  test('isPast checks timestamp', () => {
    const past = '2024-01-01T00:00:00.000Z';
    const future = '2030-01-01T00:00:00.000Z';
    expect(isPast(past)).toBe(true);
    expect(isPast(future)).toBe(false);
  });

  test('isFuture checks timestamp', () => {
    const past = '2024-01-01T00:00:00.000Z';
    const future = '2030-01-01T00:00:00.000Z';
    expect(isFuture(future)).toBe(true);
    expect(isFuture(past)).toBe(false);
  });

  test('formatDisplay removes T and ms', () => {
    const iso = '2025-01-09T14:30:00.000Z';
    const display = formatDisplay(iso);
    expect(display).toBe('2025-01-09 14:30:00');
  });
});
```

**Verification:**
```bash
cd packages/core && bun run build && bun test && echo "TASK_0D_7_COMPLETE"
```

## Success Criteria

- [ ] All ID generators produce valid prefixed IDs
- [ ] Timestamp utilities work correctly (ISO conversion, duration, etc.)
- [ ] Constants exported for TTL, priority, status
- [ ] Shared types (ProjectKey, Callsign, etc.) defined
- [ ] All tests pass
- [ ] Package builds successfully
- [ ] No stubs - all functions fully implemented

## Ralph Loop Completion

```
When all tasks complete and tests pass:
Output: <promise>STREAM_0D_COMPLETE</promise>
```

## Delegation Notes

This stream has **no dependencies** and can be implemented first.

Key points:
- All IDs use prefixes for self-documentation
- Timestamps always ISO 8601 format
- Constants are frozen objects (use `as const`)
- Types are exported for re-use across packages
- No stubs - every function must be complete
