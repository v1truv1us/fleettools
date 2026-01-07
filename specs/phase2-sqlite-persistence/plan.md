# Phase 2: SQLite Event-Sourced Persistence Layer - Implementation Plan

**Date:** 2026-01-06  
**Status:** Ready for Execution  
**Confidence:** 0.92  
**Estimated Duration:** 3-4 days  
**Priority:** P0 (Critical Path)

---

## Executive Summary

This plan details the implementation of 10 tasks to build a comprehensive SQLite event-sourced persistence layer for FleetTools. The system will replace JSON file-based storage with a robust, ACID-compliant database featuring append-only event logs, materialized views, and comprehensive API endpoints.

**Key Metrics:**
- **Total Tasks:** 10
- **Estimated Effort:** 24-32 hours
- **Test Coverage Target:** 85%
- **Quality Gates:** Lint, Types, Tests, Security Scan, Build

---

## Task Breakdown

### TASK-PH2-008: Create Event Schemas with Zod Validation

**Objective:** Define and implement Zod schemas for all event types with validation

**Description:**
Create comprehensive Zod schemas for all 32+ core event types defined in the specification. These schemas will provide runtime validation for event data, ensuring type safety and data integrity.

**Acceptance Criteria:**
- [ ] All core event types have Zod schemas
- [ ] Schemas validate event structure and data types
- [ ] Custom validators for domain-specific constraints
- [ ] Schemas exported from `lib/events/schemas.ts`
- [ ] Type inference works correctly with TypeScript
- [ ] Validation errors provide helpful messages
- [ ] Tests pass with 85%+ coverage

**Event Types to Schema:**
- `specialist_registered`, `specialist_active`, `specialist_inactive`
- `squawk_sent`, `squawk_read`, `squawk_archived`
- `cursor_advanced`, `cursor_reset`
- `lock_acquired`, `lock_released`, `lock_timeout`
- `fleet_checkpointed`, `fleet_recovered`, `context_compacted`
- `specialist_spawned`, `specialist_completed`, `specialist_failed`
- And 15+ more as defined in spec

**Implementation Steps:**
1. Create `lib/events/schemas.ts` file
2. Define base event schema with common fields
3. Define specific schemas for each event type
4. Add custom validators for constraints
5. Export schemas for use in event store
6. Add comprehensive unit tests

**Testing:**
- Unit test: Validate correct event data
- Unit test: Reject invalid event data
- Unit test: Error messages are helpful
- Unit test: Type inference works

**Effort Estimate:** 4 hours  
**Dependencies:** None  
**Risk Level:** Low

---

### TASK-PH2-009: Implement Event Store with Append-Only Semantics

**Objective:** Create SQLite-backed event store with append-only semantics and causation tracking

**Description:**
Implement the core event store that persists events to SQLite with append-only semantics. Events are never updated or deleted; corrections are appended as new events. The store tracks causation chains for debugging and replay.

**Acceptance Criteria:**
- [ ] Events appended to SQLite with auto-incrementing sequence numbers
- [ ] Causation tracking: each event links to its cause
- [ ] Immutability enforced: no updates or deletes
- [ ] Concurrent access safe with WAL mode
- [ ] Event retrieval by ID, stream, or sequence range
- [ ] Efficient indexing on common queries
- [ ] Tests pass with 85%+ coverage

**Database Schema:**
```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  stream_id TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  causation_id INTEGER,
  correlation_id TEXT,
  data JSONB NOT NULL,
  metadata JSONB,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(stream_id, sequence_number),
  FOREIGN KEY(causation_id) REFERENCES events(id)
);

CREATE INDEX idx_events_stream_id ON events(stream_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_correlation_id ON events(correlation_id);
```

**Implementation Steps:**
1. Create database schema with proper indexes
2. Implement `EventStore` class with append method
3. Implement event retrieval methods (byId, byStream, byRange)
4. Add causation tracking
5. Implement transaction support for atomic operations
6. Add comprehensive error handling
7. Write unit and integration tests

**Testing:**
- Unit test: Append events successfully
- Unit test: Retrieve events by various criteria
- Unit test: Causation tracking works
- Integration test: Concurrent appends are safe
- Integration test: WAL mode enables concurrent reads

**Effort Estimate:** 6 hours  
**Dependencies:** TASK-PH2-008  
**Risk Level:** Medium

---

### TASK-PH2-010: Implement Projection Update System

**Objective:** Create system for maintaining materialized views from event stream

**Description:**
Implement a projection system that maintains materialized views (denormalized state) derived from the event stream. Projections are rebuilt from events and can be discarded and regenerated.

**Acceptance Criteria:**
- [ ] Projections table stores denormalized state
- [ ] Projection rebuilding from event stream
- [ ] Incremental projection updates
- [ ] Projection versioning for schema changes
- [ ] Multiple projections can coexist
- [ ] Efficient queries on projections
- [ ] Tests pass with 85%+ coverage

**Projection Types:**
- `specialists_projection`: Current specialist status
- `sorties_projection`: Current sortie state
- `missions_projection`: Current mission state
- `checkpoints_projection`: Latest checkpoint per stream

**Implementation Steps:**
1. Create projections table schema
2. Implement `ProjectionManager` class
3. Implement projection rebuilding logic
4. Implement incremental update logic
5. Add projection versioning
6. Create specific projection handlers
7. Write unit and integration tests

**Testing:**
- Unit test: Projection rebuilding from events
- Unit test: Incremental updates work correctly
- Integration test: Multiple projections coexist
- Integration test: Projection queries are efficient

**Effort Estimate:** 5 hours  
**Dependencies:** TASK-PH2-009  
**Risk Level:** Medium

---

### TASK-PH2-011: Implement Migration Script with Rollback

**Objective:** Create migration system for schema changes with rollback capability

**Description:**
Implement a migration system that allows schema changes to be applied and rolled back. This is critical for evolving the database schema as the system grows.

**Acceptance Criteria:**
- [ ] Migration files can be created and executed
- [ ] Migrations track applied versions
- [ ] Rollback capability for each migration
- [ ] Idempotent migrations (safe to re-run)
- [ ] Migration status tracking
- [ ] Error handling and recovery
- [ ] Tests pass with 85%+ coverage

**Migration Structure:**
```typescript
interface Migration {
  version: string
  name: string
  up: (db: Database) => void
  down: (db: Database) => void
}
```

**Implementation Steps:**
1. Create migrations directory structure
2. Implement migration runner
3. Create migration tracking table
4. Implement up/down execution
5. Add rollback capability
6. Create initial migration for schema
7. Write unit and integration tests

**Testing:**
- Unit test: Migrations apply correctly
- Unit test: Rollback works
- Integration test: Multiple migrations sequence correctly
- Integration test: Idempotency verified

**Effort Estimate:** 3 hours  
**Dependencies:** TASK-PH2-009  
**Risk Level:** Low

---

### TASK-PH2-012: Create Event Compaction Logic

**Objective:** Implement event log compaction to manage database size

**Description:**
Implement event compaction logic that periodically consolidates old events into snapshots, reducing database size while maintaining full replay capability.

**Acceptance Criteria:**
- [ ] Snapshots created at configurable intervals
- [ ] Snapshot contains full state at point in time
- [ ] Replay from snapshot + events works correctly
- [ ] Compaction doesn't block normal operations
- [ ] Configurable retention policy
- [ ] Tests pass with 85%+ coverage

**Implementation Steps:**
1. Create snapshots table schema
2. Implement snapshot creation logic
3. Implement replay from snapshot
4. Implement compaction scheduler
5. Add retention policy configuration
6. Add monitoring and metrics
7. Write unit and integration tests

**Testing:**
- Unit test: Snapshots created correctly
- Unit test: Replay from snapshot works
- Integration test: Compaction doesn't block operations
- Integration test: Retention policy enforced

**Effort Estimate:** 4 hours  
**Dependencies:** TASK-PH2-009, TASK-PH2-010  
**Risk Level:** Medium

---

### TASK-PH2-013: Add Specialist Management Endpoints

**Objective:** Create REST API endpoints for specialist management

**Description:**
Implement REST API endpoints for registering, querying, and managing specialists. These endpoints support the specialist registration and heartbeat user stories.

**Acceptance Criteria:**
- [ ] POST /api/v1/specialists/register - Register specialist
- [ ] GET /api/v1/specialists/:id - Get specialist details
- [ ] GET /api/v1/specialists - List all specialists
- [ ] PATCH /api/v1/specialists/:id/heartbeat - Send heartbeat
- [ ] Proper error handling and validation
- [ ] Request/response validation with Zod
- [ ] Tests pass with 85%+ coverage

**API Endpoints:**
```
POST /api/v1/specialists/register
  Request: { specialist_id, name, capabilities, metadata }
  Response: { specialist: {...} }

GET /api/v1/specialists/:id
  Response: { specialist: {...} }

GET /api/v1/specialists
  Query: ?status=active&limit=100&offset=0
  Response: { specialists: [...], total: N }

PATCH /api/v1/specialists/:id/heartbeat
  Request: { metadata?: {...} }
  Response: { specialist: {...} }
```

**Implementation Steps:**
1. Create specialist routes in API
2. Implement request validation
3. Implement specialist registration logic
4. Implement specialist query logic
5. Implement heartbeat logic
6. Add error handling
7. Write unit and integration tests

**Testing:**
- Unit test: Registration creates specialist
- Unit test: Heartbeat updates timestamp
- Integration test: API endpoints work end-to-end
- Integration test: Validation rejects invalid data

**Effort Estimate:** 4 hours  
**Dependencies:** TASK-PH2-008, TASK-PH2-009, TASK-PH2-010  
**Risk Level:** Low

---

### TASK-PH2-014: Add Sortie Management Endpoints

**Objective:** Create REST API endpoints for sortie management

**Description:**
Implement REST API endpoints for creating, querying, and managing sorties. Sorties represent units of work that can be executed by specialists.

**Acceptance Criteria:**
- [ ] POST /api/v1/sorties - Create sortie
- [ ] GET /api/v1/sorties/:id - Get sortie details
- [ ] GET /api/v1/sorties - List sorties with filtering
- [ ] PATCH /api/v1/sorties/:id - Update sortie status
- [ ] Proper error handling and validation
- [ ] Request/response validation with Zod
- [ ] Tests pass with 85%+ coverage

**API Endpoints:**
```
POST /api/v1/sorties
  Request: { mission_id, description, priority, dependencies: [...] }
  Response: { sortie: {...} }

GET /api/v1/sorties/:id
  Response: { sortie: {...} }

GET /api/v1/sorties
  Query: ?mission_id=X&status=pending&limit=100
  Response: { sorties: [...], total: N }

PATCH /api/v1/sorties/:id
  Request: { status, result?: {...} }
  Response: { sortie: {...} }
```

**Implementation Steps:**
1. Create sortie routes in API
2. Implement request validation
3. Implement sortie creation logic
4. Implement sortie query logic
5. Implement status update logic
6. Add dependency tracking
7. Write unit and integration tests

**Testing:**
- Unit test: Sortie creation works
- Unit test: Status updates work
- Integration test: API endpoints work end-to-end
- Integration test: Dependency tracking works

**Effort Estimate:** 4 hours  
**Dependencies:** TASK-PH2-008, TASK-PH2-009, TASK-PH2-010  
**Risk Level:** Low

---

### TASK-PH2-015: Add Mission Management Endpoints

**Objective:** Create REST API endpoints for mission management

**Description:**
Implement REST API endpoints for creating, querying, and managing missions. Missions are high-level goals composed of multiple sorties.

**Acceptance Criteria:**
- [ ] POST /api/v1/missions - Create mission
- [ ] GET /api/v1/missions/:id - Get mission details
- [ ] GET /api/v1/missions - List missions with filtering
- [ ] PATCH /api/v1/missions/:id - Update mission status
- [ ] Proper error handling and validation
- [ ] Request/response validation with Zod
- [ ] Tests pass with 85%+ coverage

**API Endpoints:**
```
POST /api/v1/missions
  Request: { title, description, goals: [...] }
  Response: { mission: {...} }

GET /api/v1/missions/:id
  Response: { mission: {...}, sorties: [...] }

GET /api/v1/missions
  Query: ?status=active&limit=100
  Response: { missions: [...], total: N }

PATCH /api/v1/missions/:id
  Request: { status, result?: {...} }
  Response: { mission: {...} }
```

**Implementation Steps:**
1. Create mission routes in API
2. Implement request validation
3. Implement mission creation logic
4. Implement mission query logic
5. Implement status update logic
6. Add sortie aggregation
7. Write unit and integration tests

**Testing:**
- Unit test: Mission creation works
- Unit test: Status updates work
- Integration test: API endpoints work end-to-end
- Integration test: Sortie aggregation works

**Effort Estimate:** 4 hours  
**Dependencies:** TASK-PH2-008, TASK-PH2-009, TASK-PH2-010  
**Risk Level:** Low

---

### TASK-PH2-016: Add Checkpoint Endpoints

**Objective:** Create REST API endpoints for checkpoint management

**Description:**
Implement REST API endpoints for creating and retrieving checkpoints. Checkpoints capture the state of the system at a point in time for recovery purposes.

**Acceptance Criteria:**
- [ ] POST /api/v1/checkpoints - Create checkpoint
- [ ] GET /api/v1/checkpoints/:id - Get checkpoint details
- [ ] GET /api/v1/checkpoints - List checkpoints
- [ ] POST /api/v1/checkpoints/:id/restore - Restore from checkpoint
- [ ] Proper error handling and validation
- [ ] Request/response validation with Zod
- [ ] Tests pass with 85%+ coverage

**API Endpoints:**
```
POST /api/v1/checkpoints
  Request: { stream_id, description?: string }
  Response: { checkpoint: {...} }

GET /api/v1/checkpoints/:id
  Response: { checkpoint: {...} }

GET /api/v1/checkpoints
  Query: ?stream_id=X&limit=100
  Response: { checkpoints: [...], total: N }

POST /api/v1/checkpoints/:id/restore
  Request: { confirm: true }
  Response: { checkpoint: {...}, restored: true }
```

**Implementation Steps:**
1. Create checkpoint routes in API
2. Implement request validation
3. Implement checkpoint creation logic
4. Implement checkpoint query logic
5. Implement restore logic
6. Add checkpoint versioning
7. Write unit and integration tests

**Testing:**
- Unit test: Checkpoint creation works
- Unit test: Restore works correctly
- Integration test: API endpoints work end-to-end
- Integration test: Checkpoint versioning works

**Effort Estimate:** 3 hours  
**Dependencies:** TASK-PH2-008, TASK-PH2-009, TASK-PH2-010  
**Risk Level:** Low

---

### TASK-PH2-017: Add Event Query Endpoints

**Objective:** Create REST API endpoints for querying events

**Description:**
Implement REST API endpoints for querying the event stream. These endpoints enable debugging, auditing, and time-travel debugging capabilities.

**Acceptance Criteria:**
- [ ] GET /api/v1/events - Query events with filtering
- [ ] GET /api/v1/events/:id - Get event details
- [ ] GET /api/v1/streams/:stream_id/events - Get stream events
- [ ] Proper pagination and filtering
- [ ] Request/response validation with Zod
- [ ] Tests pass with 85%+ coverage

**API Endpoints:**
```
GET /api/v1/events
  Query: ?type=specialist_registered&limit=100&offset=0
  Response: { events: [...], total: N }

GET /api/v1/events/:id
  Response: { event: {...} }

GET /api/v1/streams/:stream_id/events
  Query: ?from_sequence=0&to_sequence=100
  Response: { events: [...], stream_id: X }
```

**Implementation Steps:**
1. Create event query routes in API
2. Implement request validation
3. Implement event filtering logic
4. Implement pagination
5. Add efficient indexing for queries
6. Add query performance optimization
7. Write unit and integration tests

**Testing:**
- Unit test: Event filtering works
- Unit test: Pagination works
- Integration test: API endpoints work end-to-end
- Integration test: Query performance acceptable

**Effort Estimate:** 3 hours  
**Dependencies:** TASK-PH2-008, TASK-PH2-009  
**Risk Level:** Low

---

## Task Dependencies

```
TASK-PH2-008 (Event Schemas)
    ↓
TASK-PH2-009 (Event Store)
    ↓
TASK-PH2-010 (Projections)
    ↓
    ├─→ TASK-PH2-011 (Migrations)
    ├─→ TASK-PH2-012 (Compaction)
    ├─→ TASK-PH2-013 (Specialist Endpoints)
    ├─→ TASK-PH2-014 (Sortie Endpoints)
    ├─→ TASK-PH2-015 (Mission Endpoints)
    ├─→ TASK-PH2-016 (Checkpoint Endpoints)
    └─→ TASK-PH2-017 (Event Query Endpoints)
```

**Critical Path:** TASK-PH2-008 → TASK-PH2-009 → TASK-PH2-010 → (TASK-PH2-013/014/015/016/017 in parallel)

---

## Testing Strategy

### Unit Tests (60% of effort)

**Test Files:**
- `tests/unit/lib/events/schemas.test.ts`
- `tests/unit/lib/events/store.test.ts`
- `tests/unit/lib/events/projections.test.ts`
- `tests/unit/lib/events/compaction.test.ts`
- `tests/unit/api/specialists.test.ts`
- `tests/unit/api/sorties.test.ts`
- `tests/unit/api/missions.test.ts`
- `tests/unit/api/checkpoints.test.ts`
- `tests/unit/api/events.test.ts`

**Coverage Target:** 85% for all modules

### Integration Tests (25% of effort)

**Test Files:**
- `tests/integration/events/store.test.ts`
- `tests/integration/events/projections.test.ts`
- `tests/integration/api/specialists.test.ts`
- `tests/integration/api/sorties.test.ts`
- `tests/integration/api/missions.test.ts`

**Coverage:** End-to-end workflows with real database

### Manual Testing (15% of effort)

**Checklist:**
- [ ] All API endpoints respond correctly
- [ ] Event stream is immutable
- [ ] Projections update correctly
- [ ] Concurrent access is safe
- [ ] Compaction works without data loss
- [ ] Checkpoints can be restored

---

## Quality Gates

### Code Quality
- **Lint:** `npm run lint` - Must pass with no warnings
- **Types:** `npm run type-check` - Must pass with no errors
- **Build:** `npm run build` - Must succeed

### Testing
- **Unit Tests:** `npm test -- tests/unit/` - Must pass
- **Integration Tests:** `npm test -- tests/integration/` - Must pass
- **Coverage:** Must achieve ≥85% coverage

### Security
- **Security Scan:** `npm audit` - No critical vulnerabilities
- **SQL Injection:** All queries use parameterized statements
- **Data Validation:** All inputs validated with Zod

---

## Risk Assessment

### Medium Risk Items
- TASK-PH2-009: Event store implementation (core system)
- TASK-PH2-010: Projection system (complex state management)
- TASK-PH2-012: Compaction logic (data integrity critical)

**Mitigation Strategies:**
1. **Comprehensive Testing:** Extensive unit and integration tests
2. **Code Review:** Peer review before merging
3. **Gradual Rollout:** Feature flags for new functionality
4. **Monitoring:** Track event store performance and errors

### Low Risk Items
- TASK-PH2-008: Schema definitions
- TASK-PH2-011: Migration system
- TASK-PH2-013 to TASK-PH2-017: API endpoints

---

## Success Criteria

**Phase 2 is complete when:**
1. ✅ All 10 tasks completed
2. ✅ All quality gates passing (lint, types, tests, build, security)
3. ✅ Test coverage ≥85% for all modules
4. ✅ All acceptance criteria met for each task
5. ✅ Code review approved
6. ✅ Manual testing verified
7. ✅ Performance benchmarks met

---

## Effort Summary

| Task | Estimate | Actual | Status |
|------|----------|--------|--------|
| TASK-PH2-008 | 4 hours | - | Pending |
| TASK-PH2-009 | 6 hours | - | Pending |
| TASK-PH2-010 | 5 hours | - | Pending |
| TASK-PH2-011 | 3 hours | - | Pending |
| TASK-PH2-012 | 4 hours | - | Pending |
| TASK-PH2-013 | 4 hours | - | Pending |
| TASK-PH2-014 | 4 hours | - | Pending |
| TASK-PH2-015 | 4 hours | - | Pending |
| TASK-PH2-016 | 3 hours | - | Pending |
| TASK-PH2-017 | 3 hours | - | Pending |
| **TOTAL** | **40 hours** | - | **Pending** |

---

## Next Phase

Upon completion of Phase 2, proceed to **Phase 3: Context Survival System** which depends on Phase 2 being complete.

---

**Plan Status:** Ready for Execution  
**Last Updated:** 2026-01-06  
**Confidence:** 0.92
