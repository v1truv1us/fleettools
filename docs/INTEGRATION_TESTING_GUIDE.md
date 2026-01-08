# FleetTools Integration Testing Guide

## Overview

This guide provides comprehensive documentation for the FleetTools integration testing suite. The integration tests validate complete workflows across the entire system, from API endpoints to database operations.

## Test Structure

### Test Organization

```
tests/
├── e2e/                          # End-to-end integration tests
│   ├── coordination.test.ts       # TEST-601, 602, 603
│   ├── spawning.test.ts           # TEST-604, 605, 606
│   ├── checkpoint.test.ts         # TEST-607, 608
│   ├── api-integration.test.ts    # TEST-609, 610
│   └── workflows.test.ts          # General workflow tests
├── fixtures/                      # Test data fixtures
│   ├── work-orders.ts             # Work order test data
│   ├── specialists.ts             # Specialist test data
│   └── tasks.ts                   # Task test data
├── helpers/                       # Test utilities
│   ├── api-client.ts              # API client wrapper
│   ├── test-db.ts                 # Database test utilities
│   ├── test-server.ts             # Server startup/shutdown
│   ├── mock-database.ts           # Mock database implementation
│   └── mock-request.ts            # Mock request utilities
├── setup.ts                       # Global test setup
└── teardown.ts                    # Global test teardown
```

## Test Categories

### 1. Coordination Tests (TEST-601 to TEST-603)

Tests for complete fleet workflows and specialist coordination.

#### TEST-601: Complete Fleet Workflow
- **Purpose**: Validate complete fleet workflow from work order creation to completion
- **Coverage**: Work order creation, specialist spawning, phase execution, event emission
- **Duration**: ~30 seconds
- **Key Assertions**:
  - Work order created with valid ID
  - All specialists spawned successfully
  - Each specialist completes assigned phase
  - Results collected correctly
  - Work order marked complete
  - All events emitted correctly

#### TEST-602: Multi-Specialist Coordination
- **Purpose**: Validate dependency handling between specialists
- **Coverage**: Task dependencies, sequential execution, race condition prevention
- **Duration**: ~45 seconds
- **Key Assertions**:
  - Task-1 completes first
  - Task-2 waits for task-1
  - Task-3 waits for task-2
  - All tasks complete successfully
  - Results in correct order
  - No race conditions

#### TEST-603: Error Recovery and Retry
- **Purpose**: Validate error handling and recovery
- **Coverage**: Failure simulation, retry logic, error events
- **Duration**: ~60 seconds
- **Key Assertions**:
  - First attempt fails
  - System retries automatically
  - Retry count tracked correctly
  - Specialist succeeds on retry
  - Error events emitted
  - Work order completes

### 2. Spawning Tests (TEST-604 to TEST-606)

Tests for parallel and sequential specialist spawning.

#### TEST-604: Parallel Specialist Spawning
- **Purpose**: Validate parallel execution of independent tasks
- **Coverage**: Concurrent execution, performance, race condition prevention
- **Duration**: ~30 seconds (parallel) vs 150 seconds (sequential)
- **Key Assertions**:
  - All 5 specialists spawned
  - Specialists execute in parallel
  - All tasks complete
  - Execution time < sequential time
  - No race conditions
  - Results collected correctly

#### TEST-605: Sequential Coordination
- **Purpose**: Validate sequential execution of dependent tasks
- **Coverage**: Dependency ordering, sequential execution
- **Duration**: ~150 seconds (sequential)
- **Key Assertions**:
  - Tasks execute in order
  - No task starts before dependency completes
  - All tasks complete
  - Execution time = sum of individual times
  - No race conditions
  - Dependency graph respected

#### TEST-606: Blocker Detection
- **Purpose**: Validate blocker detection and resolution
- **Coverage**: Blocker detection, waiting behavior, unblocking
- **Duration**: ~45 seconds
- **Key Assertions**:
  - Blocker detected correctly
  - Task-1 waits for task-2
  - Task-2 completes
  - Task-1 unblocked
  - Task-1 completes
  - Blocker events emitted

### 3. Checkpoint Tests (TEST-607 to TEST-608)

Tests for checkpoint creation and resumption.

#### TEST-607: Checkpoint Creation
- **Purpose**: Validate checkpoint creation at progress milestones
- **Coverage**: Checkpoint creation, persistence, metadata
- **Duration**: ~120 seconds
- **Key Assertions**:
  - Checkpoint created at 25%
  - Checkpoint created at 50%
  - Checkpoint created at 75%
  - All checkpoints saved to SQLite
  - Checkpoint metadata correct
  - Task completes successfully

#### TEST-608: Resume from Checkpoint
- **Purpose**: Validate resuming execution from checkpoint
- **Coverage**: Checkpoint loading, resumption, data integrity
- **Duration**: ~90 seconds
- **Key Assertions**:
  - Checkpoint created at 50%
  - Execution stopped
  - Checkpoint loaded correctly
  - Execution resumed at 50%
  - Task completes from checkpoint
  - No data loss

### 4. API Integration Tests (TEST-609 to TEST-610)

Tests for complete API workflows and concurrent operations.

#### TEST-609: Full API Workflow
- **Purpose**: Validate complete API workflow
- **Coverage**: All API endpoints, event appending, file locking, cursor advancement
- **Duration**: ~30 seconds
- **Key Assertions**:
  - Work order created
  - Events appended
  - File reserved
  - Work order updated
  - Cursor advanced
  - Reservation released
  - Coordinator status correct

#### TEST-610: Concurrent API Operations
- **Purpose**: Validate lock conflict resolution
- **Coverage**: Lock acquisition, waiting, timeout handling
- **Duration**: ~45 seconds
- **Key Assertions**:
  - Operation 1 acquires lock
  - Operation 2 waits for lock
  - Operation 1 releases lock
  - Operation 2 acquires lock
  - No concurrent writes
  - Lock timeout works

## Running Tests

### Run All Integration Tests

```bash
bun test tests/e2e/
```

### Run Specific Test File

```bash
bun test tests/e2e/coordination.test.ts
```

### Run Specific Test Suite

```bash
bun test tests/e2e/coordination.test.ts --grep "Complete Fleet Workflow"
```

### Run with Coverage

```bash
bun test tests/e2e/ --coverage
```

### Run with Verbose Output

```bash
bun test tests/e2e/ --verbose
```

## Test Fixtures

### Work Order Fixtures

```typescript
import { createWorkOrderFixture, createHighPriorityWorkOrder } from '../fixtures/work-orders'

// Create basic work order
const workOrder = createWorkOrderFixture()

// Create high-priority work order
const urgent = createHighPriorityWorkOrder()

// Create with custom data
const custom = createWorkOrderFixture({
  title: 'Custom Work Order',
  priority: 'critical'
})
```

### Specialist Fixtures

```typescript
import { createSpecialistTeam, createResearcherSpecialist } from '../fixtures/specialists'

// Create specialist team
const team = createSpecialistTeam()

// Create specific specialist
const researcher = createResearcherSpecialist()

// Create multiple specialists
const specialists = createMultipleSpecialists(5)
```

### Task Fixtures

```typescript
import { createTaskChain, createParallelTasks } from '../fixtures/tasks'

// Create dependent task chain
const chain = createTaskChain(5)

// Create parallel tasks
const parallel = createParallelTasks(5)

// Create task with checkpoint intervals
const checkpoint = createCheckpointTask([25, 50, 75])
```

## Test Utilities

### API Client

```typescript
import { apiClient } from '../helpers/api-client'

// Create work order
const response = await apiClient.createWorkOrder({
  title: 'Test',
  priority: 'high'
})

// Check response
if (apiClient.isSuccess(response)) {
  console.log('Success:', response.data)
} else {
  console.log('Error:', apiClient.getErrorMessage(response))
}
```

### Test Database

```typescript
import { testDb, testMailboxOps, testEventOps } from '../helpers/test-db'

// Create mailbox
testMailboxOps.create('mailbox-1')

// Append events
const events = [
  { type: 'Event1', data: {} },
  { type: 'Event2', data: {} }
]
testEventOps.append('mailbox-1', events)

// Get events
const retrieved = testEventOps.getByMailbox('mailbox-1')
```

### Test Server

```typescript
import { testServer } from '../helpers/test-server'

// Setup server before tests
beforeAll(async () => {
  await testServer.setup()
})

// Teardown after tests
afterAll(async () => {
  await testServer.teardown()
})
```

## Best Practices

### 1. Test Isolation

Each test should be independent and not rely on state from other tests.

```typescript
beforeEach(() => {
  resetTestData()
})
```

### 2. Clear Assertions

Use descriptive assertion messages.

```typescript
expect(workOrder.status).toBe('completed')
expect(specialists).toHaveLength(3)
expect(results).toContain(expectedValue)
```

### 3. Fixture Usage

Use fixtures for consistent test data.

```typescript
const workOrder = createWorkOrderFixture({
  title: 'Test Work Order'
})
```

### 4. Error Handling

Test both success and failure paths.

```typescript
it('should handle errors gracefully', () => {
  const task = createErrorRecoveryTask()
  // Test error handling
})
```

### 5. Cleanup

Always clean up resources after tests.

```typescript
afterEach(async () => {
  resetTestData()
})
```

## Debugging Tests

### Enable Debug Logging

```typescript
const client = createApiClient({ debug: true })
```

### Check Test Database State

```typescript
console.log(testDb.get())
```

### Inspect Events

```typescript
const events = testEventOps.getByMailbox('mailbox-1')
console.log(events)
```

## Performance Considerations

### Test Execution Time

- Parallel tests: ~30 seconds
- Sequential tests: ~150 seconds
- Checkpoint tests: ~120 seconds
- API tests: ~30-45 seconds

### Optimization Tips

1. Use in-memory databases for tests
2. Minimize network calls
3. Use test fixtures instead of creating data
4. Run independent tests in parallel
5. Clean up resources promptly

## Troubleshooting

### Tests Timing Out

- Increase timeout in test configuration
- Check for deadlocks in concurrent tests
- Verify server is running for API tests

### Flaky Tests

- Avoid timing dependencies
- Use deterministic test data
- Ensure proper cleanup between tests
- Check for race conditions

### Database Issues

- Verify test database is initialized
- Check database permissions
- Ensure cleanup is working properly

## Coverage Goals

- **Target**: >80% code coverage
- **Current**: 47.89% (fixtures and helpers)
- **Focus Areas**:
  - Coordination logic
  - Error handling
  - Concurrent operations
  - Checkpoint management

## CI/CD Integration

### GitHub Actions

Tests are automatically run on:
- Pull requests
- Commits to main branch
- Manual workflow dispatch

### Coverage Reports

Coverage reports are generated and uploaded to:
- GitHub Actions artifacts
- Coverage tracking service

## Contributing

When adding new tests:

1. Follow existing test patterns
2. Use appropriate fixtures
3. Add clear assertions
4. Document test purpose
5. Ensure proper cleanup
6. Run full test suite before submitting

## References

- [Bun Test Documentation](https://bun.sh/docs/test/overview)
- [FleetTools Architecture](../ARCHITECTURE.md)
- [API Documentation](../API.md)
