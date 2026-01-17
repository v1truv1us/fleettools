---
# Specification: FleetTools Full Parity with Swarmtools

**Version:** 1.0.0
**Date:** 2026-01-10
**Status:** Complete
**Confidence:** 0.90
---

## Overview

This specification defines the implementation required to complete FleetTools to full parity with swarmtools. Based on comprehensive research (see `docs/research/2026-01-10-fleettools-full-parity-research.md`), FleetTools is approximately 60% complete with critical blockers in agent spawning pipeline, checkpoint/resume database integration, missing task decomposition API exposure, and no learning system.

**Estimated Implementation Time:** 10-14 days (2-3 weeks)
**Target Code Coverage:** ≥80%

---

## User Stories

### US1: Agent Spawning Pipeline

**As a** FleetTools user wanting to execute development tasks with AI agents
**I want** to spawn agents (frontend, backend, testing, etc.) that can execute tasks and report progress
**So that** I can coordinate multiple agents working in parallel on a single mission

**Acceptance Criteria:**
- [ ] CLI `fleet spawn <type> <task>` successfully creates agent
- [ ] Agent process starts and connects to Squawk mailbox
- [ ] Agent reports progress via cursor/heartbeat APIs
- [ ] CLI `fleet agents status` shows running agents with their PIDs, uptime, and resource usage
- [ ] CLI `fleet agents terminate <id>` gracefully stops agent and cleans up resources
- [ ] Agent spawning respects timeout and retry configuration
- [ ] Failed spawns are retried up to configured max attempts with exponential backoff

**Priority:** Critical - Blocks all agent coordination workflows
**Estimated Effort:** 3-5 days

### US2: Checkpoint Creation & Retrieval

**As a** FleetTools user managing long-running missions
**I want** to create checkpoints during mission execution to save progress state
**So that** I can resume from a checkpoint if the mission context dies or compacts

**Acceptance Criteria:**
- [ ] CLI `fleet checkpoints list` shows all persisted checkpoints
- [ ] CLI `fleet checkpoints show <id>` displays full checkpoint details (sorties, locks, messages, recovery context)
- [ ] CLI `fleet checkpoints prune --older-than <duration>` deletes old checkpoints
- [ ] Checkpoints are persisted to database (or file system with database sync)
- [ ] Checkpoints include full recovery context (next steps, blockers, files modified, mission summary)
- [ ] Checkpoints can be created manually or automatically on progress milestones

**Priority:** Critical - Context recovery impossible without working checkpoints
**Estimated Effort:** 2-4 days

### US3: Mission Resume from Checkpoint

**As a** FleetTools user with a failed mission context
**I want** to resume a mission from its last checkpoint to continue work
**So that** I can recover from context death without losing progress

**Acceptance Criteria:**
- [ ] CLI `fleet resume` detects stale missions with checkpoints
- [ ] CLI `fleet resume --checkpoint <id>` resumes from specific checkpoint
- [ ] CLI `fleet resume --mission <id>` resumes from latest checkpoint
- [ ] Resume restores agent state, sorties, locks, and messages
- [ ] Recovery context is formatted for LLM with next steps and current blockers
- [ ] Checkpoint is marked as consumed after successful resume
- [ ] Dry-run mode shows what would be restored without applying changes

**Priority:** Critical - Cannot recover from context death
**Estimated Effort:** 2-4 days

### US4: Task Decomposition

**As a** FleetTools user planning complex missions
**I want** to automatically decompose missions into subtasks based on patterns
**So that** I can assign appropriate tasks to specialized agents

**Acceptance Criteria:**
- [ ] CLI or API `decompose` function breaks mission into assignable tasks
- [ ] Pattern-based decomposition matches frontend, backend, testing, documentation, security, performance mission types
- [ ] Tasks include estimated duration and agent type recommendations
- [ ] Task dependencies are correctly identified (e.g., testing depends on implementation)
- [ ] Generic fallback decomposition for missions without matching patterns
- [ ] Tasks can be assigned to agents based on type and availability

**Priority:** High - Enables automatic task assignment
**Estimated Effort:** 1-2 days

### US5: Learning System (Pattern-based)

**As a** FleetTools developer
**I want** FleetTools to learn from completed missions and improve future task decomposition
**So that** the system becomes more effective over time without manual pattern updates

**Acceptance Criteria:**
- [ ] Outcomes from completed missions/sorties are collected
- [ ] Patterns are extracted from successful task sequences
- [ ] New missions are matched against learned patterns for recommendations
- [ ] Pattern effectiveness is tracked and improved based on outcomes
- [ ] Learning metrics are visible (improvement rate, pattern usage frequency, success rate)
- [ ] Manual pattern review/editing is available
- [ ] Patterns have versioning with rollback support

**Priority:** Medium - Core swarmtools differentiator
**Estimated Effort:** 7-10 days (1-2 weeks)

### US6: Security & CORS Configuration

**As a** FleetTools developer
**I want** the system to be secure and production-ready
**So that** credentials are not hardcoded and access is properly controlled

**Acceptance Criteria:**
- [ ] No hardcoded credentials in podman-postgres.ts (use environment variables)
- [ ] CORS is configured from environment variables or restricted to specific origins
- [ ] API endpoints have input validation and sanitization
- [ ] Security audit passes (no vulnerabilities in credential handling or CORS configuration)
- [ ] Rate limiting is applied to public endpoints (optional, for production)
- [ ] Documentation includes security configuration guidelines

**Priority:** High - Production readiness requirement
**Estimated Effort:** 2-3 days

---

## Non-Functional Requirements

### Performance

**Requirements:**
- Agent spawning completes within 5 seconds (process creation)
- Task decomposition completes within 10 seconds for standard missions
- System can handle 50+ concurrent agent executions
- Checkpoint creation/retrieval completes within 1 second
- Database queries are optimized with proper indexes

**Measurement:**
- Benchmark tests for agent spawning latency (target: <5s p95)
- Load test for 50 concurrent agent executions
- Database query performance analysis with EXPLAIN

### Reliability

**Requirements:**
- Graceful degradation when Squawk database is unavailable
- Agent spawning retries with exponential backoff on failures (5s, 10s, 20s)
- Checkpoint data is consistent and validated before storage
- Failed operations are logged with sufficient context for debugging
- System handles edge cases (concurrent checkpoint creation, missing agents, invalid IDs)

**Measurement:**
- Error logging quality audit
- Chaos testing for graceful degradation
- Edge case test coverage

### Maintainability

**Requirements:**
- Code follows FleetTools patterns (Bun.serve, .js imports, ISO 8601 timestamps)
- Comprehensive JSDoc comments for public APIs
- Clear separation of concerns (agent spawning, checkpoints, resume, decomposition, learning)
- Error messages are actionable and consistent
- Database schema is normalized with proper relationships and indexes

**Measurement:**
- Code review checklist verification
- Lint rules adherence (ESLint or TypeScript strict)
- Documentation completeness verification

### Scalability

**Requirements:**
- Agent lifecycle management scales to 100+ concurrent agents
- Checkpoint storage scales with 10,000+ checkpoints
- Task decomposition handles complex missions with 50+ subtasks
- Learning system scales with 1000+ learned patterns

**Measurement:**
- Performance tests with increasing concurrent load
- Storage scalability tests (large checkpoint datasets, large pattern sets)
- Memory usage profiling under load

### Compatibility

**Requirements:**
- CLI commands work with existing database schema
- Plugins (Claude Code, OpenCode) work with new endpoints
- Existing Squawk APIs (mailbox, cursor, locks) continue to work
- New features are backward compatible with existing workflows

**Measurement:**
- Backward compatibility tests
- Plugin integration tests
- Squawk API regression tests

---

## Security Requirements

### Authentication & Authorization
- Database credentials from environment variables (DB_PASSWORD, DB_HOST, DB_USER)
- API authentication optional but configurable (JWT tokens for production)

### Input Validation
- All API endpoints validate and sanitize inputs
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)

### CORS Configuration
- CORS origins from environment variable (CORS_ALLOWED_ORIGINS)
- Fallback to specific whitelist if not configured
- Proper headers for preflight requests

### Rate Limiting
- Token bucket or sliding window rate limiting
- Configurable limits per endpoint type
- Public endpoints: 100 requests/minute default

### Security Logging
- No sensitive data in logs (passwords, tokens, PII)
- Error messages don't leak internal implementation details
- Failed authentication attempts logged with metadata (no passwords)

---

## Technical Architecture

### Agent Spawning

**Components:**

1. **Agent Runner** (`src/agent-runner.js`)
   - Entry point for agent process execution
   - Parses CLI arguments (--agent-id, --agent-type, --mailbox-id, --task, --timeout)
   - Initializes Squawk mailbox connection
   - Executes task with timeout handling
   - Reports progress via cursor/heartbeat
   - Handles graceful shutdown on SIGTERM

2. **API Routes** (registered in `server/api/src/index.ts`)
   - `POST /api/v1/agents/spawn` - Creates new agent
   - `GET /api/v1/agents` - Lists all active/running agents
   - `GET /api/v1/agents/:id` - Gets specific agent details
   - `DELETE /api/v1/agents/:id` - Terminates agent gracefully

3. **Integration:** AgentSpawner class from `server/api/src/coordination/agent-spawner.ts` wired to these routes

### Checkpoint System

**Database Schema:**

```sql
CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  mission_title TEXT,
  timestamp TEXT NOT NULL,
  trigger TEXT NOT NULL, -- 'manual', 'progress', 'error', 'compaction'
  trigger_details TEXT,
  progress_percent INTEGER NOT NULL CHECK (progress_percent >= 0 AND progress_percent <= 100),
  sorties TEXT, -- JSON array of sortie snapshots
  active_locks TEXT, -- JSON array of lock snapshots
  pending_messages TEXT, -- JSON array of message snapshots
  recovery_context TEXT, -- JSON object
  created_by TEXT NOT NULL,
  expires_at TEXT,
  consumed_at TEXT,
  version TEXT NOT NULL,
  metadata TEXT
);

CREATE INDEX idx_checkpoints_mission ON checkpoints(mission_id, timestamp);
CREATE INDEX idx_checkpoints_timestamp ON checkpoints(timestamp DESC);
```

**CLI Integration:** CheckpointStorage class from `squawk/src/db/checkpoint-storage.ts` integrated with database adapter

**Storage Layer:** Database adapter in `squawk/src/db/index.ts` extended with checkpoint operations

### Task Decomposition

**API Route:** `POST /api/v1/tasks/decompose`

**Integration:** TaskDecomposer class from `server/api/src/coordination/task-decomposer.ts` wired to this route

**Enhancements:**
- Complexity analysis and time estimation
- Task dependency graph visualization
- Agent availability checking for assignment

### Learning System

**Database Schema:**

```sql
-- Learned patterns from successful missions
CREATE TABLE IF NOT EXISTS learned_patterns (
  id TEXT PRIMARY KEY,
  pattern_hash TEXT UNIQUE NOT NULL,
  pattern_type TEXT NOT NULL,
  mission_type TEXT NOT NULL,
  pattern_template TEXT NOT NULL,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_duration_minutes REAL,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  effectiveness_score REAL CHECK (effectiveness_score >= 0 AND effectiveness_score <= 1),
  version INTEGER DEFAULT 1,
  metadata TEXT
);

-- Outcomes for pattern effectiveness tracking
CREATE TABLE IF NOT EXISTS pattern_outcomes (
  id TEXT PRIMARY KEY,
  pattern_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  sortie_id TEXT,
  outcome TEXT NOT NULL, -- 'success', 'partial_failure', 'failure'
  duration_minutes INTEGER,
  deviations_detected TEXT, -- JSON array
  lessons_learned TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (pattern_id) REFERENCES learned_patterns(id) ON DELETE CASCADE
);

CREATE INDEX idx_patterns_type ON learned_patterns(pattern_type, mission_type);
CREATE INDEX idx_patterns_effectiveness ON learned_patterns(effectiveness_score DESC);
CREATE INDEX idx_patterns_hash ON learned_patterns(pattern_hash);
CREATE INDEX idx_outcomes_pattern ON pattern_outcomes(pattern_id, mission_id);
```

**Components:**

1. **PatternExtractor** - Analyzes completed missions to extract reusable patterns
2. **PatternMatcher** - Matches new missions against learned patterns using similarity scoring
3. **PatternLearner** - Updates pattern effectiveness based on outcomes
4. **PatternStorage** - Manages CRUD operations for learned patterns
5. **OutcomeCollector** - Collects task/mission outcomes for learning

**API Endpoints:**
- `GET /api/v1/patterns` - List learned patterns with filters
- `POST /api/v1/patterns` - Create/update pattern
- `GET /api/v1/patterns/:id` - Get pattern details with outcomes
- `DELETE /api/v1/patterns/:id` - Delete pattern
- `POST /api/v1/patterns/:id/approve` - Approve pattern for use
- `POST /api/v1/patterns/:id/reject` - Reject pattern
- `GET /api/v1/learning/metrics` - Get learning effectiveness metrics

### Security & CORS

**Configuration:**
- `CORS_ALLOWED_ORIGINS` environment variable (comma-separated whitelist)
- `CORS_ENABLED` environment variable (true/false)
- `RATE_LIMIT_ENABLED` environment variable (true/false)
- `RATE_LIMIT_REQUESTS_PER_MINUTE` (default: 100)

**Middleware:**
- Input validation middleware (request body sanitization)
- CORS middleware with configurable origins
- Rate limiting middleware (token bucket algorithm)
- Security headers (CSP, X-Content-Type-Options)

---

## Implementation Phases

### Phase 1: Agent Spawning Implementation (5-7 days)

**1.1 Create agent-runner.js** (1-2 days)
- Implement CLI argument parsing
- Add Squawk mailbox initialization
- Implement task execution with timeout
- Add progress reporting via cursor/heartbeat
- Add graceful shutdown handling

**1.2 Register API routes** (1-2 hours)
- Create `registerAgentRoutes()` function in `server/api/src/index.ts`
- Register POST `/api/v1/agents/spawn`
- Register GET `/api/v1/agents`
- Register GET `/api/v1/agents/:id`
- Register DELETE `/api/v1/agents/:id`

**1.3 Wire agent-spawner to routes** (2-3 hours)
- Import `AgentSpawner` class
- Create handler functions for each endpoint
- Wire endpoints to spawner methods (spawn, getStatus, terminate)
- Add error handling and CORS headers

**1.4 Integration testing** (1-2 days)
- Test agent lifecycle: spawn → monitor → terminate
- Test concurrent agent spawning
- Test timeout and retry logic
- Test progress reporting via mailbox/cursor

**Acceptance:** All US1 acceptance criteria met

### Phase 2: Checkpoint/Resume Integration (3-4 days)

**2.1 Add checkpoints table to schema** (2-3 hours)
- Create `squawk/src/db/schema/checkpoints.sql` or add to existing schema
- Add indexes for mission_id and timestamp
- Create migration script if needed

**2.2 Implement database operations** (2-3 hours)
- Add `checkpoints` operations to `squawk/src/db/index.ts`
- Implement CRUD operations (create, getById, list, delete, markConsumed)
- Extend CheckpointStorage to use database operations

**2.3 Wire CLI to database** (2-3 hours)
- Replace `generateMockCheckpoints()` with checkpoint database query
- Replace `generateMockCheckpointDetails()` with database query
- Update `cli/src/commands/checkpoints.ts` and `cli/src/commands/resume.ts`

**2.4 Testing and validation** (1-2 days)
- Test checkpoint creation with various triggers (manual, progress, error)
- Test checkpoint retrieval and listing
- Test resume from checkpoint
- Test checkpoint pruning by age
- Validate checkpoint data integrity

**Acceptance:** US2 and US3 acceptance criteria met

### Phase 3: Task Decomposition API (1-2 days)

**3.1 Register API route** (1 hour)
- Create `registerTaskDecompositionRoutes()` function
- Register POST `/api/v1/tasks/decompose`
- Add query parameter support for filtering

**3.2 Add complexity analysis** (2-3 hours)
- Extend TaskDecomposer with complexity scoring
- Add time estimation based on task complexity
- Add dependency graph generation

**3.3 Testing** (2-3 hours)
- Test decomposition for various mission types
- Test pattern matching and fallback logic
- Test task dependency resolution
- Validate agent type assignments

**Acceptance:** US4 acceptance criteria met

### Phase 4: Security & Quality Gates (2-3 days)

**4.1 Remove hardcoded credentials** (2-4 hours)
- Update `cli/src/commands/services.ts` (or podman-postgres.ts)
- Use environment variables for all credentials
- Add documentation for environment variables

**4.2 Configure CORS** (1-2 hours)
- Add `CORS_ALLOWED_ORIGINS` environment variable support
- Update CORS middleware in `server/api/src/index.ts`
- Add default whitelist for development mode

**4.3 Add input validation** (2-3 hours)
- Create validation middleware
- Add request body sanitization
- Add parameter validation schemas

**4.4 Security audit** (2-4 hours)
- Review all endpoints for vulnerabilities
- Test credential handling
- Test CORS configuration
- Document security best practices

**Acceptance:** US6 acceptance criteria met

### Phase 5: Learning System Design & Implementation (7-10 days)

**5.1 Design learning algorithms** (3-5 days)
- Define pattern representation (what makes a "pattern"?)
- Design pattern extraction algorithm (sequence mining, NLP, or rule-based)
- Design pattern similarity scoring (cosine similarity, Jaccard index, embedding-based)
- Design outcome collection mechanism

**5.2 Implement pattern extraction** (2-3 days)
- Create `PatternExtractor` class
- Extract patterns from completed missions/sorties
- Store patterns in learned_patterns table

**5.3 Implement pattern matching** (2-3 days)
- Create `PatternMatcher` class
- Match new missions against learned patterns
- Return recommendations with confidence scores

**5.4 Implement pattern learning** (2-3 days)
- Create `PatternLearner` class
- Update pattern effectiveness based on outcomes
- Increment success/failure counts
- Calculate new effectiveness scores

**5.5 Implement outcome collection** (1-2 days)
- Create `OutcomeCollector` class
- Track mission/sortie completion
- Store outcomes in pattern_outcomes table

**5.6 API endpoints and testing** (2-3 days)
- Register learning API routes
- Test pattern lifecycle (create, match, update, approve, reject)
- Test learning metrics calculation

**Acceptance:** US5 acceptance criteria met

### Phase 6: Testing & Documentation (2-3 days)

**6.1 Unit tests** (2-3 days)
- Unit tests for agent-runner
- Unit tests for checkpoint database operations
- Unit tests for task decomposition
- Unit tests for learning system components
- Target: ≥80% code coverage

**6.2 Integration tests** (2-3 days)
- End-to-end agent spawning workflow
- Checkpoint creation and resume workflow
- Task decomposition API integration
- Learning system workflow

**6.3 End-to-end tests** (2-3 days)
- Full mission lifecycle with agents
- Context death and recovery scenario
- Learning effectiveness over multiple missions
- Performance benchmarks under load

**6.4 Documentation** (1 day)
- Update AGENTS.md with new patterns
- Add API documentation for all new endpoints
- Add usage examples and guides

**Acceptance:** Code coverage ≥80%, all tests passing

---

## Risk Mitigation

### High-Risk Items

- **Agent Runner Gap**: Use child_process.spawn for now; consider Bun.spawn in future for better performance
- **Learning Complexity**: Implement simplified pattern-based learning first before advanced techniques (reinforcement learning, embeddings)
- **Database Migration**: Provide migration script to transition from file-based to database-based checkpoints
- **Testing Time**: Prioritize critical path (agent spawning, checkpoints) tests before learning system

### Medium-Risk Items

- **Pattern Effectiveness**: Start with simple success/failure ratio; refine based on actual data
- **Task Assignment**: Use simple availability-based assignment initially; consider advanced scheduling later
- **Rate Limiting**: Implement basic rate limiting for production readiness; can be enhanced later

---

## Success Metrics

### Functional Completeness
- All 6 user stories implemented with 100% acceptance criteria met
- All critical blockers resolved (agent spawning, checkpoints, resume)
- Task decomposition exposed via API
- Learning system operational (pattern extraction, matching, learning)
- Security and CORS configured for production

### Code Coverage
- ≥80% for all new code
- Unit tests for all new modules
- Integration tests for all workflows
- End-to-end tests for critical paths

### Performance
- All quality gates passing
- Agent spawning latency <5s (p95)
- Task decomposition latency <10s (p95)
- Checkpoint operations <1s
- System handles 50+ concurrent agents

### Security
- No hardcoded credentials in codebase
- CORS properly configured
- Input validation on all public endpoints
- Security audit passed
- Sensitive data never logged

### Documentation
- AGENTS.md updated with new patterns
- API documentation complete
- Usage examples for all new features
- Security configuration guide added

---

**Specification Status:** Complete and ready for planning phase

**Next Phase:** Plan - Break down specification into implementation tasks with dependencies, estimates, and testing strategy
