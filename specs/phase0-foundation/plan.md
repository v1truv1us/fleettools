# FleetTools Phase 0 Foundation Implementation Plan

**Date:** 2026-01-10  
**Version:** 0.1.0  
**Status:** Ready for Execution  
**Confidence:** High

## Executive Summary

This implementation plan provides a detailed roadmap for executing FleetTools Phase 0 Foundation, establishing the core infrastructure for AI Agent Coordination System. The plan organizes 32 implementation tasks across 4 parallel streams with clear dependencies, quality gates, and success criteria.

### Implementation Overview
- **4 Parallel Streams**: 0D (Core), 0A (Database), 0B (Events), 0C (Store)
- **32 Total Tasks**: Distributed across streams with effort estimates
- **4-Week Timeline**: Optimized for parallel execution
- **Quality Gates**: Automated verification at each milestone

## Task Breakdown by Stream

### Stream 0D: Core Types Foundation (Priority: 1)
**Total Effort**: 2 days | **Tasks**: 6 | **Dependencies**: None

| Task ID | Description | Effort | Complexity | Completion Criteria |
|---------|-------------|--------|------------|---------------------|
| 0D-1 | Initialize package with nanoid dependency | 2h | Low | `packages/core/package.json` created, `bun install` succeeds |
| 0D-2 | Create prefix-based ID generators | 3h | Medium | `generateCallsign()`, `generateSortieId()`, `generateMissionId()` working |
| 0D-3 | Create ISO 8601 timestamp utilities | 2h | Low | `nowIso()`, `formatDuration()` working, timezone aware |
| 0D-4 | Create FleetTools constants | 2h | Low | TTL, IMPORTANCE, STATUS enums exported from constants.ts |
| 0D-5 | Create shared TypeScript types | 3h | Medium | ProjectKey, Callsign, SortieId, etc. in types.ts |
| 0D-6 | Create main exports and tests | 4h | Medium | index.ts exports all modules, 95%+ test coverage |
| **Total** | | **16h** | | |

**File Structure:**
```
packages/core/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Main exports
│   ├── ids.ts            # ID generators
│   ├── timestamps.ts     # Time utilities
│   ├── constants.ts      # Enums and constants
│   ├── types.ts          # TypeScript types
│   └── __tests__/
│       ├── ids.test.ts
│       ├── timestamps.test.ts
│       └── types.test.ts
└── README.md
```

### Stream 0A: Drizzle Migration (Priority: 2)
**Total Effort**: 3 days | **Tasks**: 10 | **Dependencies**: 0D

| Task ID | Description | Effort | Complexity | Completion Criteria |
|---------|-------------|--------|------------|---------------------|
| 0A-1 | Initialize package with Drizzle dependencies | 2h | Low | `packages/db/package.json` created |
| 0A-2 | Create TypeScript configuration | 1h | Low | `bunx tsc --noEmit` succeeds |
| 0A-3 | Create Drizzle config for SQLite | 2h | Medium | `drizzle.config.ts` connects to SQLite |
| 0A-4 | Define streams schema (events, pilots, etc.) | 6h | High | All tables defined, compiles successfully |
| 0A-5 | Define flightline schema (missions, sorties) | 4h | High | Flightline tables defined, compiles |
| 0A-6 | Create schema index exports | 1h | Low | All tables exported from index.ts |
| 0A-7 | Create database client factory | 4h | Medium | `createFleetDb()` connects to `.fleet/fleet.db` |
| 0A-8 | Create main package exports | 1h | Low | Client and schema exported properly |
| 0A-9 | Write client tests | 3h | Medium | In-memory DB tests pass |
| 0A-10 | Generate initial migration | 2h | Medium | SQL files in `src/migrations/` |
| **Total** | | **26h** | | |

**File Structure:**
```
packages/db/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── src/
│   ├── index.ts          # Main exports
│   ├── client.ts         # Database factory
│   ├── schema/
│   │   ├── index.ts      # Schema exports
│   │   ├── streams.ts    # events, pilots, messages, etc.
│   │   └── flightline.ts # missions, sorties, work_orders
│   ├── migrations/       # Generated migration files
│   └── __tests__/
│       └── client.test.ts
└── README.md
```

### Stream 0B: Event Types (Priority: 3)
**Total Effort**: 3 days | **Tasks**: 12 | **Dependencies**: 0D

| Task ID | Description | Effort | Complexity | Completion Criteria |
|---------|-------------|--------|------------|---------------------|
| 0B-1 | Initialize package with Zod dependency | 2h | Low | `packages/events/package.json` created |
| 0B-2 | Create base event schema | 2h | Medium | `BaseEventSchema` with common fields |
| 0B-3 | Define pilot event schemas (3 types) | 3h | Medium | pilot_registered, pilot_active, pilot_deregistered |
| 0B-4 | Define message event schemas (5 types) | 4h | Medium | message_sent, message_read, message_updated, etc. |
| 0B-5 | Define reservation event schemas (3 types) | 3h | Medium | file_reserved, file_released, file_conflict |
| 0B-6 | Define sortie event schemas (6 types) | 4h | High | sortie_created, sortie_started, sortie_completed, etc. |
| 0B-7 | Define mission event schemas (4 types) | 3h | High | mission_created, mission_started, mission_completed |
| 0B-8 | Define checkpoint event schemas (4 types) | 3h | Medium | checkpoint_created, context_compacted, etc. |
| 0B-9 | Define coordination event schemas (6 types) | 4h | High | coordinator_decision, pilot_spawned, etc. |
| 0B-10 | Create discriminated union of all events | 4h | High | `FleetEventSchema` with 30+ event types |
| 0B-11 | Create event helpers (createEvent, isEventType) | 4h | High | Helper functions with validation |
| 0B-12 | Create main exports and tests | 4h | Medium | All exports available, tests pass |
| **Total** | | **40h** | | |

**File Structure:**
```
packages/events/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Main exports
│   ├── types/
│   │   ├── index.ts      # Type exports
│   │   ├── base.ts       # Base event schema
│   │   ├── pilots.ts     # Pilot event schemas
│   │   ├── messages.ts   # Message event schemas
│   │   ├── reservations.ts # Reservation event schemas
│   │   ├── sorties.ts    # Sortie event schemas
│   │   ├── missions.ts   # Mission event schemas
│   │   ├── checkpoints.ts # Checkpoint event schemas
│   │   └── coordination.ts # Coordination event schemas
│   ├── helpers.ts        # createEvent, isEventType, validateEvent
│   ├── store.ts          # EventStore class
│   ├── projections/
│   │   ├── index.ts      # Unified projection handler
│   │   ├── pilots.ts     # Pilot projection
│   │   ├── messages.ts   # Message projection
│   │   ├── sorties.ts    # Sortie projection
│   │   ├── missions.ts   # Mission projection
│   │   └── checkpoints.ts # Checkpoint projection
│   ├── replay.ts         # Event replay logic
│   └── __tests__/
│       ├── types.test.ts
│       ├── helpers.test.ts
│       ├── store.test.ts
│       ├── projections.test.ts
│       └── replay.test.ts
└── README.md
```

### Stream 0C: Event Store (Priority: 4)
**Total Effort**: 4 days | **Tasks**: 10 | **Dependencies**: 0A, 0B

| Task ID | Description | Effort | Complexity | Completion Criteria |
|---------|-------------|--------|------------|---------------------|
| 0C-1 | Create EventStore class with append/query | 6h | High | `EventStore.append()` and `EventStore.query()` work |
| 0C-2 | Create pilot projection handler | 3h | Medium | Updates pilots table from pilot events |
| 0C-3 | Create message projection handler | 3h | Medium | Updates messages table from message events |
| 0C-4 | Create sortie projection handler | 4h | Medium | Updates sorties table from sortie events |
| 0C-5 | Create mission projection handler | 4h | Medium | Updates missions table from mission events |
| 0C-6 | Create checkpoint projection handler | 3h | Medium | Updates checkpoints table from checkpoint events |
| 0C-7 | Create unified projection handler | 2h | Low | `handleEvent()` routes to all handlers |
| 0C-8 | Create event replay logic | 4h | High | `replayEvents()` rebuilds projections |
| 0C-9 | Update main exports | 1h | Low | Store and projections exported |
| 0C-10 | Write integration tests | 6h | High | End-to-end event flow tests pass |
| **Total** | | **36h** | | |

## Parallel Execution Strategy

### Week-by-Week Timeline

```
Week 1: Foundation (Days 1-5)
┌─────────────────────────────────────────────────────────────┐
│ Stream 0D: Core Types      ████████████████████████████████ │
│ Stream 0A: Database         ████████████████████████████████ │
└─────────────────────────────────────────────────────────────┘

Week 2: Events Layer (Days 6-10)
┌─────────────────────────────────────────────────────────────┐
│ Stream 0B: Event Types    ████████████████████████████████ │
│ Stream 0A: Complete migration testing                     │
└─────────────────────────────────────────────────────────────┘

Week 3: Storage Layer (Days 11-15)
┌─────────────────────────────────────────────────────────────┐
│ Stream 0C: Event Store     ████████████████████████████████ │
│ Stream integration testing                                 │
└─────────────────────────────────────────────────────────────┘

Week 4: Integration & Optimization (Days 16-20)
┌─────────────────────────────────────────────────────────────┐
│ Integration testing          ███████████████████████████████ │
│ Performance optimization     ███████████████████████████████ │
│ Documentation completion     ███████████████████████████████ │
└─────────────────────────────────────────────────────────────┘
```

### Parallel Execution Matrix

| Day | Stream 0D | Stream 0A | Stream 0B | Stream 0C | Integration |
|-----|-----------|-----------|-----------|-----------|-------------|
| 1   | 0D-1,0D-2 | 0A-1,0A-2 | - | - | - |
| 2   | 0D-3,0D-4 | 0A-3,0A-4 | - | - | - |
| 3   | 0D-5,0D-6 | 0A-5,0A-6 | - | - | - |
| 4   | Testing | 0A-7,0A-8 | - | - | - |
| 5   | Complete | 0A-9,0A-10 | - | - | Setup CI |
| 6   | - | Migration tests | 0B-1,0B-2 | - | - |
| 7   | - | - | 0B-3,0B-4 | - | - |
| 8   | - | - | 0B-5,0B-6 | - | - |
| 9   | - | - | 0B-7,0B-8 | - | - |
| 10  | - | - | 0B-9,0B-10 | - | - |
| 11  | - | - | 0B-11,0B-12 | 0C-1 | - |
| 12  | - | - | - | 0C-2,0C-3 | - |
| 13  | - | - | - | 0C-4,0C-5 | - |
| 14  | - | - | - | 0C-6,0C-7 | - |
| 15  | - | - | - | 0C-8,0C-9 | Start integration |
| 16  | - | - | - | 0C-10 | Integration tests |
| 17  | - | - | - | - | Performance testing |
| 18  | - | - | - | - | Documentation |
| 19  | - | - | - | - | Code review |
| 20  | - | - | - | - | Final verification |

### Resource Allocation

#### Stream 0D (Core Types) - 2 Developer-Days
- **Skill Requirements**: TypeScript expertise, package management
- **Complexity**: Low to Medium (foundational but straightforward)
- **Risk**: Low (no dependencies, well-understood patterns)

#### Stream 0A (Database) - 3 Developer-Days  
- **Skill Requirements**: Drizzle ORM, SQLite, database design
- **Complexity**: Medium (schema design, migrations)
- **Risk**: Medium (database compatibility, migration issues)

#### Stream 0B (Event Types) - 3 Developer-Days
- **Skill Requirements**: Zod validation, TypeScript types, domain modeling
- **Complexity**: High (30+ event types, discriminated unions)
- **Risk**: High (type system complexity, validation performance)

#### Stream 0C (Event Store) - 4 Developer-Days
- **Skill Requirements**: Event sourcing, database operations, performance optimization
- **Complexity**: High (projections, replay, performance)
- **Risk**: High (performance requirements, integration complexity)

## Quality Gates and Verification

### Automated Testing Strategy

#### Continuous Integration Pipeline
```yaml
# .github/workflows/phase0-foundation.yml
name: Phase 0 Foundation
on: [push, pull_request]

jobs:
  test-core:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: cd packages/core && bun test --coverage
      - run: cd packages/core && bunx tsc --noEmit

  test-db:
    runs-on: ubuntu-latest
    needs: test-core
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: cd packages/db && bun test
      - run: cd packages/db && bunx drizzle-kit generate

  test-events:
    runs-on: ubuntu-latest
    needs: [test-core, test-db]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: cd packages/events && bun test --coverage

  integration:
    runs-on: ubuntu-latest
    needs: [test-core, test-db, test-events]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run integration-test
      - run: bun run performance-benchmark
```

#### Package-Specific Verification Commands

**packages/core verification:**
```bash
# Build verification
bun install && bun run build && bunx tsc --noEmit

# Test verification  
bun test --coverage --reporter=verbose

# API verification
bun -e "
import { generateCallsign, generateSortieId, nowIso } from './dist/index.js';
console.log('IDs:', generateCallsign(), generateSortieId());
console.log('Time:', nowIso());
"
```

**packages/db verification:**
```bash
# Build verification
bun install && bun run build && bunx tsc --noEmit

# Migration verification
bunx drizzle-kit generate && bunx drizzle-kit migrate

# Database connectivity test
bun -e "
import { createFleetDb, createInMemoryDb } from './dist/index.js';
const db = createInMemoryDb();
console.log('DB Connection:', !!db);
"
```

**packages/events verification:**
```bash
# Build verification
bun install && bun run build && bunx tsc --noEmit

# Event validation test
bun -e "
import { createEvent, validateEvent, FleetEventSchema } from './dist/index.js';
const event = createEvent('pilot_registered', {
  project_key: '/test',
  callsign: 'viper-1'
});
console.log('Event valid:', FleetEventSchema.safeParse(event).success);
"
```

#### Performance Benchmarks

**Event Store Performance Test:**
```typescript
// tests/performance/store.test.ts
describe('EventStore Performance', () => {
  test('append latency < 5ms', async () => {
    const store = EventStore.fromDb(createInMemoryDb());
    const event = createEvent('pilot_registered', testPilotData);
    
    const start = performance.now();
    await store.append(event, '/test');
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(5);
  });

  test('query latency < 5ms for 100 events', async () => {
    const store = EventStore.fromDb(createInMemoryDb());
    
    // Insert 100 events
    for (let i = 0; i < 100; i++) {
      await store.append(createEvent('pilot_registered', testPilotData), '/test');
    }
    
    const start = performance.now();
    const events = await store.query({ project_key: '/test', limit: 100 });
    const duration = performance.now() - start;
    
    expect(events).toHaveLength(100);
    expect(duration).toBeLessThan(5);
  });

  test('bulk replay > 100 events/second', async () => {
    const db = createInMemoryDb();
    const events = Array.from({ length: 1000 }, (_, i) => 
      createEvent('pilot_registered', { ...testPilotData, index: i })
    );
    
    const start = performance.now();
    await replayEvents(db, events, '/test');
    const duration = performance.now() - start;
    
    const eventsPerSecond = events.length / (duration / 1000);
    expect(eventsPerSecond).toBeGreaterThan(100);
  });
});
```

### Quality Gate Criteria

#### Type Safety Gates
```bash
# Strict TypeScript compilation (no errors)
bunx tsc --noEmit --strict

# No any types in production code
grep -r "any" packages/*/src --exclude-dir=__tests__ && exit 1

# All exports properly typed
bunx tsc --noEmit --declaration --declarationMap
```

#### Code Quality Gates
```bash
# Linting (no errors)
bunx eslint packages/*/src --ext .ts

# Formatting (no changes)
bunx prettier --check packages/*/src

# Import organization
bunx eslint packages/*/src --rule 'import/order: error'
```

#### Test Coverage Gates
```bash
# 95%+ coverage for all packages
bun test --coverage --threshold=95

# Integration tests pass
bun test integration.test.ts

# Performance tests pass
bun test performance.test.ts
```

## Risk Mitigation Strategies

### Technical Risk Mitigation

#### Drizzle + libSQL Compatibility
**Risk**: Medium | **Impact**: Migration issues, performance problems
**Mitigation**:
- Use existing proven patterns from research phase
- Create comprehensive integration tests for all database operations
- Implement fallback mechanisms for connection issues
- Use WAL mode and proper connection pooling

```typescript
// Connection resilience pattern
export function createFleetDb(options: CreateDbOptions): FleetDB {
  const db = drizzle(sqlite(options.databasePath), {
    logger: process.env.NODE_ENV === 'development'
  });
  
  // Connection validation
  if (!db) {
    throw new Error('Failed to initialize database connection');
  }
  
  return db;
}
```

#### Zod Validation Performance
**Risk**: Low | **Impact**: Event processing slowdown
**Mitigation**:
- Efficient schema design with minimal nesting
- Lazy validation only when needed
- Schema compilation and caching

```typescript
// Efficient validation pattern
const compiledSchemas = new Map<string, z.ZodSchema>();

export function validateEvent(event: unknown): FleetEvent {
  const schemaKey = event?.type;
  
  if (!compiledSchemas.has(schemaKey)) {
    const schema = getEventSchema(schemaKey);
    compiledSchemas.set(schemaKey, schema);
  }
  
  return compiledSchemas.get(schemaKey)!.parse(event);
}
```

#### SQLite Concurrency Issues
**Risk**: Medium | **Impact**: Database locking, performance degradation
**Mitigation**:
- Enable WAL mode by default
- Implement connection pooling
- Use transactions for consistency
- Proper error handling for SQLITE_BUSY

```typescript
// Connection pooling pattern
const connectionPool = new Map<string, Database>();

export function getDatabaseConnection(projectPath: string): Database {
  if (!connectionPool.has(projectPath)) {
    const db = new Database(`${projectPath}/.fleet/fleet.db`);
    db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');
    connectionPool.set(projectPath, db);
  }
  return connectionPool.get(projectPath)!;
}
```

### Integration Risk Mitigation

#### Package Dependency Conflicts
**Risk**: Medium | **Impact**: Build failures, runtime errors
**Mitigation**:
- Workspace dependency management with bun
- Version pinning for critical dependencies
- Automated dependency audits
- Continuous integration with all package combinations

```json
// Root package.json workspace config
{
  "workspaces": [
    "packages/*"
  ],
  "dependencies": {
    "typescript": "5.9.3",
    "bun-types": "latest"
  }
}
```

#### Event Type Mismatch
**Risk**: High | **Impact**: Data corruption, system crashes
**Mitigation**:
- Discriminated unions for compile-time safety
- Runtime validation for all events
- Comprehensive type guards
- Schema versioning and migration strategy

```typescript
// Type-safe event handling
export function handleEvent(db: FleetDB, event: FleetEvent, projectKey: string) {
  switch (event.type) {
    case 'pilot_registered':
      return handlePilotRegistered(db, event, projectKey);
    case 'pilot_active':
      return handlePilotActive(db, event, projectKey);
    // ... all event types
    default:
      // TypeScript error if event type not handled
      const _exhaustiveCheck: never = event;
      throw new Error(`Unknown event type: ${event.type}`);
  }
}
```

### Development Process Risks

#### Parallel Execution Conflicts
**Risk**: Medium | **Impact**: Integration delays, merge conflicts
**Mitigation**:
- Clear interface contracts between streams
- Daily sync meetings for stream owners
- Feature branch isolation with clear merge order
- Automated integration testing

#### Skill Requirements Gap
**Risk**: Medium | **Impact**: Quality issues, timeline delays
**Mitigation**:
- Detailed implementation guides for each stream
- Code review checklist for specific technologies
- Knowledge sharing sessions
- Pair programming for complex tasks

## Integration Testing Strategy

### End-to-End Test Scenarios

#### Complete Event Flow Test
```typescript
describe('End-to-End Event Flow', () => {
  test('pilot registration → mission creation → sortie execution', async () => {
    // Setup
    const db = createFleetDb({ projectPath: '/tmp/test' });
    const store = EventStore.fromDb(db);
    
    // Step 1: Register pilot
    const pilotEvent = createEvent('pilot_registered', {
      project_key: '/tmp/test',
      callsign: 'viper-1',
      program: 'opencode',
      model: 'claude-sonnet'
    });
    
    const pilotStored = await store.append(pilotEvent, '/tmp/test');
    expect(pilotStored.callsign).toBe('viper-1');
    
    // Step 2: Create mission
    const missionEvent = createEvent('mission_created', {
      project_key: '/tmp/test',
      mission_id: generateMissionId(),
      title: 'Test Mission',
      description: 'Integration test mission'
    });
    
    await store.append(missionEvent, '/tmp/test');
    
    // Step 3: Create and start sortie
    const sortieEvent = createEvent('sortie_created', {
      project_key: '/tmp/test',
      sortie_id: generateSortieId(),
      mission_id: missionEvent.mission_id,
      title: 'Test Sortie',
      assigned_to: 'viper-1'
    });
    
    await store.append(sortieEvent, '/tmp/test');
    
    const startEvent = createEvent('sortie_started', {
      project_key: '/tmp/test',
      sortie_id: sortieEvent.sortie_id
    });
    
    await store.append(startEvent, '/tmp/test');
    
    // Verification
    const pilots = await db.select().from(pilotsTable);
    expect(pilots).toHaveLength(1);
    expect(pilots[0].callsign).toBe('viper-1');
    
    const missions = await db.select().from(missionsTable);
    expect(missions).toHaveLength(1);
    expect(missions[0].title).toBe('Test Mission');
    
    const sorties = await db.select().from(sortiesTable);
    expect(sorties).toHaveLength(1);
    expect(sorties[0].assigned_to).toBe('viper-1');
    expect(sorties[0].status).toBe('in_progress');
  });
});
```

#### Cross-Package Type Safety Test
```typescript
describe('Cross-Package Type Safety', () => {
  test('types work together across packages', () => {
    const callsign = generateCallsign(); // from @fleettools/core
    const sortieId = generateSortieId(); // from @fleettools/core
    const missionId = generateMissionId(); // from @fleettools/core
    
    // Event creation accepts core types
    const pilotEvent = createEvent('pilot_registered', {
      project_key: '/test',
      callsign, // TypeScript accepts this
      program: 'opencode',
      model: 'claude-sonnet'
    });
    
    const sortieEvent = createEvent('sortie_created', {
      project_key: '/test',
      sortie_id: sortieId, // TypeScript accepts this
      mission_id: missionId,
      title: 'Test Sortie'
    });
    
    // Type guards work correctly
    expect(isEventType(pilotEvent, 'pilot_registered')).toBe(true);
    expect(isEventType(pilotEvent, 'sortie_created')).toBe(false);
  });
});
```

### Performance Test Scenarios

#### Load Testing
```typescript
describe('Load Testing', () => {
  test('concurrent event append performance', async () => {
    const store = EventStore.fromDb(createInMemoryDb());
    const concurrentAppends = 10;
    const eventsPerAppend = 100;
    
    const promises = Array.from({ length: concurrentAppends }, async (_, i) => {
      const events = Array.from({ length: eventsPerAppend }, (_, j) => 
        createEvent('pilot_registered', {
          project_key: `/test/${i}`,
          callsign: `pilot-${i}-${j}`,
          program: 'test',
          model: 'test-model'
        })
      );
      
      const start = performance.now();
      for (const event of events) {
        await store.append(event, `/test/${i}`);
      }
      return performance.now() - start;
    });
    
    const durations = await Promise.all(promises);
    const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
    
    // Each concurrent batch should complete in reasonable time
    expect(avgDuration).toBeLessThan(1000); // 1 second
  });
});
```

## Success Criteria and Deliverables

### Package Completion Criteria

#### packages/core Success Metrics
```bash
# Build success
cd packages/core && bun run build
# Output: No TypeScript errors, dist/ directory created

# Test coverage
cd packages/core && bun test --coverage
# Output: 95%+ line coverage, all tests pass

# API functionality
cd packages/core && bun -e "
import { generateCallsign, nowIso } from './dist/index.js';
console.log('✓ ID generation:', generateCallsign().startsWith('callsign-'));
console.log('✓ Timestamp format:', nowIso().match(/^\d{4}-\d{2}-\d{2}T/));
"
# Output: ✓ ID generation: true, ✓ Timestamp format: true
```

#### packages/db Success Metrics
```bash
# Database creation and migration
cd packages/db && bunx drizzle-kit generate
# Output: Migration files created successfully

# Schema validation
cd packages/db && bun -e "
import { createFleetDb, eventsTable, pilotsTable } from './dist/index.js';
const db = createFleetDb({ projectPath: '/tmp/test' });
console.log('✓ Database created:', !!db);
console.log('✓ Schema valid:', !!(eventsTable && pilotsTable));
"
# Output: ✓ Database created: true, ✓ Schema valid: true

# Performance test
cd packages/db && bun test --timeout=5000
# Output: All database tests pass within 5 seconds
```

#### packages/events Success Metrics
```bash
# Event validation
cd packages/events && bun -e "
import { createEvent, FleetEventSchema } from './dist/index.js';
const event = createEvent('pilot_registered', {
  project_key: '/test',
  callsign: 'viper-1',
  program: 'opencode',
  model: 'claude-sonnet'
});
console.log('✓ Event creation:', FleetEventSchema.safeParse(event).success);
"
# Output: ✓ Event creation: true

# Event store performance
cd packages/events && bun test performance.test.ts
# Output: All performance tests pass (<5ms append, <5ms query)
```

### Integration Success Criteria

#### End-to-End Integration Verification
```typescript
// Complete integration test suite
describe('Phase 0 Integration', () => {
  test('complete workflow with all packages', async () => {
    // 1. Database setup (packages/db)
    const db = createFleetDb({ projectPath: '/tmp/integration' });
    
    // 2. ID generation (packages/core)
    const callsign = generateCallsign();
    const missionId = generateMissionId();
    const sortieId = generateSortieId();
    
    // 3. Event creation (packages/events)
    const events = [
      createEvent('pilot_registered', { project_key: '/tmp/integration', callsign, program: 'test', model: 'test' }),
      createEvent('mission_created', { project_key: '/tmp/integration', mission_id, title: 'Test Mission' }),
      createEvent('sortie_created', { project_key: '/tmp/integration', sortie_id, mission_id, title: 'Test Sortie', assigned_to: callsign })
    ];
    
    // 4. Event storage (packages/events)
    const store = EventStore.fromDb(db);
    for (const event of events) {
      await store.append(event, '/tmp/integration');
    }
    
    // 5. Projection verification (packages/events + packages/db)
    const [pilots, missions, sorties] = await Promise.all([
      db.select().from(pilotsTable),
      db.select().from(missionsTable),
      db.select().from(sortiesTable)
    ]);
    
    expect(pilots).toHaveLength(1);
    expect(missions).toHaveLength(1);
    expect(sorties).toHaveLength(1);
    
    // 6. Query performance verification
    const start = performance.now();
    const storedEvents = await store.query({ project_key: '/tmp/integration' });
    const queryDuration = performance.now() - start;
    
    expect(storedEvents).toHaveLength(3);
    expect(queryDuration).toBeLessThan(5);
  });
});
```

### Documentation Deliverables

#### Package READMEs
Each package must include:
- Installation instructions
- Quick start examples
- API reference
- Performance characteristics
- Troubleshooting guide

#### Integration Guide
`docs/phase0-integration.md` must include:
- Complete setup instructions
- Example workflows
- Performance tuning tips
- Migration strategies
- Common patterns

## Conclusion

### Implementation Readiness Assessment

**Strengths:**
- Comprehensive task breakdown with clear dependencies
- Parallel execution strategy optimized for 4-week timeline
- Quality gates with automated verification
- Risk mitigation strategies for identified challenges
- Detailed success criteria and testing approach

**Critical Success Factors:**
1. **Stream 0D completion on schedule** - Foundation for all other streams
2. **Performance benchmarks achievement** - <5ms operations are critical
3. **Type safety enforcement** - No compromises on TypeScript coverage
4. **Integration testing thoroughness** - Prevents integration issues
5. **Documentation completeness** - Ensures long-term maintainability

### Next Steps

1. **Assign stream owners** based on skill requirements
2. **Set up development environment** with CI/CD pipeline
3. **Begin Stream 0D implementation** (Days 1-2)
4. **Establish daily sync meetings** for stream coordination
5. **Implement automated testing** from Day 1

### Risk Monitoring

**High-risk areas requiring close monitoring:**
- Stream 0B event type complexity (30+ types, discriminated unions)
- Stream 0C performance requirements (<5ms operations)
- Package integration and type safety across boundaries
- Performance benchmark achievement under load

This implementation plan provides a comprehensive roadmap for successful delivery of FleetTools Phase 0 Foundation, establishing the core infrastructure for AI Agent Coordination System while maintaining high quality standards and parallel development efficiency.

---

**Implementation Plan Status:** Complete and Ready for Execution  
**Next Review:** After Stream 0D completion (Day 3)  
**Contact:** FleetTools Implementation Team