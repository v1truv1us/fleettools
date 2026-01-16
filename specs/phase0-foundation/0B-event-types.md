# Stream 0B: Event Types

**Package:** `packages/events`
**Dependencies:** Stream 0D (core types)
**Estimated Tasks:** 12
**Ralph Loop:** Yes - TypeScript compilation + tests

## Objective

Define 30+ typed events with Zod validation for FleetTools coordination. Events use FleetTools naming (pilots, callsigns, sorties, missions). Provides type-safe event creation and validation.

## Package Structure

```
packages/events/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Main exports
│   ├── types/
│   │   ├── index.ts       # Type exports
│   │   ├── base.ts        # Base event schema
│   │   ├── pilots.ts      # Pilot events
│   │   ├── messages.ts    # Message events
│   │   ├── reservations.ts # File reservation events
│   │   ├── sorties.ts     # Sortie/task events
│   │   ├── missions.ts    # Mission/epic events
│   │   ├── checkpoints.ts # Context survival events
│   │   └── coordination.ts # Coordinator events
│   └── helpers.ts         # createEvent, isEventType
└── tests/
    ├── events.test.ts
    └── helpers.test.ts
```

## Implementation Tasks

### Task 0B-1: Initialize Package
**Completion:** `packages/events/package.json` exists

```json
{
  "name": "@fleettools/events",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types/index.js"
  },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target node && tsc --emitDeclarationOnly",
    "test": "bun test"
  },
  "dependencies": {
    "@fleettools/core": "workspace:*",
    "zod": "^4.3.5"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

**Verification:**
```bash
mkdir -p packages/events/src/types packages/events/tests && echo "TASK_0B_1_COMPLETE"
```

### Task 0B-2: Create Base Event Schema
**Completion:** `src/types/base.ts` compiles

```typescript
// src/types/base.ts
import { z } from 'zod';

/**
 * Base fields present on all events
 */
export const BaseEventSchema = z.object({
  /** Auto-generated event ID */
  id: z.number().optional(),
  /** Event type discriminator */
  type: z.string(),
  /** Project key (absolute path) */
  project_key: z.string(),
  /** Timestamp when event occurred (Unix ms) */
  timestamp: z.number(),
  /** Sequence number for ordering */
  sequence: z.number().optional(),
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0B_2_COMPLETE"
```

### Task 0B-3: Define Pilot Events
**Completion:** `src/types/pilots.ts` exports 3 event schemas

```typescript
// src/types/pilots.ts
import { z } from 'zod';
import { BaseEventSchema } from './base.js';

/**
 * Pilot registered in system
 */
export const PilotRegisteredEventSchema = BaseEventSchema.extend({
  type: z.literal('pilot_registered'),
  callsign: z.string(),
  program: z.string().default('opencode'),
  model: z.string().default('unknown'),
  task_description: z.string().optional(),
  squadron: z.string().optional(),
});

/**
 * Pilot activity heartbeat
 */
export const PilotActiveEventSchema = BaseEventSchema.extend({
  type: z.literal('pilot_active'),
  callsign: z.string(),
});

/**
 * Pilot deregistered/left
 */
export const PilotDeregisteredEventSchema = BaseEventSchema.extend({
  type: z.literal('pilot_deregistered'),
  callsign: z.string(),
  reason: z.string().optional(),
});

export type PilotRegisteredEvent = z.infer<typeof PilotRegisteredEventSchema>;
export type PilotActiveEvent = z.infer<typeof PilotActiveEventSchema>;
export type PilotDeregisteredEvent = z.infer<typeof PilotDeregisteredEventSchema>;
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0B_3_COMPLETE"
```

### Task 0B-4: Define Message Events
**Completion:** `src/types/messages.ts` exports 5 event schemas

```typescript
// src/types/messages.ts
import { z } from 'zod';
import { BaseEventSchema } from './base.js';

export const MessageSentEventSchema = BaseEventSchema.extend({
  type: z.literal('message_sent'),
  message_id: z.number().optional(),
  from_callsign: z.string(),
  to_callsigns: z.array(z.string()),
  subject: z.string(),
  body: z.string(),
  thread_id: z.string().optional(),
  importance: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  ack_required: z.boolean().default(false),
  sortie_id: z.string().optional(),
  mission_id: z.string().optional(),
});

export const MessageReadEventSchema = BaseEventSchema.extend({
  type: z.literal('message_read'),
  message_id: z.number(),
  callsign: z.string(),
});

export const MessageAckedEventSchema = BaseEventSchema.extend({
  type: z.literal('message_acked'),
  message_id: z.number(),
  callsign: z.string(),
});

export const ThreadCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal('thread_created'),
  thread_id: z.string(),
  mission_id: z.string().optional(),
  initial_subject: z.string(),
  creator_callsign: z.string(),
});

export const ThreadActivityEventSchema = BaseEventSchema.extend({
  type: z.literal('thread_activity'),
  thread_id: z.string(),
  message_count: z.number().int().min(0),
  participant_count: z.number().int().min(0),
  last_message_callsign: z.string(),
  has_unread: z.boolean(),
});

export type MessageSentEvent = z.infer<typeof MessageSentEventSchema>;
export type MessageReadEvent = z.infer<typeof MessageReadEventSchema>;
export type MessageAckedEvent = z.infer<typeof MessageAckedEventSchema>;
export type ThreadCreatedEvent = z.infer<typeof ThreadCreatedEventSchema>;
export type ThreadActivityEvent = z.infer<typeof ThreadActivityEventSchema>;
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0B_4_COMPLETE"
```

### Task 0B-5: Define Reservation Events
**Completion:** `src/types/reservations.ts` exports 3 event schemas

```typescript
// src/types/reservations.ts
import { z } from 'zod';
import { BaseEventSchema } from './base.js';

export const FileReservedEventSchema = BaseEventSchema.extend({
  type: z.literal('file_reserved'),
  reservation_id: z.number().optional(),
  callsign: z.string(),
  paths: z.array(z.string()),
  reason: z.string().optional(),
  exclusive: z.boolean().default(true),
  ttl_seconds: z.number().default(3600),
  expires_at: z.number(),
  sortie_id: z.string().optional(),
  mission_id: z.string().optional(),
});

export const FileReleasedEventSchema = BaseEventSchema.extend({
  type: z.literal('file_released'),
  callsign: z.string(),
  paths: z.array(z.string()).optional(),
  reservation_ids: z.array(z.number()).optional(),
  sortie_id: z.string().optional(),
  mission_id: z.string().optional(),
  hold_duration_ms: z.number().optional(),
});

export const FileConflictEventSchema = BaseEventSchema.extend({
  type: z.literal('file_conflict'),
  requesting_callsign: z.string(),
  holding_callsign: z.string(),
  paths: z.array(z.string()),
  sortie_id: z.string().optional(),
  resolution: z.enum(['wait', 'force', 'abort']).optional(),
});

export type FileReservedEvent = z.infer<typeof FileReservedEventSchema>;
export type FileReleasedEvent = z.infer<typeof FileReleasedEventSchema>;
export type FileConflictEvent = z.infer<typeof FileConflictEventSchema>;
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0B_5_COMPLETE"
```

### Task 0B-6: Define Sortie Events
**Completion:** `src/types/sorties.ts` exports 6 event schemas

```typescript
// src/types/sorties.ts
import { z } from 'zod';
import { BaseEventSchema } from './base.js';

export const SortieCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal('sortie_created'),
  sortie_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  mission_id: z.string().optional(),
  priority: z.number().min(0).max(3).optional(),
  created_by: z.string().optional(),
});

export const SortieStartedEventSchema = BaseEventSchema.extend({
  type: z.literal('sortie_started'),
  sortie_id: z.string(),
  callsign: z.string(),
  mission_id: z.string().optional(),
});

export const SortieProgressEventSchema = BaseEventSchema.extend({
  type: z.literal('sortie_progress'),
  sortie_id: z.string(),
  callsign: z.string(),
  progress_percent: z.number().min(0).max(100).optional(),
  message: z.string().optional(),
  files_touched: z.array(z.string()).optional(),
});

export const SortieCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal('sortie_completed'),
  sortie_id: z.string(),
  callsign: z.string(),
  summary: z.string(),
  files_touched: z.array(z.string()).optional(),
  success: z.boolean().default(true),
  duration_ms: z.number().optional(),
});

export const SortieBlockedEventSchema = BaseEventSchema.extend({
  type: z.literal('sortie_blocked'),
  sortie_id: z.string(),
  callsign: z.string(),
  reason: z.string(),
  blocked_by: z.string().optional(),
  needs_input: z.boolean().optional(),
});

export const SortieStatusChangedEventSchema = BaseEventSchema.extend({
  type: z.literal('sortie_status_changed'),
  sortie_id: z.string(),
  old_status: z.enum(['open', 'in_progress', 'blocked', 'closed']),
  new_status: z.enum(['open', 'in_progress', 'blocked', 'closed']),
  reason: z.string().optional(),
  changed_by: z.string().optional(),
});

export type SortieCreatedEvent = z.infer<typeof SortieCreatedEventSchema>;
export type SortieStartedEvent = z.infer<typeof SortieStartedEventSchema>;
export type SortieProgressEvent = z.infer<typeof SortieProgressEventSchema>;
export type SortieCompletedEvent = z.infer<typeof SortieCompletedEventSchema>;
export type SortieBlockedEvent = z.infer<typeof SortieBlockedEventSchema>;
export type SortieStatusChangedEvent = z.infer<typeof SortieStatusChangedEventSchema>;
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0B_6_COMPLETE"
```

### Task 0B-7: Define Mission Events
**Completion:** `src/types/missions.ts` exports 4 event schemas

```typescript
// src/types/missions.ts
import { z } from 'zod';
import { BaseEventSchema } from './base.js';

export const MissionCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal('mission_created'),
  mission_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  sortie_count: z.number().int().min(0),
  sortie_ids: z.array(z.string()),
  created_by: z.string().optional(),
});

export const MissionStartedEventSchema = BaseEventSchema.extend({
  type: z.literal('mission_started'),
  mission_id: z.string(),
  coordinator_callsign: z.string().optional(),
});

export const MissionCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal('mission_completed'),
  mission_id: z.string(),
  success: z.boolean(),
  summary: z.string().optional(),
  duration_ms: z.number().optional(),
  sorties_completed: z.number().int().min(0),
  sorties_failed: z.number().int().min(0),
});

export const MissionSyncedEventSchema = BaseEventSchema.extend({
  type: z.literal('mission_synced'),
  sorties_synced: z.number().int().min(0),
  push_success: z.boolean(),
  sync_duration_ms: z.number().int().min(0).optional(),
});

export type MissionCreatedEvent = z.infer<typeof MissionCreatedEventSchema>;
export type MissionStartedEvent = z.infer<typeof MissionStartedEventSchema>;
export type MissionCompletedEvent = z.infer<typeof MissionCompletedEventSchema>;
export type MissionSyncedEvent = z.infer<typeof MissionSyncedEventSchema>;
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0B_7_COMPLETE"
```

### Task 0B-8: Define Checkpoint Events
**Completion:** `src/types/checkpoints.ts` exports 4 event schemas

```typescript
// src/types/checkpoints.ts
import { z } from 'zod';
import { BaseEventSchema } from './base.js';

export const CheckpointCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal('checkpoint_created'),
  checkpoint_id: z.string(),
  callsign: z.string(),
  mission_id: z.string().optional(),
  sortie_id: z.string().optional(),
  trigger: z.enum(['auto', 'manual', 'error', 'context_limit']),
  progress_percent: z.number().min(0).max(100).optional(),
  summary: z.string().optional(),
});

export const ContextCompactedEventSchema = BaseEventSchema.extend({
  type: z.literal('context_compacted'),
  session_id: z.string(),
  trigger: z.enum(['auto', 'manual', 'context_limit']),
  context_size_before: z.number().int().min(0).optional(),
  context_size_after: z.number().int().min(0).optional(),
});

export const FleetRecoveredEventSchema = BaseEventSchema.extend({
  type: z.literal('fleet_recovered'),
  checkpoint_id: z.string(),
  callsign: z.string(),
  mission_id: z.string().optional(),
  sortie_id: z.string().optional(),
  recovery_source: z.enum(['checkpoint', 'event_replay', 'manual']),
});

export const ContextInjectedEventSchema = BaseEventSchema.extend({
  type: z.literal('context_injected'),
  session_id: z.string(),
  context_type: z.enum(['checkpoint', 'static', 'dynamic']),
  content_length: z.number().int().min(0),
});

export type CheckpointCreatedEvent = z.infer<typeof CheckpointCreatedEventSchema>;
export type ContextCompactedEvent = z.infer<typeof ContextCompactedEventSchema>;
export type FleetRecoveredEvent = z.infer<typeof FleetRecoveredEventSchema>;
export type ContextInjectedEvent = z.infer<typeof ContextInjectedEventSchema>;
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0B_8_COMPLETE"
```

### Task 0B-9: Define Coordination Events
**Completion:** `src/types/coordination.ts` exports coordinator events

```typescript
// src/types/coordination.ts
import { z } from 'zod';
import { BaseEventSchema } from './base.js';

export const CoordinatorDecisionEventSchema = BaseEventSchema.extend({
  type: z.literal('coordinator_decision'),
  session_id: z.string(),
  mission_id: z.string(),
  decision_type: z.enum([
    'strategy_selected',
    'pilot_spawned',
    'review_completed',
    'decomposition_complete',
    'inbox_checked',
    'blocker_resolved',
  ]),
  payload: z.any(),
});

export const CoordinatorViolationEventSchema = BaseEventSchema.extend({
  type: z.literal('coordinator_violation'),
  session_id: z.string(),
  mission_id: z.string(),
  violation_type: z.enum([
    'coordinator_edited_file',
    'coordinator_ran_tests',
    'coordinator_reserved_files',
    'no_pilot_spawned',
  ]),
  payload: z.any(),
});

export const PilotSpawnedEventSchema = BaseEventSchema.extend({
  type: z.literal('pilot_spawned'),
  callsign: z.string(),
  mission_id: z.string().optional(),
  sortie_id: z.string(),
  task_description: z.string(),
});

export const PilotCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal('pilot_completed'),
  callsign: z.string(),
  sortie_id: z.string(),
  success: z.boolean(),
  summary: z.string().optional(),
  duration_ms: z.number().optional(),
});

export const ReviewStartedEventSchema = BaseEventSchema.extend({
  type: z.literal('review_started'),
  sortie_id: z.string(),
  reviewer_callsign: z.string(),
});

export const ReviewCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal('review_completed'),
  sortie_id: z.string(),
  reviewer_callsign: z.string(),
  approved: z.boolean(),
  feedback: z.string().optional(),
});

export type CoordinatorDecisionEvent = z.infer<typeof CoordinatorDecisionEventSchema>;
export type CoordinatorViolationEvent = z.infer<typeof CoordinatorViolationEventSchema>;
export type PilotSpawnedEvent = z.infer<typeof PilotSpawnedEventSchema>;
export type PilotCompletedEvent = z.infer<typeof PilotCompletedEventSchema>;
export type ReviewStartedEvent = z.infer<typeof ReviewStartedEventSchema>;
export type ReviewCompletedEvent = z.infer<typeof ReviewCompletedEventSchema>;
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0B_9_COMPLETE"
```

### Task 0B-10: Create Types Index with Union
**Completion:** `src/types/index.ts` exports discriminated union

```typescript
// src/types/index.ts
import { z } from 'zod';

// Re-export all event schemas
export * from './base.js';
export * from './pilots.js';
export * from './messages.js';
export * from './reservations.js';
export * from './sorties.js';
export * from './missions.js';
export * from './checkpoints.js';
export * from './coordination.js';

// Import for union
import {
  PilotRegisteredEventSchema,
  PilotActiveEventSchema,
  PilotDeregisteredEventSchema,
} from './pilots.js';
import {
  MessageSentEventSchema,
  MessageReadEventSchema,
  MessageAckedEventSchema,
  ThreadCreatedEventSchema,
  ThreadActivityEventSchema,
} from './messages.js';
import {
  FileReservedEventSchema,
  FileReleasedEventSchema,
  FileConflictEventSchema,
} from './reservations.js';
import {
  SortieCreatedEventSchema,
  SortieStartedEventSchema,
  SortieProgressEventSchema,
  SortieCompletedEventSchema,
  SortieBlockedEventSchema,
  SortieStatusChangedEventSchema,
} from './sorties.js';
import {
  MissionCreatedEventSchema,
  MissionStartedEventSchema,
  MissionCompletedEventSchema,
  MissionSyncedEventSchema,
} from './missions.js';
import {
  CheckpointCreatedEventSchema,
  ContextCompactedEventSchema,
  FleetRecoveredEventSchema,
  ContextInjectedEventSchema,
} from './checkpoints.js';
import {
  CoordinatorDecisionEventSchema,
  CoordinatorViolationEventSchema,
  PilotSpawnedEventSchema,
  PilotCompletedEventSchema,
  ReviewStartedEventSchema,
  ReviewCompletedEventSchema,
} from './coordination.js';

/**
 * Discriminated union of all FleetTools events
 */
export const FleetEventSchema = z.discriminatedUnion('type', [
  // Pilot events
  PilotRegisteredEventSchema,
  PilotActiveEventSchema,
  PilotDeregisteredEventSchema,
  // Message events
  MessageSentEventSchema,
  MessageReadEventSchema,
  MessageAckedEventSchema,
  ThreadCreatedEventSchema,
  ThreadActivityEventSchema,
  // Reservation events
  FileReservedEventSchema,
  FileReleasedEventSchema,
  FileConflictEventSchema,
  // Sortie events
  SortieCreatedEventSchema,
  SortieStartedEventSchema,
  SortieProgressEventSchema,
  SortieCompletedEventSchema,
  SortieBlockedEventSchema,
  SortieStatusChangedEventSchema,
  // Mission events
  MissionCreatedEventSchema,
  MissionStartedEventSchema,
  MissionCompletedEventSchema,
  MissionSyncedEventSchema,
  // Checkpoint events
  CheckpointCreatedEventSchema,
  ContextCompactedEventSchema,
  FleetRecoveredEventSchema,
  ContextInjectedEventSchema,
  // Coordination events
  CoordinatorDecisionEventSchema,
  CoordinatorViolationEventSchema,
  PilotSpawnedEventSchema,
  PilotCompletedEventSchema,
  ReviewStartedEventSchema,
  ReviewCompletedEventSchema,
]);

export type FleetEvent = z.infer<typeof FleetEventSchema>;

/**
 * All event type literals
 */
export const FleetEventTypes = [
  'pilot_registered',
  'pilot_active',
  'pilot_deregistered',
  'message_sent',
  'message_read',
  'message_acked',
  'thread_created',
  'thread_activity',
  'file_reserved',
  'file_released',
  'file_conflict',
  'sortie_created',
  'sortie_started',
  'sortie_progress',
  'sortie_completed',
  'sortie_blocked',
  'sortie_status_changed',
  'mission_created',
  'mission_started',
  'mission_completed',
  'mission_synced',
  'checkpoint_created',
  'context_compacted',
  'fleet_recovered',
  'context_injected',
  'coordinator_decision',
  'coordinator_violation',
  'pilot_spawned',
  'pilot_completed',
  'review_started',
  'review_completed',
] as const;

export type FleetEventType = (typeof FleetEventTypes)[number];
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0B_10_COMPLETE"
```

### Task 0B-11: Create Event Helpers
**Completion:** `src/helpers.ts` exports createEvent and isEventType

```typescript
// src/helpers.ts
import { FleetEventSchema, type FleetEvent } from './types/index.js';

/**
 * Create an event with timestamp and validate
 */
export function createEvent<T extends FleetEvent['type']>(
  type: T,
  data: Omit<Extract<FleetEvent, { type: T }>, 'type' | 'timestamp' | 'id' | 'sequence'>
): Extract<FleetEvent, { type: T }> {
  const event = {
    type,
    timestamp: Date.now(),
    ...data,
  } as Extract<FleetEvent, { type: T }>;

  // Validate
  const result = FleetEventSchema.safeParse(event);
  if (!result.success) {
    throw new Error(`Invalid event: ${result.error.message}`);
  }

  return result.data as Extract<FleetEvent, { type: T }>;
}

/**
 * Type guard for specific event types
 */
export function isEventType<T extends FleetEvent['type']>(
  event: FleetEvent,
  type: T
): event is Extract<FleetEvent, { type: T }> {
  return event.type === type;
}

/**
 * Validate an event against schema
 */
export function validateEvent(event: unknown): FleetEvent {
  return FleetEventSchema.parse(event);
}

/**
 * Safe validate - returns result object
 */
export function safeValidateEvent(event: unknown) {
  return FleetEventSchema.safeParse(event);
}
```

**Verification:**
```bash
cd packages/events && bunx tsc --noEmit && echo "TASK_0B_11_COMPLETE"
```

### Task 0B-12: Create Main Exports and Tests
**Completion:** All tests pass

```typescript
// src/index.ts
export * from './types/index.js';
export * from './helpers.js';
```

```typescript
// tests/events.test.ts
import { describe, test, expect } from 'bun:test';
import {
  createEvent,
  isEventType,
  validateEvent,
  FleetEventSchema,
  FleetEventTypes,
} from '../src/index.js';

describe('Event Types', () => {
  test('FleetEventTypes has 30+ event types', () => {
    expect(FleetEventTypes.length).toBeGreaterThanOrEqual(30);
  });

  test('createEvent creates valid pilot_registered event', () => {
    const event = createEvent('pilot_registered', {
      project_key: '/test/project',
      callsign: 'viper-1',
      program: 'opencode',
      model: 'claude-sonnet',
    });

    expect(event.type).toBe('pilot_registered');
    expect(event.callsign).toBe('viper-1');
    expect(event.timestamp).toBeGreaterThan(0);
  });

  test('createEvent creates valid sortie_created event', () => {
    const event = createEvent('sortie_created', {
      project_key: '/test/project',
      sortie_id: 'sortie-123',
      title: 'Implement feature X',
    });

    expect(event.type).toBe('sortie_created');
    expect(event.sortie_id).toBe('sortie-123');
  });

  test('createEvent throws on invalid event', () => {
    expect(() => {
      createEvent('pilot_registered', {
        project_key: '/test',
        // missing callsign
      } as any);
    }).toThrow();
  });

  test('isEventType correctly narrows type', () => {
    const event = createEvent('message_sent', {
      project_key: '/test',
      from_callsign: 'viper-1',
      to_callsigns: ['viper-2'],
      subject: 'Test',
      body: 'Hello',
    });

    if (isEventType(event, 'message_sent')) {
      // TypeScript should know this is MessageSentEvent
      expect(event.from_callsign).toBe('viper-1');
      expect(event.to_callsigns).toContain('viper-2');
    }
  });

  test('validateEvent validates JSON events', () => {
    const rawEvent = {
      type: 'pilot_active',
      project_key: '/test',
      timestamp: Date.now(),
      callsign: 'viper-1',
    };

    const validated = validateEvent(rawEvent);
    expect(validated.type).toBe('pilot_active');
  });
});
```

**Verification:**
```bash
cd packages/events && bun run build && bun test && echo "TASK_0B_12_COMPLETE"
```

## Success Criteria

- [ ] `packages/events/package.json` has correct dependencies
- [ ] All event type files compile without errors
- [ ] `FleetEventSchema` is a valid discriminated union
- [ ] `FleetEventTypes` contains 30+ event type strings
- [ ] `createEvent` creates valid, timestamped events
- [ ] `isEventType` correctly narrows types
- [ ] All tests pass
- [ ] `bun run build` succeeds

## Ralph Loop Completion

```
When all tasks complete and tests pass:
Output: <promise>STREAM_0B_COMPLETE</promise>
```

## Delegation Notes

This stream depends on **Stream 0D (Core Types)** for ID generation utilities. If 0D is not complete, you can stub the dependency temporarily with simple implementations.

Key points:
- Use Zod ^4.3.5 for validation
- Follow FleetTools naming (pilots, callsigns, sorties, missions)
- Events are immutable - no update events, only new events
- All events have project_key, type, timestamp
