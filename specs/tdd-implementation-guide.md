# FleetTools Phase 2 & 3 TDD Implementation Guide

**Version:** 1.0.0  
**Status:** Ready for Implementation  
**Date:** 2026-01-04  
**Duration:** 10 Days (Parallel Development)

---

## 1. Executive Summary

This guide provides a day-by-day implementation plan for Phase 2 (SQLite Persistence) and Phase 3 (Context Survival) using Test-Driven Development (TDD). Both phases are developed in parallel using shared interfaces.

### 1.1 Key Metrics

| Metric | Target |
|--------|--------|
| Total Tests | 188 (102 Phase 2 + 86 Phase 3) |
| Line Coverage | 95% |
| Function Coverage | 95% |
| Branch Coverage | 90% |
| Implementation Duration | 10 days |

### 1.2 Parallel Development Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Parallel Development Timeline                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Day 1-2: Foundation                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐                │
│  │     Phase 2         │    │     Phase 3         │                │
│  │  Shared Interfaces  │◄──►│  Mock Implementations│                │
│  │  SQLite Connection  │    │  Contract Tests     │                │
│  └─────────────────────┘    └─────────────────────┘                │
│                                                                      │
│  Day 3-5: Core Implementation                                        │
│  ┌─────────────────────┐    ┌─────────────────────┐                │
│  │     Phase 2         │    │     Phase 3         │                │
│  │  Mission/Sortie Ops │    │  Checkpoint Service │                │
│  │  Lock/Event Ops     │    │  Recovery System    │                │
│  └─────────────────────┘    └─────────────────────┘                │
│                                                                      │
│  Day 6-8: API & CLI                                                  │
│  ┌─────────────────────┐    ┌─────────────────────┐                │
│  │     Phase 2         │    │     Phase 3         │                │
│  │  API Endpoints      │    │  CLI Commands       │                │
│  │  Event Schemas      │    │  API Endpoints      │                │
│  └─────────────────────┘    └─────────────────────┘                │
│                                                                      │
│  Day 9-10: Integration                                               │
│  ┌─────────────────────────────────────────────────┐               │
│  │              Combined Integration                │               │
│  │  Swap Mocks ──► Real Implementations            │               │
│  │  E2E Tests ──► Full System Verification         │               │
│  └─────────────────────────────────────────────────┘               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 10-Day Implementation Timeline

### Day 1: Foundation & Interfaces

**Phase 2 Tasks:**
- [ ] Create `squawk/src/db/types.ts` with all interfaces
- [ ] Create `tests/helpers/test-sqlite.ts` utilities
- [ ] Write CONN-001 to CONN-005 (SQLite connection tests)
- [ ] Implement SQLite connection with WAL mode

**Phase 3 Tasks:**
- [ ] Create `tests/helpers/mock-database.ts` with mock implementations
- [ ] Write contract tests for all interfaces
- [ ] Verify mocks pass contract tests
- [ ] Setup Phase 3 test fixtures

**Deliverables:**
- Shared interfaces defined
- SQLite connection working
- Mock implementations ready
- Contract tests passing

**Tests to Write:** 15 tests
- 5 SQLite connection tests (Phase 2)
- 10 contract tests (Phase 3)

---

### Day 2: Event Operations & Checkpoint Storage

**Phase 2 Tasks:**
- [ ] Write EVT-001 to EVT-008 (Event operations tests)
- [ ] Implement `EventOps` interface
- [ ] Create event append with sequence numbers
- [ ] Implement causation/correlation tracking

**Phase 3 Tasks:**
- [ ] Write STR-001 to STR-010 (Checkpoint storage tests)
- [ ] Implement `CheckpointStorage` class
- [ ] Create dual storage (SQLite + file)
- [ ] Implement file backup with symlinks

**Deliverables:**
- Event log working with append-only semantics
- Checkpoint storage with dual persistence
- All Day 2 tests passing

**Tests to Write:** 18 tests
- 8 event operations tests (Phase 2)
- 10 checkpoint storage tests (Phase 3)

---

### Day 3: Mission & Sortie Operations

**Phase 2 Tasks:**
- [ ] Write MSN-001 to MSN-012 (Mission operations tests)
- [ ] Implement `MissionOps` interface
- [ ] Write SRT-001 to SRT-015 (Sortie operations tests)
- [ ] Implement `SortieOps` interface

**Phase 3 Tasks:**
- [ ] Write CKP-001 to CKP-015 (Checkpoint service tests)
- [ ] Implement `CheckpointService` class
- [ ] Create progress milestone detection
- [ ] Implement error-triggered checkpoints

**Deliverables:**
- Mission CRUD operations working
- Sortie CRUD operations working
- Checkpoint service with triggers
- All Day 3 tests passing

**Tests to Write:** 42 tests
- 12 mission tests (Phase 2)
- 15 sortie tests (Phase 2)
- 15 checkpoint service tests (Phase 3)

---

### Day 4: Lock Operations & Recovery Detection

**Phase 2 Tasks:**
- [ ] Write LCK-001 to LCK-010 (Lock operations tests)
- [ ] Implement `LockOps` interface
- [ ] Create lock acquisition with conflict detection
- [ ] Implement lock expiration

**Phase 3 Tasks:**
- [ ] Write DET-001 to DET-008 (Recovery detection tests)
- [ ] Implement `RecoveryDetector` class
- [ ] Create stale mission detection
- [ ] Implement activity threshold checking

**Deliverables:**
- Lock management working
- Conflict detection working
- Recovery detection working
- All Day 4 tests passing

**Tests to Write:** 18 tests
- 10 lock operations tests (Phase 2)
- 8 recovery detection tests (Phase 3)

---

### Day 5: Event Schemas & State Restoration

**Phase 2 Tasks:**
- [ ] Write all 32 event schema tests
- [ ] Implement Zod schemas for all event types
- [ ] Create event type registry
- [ ] Validate schema coverage

**Phase 3 Tasks:**
- [ ] Write RST-001 to RST-012 (State restoration tests)
- [ ] Implement `StateRestorer` class
- [ ] Create sortie state restoration
- [ ] Implement lock re-acquisition

**Deliverables:**
- All 32 event schemas validated
- State restoration working
- Lock re-acquisition working
- All Day 5 tests passing

**Tests to Write:** 44 tests
- 32 event schema tests (Phase 2)
- 12 state restoration tests (Phase 3)

---

### Day 6: Phase 2 API Endpoints

**Phase 2 Tasks:**
- [ ] Write API-001 to API-010 (Core endpoint tests)
- [ ] Implement mailbox endpoints
- [ ] Implement cursor endpoints
- [ ] Implement lock endpoints
- [ ] Implement specialist endpoints

**Phase 3 Tasks:**
- [ ] Write INJ-001 to INJ-006 (Context injection tests)
- [ ] Implement `ContextInjector` class
- [ ] Create LLM-friendly prompt formatting
- [ ] Implement specialist-specific context

**Deliverables:**
- Core API endpoints working
- Context injection working
- All Day 6 tests passing

**Tests to Write:** 16 tests
- 10 API endpoint tests (Phase 2)
- 6 context injection tests (Phase 3)

---

### Day 7: Phase 2 API & Phase 3 CLI

**Phase 2 Tasks:**
- [ ] Write API-011 to API-020 (New endpoint tests)
- [ ] Implement sortie endpoints
- [ ] Implement mission endpoints
- [ ] Implement health endpoint with DB status

**Phase 3 Tasks:**
- [ ] Write CLI-001 to CLI-015 (CLI command tests)
- [ ] Implement `fleet checkpoint` command
- [ ] Implement `fleet resume` command
- [ ] Implement `fleet checkpoints` commands

**Deliverables:**
- All Phase 2 API endpoints working
- All Phase 3 CLI commands working
- All Day 7 tests passing

**Tests to Write:** 25 tests
- 10 API endpoint tests (Phase 2)
- 15 CLI command tests (Phase 3)

---

### Day 8: Phase 3 API & Cleanup

**Phase 2 Tasks:**
- [ ] Performance benchmarks
- [ ] Edge case testing
- [ ] Error handling verification

**Phase 3 Tasks:**
- [ ] Write API-301 to API-312 (Checkpoint API tests)
- [ ] Implement checkpoint API endpoints
- [ ] Write PRN-001 to PRN-008 (Pruning tests)
- [ ] Implement checkpoint pruning

**Deliverables:**
- Phase 3 API endpoints working
- Checkpoint pruning working
- All Day 8 tests passing

**Tests to Write:** 20 tests
- 12 checkpoint API tests (Phase 3)
- 8 pruning tests (Phase 3)

---

### Day 9: Integration Testing

**Combined Tasks:**
- [ ] Swap mock implementations for real SQLite
- [ ] Run all Phase 3 tests against real database
- [ ] Write integration tests for combined system
- [ ] Test Dispatch coordinator integration
- [ ] Test Specialist worker integration

**Deliverables:**
- Phase 3 working with real Phase 2 database
- Integration tests passing
- Coordinator integration verified

**Tests to Write:** 10 integration tests

---

### Day 10: E2E Testing & Polish

**Combined Tasks:**
- [ ] Write E2E tests for complete workflows
- [ ] Mission lifecycle E2E test
- [ ] Recovery flow E2E test
- [ ] Multi-agent recovery E2E test
- [ ] Coverage verification (95%+ target)
- [ ] Documentation updates
- [ ] Final code review

**Deliverables:**
- All E2E tests passing
- Coverage targets met
- Documentation complete
- Ready for deployment

**Tests to Write:** 9 E2E tests
- 5 Phase 2 E2E tests
- 4 Phase 3 E2E tests

---

## 3. Dependency Graph

### 3.1 Phase 2 Dependencies

```
                         ┌──────────────────┐
                         │  Shared Types    │
                         │  (types.ts)      │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
             ┌──────────┐  ┌──────────┐  ┌──────────┐
             │  SQLite  │  │  Event   │  │  Zod     │
             │Connection│  │  Schemas │  │ Schemas  │
             └────┬─────┘  └────┬─────┘  └────┬─────┘
                  │             │             │
                  └─────────────┼─────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
             ┌──────────┐           ┌──────────┐
             │ EventOps │           │ LockOps  │
             └────┬─────┘           └────┬─────┘
                  │                      │
                  └──────────┬───────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │MissionOps│  │SortieOps │  │Specialist│
        │          │  │          │  │   Ops    │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │             │             │
             └─────────────┼─────────────┘
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

### 3.2 Phase 3 Dependencies

```
                    ┌──────────────────┐
                    │  Mock Database   │
                    │  (Phase 2 Mocks) │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │Checkpoint│  │ Storage  │  │ Contract │
        │ Service  │  │  Layer   │  │  Tests   │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │             │             │
             └─────────────┼─────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │Detection │ │Restoration│ │ Context  │
        │          │ │          │ │ Injection│
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
        ┌──────────┐           ┌──────────┐
        │   CLI    │           │   API    │
        │ Commands │           │ Endpoints│
        └────┬─────┘           └────┬─────┘
             │                      │
             └──────────┬───────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   E2E Tests  │
                 └──────────────┘
```

### 3.3 Integration Dependencies

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Integration Point Timeline                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Day 1-8: Independent Development                                    │
│                                                                      │
│  Phase 2                          Phase 3                            │
│  ┌─────────────────┐              ┌─────────────────┐               │
│  │ Real SQLite     │              │ Mock Database   │               │
│  │ Implementation  │              │ Implementation  │               │
│  └────────┬────────┘              └────────┬────────┘               │
│           │                                │                        │
│           │    Shared Interfaces           │                        │
│           │    ◄──────────────────────────►│                        │
│           │                                │                        │
│                                                                      │
│  Day 9: Integration Point                                            │
│                                                                      │
│           ┌────────────────────────────────┐                        │
│           │                                │                        │
│           ▼                                ▼                        │
│  ┌─────────────────┐              ┌─────────────────┐               │
│  │ Phase 2 Real    │──────────────│ Phase 3 Uses    │               │
│  │ Implementation  │  Swap Mocks  │ Real Database   │               │
│  └─────────────────┘              └─────────────────┘               │
│                                                                      │
│  Day 10: Combined E2E                                                │
│                                                                      │
│           ┌─────────────────────────────────┐                       │
│           │     Full System Integration     │                       │
│           │  Phase 2 + Phase 3 + E2E Tests  │                       │
│           └─────────────────────────────────┘                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Integration Points

### 4.1 Mock-to-Real Swap Process

When Phase 2 is complete, Phase 3 swaps mock implementations:

```typescript
// Before: Using mocks
import { mockMissionOps, mockSortieOps, mockLockOps } from '../helpers/mock-database';

const checkpointService = new CheckpointService({
  missionOps: mockMissionOps,
  sortieOps: mockSortieOps,
  lockOps: mockLockOps,
});

// After: Using real implementations
import { createSQLiteAdapter } from '../../squawk/src/db/sqlite';

const db = await createSQLiteAdapter(dbPath);
await db.initialize();

const checkpointService = new CheckpointService({
  missionOps: db.missions,
  sortieOps: db.sorties,
  lockOps: db.locks,
});
```

### 4.2 Integration Test Structure

```typescript
// tests/integration/combined/full-system.test.ts

describe('Full System Integration', () => {
  let db: DatabaseAdapter;
  let checkpointService: CheckpointService;
  let recoveryService: RecoveryService;

  beforeAll(async () => {
    // Initialize real database
    db = await createSQLiteAdapter(':memory:');
    await db.initialize();

    // Initialize Phase 3 services with real database
    checkpointService = new CheckpointService({
      missionOps: db.missions,
      sortieOps: db.sorties,
      lockOps: db.locks,
      checkpointOps: db.checkpoints,
    });

    recoveryService = new RecoveryService({
      missionOps: db.missions,
      sortieOps: db.sorties,
      lockOps: db.locks,
      checkpointOps: db.checkpoints,
    });
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Mission with Checkpoints', () => {
    it('creates checkpoints at progress milestones', async () => {
      // Create mission with 4 sorties
      const mission = await db.missions.create({ title: 'Test Mission' });
      for (let i = 0; i < 4; i++) {
        await db.sorties.create({
          mission_id: mission.id,
          title: `Sortie ${i + 1}`,
        });
      }
      await db.missions.start(mission.id);

      // Complete first sortie (25%)
      const sorties = await db.sorties.getByMission(mission.id);
      await db.sorties.start(sorties[0].id, 'spec-1');
      await db.sorties.complete(sorties[0].id);

      // Check for checkpoint
      await checkpointService.checkProgress(mission.id);
      const checkpoint = await db.checkpoints.getLatest(mission.id);

      expect(checkpoint).not.toBeNull();
      expect(checkpoint!.trigger).toBe('progress');
      expect(checkpoint!.progress_percent).toBe(25);
    });
  });

  describe('Recovery Flow', () => {
    it('recovers mission state from checkpoint', async () => {
      // Create and start mission
      const mission = await db.missions.create({ title: 'Recovery Test' });
      await db.sorties.create({
        mission_id: mission.id,
        title: 'Test Sortie',
        assigned_to: 'spec-1',
      });
      await db.missions.start(mission.id);

      // Create checkpoint
      const checkpoint = await checkpointService.createCheckpoint({
        mission_id: mission.id,
        trigger: 'manual',
        created_by: 'dispatch-1',
      });

      // Simulate state change (would be lost on context death)
      const sorties = await db.sorties.getByMission(mission.id);
      await db.sorties.start(sorties[0].id, 'spec-1');
      await db.sorties.progress(sorties[0].id, 50, 'Halfway done');

      // Recover from checkpoint
      const result = await recoveryService.restore(checkpoint.id);

      expect(result.success).toBe(true);
      expect(result.recovery_context).toBeDefined();
    });
  });
});
```

---

## 5. Risk Mitigation Strategies

### 5.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Interface changes mid-development | Medium | High | Freeze interfaces Day 1, use versioning |
| Mock behavior differs from real | Medium | Medium | Contract tests verify both implementations |
| SQLite performance issues | Low | Medium | Benchmark tests, WAL mode optimization |
| Concurrent access bugs | Medium | High | Comprehensive lock tests, WAL mode |
| Recovery data corruption | Low | High | Dual storage, validation on load |

### 5.2 Schedule Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Phase 2 delays Phase 3 integration | Medium | Medium | Mock implementations allow parallel work |
| Test coverage gaps | Low | Medium | Daily coverage checks, TDD discipline |
| Integration issues on Day 9 | Medium | High | Contract tests ensure compatibility |
| E2E test failures | Medium | Medium | Buffer day for fixes |

### 5.3 Mitigation Actions

**Interface Stability:**
```typescript
// Version interfaces to handle changes
export interface MissionOps {
  /** @since 1.0.0 */
  create(input: CreateMissionInput): Promise<Mission>;
  
  /** @since 1.0.0 */
  getById(id: string): Promise<Mission | null>;
  
  /** @since 1.1.0 - Added for Phase 3 */
  getStats(id: string): Promise<MissionStats>;
}
```

**Contract Test Coverage:**
```bash
# Run contract tests for both implementations
bun test tests/contract/*.test.ts

# Verify mock matches real behavior
bun test tests/contract/mission-ops.contract.test.ts
```

**Daily Coverage Checks:**
```bash
# Check coverage meets targets
bun test --coverage | grep -E "^All files|Line|Function|Branch"

# Expected output:
# All files      |   95.2  |   90.5   |   95.8  |   95.2  |
```

---

## 6. Success Criteria Checklist

### 6.1 Phase 2 Success Criteria

**Functional:**
- [ ] All existing API endpoints return identical responses
- [ ] All existing tests pass without modification
- [ ] Events are append-only (no updates or deletes)
- [ ] Causation chains are correctly maintained
- [ ] Projections are consistent with event log
- [ ] Lock conflicts are correctly detected
- [ ] Checkpoints enable context recovery

**Performance:**
- [ ] Event append < 5ms p99
- [ ] Projection query < 5ms p99
- [ ] No performance regression vs JSON (for < 10K events)
- [ ] Linear scaling to 1M events

**Reliability:**
- [ ] Zero data loss on crash
- [ ] Successful recovery from WAL
- [ ] Correct behavior under concurrent access
- [ ] Graceful handling of disk full
- [ ] Automatic lock expiration works correctly

### 6.2 Phase 3 Success Criteria

**Functional:**
- [ ] Automatic checkpoints at 25%, 50%, 75% progress
- [ ] Error-triggered checkpoints capture context
- [ ] Manual checkpoint command works
- [ ] Recovery detects stale missions
- [ ] Recovery restores sortie states
- [ ] Recovery re-acquires valid locks
- [ ] Recovery context injected into prompts
- [ ] CLI commands work in local and synced modes
- [ ] API endpoints return correct responses
- [ ] Cleanup prevents unbounded growth

**Non-Functional:**
- [ ] Checkpoint creation < 100ms (p95)
- [ ] Recovery < 500ms (p95)
- [ ] No data loss on recovery
- [ ] Graceful handling of corrupted checkpoints
- [ ] Works offline (local mode)

### 6.3 Integration Success Criteria

- [ ] Phase 3 works with real Phase 2 database
- [ ] All contract tests pass for both implementations
- [ ] E2E tests pass for complete workflows
- [ ] Coverage targets met (95% line, 95% function, 90% branch)

### 6.4 Final Verification Checklist

```bash
# 1. Run all tests
bun test

# 2. Check coverage
bun test --coverage

# 3. Verify no TypeScript errors
bunx tsc --noEmit

# 4. Run E2E tests
bun test tests/e2e

# 5. Performance benchmarks
bun run benchmark

# 6. Integration verification
bun test tests/integration/combined
```

---

## 7. Test Commands Reference

### 7.1 Running Tests

```bash
# Run all tests
bun test

# Run Phase 2 tests only
bun test tests/unit/phase2 tests/integration/phase2

# Run Phase 3 tests only
bun test tests/unit/phase3 tests/integration/phase3

# Run specific test file
bun test tests/unit/phase2/operations/mission.test.ts

# Run tests matching pattern
bun test --test-name-pattern "should create mission"

# Run with coverage
bun test --coverage

# Run with verbose output
bun test --verbose

# Run in watch mode
bun test --watch
```

### 7.2 Coverage Commands

```bash
# Generate coverage report
bun test --coverage

# Generate HTML coverage report
bun test --coverage --coverage-reporter=html

# Check coverage thresholds
bun test --coverage | grep -E "Line|Function|Branch"
```

### 7.3 Debug Commands

```bash
# Run single test with debugging
bun test --inspect tests/unit/phase2/operations/mission.test.ts

# Run with verbose logging
DEBUG=* bun test tests/unit/phase2

# Run with test timeout
bun test --timeout 30000
```

---

## 8. File Creation Checklist

### 8.1 Phase 2 Files

**Source Files:**
- [ ] `squawk/src/db/types.ts` - Shared interfaces
- [ ] `squawk/src/db/sqlite.ts` - SQLite adapter
- [ ] `squawk/src/db/schema.ts` - Schema as TypeScript
- [ ] `squawk/src/db/operations/mission.ts` - Mission operations
- [ ] `squawk/src/db/operations/sortie.ts` - Sortie operations
- [ ] `squawk/src/db/operations/lock.ts` - Lock operations
- [ ] `squawk/src/db/operations/event.ts` - Event operations
- [ ] `squawk/src/events/schemas.ts` - Zod schemas
- [ ] `squawk/src/events/types.ts` - Event type definitions
- [ ] `squawk/src/events/registry.ts` - Event type registry

**Test Files:**
- [ ] `tests/helpers/test-sqlite.ts` - SQLite test utilities
- [ ] `tests/unit/phase2/sqlite/connection.test.ts`
- [ ] `tests/unit/phase2/operations/mission.test.ts`
- [ ] `tests/unit/phase2/operations/sortie.test.ts`
- [ ] `tests/unit/phase2/operations/lock.test.ts`
- [ ] `tests/unit/phase2/operations/event.test.ts`
- [ ] `tests/unit/phase2/events/schemas.test.ts`
- [ ] `tests/integration/phase2/api/*.test.ts`
- [ ] `tests/e2e/phase2/*.test.ts`

### 8.2 Phase 3 Files

**Source Files:**
- [ ] `server/api/src/checkpoints/index.ts` - API routes
- [ ] `server/api/src/checkpoints/service.ts` - Checkpoint service
- [ ] `server/api/src/checkpoints/storage.ts` - Dual storage
- [ ] `server/api/src/checkpoints/recovery.ts` - Recovery algorithm
- [ ] `cli/src/commands/checkpoint.ts` - CLI checkpoint command
- [ ] `cli/src/commands/resume.ts` - CLI resume command
- [ ] `cli/src/commands/checkpoints.ts` - CLI checkpoints commands

**Test Files:**
- [ ] `tests/helpers/mock-database.ts` - Mock implementations
- [ ] `tests/helpers/contract-tests.ts` - Contract test utilities
- [ ] `tests/unit/phase3/checkpoint/service.test.ts`
- [ ] `tests/unit/phase3/checkpoint/storage.test.ts`
- [ ] `tests/unit/phase3/recovery/detection.test.ts`
- [ ] `tests/unit/phase3/recovery/restoration.test.ts`
- [ ] `tests/unit/phase3/recovery/context-injection.test.ts`
- [ ] `tests/unit/phase3/cleanup/pruning.test.ts`
- [ ] `tests/integration/phase3/api/*.test.ts`
- [ ] `tests/integration/phase3/cli/*.test.ts`
- [ ] `tests/e2e/phase3/*.test.ts`

### 8.3 Shared Files

- [ ] `tests/fixtures/phase3/checkpoint-sample.json`
- [ ] `tests/fixtures/phase3/recovery-context-sample.json`
- [ ] `tests/contract/mission-ops.contract.test.ts`
- [ ] `tests/contract/sortie-ops.contract.test.ts`
- [ ] `tests/contract/lock-ops.contract.test.ts`
- [ ] `tests/contract/checkpoint-ops.contract.test.ts`
- [ ] `tests/integration/combined/full-system.test.ts`

---

## 9. Daily Standup Template

Use this template for daily progress tracking:

```markdown
## Day [N] Standup - [Date]

### Yesterday
- [ ] Completed: [list completed tasks]
- [ ] Tests written: [count]
- [ ] Tests passing: [count]/[total]

### Today
- [ ] Phase 2: [tasks]
- [ ] Phase 3: [tasks]
- [ ] Target tests: [count]

### Blockers
- [list any blockers]

### Coverage
- Line: [X]%
- Function: [X]%
- Branch: [X]%

### Notes
- [any relevant notes]
```

---

## 10. Conclusion

This implementation guide provides a structured approach to developing Phase 2 and Phase 3 in parallel using TDD. Key success factors:

1. **Interface-first design** enables parallel development
2. **Contract tests** ensure mock and real implementations behave identically
3. **Daily coverage checks** maintain quality standards
4. **Clear integration points** minimize Day 9 surprises
5. **Risk mitigation** addresses potential issues proactively

Follow the day-by-day plan, maintain test discipline, and the integration on Day 9 should be smooth.

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-01-04  
**Author:** Documentation Specialist
