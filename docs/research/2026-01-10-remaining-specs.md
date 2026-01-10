# FleetTools Remaining Specifications Research

**Date:** 2026-01-10  
**Researcher:** Senior Systems Architect  
**Confidence:** 0.92  
**Purpose:** Analyze implementation status and SwarmTools parity requirements

---

## Executive Summary

FleetTools is a TypeScript/Bun monorepo with event-sourcing architecture designed to achieve SwarmTools feature parity. Phase 0 foundation is complete with core packages built and tested. Three major specification documents remain to be implemented:

1. **TDD Implementation Guide** (878 lines) - 10-day parallel development plan
2. **Shared Interfaces** (1826 lines) - Interface contracts for parallel development  
3. **Specification Alignment** (343 lines) - Gap analysis and task mapping

**Current State Analysis:**
- ✅ Phase 0 Foundation: Complete (packages/core, packages/db, packages/events)
- ⚠️ Phase 1-6: Specified but not implemented
- 🎯 Target: SwarmTools feature parity with operational CLI and tools

---

## Current Implementation Status

### Phase 0 Foundation - COMPLETE ✅

**Core Packages Built:**
```
packages/
├── core/     ✅ ID generators, timestamps, utilities, types (78 exports)
├── db/        ✅ Drizzle schema, migrations, client (27 exports)  
├── events/    ✅ Event types, store, projections (16 exports)
└── [tested]   ✅ Comprehensive test coverage
```

**Architecture Achievements:**
- Event sourcing foundation with libSQL/Drizzle
- TypeScript with strict mode and ES2022 target
- Bun runtime optimization throughout
- Comprehensive type safety and ID prefixing

**Testing Infrastructure:**
- Integration tests: 9 API endpoint suites
- Test framework: Bun test with helpers
- Coverage: Core packages well-tested

---

## SwarmTools Feature Parity Requirements

Based on SwarmTools documentation and architecture analysis:

### Core SwarmTools Features
1. **Multi-Agent Coordination**
   - Task decomposition into parallel subtasks
   - Worker spawning for independent execution
   - Coordinator pattern for orchestration

2. **Conflict Prevention**
   - File reservations (CTK system)
   - Lock management with timeout handling
   - Reserve-edit-release workflow

3. **Persistent Tracking**
   - Git-backed work items (.hive/ directory)
   - Progress tracking across sessions
   - Context survival through restarts

4. **Learning Systems**
   - Pattern maturity tracking
   - Confidence decay (90-day half-life)
   - Anti-pattern detection
   - Outcome-based optimization

5. **Communication**
   - Swarm mail for inter-agent messaging
   - Event-sourced communication
   - Actor model isolation

### FleetTools Current vs Target

| Feature Category | SwarmTools | FleetTools Current | Gap |
|------------------|-------------|-------------------|------|
| **Task Decomposition** | LLM-based strategy selection | ❌ Not implemented | 100% |
| **Parallel Execution** | Worker spawning system | ❌ Not implemented | 100% |
| **File Reservations** | CTK lock system | ⚠️ Basic API exists | 60% |
| **Persistent Tracking** | Git-backed .hive/ | ⚠️ Flightline exists | 70% |
| **Learning Systems** | CASS learning engine | ❌ Not implemented | 100% |
| **Event Sourcing** | Complete | ✅ Phase 0 done | 20% |
| **Agent Communication** | Swarm mail | ⚠️ Basic mailbox API | 40% |
| **CLI Integration** | 40+ tools | ⚠️ Basic commands | 30% |

---

## Gap Analysis by Specification

### 1. TDD Implementation Guide (878 lines)

**Purpose:** 10-day parallel development plan for Phase 2 (SQLite) and Phase 3 (Context Survival)

**Key Components:**
- Day-by-day implementation schedule (188 total tests)
- Parallel development strategy with interface contracts
- Mock-to-real implementation swap process
- Integration testing framework

**Critical Gaps:**
- SQLite operations not implemented beyond Phase 0 foundation
- Context survival system completely missing
- Checkpoint/resume functionality not built
- No automatic progress milestone detection

**Implementation Effort:** 10 days intensive development
**Dependencies:** Shared interfaces must be defined first

### 2. Shared Interfaces (1826 lines)

**Purpose:** Enable parallel Phase 2 and Phase 3 development through interface contracts

**Interface Categories:**
```typescript
DatabaseAdapter    // Root database interface
├── MissionOps     // Mission CRUD operations  
├── SortieOps      // Work item management
├── LockOps        // File reservation system
├── EventOps       // Append-only event log
├── CheckpointOps  // Context persistence
├── SpecialistOps  // Agent worker management
├── MessageOps     // Inter-agent communication
└── CursorOps      // Stream position tracking
```

**Contract Testing Framework:**
- Mock implementations for Phase 3 development
- Real SQLite implementations for Phase 2
- Contract tests ensuring behavioral parity
- Seamless mock-to-real swap on Day 9

**Critical Gaps:**
- Current Phase 0 has basic schema but not full operations
- No checkpoint operations implemented
- Missing specialist/agent management
- File locking incomplete without timeout/conflict detection

### 3. Specification Alignment (343 lines)

**Purpose:** Map individual phase specs to actionable task plan

**Key Findings:**
- Original "72-task plan" only contains 43 tasks (TASK-101 to TASK-507)
- **25 missing tasks** across 6 phases
- Phase 1 (CLI): 7 tasks missing
- Phase 2 (SQLite): 10 tasks missing  
- Phase 3 (Context): 10 tasks missing
- Phase 4 (Decompose): 12 tasks missing
- Phase 5 (Spawning): 12 tasks missing
- Phase 6 (Testing): 10 tasks missing

**Dependencies:**
```
Phase 1 (CLI) ──────┐
                    │
Phase 2 (SQLite) ────┤
                    │
Phase 3 (Context) ───┤◄─────┐
                    │      │
Phase 4 (Decompose) ──┴─────┤
                           │
Phase 5 (Spawning) ──────────┤
                           │
                       └───► Phase 6 (Testing)
```

---

## Technical Implementation Analysis

### Current Architecture Strengths

1. **Solid Foundation**
   - Event sourcing core built correctly
   - Type safety throughout with TypeScript
   - Bun runtime optimization
   - Modular package structure

2. **API Infrastructure**
   - 19 endpoints working in consolidated server
   - Basic CRUD operations for work orders, CTK, tech orders
   - Integration test framework established

3. **Development Workflow**
   - Monorepo with workspaces functioning
   - Build system operational
   - Package management with Bun

### Critical Architecture Gaps

1. **Missing Swarm Coordination**
   ```typescript
   // Current: Basic REST API
   app.get('/api/v1/work-orders', listWorkOrders)
   
   // Needed: Swarm coordination
   class SwarmCoordinator {
     decompose(task: string): Promise<SubTask[]>
     spawnWorkers(tasks: SubTask[]): Promise<Worker[]>
     coordinateExecution(workers: Worker[]): Promise<Result>
   }
   ```

2. **No Learning System Integration**
   ```typescript
   // Missing entirely
   class LearningEngine {
     recordPattern(decomposition: Pattern, outcome: Outcome): void
     selectStrategy(context: Context): Strategy
     decayConfidence(patterns: Pattern[]): Pattern[]
   }
   ```

3. **Incomplete Context Survival**
   ```typescript
   // Current: Basic persistence
   function saveData(data: any): void
   
   // Needed: Context survival
   class CheckpointManager {
     createCheckpoint(trigger: Trigger): Promise<Checkpoint>
     restoreFromCheckpoint(checkpointId: string): Promise<Context>
     detectProgressMilestones(): Promise<Milestone[]>
   }
   ```

---

## Implementation Recommendations

### Phase-Based Roadmap

#### Phase 1: CLI Service Management (P0)
**Duration:** 2-3 days  
**Effort:** 7 tasks

1. Fix Podman provider integration
2. Wire services commands to providers
3. Update command handlers for async
4. Enhance status reporting
5. Add service health checks
6. Improve error handling
7. Update CLI help system

**Success Criteria:**
- `fleet services up/down/logs/status` fully functional
- Podman integration working
- Service lifecycle management complete

#### Phase 2: SQLite Event-Sourced Persistence (P0)  
**Duration:** 5-6 days  
**Effort:** 17 tasks

1. Complete SQLite operations (missions, sorties, locks, events)
2. Implement event sourcing patterns
3. Add Zod schema validation for 32 event types
4. Create projection update system
5. Implement migration scripts with rollback
6. Add compaction logic for performance
7. Create 21 missing API endpoints
8. Add materialized views for specialists/sorties/missions

**Success Criteria:**
- All event sourcing operations working
- Event append-only semantics enforced
- Projections consistent with event log
- Performance benchmarks met

#### Phase 3: Context Survival System (P1)
**Duration:** 4-5 days  
**Effort:** 10 tasks

1. Implement automatic progress checkpointing (25%, 50%, 75%)
2. Add error-triggered checkpointing
3. Create `fleet checkpoint` CLI commands
4. Build context compaction detection
5. Implement checkpoint recovery flow
6. Add checkpoint API endpoints
7. Create context injection for LLM prompts
8. Test checkpoint/resume cycles

**Success Criteria:**
- Automatic checkpoints at progress milestones
- Manual checkpoint commands working
- Context restored after process death
- Recovery context injected into prompts

#### Phase 4: Task Decomposition System (P1)
**Duration:** 5-6 days  
**Effort:** 12 tasks

1. Create LLM planner module
2. Implement strategy auto-detection
3. Build `/fleet decompose` CLI command
4. Implement file-based decomposition
5. Add feature-based decomposition  
6. Create risk-based decomposition
7. Build strategy selection algorithm
8. Add dependency management for sorties
9. Validate decompositions
10. Record decomposition patterns
11. Create mission/sortie in Flightline
12. Add decomposition API endpoint

**Success Criteria:**
- Tasks decomposed into parallel subtasks
- Multiple strategies available
- Strategy selection working
- Dependencies managed correctly

#### Phase 5: Parallel Agent Spawning (P1)
**Duration:** 5-6 days  
**Effort:** 12 tasks

1. Create Dispatch coordinator agent
2. Implement Task tool integration
3. Build parallel sorties spawning
4. Add sequential dependency handling
5. Create progress tracking system
6. Implement blocker detection/handling
7. Integrate CTK file locking
8. Build review process
9. Track active specialists in SQLite
10. Handle specialist completion/error
11. Add specialist lifecycle events
12. Implement parallel execution monitoring

**Success Criteria:**
- Multiple agents working in parallel
- File conflicts prevented via CTK
- Progress tracked across all workers
- Dependencies resolved correctly

#### Phase 6: Integration Testing (P2)
**Duration:** 3-4 days  
**Effort:** 10 tasks

1. Create Phase 6 specification document
2. Build tests/e2/ directory
3. Create tests/e3/ directory
4. Write end-to-end coordination workflow tests
5. Test specialist spawning parallelism
6. Test checkpoint/resume cycles
7. Test task decomposition flow
8. Test lock conflict resolution
9. Test mission/sortie lifecycle
10. Test error handling and recovery

**Success Criteria:**
- Complete workflows tested end-to-end
- All system integration points verified
- Performance benchmarks met
- Error recovery proven working

---

## Technical Implementation Strategy

### 1. Parallel Development Approach

**Day 1-2: Interface Foundation**
- Define shared interfaces from specs/shared-interfaces.md
- Create mock implementations for Phase 3
- Set up contract testing framework
- Establish test infrastructure

**Day 3-8: Parallel Implementation**
- Phase 2: Build real SQLite implementations
- Phase 3: Build context survival using mocks
- Maintain daily sync on interface changes
- Run contract tests continuously

**Day 9-10: Integration**
- Swap mocks for real implementations
- Run full system integration tests
- Performance optimization
- Documentation updates

### 2. Quality Assurance Strategy

**Testing Requirements:**
- Unit tests: 95% line coverage target
- Integration tests: All API endpoints
- Contract tests: Mock vs real parity
- E2E tests: Complete workflows
- Performance tests: Benchmarks met

**Code Quality Standards:**
- TypeScript strict mode throughout
- ESLint configuration consistent
- Pre-commit hooks for quality
- Automated testing in CI/CD

### 3. Risk Mitigation

**Technical Risks:**
| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| Interface changes mid-development | Medium | High | Freeze interfaces Day 1, use versioning |
| Mock behavior differs from real | Medium | Medium | Contract tests verify both |
| SQLite performance issues | Low | Medium | Benchmark tests, WAL mode optimization |
| Concurrent access bugs | Medium | High | Comprehensive lock tests, WAL mode |
| Recovery data corruption | Low | High | Dual storage, validation on load |

**Schedule Risks:**
| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| Phase dependencies cause delays | Medium | Medium | Mock implementations allow parallel work |
| Integration issues in final phases | Medium | High | Contract tests ensure compatibility |
| Performance bottlenecks discovered late | Low | Medium | Early performance benchmarks |
| Learning system complexity underestimated | High | High | Start with basic patterns, iterate |

---

## Resource Requirements

### Development Resources
- **Senior TypeScript Developer:** Full-time lead
- **Systems Architect:** Part-time consultation
- **QA Engineer:** Part-time testing framework
- **DevOps Engineer:** Part-time deployment/CI

### Infrastructure Resources
- **Development Environment:** Local Bun/TypeScript setup
- **Testing Environment:** Automated test runners
- **CI/CD Pipeline:** GitHub Actions or similar
- **Documentation Site:** Static site hosting

### Timeline Summary
| Phase | Duration | Start | End |
|--------|-----------|--------|------|
| Phase 1 (CLI) | 3 days | Day 1 | Day 3 |
| Phase 2 (SQLite) | 6 days | Day 4 | Day 9 |  
| Phase 3 (Context) | 5 days | Day 6 | Day 10 |
| Phase 4 (Decompose) | 6 days | Day 11 | Day 16 |
| Phase 5 (Spawning) | 6 days | Day 15 | Day 20 |
| Phase 6 (Testing) | 4 days | Day 21 | Day 24 |

**Total Estimated Timeline:** 24 days (5 weeks)

---

## Success Metrics

### Functional Metrics
- [ ] All SwarmTools core features replicated
- [ ] Multi-agent coordination working
- [ ] Task decomposition functional
- [ ] Parallel execution validated
- [ ] Learning system operational
- [ ] Context survival proven

### Performance Metrics  
- [ ] Event append < 5ms p99
- [ ] Checkpoint creation < 100ms p95
- [ ] Recovery < 500ms p95
- [ ] File lock acquisition < 10ms p95
- [ ] API response < 50ms p95

### Quality Metrics
- [ ] 95%+ test coverage
- [ ] Zero TypeScript errors
- [ ] All integration tests passing
- [ ] Performance benchmarks met
- [ ] Documentation complete

---

## Conclusion

FleetTools has achieved solid Phase 0 foundation but requires significant implementation to reach SwarmTools feature parity. The three remaining specifications provide a comprehensive roadmap but contain gaps that need addressing.

**Key Recommendations:**

1. **Address Specification Gaps:** Update task plans to include missing 25 tasks
2. **Follow Parallel Development:** Use mock implementations to enable Phase 2/3 parallel work  
3. **Prioritize Core Features:** Focus on SwarmTools parity features first
4. **Implement Learning System:** Don't underestimate learning system complexity
5. **Invest in Testing:** Comprehensive testing crucial for complex coordination

**Next Steps:**
1. Review and approve implementation roadmap
2. Allocate development resources
3. Set up parallel development infrastructure
4. Begin Phase 1 CLI service management
5. Establish daily sync cadence for parallel phases

**Confidence Assessment:** 0.92 - High confidence in research completeness, moderate confidence in timeline estimates due to complexity of learning system and parallel coordination features.

---

**Research Complete:** 2026-01-10  
**Total Analysis Time:** 3 hours  
**Documents Reviewed:** 12 specifications, codebases, and external references  
**Recommendation:** Proceed with Phase 1-6 implementation plan