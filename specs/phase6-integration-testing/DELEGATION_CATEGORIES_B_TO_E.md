# DELEGATION: Categories B-E - Integration Test Implementation

**Delegate To**: @test-generator  
**Tasks**: TASK-407 through TASK-416 (10 integration tests)  
**Total Effort**: 60 hours (4-5 days)  
**Priority**: HIGH  
**Dependencies**: Category A (infrastructure) must be complete first  
**Status**: Ready for Delegation

---

## Executive Summary

You are responsible for implementing all 10 integration tests for Phase 6. These tests validate complete fleet coordination workflows, specialist spawning, checkpoint/resume functionality, and API integration.

**Critical**: Tests must be deterministic, reliable, and pass consistently. No flaky tests allowed.

---

## Category B: Coordination Tests (TASK-407 to TASK-409)

### TASK-407: Implement TEST-601 (Complete Fleet Workflow) - 6 hours

**File**: `tests/e2e/coordination.test.ts`

**Objective**: Test complete fleet workflow from work order creation to completion

**Test Structure**:
```typescript
describe('Coordination Workflows', () => {
  let api: TestAPIClient
  let db: Database
  let server: TestServer

  beforeAll(async () => {
    db = await initializeTestDatabase()
    server = await startTestServer({ database: db })
    api = new TestAPIClient(server.baseUrl)
  })

  afterAll(async () => {
    await stopTestServer(server)
    await cleanupTestDatabase(db)
  })

  describe('Complete Fleet Workflow', () => {
    it('should complete research → plan → work → review cycle', async () => {
      // TEST-601 implementation
    })
  })
})
```

**Implementation Steps**:
1. Create work order: `const wo = await api.createWorkOrder({ title: '...', priority: 'high' })`
2. Spawn 3 specialists: `const specialists = await spawnSpecialists(3)`
3. Assign phases: Research, Planning, Implementation
4. Execute each phase with specialist
5. Collect results from each specialist
6. Update work order status to complete
7. Verify all events emitted

**Assertions**:
```typescript
expect(wo).toHaveProperty('id')
expect(specialists).toHaveLength(3)
expect(results).toHaveLength(3)
expect(wo.status).toBe('complete')
expect(events).toContainEqual(expect.objectContaining({ type: 'phase_complete' }))
```

**Expected Duration**: 30 seconds

**Acceptance Criteria**:
- [ ] Test passes consistently
- [ ] All assertions pass
- [ ] Completes in ~30 seconds
- [ ] No flaky behavior
- [ ] Clear error messages

---

### TASK-408: Implement TEST-602 (Multi-Specialist Coordination) - 6 hours

**File**: `tests/e2e/coordination.test.ts` (add to existing file)

**Objective**: Test dependency handling between specialists

**Test Structure**:
```typescript
describe('Multi-Specialist Coordination', () => {
  it('should respect task dependencies', async () => {
    // TEST-602 implementation
  })
})
```

**Implementation Steps**:
1. Create 3 dependent tasks:
   ```typescript
   const tasks = [
     { id: 'task-1', title: 'Setup database', dependencies: [] },
     { id: 'task-2', title: 'Create schema', dependencies: ['task-1'] },
     { id: 'task-3', title: 'Seed data', dependencies: ['task-2'] }
   ]
   ```
2. Spawn specialists for each task
3. Track completion order
4. Verify task-1 completes first
5. Verify task-2 waits for task-1
6. Verify task-3 waits for task-2
7. Collect results in order

**Assertions**:
```typescript
expect(completionOrder).toEqual(['task-1', 'task-2', 'task-3'])
expect(task2StartTime).toBeGreaterThan(task1EndTime)
expect(task3StartTime).toBeGreaterThan(task2EndTime)
```

**Expected Duration**: 45 seconds

**Acceptance Criteria**:
- [ ] Test passes consistently
- [ ] Dependencies respected
- [ ] Completion order correct
- [ ] No race conditions
- [ ] Completes in ~45 seconds

---

### TASK-409: Implement TEST-603 (Error Recovery and Retry) - 6 hours

**File**: `tests/e2e/coordination.test.ts` (add to existing file)

**Objective**: Test error handling and recovery

**Test Structure**:
```typescript
describe('Error Recovery', () => {
  it('should retry on transient failures', async () => {
    // TEST-603 implementation
  })
})
```

**Implementation Steps**:
1. Create task that fails initially
2. Spawn specialist
3. Verify first attempt fails
4. Verify system retries automatically
5. Verify retry count tracked
6. Verify specialist succeeds on retry
7. Verify error events emitted

**Assertions**:
```typescript
expect(attempt1).toThrow()
expect(retryCount).toBe(2)
expect(finalResult).toBe('success')
expect(events).toContainEqual(expect.objectContaining({ type: 'retry' }))
```

**Expected Duration**: 60 seconds

**Acceptance Criteria**:
- [ ] Test passes consistently
- [ ] Retries work correctly
- [ ] Retry count tracked
- [ ] Success after retry
- [ ] Error events emitted

---

## Category C: Spawning Tests (TASK-410 to TASK-412)

### TASK-410: Implement TEST-604 (Parallel Specialist Spawning) - 6 hours

**File**: `tests/e2e/spawning.test.ts`

**Objective**: Test parallel execution of independent tasks

**Test Structure**:
```typescript
describe('Specialist Spawning', () => {
  describe('Parallel Execution', () => {
    it('should spawn and execute specialists in parallel', async () => {
      // TEST-604 implementation
    })
  })
})
```

**Implementation Steps**:
1. Create 5 independent tasks
2. Record start time
3. Spawn 5 specialists in parallel using `Promise.all()`
4. Wait for all to complete
5. Record end time
6. Verify execution time < sequential time (30s vs 150s)
7. Verify all tasks complete

**Assertions**:
```typescript
expect(parallelTime).toBeLessThan(50000) // 50 seconds
expect(parallelTime).toBeLessThan(sequentialTime / 3) // Much faster than sequential
expect(results).toHaveLength(5)
expect(results.every(r => r.status === 'complete')).toBe(true)
```

**Expected Duration**: 30 seconds (parallel) vs 150 seconds (sequential)

**Acceptance Criteria**:
- [ ] Test passes consistently
- [ ] Parallel execution faster
- [ ] All tasks complete
- [ ] No race conditions
- [ ] Completes in ~30 seconds

---

### TASK-411: Implement TEST-605 (Sequential Coordination) - 6 hours

**File**: `tests/e2e/spawning.test.ts` (add to existing file)

**Objective**: Test sequential execution of dependent tasks

**Test Structure**:
```typescript
describe('Sequential Coordination', () => {
  it('should execute dependent tasks sequentially', async () => {
    // TEST-605 implementation
  })
})
```

**Implementation Steps**:
1. Create 5 dependent tasks (linear chain)
2. Spawn specialists sequentially
3. Verify tasks execute in order
4. Verify no task starts before dependency completes
5. Verify all tasks complete
6. Verify execution time = sum of individual times

**Assertions**:
```typescript
expect(completionOrder).toEqual(['task-1', 'task-2', 'task-3', 'task-4', 'task-5'])
expect(totalTime).toBeGreaterThan(140000) // At least 140 seconds
expect(totalTime).toBeLessThan(160000) // Less than 160 seconds
```

**Expected Duration**: 150 seconds

**Acceptance Criteria**:
- [ ] Test passes consistently
- [ ] Tasks execute in order
- [ ] Dependencies respected
- [ ] Completes in ~150 seconds
- [ ] No race conditions

---

### TASK-412: Implement TEST-606 (Blocker Detection) - 6 hours

**File**: `tests/e2e/spawning.test.ts` (add to existing file)

**Objective**: Test blocker detection and resolution

**Test Structure**:
```typescript
describe('Blocker Detection', () => {
  it('should detect and handle blockers', async () => {
    // TEST-606 implementation
  })
})
```

**Implementation Steps**:
1. Create task-1 (blocked by task-2)
2. Create task-2 (blocking task)
3. Spawn specialist for task-1
4. Verify blocker detected
5. Spawn specialist for task-2
6. Verify task-2 completes
7. Verify task-1 unblocked and completes

**Assertions**:
```typescript
expect(task1Status).toBe('blocked')
expect(blockerDetected).toBe(true)
expect(task2Status).toBe('complete')
expect(task1Status).toBe('complete')
expect(events).toContainEqual(expect.objectContaining({ type: 'blocker_detected' }))
```

**Expected Duration**: 45 seconds

**Acceptance Criteria**:
- [ ] Test passes consistently
- [ ] Blocker detected correctly
- [ ] Task waits for blocker
- [ ] Blocker completes
- [ ] Task unblocked and completes

---

## Category D: Checkpoint Tests (TASK-413 to TASK-414)

### TASK-413: Implement TEST-607 (Checkpoint Creation) - 6 hours

**File**: `tests/e2e/checkpoint.test.ts`

**Objective**: Test checkpoint creation at progress milestones

**Test Structure**:
```typescript
describe('Checkpoint Management', () => {
  describe('Checkpoint Creation', () => {
    it('should create checkpoints at progress milestones', async () => {
      // TEST-607 implementation
    })
  })
})
```

**Implementation Steps**:
1. Create long-running task (2 minutes)
2. Start task execution
3. At 25% progress: Create checkpoint
4. Verify checkpoint saved to SQLite
5. At 50% progress: Create checkpoint
6. Verify checkpoint saved
7. At 75% progress: Create checkpoint
8. Verify checkpoint saved
9. Task completes

**Assertions**:
```typescript
expect(checkpoint25).toBeDefined()
expect(checkpoint50).toBeDefined()
expect(checkpoint75).toBeDefined()
expect(checkpoint25.progress).toBe(25)
expect(checkpoint50.progress).toBe(50)
expect(checkpoint75.progress).toBe(75)
expect(taskStatus).toBe('complete')
```

**Expected Duration**: 120 seconds

**Acceptance Criteria**:
- [ ] Test passes consistently
- [ ] Checkpoints created at milestones
- [ ] Checkpoints saved to database
- [ ] Metadata correct
- [ ] Task completes successfully

---

### TASK-414: Implement TEST-608 (Resume from Checkpoint) - 6 hours

**File**: `tests/e2e/checkpoint.test.ts` (add to existing file)

**Objective**: Test resuming execution from checkpoint

**Test Structure**:
```typescript
describe('Resume from Checkpoint', () => {
  it('should resume execution from checkpoint', async () => {
    // TEST-608 implementation
  })
})
```

**Implementation Steps**:
1. Create work order
2. Start execution
3. Create checkpoint at 50%
4. Stop execution
5. Verify checkpoint saved
6. Load checkpoint
7. Resume execution from 50%
8. Complete task
9. Verify no data loss

**Assertions**:
```typescript
expect(checkpoint).toBeDefined()
expect(checkpoint.progress).toBe(50)
expect(resumedProgress).toBe(50)
expect(finalStatus).toBe('complete')
expect(dataLoss).toBe(false)
```

**Expected Duration**: 90 seconds

**Acceptance Criteria**:
- [ ] Test passes consistently
- [ ] Checkpoint created and saved
- [ ] Checkpoint loaded correctly
- [ ] Execution resumed at correct point
- [ ] No data loss
- [ ] Task completes successfully

---

## Category E: API Integration Tests (TASK-415 to TASK-416)

### TASK-415: Implement TEST-609 (Full API Workflow) - 6 hours

**File**: `tests/e2e/api-integration.test.ts`

**Objective**: Test complete API workflow

**Test Structure**:
```typescript
describe('API Integration', () => {
  describe('Full API Workflow', () => {
    it('should complete full API workflow', async () => {
      // TEST-609 implementation
    })
  })
})
```

**Implementation Steps**:
1. Create work order via API
2. Append events to mailbox
3. Acquire file lock via CTK
4. Update work order status
5. Advance cursor position
6. Release file lock
7. Get coordinator status
8. Verify all operations succeeded

**Assertions**:
```typescript
expect(workOrder).toHaveProperty('id')
expect(events).toHaveLength(1)
expect(lock).toHaveProperty('id')
expect(updatedWO.status).toBe('in_progress')
expect(cursor).toBe(1)
expect(coordinator.active_locks).toBe(0)
```

**Expected Duration**: 30 seconds

**Acceptance Criteria**:
- [ ] Test passes consistently
- [ ] All API operations succeed
- [ ] State consistent across operations
- [ ] Completes in ~30 seconds
- [ ] No API errors

---

### TASK-416: Implement TEST-610 (Concurrent API Operations) - 6 hours

**File**: `tests/e2e/api-integration.test.ts` (add to existing file)

**Objective**: Test lock conflict resolution

**Test Structure**:
```typescript
describe('Concurrent Operations', () => {
  it('should handle concurrent API operations with lock conflicts', async () => {
    // TEST-610 implementation
  })
})
```

**Implementation Steps**:
1. Operation 1: Reserve file
2. Operation 2: Try to reserve same file (should wait)
3. Operation 1: Complete and release
4. Operation 2: Acquire lock
5. Operation 2: Complete and release
6. Verify no concurrent writes
7. Verify lock timeout works

**Assertions**:
```typescript
expect(lock1).toBeDefined()
expect(lock2).toThrow() // Should fail or wait
expect(lock1Released).toBe(true)
expect(lock2Acquired).toBe(true)
expect(concurrentWrites).toBe(0)
```

**Expected Duration**: 45 seconds

**Acceptance Criteria**:
- [ ] Test passes consistently
- [ ] Lock conflicts handled
- [ ] No concurrent writes
- [ ] Lock timeout works
- [ ] Completes in ~45 seconds

---

## Quality Requirements

**Code Quality**:
- ✅ All tests must be deterministic
- ✅ No timing dependencies
- ✅ Proper async/await handling
- ✅ Clear assertions
- ✅ Good error messages

**Testing**:
- ✅ Tests pass consistently
- ✅ No flaky behavior
- ✅ Proper cleanup
- ✅ No test pollution
- ✅ Proper setup/teardown

**Documentation**:
- ✅ Clear test descriptions
- ✅ Comments for complex logic
- ✅ Meaningful assertion messages

---

## Reference Documents

- **Specification**: `specs/phase6-integration-testing/SPECIFICATION.md`
- **Detailed Tasks**: `specs/phase6-integration-testing/PHASE5_DETAILED_TASKS.md`
- **Research**: `docs/research/2026-01-06-phase6-integration-testing.md`

---

## Success Criteria

✅ All 10 tests implemented  
✅ All tests passing consistently  
✅ No flaky tests  
✅ All assertions pass  
✅ Proper cleanup  
✅ No test pollution  
✅ Ready for Category F (validation)  

---

## Deliverables

When complete, provide:

1. **Summary**: What was implemented
2. **Files**: List of test files created
3. **Test Results**: All 10 tests passing
4. **Issues**: Any problems encountered and solutions
5. **Verification**: Confirmation all acceptance criteria met
6. **Status**: Ready for validation phase

---

**Status**: ✅ Ready for Implementation  
**Confidence**: 94%  
**Next**: Category F (validation and coverage)
