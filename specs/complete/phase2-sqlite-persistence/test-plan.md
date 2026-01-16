# Phase 2: SQLite Persistence - TDD Test Plan

**Version:** 1.0.0  
**Status:** Ready for Implementation  
**Date:** 2026-01-04  
**Coverage Target:** 95% line, 95% function, 90% branch

---

## 1. Overview

### 1.1 Architecture Summary

Phase 2 implements SQLite-only persistence for FleetTools, replacing all JSON file-based storage. The architecture follows an event-sourced pattern with:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SQLite-Only Architecture                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   API Layer  │───▶│  Operations  │───▶│   SQLite DB  │          │
│  │   (Hono)     │    │  (Interfaces)│    │   (WAL Mode) │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                   │                    │                  │
│         │            ┌──────┴──────┐             │                  │
│         │            │             │             │                  │
│         ▼            ▼             ▼             ▼                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Events   │  │ Missions │  │ Sorties  │  │  Locks   │           │
│  │ (append) │  │  (CRUD)  │  │  (CRUD)  │  │ (acquire)│           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **SQLite-Only** | No JSON legacy support - clean architecture |
| **WAL Mode** | Concurrent reads, single writer, crash recovery |
| **Event Sourcing** | Append-only log for audit trail and replay |
| **Materialized Views** | Projections for efficient queries |
| **Interface-First** | Enables parallel Phase 3 development |

### 1.3 Test Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Test Pyramid                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                          ┌─────┐                                    │
│                         /  E2E  \         5 tests (5%)              │
│                        /─────────\                                  │
│                       / Integration\      20 tests (20%)            │
│                      /──────────────\                               │
│                     /     Unit       \    77 tests (75%)            │
│                    /──────────────────\                             │
│                                                                      │
│  Total: 102 tests targeting 95%+ coverage                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Test Categories

### 2.1 Coverage Targets by Category

| Category | Tests | Line % | Function % | Branch % |
|----------|-------|--------|------------|----------|
| SQLite Connection | 5 | 100% | 100% | 100% |
| Mission Operations | 12 | 95% | 95% | 90% |
| Sortie Operations | 15 | 95% | 95% | 90% |
| Lock Operations | 10 | 95% | 95% | 90% |
| Event Operations | 8 | 95% | 95% | 90% |
| Event Schemas | 32 | 95% | 95% | 90% |
| API Endpoints | 20 | 95% | 95% | 90% |
| **Total** | **102** | **95%** | **95%** | **90%** |

---

## 3. Detailed Test Cases

### 3.1 SQLite Connection Tests (5 tests)

**File:** `tests/unit/phase2/sqlite/connection.test.ts`

| ID | Test Case | Description | AC Reference |
|----|-----------|-------------|--------------|
| CONN-001 | should create database with WAL mode | Verify PRAGMA journal_mode = WAL | NFR-7.1 |
| CONN-002 | should initialize schema on first connection | Run CREATE TABLE statements | US-001 |
| CONN-003 | should handle concurrent read connections | Multiple readers via WAL | NFR-7.3 |
| CONN-004 | should respect busy timeout | 5 second timeout on contention | NFR-7.3 |
| CONN-005 | should create project-specific database path | Hash-based isolation | 1.3 Target State |

```typescript
// Example test structure
describe('SQLite Connection', () => {
  describe('initialization', () => {
    it('should create database with WAL mode', async () => {
      const db = createTestDatabase();
      const result = db.query("PRAGMA journal_mode").get();
      expect(result.journal_mode).toBe('wal');
    });

    it('should initialize schema on first connection', async () => {
      const db = createTestDatabase();
      const tables = db.query(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all();
      expect(tables.map(t => t.name)).toContain('events');
      expect(tables.map(t => t.name)).toContain('missions');
      expect(tables.map(t => t.name)).toContain('sorties');
    });
  });
});
```

---

### 3.2 Mission Operations Tests (12 tests)

**File:** `tests/unit/phase2/operations/mission.test.ts`

| ID | Test Case | Description | AC Reference |
|----|-----------|-------------|--------------|
| MSN-001 | should create mission with unique ID | Generate mission_id | US-015 AC-1 |
| MSN-002 | should emit mission_created event | Event sourcing | US-015 AC-2 |
| MSN-003 | should set initial status to pending | Default status | US-015 AC-4 |
| MSN-004 | should start mission and update status | Status transition | US-016 AC-1 |
| MSN-005 | should emit mission_started event | Event sourcing | US-016 AC-2 |
| MSN-006 | should complete mission when all sorties done | Completion logic | US-017 AC-1 |
| MSN-007 | should emit mission_completed event | Event sourcing | US-017 AC-2 |
| MSN-008 | should reject completion with incomplete sorties | Validation | US-017 AC-3 |
| MSN-009 | should record mission duration | Metrics | US-017 AC-4 |
| MSN-010 | should list missions by status | Query projection | API-6.3 |
| MSN-011 | should get mission by ID | Query projection | API-6.3 |
| MSN-012 | should update mission metadata | PATCH operation | API-6.3 |

```typescript
describe('MissionOps', () => {
  let db: TestDatabase;
  let missionOps: MissionOps;

  beforeEach(() => {
    db = createTestDatabase();
    missionOps = createMissionOps(db);
  });

  describe('create()', () => {
    it('should create mission with unique ID', async () => {
      const mission = await missionOps.create({
        title: 'Test Mission',
        description: 'Test description',
        priority: 'high'
      });

      expect(mission.id).toMatch(/^msn-[a-z0-9]+$/);
      expect(mission.title).toBe('Test Mission');
      expect(mission.status).toBe('pending');
    });

    it('should emit mission_created event', async () => {
      const mission = await missionOps.create({
        title: 'Test Mission'
      });

      const events = await db.getEvents('mission', mission.id);
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe('mission_created');
    });
  });

  describe('start()', () => {
    it('should start mission and update status', async () => {
      const mission = await missionOps.create({ title: 'Test' });
      const started = await missionOps.start(mission.id);

      expect(started.status).toBe('in_progress');
      expect(started.started_at).toBeDefined();
    });
  });

  describe('complete()', () => {
    it('should reject completion with incomplete sorties', async () => {
      const mission = await missionOps.create({ title: 'Test' });
      await sortieOps.create({ mission_id: mission.id, title: 'Sortie 1' });
      await missionOps.start(mission.id);

      await expect(missionOps.complete(mission.id))
        .rejects.toThrow('Cannot complete mission with incomplete sorties');
    });
  });
});
```

---

### 3.3 Sortie Operations Tests (15 tests)

**File:** `tests/unit/phase2/operations/sortie.test.ts`

| ID | Test Case | Description | AC Reference |
|----|-----------|-------------|--------------|
| SRT-001 | should create sortie with unique ID | Generate sortie_id | US-010 AC-1 |
| SRT-002 | should emit sortie_created event | Event sourcing | US-010 AC-2 |
| SRT-003 | should link sortie to parent mission | Foreign key | US-010 AC-3 |
| SRT-004 | should set initial status to pending | Default status | US-010 AC-4 |
| SRT-005 | should start sortie and update status | Status transition | US-011 AC-1 |
| SRT-006 | should emit sortie_started event | Event sourcing | US-011 AC-2 |
| SRT-007 | should only allow assigned specialist to start | Authorization | US-011 AC-4 |
| SRT-008 | should report progress (0-100) | Progress tracking | US-012 AC-1 |
| SRT-009 | should emit sortie_progress event | Event sourcing | US-012 AC-2 |
| SRT-010 | should complete sortie and record duration | Completion | US-013 AC-1,3 |
| SRT-011 | should emit sortie_completed event | Event sourcing | US-013 AC-2 |
| SRT-012 | should block sortie with reason | Blocking | US-014 AC-1,3 |
| SRT-013 | should emit sortie_blocked event | Event sourcing | US-014 AC-2 |
| SRT-014 | should list sorties by mission | Query projection | API-6.3 |
| SRT-015 | should list sorties by status | Query projection | API-6.3 |

```typescript
describe('SortieOps', () => {
  let db: TestDatabase;
  let sortieOps: SortieOps;
  let missionOps: MissionOps;

  beforeEach(() => {
    db = createTestDatabase();
    sortieOps = createSortieOps(db);
    missionOps = createMissionOps(db);
  });

  describe('create()', () => {
    it('should create sortie with unique ID', async () => {
      const mission = await missionOps.create({ title: 'Parent Mission' });
      const sortie = await sortieOps.create({
        mission_id: mission.id,
        title: 'Test Sortie',
        assigned_to: 'specialist-1'
      });

      expect(sortie.id).toMatch(/^srt-[a-z0-9]+$/);
      expect(sortie.mission_id).toBe(mission.id);
      expect(sortie.status).toBe('pending');
    });
  });

  describe('start()', () => {
    it('should only allow assigned specialist to start', async () => {
      const mission = await missionOps.create({ title: 'Test' });
      const sortie = await sortieOps.create({
        mission_id: mission.id,
        title: 'Test Sortie',
        assigned_to: 'specialist-1'
      });

      await expect(sortieOps.start(sortie.id, 'specialist-2'))
        .rejects.toThrow('Only assigned specialist can start sortie');
    });
  });

  describe('progress()', () => {
    it('should report progress (0-100)', async () => {
      const mission = await missionOps.create({ title: 'Test' });
      const sortie = await sortieOps.create({
        mission_id: mission.id,
        title: 'Test Sortie',
        assigned_to: 'specialist-1'
      });
      await sortieOps.start(sortie.id, 'specialist-1');

      const updated = await sortieOps.progress(sortie.id, 50, 'Halfway done');

      expect(updated.progress).toBe(50);
    });

    it('should reject progress > 100', async () => {
      const mission = await missionOps.create({ title: 'Test' });
      const sortie = await sortieOps.create({
        mission_id: mission.id,
        title: 'Test Sortie'
      });

      await expect(sortieOps.progress(sortie.id, 150))
        .rejects.toThrow('Progress must be between 0 and 100');
    });
  });
});
```

---

### 3.4 Lock Operations Tests (10 tests)

**File:** `tests/unit/phase2/operations/lock.test.ts`

| ID | Test Case | Description | AC Reference |
|----|-----------|-------------|--------------|
| LCK-001 | should acquire lock on available file | Lock acquisition | US-007 AC-1 |
| LCK-002 | should emit ctk_reserved event | Event sourcing | US-007 AC-2 |
| LCK-003 | should return lock ID and expiration | Lock metadata | US-007 AC-3 |
| LCK-004 | should return 409 on conflict | Conflict detection | US-007 AC-4 |
| LCK-005 | should include file checksum | Conflict detection | US-007 AC-5 |
| LCK-006 | should release lock if owned | Lock release | US-008 AC-1 |
| LCK-007 | should emit ctk_released event | Event sourcing | US-008 AC-2 |
| LCK-008 | should return 403 if not owner | Authorization | US-008 AC-3 |
| LCK-009 | should emit ctk_conflict event | Conflict tracking | US-009 AC-1 |
| LCK-010 | should auto-expire locks after timeout | Expiration | NFR-7.3 |

```typescript
describe('LockOps', () => {
  let db: TestDatabase;
  let lockOps: LockOps;

  beforeEach(() => {
    db = createTestDatabase();
    lockOps = createLockOps(db);
  });

  describe('acquire()', () => {
    it('should acquire lock on available file', async () => {
      const lock = await lockOps.acquire({
        file: '/src/index.ts',
        specialist_id: 'specialist-1',
        timeout_ms: 30000
      });

      expect(lock.id).toBeDefined();
      expect(lock.file).toBe('/src/index.ts');
      expect(lock.reserved_by).toBe('specialist-1');
      expect(lock.status).toBe('active');
    });

    it('should return 409 on conflict', async () => {
      await lockOps.acquire({
        file: '/src/index.ts',
        specialist_id: 'specialist-1',
        timeout_ms: 30000
      });

      const result = await lockOps.acquire({
        file: '/src/index.ts',
        specialist_id: 'specialist-2',
        timeout_ms: 30000
      });

      expect(result.conflict).toBe(true);
      expect(result.existing_lock.reserved_by).toBe('specialist-1');
    });
  });

  describe('release()', () => {
    it('should return 403 if not owner', async () => {
      const lock = await lockOps.acquire({
        file: '/src/index.ts',
        specialist_id: 'specialist-1',
        timeout_ms: 30000
      });

      await expect(lockOps.release(lock.id, 'specialist-2'))
        .rejects.toThrow('Only lock owner can release');
    });
  });

  describe('expiration', () => {
    it('should auto-expire locks after timeout', async () => {
      // Create lock with 1ms timeout for testing
      await lockOps.acquire({
        file: '/src/index.ts',
        specialist_id: 'specialist-1',
        timeout_ms: 1
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const activeLocks = await lockOps.getActive();
      expect(activeLocks).toHaveLength(0);
    });
  });
});
```

---

### 3.5 Event Operations Tests (8 tests)

**File:** `tests/unit/phase2/operations/event.test.ts`

| ID | Test Case | Description | AC Reference |
|----|-----------|-------------|--------------|
| EVT-001 | should append event with sequence number | Append-only | 1.4 Principle 1 |
| EVT-002 | should generate unique event_id | Identity | Schema 3.1 |
| EVT-003 | should track causation_id chain | Causation | Schema 3.1 |
| EVT-004 | should track correlation_id | Correlation | Schema 3.1 |
| EVT-005 | should query events by stream | Stream replay | Index Strategy |
| EVT-006 | should query events by type | Type queries | Index Strategy |
| EVT-007 | should query events after sequence | Pagination | API-6.4 |
| EVT-008 | should validate event schema | Zod validation | Section 4 |

```typescript
describe('EventOps', () => {
  let db: TestDatabase;
  let eventOps: EventOps;

  beforeEach(() => {
    db = createTestDatabase();
    eventOps = createEventOps(db);
  });

  describe('append()', () => {
    it('should append event with sequence number', async () => {
      const event = await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-123',
        data: { title: 'Test Mission' }
      });

      expect(event.sequence_number).toBe(1);

      const event2 = await eventOps.append({
        event_type: 'mission_started',
        stream_type: 'mission',
        stream_id: 'msn-123',
        data: {},
        causation_id: event.event_id
      });

      expect(event2.sequence_number).toBe(2);
      expect(event2.causation_id).toBe(event.event_id);
    });
  });

  describe('getByStream()', () => {
    it('should query events by stream', async () => {
      await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-123',
        data: {}
      });
      await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-456',
        data: {}
      });

      const events = await eventOps.getByStream('mission', 'msn-123');
      expect(events).toHaveLength(1);
      expect(events[0].stream_id).toBe('msn-123');
    });
  });
});
```

---

### 3.6 Event Schema Tests (32 tests)

**File:** `tests/unit/phase2/events/schemas.test.ts`

Tests for all 32 event types defined in the specification:

| Category | Event Types | Test Count |
|----------|-------------|------------|
| Specialist (2) | specialist_registered, specialist_active | 2 |
| Squawk (5) | squawk_sent, squawk_read, squawk_acked, squawk_thread_created, squawk_thread_activity | 5 |
| CTK (3) | ctk_reserved, ctk_released, ctk_conflict | 3 |
| Sortie (4) | sortie_started, sortie_progress, sortie_completed, sortie_blocked | 4 |
| Checkpoint (4) | checkpoint_created, fleet_checkpointed, fleet_recovered, context_compacted | 4 |
| Fleet Lifecycle (6) | mission_started, specialist_spawned, specialist_completed, review_started, review_completed, mission_completed | 6 |
| Sortie/Mission Creation (5) | sortie_created, sortie_updated, sortie_status_changed, sortie_closed, mission_created | 5 |
| Compaction (3) | compaction_triggered, fleet_detected, context_injected | 3 |

```typescript
describe('Event Schemas', () => {
  describe('Specialist Events', () => {
    it('should validate specialist_registered schema', () => {
      const valid = SpecialistRegisteredSchema.safeParse({
        specialist_id: 'spec-123',
        name: 'code-reviewer',
        capabilities: ['review', 'refactor']
      });
      expect(valid.success).toBe(true);
    });

    it('should reject invalid specialist_registered', () => {
      const invalid = SpecialistRegisteredSchema.safeParse({
        specialist_id: 123, // should be string
        name: 'code-reviewer'
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Squawk Events', () => {
    it('should validate squawk_sent schema', () => {
      const valid = SquawkSentSchema.safeParse({
        message_id: crypto.randomUUID(),
        mailbox_id: 'specialist-123',
        message_type: 'TaskAssigned',
        content: { task_id: 'task-456' },
        priority: 'high'
      });
      expect(valid.success).toBe(true);
    });
  });

  describe('CTK Events', () => {
    it('should validate ctk_reserved schema', () => {
      const valid = CtkReservedSchema.safeParse({
        lock_id: crypto.randomUUID(),
        file_path: '/src/index.ts',
        normalized_path: '/home/user/project/src/index.ts',
        specialist_id: 'spec-123',
        purpose: 'edit',
        timeout_ms: 30000
      });
      expect(valid.success).toBe(true);
    });
  });

  // ... 29 more schema tests
});
```

---

### 3.7 API Endpoint Tests (20 tests)

**File:** `tests/integration/phase2/api/*.test.ts`

| ID | Endpoint | Method | Test Description | AC Reference |
|----|----------|--------|------------------|--------------|
| API-001 | /api/v1/mailbox/append | POST | Append events to mailbox | US-003 |
| API-002 | /api/v1/mailbox/:streamId | GET | Get mailbox contents | US-004 |
| API-003 | /api/v1/cursor/advance | POST | Update cursor position | API-6.1 |
| API-004 | /api/v1/cursor/:cursorId | GET | Get cursor position | API-6.1 |
| API-005 | /api/v1/lock/acquire | POST | Acquire file lock | US-007 |
| API-006 | /api/v1/lock/release | POST | Release file lock | US-008 |
| API-007 | /api/v1/locks | GET | List active locks | API-6.1 |
| API-008 | /api/v1/specialists | GET | List all specialists | API-6.3 |
| API-009 | /api/v1/specialists/register | POST | Register specialist | US-001 |
| API-010 | /api/v1/specialists/:id/heartbeat | POST | Specialist heartbeat | US-002 |
| API-011 | /api/v1/sorties | GET | List sorties | API-6.3 |
| API-012 | /api/v1/sorties | POST | Create sortie | US-010 |
| API-013 | /api/v1/sorties/:id | GET | Get sortie | API-6.3 |
| API-014 | /api/v1/sorties/:id/start | POST | Start sortie | US-011 |
| API-015 | /api/v1/sorties/:id/progress | POST | Report progress | US-012 |
| API-016 | /api/v1/sorties/:id/complete | POST | Complete sortie | US-013 |
| API-017 | /api/v1/missions | GET | List missions | API-6.3 |
| API-018 | /api/v1/missions | POST | Create mission | US-015 |
| API-019 | /api/v1/missions/:id | GET | Get mission | API-6.3 |
| API-020 | /health | GET | Health check with DB status | API-6.1 |

```typescript
describe('API Endpoints', () => {
  let app: Hono;

  beforeAll(async () => {
    app = createTestApp();
  });

  describe('POST /api/v1/mailbox/append', () => {
    it('should append events to mailbox', async () => {
      const response = await app.request('/api/v1/mailbox/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream_id: 'specialist-123',
          events: [{
            type: 'TaskAssigned',
            data: { task_id: 'task-456' }
          }]
        })
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.inserted).toBe(1);
      expect(body.mailbox.events).toHaveLength(1);
    });
  });

  describe('POST /api/v1/lock/acquire', () => {
    it('should acquire file lock', async () => {
      const response = await app.request('/api/v1/lock/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: '/src/index.ts',
          specialist_id: 'spec-123',
          timeout_ms: 30000
        })
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.lock.id).toBeDefined();
      expect(body.lock.reserved_by).toBe('spec-123');
    });

    it('should return 409 on conflict', async () => {
      // First acquire
      await app.request('/api/v1/lock/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: '/src/index.ts',
          specialist_id: 'spec-123',
          timeout_ms: 30000
        })
      });

      // Conflict attempt
      const response = await app.request('/api/v1/lock/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: '/src/index.ts',
          specialist_id: 'spec-456',
          timeout_ms: 30000
        })
      });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /health', () => {
    it('should include database status', async () => {
      const response = await app.request('/health');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.database).toBeDefined();
      expect(body.database.status).toBe('connected');
      expect(body.database.wal_mode).toBe(true);
    });
  });
});
```

---

## 4. Acceptance Criteria Mapping

### 4.1 User Story Coverage Matrix

| User Story | Test IDs | Coverage |
|------------|----------|----------|
| US-001 Specialist Registration | CONN-002, API-009 | 100% |
| US-002 Specialist Heartbeat | API-010 | 100% |
| US-003 Send Message | API-001 | 100% |
| US-004 Read Mailbox | API-002 | 100% |
| US-007 Reserve File | LCK-001 to LCK-005, API-005 | 100% |
| US-008 Release Lock | LCK-006 to LCK-008, API-006 | 100% |
| US-009 Detect Conflicts | LCK-009 | 100% |
| US-010 Create Sortie | SRT-001 to SRT-004, API-012 | 100% |
| US-011 Start Sortie | SRT-005 to SRT-007, API-014 | 100% |
| US-012 Report Progress | SRT-008, SRT-009, API-015 | 100% |
| US-013 Complete Sortie | SRT-010, SRT-011, API-016 | 100% |
| US-014 Block Sortie | SRT-012, SRT-013 | 100% |
| US-015 Create Mission | MSN-001 to MSN-003, API-018 | 100% |
| US-016 Start Mission | MSN-004, MSN-005 | 100% |
| US-017 Complete Mission | MSN-006 to MSN-009 | 100% |

### 4.2 Non-Functional Requirements Coverage

| NFR | Test IDs | Verification Method |
|-----|----------|---------------------|
| Event append < 5ms p99 | PERF-001 | Benchmark test |
| Projection query < 5ms p99 | PERF-002 | Benchmark test |
| Concurrent readers (10+) | CONN-003 | Concurrency test |
| WAL mode enabled | CONN-001 | PRAGMA check |
| Busy timeout 5s | CONN-004 | Timeout test |

---

## 5. Test File Structure

```
tests/
├── setup.ts                           # Global test setup
├── fixtures/
│   ├── squawk-test.db                 # SQLite test fixture
│   ├── squawk-temp.db                 # Temp database for tests
│   └── legacy-squawk.json             # Migration test fixture
├── helpers/
│   ├── test-sqlite.ts                 # SQLite test utilities
│   ├── mock-database.ts               # Mock implementations
│   └── contract-tests.ts              # Interface contract tests
├── unit/
│   └── phase2/
│       ├── sqlite/
│       │   └── connection.test.ts     # CONN-001 to CONN-005
│       ├── operations/
│       │   ├── mission.test.ts        # MSN-001 to MSN-012
│       │   ├── sortie.test.ts         # SRT-001 to SRT-015
│       │   ├── lock.test.ts           # LCK-001 to LCK-010
│       │   └── event.test.ts          # EVT-001 to EVT-008
│       └── events/
│           └── schemas.test.ts        # 32 schema validation tests
├── integration/
│   └── phase2/
│       └── api/
│           ├── mailbox.test.ts        # API-001, API-002
│           ├── cursor.test.ts         # API-003, API-004
│           ├── lock.test.ts           # API-005 to API-007
│           ├── specialist.test.ts     # API-008 to API-010
│           ├── sortie.test.ts         # API-011 to API-016
│           ├── mission.test.ts        # API-017 to API-019
│           └── health.test.ts         # API-020
└── e2e/
    └── phase2/
        ├── mission-lifecycle.test.ts  # Full mission flow
        ├── lock-contention.test.ts    # Concurrent lock tests
        └── event-replay.test.ts       # Event sourcing replay
```

---

## 6. Implementation Order

### 6.1 Day-by-Day Implementation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Phase 2 Implementation Order                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Day 1: Foundation                                                   │
│  ├── [ ] CONN-001 to CONN-005 (SQLite connection)                   │
│  ├── [ ] EVT-001 to EVT-008 (Event operations)                      │
│  └── [ ] Test helpers (test-sqlite.ts)                              │
│                                                                      │
│  Day 2: Core Operations                                              │
│  ├── [ ] MSN-001 to MSN-012 (Mission operations)                    │
│  ├── [ ] SRT-001 to SRT-015 (Sortie operations)                     │
│  └── [ ] LCK-001 to LCK-010 (Lock operations)                       │
│                                                                      │
│  Day 3: Event Schemas                                                │
│  ├── [ ] All 32 event schema tests                                  │
│  └── [ ] Zod schema implementations                                 │
│                                                                      │
│  Day 4: API Integration                                              │
│  ├── [ ] API-001 to API-010 (Core endpoints)                        │
│  └── [ ] API-011 to API-020 (New endpoints)                         │
│                                                                      │
│  Day 5: E2E & Polish                                                 │
│  ├── [ ] E2E tests                                                  │
│  ├── [ ] Coverage verification                                      │
│  └── [ ] Documentation                                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Dependency Graph

```
                    ┌──────────────┐
                    │  test-sqlite │
                    │   helpers    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ EventOps │ │ LockOps  │ │ Schemas  │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
        ┌──────────┐           ┌──────────┐
        │MissionOps│           │SortieOps │
        └────┬─────┘           └────┬─────┘
             │                      │
             └──────────┬───────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │ API Endpoints│
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   E2E Tests  │
                 └──────────────┘
```

---

## 7. Test Helper Specifications

### 7.1 test-sqlite.ts

```typescript
// tests/helpers/test-sqlite.ts

import { Database } from 'bun:sqlite';
import { SCHEMA_SQL } from '../../squawk/src/db/schema';

/**
 * Create an in-memory SQLite database for testing
 */
export function createTestDatabase(): Database {
  const db = new Database(':memory:');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec(SCHEMA_SQL);
  return db;
}

/**
 * Create a file-based test database
 */
export function createFileTestDatabase(path: string): Database {
  const db = new Database(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  return db;
}

/**
 * Destroy test database and cleanup
 */
export function destroyTestDatabase(db: Database): void {
  db.close();
}

/**
 * Reset database to empty state
 */
export function resetTestDatabase(db: Database): void {
  db.exec('DELETE FROM events');
  db.exec('DELETE FROM missions');
  db.exec('DELETE FROM sorties');
  db.exec('DELETE FROM locks');
  db.exec('DELETE FROM specialists');
  db.exec('DELETE FROM messages');
  db.exec('DELETE FROM checkpoints');
}

/**
 * Run all migrations
 */
export function runMigrations(db: Database): void {
  // Migrations are applied via SCHEMA_SQL
  // Future migrations would be applied here
}

/**
 * Seed test data
 */
export function seedTestData(db: Database): void {
  // Insert test mission
  db.run(`
    INSERT INTO missions (id, title, status, created_at, last_event_sequence, projected_at)
    VALUES ('msn-test-001', 'Test Mission', 'pending', datetime('now'), 0, datetime('now'))
  `);

  // Insert test sortie
  db.run(`
    INSERT INTO sorties (id, mission_id, title, status, created_at, last_event_sequence, projected_at)
    VALUES ('srt-test-001', 'msn-test-001', 'Test Sortie', 'pending', datetime('now'), 0, datetime('now'))
  `);

  // Insert test specialist
  db.run(`
    INSERT INTO specialists (id, name, status, registered_at, last_seen, last_event_sequence, projected_at)
    VALUES ('spec-test-001', 'test-specialist', 'active', datetime('now'), datetime('now'), 0, datetime('now'))
  `);
}
```

### 7.2 Contract Test Utilities

```typescript
// tests/helpers/contract-tests.ts

import { expect } from 'bun:test';

/**
 * Test that MissionOps implementation satisfies the interface contract
 */
export function testMissionOpsContract(ops: MissionOps): void {
  describe('MissionOps Contract', () => {
    it('create() returns Mission with required fields', async () => {
      const mission = await ops.create({ title: 'Test' });
      expect(mission.id).toBeDefined();
      expect(mission.title).toBe('Test');
      expect(mission.status).toBe('pending');
      expect(mission.created_at).toBeDefined();
    });

    it('getById() returns null for non-existent', async () => {
      const mission = await ops.getById('non-existent');
      expect(mission).toBeNull();
    });

    it('start() changes status to in_progress', async () => {
      const mission = await ops.create({ title: 'Test' });
      const started = await ops.start(mission.id);
      expect(started.status).toBe('in_progress');
    });
  });
}

/**
 * Test that SortieOps implementation satisfies the interface contract
 */
export function testSortieOpsContract(ops: SortieOps): void {
  describe('SortieOps Contract', () => {
    it('create() returns Sortie with required fields', async () => {
      const sortie = await ops.create({ title: 'Test' });
      expect(sortie.id).toBeDefined();
      expect(sortie.title).toBe('Test');
      expect(sortie.status).toBe('pending');
    });

    it('progress() validates range 0-100', async () => {
      const sortie = await ops.create({ title: 'Test' });
      await expect(ops.progress(sortie.id, -1)).rejects.toThrow();
      await expect(ops.progress(sortie.id, 101)).rejects.toThrow();
    });
  });
}

/**
 * Test that LockOps implementation satisfies the interface contract
 */
export function testLockOpsContract(ops: LockOps): void {
  describe('LockOps Contract', () => {
    it('acquire() returns Lock with required fields', async () => {
      const lock = await ops.acquire({
        file: '/test.ts',
        specialist_id: 'spec-1',
        timeout_ms: 30000
      });
      expect(lock.id).toBeDefined();
      expect(lock.file).toBe('/test.ts');
      expect(lock.status).toBe('active');
    });

    it('acquire() detects conflicts', async () => {
      await ops.acquire({
        file: '/test.ts',
        specialist_id: 'spec-1',
        timeout_ms: 30000
      });
      const result = await ops.acquire({
        file: '/test.ts',
        specialist_id: 'spec-2',
        timeout_ms: 30000
      });
      expect(result.conflict).toBe(true);
    });
  });
}

/**
 * Test that CheckpointOps implementation satisfies the interface contract
 */
export function testCheckpointOpsContract(ops: CheckpointOps): void {
  describe('CheckpointOps Contract', () => {
    it('create() returns Checkpoint with required fields', async () => {
      const checkpoint = await ops.create({
        mission_id: 'msn-1',
        trigger: 'manual',
        created_by: 'dispatch-1'
      });
      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.mission_id).toBe('msn-1');
      expect(checkpoint.trigger).toBe('manual');
    });

    it('getLatest() returns most recent checkpoint', async () => {
      await ops.create({ mission_id: 'msn-1', trigger: 'progress', created_by: 'dispatch-1' });
      await ops.create({ mission_id: 'msn-1', trigger: 'manual', created_by: 'dispatch-1' });
      
      const latest = await ops.getLatest('msn-1');
      expect(latest?.trigger).toBe('manual');
    });
  });
}
```

---

## 8. Success Criteria Checklist

### 8.1 Test Coverage

- [ ] All 102 tests passing
- [ ] Line coverage >= 95%
- [ ] Function coverage >= 95%
- [ ] Branch coverage >= 90%
- [ ] No uncovered critical paths

### 8.2 Functional Verification

- [ ] All existing API endpoints return identical responses
- [ ] All existing tests pass without modification
- [ ] Events are append-only (no updates or deletes)
- [ ] Causation chains are correctly maintained
- [ ] Projections are consistent with event log
- [ ] Lock conflicts are correctly detected

### 8.3 Performance Verification

- [ ] Event append < 5ms p99
- [ ] Projection query < 5ms p99
- [ ] WAL mode enabled and verified
- [ ] Concurrent read access works

### 8.4 Integration Verification

- [ ] Phase 3 can use mock implementations
- [ ] Contract tests pass for all interfaces
- [ ] API response formats unchanged

---

## Appendix A: Running Tests

```bash
# Run all Phase 2 tests
bun test tests/unit/phase2 tests/integration/phase2

# Run with coverage
bun test --coverage tests/unit/phase2 tests/integration/phase2

# Run specific test file
bun test tests/unit/phase2/operations/mission.test.ts

# Run tests matching pattern
bun test --test-name-pattern "should create mission"

# Run E2E tests
bun test tests/e2e/phase2
```

## Appendix B: Coverage Report Example

```
-----------------------------|---------|----------|---------|---------|
File                         | % Stmts | % Branch | % Funcs | % Lines |
-----------------------------|---------|----------|---------|---------|
All files                    |   95.2  |   90.5   |   95.8  |   95.2  |
 squawk/src/db/              |   96.1  |   91.2   |   96.5  |   96.1  |
  sqlite.ts                  |   98.0  |   95.0   |   100   |   98.0  |
  events.ts                  |   95.5  |   90.0   |   95.0  |   95.5  |
  projections.ts             |   94.8  |   88.5   |   94.0  |   94.8  |
 squawk/src/events/          |   97.2  |   92.0   |   98.0  |   97.2  |
  schemas.ts                 |   97.2  |   92.0   |   98.0  |   97.2  |
 server/api/src/             |   94.0  |   89.5   |   94.5  |   94.0  |
  sorties/routes.ts          |   93.5  |   88.0   |   94.0  |   93.5  |
  missions/routes.ts         |   94.5  |   91.0   |   95.0  |   94.5  |
-----------------------------|---------|----------|---------|---------|
```

---

## 4. Test Fixtures

### 4.1 Fixture File Structure

Test fixtures provide consistent, reproducible test data.

```
tests/fixtures/phase2/
├── sample-mission.json          # Sample mission data
├── sample-sorties.json         # Sample sorties data
├── sample-locks.json           # Sample lock data
├── sample-events.json           # Sample event data
├── large-dataset.json           # 10K events for scalability tests
└── migration/
    ├── legacy-squawk.json      # Sample legacy JSON
    └── migrated-squawk.db     # Expected SQLite after migration
```

### 4.2 Sample Fixtures

#### Sample Mission Data
```json
{
  "missions": [
    {
      "id": "msn-test-001",
      "title": "Test Mission",
      "description": "A test mission for unit tests",
      "status": "in_progress",
      "priority": "high",
      "created_at": "2026-01-04T12:00:00.000Z",
      "started_at": "2026-01-04T12:05:00.000Z",
      "total_sorties": 4,
      "completed_sorties": 2
    }
  ]
}
```

#### Sample Sorties Data
```json
{
  "sorties": [
    {
      "id": "srt-test-001",
      "mission_id": "msn-test-001",
      "title": "Complete authentication",
      "status": "completed",
      "priority": "high",
      "assigned_to": "specialist-001",
      "files": ["src/auth.ts", "src/middleware/auth.ts"],
      "progress": 100,
      "progress_notes": "JWT auth completed",
      "created_at": "2026-01-04T12:01:00.000Z",
      "started_at": "2026-01-04T12:05:00.000Z",
      "completed_at": "2026-01-04T13:00:00.000Z"
    },
    {
      "id": "srt-test-002",
      "mission_id": "msn-test-001",
      "title": "Add user endpoints",
      "status": "in_progress",
      "priority": "medium",
      "assigned_to": "specialist-002",
      "files": ["src/api/users.ts"],
      "progress": 50,
      "progress_notes": "Adding GET /users endpoint",
      "created_at": "2026-01-04T12:02:00.000Z",
      "started_at": "2026-01-04T13:05:00.000Z"
    },
    {
      "id": "srt-test-003",
      "mission_id": "msn-test-001",
      "title": "Write user tests",
      "status": "pending",
      "priority": "low",
      "files": ["tests/users.test.ts"]
    },
    {
      "id": "srt-test-004",
      "mission_id": "msn-test-001",
      "title": "Review auth changes",
      "status": "pending",
      "priority": "medium"
    }
  ]
}
```

#### Sample Locks Data
```json
{
  "locks": [
    {
      "id": "lock-test-001",
      "file": "/src/auth.ts",
      "normalized_path": "/home/user/project/src/auth.ts",
      "reserved_by": "specialist-001",
      "reserved_at": "2026-01-04T12:10:00.000Z",
      "expires_at": "2026-01-04T12:20:00.000Z",
      "purpose": "edit",
      "checksum": "sha256:abc123...",
      "status": "active"
    },
    {
      "id": "lock-test-002",
      "file": "/src/api/users.ts",
      "normalized_path": "/home/user/project/src/api/users.ts",
      "reserved_by": "specialist-002",
      "reserved_at": "2026-01-04T13:00:00.000Z",
      "expires_at": "2026-01-04T13:30:00.000Z",
      "purpose": "edit",
      "status": "active"
    }
  ]
}
```

#### Sample Events Data
```json
{
  "events": [
    {
      "event_id": "evt-test-001",
      "event_type": "mission_created",
      "stream_type": "mission",
      "stream_id": "msn-test-001",
      "data": {
        "title": "Test Mission",
        "priority": "high"
      },
      "causation_id": null,
      "correlation_id": "evt-test-001",
      "metadata": {
        "source": "test",
        "version": "1.0.0"
      },
      "occurred_at": "2026-01-04T12:00:00.000Z",
      "recorded_at": "2026-01-04T12:00:00.000Z",
      "schema_version": 1
    },
    {
      "event_id": "evt-test-002",
      "event_type": "sortie_created",
      "stream_type": "sortie",
      "stream_id": "srt-test-001",
      "data": {
        "mission_id": "msn-test-001",
        "title": "Complete authentication",
        "assigned_to": "specialist-001"
      },
      "causation_id": "evt-test-001",
      "correlation_id": "evt-test-001",
      "occurred_at": "2026-01-04T12:01:00.000Z"
    }
  ]
}
```

### 4.3 Dynamic Fixture Generation

```typescript
// tests/helpers/fixtures.ts

import { randomUUID } from 'crypto';

export function createTestMission(overrides?: Partial<Mission>): Mission {
  return {
    id: `msn-${randomUUID().slice(0, 8)}`,
    title: 'Test Mission',
    description: 'Test description',
    status: 'pending',
    priority: 'medium',
    created_at: new Date().toISOString(),
    total_sorties: 0,
    completed_sorties: 0,
    ...overrides,
  };
}

export function createTestSortie(overrides?: Partial<Sortie>): Sortie {
  return {
    id: `srt-${randomUUID().slice(0, 8)}`,
    title: 'Test Sortie',
    status: 'pending',
    priority: 'medium',
    files: [],
    progress: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestLock(overrides?: Partial<Lock>): Lock {
  const id = `lock-${randomUUID().slice(0, 8)}`;
  return {
    id,
    file: '/test/file.ts',
    normalized_path: '/absolute/path/to/file.ts',
    reserved_by: 'specialist-test',
    reserved_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30000).toISOString(),
    purpose: 'edit',
    status: 'active',
    ...overrides,
  };
}

export function createTestEvent(overrides?: Partial<Event>): Event {
  return {
    event_id: `evt-${randomUUID()}`,
    event_type: 'test_event',
    stream_type: 'test',
    stream_id: 'test-stream',
    data: { test: true },
    occurred_at: new Date().toISOString(),
    recorded_at: new Date().toISOString(),
    schema_version: 1,
    ...overrides,
  };
}

// Scenario factories
export function createMissionWithSorties(
  sortieCount: number,
  overrides?: Partial<Mission>
): { mission: Mission; sorties: Sortie[] } {
  const mission = createTestMission(overrides);
  const sorties: Sortie[] = [];
  
  for (let i = 0; i < sortieCount; i++) {
    sorties.push(createTestSortie({
      mission_id: mission.id,
      title: `Sortie ${i + 1}`,
      assigned_to: `specialist-${i}`,
    }));
  }
  
  return { mission, sorties };
}
```

### 4.4 Fixture Loading Helpers

```typescript
// tests/helpers/load-fixture.ts

import { readFile } from 'fs/promises';

export async function loadFixture<T>(fixturePath: string): Promise<T> {
  const content = await readFile(fixturePath, 'utf-8');
  return JSON.parse(content) as T;
}

export async function loadMissionsFixture(): Promise<{ missions: Mission[] }> {
  return loadFixture('tests/fixtures/phase2/sample-mission.json');
}

export async function loadSortiesFixture(): Promise<{ sorties: Sortie[] }> {
  return loadFixture('tests/fixtures/phase2/sample-sorties.json');
}

export async function loadLocksFixture(): Promise<{ locks: Lock[] }> {
  return loadFixture('tests/fixtures/phase2/sample-locks.json');
}

export async function loadEventsFixture(): Promise<{ events: Event[] }> {
  return loadFixture('tests/fixtures/phase2/sample-events.json');
}
```

---

## 5. Performance Benchmarks

### 5.1 Benchmarks by Component

| Component | Metric | Target | Test Method | Priority |
|-----------|---------|--------|-------------|----------|
| Event Append | < 5ms p99 | Measure 1000 appends | P0 |
| Event Query (By Stream) | < 5ms p99 | Measure 1000 queries | P0 |
| Mission Create | < 10ms p99 | Measure 100 operations | P1 |
| Mission Update | < 10ms p99 | Measure 100 operations | P1 |
| Sortie Create | < 10ms p99 | Measure 100 operations | P1 |
| Sortie Progress Update | < 5ms p99 | Measure 1000 updates | P1 |
| Lock Acquisition | < 2ms p99 | Measure 1000 locks | P0 |
| Lock Release | < 2ms p99 | Measure 1000 releases | P0 |
| Transaction Commit | < 1ms p99 | Measure 1000 commits | P0 |

### 5.2 Benchmark Test Structure

```typescript
// tests/benchmark/event-append.bench.ts

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createTestDatabase } from '../helpers/test-sqlite';
import { createEvent } from '../setup';

describe('Event Append Performance Benchmark', () => {
  let db: Database;
  const APPEND_COUNT = 1000;
  const P99_THRESHOLD_MS = 5;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    db.close();
  });

  it('append 1000 events with p99 < 5ms', async () => {
    const durations: number[] = [];

    for (let i = 0; i < APPEND_COUNT; i++) {
      const event = createEvent('test-stream', 'test_event');
      const start = performance.now();
      await db.run(
        'INSERT INTO events (event_id, event_type, stream_type, stream_id, data, occurred_at, recorded_at, schema_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [event.id, event.type, event.stream_type, event.stream_id, JSON.stringify(event.data), event.occurred_at, new Date().toISOString(), 1]
      );
      const duration = performance.now() - start;
      durations.push(duration);
    }

    // Calculate p99 (99th percentile)
    const sorted = durations.sort((a, b) => a - b);
    const p99Index = Math.floor(sorted.length * 0.99);
    const p99 = sorted[p99Index];
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    console.log(`Event Append Performance:`);
    console.log(`  Average: ${avg.toFixed(2)}ms`);
    console.log(`  P99: ${p99.toFixed(2)}ms`);
    console.log(`  Min: ${Math.min(...durations).toFixed(2)}ms`);
    console.log(`  Max: ${Math.max(...durations).toFixed(2)}ms`);

    expect(p99).toBeLessThan(P99_THRESHOLD_MS);
    expect(avg).toBeLessThan(P99_THRESHOLD_MS);
  });
});
```

### 5.3 Scalability Tests

```typescript
// tests/benchmark/scalability.bench.ts

describe('Database Scalability Benchmarks', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    db.close();
  });

  describe('10K Events Baseline', () => {
    it('handle 10K events efficiently', async () => {
      const start = performance.now();
      
      // Insert 10K events
      for (let i = 0; i < 10000; i++) {
        const event = createEvent(`stream-${i % 100}`, 'test_event');
        await db.run(
          'INSERT INTO events (event_id, event_type, stream_type, stream_id, data, occurred_at, recorded_at, schema_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [event.id, event.type, event.stream_type, event.stream_id, JSON.stringify(event.data), event.occurred_at, new Date().toISOString(), 1]
        );
      }
      
      const insertDuration = performance.now() - start;
      const avgInsert = insertDuration / 10000;
      
      // Query performance
      const queryStart = performance.now();
      const events = db.prepare('SELECT * FROM events WHERE stream_id = ?').all(['stream-0']);
      const queryDuration = performance.now() - queryStart;
      
      console.log(`10K Events: Insert avg=${avgInsert.toFixed(2)}ms, Query=${queryDuration.toFixed(2)}ms`);
      
      expect(avgInsert).toBeLessThan(5); // Insert < 5ms per event
      expect(queryDuration).toBeLessThan(100); // Query < 100ms
    });
  });

  describe('100K Events Scale', () => {
    it('handle 100K events without performance degradation', async () => {
      const start = performance.now();
      
      for (let i = 0; i < 100000; i++) {
        const event = createEvent(`stream-${i % 100}`, 'test_event');
        await db.run(
          'INSERT INTO events (event_id, event_type, stream_type, stream_id, data, occurred_at, recorded_at, schema_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [event.id, event.type, event.stream_type, event.stream_id, JSON.stringify(event.data), event.occurred_at, new Date().toISOString(), 1]
        );
      }
      
      const duration = performance.now() - start;
      const avgInsert = duration / 100000;
      
      console.log(`100K Events: Insert avg=${avgInsert.toFixed(2)}ms`);
      
      // Performance should not degrade linearly
      expect(avgInsert).toBeLessThan(10);
    });
  });

  describe('1M Events Stress Test', () => {
    it('handle 1M events in reasonable time', async () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000000; i++) {
        const event = createEvent(`stream-${i % 100}`, 'test_event');
        await db.run(
          'INSERT INTO events (event_id, event_type, stream_type, stream_id, data, occurred_at, recorded_at, schema_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [event.id, event.type, event.stream_type, event.stream_id, JSON.stringify(event.data), event.occurred_at, new Date().toISOString(), 1]
        );
      }
      
      const duration = performance.now() - start;
      const avgInsert = duration / 1000000;
      
      console.log(`1M Events: Insert avg=${avgInsert.toFixed(2)}ms`);
      console.log(`Total duration: ${(duration / 1000).toFixed(2)}s`);
      
      // Should complete in reasonable time (< 10 min)
      expect(duration).toBeLessThan(600000); // < 10 minutes
    });
  });
});
```

### 5.4 Concurrent Access Benchmark

```typescript
// tests/benchmark/concurrent-access.bench.ts

import { Worker } from 'worker_threads';

describe('Concurrent Read Access Benchmark', () => {
  it('handle 10 concurrent readers without blocking', async () => {
    const dbPath = createTestDatabasePath();
    const CONCURRENT_READERS = 10;
    const QUERIES_PER_READER = 100;
    
    const start = performance.now();
    
    // Create 10 workers each running 100 queries
    const promises = Array.from({ length: CONCURRENT_READERS }, (_, i) => {
      return new Promise((resolve) => {
        const worker = new Worker(`
          const Database = require('better-sqlite3');
          const db = new Database('${dbPath}', { readonly: true });
          
          for (let j = 0; j < ${QUERIES_PER_READER}; j++) {
            db.prepare('SELECT * FROM events LIMIT 1').all();
          }
          
          db.close();
          resolve();
        `);
        
        worker.on('message', () => {
          worker.terminate();
          resolve();
        });
        worker.postMessage();
      });
    });
    
    await Promise.all(promises);
    const duration = performance.now() - start;
    
    console.log(`10 Concurrent Readers x 100 queries: ${duration.toFixed(2)}ms`);
    console.log(`Avg per query: ${(duration / (CONCURRENT_READERS * QUERIES_PER_READER)).toFixed(2)}ms`);
    
    // Each query should be < 5ms
    expect(duration / (CONCURRENT_READERS * QUERIES_PER_READER)).toBeLessThan(5);
  });
});
```

### 5.5 Running Benchmarks

```bash
# Run all benchmarks
bun test tests/benchmark/*.bench.ts

# Run with Node inspection for flame graphs
bun test --inspect tests/benchmark/event-append.bench.ts

# Run performance profiling
bun test --coverage --profile

# Output benchmark results to JSON
bun test tests/benchmark --reporter=json > benchmark-results.json
```

---

## 6. Edge Cases

### 6.1 SQLite-Specific Edge Cases

| Category | Scenario | Expected Behavior | Test ID |
|----------|-----------|-------------------|----------|
| **WAL Corruption** | Corrupted `.wal` file detected | Recover from base DB, rebuild WAL | EDGE-001 |
| **Disk Full** | No space for writes | Graceful error, queue writes | EDGE-002 |
| **Concurrent Writes** | Multiple writers attempt | Last writer wins via busy timeout | EDGE-003 |
| **Long Transaction** | Transaction > 10K operations | Partial commit not allowed, rollback | EDGE-004 |
| **Transaction Rollback** | Error mid-transaction | All changes undone, no partial state | EDGE-005 |
| **Database Locking** | OS file lock contention | Busy timeout retries with exponential backoff | EDGE-006 |
| **Foreign Key Violation** | Delete referenced record | Foreign key constraint blocks delete | EDGE-007 |
| **Schema Version Mismatch** | Old database loaded | Run migrations before operations | EDGE-008 |
| **Connection Pool Exhaustion** | Too many connections | Connection limit enforced | EDGE-009 |
| **Large Result Set** | Query returns >100K rows | Limit clause auto-applied | EDGE-010 |

### 6.2 Edge Case Test Structure

```typescript
// tests/unit/phase2/edge-cases/wal-corruption.test.ts

describe('WAL Corruption Handling', () => {
  it('should recover from corrupted .wal file', async () => {
    const db = createTestDatabase();
    
    // Simulate WAL corruption by writing garbage to .wal file
    const walPath = `${dbPath}-wal`;
    await writeFile(walPath, 'corrupted data', 'utf-8');
    
    // Attempt to read - should not crash
    const missions = await db.missions.list();
    expect(missions).toBeDefined();
    // Warning should be logged
  });
});
```

```typescript
// tests/unit/phase2/edge-cases/disk-full.test.ts

describe('Disk Full Handling', () => {
  it('should handle write error gracefully', async () => {
    const db = createTestDatabase();
    
    // Simulate disk full by filling to capacity
    // (using small test database)
    const missions: Mission[] = [];
    for (let i = 0; i < 10000; i++) {
      try {
        await db.missions.create({ title: `Mission ${i}` });
        missions.push(result);
      } catch (error) {
        // Should get disk full error
        expect(error.message).toContain('database or disk is full');
        break;
      }
    }
    
    // Should have written some before failing
    expect(missions.length).toBeGreaterThan(0);
  });
});
```

```typescript
// tests/unit/phase2/edge-cases/concurrent-writes.test.ts

describe('Concurrent Write Access', () => {
  it('should handle multiple writers with busy timeout', async () => {
    const db = createTestDatabase();
    const WRITER_COUNT = 5;
    
    // Attempt concurrent writes
    const promises = Array.from({ length: WRITER_COUNT }, (_, i) => 
      db.missions.create({ title: `Concurrent ${i}` })
    );
    
    // Some should succeed, some should fail with busy error
    const results = await Promise.allSettled(promises);
    const failures = results.filter(r => r.status === 'rejected');
    const successes = results.filter(r => r.status === 'fulfilled');
    
    // At least one should succeed (last writer)
    expect(successes.length).toBeGreaterThan(0);
    // Failures should have busy error
    expect(failures.length).toBeGreaterThan(0);
    failures.forEach(f => {
      expect(f.reason.message).toContain('database is locked');
    });
  });
});
```

```typescript
// tests/unit/phase2/edge-cases/foreign-key-violations.test.ts

describe('Foreign Key Constraint Handling', () => {
  it('should prevent deleting mission with active sorties', async () => {
    const db = createTestDatabase();
    
    // Create mission with sorties
    const mission = await db.missions.create({ title: 'Test' });
    await db.sorties.create({ mission_id: mission.id, title: 'Sortie 1' });
    await db.sorties.create({ mission_id: mission.id, title: 'Sortie 2' });
    await db.missions.start(mission.id);
    
    // Try to delete mission (should fail due to foreign key)
    await expect(db.missions.delete(mission.id))
      .rejects.toThrow('FOREIGN KEY constraint failed');
  });
});
```

### 6.3 Recovery Edge Cases (Phase 2 Support)

| Category | Scenario | Expected Behavior | Test ID |
|----------|-----------|-------------------|----------|
| **Checkpoint Missing** | SQLite record deleted | Fallback to file backup | REC-001 |
| **File Backup Missing** | `.flightline/` file deleted | Use SQLite record only | REC-002 |
| **Both Missing** | SQLite and file deleted | Error with recovery options | REC-003 |
| **Corrupted Checkpoint** | Invalid JSON in file | Skip checkpoint, log error | REC-004 |
| **Partial State** | Some snapshots valid, some not | Recover valid parts, mark others | REC-005 |
| **Schema Version Mismatch** | Checkpoint from old version | Run migration before loading | REC-006 |
| **Lock Conflict** | Lock held by another agent | Add to blockers, don't fail | REC-007 |

---

## 7. Complete Contract Tests

### 7.1 Missing Contract Tests

| Interface | Missing Tests | Priority |
|-----------|----------------|----------|
| `MissionOps.getStats()` | Get mission statistics | P1 |
| `MissionOps.list()` with filters | Filter by status, priority, date | P1 |
| `SortieOps.restore()` | Restore from snapshot | P0 (Phase 3 critical) |
| `SortieOps.list()` with filters | Filter by status, assignee, mission | P1 |
| `LockOps.reacquire()` | Re-acquire multiple locks | P0 (Phase 3 critical) |
| `LockOps.extend()` | Extend lock timeout | P2 |
| `EventOps.getByCorrelation()` | Trace event causation | P1 |
| `EventOps.count()` with filters | Count events by criteria | P1 |
| `CheckpointOps.deleteMany()` | Bulk delete operations | P2 |
| `CheckpointOps.markConsumed()` | Mark checkpoint as used | P1 |

### 7.2 Enhanced Contract Tests

```typescript
// tests/contract/mission-ops-enhanced.test.ts

import { describe, it, expect, beforeEach } from 'bun:test';
import { testMissionOpsContract } from './contract-tests';

describe('MissionOps Enhanced Contract', () => {
  describe('getStats()', () => {
    testMissionOpsContract((ops) => ({
      ...ops,
      getStats: async (id: string) => {
        const mission = await ops.getById(id);
        if (!mission) throw new Error('Mission not found');
        
        const sorties = await ops.getByMission(id);
        const completed = sorties.filter(s => s.status === 'completed').length;
        const failed = sorties.filter(s => s.status === 'failed').length;
        const blocked = sorties.filter(s => s.status === 'blocked').length;
        const inProgress = sorties.filter(s => s.status === 'in_progress').length;
        
        return {
          total_sorties: sorties.length,
          completed_sorties: completed,
          failed_sorties: failed,
          blocked_sorties: blocked,
          in_progress_sorties: inProgress,
        };
      },
    }));
  });

  describe('list() with filters', () => {
    testMissionOpsContract((ops) => ({
      ...ops,
      list: async (filter?: MissionFilter) => {
        const allMissions = await ops.list();
        
        if (!filter) return allMissions;
        
        let filtered = allMissions;
        
        if (filter.status) {
          const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
          filtered = filtered.filter(m => statuses.includes(m.status));
        }
        
        if (filter.priority) {
          const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
          filtered = filtered.filter(m => priorities.includes(m.priority));
        }
        
        return filtered;
      },
    }));
  });
});
```

```typescript
// tests/contract/sortie-ops-enhanced.test.ts

import { testSortieOpsContract } from './contract-tests';

describe('SortieOps Enhanced Contract', () => {
  describe('restore()', () => {
    testSortieOpsContract((ops) => ({
      ...ops,
      restore: async (id: string, snapshot: SortieSnapshot) => {
        const sortie = await ops.getById(id);
        if (!sortie) throw new Error('Sortie not found');
        
        // Restore from snapshot
        sortie.status = snapshot.status;
        sortie.progress = snapshot.progress ?? 0;
        sortie.progress_notes = snapshot.progress_notes;
        sortie.files = snapshot.files ?? [];
        
        await ops.update(id, {
          status: snapshot.status,
          progress: snapshot.progress,
          progress_notes: snapshot.progress_notes,
          files: snapshot.files,
        });
        
        return sortie;
      },
    }));
  });

  describe('list() with filters', () => {
    testSortieOpsContract((ops) => ({
      ...ops,
      list: async (filter?: SortieFilter) => {
        const allSorties = await ops.list();
        
        if (!filter) return allSorties;
        
        let filtered = allSorties;
        
        if (filter.mission_id) {
          filtered = filtered.filter(s => s.mission_id === filter.mission_id);
        }
        
        if (filter.status) {
          const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
          filtered = filtered.filter(s => statuses.includes(s.status));
        }
        
        if (filter.assigned_to) {
          filtered = filtered.filter(s => s.assigned_to === filter.assigned_to);
        }
        
        return filtered;
      },
    }));
  });
});
```

```typescript
// tests/contract/lock-ops-enhanced.test.ts

import { testLockOpsContract } from './contract-tests';

describe('LockOps Enhanced Contract', () => {
  describe('reacquire()', () => {
    testLockOpsContract((ops) => ({
      ...ops,
      reacquire: async (snapshots: LockSnapshot[]) => {
        const results = [];
        
        for (const snapshot of snapshots) {
          // Try to re-acquire each lock
          const result = await ops.acquire({
            file: snapshot.file,
            specialist_id: snapshot.held_by,
            timeout_ms: snapshot.timeout_ms,
            checksum: undefined, // Don't verify checksum on re-acquire
          });
          
          results.push({
            original_lock_id: snapshot.id,
            success: !result.conflict,
            new_lock: result.lock,
            conflict: result.existing_lock,
            error: result.conflict ? 'Lock held by another agent' : undefined,
          });
        }
        
        return results;
      },
    }));
  });

  it('should re-acquire all locks successfully', async () => {
    const mockLocks = createMockLockOps();
    const snapshots = createLockSnapshots(5);
    
    const results = await mockLocks.reacquire(snapshots);
    
    expect(results).toHaveLength(5);
    expect(results.every(r => r.success)).toBe(true);
  });

  it('should handle lock conflicts during re-acquire', async () => {
    const mockLocks = createMockLockOps();
    
    // Create initial locks
    const lock1 = await mockLocks.acquire({
      file: '/file1.ts',
      specialist_id: 'spec-1',
      timeout_ms: 30000,
    });
    const lock2 = await mockLocks.acquire({
      file: '/file2.ts',
      specialist_id: 'spec-2',
      timeout_ms: 30000,
    });
    
    // Create snapshots
    const snapshots = [
      { id: 'lock-1', file: '/file1.ts', held_by: 'spec-1', timeout_ms: 30000 },
      { id: 'lock-2', file: '/file2.ts', held_by: 'spec-2', timeout_ms: 30000 },
    ];
    
    // Try to re-acquire but lock-2 is now held by spec-3
    // (Simulate another agent acquired it)
    await mockLocks.forceRelease(lock2.id, 'Released by other agent');
    await mockLocks.acquire({
      file: '/file2.ts',
      specialist_id: 'spec-3',
      timeout_ms: 30000,
    });
    
    const results = await mockLocks.reacquire(snapshots);
    
    // Lock-1 should succeed, Lock-2 should fail with conflict
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[1].conflict).toBeDefined();
  });
});
```

### 7.3 Negative Contract Tests

```typescript
// tests/contract/negative-tests.test.ts

import { describe, it, expect } from 'bun:test';

describe('Negative Contract Tests', () => {
  describe('MissionOps', () => {
    it('should return null for non-existent mission', async () => {
      const ops = createMissionOps();
      const mission = await ops.getById('msn-nonexistent');
      expect(mission).toBeNull();
    });

    it('should throw error starting non-existent mission', async () => {
      const ops = createMissionOps();
      await expect(ops.start('msn-nonexistent'))
        .rejects.toThrow('Mission not found');
    });

    it('should throw error completing mission with incomplete sorties', async () => {
      const ops = createMissionOps();
      const mission = await ops.create({ title: 'Test' });
      await ops.sorties.create({ mission_id: mission.id, title: 'S1' });
      await ops.missions.start(mission.id);
      
      await expect(ops.missions.complete(mission.id))
        .rejects.toThrow('Cannot complete mission with incomplete sorties');
    });

    it('should throw error completing already completed mission', async () => {
      const ops = createMissionOps();
      const mission = await ops.create({ title: 'Test' });
      await ops.missions.start(mission.id);
      await ops.missions.complete(mission.id);
      
      await expect(ops.missions.complete(mission.id))
        .rejects.toThrow('Mission already completed');
    });
  });

  describe('SortieOps', () => {
    it('should return null for non-existent sortie', async () => {
      const ops = createSortieOps();
      const sortie = await ops.getById('srt-nonexistent');
      expect(sortie).toBeNull();
    });

    it('should reject invalid progress percentage', async () => {
      const ops = createSortieOps();
      const mission = await createMissionOps();
      const sortie = await ops.create({ mission_id: mission.id, title: 'Test' });
      
      await expect(ops.progress(sortie.id, -1))
        .rejects.toThrow('Progress must be between 0 and 100');
      
      await expect(ops.progress(sortie.id, 101))
        .rejects.toThrow('Progress must be between 0 and 100');
    });

    it('should reject progress update on unassigned sortie', async () => {
      const ops = createSortieOps();
      const mission = await createMissionOps();
      const sortie = await ops.create({ mission_id: mission.id, title: 'Test' });
      
      await expect(ops.progress(sortie.id, 50))
        .rejects.toThrow('Cannot update unassigned sortie');
    });

    it('should throw error starting unassigned sortie', async () => {
      const ops = createSortieOps();
      const mission = await createMissionOps();
      const sortie = await ops.create({ mission_id: mission.id, title: 'Test' });
      
      await expect(ops.start(sortie.id, 'spec-1'))
        .rejects.toThrow('Sortie not assigned to spec-1');
    });
  });

  describe('LockOps', () => {
    it('should return conflict when file already locked', async () => {
      const ops = createLockOps();
      
      const lock1 = await ops.acquire({
        file: '/test/file.ts',
        specialist_id: 'spec-1',
        timeout_ms: 30000,
      });
      
      const result2 = await ops.acquire({
        file: '/test/file.ts',
        specialist_id: 'spec-2',
        timeout_ms: 30000,
      });
      
      expect(result2.conflict).toBe(true);
      expect(result2.existing_lock).toBeDefined();
      expect(result2.existing_lock.reserved_by).toBe('spec-1');
    });

    it('should throw error releasing lock not owned', async () => {
      const ops = createLockOps();
      const lock = await ops.acquire({
        file: '/test/file.ts',
        specialist_id: 'spec-1',
        timeout_ms: 30000,
      });
      
      await expect(ops.release(lock.id, 'spec-2'))
        .rejects.toThrow('Only lock owner can release lock');
    });

    it('should allow force release regardless of owner', async () => {
      const ops = createLockOps();
      const lock = await ops.acquire({
        file: '/test/file.ts',
        specialist_id: 'spec-1',
        timeout_ms: 30000,
      });
      
      const released = await ops.forceRelease(lock.id, 'Admin override');
      
      expect(released.status).toBe('force_released');
      expect(released.metadata?.force_release_reason).toBe('Admin override');
    });
  });
});
```

---

## 8. Test Utilities

### 8.1 Test Data Factories

```typescript
// tests/helpers/factories.ts

import { randomUUID } from 'crypto';

export const TestFactories = {
  // Mission factories
  mission: {
    create: (overrides?: Partial<Mission>) => ({
      id: `msn-${randomUUID().slice(0, 8)}`,
      title: 'Test Mission',
      description: 'Test description',
      status: 'pending',
      priority: 'medium',
      created_at: new Date().toISOString(),
      total_sorties: 0,
      completed_sorties: 0,
      ...overrides,
    }),
    
    createInProgress: () => TestFactories.mission.create({
      status: 'in_progress',
      started_at: new Date().toISOString(),
    }),
    
    createCompleted: () => TestFactories.mission.create({
      status: 'completed',
      started_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      completed_at: new Date().toISOString(),
    }),
  },

  // Sortie factories
  sortie: {
    create: (overrides?: Partial<Sortie>) => ({
      id: `srt-${randomUUID().slice(0, 8)}`,
      title: 'Test Sortie',
      status: 'pending',
      priority: 'medium',
      progress: 0,
      files: [],
      created_at: new Date().toISOString(),
      ...overrides,
    }),
    
    createInProgress: (assignedTo?: string) => TestFactories.sortie.create({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      assigned_to,
    }),
    
    createCompleted: () => TestFactories.sortie.create({
      status: 'completed',
      progress: 100,
      started_at: new Date(Date.now() - 1800000).toISOString(),
      completed_at: new Date().toISOString(),
    }),
    
    createBlocked: (blocker?: string) => TestFactories.sortie.create({
      status: 'blocked',
      blocked_by: blocker,
      blocked_reason: 'Blocked by test scenario',
    }),
  },

  // Lock factories
  lock: {
    create: (overrides?: Partial<Lock>) => ({
      id: `lock-${randomUUID().slice(0, 8)}`,
      file: '/test/file.ts',
      normalized_path: '/absolute/path/to/file.ts',
      reserved_by: 'spec-test',
      reserved_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30000).toISOString(),
      purpose: 'edit',
      status: 'active',
      ...overrides,
    }),
    
    createExpired: () => TestFactories.lock.create({
      expires_at: new Date(Date.now() - 10000).toISOString(),
    }),
    
    createReleased: () => TestFactories.lock.create({
      status: 'released',
      released_at: new Date().toISOString(),
    }),
  },

  // Event factories
  event: {
    create: (overrides?: Partial<Event>) => ({
      event_id: `evt-${randomUUID()}`,
      event_type: 'test_event',
      stream_type: 'test',
      stream_id: 'test-stream',
      data: { test: true },
      occurred_at: new Date().toISOString(),
      recorded_at: new Date().toISOString(),
      schema_version: 1,
      ...overrides,
    }),
    
    createWithCausation: (causationId: string) => TestFactories.event.create({
      causation_id: causationId,
    }),
  },

  // Checkpoint factories
  checkpoint: {
    create: (overrides?: Partial<Checkpoint>) => ({
      id: `chk-${randomUUID().slice(0, 8)}`,
      mission_id: 'msn-test-001',
      timestamp: new Date().toISOString(),
      trigger: 'manual',
      progress_percent: 50,
      sorties: [],
      active_locks: [],
      pending_messages: [],
      recovery_context: {
        last_action: 'Test action',
        next_steps: ['Step 1', 'Step 2'],
        blockers: [],
        files_modified: [],
        mission_summary: 'Test mission',
        elapsed_time_ms: 60000,
        last_activity_at: new Date().toISOString(),
      },
      created_by: 'dispatch-test',
      version: '1.0.0',
      ...overrides,
    }),
  },
};
```

### 8.2 Scenario Builders

```typescript
// tests/helpers/scenarios.ts

import { TestFactories } from './factories';
import type { Mission, Sortie, Lock, Checkpoint } from '../../squawk/src/db/types';

export const TestScenarios = {
  mission: {
    withSorties: (sortieCount: number) => {
      const mission = TestFactories.mission.create();
      const sorties = Array.from({ length: sortieCount }, (_, i) =>
        TestFactories.sortie.create({ mission_id: mission.id, title: `Sortie ${i + 1}` })
      );
      
      mission.total_sorties = sorties.length;
      mission.completed_sorties = sorties.filter(s => s.status === 'completed').length;
      
      return { mission, sorties };
    },
    
    withCompletedSorties: () => {
      const result = TestScenarios.mission.withSorties(4);
      result.sorties.forEach(s => {
        s.status = 'completed';
        s.completed_at = new Date().toISOString();
        s.progress = 100;
      });
      result.mission.completed_sorties = result.sorties.length;
      
      return result;
    },
  },

  sortie: {
    withFiles: (files: string[]) => {
      return TestFactories.sortie.create({ files });
    },
    
    withProgress: (progress: number) => {
      return TestFactories.sortie.create({ progress });
    },
  },

  locks: {
    concurrent: (lockCount: number) => {
      return Array.from({ length: lockCount }, (_, i) =>
        TestFactories.lock.create({
          file: `/file${i}.ts`,
          reserved_by: `spec-${i}`,
        })
      );
    },
  },
};
```

### 8.3 Async Test Utilities

```typescript
// tests/helpers/async-utils.ts

import { sleep } from 'bun';

export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 50
): Promise<void> {
  const start = Date.now();
  
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
    await sleep(interval);
  }
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  backoffMs: number = 100
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts - 1) {
        console.log(`Attempt ${attempt + 1} failed, retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
        backoffMs *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

export async function parallelOperations<T>(
  operations: Array<() => Promise<T>>,
  concurrency: number = 10
): Promise<T[]> {
  const results: T[] = [];
  const executing = new Set<number>();
  let index = 0;

  const executeNext = async (): Promise<void> => {
    while (index < operations.length && executing.size < concurrency) {
      const currentIndex = index++;
      executing.add(currentIndex);
      
      operations[currentIndex]()
        .then(result => {
          results[currentIndex] = result;
          executing.delete(currentIndex);
          executeNext(); // Try next one
        })
        .catch(error => {
          results[currentIndex] = error as T;
          executing.delete(currentIndex);
          executeNext();
        });
    }
  };

  await Promise.all([
    executeNext(),
    Promise.resolve(), // Keep loop running
  ]);

  return results;
}
```

### 8.4 Performance Measurement Utilities

```typescript
// tests/helpers/performance.ts

export class PerformanceTimer {
  private marks: Map<string, number> = new Map();
  
  start(markName: string): void {
    this.marks.set(markName, performance.now());
  }
  
  end(markName: string): number {
    const startTime = this.marks.get(markName);
    if (!startTime) throw new Error(`No start mark for ${markName}`);
    
    const duration = performance.now() - startTime;
    this.marks.delete(markName);
    return duration;
  }
  
  measure<T>(markName: string, fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    this.start(markName);
    
    try {
      const result = await fn();
      const duration = this.end(markName);
      
      return { result, duration };
    } catch (error) {
      this.end(markName);
      throw error;
    }
  }
}

export function assertPerformance(
  operation: string,
  duration: number,
  maxDurationMs: number
): void {
  if (duration > maxDurationMs) {
    throw new Error(
      `${operation} exceeded performance threshold: ${duration}ms > ${maxDurationMs}ms`
    );
  }
}

export function logPerformanceReport(
  report: Record<string, { count: number; total: number; avg: number; p95: number; p99: number }>
): void {
  console.log('\n=== Performance Report ===\n');
  
  for (const [operation, stats] of Object.entries(report)) {
    console.log(`${operation}:`);
    console.log(`  Count: ${stats.count}`);
    console.log(`  Total: ${stats.total.toFixed(2)}ms`);
    console.log(`  Average: ${stats.avg.toFixed(2)}ms`);
    console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
    console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
  }
  
  console.log('=========================\n');
}

export function calculatePercentiles(
  values: number[]
): { avg: number; min: number; max: number; p50: number; p95: number; p99: number } {
  if (values.length === 0) {
    return { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const avg = sum / sorted.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  const p50Index = Math.floor(sorted.length * 0.50);
  const p95Index = Math.floor(sorted.length * 0.95);
  const p99Index = Math.floor(sorted.length * 0.99);
  
  return {
    avg,
    min,
    max,
    p50: sorted[p50Index],
    p95: sorted[p95Index],
    p99: sorted[p99Index],
  };
}
```

### 8.5 Database Test Utilities

```typescript
// tests/helpers/db-test-utils.ts

import type { Database } from 'bun:sqlite';

export async function truncateTable(db: Database, tableName: string): Promise<void> {
  await db.run(`DELETE FROM ${tableName}`);
}

export async function truncateAllTables(db: Database): Promise<void> {
  const tables = [
    'events', 'missions', 'sorties', 'locks',
    'checkpoints', 'specialists', 'cursors'
  ];
  
  for (const table of tables) {
    await truncateTable(db, table);
  }
}

export async function rowCount(db: Database, tableName: string): Promise<number> {
  const result = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
  return result.count;
}

export async function tableExists(db: Database, tableName: string): Promise<boolean> {
  const result = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName) as { name: string } | undefined;
  
  return !!result;
}

export async function waitForWALCheckpoint(db: Database): Promise<void> {
  // Force WAL checkpoint
  await db.run('PRAGMA wal_checkpoint(TRUNCATE)');
  
  // Verify checkpoint completed
  const result = db.prepare('PRAGMA wal_checkpoint(PASSIVE)').get() as { wal: string };
  expect(wal).toBe('0'); // 0 = no frames in WAL
}

export async function getDatabaseStats(db: Database): Promise<{
  databaseSize: number;
  walSize: number;
  tables: Record<string, number>;
}> {
  const [dbSize, walSize] = db.prepare(
    'SELECT page_count * page_size as db_size, ' ||
    'SELECT COUNT(*) as count FROM -wal LIMIT 1'
  ).all() as [{ db_size: number }?, { count: number }?];
  
  const tables = db.prepare(
    "SELECT name, (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=sq.name) || ' WHERE type='table') as count) " +
    "FROM sqlite_master WHERE type='table' " +
    "LEFT JOIN (SELECT name, COUNT(*) as count FROM sqlite_master WHERE type='table') sq " +
    "ON sqlite_master.name = sq.name " +
    "ORDER BY sqlite_master.name"
  ).all() as Array<{ name: string; count: number }>;
  
  const tableStats: Record<string, number> = {};
  for (const table of tables) {
    tableStats[table.name] = table.count;
  }
  
  return {
    databaseSize: dbSize?.db_size || 0,
    walSize: walSize?.count * 4096 || 0, // Approximate
    tables: tableStats,
  };
}
```

### 8.6 Mock Setup Utilities

```typescript
// tests/helpers/mock-setup.ts

import { resetMockDatabase } from './mock-database';
import type { Mission, Sortie, Lock } from '../../squawk/src/db/types';

export interface MockDatabase {
  missions: Map<string, Mission>;
  sorties: Map<string, Sortie>;
  locks: Map<string, Lock>;
}

export function createMockDatabase(): MockDatabase {
  return {
    missions: new Map(),
    sorties: new Map(),
    locks: new Map(),
  };
}

export function setupMockDatabase(
  db: MockDatabase,
  scenario: (db: MockDatabase) => void
): void {
  resetMockDatabase();
  scenario(db);
}

export function verifyMockDatabaseState(
  db: MockDatabase,
  expectedMissions: number,
  expectedSorties: number,
  expectedLocks: number
): void {
  expect(db.missions.size).toBe(expectedMissions);
  expect(db.sorties.size).toBe(expectedSorties);
  expect(db.locks.size).toBe(expectedLocks);
}
```

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-01-04  
**Author:** Documentation Specialist
