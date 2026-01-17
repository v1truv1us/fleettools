# FleetTools Immediate Usability Implementation Specification

## Overview

FleetTools has a sophisticated architecture with ~80% of critical components implemented, but suffers from integration gaps that prevent end-to-end functionality. This specification addresses the critical path to making FleetTools fully usable with complete agent spawning pipeline functionality.

## Current State Assessment

### ✅ **Completed Components (80% of architecture)**
- Complete CLI commands with proper error handling
- Sophisticated AgentSpawner class with lifecycle management  
- Full Squawk coordination APIs (mailbox, cursor, locks)
- Database schema with proper indexing
- Agent runner process with task execution framework
- Comprehensive API route implementations

### ❌ **Critical Integration Gaps**
1. **Agent API routes not registered** - Blocking all agent operations
2. **Checkpoint system using mock data** - CLI not connected to database
3. **Agent execution using node instead of bun** - Runtime inconsistency
4. **Missing agent persistence table** - No database backing for agent state
5. **Resource monitoring mocked** - No real process metrics

## Implementation Strategy

### **Phase 1: Critical Integration Fixes (Day 1-2)**
Focus on unblocking existing functionality through proper integration.

#### 1.1 Register Agent API Routes
**Priority:** CRITICAL - Blocks all agent operations
**Files:** `server/api/src/index.ts`
**Effort:** 2 hours

Add missing route registration:
```typescript
import { registerAgentRoutes } from './coordination/agents.js';
registerAgentRoutes(createRouter(), headers);
```

#### 1.2 Connect Checkpoint CLI to Database
**Priority:** CRITICAL - Core feature disconnected
**Files:** `cli/src/commands/checkpoints.ts`, `cli/src/commands/resume.ts`
**Effort:** 6 hours

Replace mock data with database operations:
- Connect to CheckpointStorage class
- Replace mock responses with real database queries
- Implement proper error handling for database operations

#### 1.3 Fix Agent Runtime
**Priority:** HIGH - Runtime consistency issue
**File:** `server/api/src/coordination/agent-spawner.ts`
**Effort:** 1 hour

Change line 312 from `node` to `bun`:
```typescript
const childProcess = spawn('bun', args, {
```

### **Phase 2: Database Persistence (Day 2-3)**
Add missing database backing for agent state management.

#### 2.1 Add Agents Table
**File:** `squawk/src/db/schema.sql`
**Effort:** 2 hours

```sql
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'spawning',
    pid INTEGER,
    mailbox_id TEXT NOT NULL,
    task TEXT,
    config TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    started_at TEXT,
    terminated_at TEXT,
    last_heartbeat TEXT,
    resource_usage TEXT,
    metadata TEXT,
    FOREIGN KEY (mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE
);
```

#### 2.2 Create Agent Database Operations
**File:** `squawk/src/db/agents.ts`
**Effort:** 4 hours

Implement AgentOps class with CRUD operations for agent lifecycle management.

#### 2.3 Integrate AgentSpawner with Database
**File:** `server/api/src/coordination/agent-spawner.ts`
**Effort:** 6 hours

Replace in-memory Map with database persistence and add recovery logic.

### **Phase 3: Resource Monitoring (Day 3-4)**
Implement real process metrics collection.

#### 3.1 Real Resource Usage Collection
**File:** `server/api/src/coordination/agent-spawner.ts`
**Effort:** 4 hours

Replace mocked resource usage with actual process statistics using `/proc/[pid]/stat`.

#### 3.2 Enhanced Agent Status Response
**File:** `server/api/src/coordination/agents.ts`
**Effort:** 2 hours

Include real PID, uptime, and resource usage in API responses.

### **Phase 4: Task Decomposition Integration (Day 4)**
Expose existing task decomposition capabilities.

#### 4.1 Register Task Decomposition API
**Files:** `server/api/src/index.ts`
**Effort:** 1 hour

Add route registration for task decomposition endpoint.

### **Phase 5: Testing & Validation (Day 5)**
Comprehensive testing of all integration points.

#### 5.1 Integration Tests
**File:** `tests/integration/agent-spawning.test.ts`
**Effort:** 6 hours

Create end-to-end tests for complete agent spawning pipeline.

#### 5.2 CLI Testing
**Effort:** 2 hours

Verify all CLI commands work with real backend.

## Acceptance Criteria

### **US1 Agent Spawning Pipeline:**
- [ ] CLI `fleet spawn <type> <task>` successfully creates agent
- [ ] Agent process starts and connects to Squawk mailbox
- [ ] Agent reports progress via cursor/heartbeat APIs
- [ ] CLI `fleet agents status` shows running agents with their PIDs, uptime, and resource usage
- [ ] CLI `fleet agents terminate <id>` gracefully stops agent and cleans up resources
- [ ] Agent spawning respects timeout and retry configuration
- [ ] Failed spawns are retried up to configured max attempts with exponential backoff

### **System Readiness:**
- [ ] All API routes properly registered and functional
- [ ] Database operations fully integrated with CLI commands
- [ ] Agent processes use consistent Bun runtime
- [ ] Resource monitoring provides real metrics
- [ ] Checkpoint system persists data correctly
- [ ] Task decomposition API accessible
- [ ] Integration tests pass with 100% success rate

## Risk Assessment & Mitigation

### **High Risk:**
1. **Database Schema Changes** - May require migration
   - **Mitigation:** Backup existing database, test migration script
   
2. **Process Permissions** - Real resource monitoring may need elevated privileges
   - **Mitigation:** Feature flag for real vs mocked metrics

### **Medium Risk:**
1. **API Route Conflicts** - New registrations may conflict with existing routes
   - **Mitigation:** Test in development environment first

2. **CLI Integration** - API endpoint changes may break CLI commands
   - **Mitigation:** Version API endpoints, maintain backward compatibility

## Success Metrics

### **Functional Metrics:**
- Agent spawn success rate: >95%
- Agent termination success rate: >95%
- Checkpoint creation/retrieval success rate: >95%
- CLI command success rate: >95%

### **Performance Metrics:**
- Agent spawn time: <3 seconds
- API response time: <500ms
- Resource usage collection: <100ms per agent

### **Reliability Metrics:**
- System uptime: >99%
- Database consistency: 100%
- Process cleanup: 100% on termination

## Implementation Timeline

| Phase | Duration | Critical Path Items |
|-------|----------|-------------------|
| Phase 1 | 2 days | API registration, Checkpoint DB connection, Runtime fix |
| Phase 2 | 2 days | Agent table, Database operations, Spawner integration |
| Phase 3 | 2 days | Real resource monitoring, Enhanced status |
| Phase 4 | 1 day | Task decomposition API |
| Phase 5 | 1 day | Testing and validation |
| **Total** | **8 days** | **Full US1 compliance** |

## Post-Implementation Verification

### **Manual Testing Checklist:**
1. Start Squawk service: `bun run dev` in squawk directory
2. Start API server: `bun run dev` in server/api directory
3. Test agent spawning: `fleet spawn backend "implement authentication"`
4. Monitor agent status: `fleet agents status`
5. Test agent termination: `fleet agents terminate <id>`
6. Verify checkpoint creation: `fleet checkpoints create`
7. Test resume functionality: `fleet resume <checkpoint-id>`

### **Automated Testing:**
- Integration test suite passes
- CLI test suite passes
- API test suite passes
- Performance benchmarks meet targets

## Conclusion

FleetTools is surprisingly close to full functionality. The architecture is sound and most components are implemented. The primary challenge is integration - connecting existing components together into a cohesive system. This specification focuses on the critical integration path to make FleetTools fully usable with complete agent spawning pipeline functionality.

**Estimated Effort:** 8 days total
**Success Probability:** 95% (given strong existing foundation)
**Risk Level:** Medium (integration challenges, not architectural problems)