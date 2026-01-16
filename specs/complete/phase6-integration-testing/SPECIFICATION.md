# Phase 6 Integration Testing - Detailed Specification

**Date**: January 6, 2026  
**Phase**: 6 of 7  
**Status**: Specification Complete  
**Confidence**: 0.95

---

## Overview

This specification details the 10 integration tests for FleetTools Phase 6. Each test validates a critical workflow or component interaction.

---

## TEST-601: Complete Fleet Workflow

**Category**: End-to-End Coordination  
**Objective**: Validate complete fleet workflow from work order creation to completion

### Setup
```typescript
const workOrder = await api.createWorkOrder({
  title: "Implement user authentication",
  description: "Add JWT-based auth",
  priority: "high"
});

const specialists = await spawnSpecialists(3);
```

### Workflow
1. Create work order
2. Spawn 3 specialists
3. Specialist 1: Research phase
4. Specialist 2: Planning phase
5. Specialist 3: Implementation phase
6. Collect results
7. Complete work order

### Assertions
- [ ] Work order created with valid ID
- [ ] All 3 specialists spawned successfully
- [ ] Each specialist completes assigned phase
- [ ] Results collected correctly
- [ ] Work order marked complete
- [ ] All events emitted correctly

### Duration**: 30 seconds

---

## TEST-602: Multi-Specialist Coordination

**Category**: End-to-End Coordination  
**Objective**: Validate dependency handling between specialists

### Setup
```typescript
const tasks = [
  { id: "task-1", title: "Setup database", dependencies: [] },
  { id: "task-2", title: "Create schema", dependencies: ["task-1"] },
  { id: "task-3", title: "Seed data", dependencies: ["task-2"] }
];
```

### Workflow
1. Create 3 dependent tasks
2. Spawn specialists for each task
3. Verify task-1 completes first
4. Verify task-2 waits for task-1
5. Verify task-3 waits for task-2
6. Collect results in order

### Assertions
- [ ] Task-1 completes first
- [ ] Task-2 waits for task-1
- [ ] Task-3 waits for task-2
- [ ] All tasks complete successfully
- [ ] Results in correct order
- [ ] No race conditions

### Duration**: 45 seconds

---

## TEST-603: Error Recovery and Retry

**Category**: End-to-End Coordination  
**Objective**: Validate error handling and recovery

### Setup
```typescript
const failingTask = {
  title: "Failing task",
  shouldFail: true,
  retryCount: 3
};
```

### Workflow
1. Create task that fails
2. Spawn specialist
3. Specialist fails (first attempt)
4. System retries (attempt 2)
5. Specialist fails (attempt 2)
6. System retries (attempt 3)
7. Specialist succeeds (attempt 3)
8. Work order marked complete

### Assertions
- [ ] First attempt fails
- [ ] System retries automatically
- [ ] Retry count tracked correctly
- [ ] Specialist succeeds on retry
- [ ] Error events emitted
- [ ] Work order completes

### Duration**: 60 seconds

---

## TEST-604: Parallel Specialist Spawning

**Category**: Specialist Spawning  
**Objective**: Validate parallel execution of independent tasks

### Setup
```typescript
const tasks = [
  { id: "task-1", title: "Task 1", dependencies: [] },
  { id: "task-2", title: "Task 2", dependencies: [] },
  { id: "task-3", title: "Task 3", dependencies: [] },
  { id: "task-4", title: "Task 4", dependencies: [] },
  { id: "task-5", title: "Task 5", dependencies: [] }
];
```

### Workflow
1. Create 5 independent tasks
2. Spawn 5 specialists in parallel
3. All specialists execute concurrently
4. Collect results as they complete
5. Verify all tasks complete

### Assertions
- [ ] All 5 specialists spawned
- [ ] Specialists execute in parallel
- [ ] All tasks complete
- [ ] Execution time < sequential time
- [ ] No race conditions
- [ ] Results collected correctly

### Duration**: 30 seconds (parallel) vs 150 seconds (sequential)

---

## TEST-605: Sequential Coordination

**Category**: Specialist Spawning  
**Objective**: Validate sequential execution of dependent tasks

### Setup
```typescript
const tasks = [
  { id: "task-1", dependencies: [] },
  { id: "task-2", dependencies: ["task-1"] },
  { id: "task-3", dependencies: ["task-2"] },
  { id: "task-4", dependencies: ["task-3"] },
  { id: "task-5", dependencies: ["task-4"] }
];
```

### Workflow
1. Create 5 dependent tasks
2. Spawn specialists
3. Task-1 executes
4. Task-2 waits for task-1
5. Task-3 waits for task-2
6. Task-4 waits for task-3
7. Task-5 waits for task-4
8. All complete in order

### Assertions
- [ ] Tasks execute in order
- [ ] No task starts before dependency completes
- [ ] All tasks complete
- [ ] Execution time = sum of individual times
- [ ] No race conditions
- [ ] Dependency graph respected

### Duration**: 150 seconds (sequential)

---

## TEST-606: Blocker Detection

**Category**: Specialist Spawning  
**Objective**: Validate blocker detection and resolution

### Setup
```typescript
const tasks = [
  { id: "task-1", title: "Blocked task", blockedBy: ["task-2"] },
  { id: "task-2", title: "Blocking task", dependencies: [] }
];
```

### Workflow
1. Create task-1 (blocked by task-2)
2. Create task-2 (blocking task)
3. Spawn specialist for task-1
4. Specialist detects blocker
5. Specialist waits for task-2
6. Spawn specialist for task-2
7. Task-2 completes
8. Task-1 unblocked and completes

### Assertions
- [ ] Blocker detected correctly
- [ ] Task-1 waits for task-2
- [ ] Task-2 completes
- [ ] Task-1 unblocked
- [ ] Task-1 completes
- [ ] Blocker events emitted

### Duration**: 45 seconds

---

## TEST-607: Checkpoint Creation

**Category**: Checkpoint/Resume  
**Objective**: Validate checkpoint creation at progress milestones

### Setup
```typescript
const task = {
  title: "Long-running task",
  duration: 120000, // 2 minutes
  checkpointIntervals: [25, 50, 75]
};
```

### Workflow
1. Start long-running task
2. At 25% progress: Create checkpoint
3. Verify checkpoint saved
4. At 50% progress: Create checkpoint
5. Verify checkpoint saved
6. At 75% progress: Create checkpoint
7. Verify checkpoint saved
8. Task completes

### Assertions
- [ ] Checkpoint created at 25%
- [ ] Checkpoint created at 50%
- [ ] Checkpoint created at 75%
- [ ] All checkpoints saved to SQLite
- [ ] Checkpoint metadata correct
- [ ] Task completes successfully

### Duration**: 120 seconds

---

## TEST-608: Resume from Checkpoint

**Category**: Checkpoint/Resume  
**Objective**: Validate resuming execution from checkpoint

### Setup
```typescript
const checkpoint = await createCheckpoint({
  workOrderId: "wo-123",
  progress: 50,
  state: { /* task state */ }
});
```

### Workflow
1. Create work order
2. Start execution
3. Create checkpoint at 50%
4. Stop execution
5. Verify checkpoint saved
6. Resume from checkpoint
7. Continue execution from 50%
8. Complete task

### Assertions
- [ ] Checkpoint created at 50%
- [ ] Execution stopped
- [ ] Checkpoint loaded correctly
- [ ] Execution resumed at 50%
- [ ] Task completes from checkpoint
- [ ] No data loss

### Duration**: 90 seconds

---

## TEST-609: Full API Workflow

**Category**: API Integration  
**Objective**: Validate complete API workflow

### Workflow
1. Create work order via API
2. Append events to mailbox
3. Acquire file lock via CTK
4. Update work order status
5. Advance cursor position
6. Release file lock
7. Complete work order

### API Calls
```bash
POST /api/v1/work-orders
POST /api/v1/mailbox/append
POST /api/v1/ctk/reserve
PATCH /api/v1/work-orders/:id
POST /api/v1/cursor/advance
POST /api/v1/ctk/release
GET /api/v1/coordinator/status
```

### Assertions
- [ ] Work order created
- [ ] Events appended
- [ ] File reserved
- [ ] Work order updated
- [ ] Cursor advanced
- [ ] Reservation released
- [ ] Coordinator status correct

### Duration**: 30 seconds

---

## TEST-610: Concurrent API Operations

**Category**: API Integration  
**Objective**: Validate lock conflict resolution

### Setup
```typescript
const operations = [
  { id: "op-1", file: "/path/to/file.txt", action: "write" },
  { id: "op-2", file: "/path/to/file.txt", action: "write" }
];
```

### Workflow
1. Operation 1: Reserve file
2. Operation 2: Try to reserve same file (should wait)
3. Operation 1: Complete and release
4. Operation 2: Acquire lock
5. Operation 2: Complete and release

### Assertions
- [ ] Operation 1 acquires lock
- [ ] Operation 2 waits for lock
- [ ] Operation 1 releases lock
- [ ] Operation 2 acquires lock
- [ ] No concurrent writes
- [ ] Lock timeout works

### Duration**: 45 seconds

---

## Test Infrastructure

### Test Framework
- **Framework**: Jest (or Bun test)
- **Language**: TypeScript
- **Assertion Library**: Jest matchers

### Test Utilities
```typescript
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

---

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
└── setup.ts
```

---

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

---

**Specification Complete**: January 6, 2026  
**Confidence**: 95%  
**Status**: ✅ Ready for Phase 4 (Plan)
