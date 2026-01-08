# FleetTools Test Troubleshooting Guide

## Common Issues and Solutions

### 1. Tests Timing Out

#### Symptom
Tests fail with timeout errors after 30+ seconds.

#### Causes
- Server not starting properly
- Database operations taking too long
- Network connectivity issues
- Deadlocks in concurrent tests

#### Solutions

**Check Server Status**
```bash
# Verify server is running
curl http://localhost:3002/health

# Check server logs
tail -f server/api/logs/server.log
```

**Increase Timeout**
```typescript
// In test file
const client = createApiClient({ timeout: 60000 }) // 60 seconds
```

**Check for Deadlocks**
```typescript
// Add logging to identify deadlocks
console.log('Lock acquired:', lock.id)
console.log('Lock released:', lock.id)
```

**Verify Database**
```bash
# Check database file exists
ls -la .local/share/fleet/squawk.json

# Check database permissions
stat .local/share/fleet/squawk.json
```

### 2. Flaky Tests

#### Symptom
Tests pass sometimes but fail other times without code changes.

#### Causes
- Race conditions in concurrent tests
- Timing dependencies
- Improper cleanup between tests
- Non-deterministic test data

#### Solutions

**Add Proper Cleanup**
```typescript
beforeEach(() => {
  resetTestData()
})

afterEach(async () => {
  resetTestData()
})
```

**Avoid Timing Dependencies**
```typescript
// BAD: Relies on timing
setTimeout(() => {
  expect(result).toBeDefined()
}, 100)

// GOOD: Use proper synchronization
await waitForCompletion(taskId)
expect(result).toBeDefined()
```

**Use Deterministic Test Data**
```typescript
// BAD: Random data
const id = Math.random().toString()

// GOOD: Deterministic ID
const id = generateTestId('test')
```

**Run Tests Multiple Times**
```bash
# Run test 10 times to check for flakiness
for i in {1..10}; do
  bun test tests/e2e/coordination.test.ts || break
done
```

### 3. Database Issues

#### Symptom
Tests fail with database errors or data not persisting.

#### Causes
- Database not initialized
- Permissions issues
- Corrupted database file
- Concurrent access conflicts

#### Solutions

**Reset Database**
```typescript
import { resetTestData } from '../helpers/test-db'

beforeEach(() => {
  resetTestData()
})
```

**Check Database Permissions**
```bash
# Verify write permissions
touch .local/share/fleet/squawk.json
chmod 644 .local/share/fleet/squawk.json
```

**Verify Database Structure**
```typescript
import { testDb } from '../helpers/test-db'

console.log(testDb.get())
// Should show: { mailboxes: {}, events: {}, cursors: {}, locks: {} }
```

**Clear Corrupted Database**
```bash
# Backup and remove corrupted database
mv .local/share/fleet/squawk.json .local/share/fleet/squawk.json.bak
# Tests will recreate it
```

### 4. API Client Errors

#### Symptom
API requests fail with connection errors or invalid responses.

#### Causes
- Server not running
- Incorrect API endpoint
- Invalid request format
- Server returning errors

#### Solutions

**Verify Server is Running**
```bash
# Check if server is listening
netstat -tlnp | grep 3002

# Or use curl
curl -v http://localhost:3002/health
```

**Check API Endpoint**
```typescript
// Verify correct endpoint
const response = await apiClient.createWorkOrder({
  title: 'Test',
  priority: 'high'
})

console.log('Status:', response.status)
console.log('Data:', response.data)
console.log('Error:', response.error)
```

**Enable Debug Logging**
```typescript
const client = createApiClient({ debug: true })
// Will log all requests and responses
```

**Check Request Format**
```typescript
// Verify request body is correct
const data = {
  title: 'Test Work Order',
  description: 'Test description',
  priority: 'high'
}

const response = await apiClient.createWorkOrder(data)
```

### 5. Lock Conflicts

#### Symptom
Tests fail with lock acquisition errors or deadlocks.

#### Causes
- Locks not being released
- Multiple operations on same file
- Lock timeout too short
- Improper lock ordering

#### Solutions

**Verify Lock Release**
```typescript
const lock = testLockOps.acquire({...})
expect(lock.released_at).toBeNull()

testLockOps.release(lock.id)
const released = testLockOps.getById(lock.id)
expect(released.released_at).not.toBeNull()
```

**Check Active Locks**
```typescript
const activeLocks = testLockOps.getAll()
console.log('Active locks:', activeLocks)
```

**Increase Lock Timeout**
```typescript
const lock = testLockOps.acquire({
  ...
  timeout_ms: 120000 // 2 minutes instead of 1
})
```

**Release Expired Locks**
```typescript
const releasedCount = testLockOps.releaseExpired()
console.log('Released expired locks:', releasedCount)
```

### 6. Memory Issues

#### Symptom
Tests fail with out-of-memory errors or slow performance.

#### Causes
- Memory leaks in test code
- Large test data sets
- Improper cleanup
- Too many concurrent operations

#### Solutions

**Monitor Memory Usage**
```bash
# Run tests with memory monitoring
node --max-old-space-size=4096 node_modules/.bin/bun test
```

**Reduce Test Data Size**
```typescript
// BAD: Create 10000 items
const items = createMultipleWorkOrders(10000)

// GOOD: Create reasonable amount
const items = createMultipleWorkOrders(10)
```

**Ensure Cleanup**
```typescript
afterEach(() => {
  resetTestData()
  // Explicitly clear large objects
  testDb.reset()
})
```

**Limit Concurrent Operations**
```typescript
// BAD: Spawn 1000 concurrent operations
const promises = []
for (let i = 0; i < 1000; i++) {
  promises.push(apiClient.createWorkOrder(...))
}
await Promise.all(promises)

// GOOD: Limit concurrency
const batchSize = 10
for (let i = 0; i < 1000; i += batchSize) {
  const batch = []
  for (let j = 0; j < batchSize; j++) {
    batch.push(apiClient.createWorkOrder(...))
  }
  await Promise.all(batch)
}
```

### 7. Event Ordering Issues

#### Symptom
Events are out of order or missing.

#### Causes
- Concurrent event appending
- Improper event ordering
- Lost events during persistence
- Cursor position incorrect

#### Solutions

**Verify Event Order**
```typescript
const events = testEventOps.getByMailbox(mailboxId)
for (let i = 0; i < events.length - 1; i++) {
  const current = new Date(events[i].occurred_at).getTime()
  const next = new Date(events[i + 1].occurred_at).getTime()
  expect(current).toBeLessThanOrEqual(next)
}
```

**Check Cursor Position**
```typescript
const cursor = testCursorOps.getByStream(streamId)
const events = testEventOps.getByMailbox(streamId)
expect(cursor.position).toBeLessThanOrEqual(events.length)
```

**Verify Event Persistence**
```typescript
const inserted = testEventOps.append(mailboxId, events)
expect(inserted).toHaveLength(events.length)

const retrieved = testEventOps.getByMailbox(mailboxId)
expect(retrieved).toHaveLength(events.length)
```

### 8. Checkpoint Issues

#### Symptom
Checkpoints not being created or loaded correctly.

#### Causes
- Checkpoint not saved to database
- Incorrect checkpoint format
- State data not persisted
- Checkpoint loading fails

#### Solutions

**Verify Checkpoint Creation**
```typescript
const checkpoint = {
  id: generateTestId('checkpoint'),
  task_id: task.id,
  progress: 50,
  state: { current_step: 2, data: {} },
  created_at: new Date().toISOString()
}

expect(checkpoint.id).toBeDefined()
expect(checkpoint.progress).toBe(50)
```

**Check Checkpoint Persistence**
```typescript
const events = testEventOps.getByMailbox(mailboxId)
const checkpointEvents = events.filter(e => e.type === 'CheckpointCreated')
expect(checkpointEvents).toHaveLength(3)
```

**Verify State Data**
```typescript
const checkpoint = {
  ...
  state: {
    current_step: 2,
    processed_items: 50,
    data: { key: 'value' }
  }
}

expect(checkpoint.state.current_step).toBe(2)
expect(checkpoint.state.processed_items).toBe(50)
```

### 9. Dependency Resolution Issues

#### Symptom
Tasks not waiting for dependencies or executing out of order.

#### Causes
- Dependency not properly set
- Task starting before dependency completes
- Circular dependencies
- Missing dependency checks

#### Solutions

**Verify Dependencies**
```typescript
const tasks = createTaskChain(3)
expect(tasks[1].dependencies).toContain(tasks[0].id)
expect(tasks[2].dependencies).toContain(tasks[1].id)
```

**Check Task Status**
```typescript
// Task 2 cannot start before Task 1 completes
const task2CanStart = tasks[0].status === 'completed'
expect(task2CanStart).toBe(false)

// Complete Task 1
tasks[0].status = 'completed'
const task2CanStartNow = tasks[0].status === 'completed'
expect(task2CanStartNow).toBe(true)
```

**Detect Circular Dependencies**
```typescript
function hasCircularDependency(tasks) {
  const visited = new Set()
  const recursionStack = new Set()
  
  function dfs(taskId) {
    visited.add(taskId)
    recursionStack.add(taskId)
    
    const task = tasks.find(t => t.id === taskId)
    for (const dep of task.dependencies) {
      if (!visited.has(dep)) {
        if (dfs(dep)) return true
      } else if (recursionStack.has(dep)) {
        return true
      }
    }
    
    recursionStack.delete(taskId)
    return false
  }
  
  for (const task of tasks) {
    if (!visited.has(task.id)) {
      if (dfs(task.id)) return true
    }
  }
  return false
}
```

### 10. Coverage Issues

#### Symptom
Code coverage below target (80%).

#### Causes
- Untested code paths
- Missing test cases
- Fixtures not fully exercised
- Error paths not tested

#### Solutions

**Generate Coverage Report**
```bash
bun test tests/e2e/ --coverage
```

**Identify Uncovered Lines**
```bash
# Look for uncovered line numbers in report
# Example: tests/fixtures/work-orders.ts | 16.67 | 37.38 | 44-47,54-57
```

**Add Tests for Uncovered Paths**
```typescript
it('should handle edge case', () => {
  // Test the uncovered line
  const result = createWorkOrderFixture({ /* edge case */ })
  expect(result).toBeDefined()
})
```

**Test Error Paths**
```typescript
it('should handle errors', () => {
  const task = createErrorRecoveryTask()
  task.status = 'failed'
  expect(task.status).toBe('failed')
})
```

## Getting Help

### Check Logs

```bash
# Server logs
tail -f server/api/logs/server.log

# Test output
bun test tests/e2e/ --verbose

# Debug output
DEBUG=* bun test tests/e2e/
```

### Run Diagnostic Tests

```bash
# Test database connectivity
bun test tests/helpers/test-db.ts

# Test server startup
bun test tests/helpers/test-server.ts

# Test API client
bun test tests/helpers/api-client.ts
```

### Check System Resources

```bash
# Check disk space
df -h

# Check memory
free -h

# Check CPU
top -b -n 1 | head -20
```

## Performance Optimization

### Parallel Execution

```bash
# Run tests in parallel (default)
bun test tests/e2e/
```

### Sequential Execution

```bash
# Run tests sequentially if parallel causes issues
bun test tests/e2e/ --serial
```

### Selective Testing

```bash
# Run only specific test file
bun test tests/e2e/coordination.test.ts

# Run only tests matching pattern
bun test tests/e2e/ --grep "Complete Fleet"
```

## Reporting Issues

When reporting test failures, include:

1. **Test name and file**
2. **Error message and stack trace**
3. **System information** (OS, Node version, Bun version)
4. **Steps to reproduce**
5. **Relevant logs**
6. **Environment variables**

Example issue report:

```
Test: TEST-601: Complete Fleet Workflow
File: tests/e2e/coordination.test.ts
Error: Timeout waiting for server health check
System: Linux, Node 18.0.0, Bun 1.3.5
Steps:
1. Run: bun test tests/e2e/coordination.test.ts
2. Wait for timeout
Logs: [attached]
Env: NODE_ENV=test, DEBUG_TESTS=1
```
