# FleetTools Remaining Specifications Implementation Plan

**Version:** 1.0.0  
**Status:** Ready for Implementation  
**Date:** 2026-01-10  
**Duration:** 24 days (5 weeks)  
**Confidence:** 0.92  

---

## Executive Summary

FleetTools is a TypeScript/Bun monorepo with event-sourcing architecture designed to achieve SwarmTools feature parity. Phase 0 foundation is complete with core packages built and tested. Three major specification documents remain to be implemented:

1. **TDD Implementation Guide** (878 lines) - 10-day parallel development plan
2. **Shared Interfaces** (1826 lines) - Interface contracts for parallel development  
3. **Specification Alignment** (343 lines) - Gap analysis and task mapping

### Current State Analysis

**Phase 0 Foundation - COMPLETE ✅**
- Core packages: `packages/core`, `packages/db`, `packages/events` fully implemented
- Event sourcing architecture with Drizzle/libSQL
- TypeScript strict mode with ES2022 target
- Bun runtime optimization throughout
- 19 API endpoints operational in consolidated server
- Comprehensive test coverage for foundation components

**SwarmTools Feature Gap Analysis**
| Feature Category | SwarmTools | FleetTools Current | Gap |
|------------------|-------------|-------------------|------|
| Multi-Agent Coordination | LLM-based strategy selection | ❌ Not implemented | 100% |
| Parallel Execution | Worker spawning system | ❌ Not implemented | 100% |
| File Reservations | CTK lock system | ⚠️ Basic API exists | 60% |
| Persistent Tracking | Git-backed .hive/ | ⚠️ Flightline exists | 70% |
| Learning Systems | CASS learning engine | ❌ Not implemented | 100% |
| Event Sourcing | Complete | ✅ Phase 0 done | 20% |
| Agent Communication | Swarm mail | ⚠️ Basic mailbox API | 40% |
| CLI Integration | 40+ tools | ⚠️ Basic commands | 30% |

---

## Implementation Roadmap

### Phase 1: CLI Service Management (P0)
**Duration:** 3 days | **Effort:** 7 tasks | **Dependencies:** Phase 0

#### User Stories

**US-PH1-001: Service Lifecycle Management**
As a FleetTools developer, I want to start and stop services via CLI so that I can manage the development environment efficiently.

**Acceptance Criteria:**
- [ ] `fleet services up` starts Postgres container with correct configuration
- [ ] `fleet services down` stops container gracefully preserving data
- [ ] Commands provide clear success/error messages
- [ ] Container uses `fleettools-pg` name and persistent volume
- [ ] Startup waits for Postgres readiness before returning

**US-PH1-002: Service Observability**
As a FleetTools developer, I want to check service status and view logs so that I can troubleshoot issues.

**Acceptance Criteria:**
- [ ] `fleet services status` shows running/stopped state with visual indicators
- [ ] `fleet services logs` displays container logs with timestamps
- [ ] Logs command supports `--tail <n>` parameter
- [ ] Status shows container details (image, port, version) when running
- [ ] Commands handle missing Podman gracefully with installation instructions

**US-PH1-003: Provider Integration**
As a FleetTools developer, I want proper provider wiring so that CLI commands integrate with container management.

**Acceptance Criteria:**
- [ ] PodmanPostgresProvider imported and instantiated correctly
- [ ] All service commands use provider methods, not direct calls
- [ ] Provider configuration loaded from config file
- [ ] Error handling covers provider unavailability
- [ ] Async/await pattern used throughout command handlers

#### Technical Requirements

**TR-PH1-001: Import Resolution**
- Fix missing `path` import in `providers/podman-postgres.ts`
- Add proper import statement with `node:` prefix
- Verify TypeScript compilation succeeds

**TR-PH1-002: Provider Integration**
- Import PodmanPostgresProvider into CLI module
- Wire provider to service command functions
- Update command signatures to async/await
- Implement proper error propagation

**TR-PH1-003: Command Implementation**
- `servicesUp()`: Call provider.start(), handle timeout, wait for readiness
- `servicesDown()`: Call provider.stop(), preserve data volume
- `servicesLogs()`: Call provider.logs(), support tail parameter
- `servicesStatus()`: Call provider.status(), display detailed information

**TR-PH1-004: Error Handling**
- Podman availability check with helpful error messages
- Container lifecycle error handling
- Graceful degradation for platform-specific issues
- Consistent error message formatting

#### Success Criteria
- [ ] All service commands functional from CLI
- [ ] Podman integration working across platforms (macOS, Linux, Windows)
- [ ] Zero TypeScript errors
- [ ] Provider pattern properly implemented
- [ ] Error messages actionable and clear

---

### Phase 2: SQLite Event-Sourced Persistence (P0)
**Duration:** 6 days | **Effort:** 17 tasks | **Dependencies:** Phase 1

#### User Stories

**US-PH2-001: Complete Event Sourcing**
As a FleetTools system, I need a complete SQLite-backed event store so that all state changes are persisted and replayable.

**Acceptance Criteria:**
- [ ] Events stored with append-only semantics (no updates/deletes)
- [ ] Monotonic sequence numbers generated automatically
- [ ] Causation and correlation chains maintained
- [ ] Event types validated with Zod schemas
- [ ] Stream-based querying supported
- [ ] Event replay functionality for projections

**US-PH2-002: Mission and Sortie Management**
As a FleetTools coordinator, I need CRUD operations for missions and sorties so that I can track work items in SQLite.

**Acceptance Criteria:**
- [ ] Create, read, update, delete operations for missions
- [ ] Create, read, update, delete operations for sorties
- [ ] Mission status transitions enforced (pending→in_progress→completed)
- [ ] Sortie assignments and progress tracking
- [ ] Relationship management between missions and sorties
- [ ] Query operations with filtering and pagination

**US-PH2-003: Advanced Lock Management**
As a FleetTools specialist, I need robust file locking so that I can prevent conflicts when working on shared files.

**Acceptance Criteria:**
- [ ] Lock acquisition with timeout and conflict detection
- [ ] Lock release with ownership verification
- [ ] Automatic lock expiration handling
- [ ] Lock re-acquisition for recovery scenarios
- [ ] Batch lock operations for multiple files
- [ ] Lock history and audit trail

**US-PH2-004: Checkpoint Storage**
As a FleetTools system, I need checkpoint persistence so that context can survive process restarts.

**Acceptance Criteria:**
- [ ] Checkpoint creation with full state snapshot
- [ ] Checkpoint retrieval by mission and timestamp
- [ ] Checkpoint pruning based on age and count
- [ ] Checkpoint versioning for migrations
- [ ] Checkpoint metadata for recovery context
- [ ] Dual storage (SQLite + file) for redundancy

#### Technical Requirements

**TR-PH2-001: Database Schema Implementation**
- Complete SQLite schema with all tables (missions, sorties, locks, events, checkpoints, specialists, messages, cursors)
- Foreign key constraints and indexes for performance
- Migration scripts with rollback procedures
- WAL mode configuration for concurrent access
- Vacuum and compaction strategies

**TR-PH2-002: Event Store Operations**
```typescript
interface EventOps {
  append(input: AppendEventInput): Promise<Event>;
  appendBatch(inputs: AppendEventInput[]): Promise<Event[]>;
  getByStream(streamType: StreamType, streamId: string, afterSequence?: number): Promise<Event[]>;
  getByType(eventType: string, options?: EventQueryOptions): Promise<Event[]>;
  getByCausation(causationId: string): Promise<Event[]>;
  getLatestSequence(): Promise<number>;
  getAfterSequence(sequence: number, limit?: number): Promise<Event[]>;
}
```

**TR-PH2-003: Projection System**
- Materialized views for missions, sorties, specialists
- Event-driven projection updates
- Projection replay and rebuilding
- Performance optimization with incremental updates
- Projection consistency validation

**TR-PH2-004: API Endpoint Expansion**
- 21 new API endpoints for complete CRUD operations
- Mission endpoints: POST/GET/PATCH/DELETE /api/v1/missions
- Sortie endpoints: POST/GET/PATCH/DELETE /api/v1/sorties
- Event endpoints: POST/GET /api/v1/events, /api/v1/events/stream
- Checkpoint endpoints: POST/GET/DELETE /api/v1/checkpoints

**TR-PH2-005: Performance Optimization**
- Query optimization with proper indexes
- Batch operations for bulk inserts/updates
- Connection pooling for concurrent access
- Prepared statements for repeated queries
- Memory-efficient event streaming

#### Testing Requirements
- Unit tests: 102 tests covering all operations
- Integration tests: All 21 new API endpoints
- Performance tests: Event append < 5ms, queries < 50ms
- Concurrency tests: Multiple agents accessing same data
- Recovery tests: Data integrity after crashes

#### Success Criteria
- [ ] All Phase 2 APIs return identical responses to current implementation
- [ ] Event append-only semantics enforced
- [ ] Causation chains correctly maintained
- [ ] Projections consistent with event log
- [ ] Lock conflicts detected and resolved correctly
- [ ] Checkpoints enable full context recovery

---

### Phase 3: Context Survival System (P1)
**Duration:** 5 days | **Effort:** 10 tasks | **Dependencies:** Phase 2

#### User Stories

**US-PH3-001: Automatic Progress Checkpointing**
As a FleetTools specialist, I want automatic checkpoints at progress milestones so that my work is preserved without manual intervention.

**Acceptance Criteria:**
- [ ] Automatic checkpoints created at 25%, 50%, 75% mission completion
- [ ] Progress calculation based on sortie completion percentage
- [ ] Checkpoint metadata includes progress state and context
- [ ] Multiple checkpoints per mission with latest tracking
- [ ] Minimal performance impact during checkpoint creation

**US-PH3-002: Error-Triggered Checkpointing**
As a FleetTools system, I want checkpointing on errors so that recovery state captures the failure context.

**Acceptance Criteria:**
- [ ] Checkpoints created automatically on uncaught exceptions
- [ ] Error context captured in checkpoint metadata
- [ ] Stack traces and error details preserved
- [ ] Failed operations marked in recovery context
- [ ] Error-triggered checkpoints prioritized for recovery

**US-PH3-003: Manual Checkpoint Control**
As a FleetTools developer, I want manual checkpoint commands so that I can control when state is preserved.

**Acceptance Criteria:**
- [ ] `fleet checkpoint create <mission-id>` creates manual checkpoint
- [ ] `fleet checkpoint list <mission-id>` shows all checkpoints
- [ ] `fleet checkpoint resume <checkpoint-id>` restores from checkpoint
- [ ] `fleet checkpoint delete <checkpoint-id>` removes old checkpoints
- [ ] Commands support both local and synced modes

**US-PH3-004: Context Recovery**
As a FleetTools specialist, I want seamless recovery from checkpoints so that I can resume work after interruptions.

**Acceptance Criteria:**
- [ ] Automatic detection of stale missions on startup
- [ ] Recovery options presented for incomplete missions
- [ ] Sortie states restored from checkpoint snapshots
- [ ] File locks re-acquired from checkpoint data
- [ ] Recovery context injected into LLM prompts
- [ ] Recovery workflow handles partial failures gracefully

#### Technical Requirements

**TR-PH3-001: Checkpoint Service**
```typescript
class CheckpointService {
  async createCheckpoint(input: CreateCheckpointInput): Promise<Checkpoint>
  async getLatest(missionId: string): Promise<Checkpoint | null>
  async checkProgress(missionId: string): Promise<void>
  async detectStaleMissions(): Promise<Mission[]>
}
```

**TR-PH3-002: Recovery Algorithm**
- Stale mission detection based on activity thresholds
- State restoration with conflict resolution
- Lock re-acquisition with timeout handling
- Context formatting for LLM injection
- Recovery validation and rollback on failure

**TR-PH3-003: Context Injection**
- LLM-friendly prompt formatting
- Specialist-specific context filtering
- Progress-aware context summarization
- Recovery action recommendations
- Next-step guidance from checkpoint data

**TR-PH3-004: Checkpoint Management**
- Automatic cleanup of old checkpoints
- Configurable retention policies
- Storage optimization with compression
- Checkpoint validation and corruption detection
- Pruning based on mission completion status

#### Success Criteria
- [ ] Automatic checkpoints at 25%, 50%, 75% progress
- [ ] Manual checkpoint commands working
- [ ] Recovery detects stale missions
- [ ] Context restored after process death
- [ ] Recovery context injected into prompts

---

### Phase 4: Task Decomposition System (P1)
**Duration:** 6 days | **Effort:** 12 tasks | **Dependencies:** Phase 2

#### User Stories

**US-PH4-001: Intelligent Task Decomposition**
As a FleetTools coordinator, I want LLM-powered task decomposition so that complex tasks can be broken into parallel subtasks.

**Acceptance Criteria:**
- [ ] Tasks decomposed into independent, executable sorties
- [ ] Multiple decomposition strategies available (file-based, feature-based, risk-based)
- [ ] Strategy auto-selection based on task characteristics
- [ ] Dependency identification and management between sorties
- [ ] Decomposition quality validation and refinement

**US-PH4-002: Strategy Selection**
As a FleetTools system, I want automatic strategy selection so that decomposition approach matches task type.

**Acceptance Criteria:**
- [ ] File-based strategy for code organization tasks
- [ ] Feature-based strategy for new feature development
- [ ] Risk-based strategy for complex refactoring
- [ ] Hybrid strategy combining multiple approaches
- [ ] Learning system integration for strategy improvement

**US-PH4-003: Decomposition Validation**
As a FleetTools coordinator, I want decomposition validation so that generated subtasks are executable and conflict-free.

**Acceptance Criteria:**
- [ ] Conflict detection between parallel sorties
- [ ] Dependency cycle identification and resolution
- [ ] Resource requirement validation
- [ ] Time estimation for decomposition quality
- [ ] Manual refinement capabilities

#### Technical Requirements

**TR-PH4-001: LLM Planner Module**
```typescript
class TaskDecomposer {
  async decompose(task: string, context: DecompositionContext): Promise<Decomposition>
  async selectStrategy(task: string, context: DecompositionContext): Promise<Strategy>
  async validateDecomposition(decomposition: Decomposition): Promise<ValidationResult>
}
```

**TR-PH4-002: Strategy Implementations**
- File-based: Analyze code structure, group related files
- Feature-based: Identify user-facing features, create feature sorties
- Risk-based: Assess change impact, prioritize high-risk areas
- Hybrid: Combine approaches based on task complexity

**TR-PH4-003: Learning Integration**
- Pattern recording from successful decompositions
- Strategy effectiveness tracking with success metrics
- Confidence decay for outdated patterns (90-day half-life)
- Anti-pattern detection and avoidance

**TR-PH4-004: Dependency Management**
- Sortie dependency graph construction
- Critical path identification
- Parallel execution planning
- Blocker detection and resolution
- Resource allocation optimization

#### Success Criteria
- [ ] Tasks decomposed into parallel subtasks
- [ ] Multiple strategies available and working
- [ ] Strategy selection automated
- [ ] Dependencies managed correctly
- [ ] Decomposition patterns recorded for learning

---

### Phase 5: Parallel Agent Spawning (P1)
**Duration:** 6 days | **Effort:** 12 tasks | **Dependencies:** Phase 2, 4

#### User Stories

**US-PH5-001: Parallel Specialist Execution**
As a FleetTools coordinator, I want multiple specialists working in parallel so that tasks complete faster through concurrent execution.

**Acceptance Criteria:**
- [ ] Independent sorties spawned simultaneously to different specialists
- [ ] Sequential sorties executed in dependency order
- [ ] Specialist lifecycle management (registration, heartbeat, completion)
- [ ] Progress tracking across all active specialists
- [ ] Load balancing based on specialist capabilities

**US-PH5-002: Conflict Prevention**
As a FleetTools specialist, I want automatic conflict prevention so that I never work on the same file as another specialist.

**Acceptance Criteria:**
- [ ] CTK file locks acquired before specialist work begins
- [ ] Lock timeout handling with retry logic
- [ ] Automatic lock release on specialist completion
- [ ] Conflict resolution with prioritization
- [ ] Deadlock detection and prevention

**US-PH5-003: Progress Coordination**
As a FleetTools coordinator, I want centralized progress tracking so that I can monitor overall mission progress.

**Acceptance Criteria:**
- [ ] Real-time progress updates from all specialists
- [ ] Blocker detection and escalation
- [ ] Automatic dependency resolution when sorties complete
- [ ] Progress aggregation for mission-level status
- [ ] Notification system for important events

#### Technical Requirements

**TR-PH5-001: Dispatch Coordinator**
```typescript
class DispatchCoordinator {
  async spawnSorties(mission: Mission, sorties: Sortie[]): Promise<Specialist[]>
  async monitorProgress(missionId: string): Promise<ProgressReport>
  async handleBlockers(sortieId: string, blocker: Blocker): Promise<void>
  async coordinateCompletion(specialistId: string, result: SortieResult): Promise<void>
}
```

**TR-PH5-002: Task Tool Integration**
- Specialist spawning via Task tool (like SwarmTools)
- Specialist capability matching
- Resource allocation and scheduling
- Performance monitoring and optimization

**TR-PH5-003: File Lock Integration**
- Automatic CTK lock acquisition for assigned files
- Lock conflict detection and resolution
- Batch lock operations for multi-file sorties
- Lock timeout management with automatic renewal

**TR-PH5-004: Specialist Management**
- Specialist registration and capability declaration
- Heartbeat monitoring for health tracking
- Specialist completion and cleanup
- Performance metrics collection

#### Success Criteria
- [ ] Multiple agents working in parallel
- [ ] File conflicts prevented via CTK
- [ ] Progress tracked across all workers
- [ ] Dependencies resolved correctly
- [ ] Specialist lifecycle managed properly

---

### Phase 6: Integration Testing (P2)
**Duration:** 4 days | **Effort:** 10 tasks | **Dependencies:** All previous phases

#### User Stories

**US-PH6-001: End-to-End Workflow Testing**
As a FleetTools developer, I want comprehensive integration tests so that the complete system works as designed.

**Acceptance Criteria:**
- [ ] Complete mission lifecycle tested end-to-end
- [ ] Multi-agent coordination workflows verified
- [ ] Context survival through restarts validated
- [ ] Task decomposition and parallel execution tested
- [ ] Error handling and recovery scenarios covered

**US-PH6-002: Performance Validation**
As a FleetTools system, I want performance benchmarking so that SwarmTools parity is achieved with acceptable performance.

**Acceptance Criteria:**
- [ ] Event append performance < 5ms p99
- [ ] Checkpoint creation < 100ms p95
- [ ] Recovery time < 500ms p95
- [ ] File lock acquisition < 10ms p95
- [ ] API response time < 50ms p95

#### Technical Requirements

**TR-PH6-001: Test Framework**
- End-to-end test scenarios for complete workflows
- Performance benchmark suite with automated comparison
- Chaos engineering tests for coordination failures
- Load testing for concurrent specialist execution
- Integration test environment setup and management

**TR-PH6-002: Test Scenarios**
- Mission creation through completion workflow
- Parallel specialist execution with dependencies
- Checkpoint and recovery cycles
- File conflict resolution scenarios
- Learning system pattern evolution
- Error handling and graceful degradation

**TR-PH6-003: Quality Gates**
- 95%+ test coverage (line, function, branch)
- All performance benchmarks met
- Zero data loss scenarios validated
- Security testing passed
- Documentation completeness verified

#### Success Criteria
- [ ] Complete workflows tested end-to-end
- [ ] All system integration points verified
- [ ] Performance benchmarks met
- [ ] Error recovery proven working
- [ ] 95%+ test coverage achieved

---

## Integration Architecture

### System Integration Points

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FleetTools Integration Architecture            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1 (CLI)                                               │
│  ┌─────────────────┐                                          │
│  │ Service Mgmt   │                                          │
│  │ Commands       │                                          │
│  └────────┬────────┘                                          │
│           │                                                 │
│  Phase 2 (SQLite) ──────────────────────────────────────────┐    │
│  ┌─────────────────┐                                      │    │
│  │ Event Store    │                                      │    │
│  │ Operations     │                                      │    │
│  └────────┬────────┘                                      │    │
│           │                                             │    │
│  Phase 3 (Context) ──────────────┐                       │    │
│  ┌─────────────────┐              │                       │    │
│  │ Checkpoint     │              │                       │    │
│  │ Service        │              │                       │    │
│  └────────┬────────┘              │                       │    │
│           │                       │                       │    │
│  Phase 4 (Decompose) ────────────┼───────────────────────┼────┤
│  ┌─────────────────┐              │                       │    │
│  │ Task           │              │                       │    │
│  │ Decomposer      │              │                       │    │
│  └────────┬────────┘              │                       │    │
│           │                       │                       │    │
│  Phase 5 (Spawning) ─────────────┼───────────────────────┼────┤
│  ┌─────────────────┐              │                       │    │
│  │ Dispatch        │              │                       │    │
│  │ Coordinator     │              │                       │    │
│  └────────┬────────┘              │                       │    │
│           │                       │                       │    │
│  Phase 6 (Testing) ──────────────┴───────────────────────┼────┤
│  ┌─────────────────┐                                      │    │
│  │ Integration    │                                      │    │
│  │ Tests          │                                      │    │
│  └─────────────────┘                                      │    │
│                                                          │    │
└──────────────────────────────────────────────────────────────────┴────┘
```

### Parallel Development Strategy

#### Days 1-2: Interface Foundation
- Define shared interfaces from specs/shared-interfaces.md
- Create mock implementations for Phase 3 development
- Set up contract testing framework
- Establish test infrastructure

#### Days 3-8: Parallel Implementation
- Phase 2: Build real SQLite implementations
- Phase 3: Build context survival using mocks
- Maintain daily sync on interface changes
- Run contract tests continuously

#### Days 9-10: Integration
- Swap mocks for real implementations
- Run full system integration tests
- Performance optimization
- Documentation updates

---

## Testing Strategy

### Test Pyramid Approach

```
                 ┌─────────────────┐
                 │   E2E Tests    │  (10 tests)
                 │  Workflows      │
                 └─────────────────┘
               ┌───────────────────────┐
               │  Integration Tests    │  (188 tests)
               │  Component Interactions│
               └───────────────────────┘
            ┌─────────────────────────────┐
            │    Unit Tests              │  (500+ tests)
            │  Individual Functions     │
            └─────────────────────────────┘
```

### Contract Testing Framework

#### Mock-to-Real Verification
```typescript
// Contract test ensures both implementations behave identically
describe('MissionOps Contract', () => {
  testMissionOpsContract(
    () => createSQLiteMissionOps(db),    // Real implementation
    () => mockMissionOps                 // Mock implementation
  );
});
```

#### Interface Compliance
- All interface methods implemented
- Return types match specification
- Error handling consistent
- Performance characteristics similar

### Performance Testing

#### Benchmarks
| Operation | Target | Measurement |
|-----------|---------|-------------|
| Event Append | < 5ms p99 | Throughput and latency |
| Checkpoint Create | < 100ms p95 | State capture time |
| Recovery | < 500ms p95 | Restore time |
| Lock Acquire | < 10ms p95 | Conflict detection |
| API Response | < 50ms p95 | Endpoint latency |

#### Load Testing
- Concurrent specialist execution (10+ agents)
- High-frequency event appending (1000+ events/sec)
- Large mission coordination (100+ sorties)
- Memory usage under sustained load

### Chaos Engineering

#### Failure Scenarios
- Process death during active mission
- Network partition between coordinator and specialists
- Database corruption during event append
- Lock server unavailability
- LLM service timeouts during decomposition

#### Recovery Validation
- Automatic checkpoint creation on failure
- State restoration after restart
- Specialist reconnection and recovery
- Partial failure handling

---

## Quality Gates

### Code Quality Standards

#### TypeScript Configuration
- Strict mode enabled throughout
- No `any` types in production code
- 100% interface coverage for public APIs
- Consistent naming conventions

#### Performance Requirements
- Event append: < 5ms p99
- Checkpoint creation: < 100ms p95
- Recovery: < 500ms p95
- File lock acquisition: < 10ms p95
- API response: < 50ms p95

#### Coverage Targets
- Line coverage: 95%+
- Function coverage: 95%+
- Branch coverage: 90%+
- Integration coverage: 100%

### Security Requirements

#### Data Protection
- Zero plaintext sensitive data storage
- Secure API key management
- Input validation on all endpoints
- SQL injection prevention

#### Access Control
- Proper authentication for protected endpoints
- Authorization checks for resource access
- Audit logging for sensitive operations
- Rate limiting for API endpoints

### Documentation Requirements

#### API Documentation
- OpenAPI/Swagger specification complete
- All endpoints documented with examples
- Error response formats specified
- Authentication requirements documented

#### Development Documentation
- Architecture decision records (ADRs)
- Code contribution guidelines
- Testing procedures documented
- Deployment instructions complete

---

## Success Metrics

### Functional Metrics

#### SwarmTools Parity
- [ ] Multi-agent coordination working
- [ ] Task decomposition functional
- [ ] Parallel execution validated
- [ ] Learning system operational
- [ ] Context survival proven
- [ ] File reservation system complete
- [ ] Agent communication working
- [ ] CLI integration comprehensive

#### User Experience Metrics
- [ ] Mission creation to completion workflow seamless
- [ ] Error messages actionable and clear
- [ ] Performance meets or exceeds SwarmTools
- [ ] Recovery after interruptions transparent
- [ ] Learning improves decomposition quality over time

### Performance Metrics

#### System Performance
- [ ] Event append < 5ms p99
- [ ] Checkpoint creation < 100ms p95
- [ ] Recovery < 500ms p95
- [ ] File lock acquisition < 10ms p95
- [ ] API response < 50ms p95

#### Scalability Metrics
- [ ] Supports 10+ concurrent specialists
- [ ] Handles 100+ active sorties
- [ ] Manages 1000+ events without degradation
- [ ] Memory usage scales linearly with load

### Quality Metrics

#### Code Quality
- [ ] 95%+ test coverage achieved
- [ ] Zero TypeScript errors
- [ ] All integration tests passing
- [ ] Performance benchmarks met
- [ ] Security audit passed

#### Reliability Metrics
- [ ] Zero data loss scenarios validated
- [ ] Recovery success rate > 99%
- [ ] Error handling coverage complete
- [ ] Graceful degradation under failure

---

## Risk Management

### Technical Risks

#### High-Impact Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| Interface changes mid-development | Medium | High | Freeze interfaces Day 1, use versioning |
| Mock behavior differs from real | Medium | Medium | Contract tests verify both implementations |
| SQLite performance issues | Low | Medium | Benchmark tests, WAL mode optimization |
| Concurrent access bugs | Medium | High | Comprehensive lock tests, WAL mode |
| Recovery data corruption | Low | High | Dual storage, validation on load |

#### Schedule Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| Phase dependencies cause delays | Medium | Medium | Mock implementations allow parallel work |
| Integration issues in final phases | Medium | High | Contract tests ensure compatibility |
| Performance bottlenecks discovered late | Low | Medium | Early performance benchmarks |
| Learning system complexity underestimated | High | High | Start with basic patterns, iterate |

### Mitigation Strategies

#### Parallel Development Mitigation
- Interface-first design prevents integration issues
- Contract testing ensures behavioral consistency
- Daily sync meetings catch misalignments early
- Mock implementations enable independent development

#### Performance Mitigation
- Early benchmarking identifies bottlenecks
- Performance tests run continuously
- Database optimization techniques applied proactively
- Load testing validates scalability assumptions

#### Quality Mitigation
- Comprehensive test coverage prevents regressions
- Code reviews ensure consistency
- Automated quality checks in CI/CD
- Regular architecture reviews validate design decisions

---

## Documentation Deliverables

### Technical Documentation

#### Architecture Documentation
- System design documents with diagrams
- Data flow documentation
- API specification with OpenAPI
- Database schema documentation
- Deployment architecture

#### Development Documentation
- Getting started guide
- Code contribution guidelines
- Testing procedures
- Debugging guides
- Performance tuning recommendations

### User Documentation

#### CLI Documentation
- Complete command reference
- Usage examples for common workflows
- Troubleshooting guide
- Configuration options
- Best practices

#### API Documentation
- Endpoint reference with examples
- Authentication guide
- Error handling guide
- Rate limiting documentation
- SDK usage examples

---

## Implementation Timeline

### Phase-by-Phase Schedule

| Phase | Duration | Start | End | Dependencies |
|--------|-----------|--------|------|-------------|
| Phase 1 (CLI) | 3 days | Day 1 | Day 3 | None |
| Phase 2 (SQLite) | 6 days | Day 4 | Day 9 | Phase 1 |
| Phase 3 (Context) | 5 days | Day 6 | Day 10 | Phase 2 |
| Phase 4 (Decompose) | 6 days | Day 11 | Day 16 | Phase 2 |
| Phase 5 (Spawning) | 6 days | Day 15 | Day 20 | Phase 2, 4 |
| Phase 6 (Testing) | 4 days | Day 21 | Day 24 | All previous |

### Critical Path Analysis

#### Primary Critical Path
1. **Phase 1** (Days 1-3): Foundation for all subsequent work
2. **Phase 2** (Days 4-9): Database layer required for all other phases
3. **Phase 4 + Phase 5** (Days 11-20): Core coordination features
4. **Phase 6** (Days 21-24): Final validation and testing

#### Parallel Development Opportunities
- **Days 6-10**: Phase 3 can run in parallel with late Phase 2
- **Days 15-20**: Phase 5 overlaps with Phase 4 completion
- **Continuous**: Testing and documentation can proceed alongside development

### Resource Requirements

#### Development Resources
- **Senior TypeScript Developer**: Full-time lead (24 days)
- **Systems Architect**: Part-time consultation (8 days)
- **QA Engineer**: Part-time testing framework (12 days)
- **DevOps Engineer**: Part-time deployment/CI (6 days)

#### Infrastructure Resources
- **Development Environment**: Local Bun/TypeScript setup
- **Testing Environment**: Automated test runners
- **CI/CD Pipeline**: GitHub Actions or similar
- **Documentation Site**: Static site hosting

---

## Completion Criteria

### Phase 1: CLI Service Management
- [ ] `fleet services up/down/logs/status` fully functional
- [ ] Podman integration working across platforms
- [ ] Service lifecycle management complete
- [ ] Error handling robust and user-friendly

### Phase 2: SQLite Event-Sourced Persistence
- [ ] All event sourcing operations working
- [ ] Event append-only semantics enforced
- [ ] Projections consistent with event log
- [ ] Performance benchmarks met
- [ ] 21 new API endpoints functional

### Phase 3: Context Survival System
- [ ] Automatic checkpoints at progress milestones
- [ ] Manual checkpoint commands working
- [ ] Recovery detects stale missions
- [ ] Context restored after process death
- [ ] Recovery context injected into prompts

### Phase 4: Task Decomposition System
- [ ] Tasks decomposed into parallel subtasks
- [ ] Multiple strategies available
- [ ] Strategy selection working
- [ ] Dependencies managed correctly
- [ ] Decomposition patterns recorded for learning

### Phase 5: Parallel Agent Spawning
- [ ] Multiple agents working in parallel
- [ ] File conflicts prevented via CTK
- [ ] Progress tracked across all workers
- [ ] Dependencies resolved correctly
- [ ] Specialist lifecycle managed properly

### Phase 6: Integration Testing
- [ ] Complete workflows tested end-to-end
- [ ] All system integration points verified
- [ ] Performance benchmarks met
- [ ] Error recovery proven working
- [ ] 95%+ test coverage achieved

### Final SwarmTools Parity Verification
- [ ] All core SwarmTools features replicated
- [ ] Performance meets or exceeds SwarmTools
- [ ] Learning system operational with pattern tracking
- [ ] Multi-agent coordination robust
- [ ] Documentation complete and accurate
- [ ] Ready for production deployment

---

## Conclusion

This comprehensive specification provides a complete roadmap for implementing FleetTools remaining specifications to achieve SwarmTools feature parity. The plan addresses:

1. **Complete Phase-by-Phase Implementation**: Detailed user stories, technical requirements, and success criteria for all 6 phases
2. **Integration Architecture**: Clear integration points and dependencies between components
3. **Quality Assurance**: Comprehensive testing strategy with 95% coverage target and performance benchmarks
4. **Risk Management**: Proactive identification and mitigation of technical and schedule risks
5. **Parallel Development**: Strategy for completing Phase 2 and Phase 3 in parallel using interface contracts
6. **Success Metrics**: Clear criteria for measuring SwarmTools parity achievement

The implementation requires 24 days (5 weeks) with a team of 4 developers working in a coordinated manner. The parallel development approach enabled by shared interfaces and contract testing minimizes schedule risk while ensuring quality.

**Key Success Factors:**
1. Interface-first design enables parallel development
2. Contract tests ensure implementation consistency
3. Comprehensive testing prevents regressions
4. Early performance validation avoids surprises
5. Incremental delivery provides early feedback

With this specification, FleetTools can achieve complete SwarmTools feature parity while maintaining high code quality, performance, and reliability standards.

---

**Specification Confidence:** 0.92  
**Last Updated:** 2026-01-10  
**Next Phase:** Begin Phase 1 CLI Service Management Implementation