# Phase 6: Integration Testing Specification

**Date**: 2026-01-06  
**Phase**: 6 of 7  
**Status**: Specification Complete  
**Effort**: 1-2 weeks  
**Risk Level**: Low

---

## Executive Summary

Phase 6 focuses on creating comprehensive end-to-end integration tests for FleetTools. These tests validate that all components (CLI, API, Squawk, Flightline, CTK) work together correctly in realistic workflows.

## Objectives

1. **Validate Workflows**: Test complete fleet coordination workflows
2. **Ensure Reliability**: Verify error handling and recovery
3. **Measure Coverage**: Achieve >80% code coverage for integration paths
4. **Document Patterns**: Create reusable test patterns for future development

## Scope

### 4 Test Categories (10 Tests Total)

#### Category 1: End-to-End Coordination (3 Tests)
- Complete fleet workflow
- Multi-specialist coordination
- Error recovery and retry

#### Category 2: Specialist Spawning (3 Tests)
- Parallel spawning
- Sequential coordination
- Blocker handling

#### Category 3: Checkpoint/Resume (2 Tests)
- Checkpoint creation
- Resume from checkpoint

#### Category 4: API Integration (2 Tests)
- Full API workflow
- Concurrent operations

## Detailed Test Specifications

### TEST-601: Complete Fleet Workflow

**Objective**: Validate end-to-end fleet coordination

**Setup**:
```typescript
// Create work order
const workOrder = await createWorkOrder({
  title: "Implement user authentication",
  description: "Add JWT-based auth",
  priority: "high"
});

// Create specialists
const specialists = await spawnSpecialists(3);
```

**Workflow**:
1. Create work order
2. Spawn 3 specialists
3. Specialist 1: Research phase
4. Specialist 2: Planning phase
5. Specialist 3: Implementation phase
6. Collect results
7. Complete work order

**Assertions**:
- [ ] Work order created successfully
- [ ] All 3 specialists spawned
- [ ] Each specialist completes assigned phase
- [ ] Results collected correctly
- [ ] Work order marked complete
- [ ] All events emitted correctly

**Expected Duration**: 30 seconds

---

### TEST-602: Multi-Specialist Coordination with Dependencies

**Objective**: Validate dependency handling between specialists

**Setup**:
```typescript
// Create dependent tasks
const tasks = [
  { id: "task-1", title: "Setup database", dependencies: [] },
  { id: "task-2", title: "Create schema", dependencies: ["task-1"] },
  { id: "task-3", title: "Seed data", dependencies: ["task-2"] }
];
```

**Workflow**:
1. Create 3 dependent tasks
2. Spawn specialists for each task
3. Verify task-1 completes first
4. Verify task-2 waits for task-1
5. Verify task-3 waits for task-2
6. Collect results in order

**Assertions**:
- [ ] Task-1 completes first
- [ ] Task-2 waits for task-1
- [ ] Task-3 waits for task-2
- [ ] All tasks complete successfully
- [ ] Results in correct order
- [ ] No race conditions

**Expected Duration**: 45 seconds

---

### TEST-603: Error Recovery and Retry Logic

**Objective**: Validate error handling and recovery

**Setup**:
```typescript
// Create task that will fail
const failingTask = {
  title: "Failing task",
  shouldFail: true,
  retryCount: 3
};
```

**Workflow**:
1. Create task that fails
2. Spawn specialist
3. Specialist fails (first attempt)
4. System retries (attempt 2)
5. Specialist fails (attempt 2)
6. System retries (attempt 3)
7. Specialist succeeds (attempt 3)
8. Work order marked complete

**Assertions**:
- [ ] First attempt fails
- [ ] System retries automatically
- [ ] Retry count tracked correctly
- [ ] Specialist succeeds on retry
- [ ] Error events emitted
- [ ] Work order completes

**Expected Duration**: 60 seconds

---

### TEST-604: Parallel Specialist Spawning

**Objective**: Validate parallel execution of independent tasks

**Setup**:
```typescript
// Create 5 independent tasks
const tasks = [
  { id: "task-1", title: "Task 1", dependencies: [] },
  { id: "task-2", title: "Task 2", dependencies: [] },
  { id: "task-3", title: "Task 3", dependencies: [] },
  { id: "task-4", title: "Task 4", dependencies: [] },
  { id: "task-5", title: "Task 5", dependencies: [] }
];
```

**Workflow**:
1. Create 5 independent tasks
2. Spawn 5 specialists in parallel
3. All specialists execute concurrently
4. Collect results as they complete
5. Verify all tasks complete

**Assertions**:
- [ ] All 5 specialists spawned
- [ ] Specialists execute in parallel
- [ ] All tasks complete
- [ ] Execution time < sequential time
- [ ] No race conditions
- [ ] Results collected correctly

**Expected Duration**: 30 seconds (parallel) vs 150 seconds (sequential)

---

### TEST-605: Sequential Coordination for Dependent Tasks

**Objective**: Validate sequential execution of dependent tasks

**Setup**:
```typescript
// Create 5 dependent tasks (linear chain)
const tasks = [
  { id: "task-1", dependencies: [] },
  { id: "task-2", dependencies: ["task-1"] },
  { id: "task-3", dependencies: ["task-2"] },
  { id: "task-4", dependencies: ["task-3"] },
  { id: "task-5", dependencies: ["task-4"] }
];
```

**Workflow**:
1. Create 5 dependent tasks
2. Spawn specialists
3. Task-1 executes
4. Task-2 waits for task-1
5. Task-3 waits for task-2
6. Task-4 waits for task-3
7. Task-5 waits for task-4
8. All complete in order

**Assertions**:
- [ ] Tasks execute in order
- [ ] No task starts before dependency completes
- [ ] All tasks complete
- [ ] Execution time = sum of individual times
- [ ] No race conditions
- [ ] Dependency graph respected

**Expected Duration**: 150 seconds (sequential)

---

### TEST-606: Blocker Detection and Handling

**Objective**: Validate blocker detection and resolution

**Setup**:
```typescript
// Create tasks with blockers
const tasks = [
  { id: "task-1", title: "Blocked task", blockedBy: ["task-2"] },
  { id: "task-2", title: "Blocking task", dependencies: [] }
];
```

**Workflow**:
1. Create task-1 (blocked by task-2)
2. Create task-2 (blocking task)
3. Spawn specialist for task-1
4. Specialist detects blocker
5. Specialist waits for task-2
6. Spawn specialist for task-2
7. Task-2 completes
8. Task-1 unblocked and completes

**Assertions**:
- [ ] Blocker detected correctly
- [ ] Task-1 waits for task-2
- [ ] Task-2 completes
- [ ] Task-1 unblocked
- [ ] Task-1 completes
- [ ] Blocker events emitted

**Expected Duration**: 45 seconds

---

### TEST-607: Checkpoint Creation at Progress Milestones

**Objective**: Validate checkpoint creation at 25%, 50%, 75% progress

**Setup**:
```typescript
// Create long-running task
const task = {
  title: "Long-running task",
  duration: 120000, // 2 minutes
  checkpointIntervals: [25, 50, 75]
};
```

**Workflow**:
1. Start long-running task
2. At 25% progress: Create checkpoint
3. Verify checkpoint saved
4. At 50% progress: Create checkpoint
5. Verify checkpoint saved
6. At 75% progress: Create checkpoint
7. Verify checkpoint saved
8. Task completes

**Assertions**:
- [ ] Checkpoint created at 25%
- [ ] Checkpoint created at 50%
- [ ] Checkpoint created at 75%
- [ ] All checkpoints saved to SQLite
- [ ] Checkpoint metadata correct
- [ ] Task completes successfully

**Expected Duration**: 120 seconds

---

### TEST-608: Resume from Checkpoint

**Objective**: Validate resuming execution from checkpoint

**Setup**:
```typescript
// Create checkpoint
const checkpoint = await createCheckpoint({
  workOrderId: "wo-123",
  progress: 50,
  state: { /* task state */ }
});
```

**Workflow**:
1. Create work order
2. Start execution
3. Create checkpoint at 50%
4. Stop execution
5. Verify checkpoint saved
6. Resume from checkpoint
7. Continue execution from 50%
8. Complete task

**Assertions**:
- [ ] Checkpoint created at 50%
- [ ] Execution stopped
- [ ] Checkpoint loaded correctly
- [ ] Execution resumed at 50%
- [ ] Task completes from checkpoint
- [ ] No data loss

**Expected Duration**: 90 seconds

---

### TEST-609: Full API Workflow

**Objective**: Validate complete API workflow

**Workflow**:
1. Create work order via API
2. Append events to mailbox
3. Acquire file lock via CTK
4. Update work order status
5. Advance cursor position
6. Release file lock
7. Complete work order

**API Calls**:
```bash
# Create work order
POST /api/v1/work-orders

# Append events
POST /api/v1/mailbox/append

# Reserve file
POST /api/v1/ctk/reserve

# Update work order
PATCH /api/v1/work-orders/:id

# Advance cursor
POST /api/v1/cursor/advance

# Release reservation
POST /api/v1/ctk/release

# Get coordinator status
GET /api/v1/coordinator/status
```

**Assertions**:
- [ ] Work order created
- [ ] Events appended
- [ ] File reserved
- [ ] Work order updated
- [ ] Cursor advanced
- [ ] Reservation released
- [ ] Coordinator status correct

**Expected Duration**: 30 seconds

---

### TEST-610: Concurrent API Operations with Lock Conflicts

**Objective**: Validate lock conflict resolution

**Setup**:
```typescript
// Create 2 concurrent operations on same file
const operations = [
  { id: "op-1", file: "/path/to/file.txt", action: "write" },
  { id: "op-2", file: "/path/to/file.txt", action: "write" }
];
```

**Workflow**:
1. Operation 1: Reserve file
2. Operation 2: Try to reserve same file (should wait)
3. Operation 1: Complete and release
4. Operation 2: Acquire lock
5. Operation 2: Complete and release

**Assertions**:
- [ ] Operation 1 acquires lock
- [ ] Operation 2 waits for lock
- [ ] Operation 1 releases lock
- [ ] Operation 2 acquires lock
- [ ] No concurrent writes
- [ ] Lock timeout works

**Expected Duration**: 45 seconds

---

## Test Infrastructure

### Test Framework
- **Framework**: Jest (or Bun test)
- **Language**: TypeScript
- **Assertion Library**: Jest matchers

### Test Utilities
```typescript
// Helper functions
async function createWorkOrder(data): Promise<WorkOrder>
async function spawnSpecialists(count): Promise<Specialist[]>
async function createCheckpoint(data): Promise<Checkpoint>
async function waitForCompletion(workOrderId): Promise<void>
async function getWorkOrderStatus(id): Promise<Status>
```

### Test Database
- Separate SQLite database for tests
- Auto-cleanup after each test
- Fixtures for common data

### Test Server
- Start API server before tests
- Stop server after tests
- Use test port (3002)

## Test Organization

```
tests/
├── e2e/
│   ├── coordination.test.ts       # TEST-601, 602, 603
│   ├── spawning.test.ts           # TEST-604, 605, 606
│   ├── checkpoint.test.ts         # TEST-607, 608
│   ├── api-integration.test.ts    # TEST-609, 610
│   └── fixtures/
│       ├── work-orders.ts
│       ├── specialists.ts
│       └── tasks.ts
├── helpers/
│   ├── api-client.ts
│   ├── test-server.ts
│   └── test-db.ts
└── setup.ts                        # Global test setup
```

## Success Criteria

### Test Coverage
- [ ] 10 integration tests implemented
- [ ] All tests passing
- [ ] >80% code coverage for integration paths
- [ ] No flaky tests

### Documentation
- [ ] Test documentation complete
- [ ] Test patterns documented
- [ ] Troubleshooting guide created
- [ ] CI/CD pipeline configured

### Quality
- [ ] All tests deterministic
- [ ] No race conditions
- [ ] Proper cleanup
- [ ] Clear error messages

## Acceptance Criteria

- [ ] All 10 tests passing consistently
- [ ] >80% code coverage
- [ ] Documentation complete
- [ ] CI/CD pipeline configured
- [ ] No known flaky tests
- [ ] Performance benchmarks established

## Dependencies

- Phase 4: API Server (required)
- Phase 5: Plugins (optional)
- SQLite database (required)
- Jest/Bun test framework (required)

## Deliverables

1. **Test Files**
   - `tests/e2e/coordination.test.ts`
   - `tests/e2e/spawning.test.ts`
   - `tests/e2e/checkpoint.test.ts`
   - `tests/e2e/api-integration.test.ts`

2. **Test Utilities**
   - `tests/helpers/api-client.ts`
   - `tests/helpers/test-server.ts`
   - `tests/helpers/test-db.ts`
   - `tests/fixtures/*`

3. **Documentation**
   - `docs/integration-testing-guide.md`
   - `docs/test-patterns.md`
   - `docs/troubleshooting.md`

4. **CI/CD Configuration**
   - `.github/workflows/integration-tests.yml`
   - Test coverage reports

## Timeline

| Week | Deliverable |
|------|-------------|
| 1 | Test infrastructure + TEST-601 to TEST-606 |
| 2 | TEST-607 to TEST-610 + Documentation |

## Effort Breakdown

| Task | Effort |
|------|--------|
| Test infrastructure | 2 days |
| TEST-601 to TEST-606 | 3 days |
| TEST-607 to TEST-610 | 2 days |
| Documentation | 2 days |
| CI/CD setup | 1 day |
| **Total** | **10 days** |

---

## Notes

- Tests should be deterministic and not flaky
- Use proper cleanup to avoid test pollution
- Mock external services (Claude API, etc.)
- Establish performance baselines
- Document any known limitations

---

**Status**: Ready for Implementation  
**Confidence**: 0.95  
**Last Updated**: 2026-01-06
