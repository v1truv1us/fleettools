# Phase 6 Integration Testing - Research Document

**Date**: January 6, 2026  
**Phase**: 6 of 7  
**Status**: Research Complete  
**Confidence**: 0.95

---

## Executive Summary

This research document explores integration testing patterns, best practices, and strategies for FleetTools Phase 6. The goal is to establish a comprehensive testing approach that validates end-to-end fleet coordination workflows while maintaining high code quality and reliability.

**Key Findings**:
- ✅ Jest/Bun test framework is appropriate for integration tests
- ✅ SQLite in-memory databases enable fast, isolated testing
- ✅ Test utilities can be reused across multiple test suites
- ✅ Deterministic test design prevents flaky tests
- ✅ Parallel test execution can reduce total runtime

---

## Integration Testing Fundamentals

### Definition
Integration tests validate that multiple components work together correctly. Unlike unit tests (single component) or end-to-end tests (full system), integration tests focus on component interactions.

### Scope for FleetTools
- **API endpoints** with database persistence
- **Squawk coordination** with mailbox events
- **Flightline work tracking** with Git backing
- **CTK file locking** with concurrent access
- **Specialist spawning** with dependencies

### Benefits
1. **Confidence**: Validates real workflows, not mocked interactions
2. **Regression Detection**: Catches breaking changes early
3. **Documentation**: Tests serve as usage examples
4. **Quality Gates**: Prevents deployment of broken code

---

## Test Framework Selection

### Evaluated Options

**Option 1: Jest (Current)**
- ✅ Pros: Mature, well-documented, great TypeScript support, built-in coverage
- ✅ Pros: Snapshot testing, parallel execution, watch mode
- ⚠️ Cons: Slower startup time, heavier than alternatives
- **Recommendation**: ✅ USE JEST

**Option 2: Bun Test**
- ✅ Pros: Fast, lightweight, native TypeScript support
- ✅ Pros: Part of Bun ecosystem, good for this project
- ⚠️ Cons: Newer, less mature, smaller community
- **Recommendation**: ⚠️ CONSIDER FOR FUTURE

**Option 3: Vitest**
- ✅ Pros: Vite-compatible, fast, Jest-compatible API
- ⚠️ Cons: Requires Vite setup, additional dependency
- **Recommendation**: ❌ NOT NEEDED

**Decision**: Use Jest for Phase 6, consider Bun test for Phase 7

---

## Test Database Strategy

### In-Memory SQLite
```typescript
// Fast, isolated, no cleanup needed
const db = new Database(':memory:');
```

**Advantages**:
- ✅ Fast (no disk I/O)
- ✅ Isolated (each test gets fresh database)
- ✅ No cleanup needed (garbage collected)
- ✅ Deterministic (same data every time)

**Disadvantages**:
- ⚠️ Limited to available RAM
- ⚠️ Can't inspect database after test

**Mitigation**:
- Use file-based database for debugging
- Keep test data minimal
- Clean up large datasets between tests

### Test Fixtures
```typescript
// Reusable test data
const fixtures = {
  workOrder: { id: 'wo-1', title: 'Test', priority: 'high' },
  specialist: { id: 'sp-1', name: 'Agent 1' },
  task: { id: 'task-1', title: 'Task 1' }
};
```

**Benefits**:
- ✅ Consistent test data
- ✅ Reusable across tests
- ✅ Easy to maintain
- ✅ Clear test intent

---

## Test Organization

### Directory Structure
```
tests/
├── e2e/                          # End-to-end tests
│   ├── coordination.test.ts      # Workflow tests
│   ├── spawning.test.ts          # Spawning tests
│   ├── checkpoint.test.ts        # Checkpoint tests
│   └── api-integration.test.ts   # API tests
├── helpers/                      # Test utilities
│   ├── api-client.ts             # API client
│   ├── test-server.ts            # Server setup
│   └── test-db.ts                # Database setup
├── fixtures/                     # Test data
│   ├── work-orders.ts
│   ├── specialists.ts
│   └── tasks.ts
├── setup.ts                      # Global setup
└── teardown.ts                   # Global teardown
```

### Test Naming Convention
```typescript
describe('Coordination Workflows', () => {
  describe('Complete Fleet Workflow', () => {
    it('should complete research → plan → work → review cycle', () => {
      // TEST-601
    });
  });
});
```

---

## Deterministic Testing Patterns

### Pattern 1: Avoid Timing Dependencies
```typescript
// ❌ BAD: Depends on timing
it('should complete task', async () => {
  startTask();
  await new Promise(r => setTimeout(r, 1000));
  expect(taskComplete).toBe(true);
});

// ✅ GOOD: Wait for actual completion
it('should complete task', async () => {
  const promise = startTask();
  await promise;
  expect(taskComplete).toBe(true);
});
```

### Pattern 2: Proper Async/Await
```typescript
// ✅ GOOD: Proper async handling
it('should handle async operations', async () => {
  const result = await asyncOperation();
  expect(result).toBeDefined();
});
```

### Pattern 3: Cleanup Between Tests
```typescript
// ✅ GOOD: Proper cleanup
beforeEach(() => {
  db = new Database(':memory:');
  server = startTestServer();
});

afterEach(async () => {
  await server.stop();
  db.close();
});
```

### Pattern 4: Deterministic Test Data
```typescript
// ✅ GOOD: Same data every time
const testData = {
  workOrder: { id: 'wo-1', title: 'Test', createdAt: '2026-01-06T00:00:00Z' },
  specialist: { id: 'sp-1', name: 'Agent 1', status: 'ready' }
};
```

---

## API Testing Patterns

### Pattern 1: API Client Wrapper
```typescript
class TestAPIClient {
  async createWorkOrder(data) { /* ... */ }
  async getWorkOrder(id) { /* ... */ }
  async appendMailboxEvent(streamId, event) { /* ... */ }
  async acquireLock(file) { /* ... */ }
}
```

**Benefits**:
- ✅ Reusable across tests
- ✅ Consistent error handling
- ✅ Easy to mock/stub
- ✅ Clear API contracts

### Pattern 2: Server Lifecycle Management
```typescript
let server: Server;

beforeAll(async () => {
  server = await startTestServer({ port: 3002 });
});

afterAll(async () => {
  await server.stop();
});
```

### Pattern 3: Request/Response Validation
```typescript
it('should create work order', async () => {
  const response = await api.createWorkOrder({
    title: 'Test',
    priority: 'high'
  });
  
  expect(response.status).toBe(201);
  expect(response.body).toHaveProperty('id');
  expect(response.body.title).toBe('Test');
});
```

---

## Concurrency Testing Patterns

### Pattern 1: Parallel Operations
```typescript
it('should handle parallel operations', async () => {
  const results = await Promise.all([
    api.createWorkOrder(data1),
    api.createWorkOrder(data2),
    api.createWorkOrder(data3)
  ]);
  
  expect(results).toHaveLength(3);
  expect(results.every(r => r.status === 201)).toBe(true);
});
```

### Pattern 2: Lock Conflict Resolution
```typescript
it('should handle lock conflicts', async () => {
  const lock1 = api.acquireLock('/file.txt');
  const lock2 = api.acquireLock('/file.txt');
  
  const [result1, result2] = await Promise.allSettled([lock1, lock2]);
  
  expect(result1.status).toBe('fulfilled');
  expect(result2.status).toBe('rejected'); // Should fail
});
```

### Pattern 3: Sequential Dependencies
```typescript
it('should respect task dependencies', async () => {
  const task1 = await api.createTask({ id: 'task-1' });
  const task2 = await api.createTask({ id: 'task-2', dependsOn: 'task-1' });
  
  // Task-2 should wait for task-1
  const results = await Promise.all([
    api.executeTask('task-2'),
    api.executeTask('task-1')
  ]);
  
  expect(results[0].waitedFor).toContain('task-1');
});
```

---

## Error Handling Patterns

### Pattern 1: Expected Errors
```typescript
it('should reject invalid input', async () => {
  await expect(api.createWorkOrder({ title: '' }))
    .rejects
    .toThrow('Title is required');
});
```

### Pattern 2: Retry Logic
```typescript
it('should retry on transient failures', async () => {
  let attempts = 0;
  const operation = async () => {
    attempts++;
    if (attempts < 3) throw new Error('Transient failure');
    return 'success';
  };
  
  const result = await retryWithBackoff(operation, { maxAttempts: 5 });
  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
```

### Pattern 3: Timeout Handling
```typescript
it('should timeout on slow operations', async () => {
  const slowOp = new Promise(r => setTimeout(r, 10000));
  
  await expect(Promise.race([
    slowOp,
    new Promise((_, r) => setTimeout(() => r(new Error('Timeout')), 1000))
  ])).rejects.toThrow('Timeout');
});
```

---

## Code Coverage Strategy

### Coverage Targets
- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

### Coverage Analysis
```bash
# Generate coverage report
npm test -- --coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Identifying Gaps
1. Run coverage report
2. Identify uncovered lines
3. Add tests for uncovered paths
4. Verify coverage increases

### Coverage Tools
- **Jest Coverage**: Built-in, good for integration tests
- **Istanbul**: Underlying coverage engine
- **Codecov**: CI/CD integration

---

## Performance Considerations

### Test Execution Time
- **Target**: All tests complete in <5 minutes
- **Parallel Execution**: Jest runs tests in parallel by default
- **Optimization**: Use in-memory databases, avoid unnecessary I/O

### Database Performance
- **In-Memory**: ~1ms per operation
- **File-Based**: ~10ms per operation
- **Network**: ~100ms per operation

### Optimization Strategies
1. Use in-memory databases for tests
2. Minimize test data size
3. Run tests in parallel
4. Cache expensive operations
5. Profile slow tests

---

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

### Coverage Reporting
- Generate coverage reports
- Upload to Codecov
- Display coverage badges
- Track coverage trends

### Test Failure Notifications
- Slack notifications
- Email alerts
- GitHub status checks
- PR comments

---

## Best Practices Summary

### DO ✅
- ✅ Write deterministic tests
- ✅ Use fixtures for test data
- ✅ Clean up after each test
- ✅ Test error paths
- ✅ Use meaningful assertions
- ✅ Document complex tests
- ✅ Run tests frequently
- ✅ Monitor coverage

### DON'T ❌
- ❌ Depend on timing
- ❌ Share state between tests
- ❌ Use hardcoded paths
- ❌ Ignore error cases
- ❌ Write overly complex tests
- ❌ Skip cleanup
- ❌ Ignore flaky tests
- ❌ Test implementation details

---

## Tools & Libraries

### Testing Framework
- **Jest**: Test runner and assertion library
- **@types/jest**: TypeScript definitions

### Database
- **better-sqlite3**: SQLite for Node.js
- **sql.js**: SQLite in JavaScript

### HTTP Client
- **node-fetch**: HTTP client for tests
- **axios**: Alternative HTTP client

### Utilities
- **faker**: Generate test data
- **uuid**: Generate unique IDs
- **lodash**: Utility functions

---

## Risks & Mitigation

### Risk 1: Flaky Tests
**Mitigation**: Use deterministic patterns, avoid timing dependencies

### Risk 2: Slow Tests
**Mitigation**: Use in-memory databases, parallel execution, optimize queries

### Risk 3: Coverage Gaps
**Mitigation**: Use coverage reports, add tests for uncovered paths

### Risk 4: Test Maintenance
**Mitigation**: Use fixtures, DRY principle, clear naming

---

## Recommendations

1. **Use Jest** for Phase 6 integration tests
2. **Use in-memory SQLite** for test databases
3. **Create reusable test utilities** for future tests
4. **Target >80% code coverage** for integration paths
5. **Run tests in parallel** to reduce execution time
6. **Integrate with CI/CD** for automated testing
7. **Monitor coverage trends** over time
8. **Document test patterns** for team reference

---

## Conclusion

Integration testing is critical for validating FleetTools' complex coordination workflows. By following established patterns and best practices, we can create a comprehensive test suite that provides confidence in the system's reliability while maintaining fast execution times and high code quality.

**Key Success Factors**:
- ✅ Deterministic test design
- ✅ Proper async/await handling
- ✅ Comprehensive error testing
- ✅ High code coverage (>80%)
- ✅ Fast execution (<5 minutes)
- ✅ CI/CD integration

---

**Research Complete**: January 6, 2026  
**Confidence**: 95%  
**Status**: ✅ Ready for Phase 3 (Specify)
