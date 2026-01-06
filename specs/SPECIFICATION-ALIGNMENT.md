# FleetTools Specification Alignment Document

**Date:** 2026-01-04
**Purpose:** Map individual phase specs to 72-task plan and high-level TODOs

---

## Executive Summary

This document identifies gaps and misalignments between:
1. **Individual Phase Specs** (specs/phase*/spec.md)
2. **Detailed 72-Task Plan** (specs/fleettools-fixes/plan.md)
3. **High-Level TODOs** (6 phase items)

### Current State

| Component | Status | Count |
|----------|--------|--------|
| Phase Spec Files | ✅ Created | 5 files |
| FleetTools-Fixes Plan | ✅ Created | 43 tasks (not 72) |
| TODO Items | ✅ Created | 6 phases |

**Issue:** Original README stated "72 tasks" but plan.md only contains **43 tasks** (TASK-101 through TASK-507).

---

## Phase-by-Phase Alignment

### Phase 1: CLI Service Management

**High-Level TODO:**
> "Phase 1: Make CLI Actually Work - Wire up Podman provider, fix services commands"

**Individual Spec:** `specs/phase1-cli-services/spec.md`
- 4 User Stories (US-001 to US-004)
- 7 Technical Requirements (TR-001 to TR-007)
- 5 Non-Functional Requirements (NFR-001 to NFR-005)
- 15 Success Criteria checkboxes

**72-Task Plan:** NOT DIRECTLY MAPPED
- Phase 1 in plan.md focuses on **bug fixes** (TASK-101 to TASK-109)
- No tasks specifically for wiring Podman provider
- **GAP:** CLI service management needs explicit tasks

**Recommended New Tasks:**
- **TASK-PH1-001:** Fix missing `path` import in `providers/podman-postgres.ts`
- **TASK-PH1-002:** Import PodmanPostgresProvider into CLI
- **TASK-PH1-003:** Wire `servicesUp()` to provider (replace TODO)
- **TASK-PH1-004:** Wire `servicesDown()` to provider
- **TASK-PH1-005:** Wire `servicesLogs()` to provider
- **TASK-PH1-006:** Enhance `servicesStatus()` with provider
- **TASK-PH1-007:** Update command handlers for async functions

---

### Phase 2: SQLite Event-Sourced Persistence Layer

**High-Level TODO:**
> "Phase 2: SQLite/libSQL Persistence Layer - Match SwarmTools event-sourcing architecture"

**Individual Spec:** `specs/phase2-sqlite-persistence/spec.md`
- Massive spec (~2000 lines)
- 24 User Stories (US-001 to US-024)
- Complete database schema (10+ tables)
- Event type definitions (32 core events)
- Migration strategy with rollback procedure
- Performance, durability, concurrency requirements

**72-Task Plan:** PARTIALLY ALIGNED
- TASK-301: Create Database Schema ✅ Matches spec Section 3.1
- TASK-302: Create Database Module ✅ Matches spec Section 5.4
- TASK-303: Update Mailbox API to Use SQLite ⚠️ Spec has more detail
- TASK-304: Update Cursor API to Use SQLite ⚠️ Spec has more detail
- TASK-305: Update Lock API to Use SQLite ⚠️ Spec has more detail
- TASK-306: Test Persistence Across Restarts ✅ Matches spec
- TASK-307: Implement Lock Timeout ✅ Matches spec

**GAP:** 72-task plan is minimalist vs. comprehensive spec:
- Missing: Event sourcing patterns (Section 10)
- Missing: Zod schema validation (Section 4)
- Missing: Migration script (Section 5.3) - only mentioned in TASK-302
- Missing: Compaction logic (Section 3.2)
- Missing: 21 new API endpoints (Section 6.3)
- Missing: Materialized view projections for specialists, sorties, missions

**Recommended New Tasks:**
- **TASK-PH2-008:** Create event schemas with Zod validation
- **TASK-PH2-009:** Implement event store with append-only semantics
- **TASK-PH2-010:** Implement projection update system
- **TASK-PH2-011:** Implement migration script with rollback
- **TASK-PH2-012:** Create event compaction logic
- **TASK-PH2-013:** Add specialist management endpoints (POST/GET/PATCH)
- **TASK-PH2-014:** Add sortie management endpoints
- **TASK-PH2-015:** Add mission management endpoints
- **TASK-PH2-016:** Add checkpoint endpoints
- **TASK-PH2-017:** Add event query endpoints

---

### Phase 3: Context Survival System

**High-Level TODO:**
> "Phase 3: Context Survival System - Checkpoint/resume (swarm_checkpointed events)"

**Individual Spec:** `specs/phase3-context-survival/spec.md`
- 4 User Stories (US-301 to US-304)
- Automatic progress checkpointing (25%, 50%, 75%)
- Error-triggered checkpointing
- Manual checkpoint command
- Context compaction detection
- Checkpoint recovery flow

**72-Task Plan:** NOT PRESENT
- Phase 2 (SQLite) mentions checkpoints but no dedicated tasks
- **CRITICAL GAP:** No checkpoint system implementation tasks

**Recommended New Tasks:**
- **TASK-PH3-001:** Implement automatic progress checkpointing (25%, 50%, 75%)
- **TASK-PH3-002:** Implement error-triggered checkpointing
- **TASK-PH3-003:** Create `fleet checkpoint` CLI command
- **TASK-PH3-004:** Implement context compaction detection
- **TASK-PH3-005:** Implement checkpoint recovery flow
- **TASK-PH3-006:** Add `fleet_checkpointed` event emitter
- **TASK-PH3-007:** Add `fleet_recovered` event emitter
- **TASK-PH3-008:** Add `context_compacted` event emitter
- **TASK-PH3-009:** Create checkpoint API endpoints
- **TASK-PH3-010:** Test checkpoint/resume cycle

---

### Phase 4: Task Decomposition System

**High-Level TODO:**
> "Phase 4: Task Decomposition - Hybrid strategy selection + LLM planner"

**Individual Spec:** `specs/phase4-task-decomposition/spec.md`
- 5 User Stories (US-001 to US-005)
- Strategy selection algorithm
- Multiple strategies: file-based, feature-based, risk-based
- Learning system integration
- Decomposition validation

**72-Task Plan:** NOT PRESENT
- **CRITICAL GAP:** No task decomposition system implementation

**Recommended New Tasks:**
- **TASK-PH4-001:** Create LLM planner module
- **TASK-PH4-002:** Implement strategy auto-detection
- **TASK-PH4-003:** Create `/fleet decompose` CLI command
- **TASK-PH4-004:** Implement file-based decomposition
- **TASK-PH4-005:** Implement feature-based decomposition
- **TASK-PH4-006:** Implement risk-based decomposition
- **TASK-PH4-007:** Create decomposition API endpoint
- **TASK-PH4-008:** Implement strategy selection algorithm
- **TASK-PH4-009:** Add dependency management for sorties
- **TASK-PH4-010:** Validate decompositions (conflicts, dependencies)
- **TASK-PH4-011:** Record decomposition patterns for learning
- **TASK-PH4-012:** Create mission/sortie in Flightline

---

### Phase 5: Parallel Agent Spawning System

**High-Level TODO:**
> "Phase 5: Parallel Agent Spawning - Use Task tool like SwarmTools does"

**Individual Spec:** `specs/phase5-parallel-spawning/spec.md`
- 2 User Stories (US-501 to US-502, but spec implies more)
- Dispatch architecture diagram
- Parallel execution for independent sorties
- Sequential coordination for dependencies
- Progress tracking via Squawk
- Blocker handling
- File coordination via CTK
- Review process

**72-Task Plan:** NOT PRESENT
- **CRITICAL GAP:** No parallel spawning implementation

**Recommended New Tasks:**
- **TASK-PH5-001:** Create Dispatch coordinator agent
- **TASK-PH5-002:** Implement Task tool integration (like SwarmTools)
- **TASK-PH5-003:** Implement parallel sorties spawning
- **TASK-PH5-004:** Implement sequential dependency handling
- **TASK-PH5-005:** Create progress tracking system
- **TASK-PH5-006:** Implement blocker detection and handling
- **TASK-PH5-007:** Integrate CTK file locking during execution
- **TASK-PH5-008:** Implement review process for completed sorties
- **TASK-PH5-009:** Track active specialists in SQLite
- **TASK-PH5-010:** Handle specialist completion/error
- **TASK-PH5-011:** Implement `specialist_spawned` event emitter
- **TASK-PH5-012:** Implement `specialist_completed` event emitter

---

### Phase 6: Integration Testing

**High-Level TODO:**
> "Phase 6: Integration Testing - End-to-end fleet coordination workflow"

**Individual Spec:** NOT CREATED YET
- No specs/phase6-integration-testing/spec.md file found

**72-Task Plan:** NOT PRESENT
- Plan.md mentions "missing Phase 6 integration tests (tests/e2/, tests/e3/)" but no tasks

**Recommended New Tasks:**
- **TASK-PH6-001:** Create Phase 6 spec document
- **TASK-PH6-002:** Create tests/e2/ directory
- **TASK-PH6-003:** Create tests/e3/ directory
- **TASK-PH6-004:** Write end-to-end coordination workflow test
- **TASK-PH6-005:** Test specialist spawning parallelism
- **TASK-PH6-006:** Test checkpoint/resume cycle
- **TASK-PH6-007:** Test task decomposition flow
- **TASK-PH6-008:** Test lock conflict resolution
- **TASK-PH6-009:** Test mission/sortie lifecycle
- **TASK-PH6-010:** Test error handling and recovery

---

## Summary of Gaps

### Missing Tasks by Phase

| Phase | Plan Tasks | Required Tasks | Gap |
|-------|-------------|-----------------|------|
| **Phase 1 (CLI)** | 0 tasks (bug fixes only) | 7 tasks | **-7** |
| **Phase 2 (SQLite)** | 7 tasks (TASK-301 to 307) | 17 tasks | **-10** |
| **Phase 3 (Context)** | 0 tasks | 10 tasks | **-10** |
| **Phase 4 (Decompose)** | 0 tasks | 12 tasks | **-12** |
| **Phase 5 (Spawning)** | 0 tasks | 12 tasks | **-12** |
| **Phase 6 (Testing)** | 0 tasks | 10 tasks | **-10** |
| **TOTAL** | **43 tasks** | **68 tasks** | **-25 tasks** |

---

## Recommended Action Plan

### Immediate Actions (Update Plan)

1. **Re-number existing tasks** to account for gaps:
   - Renumber TASK-101 to TASK-135 to accommodate new tasks
   - Or use decimal numbering (TASK-101.1, TASK-101.2, etc.)

2. **Add Phase 1 CLI tasks** to plan.md:
   - TASK-110 through TASK-116 (Podman wiring tasks)

3. **Add Phase 2 SQLite tasks** to plan.md:
   - TASK-308 through TASK-324 (event sourcing, compaction, APIs)

4. **Add Phase 3 Context tasks** to plan.md:
   - TASK-325 through TASK-334 (checkpointing system)

5. **Add Phase 4 Decompose tasks** to plan.md:
   - TASK-335 through TASK-346 (LLM planner, strategies)

6. **Add Phase 5 Spawning tasks** to plan.md:
   - TASK-347 through TASK-358 (dispatch, parallelism)

7. **Add Phase 6 Testing tasks** to plan.md:
   - TASK-359 through TASK-368 (integration tests)

### Alternative Approach: Separate Plans

**Option A:** Keep existing 43-task plan for "Critical Fixes"
- Create new plan files for each phase:
  - `specs/phase1-cli-services/plan.md`
  - `specs/phase2-sqlite-persistence/plan.md`
  - `specs/phase3-context-survival/plan.md`
  - `specs/phase4-task-decomposition/plan.md`
  - `specs/phase5-parallel-spawning/plan.md`
  - `specs/phase6-integration-testing/plan.md`

**Option B:** Create unified "Roadmap" plan
- Single comprehensive plan with all 68+ tasks
- Organized by phases
- Clear dependencies between phases

---

## Dependency Analysis

### Cross-Phase Dependencies

```
Phase 1 (CLI) ──────┐
                       │
Phase 2 (SQLite) ─────┤
                       │
Phase 3 (Context) ────┤◄─────┐
                       │     │
Phase 4 (Decompose) ─────┴─────┤
                       │           │
Phase 5 (Spawning) ────────────────┤
                                   │
                               └───► Phase 6 (Testing)
```

**Critical Path:**
1. Phase 1 must complete first (CLI foundation)
2. Phase 2 must complete before Phase 3 (SQLite needed for checkpoints)
3. Phase 2 must complete before Phase 4 (events needed for decomposition)
4. Phase 2 must complete before Phase 5 (events needed for spawning)
5. Phase 3, 4, 5 all feed into Phase 6

---

## Implementation Priority Matrix

| Priority | Phase | Tasks | Effort | Dependencies |
|----------|-------|-------|---------|--------------|
| **P0** | Phase 1 (CLI) | 7 tasks | None |
| **P0** | Phase 2 (SQLite) | 17 tasks | Phase 1 |
| **P1** | Phase 3 (Context) | 10 tasks | Phase 2 |
| **P1** | Phase 4 (Decompose) | 12 tasks | Phase 2 |
| **P1** | Phase 5 (Spawning) | 12 tasks | Phase 2, 4 |
| **P2** | Phase 6 (Testing) | 10 tasks | All previous |

---

## Recommendation

**Proceed with Option A: Create Separate Phase-Specific Plans**

Rationale:
1. Individual phase specs are comprehensive (thousands of lines)
2. Existing 43-task plan is too limited
3. Creating unified 68+ task plan would be unwieldy
4. Separate plans allow phased execution without overwhelming single document
5. Matches how specs/fleettools-fixes/ was structured

**Next Steps:**
1. Update TODOs to track individual phase plans
2. Update README.md to reference all 6 phase specs
3. Ensure plan.md dependencies are accurate
4. Begin Phase 1 implementation (CLI service management)

---

**Status:** Ready for Execution
**Confidence:** 0.85
**Last Updated:** 2026-01-04
