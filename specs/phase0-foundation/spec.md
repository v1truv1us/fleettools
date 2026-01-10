# FleetTools Phase 0 Foundation Specification

**Date:** 2026-01-10  
**Version:** 0.1.0  
**Status:** Ready for Implementation  
**Confidence:** High

## Executive Summary

FleetTools Phase 0 Foundation establishes the core infrastructure for AI Agent Coordination System. This specification consolidates four parallel implementation streams (0A-0D) to create a unified, type-safe, event-sourced foundation using TypeScript, Bun, Drizzle ORM, and Zod validation.

### Key Deliverables
- **packages/db**: Drizzle ORM with libSQL integration and type-safe schemas
- **packages/events**: 30+ typed events with Zod validation and append-only storage
- **packages/core**: Shared utilities, ID generators, and TypeScript types
- **Integration Layer**: Event store, projections, and replay capabilities

### Architecture Principles
1. **Event Sourcing**: All state changes recorded as immutable events
2. **Type Safety**: 100% TypeScript coverage with Zod runtime validation
3. **Bun-First**: Optimized for Bun runtime with ES2022 target
4. **FleetTools Domain**: Pilots, callsigns, sorties, missions terminology

## User Stories

### Database Setup and Connectivity
**As a** FleetTools developer  
**I want** to initialize a per-project SQLite database with type-safe schemas  
**So that** I can reliably store event streams and projections

**Acceptance Criteria:**
- Database created at `.fleet/fleet.db` for each project
- All tables (events, pilots, messages, missions, etc.) created via migrations
- Connection pooling for multi-agent access
- In-memory database available for testing

### Event Management and Validation
**As a** FleetTools coordinator  
**I want** to create and validate typed events  
**So that** all agent interactions are properly recorded and typed

**Acceptance Criteria:**
- 30+ event types covering pilots, messages, sorties, missions, checkpoints
- Zod schemas for runtime validation
- Discriminated union for type-safe event handling
- Event IDs auto-generated with proper prefixes

### Real-time Event Storage and Retrieval
**As a** FleetTools pilot  
**I want** to append events to the event store and query them efficiently  
**So that** I can track progress and coordinate with other agents

**Acceptance Criteria:**
- Event append < 5ms latency
- Query events by project, type, time range, stream ID
- Latest event tracking for cursors
- Append-only storage with immutable events

### Stream Projections and Materialized Views
**As a** FleetTools system  
**I want** to maintain materialized views of current state  
**So that** queries for current state are fast and efficient

**Acceptance Criteria:**
- Automatic projection updates on event append
- Projections for pilots, messages, sorties, missions, checkpoints
- Replay capability to rebuild projections
- Query performance < 5ms for materialized views

## Technical Requirements

### Package Architecture

```
fleettools/
├── packages/
│   ├── core/           # Shared utilities and types (Stream 0D)
│   ├── db/             # Drizzle ORM and schemas (Stream 0A)
│   └── events/         # Event types and store (Streams 0B+0C)
└── specs/phase0-foundation/
    └── spec.md         # This specification
```

### API Specifications

#### packages/db (Stream 0A)
**Main Exports:**
```typescript
// Database client factory
export function createFleetDb(options: CreateDbOptions): FleetDB
export function createInMemoryDb(): FleetDB

// Schema exports
export * from './schema/index.js'
```

**Database Schema:**
- `events` table: Append-only event log with JSON data
- `pilots` table: Registered AI agents with callsigns
- `messages` table: Inter-pilot communication with recipients
- `missions` table: Large grouped work items
- `sorties` table: Individual work items within missions
- `work_orders` table: Low-level tasks within sorties
- `checkpoints` table: Context survival snapshots
- `reservations` table: File locks for coordination
- `cursors` table: Stream position tracking
- `locks` table: Distributed mutex

**Connection Pattern:**
```typescript
const db = createFleetDb({
  projectPath: '/path/to/project',
  filename: 'fleet.db' // optional
});
```

#### packages/events (Streams 0B+0C)
**Main Exports:**
```typescript
// Event types and validation
export { FleetEventSchema, type FleetEvent } from './types/index.js'
export { createEvent, isEventType, validateEvent } from './helpers.js'

// Event store and projections
export { EventStore } from './store.js'
export { handleEvent, handleEvents } from './projections/index.js'
export { replayEvents } from './replay.js'
```

**Event Store API:**
```typescript
class EventStore {
  async append(event: FleetEvent, projectKey: string): Promise<FleetEvent>
  async query(options: QueryEventsOptions): Promise<FleetEvent[]>
  async getLatest(projectKey: string): Promise<FleetEvent | null>
  async getLatestSequence(projectKey: string): Promise<number>
  async count(projectKey: string, filters?: EventFilters): Promise<number>
}
```

**Event Creation API:**
```typescript
// Type-safe event creation with validation
const event = createEvent('pilot_registered', {
  project_key: '/test/project',
  callsign: 'viper-1',
  program: 'opencode',
  model: 'claude-sonnet'
});

// Type guard for event handling
if (isEventType(event, 'pilot_registered')) {
  // TypeScript knows this is PilotRegisteredEvent
  console.log(event.callsign);
}
```

#### packages/core (Stream 0D)
**Main Exports:**
```typescript
// ID generators with FleetTools prefixes
export function generateCallsign(): string      // 'callsign-abc123'
export function generateSortieId(): string     // 'sortie-def456'
export function generateMissionId(): string    // 'mission-ghi789'

// Timestamp utilities (ISO 8601)
export function nowIso(): string                // '2025-01-09T14:30:00.000Z'
export function formatDuration(ms: number): string  // '1h 0m 0s'

// Constants and types
export const TTL, IMPORTANCE, SORTIE_STATUS, etc.
export type ProjectKey, Callsign, SortieId, etc.
```

### Integration Patterns

#### Database Integration
```typescript
import { createFleetDb } from '@fleettools/db';
import { EventStore } from '@fleettools/events';

// Create database connection
const db = createFleetDb({ projectPath: process.cwd() });

// Initialize event store
const eventStore = EventStore.fromDb(db);
```

#### Event Validation and Storage
```typescript
import { createEvent, validateEvent } from '@fleettools/events';

// Create typed event
const event = createEvent('sortie_created', {
  project_key: '/test/project',
  sortie_id: 'sortie-abc123',
  title: 'Implement feature X'
});

// Append to store (validates automatically)
const stored = await eventStore.append(event, '/test/project');
```

#### Projection Updates
```typescript
import { handleEvent } from '@fleettools/events';

// Event automatically updates all relevant projections
const result = await handleEvent(db, event, '/test/project');
// result: { pilots?: ..., messages?: ..., sorties?: ..., missions?: ... }
```

### Performance Requirements

#### Event Storage Performance
- **Event Append**: < 5ms for single event
- **Event Query**: < 5ms for typical queries (100 events max)
- **Projection Update**: < 10ms for single event processing
- **Bulk Operations**: 100+ events/second for replay

#### Database Optimization
- SQLite WAL mode for concurrent access
- Proper indexes on query columns (project_key, type, timestamp)
- Connection pooling for multi-agent scenarios
- JSON serialization/deserialization optimization

#### Memory Management
- In-memory database for testing (no file I/O)
- Event compaction after 10,000 events
- Snapshots for long-running event streams
- Efficient cursor tracking for large event histories

## Non-Functional Requirements

### Type Safety Requirements

#### TypeScript Coverage
- **100% TypeScript**: No `any` types in production code
- **Strict Mode**: All strict compiler options enabled
- **Runtime Validation**: Zod schemas for all event types
- **Type Guards**: `isEventType` for discriminated unions

#### Validation Strategy
```typescript
// Compile-time type checking
const event: FleetEvent = { ... };

// Runtime validation
const validated = validateEvent(rawEvent);

// Safe validation with error handling
const result = safeValidateEvent(rawEvent);
if (result.success) {
  // Valid event
} else {
  // Handle error
}
```

### Testing Requirements

#### Coverage Requirements
- **Unit Tests**: 95%+ line coverage for all packages
- **Integration Tests**: Cross-package functionality verification
- **Event Replay Tests**: Verify event store replay correctness
- **Performance Tests**: Event append/query latency verification

#### Test Structure
```typescript
// tests/store.test.ts
describe('EventStore', () => {
  test('appends event and returns with id/sequence', async () => {
    const store = EventStore.fromDb(createInMemoryDb());
    const event = createEvent('pilot_registered', {
      project_key: '/test/project',
      callsign: 'viper-1'
    });
    
    const appended = await store.append(event, '/test/project');
    
    expect(appended.id).toBeDefined();
    expect(appended.sequence).toBeDefined();
  });
});
```

### Documentation Requirements

#### Code Documentation
- JSDoc comments for all public APIs
- TypeScript types for all function parameters and returns
- Inline comments for complex business logic
- README files for each package

#### API Documentation
- Complete type definitions exported
- Usage examples for all major APIs
- Integration patterns documented
- Performance characteristics noted

### Security Requirements

#### Input Validation
- All event data validated via Zod schemas
- SQL injection prevention via Drizzle parameterized queries
- File path validation for reservations and locks
- Proper escaping for user-generated content

#### Access Control
- Project-based data isolation via `project_key`
- Event immutability once stored
- Proper authorization for event operations
- Audit trail via complete event history

## Implementation Tasks

### Consolidated Task List

#### Stream 0D: Core Types (Foundation - No Dependencies)
**Estimated Effort:** 2 days  
**Priority:** 1 (must be completed first)

| Task ID | Description | Completion Criteria |
|---------|-------------|---------------------|
| 0D-1 | Initialize package with nanoid dependency | `packages/core/package.json` exists |
| 0D-2 | Create prefix-based ID generators | `generateCallsign()`, `generateSortieId()` work |
| 0D-3 | Create ISO 8601 timestamp utilities | `nowIso()`, `formatDuration()` work |
| 0D-4 | Create FleetTools constants | TTL, IMPORTANCE, STATUS enums exported |
| 0D-5 | Create shared TypeScript types | ProjectKey, Callsign, etc. defined |
| 0D-6 | Create main exports | All modules exported from index.ts |
| 0D-7 | Write comprehensive tests | 95%+ coverage, all pass |

#### Stream 0A: Drizzle Migration (Database Layer)
**Estimated Effort:** 3 days  
**Priority:** 2 (foundation for events)

| Task ID | Description | Completion Criteria |
|---------|-------------|---------------------|
| 0A-1 | Initialize package with Drizzle dependencies | `packages/db/package.json` exists |
| 0A-2 | Create TypeScript configuration | `bunx tsc --noEmit` succeeds |
| 0A-3 | Create Drizzle config for SQLite | `drizzle.config.ts` valid |
| 0A-4 | Define streams schema (events, pilots, etc.) | Schema compiles, exports tables |
| 0A-5 | Define flightline schema (missions, sorties) | Schema compiles, exports tables |
| 0A-6 | Create schema index exports | All tables exported from index.ts |
| 0A-7 | Create database client factory | `createFleetDb()` connects to `.fleet/fleet.db` |
| 0A-8 | Create main package exports | Client and schema exported |
| 0A-9 | Write client tests | In-memory DB tests pass |
| 0A-10 | Generate initial migration | SQL files in `src/migrations/` |

#### Stream 0B: Event Types (Validation Layer)
**Estimated Effort:** 3 days  
**Priority:** 3 (depends on 0D)

| Task ID | Description | Completion Criteria |
|---------|-------------|---------------------|
| 0B-1 | Initialize package with Zod dependency | `packages/events/package.json` exists |
| 0B-2 | Create base event schema | `BaseEventSchema` with common fields |
| 0B-3 | Define pilot event schemas (3 types) | `pilot_registered`, `pilot_active`, `pilot_deregistered` |
| 0B-4 | Define message event schemas (5 types) | `message_sent`, `message_read`, etc. |
| 0B-5 | Define reservation event schemas (3 types) | `file_reserved`, `file_released`, `file_conflict` |
| 0B-6 | Define sortie event schemas (6 types) | `sortie_created`, `sortie_started`, etc. |
| 0B-7 | Define mission event schemas (4 types) | `mission_created`, `mission_started`, etc. |
| 0B-8 | Define checkpoint event schemas (4 types) | `checkpoint_created`, `context_compacted`, etc. |
| 0B-9 | Define coordination event schemas (6 types) | `coordinator_decision`, `pilot_spawned`, etc. |
| 0B-10 | Create discriminated union of all events | `FleetEventSchema` with 30+ event types |
| 0B-11 | Create event helpers (createEvent, isEventType) | Helper functions with validation |
| 0B-12 | Create main exports and tests | All exports available, tests pass |

#### Stream 0C: Event Store (Storage Layer)
**Estimated Effort:** 4 days  
**Priority:** 4 (depends on 0A, 0B)

| Task ID | Description | Completion Criteria |
|---------|-------------|---------------------|
| 0C-1 | Create EventStore class with append/query | `EventStore.append()` and `EventStore.query()` work |
| 0C-2 | Create pilot projection handler | Updates pilots table from pilot events |
| 0C-3 | Create message projection handler | Updates messages table from message events |
| 0C-4 | Create sortie projection handler | Updates sorties table from sortie events |
| 0C-5 | Create mission projection handler | Updates missions table from mission events |
| 0C-6 | Create checkpoint projection handler | Updates checkpoints table from checkpoint events |
| 0C-7 | Create unified projection handler | `handleEvent()` routes to all handlers |
| 0C-8 | Create event replay logic | `replayEvents()` rebuilds projections |
| 0C-9 | Update main exports | Store and projections exported |
| 0C-10 | Write integration tests | End-to-end event flow tests pass |

### Execution Order and Dependencies

```
Phase 0 Execution Flow:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Stream 0D   │    │ Stream 0A   │    │ Stream 0B   │    │ Stream 0C   │
│ Core Types  │───▶│ Drizzle     │───▶│ Event Types │───▶│ Event Store │
│ (No deps)   │    │ (Needs 0D)  │    │ (Needs 0D)  │    │ (Needs 0A,0B)│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       └───────────────────┴───────────────────┴───────────────────┘
                                Parallel Execution
```

#### Parallel Execution Strategy
1. **Week 1**: Streams 0D and 0A (0D completes, enables 0B)
2. **Week 2**: Stream 0B (uses 0D types)
3. **Week 3**: Stream 0C (uses 0A schemas, 0B events)
4. **Week 4**: Integration testing and optimization

#### Integration Points
- **0D → 0B**: Core types used in event schemas
- **0D → 0A**: Shared constants and types in database schemas  
- **0A → 0C**: Database client used by event store
- **0B → 0C**: Event types used by store and projections

### Risk Mitigation

#### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Drizzle + libSQL compatibility | Medium | Use existing tested patterns from research |
| Zod validation performance | Low | Efficient schema design, lazy validation |
| SQLite concurrency | Medium | WAL mode, connection pooling |
| Event store performance | High | Indexing strategy, query optimization |

#### Integration Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Package dependency conflicts | Medium | Workspace dependency management |
| TypeScript compilation errors | High | Strict config, incremental compilation |
| Event type mismatch | High | Discriminated unions, runtime validation |
| Database migration issues | Medium | Versioned migrations, rollback strategy |

## Success Criteria

### Package Build Verification

#### Core Package (0D)
```bash
cd packages/core
bun install          # Success
bun run build        # Success, no errors
bun test             # All tests pass, 95%+ coverage
```

#### Database Package (0A)
```bash
cd packages/db  
bun install          # Success
bun run build        # Success, no errors
bun test             # All tests pass, in-memory DB works
bunx drizzle-kit generate  # Migration files created
```

#### Events Package (0B+0C)
```bash
cd packages/events
bun install          # Success  
bun run build        # Success, no errors
bun test             # All tests pass, event validation works
```

### Database Connectivity and Migration

#### Database Creation
```typescript
import { createFleetDb } from '@fleettools/db';

// Creates .fleet/fleet.db with all tables
const db = createFleetDb({ projectPath: '/path/to/project' });

// Connection test
await db.select().from(eventsTable).limit(1); // Success
```

#### Migration Success
```bash
cd packages/db
bunx drizzle-kit migrate  # All migrations applied successfully
```

### Event Validation and Storage

#### Event Type Validation
```typescript
import { createEvent, validateEvent, FleetEventSchema } from '@fleettools/events';

// Event creation with validation
const event = createEvent('pilot_registered', {
  project_key: '/test/project',
  callsign: 'viper-1'
}); // Success, typed

// Runtime validation
const validated = FleetEventSchema.parse(rawEvent); // Success for valid events
```

#### Event Storage Performance
```typescript
import { EventStore } from '@fleettools/events';

const store = EventStore.fromDb(db);

// Event append < 5ms
const start = performance.now();
await store.append(event, '/test/project');
const duration = performance.now() - start; // < 5ms

// Query performance < 5ms
const start = performance.now();
await store.query({ project_key: '/test/project', limit: 100 });
const duration = performance.now() - start; // < 5ms
```

### Integration Testing Between Packages

#### End-to-End Event Flow
```typescript
import { createFleetDb } from '@fleettools/db';
import { EventStore, createEvent } from '@fleettools/events';

// Setup
const db = createFleetDb({ projectPath: '/test/project' });
const store = EventStore.fromDb(db);

// Event creation and storage
const event = createEvent('pilot_registered', {
  project_key: '/test/project',
  callsign: 'viper-1'
});

const stored = await store.append(event, '/test/project');

// Query verification
const events = await store.query({ project_key: '/test/project' });
expect(events).toHaveLength(1);
expect(events[0].callsign).toBe('viper-1');

// Projection verification
const pilots = await db.select().from(pilotsTable);
expect(pilots).toHaveLength(1);
expect(pilots[0].callsign).toBe('viper-1');
```

#### Cross-Package Type Safety
```typescript
import { generateCallsign } from '@fleettools/core';
import { createEvent } from '@fleettools/events';

// Types from different packages work together
const callsign = generateCallsign(); // 'callsign-abc123'
const event = createEvent('pilot_registered', {
  project_key: '/test/project',
  callsign: callsign // TypeScript accepts this
});
```

### Performance Benchmarks

#### Event Store Performance
- **Event Append**: < 5ms (single event)
- **Event Query**: < 5ms (100 events, filtered)
- **Projection Update**: < 10ms (single event)
- **Bulk Replay**: 100+ events/second

#### Database Performance
- **Connection Setup**: < 10ms (project database)
- **Migration Execution**: < 1s (all tables)
- **Query Performance**: < 5ms (indexed queries)
- **Concurrent Access**: 10+ simultaneous connections

### Quality Gates

#### Type Safety
```bash
# No TypeScript errors
bunx tsc --noEmit  # Success, no errors

# Strict mode enabled
# All packages use "strict": true in tsconfig.json
```

#### Test Coverage
```bash
# 95%+ coverage for all packages
bun test --coverage  # All packages show 95%+ line coverage
```

#### Linting and Formatting
```bash
# Consistent code style
bunx eslint .     # No errors
bunx prettier --check .  # No changes needed
```

## Conclusion

FleetTools Phase 0 Foundation provides a robust, type-safe, event-sourced foundation for AI agent coordination. The consolidated specification ensures parallel implementation while maintaining proper integration between packages.

### Key Success Factors
1. **Event Sourcing Architecture**: Immutable events with replay capabilities
2. **Type Safety**: Compile-time and runtime validation throughout
3. **Performance Optimized**: Sub-5ms operations for critical paths
4. **FleetTools Domain**: Proper terminology and conventions
5. **Bun-First Runtime**: Optimized for modern JavaScript runtime

### Implementation Readiness
- All 4 streams fully specified with detailed tasks
- Dependencies and execution order clearly defined
- Success criteria measurable and verifiable
- Risk mitigation strategies identified
- Integration patterns established

### Next Steps
1. Assign specialized agents for each stream implementation
2. Set up Ralph Loop iteration pattern for continuous verification
3. Begin with Stream 0D (Core Types) as foundation
4. Implement remaining streams in parallel where possible
5. Conduct integration testing and performance optimization

This specification provides everything needed for successful implementation of FleetTools Phase 0 Foundation, establishing the core infrastructure for AI Agent Coordination System.

---

**Specification Status:** Complete and Ready for Implementation  
**Next Review:** After Stream 0D completion  
**Contact:** FleetTools Architecture Team