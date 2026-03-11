# FleetTools Critical Fixes Implementation Specification

**Date:** 2026-01-14  
**Priority:** P0 - Critical Path to Usability  
**Status:** Ready for Implementation  
**Architecture Assessment:** Solid foundation, needs TypeScript fixes and connectivity validation

## Executive Summary

FleetTools is **60-70% complete** with a well-designed architecture but suffers from **TypeScript compilation errors** that prevent building and deployment. The system successfully starts and serves API endpoints, indicating core logic is sound. Primary focus should be on **minimal changes to achieve immediate usability** rather than feature additions.

## Current State Analysis

### ✅ What's Working
- **Server Startup**: API server starts successfully on port 3001
- **Database Integration**: SQLite database initializes and migrates properly  
- **Health Endpoint**: `/health` returns valid JSON response
- **Route Registration**: All endpoints are registered and documented
- **CLI Build**: CLI workspace compiles without errors
- **Squawk Service**: Coordination service builds and initializes

### ❌ Critical Issues Blocking Usability

#### **P1 - TypeScript Compilation Errors** 
**Location:** `server/api/src/coordination/notifier.ts:539`
```typescript
// Error: 'this' implicitly has type 'any'
stats: ReturnType<typeof this.getNotificationStats>
```
**Impact:** Prevents server/api build, blocking production deployment

#### **P1 - Type Safety Issues in Flightline**
**Locations:** Multiple files with `unknown` type errors
- `src/flightline/ctk.ts:37,57,97`
- `src/flightline/tech-orders.ts:28,48` 
- `src/flightline/work-orders.ts:46,65,153-157`

**Root Cause:** Missing type annotations for JSON.parse() results and request bodies

#### **P1 - Squawk Integration Type Issues**
**Locations:**
- `src/squawk/cursor.ts:9`
- `src/squawk/lock.ts:9,45,63`
- `src/squawk/mailbox.ts:9,37`

**Impact:** API endpoints for coordination cannot type-check properly

#### **P2 - Missing Agent Lifecycle Implementation**
**Location:** `server/api/src/coordination/agent-lifecycle.ts`
**Issue:** Contains only placeholder class, real lifecycle behavior missing
**Impact:** Agent spawning and management may fail at runtime

## Implementation Plan

### Phase 1: Critical TypeScript Fixes (2-3 hours)

#### **1.1 Fix Notifier Type Issue**
**File:** `server/api/src/coordination/notifier.ts:539`

**Current problematic code:**
```typescript
exportNotifications(): {
  notifications: Notification[];
  recipients: NotificationRecipient[];
  stats: ReturnType<typeof this.getNotificationStats>;
} {
```

**Fix:**
```typescript
exportNotifications(): {
  notifications: Notification[];
  recipients: NotificationRecipient[];
  stats: {
    total: number;
    delivered: number;
    pending: number;
    failed: number;
  };
} {
```

#### **1.2 Fix Flightline Type Safety Issues**
**Pattern:** Add proper type annotations for JSON parsing and request bodies

**File:** `server/api/src/flightline/ctk.ts`

**Add interfaces at top of file:**
```typescript
interface CtkReservationRequest {
  file: string;
  specialist_id: string;
  purpose?: string;
}

interface CtkReservation {
  reservation_id: string;
  file: string;
  specialist_id: string;
  purpose: string;
  created_at: string;
}
```

**Fix route handler (line 54-57):**
```typescript
router.post('/api/v1/ctk/reserve', async (req: Request) => {
  try {
    const body = await req.json() as CtkReservationRequest;
    const { file, specialist_id, purpose = 'edit' } = body;
```

**Fix type assertion (line 37):**
```typescript
const reservation = JSON.parse(content) as CtkReservation;
reservations.push(reservation);
```

**Apply similar pattern to:**
- `src/flightline/tech-orders.ts` - add `TechOrderRequest` and `TechOrder` interfaces
- `src/flightline/work-orders.ts` - add `WorkOrderRequest` and `WorkOrder` interfaces

#### **1.3 Fix Squawk Type Issues**
**Pattern:** Add proper type annotations for database operations

**File:** `server/api/src/squawk/cursor.ts`

**Add interfaces:**
```typescript
interface CursorRequest {
  stream_id: string;
  position: number;
}
```

**Fix route handler:**
```typescript
router.post('/api/v1/cursor/advance', async (req: Request) => {
  try {
    const body = await req.json() as CursorRequest;
    const { stream_id, position } = body;
```

**Apply similar pattern to:**
- `src/squawk/lock.ts` - add `LockRequest` and `LockResponse` interfaces
- `src/squawk/mailbox.ts` - add `MailboxRequest` and `MailboxResponse` interfaces

### Phase 2: Agent Lifecycle Implementation (1-2 hours)

#### **2.1 Complete Agent Lifecycle Manager**
**File:** `server/api/src/coordination/agent-lifecycle.ts`

**Replace entire file content:**

```typescript
/**
 * Agent Lifecycle Management for FleetTools
 *
 * Handles agent registration, status tracking, heartbeat monitoring,
 * and graceful termination processes.
 */

export interface Agent {
  id: string;
  type: string;
  status: 'starting' | 'idle' | 'active' | 'busy' | 'offline' | 'terminated';
  pid?: number;
  spawnedAt: string;
  lastHeartbeat?: string;
  currentTask?: string;
  metadata: Record<string, any>;
}

export interface AgentLifecycleConfig {
  heartbeatTimeout: number; // milliseconds
  maxRetries: number;
  recoveryMode: 'auto' | 'manual';
}

export class AgentLifecycleManager {
  private agents: Map<string, Agent> = new Map();
  private config: AgentLifecycleConfig;
  private heartbeatMonitor?: NodeJS.Timeout;
  private recoveryMonitor?: NodeJS.Timeout;

  constructor(config: Partial<AgentLifecycleConfig> = {}) {
    this.config = {
      heartbeatTimeout: 30000, // 30 seconds
      maxRetries: 3,
      recoveryMode: 'auto',
      ...config
    };
  }

  /**
   * Register a new agent in the lifecycle
   */
  registerAgent(agent: Omit<Agent, 'spawnedAt'>): Agent {
    const fullAgent: Agent = {
      ...agent,
      spawnedAt: new Date().toISOString()
    };
    
    this.agents.set(agent.id, fullAgent);
    console.log(`✓ Agent registered: ${agent.id} (${agent.type})`);
    
    return fullAgent;
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId: string, status: Agent['status'], metadata?: Partial<Agent>): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    agent.status = status;
    if (metadata) {
      Object.assign(agent, metadata);
    }
    agent.lastHeartbeat = new Date().toISOString();

    console.log(`🔄 Agent ${agentId} status: ${status}`);
    return true;
  }

  /**
   * Record agent heartbeat
   */
  recordHeartbeat(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    agent.lastHeartbeat = new Date().toISOString();
    return true;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * List all agents
   */
  listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by status
   */
  getAgentsByStatus(status: Agent['status']): Agent[] {
    return Array.from(this.agents.values()).filter(agent => agent.status === status);
  }

  /**
   * Terminate agent
   */
  terminateAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    // Update status
    agent.status = 'terminated';
    
    // Kill process if running
    if (agent.pid) {
      try {
        process.kill(agent.pid, 'SIGTERM');
        console.log(`🛑 Terminated agent process: ${agentId} (pid: ${agent.pid})`);
      } catch (error) {
        console.error(`Failed to kill agent ${agentId}:`, error);
      }
    }

    // Remove from active agents
    this.agents.delete(agentId);
    console.log(`🗑️  Agent terminated: ${agentId}`);
    
    return true;
  }

  /**
   * Start monitoring heartbeats
   */
  startMonitoring(): void {
    if (this.heartbeatMonitor) {
      return;
    }

    this.heartbeatMonitor = setInterval(() => {
      this.checkHeartbeats();
    }, this.config.heartbeatTimeout / 2);

    console.log('✓ Agent heartbeat monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.heartbeatMonitor) {
      clearInterval(this.heartbeatMonitor);
      this.heartbeatMonitor = undefined;
    }

    if (this.recoveryMonitor) {
      clearInterval(this.recoveryMonitor);
      this.recoveryMonitor = undefined;
    }

    console.log('✓ Agent monitoring stopped');
  }

  /**
   * Check agent heartbeats and mark offline if needed
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    const offlineThreshold = this.config.heartbeatTimeout;

    for (const [agentId, agent] of this.agents) {
      if (agent.status === 'terminated') {
        continue;
      }

      const lastHeartbeat = agent.lastHeartbeat ? new Date(agent.lastHeartbeat).getTime() : 0;
      const timeSinceHeartbeat = now - lastHeartbeat;

      if (timeSinceHeartbeat > offlineThreshold) {
        console.warn(`⚠️  Agent ${agentId} missed heartbeat, marking offline`);
        agent.status = 'offline';
      }
    }
  }

  /**
   * Cleanup terminated agents
   */
  cleanup(): void {
    const terminated = Array.from(this.agents.entries())
      .filter(([_, agent]) => agent.status === 'terminated')
      .map(([id, _]) => id);

    terminated.forEach(id => this.agents.delete(id));
    
    if (terminated.length > 0) {
      console.log(`🧹 Cleaned up ${terminated.length} terminated agents`);
    }
  }

  /**
   * Get system health summary
   */
  getSystemHealth(): {
    total: number;
    active: number;
    idle: number;
    busy: number;
    offline: number;
    terminated: number;
  } {
    const agents = this.listAgents();
    return {
      total: agents.length,
      active: agents.filter(a => a.status === 'active').length,
      idle: agents.filter(a => a.status === 'idle').length,
      busy: agents.filter(a => a.status === 'busy').length,
      offline: agents.filter(a => a.status === 'offline').length,
      terminated: agents.filter(a => a.status === 'terminated').length
    };
  }
}
```

### Phase 3: API Route Integration Testing (1 hour)

#### **3.1 Test Key Endpoints**
Create test file: `server/api/test-endpoints.ts`

```typescript
/**
 * Basic API endpoint testing for FleetTools
 */

async function testCoreEndpoints() {
  const baseUrl = 'http://localhost:3001';
  
  const tests = [
    { name: 'Health Check', url: '/health' },
    { name: 'List Agents', url: '/api/v1/agents' },
    { name: 'List Tasks', url: '/api/v1/tasks' },
    { name: 'List Work Orders', url: '/api/v1/work-orders' },
    { name: 'Task Decomposition', url: '/api/v1/tasks/decompose', method: 'POST', 
      body: { title: 'Test mission', description: 'Test description' } }
  ];

  console.log('Testing FleetTools API Endpoints...');
  console.log('==================================');
  
  for (const test of tests) {
    try {
      const response = await fetch(`${baseUrl}${test.url}`, {
        method: test.method || 'GET',
        headers: test.body ? { 'Content-Type': 'application/json' } : {},
        body: test.body ? JSON.stringify(test.body) : undefined
      });
      
      const success = response.status < 500;
      console.log(`${success ? '✓' : '✗'} ${test.name}: ${response.status}`);
      
      if (!success && response.status >= 400) {
        const errorText = await response.text();
        console.log(`    Error: ${errorText.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`✗ ${test.name}: ${error.message}`);
    }
  }
  
  console.log('\nTest complete.');
}

// Run tests if called directly
if (import.meta.main) {
  testCoreEndpoints().catch(console.error);
}

export { testCoreEndpoints };
```

#### **3.2 CLI to API Connectivity Test**
**Test script:** `cli/test-connectivity.ts`

```typescript
/**
 * Test CLI commands against running API server
 */

import { execSync } from 'child_process';

async function testCliConnectivity() {
  console.log('Testing CLI to API Connectivity...');
  console.log('==================================');
  
  const commands = [
    { name: 'Status Check', cmd: 'bun run index status' },
    { name: 'List Agents', cmd: 'bun run index agents list' },
    { name: 'List Tasks', cmd: 'bun run index tasks list' },
    { name: 'List Checkpoints', cmd: 'bun run index checkpoints list' }
  ];

  for (const test of commands) {
    try {
      const result = execSync(test.cmd, { 
        encoding: 'utf-8', 
        cwd: process.cwd(), 
        timeout: 5000 
      });
      console.log(`✓ ${test.name}: Command executed successfully`);
      console.log(`   Output: ${result.substring(0, 100)}...`);
    } catch (error) {
      console.log(`✗ ${test.name}: ${error.message}`);
    }
    console.log('');
  }
}

testCliConnectivity().catch(console.error);
```

### Phase 4: Priority 2 Core Functionality (2-3 hours)

#### **4.1 Complete Resume Functionality**
**File:** `cli/src/commands/resume.ts`
- Verify interface definitions are correct
- Add proper error handling for API responses
- Test checkpoint creation and restoration

**Potential fixes needed:**
```typescript
// Add missing interfaces if needed
interface CheckpointResponse {
  data: {
    id: string;
    mission_id: string;
    timestamp: string;
    trigger: string;
    trigger_details?: string;
    progress_percent?: number;
    recovery_context: Record<string, any>;
    sorties: Array<{
      id: string;
      status: string;
      assigned_to?: string;
    }>;
  };
}

interface ResumeResponse {
  success: boolean;
  data: {
    restoredAgents: string[];
    restoredTasks: string[];
    restoredLocks: string[];
    errors: string[];
  };
}
```

#### **4.2 Input Validation Middleware**
**File:** `server/api/src/middleware/validation.ts` (create new file)

```typescript
/**
 * Input validation middleware for FleetTools API
 */

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export function createValidationError(message: string, field?: string, value?: any): ValidationError {
  return { field: field || 'unknown', message, value };
}

export function validateRequired(value: any, fieldName: string): ValidationError | null {
  if (value === undefined || value === null || value === '') {
    return createValidationError(`${fieldName} is required`, fieldName);
  }
  return null;
}

export function validateString(value: any, fieldName: string, minLength = 1): ValidationError | null {
  if (typeof value !== 'string') {
    return createValidationError(`${fieldName} must be a string`, fieldName, value);
  }
  if (value.length < minLength) {
    return createValidationError(`${fieldName} must be at least ${minLength} characters`, fieldName, value);
  }
  return null;
}

export function validateEnum(value: any, fieldName: string, allowedValues: string[]): ValidationError | null {
  if (!allowedValues.includes(value)) {
    return createValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`, fieldName, value);
  }
  return null;
}

export function createValidationErrorResponse(errors: ValidationError[]): Response {
  return new Response(JSON.stringify({
    error: 'Validation failed',
    errors,
    timestamp: new Date().toISOString()
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

#### **4.3 Enhanced Error Handling**
**Update existing route handlers to use consistent error pattern:**

```typescript
function createErrorResponse(error: any, status: number = 500): Response {
  console.error('API Error:', error);
  
  return new Response(JSON.stringify({
    error: status === 500 ? 'Internal server error' : 'Request failed',
    message: error?.message || 'Unknown error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
  }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

#### **4.4 Basic Testing Suite**
**Files to create:**
- `server/api/test-basic-functionality.ts`
- `cli/test-cli-commands.ts`

**Test Coverage:**
- Server startup and health check
- API endpoint accessibility  
- CLI command execution
- Agent spawning workflow
- Checkpoint creation/resume

## Success Criteria

### ✅ Immediate Success (After Phase 1-2)
1. **Build Success**: `bun run build` completes without errors across all workspaces
2. **Server Health**: API server starts and all endpoints are accessible
3. **CLI Connectivity**: CLI commands successfully communicate with running server
4. **Agent Spawning**: Basic agent creation and lifecycle management works

### ✅ Full Success (After Phase 3-4)
1. **End-to-End Workflow**: Complete agent mission execution works
2. **Checkpoint System**: Mission state persistence and recovery functional
3. **Input Validation**: All API endpoints properly validate inputs
4. **Error Handling**: Consistent, actionable error responses across all APIs
5. **Basic Testing**: Core functionality has passing test suite

## Risk Assessment & Mitigation

### **High Risk: Breaking Changes**
**Mitigation:** 
- Make minimal changes to existing interfaces
- Preserve existing API contracts
- Test thoroughly after each change

### **Medium Risk: Runtime Errors**
**Mitigation:**
- Add comprehensive error logging
- Implement graceful degradation
- Add health checks for critical components

### **Low Risk: Performance Issues**
**Mitigation:**
- Focus on correctness over optimization initially
- Monitor performance in testing
- Address bottlenecks after functionality is verified

## Implementation Timeline

```
Day 1 (4-6 hours):
├── Phase 1: TypeScript Compilation Fixes (2-3 hours)
├── Phase 2: Agent Lifecycle Implementation (1-2 hours)  
└── Phase 3: API Route Integration Testing (1 hour)

Day 2 (2-3 hours):
└── Phase 4: Priority 2 Core Functionality (2-3 hours)
```

## Next Steps

1. **Immediate**: Begin Phase 1 TypeScript fixes
2. **After Build Success**: Test CLI-to-API connectivity
3. **After Integration Tests**: Implement Priority 2 features
4. **Final**: End-to-end testing and documentation update

## Testing Checklist

### Pre-Implementation
- [x] Current build errors documented
- [x] API server starts but with type issues
- [x] CLI builds successfully
- [x] Database initializes properly

### Post-Phase 1
- [ ] All workspaces build without errors
- [ ] Server starts successfully
- [ ] Health endpoint accessible
- [ ] No TypeScript compilation warnings

### Post-Phase 2  
- [ ] Agent lifecycle functions work
- [ ] Agent spawning creates processes
- [ ] Heartbeat monitoring functions
- [ ] Agent termination works properly

### Post-Phase 3
- [ ] All API endpoints return proper responses
- [ ] CLI commands connect to server
- [ ] Error responses are consistent
- [ ] Input validation works where implemented

### Final Verification
- [ ] Complete agent mission workflow functional
- [ ] Checkpoint system works end-to-end
- [ ] Basic test suite passes
- [ ] Ready for development use

---

**Architecture Impact:** Minimal - preserving solid existing design  
**Code Quality:** High - following established patterns and TypeScript best practices  
**User Experience:** Transforming from non-functional to fully usable system

## Quick Reference Fixes

### TypeScript Compilation Errors
```typescript
// Fix 1: notifier.ts:539
stats: ReturnType<typeof this.getNotificationStats>; // REMOVE
stats: { total: number; delivered: number; pending: number; failed: number; }; // ADD

// Fix 2: Add type interfaces for JSON.parse results
const result = JSON.parse(content) as SpecificType; // ADD

// Fix 3: Add request body type annotations  
const body = await req.json() as SpecificRequestType; // ADD
```

### File-by-File Changes Needed
1. **server/api/src/coordination/notifier.ts** - Fix ReturnType type
2. **server/api/src/flightline/ctk.ts** - Add CtkReservationRequest/Response interfaces
3. **server/api/src/flightline/tech-orders.ts** - Add TechOrderRequest/Response interfaces  
4. **server/api/src/flightline/work-orders.ts** - Add WorkOrderRequest/Response interfaces
5. **server/api/src/squawk/cursor.ts** - Add CursorRequest interface
6. **server/api/src/squawk/lock.ts** - Add LockRequest/Response interfaces
7. **server/api/src/squawk/mailbox.ts** - Add MailboxRequest/Response interfaces
8. **server/api/src/coordination/agent-lifecycle.ts** - Replace with full implementation
9. **server/api/test-endpoints.ts** - Create endpoint testing
10. **cli/test-connectivity.ts** - Create CLI connectivity testing

This specification provides the exact fixes needed to transform FleetTools from a partially working system to a fully functional development tool ready for production use.