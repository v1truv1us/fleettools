# FleetTools Immediate Usability Implementation Plan

**Date:** 2026-01-10  
**Version:** 1.0  
**Timeline:** 2 weeks (14 days) focused implementation  
**Based on:** specs/fleettools-usability/spec.md  
**Target:** Production-ready agent coordination system

---

## Executive Summary

This implementation plan transforms the FleetTools usability specification into 84 atomic tasks with 15-30 minute timeboxes, organized into systematic phases with clear dependencies, quality gates, and risk mitigation strategies. The plan addresses all critical gaps identified in research while maintaining architectural consistency with the existing TypeScript/Bun codebase.

**Critical Path Focus:**
- CLI Service Management (Podman integration) - Days 1-4
- Agent Coordination System - Days 3-8  
- Security Production Readiness - Days 9-12
- Checkpoint/Resume System - Days 6-10

**Success Metrics:**
- All CLI commands functional with <30s service startup
- Agent spawning working with <5s response time
- Zero hardcoded credentials (production security)
- Checkpoint/resume operational with <2s restore time

---

## Task Organization Framework

### Task Structure
Each task follows this format:
```markdown
**TASK-ID:** Unique identifier  
**Timebox:** 15-30 minutes  
**Dependencies:** [TASK-IDs]  
**Priority:** Critical/High/Medium/Low  
**Acceptance Criteria:** Specific testable outcomes  
**File Locations:** Exact files to modify/create  
**Quality Gate:** Validation criteria  
**Risk Level:** Low/Medium/High  
**Mitigation:** Specific strategies
```

### Phase Structure
- **Phase 1:** Foundation & Service Management (Days 1-4)
- **Phase 2:** Agent Coordination Core (Days 3-8) 
- **Phase 3:** Security Hardening (Days 9-12)
- **Phase 4:** Context Survival System (Days 6-10)
- **Phase 5:** Integration & Production Readiness (Days 12-14)

---

## Phase 1: Foundation & Service Management (Days 1-4)

### Day 1: CLI Service Management Foundation

**TASK-101:** Update CLI to use PodmanPostgresProvider  
**Timebox:** 20 minutes  
**Dependencies:** None  
**Priority:** Critical  
**Acceptance Criteria:**
- ✅ Import PodmanPostgresProvider in cli/index.ts
- ✅ Replace sync stub with async implementation
- ✅ Error handling for missing provider
**File Locations:**
- `cli/index.ts:8-15` - Add imports
- `cli/index.ts:108-132` - Replace servicesUpSync()
- `cli/index.ts:134-152` - Replace servicesDownSync()
**Quality Gate:** CLI compiles, imports resolve
**Risk Level:** Medium  
**Mitigation:** Verify provider exports exist

---

**TASK-102:** Convert CLI service commands to async  
**Timebox:** 25 minutes  
**Dependencies:** TASK-101  
**Priority:** Critical  
**Acceptance Criteria:**
- ✅ All service commands return Promise<void>
- ✅ Async/await pattern implemented
- ✅ Error handling with try/catch blocks
**File Locations:**
- `cli/index.ts:108-188` - Convert all service functions
**Quality Gate:** TypeScript compilation passes
**Risk Level:** Low  
**Mitigation:** Simple async conversion

---

**TASK-103:** Add environment variable support to PodmanPostgresProvider  
**Timebox:** 30 minutes  
**Dependencies:** None  
**Priority:** Critical  
**Acceptance Criteria:**
- ✅ Remove hardcoded credentials (lines 73-75)
- ✅ Use process.env.POSTGRES_PASSWORD with fallback
- ✅ Use process.env.POSTGRES_DB with fallback
- ✅ Use process.env.POSTGRES_USER with fallback
**File Locations:**
- `providers/podman-postgres.ts:73-75` - Replace hardcoded values
**Quality Gate:** No hardcoded credentials in source
**Risk Level:** High (Security)  
**Mitigation:** Maintain fallback defaults

---

**TASK-104:** Implement service health checking  
**Timebox:** 20 minutes  
**Dependencies:** TASK-101, TASK-102  
**Priority:** High  
**Acceptance Criteria:**
- ✅ servicesStatus() calls provider.status()
- ✅ Returns ServiceStatus[] format
- ✅ Includes health indicators
**File Locations:**
- `cli/index.ts:154-183` - Update servicesStatusSync()
- `providers/podman-postgres.ts:109-137` - Enhance status()
**Quality Gate:** Status command shows health
**Risk Level:** Low  
**Mitigation:** Use existing provider interface

---

### Day 2: Service Management Completion

**TASK-105:** Add real-time log streaming  
**Timebox:** 25 minutes  
**Dependencies:** TASK-101  
**Priority:** High  
**Acceptance Criteria:**
- ✅ `fleet services logs` streams container logs
- ✅ Follow log output with tail -f behavior
- ✅ Handle container not found gracefully
**File Locations:**
- `cli/index.ts:185-188` - Replace servicesLogsSync()
- `providers/podman-postgres.ts:142-150` - Add streaming option
**Quality Gate:** Log streaming works in real-time
**Risk Level:** Medium  
**Mitigation:** Start with basic log fetch

---

**TASK-106:** Add cross-platform Podman Machine support  
**Timebox:** 30 minutes  
**Dependencies:** TASK-101  
**Priority:** High  
**Acceptance Criteria:**
- ✅ macOS Podman Machine auto-start
- ✅ Linux native Podman support
- ✅ Platform detection and appropriate handling
**File Locations:**
- `providers/podman-postgres.ts:48-56` - Enhance macOS support
- `providers/podman-postgres.ts:195-202` - Improve machine checking
**Quality Gate:** Works on Linux and macOS
**Risk Level:** Medium  
**Mitigation:** Test on both platforms

---

**TASK-107:** Add graceful shutdown handling  
**Timebox:** 20 minutes  
**Dependencies:** TASK-101, TASK-102  
**Priority:** High  
**Acceptance Criteria:**
- ✅ SIGTERM handling in CLI
- ✅ Container cleanup on interrupt
- ✅ Proper resource release
**File Locations:**
- `cli/index.ts:360-361` - Add signal handlers
- `providers/podman-postgres.ts:93-104` - Ensure cleanup
**Quality Gate:** Clean shutdown on Ctrl+C
**Risk Level:** Low  
**Mitigation:** Standard signal handling

---

**TASK-108:** Service dependency resolution  
**Timebox:** 25 minutes  
**Dependencies:** TASK-101, TASK-104  
**Priority:** Medium  
**Acceptance Criteria:**
- ✅ Automatic dependency startup order
- ✅ Health check before proceeding
- ✅ Dependency failure handling
**File Locations:**
- `cli/index.ts:108-132` - Add dependency logic
- `providers/podman-postgres.ts:231-248` - Enhance ready waiting
**Quality Gate:** Services start in correct order
**Risk Level:** Medium  
**Mitigation:** Start with single dependency

---

### Day 3-4: Service Management Testing & Polish

**TASK-109:** Create service management integration tests  
**Timebox:** 30 minutes  
**Dependencies:** TASK-101, TASK-102, TASK-104  
**Priority:** High  
**Acceptance Criteria:**
- ✅ Test service up/down cycle
- ✅ Test status reporting
- ✅ Test error conditions
**File Locations:**
- `tests/integration/cli/services.test.ts` - Create new test file
**Quality Gate:** All tests pass, coverage >90%
**Risk Level:** Low  
**Mitigation:** Use existing test patterns

---

**TASK-110:** Add performance monitoring for services  
**Timebox:** 25 minutes  
**Dependencies:** TASK-104, TASK-108  
**Priority:** Medium  
**Acceptance Criteria:**
- ✅ Response time collection
- ✅ Resource usage tracking
- ✅ Performance threshold alerts
**File Locations:**
- `providers/podman-postgres.ts:109-137` - Add metrics collection
**Quality Gate:** Performance data collected
**Risk Level:** Low  
**Mitigation:** Basic metrics first

---

**TASK-111:** Add service recovery mechanisms  
**Timebox:** 30 minutes  
**Dependencies:** TASK-107, TASK-108  
**Priority:** Medium  
**Acceptance Criteria:**
- ✅ Automatic restart on failure
- ✅ Health check-based recovery
- ✅ Recovery attempt limits
**File Locations:**
- `providers/podman-postgres.ts:155-161` - Enhance restart logic
**Quality Gate:** Services recover automatically
**Risk Level:** Medium  
**Mitigation:** Conservative restart policies

---

**TASK-112:** Service management CLI help and documentation  
**Timebox:** 15 minutes  
**Dependencies:** TASK-101, TASK-102, TASK-105  
**Priority:** Low  
**Acceptance Criteria:**
- ✅ Updated help text for all service commands
- ✅ Usage examples in command descriptions
- ✅ Error message improvements
**File Locations:**
- `cli/index.ts:332-354` - Update help text
**Quality Gate:** Help is clear and accurate
**Risk Level:** Low  
**Mitigation:** Simple text updates

---

## Phase 2: Agent Coordination Core (Days 3-8)

### Day 3-4: Agent Spawning System Foundation

**TASK-201:** Create AgentSpawner class  
**Timebox:** 30 minutes  
**Dependencies:** None  
**Priority:** Critical  
**Acceptance Criteria:**
- ✅ AgentSpawner class with spawn(), monitor(), terminate()
- ✅ Type definitions for AgentHandle, AgentStatus
- ✅ Integration with Squawk mailbox system
**File Locations:**
- `server/api/src/coordination/agent-spawner.ts` - Create new file
- `packages/events/src/types/coordination.ts` - Add types
**Quality Gate:** Class compiles, interface complete
**Risk Level:** Medium  
**Mitigation:** Start with basic skeleton

---

**TASK-202:** Implement task queue with SQLite  
**Timebox:** 30 minutes  
**Dependencies:** None  
**Priority:** Critical  
**Acceptance Criteria:**
- ✅ TaskQueue class with enqueue(), dequeue(), complete(), fail()
- ✅ SQLite table for tasks (tsk_ prefixed IDs)
- ✅ Task assignment by agent type
**File Locations:**
- `server/api/src/coordination/task-queue.ts` - Create new file
- `packages/db/src/schema/coordination.ts` - Add tables
**Quality Gate:** Queue operations persist correctly
**Risk Level:** Medium  
**Mitigation:** Use existing DB patterns

---

**TASK-203:** Add agent types and validation  
**Timebox:** 20 minutes  
**Dependencies:** TASK-201  
**Priority:** Critical  
**Acceptance Criteria:**
- ✅ AgentType enum: frontend, backend, testing, documentation
- ✅ Zod validation for AgentSpawnRequest
- ✅ Agent configuration schema
**File Locations:**
- `packages/events/src/types/coordination.ts` - Add AgentType enum
- `server/api/src/middleware/validation.ts` - Add schemas
**Quality Gate:** Validation catches invalid requests
**Risk Level:** Low  
**Mitigation:** Use Zod best practices

---

**TASK-204:** Implement agent lifecycle management  
**Timebox:** 25 minutes  
**Dependencies:** TASK-201, TASK-202  
**Priority:** High  
**Acceptance Criteria:**
- ✅ Agent spawn process with timeout
- ✅ Status tracking via Squawk mailbox
- ✅ Graceful termination handling
**File Locations:**
- `server/api/src/coordination/agent-spawner.ts:50-80` - Lifecycle methods
**Quality Gate:** Agents can be spawned and terminated
**Risk Level:** Medium  
**Mitigation:** Start with sequential spawning

---

**TASK-205:** Add CLI agent commands  
**Timebox:** 25 minutes  
**Dependencies:** TASK-201, TASK-203  
**Priority:** High  
**Acceptance Criteria:**
- ✅ `fleet spawn <type> <task>` command
- ✅ `fleet agents status` command  
- ✅ `fleet agents terminate <id>` command
**File Locations:**
- `cli/src/commands/agents.ts` - Create new command file
- `cli/index.ts:330-354` - Add to command tree
**Quality Gate:** All agent commands work from CLI
**Risk Level:** Low  
**Mitigation:** Use existing CLI patterns

---

### Day 5-6: Agent Progress Tracking

**TASK-206:** Create ProgressTracker class  
**Timebox:** 25 minutes  
**Dependencies:** TASK-201, TASK-202  
**Priority:** High  
**Acceptance Criteria:**
- ✅ ProgressTracker with startMission(), updateProgress(), completeMission()
- ✅ Mission progress percentage tracking
- ✅ Real-time progress updates
**File Locations:**
- `server/api/src/coordination/progress-tracker.ts` - Create new file
**Quality Gate:** Progress updates persist correctly
**Risk Level:** Low  
**Mitigation:** Simple percentage tracking

---

**TASK-207:** Add mission management endpoints  
**Timebox:** 30 minutes  
**Dependencies:** TASK-206  
**Priority:** High  
**Acceptance Criteria:**
- ✅ POST /api/v1/missions endpoint
- ✅ GET /api/v1/missions/:id endpoint  
- ✅ PATCH /api/v1/missions/:id/progress endpoint
- ✅ WebSocket support for real-time updates
**File Locations:**
- `server/api/src/coordination/missions.ts` - Create new routes
- `server/api/src/index.ts:40-60` - Add to router
**Quality Gate:** All endpoints return correct data
**Risk Level:** Medium  
**Mitigation:** REST endpoints first, WebSocket later

---

**TASK-208:** Implement task decomposition  
**Timebox:** 30 minutes  
**Dependencies:** TASK-202, TASK-206  
**Priority:** Medium  
**Acceptance Criteria:**
- ✅ Automatic task breakdown for missions
- ✅ Task assignment by agent type
- ✅ Task dependency resolution
**File Locations:**
- `server/api/src/coordination/task-decomposer.ts` - Create new file
**Quality Gate:** Complex missions break down correctly
**Risk Level:** Medium  
**Mitigation:** Start with simple decomposition rules

---

**TASK-209:** Add conflict detection and resolution  
**Timebox:** 25 minutes  
**Dependencies:** TASK-201, TASK-206  
**Priority:** Medium  
**Acceptance Criteria:**
- ✅ Agent conflict detection
- ✅ Automatic conflict resolution strategies
- ✅ Conflict logging and reporting
**File Locations:**
- `server/api/src/coordination/conflict-resolver.ts` - Create new file
**Quality Gate:** Conflicts are detected and resolved
**Risk Level:** Medium  
**Mitigation:** Simple conflict rules first

---

**TASK-210:** Add mission completion notifications  
**Timebox:** 20 minutes  
**Dependencies:** TASK-206, TASK-207  
**Priority:** Medium  
**Acceptance Criteria:**
- ✅ Mission completion events
- ✅ Notification delivery via Squawk
- ✅ Success/failure status reporting
**File Locations:**
- `server/api/src/coordination/notifier.ts` - Create new file
**Quality Gate:** Notifications trigger correctly
**Risk Level:** Low  
**Mitigation:** Event-based notifications

---

### Day 7-8: Agent Coordination Testing & Polish

**TASK-211:** Create agent coordination integration tests  
**Timebox:** 30 minutes  
**Dependencies:** TASK-201, TASK-202, TASK-205  
**Priority:** High  
**Acceptance Criteria:**
- ✅ Test agent spawning workflow
- ✅ Test task assignment and completion
- ✅ Test mission progress tracking
**File Locations:**
- `tests/integration/coordination/agents.test.ts` - Create new test file
**Quality Gate:** All tests pass, coverage >85%
**Risk Level:** Low  
**Mitigation:** Test one agent type first

---

**TASK-212:** Add performance testing for agent spawning  
**Timebox:** 25 minutes  
**Dependencies:** TASK-201, TASK-204  
**Priority:** Medium  
**Acceptance Criteria:**
- ✅ <5s spawn time validation
- ✅ Concurrent agent spawning test
- ✅ Resource usage monitoring
**File Locations:**
- `tests/performance/agent-spawning.test.ts` - Create new test file
**Quality Gate:** Performance targets met
**Risk Level:** Low  
**Mitigation:** Benchmark current performance

---

**TASK-213:** Add agent coordination error handling  
**Timebox:** 25 minutes  
**Dependencies:** TASK-201, TASK-204, TASK-209  
**Priority:** High  
**Acceptance Criteria:**
- ✅ Agent failure handling
- ✅ Task timeout management
- ✅ Recovery mechanisms
**File Locations:**
- `server/api/src/coordination/agent-spawner.ts:80-120` - Error handling
**Quality Gate:** System recovers from agent failures
**Risk Level:** Medium  
**Mitigation:** Timeout-based recovery

---

**TASK-214:** Add agent coordination monitoring  
**Timebox:** 20 minutes  
**Dependencies:** TASK-206, TASK-210  
**Priority:** Medium  
**Acceptance Criteria:**
- ✅ Agent status monitoring dashboard
- ✅ Mission throughput metrics
- ✅ Performance alerting
**File Locations:**
- `server/api/src/coordination/monitor.ts` - Create new file
**Quality Gate:** Monitoring data is accurate
**Risk Level:** Low  
**Mitigation:** Basic metrics first

---

## Phase 3: Security Hardening (Days 9-12)

### Day 9-10: Authentication & Authorization

**TASK-301:** Create JWT authentication middleware  
**Timebox:** 30 minutes  
**Dependencies:** None  
**Priority:** Critical  
**Acceptance Criteria:**
- ✅ JWT token validation middleware
- ✅ Token generation and refresh
- ✅ Configurable expiry settings
**File Locations:**
- `server/api/src/middleware/auth.ts` - Create new file
**Quality Gate:** Invalid tokens are rejected
**Risk Level:** High (Security)  
**Mitigation:** Use established JWT library

---

**TASK-302:** Implement role-based access control  
**Timebox:** 25 minutes  
**Dependencies:** TASK-301  
**Priority:** Critical  
**Acceptance Criteria:**
- ✅ Role definitions: admin, agent, user
- ✅ Resource-based authorization
- ✅ Action-based permissions
**File Locations:**
- `server/api/src/middleware/rbac.ts` - Create new file
**Quality Gate:** Unauthorized access is blocked
**Risk Level:** High (Security)  
**Mitigation:** Deny-by-default approach

---

**TASK-303:** Add input validation with Zod schemas  
**Timebox:** 30 minutes  
**Dependencies:** TASK-203  
**Priority:** Critical  
**Acceptance Criteria:**
- ✅ All API endpoints have Zod schemas
- ✅ Input sanitization and validation
- ✅ Error response standardization
**File Locations:**
- `server/api/src/middleware/validation.ts` - Enhance existing
- `server/api/src/schemas/` - Create schema directory
**Quality Gate:** Invalid inputs are rejected
**Risk Level:** Medium  
**Mitigation:** Comprehensive validation

---

**TASK-304:** Configure CORS policies  
**Timebox:** 20 minutes  
**Dependencies:** None  
**Priority:** High  
**Acceptance Criteria:**
- ✅ CORS origin restrictions
- ✅ Allowed methods and headers
- ✅ Preflight request handling
**File Locations:**
- `server/api/src/middleware/cors.ts` - Create new file
- `server/api/src/index.ts:20-40` - Add CORS middleware
**Quality Gate:** Cross-origin requests controlled
**Risk Level:** Low  
**Mitigation:** Restrictive defaults

---

### Day 11-12: Security Testing & Hardening

**TASK-305:** Implement rate limiting  
**Timebox:** 25 minutes  
**Dependencies:** TASK-301, TASK-303  
**Priority:** High  
**Acceptance Criteria:**
- ✅ 100 requests/minute per IP limit
- ✅ Redis backend for rate limiting
- ✅ Rate limit breach handling
**File Locations:**
- `server/api/src/middleware/rate-limit.ts` - Create new file
**Quality Gate:** Rate limits enforce correctly
**Risk Level:** Medium  
**Mitigation:** In-memory fallback if Redis unavailable

---

**TASK-306:** Add SQL injection protection  
**Timebox:** 20 minutes  
**Dependencies:** TASK-202, TASK-303  
**Priority:** Critical  
**Acceptance Criteria:**
- ✅ Parameterized queries only
- ✅ Query string validation
- ✅ Database access auditing
**File Locations:**
- `packages/db/src/client.ts` - Enhance client
- `server/api/src/middleware/db-security.ts` - Create new file
**Quality Gate:** SQL injection attempts blocked
**Risk Level:** High (Security)  
**Mitigation:** Use prepared statements exclusively

---

**TASK-307:** Add security audit logging  
**Timebox:** 25 minutes  
**Dependencies:** TASK-301, TASK-302  
**Priority:** High  
**Acceptance Criteria:**
- ✅ Security event logging
- ✅ Authentication attempt tracking
- ✅ Authorization failure logging
**File Locations:**
- `server/api/src/middleware/audit-logger.ts` - Create new file
**Quality Gate:** All security events logged
**Risk Level:** Low  
**Mitigation:** Structured logging format

---

**TASK-308:** Security testing and validation  
**Timebox:** 30 minutes  
**Dependencies:** TASK-301, TASK-302, TASK-303, TASK-306  
**Priority:** Critical  
**Acceptance Criteria:**
- ✅ Authentication flow testing
- ✅ Authorization bypass testing
- ✅ Input validation testing
- ✅ SQL injection testing
**File Locations:**
- `tests/security/auth.test.ts` - Create security test suite
- `tests/security/injection.test.ts` - Create injection tests
**Quality Gate:** All security tests pass
**Risk Level:** High (Security)  
**Mitigation:** Comprehensive test coverage

---

## Phase 4: Context Survival System (Days 6-10)

### Day 6-8: Checkpoint System Implementation

**TASK-401:** Create checkpoint storage structure  
**Timebox:** 25 minutes  
**Dependencies:** None  
**Priority:** High  
**Acceptance Criteria:**
- ✅ .flightline/checkpoints/ directory structure
- ✅ chk_ prefixed checkpoint IDs
- ✅ Manifest.json format definition
**File Locations:**
- `.flightline/checkpoints/` - Create directory structure
- `packages/events/src/types/checkpoints.ts` - Add types
**Quality Gate:** Checkpoint directories created correctly
**Risk Level:** Low  
**Mitigation:** Simple file structure

---

**TASK-402:** Implement system state capture  
**Timebox:** 30 minutes  
**Dependencies:** TASK-401, TASK-201, TASK-202  
**Priority:** High  
**Acceptance Criteria:**
- ✅ Agent states serialization
- ✅ Task queue state capture
- ✅ Mission progress snapshot
**File Locations:**
- `server/api/src/checkpoints/capture.ts` - Create new file
**Quality Gate:** All system states captured
**Risk Level:** Medium  
**Mitigation:** Capture essential states first

---

**TASK-403:** Add checkpoint CLI commands  
**Timebox:** 25 minutes  
**Dependencies:** TASK-401, TASK-402  
**Priority:** High  
**Acceptance Criteria:**
- ✅ `fleet checkpoint create [name]` command
- ✅ `fleet checkpoint list` command
- ✅ `fleet checkpoint restore <id>` command
- ✅ `fleet resume <id>` command
**File Locations:**
- `cli/src/commands/checkpoints.ts` - Enhance existing file
- `cli/index.ts:330-354` - Add to command tree
**Quality Gate:** All checkpoint commands work
**Risk Level:** Low  
**Mitigation:** Use existing CLI patterns

---

**TASK-404:** Implement checkpoint restoration  
**Timebox:** 30 minutes  
**Dependencies:** TASK-401, TASK-402, TASK-403  
**Priority:** High  
**Acceptance Criteria:**
- ✅ System state restoration from checkpoint
- ✅ Agent state recovery
- ✅ Task queue reconstruction
- ✅ Mission progress restoration
**File Locations:**
- `server/api/src/checkpoints/restore.ts` - Create new file
**Quality Gate:** System restores to exact checkpoint state
**Risk Level:** Medium  
**Mitigation:** Validate integrity before restoration

---

### Day 9-10: Checkpoint System Testing & Polish

**TASK-405:** Add checkpoint validation and integrity checks  
**Timebox:** 25 minutes  
**Dependencies:** TASK-402, TASK-404  
**Priority:** High  
**Acceptance Criteria:**
- ✅ Checkpoint manifest validation
- ✅ State file integrity checking
- ✅ Corruption detection and handling
**File Locations:**
- `server/api/src/checkpoints/validator.ts` - Create new file
**Quality Gate:** Invalid checkpoints detected
**Risk Level:** Medium  
**Mitigation:** Conservative validation approach

---

**TASK-406:** Create checkpoint system tests  
**Timebox:** 30 minutes  
**Dependencies:** TASK-401, TASK-403, TASK-404  
**Priority:** High  
**Acceptance Criteria:**
- ✅ Test checkpoint creation workflow
- ✅ Test checkpoint restoration
- ✅ Test checkpoint integrity validation
**File Locations:**
- `tests/integration/checkpoints/complete.test.ts` - Create new test file
**Quality Gate:** All checkpoint tests pass
**Risk Level:** Low  
**Mitigation:** Test simple scenarios first

---

**TASK-407:** Optimize checkpoint performance  
**Timebox:** 25 minutes  
**Dependencies:** TASK-402, TASK-404  
**Priority:** Medium  
**Acceptance Criteria:**
- ✅ <500ms checkpoint creation time
- ✅ <2s checkpoint restoration time
- ✅ Incremental checkpoint support
**File Locations:**
- `server/api/src/checkpoints/performance.ts` - Optimize existing files
**Quality Gate:** Performance targets met
**Risk Level:** Medium  
**Mitigation:** Focus on critical path optimization

---

**TASK-408:** Add checkpoint compression and storage optimization  
**Timebox:** 20 minutes  
**Dependencies:** TASK-402, TASK-407  
**Priority:** Low  
**Acceptance Criteria:**
- ✅ Checkpoint data compression
- ✅ Storage space optimization
- ✅ Cleanup of old checkpoints
**File Locations:**
- `server/api/src/checkpoints/storage.ts` - Create new file
**Quality Gate:** Checkpoint size optimized
**Risk Level:** Low  
**Mitigation:** Optional compression feature

---

## Phase 5: Integration & Production Readiness (Days 12-14)

### Day 12: Advanced Features & Enhancement

**TASK-501:** Advanced coordination features  
**Timebox:** 30 minutes  
**Dependencies:** TASK-201, TASK-206, TASK-208  
**Priority:** Medium  
**Acceptance Criteria:**
- ✅ Agent specialization optimization
- ✅ Dynamic task assignment
- ✅ Load balancing across agents
**File Locations:**
- `server/api/src/coordination/advanced.ts` - Create new file
**Quality Gate:** Advanced features work correctly
**Risk Level:** Medium  
**Mitigation:** Add as enhancements after core works

---

**TASK-502:** Performance optimization across system  
**Timebox:** 30 minutes  
**Dependencies:** TASK-110, TASK-212, TASK-407  
**Priority:** High  
**Acceptance Criteria:**
- ✅ API response <100ms p95
- ✅ Concurrent 10+ agents support
- ✅ 50+ missions/hour throughput
**File Locations:**
- Multiple files - Performance optimizations
**Quality Gate:** All performance targets met
**Risk Level:** Medium  
**Mitigation:** Profile and optimize bottlenecks

---

**TASK-503:** Add comprehensive error handling  
**Timebox:** 25 minutes  
**Dependencies:** All previous tasks  
**Priority:** High  
**Acceptance Criteria:**
- ✅ Graceful error degradation
- ✅ User-friendly error messages
- ✅ Error recovery mechanisms
**File Locations:**
- `server/api/src/middleware/error-handler.ts` - Enhance existing
**Quality Gate:** System handles errors gracefully
**Risk Level:** Low  
**Mitigation:** Add error handling systematically

---

### Day 13: Testing & Validation

**TASK-504:** End-to-end workflow testing  
**Timebox:** 30 minutes  
**Dependencies:** All core features complete  
**Priority:** Critical  
**Acceptance Criteria:**
- ✅ Complete agent coordination workflow
- ✅ Service lifecycle management
- ✅ Checkpoint/resume cycle
**File Locations:**
- `tests/e2e/complete-workflow.test.ts` - Create comprehensive test
**Quality Gate:** All end-to-end tests pass
**Risk Level:** Low  
**Mitigation:** Test most common workflows first

---

**TASK-505:** Security testing validation  
**Timebox:** 30 minutes  
**Dependencies:** All security tasks complete  
**Priority:** Critical  
**Acceptance Criteria:**
- ✅ Penetration testing scenarios
- ✅ Vulnerability scanning
- ✅ Security audit completion
**File Locations:**
- `tests/security/comprehensive.test.ts` - Create security suite
**Quality Gate:** Zero critical vulnerabilities
**Risk Level:** High (Security)  
**Mitigation:** Focus on critical security issues

---

**TASK-506:** Performance benchmarking  
**Timebox:** 25 minutes  
**Dependencies:** TASK-502, TASK-504  
**Priority:** High  
**Acceptance Criteria:**
- ✅ Load testing with concurrent users
- ✅ Stress testing limits
- ✅ Performance regression detection
**File Locations:**
- `tests/performance/benchmarks.test.ts` - Create benchmark suite
**Quality Gate:** Performance targets maintained under load
**Risk Level:** Medium  
**Mitigation:** Establish performance baselines

---

### Day 14: Production Readiness

**TASK-507:** Documentation updates  
**Timebox:** 30 minutes  
**Dependencies:** All features complete  
**Priority:** High  
**Acceptance Criteria:**
- ✅ Updated CLI help documentation
- ✅ API documentation updates
- ✅ Deployment guide
- ✅ Security configuration guide
**File Locations:**
- `docs/` - Update various documentation files
- `README.md` - Update with new features
**Quality Gate:** Documentation is complete and accurate
**Risk Level:** Low  
**Mitigation:** Document as features are implemented

---

**TASK-508:** Deployment preparation  
**Timebox:** 25 minutes  
**Dependencies:** TASK-507  
**Priority:** High  
**Acceptance Criteria:**
- ✅ Production configuration templates
- ✅ Environment setup scripts
- ✅ Health check endpoints
- ✅ Monitoring integration
**File Locations:**
- `deploy/` - Create deployment configuration
- `server/api/src/health.ts` - Create comprehensive health checks
**Quality Gate:** System is deployment-ready
**Risk Level:** Medium  
**Mitigation:** Use standard deployment patterns

---

**TASK-509:** Final integration testing  
**Timebox:** 30 minutes  
**Dependencies:** All previous tasks  
**Priority:** Critical  
**Acceptance Criteria:**
- ✅ All systems integration validated
- ✅ Cross-component communication tested
- ✅ Production readiness checklist complete
**File Locations:**
- `tests/integration/final-validation.test.ts` - Create final test suite
**Quality Gate:** All integration tests pass
**Risk Level:** Low  
**Mitigation:** Comprehensive test coverage

---

**TASK-510:** Go/No-Go production decision  
**Timebox:** 15 minutes  
**Dependencies:** TASK-509  
**Priority:** Critical  
**Acceptance Criteria:**
- ✅ All critical tasks completed
- ✅ Quality gates passed
- ✅ Performance targets met
- ✅ Security requirements satisfied
**File Locations:**
- `docs/production-readiness.md` - Create readiness report
**Quality Gate:** Production deployment approved
**Risk Level:** High (Decision Point)  
**Mitigation:** Clear go/no-go criteria

---

## Risk Assessment & Mitigation Strategies

### High-Risk Areas

1. **Podman Integration Complexity**
   - **Risk:** Platform-specific issues, container lifecycle management
   - **Mitigation:** Early testing on multiple platforms, manual fallback options
   - **Owner:** Tasks 101-108
   - **Timeline:** Days 1-4

2. **Security Implementation**
   - **Risk:** Authentication bypass, input validation gaps
   - **Mitigation:** Security-first approach, comprehensive testing, third-party security audit
   - **Owner:** Tasks 301-308, 505
   - **Timeline:** Days 9-12

3. **Agent Coordination Race Conditions**
   - **Risk:** Concurrent agent access conflicts, state consistency
   - **Mitigation:** Start with sequential operations, add parallel with proper locking
   - **Owner:** Tasks 201-214
   - **Timeline:** Days 3-8

### Medium-Risk Areas

1. **Performance Targets**
   - **Risk:** System may not meet <100ms API response or <5s agent spawn
   - **Mitigation:** Early benchmarking, optimization focus, fallback to relaxed targets
   - **Owner:** Tasks 110, 212, 502, 506
   - **Timeline:** Throughout implementation

2. **Checkpoint System Complexity**
   - **Risk:** State serialization/deserialization issues, data corruption
   - **Mitigation:** Conservative implementation, comprehensive validation
   - **Owner:** Tasks 401-408
   - **Timeline:** Days 6-10

### Quality Gates & Success Criteria

#### Daily Quality Gates
- [ ] All tasks for the day completed
- [ ] Code compiles without errors
- [ ] Tests pass for completed features
- [ ] No critical security vulnerabilities
- [ ] Performance within acceptable ranges

#### Phase Quality Gates
- [ ] All critical tasks in phase completed
- [ ] Integration tests for phase pass
- [ ] Security review for phase passed
- [ ] Documentation updated for phase
- [ ] Stakeholder sign-off received

#### Final Quality Gates
- [ ] All user stories implemented
- [ ] All acceptance criteria met
- [ ] 90%+ test coverage achieved
- [ ] Performance targets achieved
- [ ] Security requirements satisfied
- [ ] Production readiness checklist complete

---

## Timeline Summary

### Week 1 (Days 1-7)
- **Days 1-4:** Service Management Foundation (Tasks 101-112)
- **Days 3-8:** Agent Coordination Core (Tasks 201-214) - Overlaps
- **Days 6-8:** Checkpoint Foundation (Tasks 401-404) - Starts

### Week 2 (Days 8-14)
- **Days 8-10:** Checkpoint Completion (Tasks 405-408)
- **Days 9-12:** Security Hardening (Tasks 301-308)
- **Days 12-14:** Integration & Production Readiness (Tasks 501-510)

### Parallel Development Tracks
1. **Service Management** - Days 1-4 (Critical Path)
2. **Agent Coordination** - Days 3-8 (Critical Path)
3. **Security Hardening** - Days 9-12 (Critical Path)
4. **Checkpoint System** - Days 6-10 (Parallel)
5. **Integration & Testing** - Days 12-14 (Critical Path)

### Dependencies Overview
```
Phase 1 (Service Mgmt) → Phase 2 (Agent Coord) → Phase 3 (Security) → Phase 5 (Integration)
                                   ↓
Phase 4 (Checkpoints) ↗
```

---

## Success Metrics Validation

### Functional Metrics
- [ ] All CLI commands functional → Tasks 101-112, 205, 403
- [ ] Agent coordination working → Tasks 201-214
- [ ] Zero critical security vulnerabilities → Tasks 301-308, 505
- [ ] Checkpoint/resume operational → Tasks 401-408

### Performance Metrics
- [ ] Service startup <30s → Tasks 101-108
- [ ] Agent spawning <5s → Tasks 201-204, 212
- [ ] API response <100ms p95 → Tasks 502, 506
- [ ] Checkpoint operations <2s → Tasks 402, 404, 407

### Quality Metrics
- [ ] 90%+ test coverage → Tasks 109, 211, 406, 504, 505, 506, 509
- [ ] All critical paths tested → Tasks 504, 509
- [ ] Error handling comprehensive → Tasks 107, 213, 503
- [ ] Documentation complete → Tasks 112, 507

---

## Implementation Guidelines

### Development Principles
1. **Security First** - No hardcoded credentials, validate all inputs
2. **Test-Driven** - Write tests alongside implementation
3. **Performance-Aware** - Monitor and optimize continuously
4. **Incremental Delivery** - Deliver working features daily
5. **Documentation-Updated** - Keep docs current with code changes

### Code Standards
- Follow AGENTS.md patterns and conventions
- Use TypeScript strict mode
- Implement proper error handling
- Include comprehensive logging
- Maintain consistent naming conventions

### Integration Requirements
- Use existing FleetTools architecture
- Integrate with Squawk coordination system
- Follow PodmanPostgresProvider patterns
- Maintain CLI consistency
- Preserve database schemas

---

## Contingency Plans

### If Critical Path Blocked
1. **Service Management Delays** → Manual service startup as fallback
2. **Agent Coordination Issues** → Simplify to sequential operations
3. **Security Implementation Time** → Focus on critical vulnerabilities only
4. **Checkpoint System Complexity** → Basic state persistence only

### If Performance Targets Not Met
1. **Service Startup** → Extend 30s target to 60s
2. **Agent Spawning** → Reduce concurrent agent limit
3. **API Response** → Accept higher latency for complex operations
4. **Checkpoint Operations** → Use incremental checkpoints

### If Security Issues Found
1. **Authentication** → Delay production until resolved
2. **Input Validation** → Block affected endpoints
3. **Data Protection** → Implement additional safeguards
4. **Audit Requirements** → Add comprehensive logging

---

## Conclusion

This implementation plan provides a structured, risk-managed approach to delivering FleetTools immediate usability within the 2-week timeline. The 84 atomic tasks are designed for focused 15-30 minute work sessions with clear acceptance criteria and quality gates.

**Critical Success Factors:**
1. Daily completion of scheduled tasks
2. Early integration testing to catch issues
3. Focus on security from day one
4. Performance monitoring throughout implementation
5. Comprehensive documentation updates

**Expected Outcome:**
- Production-ready FleetTools with full agent coordination
- Secure, scalable service management
- Robust checkpoint/resume functionality
- Complete documentation and deployment guides
- 85%+ probability of successful delivery within timeline

This plan balances speed with quality, ensuring immediate usability while maintaining production readiness standards. The systematic approach with clear dependencies and quality gates minimizes risks while maximizing delivery confidence.