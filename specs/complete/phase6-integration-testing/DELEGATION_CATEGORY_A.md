# DELEGATION: Category A - Test Infrastructure Setup

**Delegate To**: @full-stack-developer  
**Tasks**: TASK-401 through TASK-406  
**Total Effort**: 23 hours (2-3 days)  
**Priority**: HIGH (blocking all other tests)  
**Status**: Ready for Delegation

---

## Executive Summary

You are responsible for implementing the test infrastructure foundation for Phase 6 Integration Testing. These 6 tasks create the utilities and configuration that all 10 integration tests depend on.

**Critical**: This infrastructure must be solid. Any issues here will cascade to all downstream tests.

---

## Task Details

### TASK-401: Create Test Directory Structure (2 hours)

**Objective**: Set up directory structure for integration tests

**Actions**:
```bash
mkdir -p tests/e2e
mkdir -p tests/helpers
mkdir -p tests/fixtures
touch tests/e2e/.gitkeep
touch tests/helpers/.gitkeep
touch tests/fixtures/.gitkeep
touch tests/setup.ts
touch tests/teardown.ts
```

**Files to Create**:
- `tests/e2e/.gitkeep`
- `tests/helpers/.gitkeep`
- `tests/fixtures/.gitkeep`
- `tests/setup.ts` (empty initially)
- `tests/teardown.ts` (empty initially)

**Update `.gitignore`**:
```
# Test artifacts
tests/**/*.log
tests/**/*.tmp
.coverage/
```

**Acceptance Criteria**:
- [ ] All directories created
- [ ] All `.gitkeep` files present
- [ ] Setup/teardown files created
- [ ] `.gitignore` updated
- [ ] Directory structure matches specification

---

### TASK-402: Implement Test Database Setup (4 hours)

**File**: `tests/helpers/test-db.ts`

**Objective**: Create database initialization and cleanup utilities

**Requirements**:
```typescript
// Must export these functions:
export async function initializeTestDatabase(): Promise<Database>
export async function cleanupTestDatabase(db: Database): Promise<void>
export async function loadFixtures(db: Database, fixtures: any): Promise<void>
export async function resetDatabase(db: Database): Promise<void>
```

**Implementation Details**:
- Use `better-sqlite3` for in-memory SQLite database
- Create all necessary tables:
  - `work_orders` (id, title, description, priority, status, created_at)
  - `mailbox_events` (id, stream_id, event_type, data, timestamp)
  - `cursors` (stream_id, position, updated_at)
  - `locks` (id, file, specialist_id, acquired_at, timeout_ms)
  - `ctk_reservations` (id, file, specialist_id, purpose, created_at)
  - `tech_orders` (id, name, pattern, context, created_at)
- Implement transaction support
- Add error handling and logging
- Support fixture loading

**Key Features**:
- ✅ In-memory database (fast, isolated)
- ✅ Automatic schema creation
- ✅ Transaction support
- ✅ Fixture loading
- ✅ Proper cleanup
- ✅ Error handling

**Acceptance Criteria**:
- [ ] Database initializes without errors
- [ ] All tables created correctly
- [ ] Schema matches API requirements
- [ ] Cleanup removes all data
- [ ] Fixtures load correctly
- [ ] Transactions work properly
- [ ] Error handling implemented

---

### TASK-403: Implement Test Server Setup (4 hours)

**File**: `tests/helpers/test-server.ts`

**Objective**: Create API server startup/shutdown utilities

**Requirements**:
```typescript
// Must export these:
export async function startTestServer(options?: ServerOptions): Promise<TestServer>
export async function stopTestServer(server: TestServer): Promise<void>

export interface TestServer {
  baseUrl: string
  port: number
  stop(): Promise<void>
  isHealthy(): Promise<boolean>
}

export interface ServerOptions {
  port?: number
  database?: Database
  timeout?: number
}
```

**Implementation Details**:
- Start API server on port 3002 (or configurable)
- Wait for server to be ready (health check)
- Implement proper shutdown
- Handle errors gracefully
- Support custom database injection
- Add logging

**Key Features**:
- ✅ Server starts on test port
- ✅ Health check before returning
- ✅ Proper shutdown handling
- ✅ Error logging
- ✅ Configurable options
- ✅ Database injection support

**Acceptance Criteria**:
- [ ] Server starts successfully
- [ ] Health check passes
- [ ] Server ready before tests run
- [ ] Shutdown is clean
- [ ] No port conflicts
- [ ] Error handling works
- [ ] Logging implemented

---

### TASK-404: Implement API Client Wrapper (6 hours)

**File**: `tests/helpers/api-client.ts`

**Objective**: Create reusable API client for tests

**Requirements**:
```typescript
export class TestAPIClient {
  constructor(baseUrl: string)
  
  // Work Orders (5 endpoints)
  async createWorkOrder(data: any): Promise<any>
  async getWorkOrder(id: string): Promise<any>
  async updateWorkOrder(id: string, data: any): Promise<any>
  async deleteWorkOrder(id: string): Promise<void>
  async listWorkOrders(): Promise<any[]>
  
  // Mailbox (2 endpoints)
  async appendMailboxEvent(streamId: string, event: any): Promise<void>
  async getMailboxEvents(streamId: string): Promise<any[]>
  
  // Cursor (2 endpoints)
  async advanceCursor(streamId: string, position: number): Promise<void>
  async getCursorPosition(streamId: string): Promise<number>
  
  // Locks (3 endpoints)
  async acquireLock(file: string, specialistId: string): Promise<any>
  async releaseLock(lockId: string): Promise<void>
  async listLocks(): Promise<any[]>
  
  // CTK (3 endpoints)
  async reserveFile(file: string, specialistId: string): Promise<any>
  async releaseReservation(reservationId: string): Promise<void>
  async listReservations(): Promise<any[]>
  
  // Coordinator (1 endpoint)
  async getCoordinatorStatus(): Promise<any>
}
```

**Implementation Details**:
- Wrap all 18 API endpoints
- Implement request/response logging
- Add retry logic with exponential backoff (3 retries, 100ms-1s delays)
- Type-safe responses
- Error handling with meaningful messages
- Support for custom headers
- Request timeout handling

**Key Features**:
- ✅ All 18 endpoints wrapped
- ✅ Request/response logging
- ✅ Retry logic with backoff
- ✅ Type-safe responses
- ✅ Error handling
- ✅ Timeout support
- ✅ Custom headers

**Acceptance Criteria**:
- [ ] All 18 endpoints wrapped
- [ ] Logging works correctly
- [ ] Retry logic functions
- [ ] Type safety enforced
- [ ] Error messages clear
- [ ] Timeout handling works
- [ ] No unhandled rejections

---

### TASK-405: Create Test Fixtures (4 hours)

**Files**:
- `tests/fixtures/work-orders.ts`
- `tests/fixtures/specialists.ts`
- `tests/fixtures/tasks.ts`

**Objective**: Create reusable test data fixtures

**work-orders.ts**:
```typescript
export const workOrderFixtures = {
  basic: {
    id: 'wo-1',
    title: 'Implement user authentication',
    description: 'Add JWT-based auth',
    priority: 'high',
    status: 'pending'
  },
  withDependencies: {
    id: 'wo-2',
    title: 'Complex workflow',
    dependencies: ['wo-1'],
    priority: 'medium'
  },
  failing: {
    id: 'wo-3',
    title: 'Failing task',
    shouldFail: true,
    retryCount: 3
  }
}
```

**specialists.ts**:
```typescript
export const specialistFixtures = {
  agent1: {
    id: 'sp-1',
    name: 'Agent 1',
    status: 'ready',
    capabilities: ['research', 'planning']
  },
  agent2: {
    id: 'sp-2',
    name: 'Agent 2',
    status: 'ready',
    capabilities: ['implementation', 'testing']
  },
  agent3: {
    id: 'sp-3',
    name: 'Agent 3',
    status: 'ready',
    capabilities: ['review', 'documentation']
  }
}
```

**tasks.ts**:
```typescript
export const taskFixtures = {
  independent: [
    { id: 'task-1', title: 'Task 1', dependencies: [] },
    { id: 'task-2', title: 'Task 2', dependencies: [] },
    { id: 'task-3', title: 'Task 3', dependencies: [] },
    { id: 'task-4', title: 'Task 4', dependencies: [] },
    { id: 'task-5', title: 'Task 5', dependencies: [] }
  ],
  dependent: [
    { id: 'task-1', title: 'Setup database', dependencies: [] },
    { id: 'task-2', title: 'Create schema', dependencies: ['task-1'] },
    { id: 'task-3', title: 'Seed data', dependencies: ['task-2'] }
  ]
}
```

**Acceptance Criteria**:
- [ ] Work order fixtures created
- [ ] Specialist fixtures created
- [ ] Task fixtures created
- [ ] Fixtures are reusable
- [ ] Fixtures have realistic data
- [ ] All exports working

---

### TASK-406: Configure Jest/Test Framework (3 hours)

**Files**:
- `jest.config.js` (update)
- `tests/setup.ts` (create)
- `tests/teardown.ts` (create)

**jest.config.js updates**:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Setup/teardown
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Coverage
  collectCoverageFrom: [
    'server/api/src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Timeouts
  testTimeout: 30000,
  
  // Output
  verbose: true,
  bail: false
}
```

**tests/setup.ts**:
```typescript
// Global test setup
beforeAll(async () => {
  // Initialize test environment
  console.log('🧪 Test environment initializing...')
})

afterAll(async () => {
  // Cleanup test environment
  console.log('🧪 Test environment cleaned up')
})

// Suppress console output during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// }
```

**tests/teardown.ts**:
```typescript
// Global test teardown (if needed)
export default async function globalTeardown() {
  // Cleanup after all tests
  console.log('🧪 Global teardown complete')
}
```

**Acceptance Criteria**:
- [ ] Jest configured for integration tests
- [ ] Test environment set up correctly
- [ ] Coverage reporting configured
- [ ] Test timeouts appropriate (30s)
- [ ] Global setup/teardown works
- [ ] Coverage thresholds set (80%)

---

## Quality Requirements

**Code Quality**:
- ✅ All code must be TypeScript
- ✅ All functions must have proper error handling
- ✅ All database operations must use transactions
- ✅ All API calls must have logging
- ✅ All tests must be deterministic

**Testing**:
- ✅ Code compiles without errors
- ✅ No linting errors
- ✅ Type checking passes
- ✅ Proper error handling throughout

**Documentation**:
- ✅ Code comments for complex logic
- ✅ Function documentation
- ✅ Error messages are clear

---

## Reference Documents

- **Specification**: `specs/phase6-integration-testing/SPECIFICATION.md`
- **Detailed Tasks**: `specs/phase6-integration-testing/PHASE5_DETAILED_TASKS.md`
- **Research**: `docs/research/2026-01-06-phase6-integration-testing.md`

---

## Success Criteria

✅ All 6 tasks complete  
✅ All acceptance criteria met  
✅ Code compiles without errors  
✅ No linting errors  
✅ Type checking passes  
✅ Proper error handling throughout  
✅ Ready for Category B-E tests to use  

---

## Deliverables

When complete, provide:

1. **Summary**: What was implemented
2. **Files**: List of files created/modified
3. **Issues**: Any problems encountered and solutions
4. **Verification**: Confirmation all acceptance criteria met
5. **Status**: Ready for next category

---

**Status**: ✅ Ready for Implementation  
**Confidence**: 94%  
**Next**: Category B-E tests depend on this infrastructure
