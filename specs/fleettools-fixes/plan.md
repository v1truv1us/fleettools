# FleetTools Implementation Fixes - Plan

**Status**: Draft
**Created**: 2026-01-03
**Specification**: specs/fleettools-fixes/spec.md
**Estimated Effort**: 18-36 hours (human estimate; agentic execution will be faster)
**Complexity**: Medium-High

## Overview

This plan covers fixing 12 bugs, establishing a proper build system with TypeScript, implementing SQLite persistence for Squawk, consolidating the server API, and researching/fixing the editor plugins. The plan identifies parallel execution tracks to minimize total timeline.

## Specification Reference

### User Stories → Tasks Mapping

| User Story | Description | Tasks | Status |
|------------|-------------|-------|--------|
| US-001 | Developer Fixes Critical Bugs | TASK-101 to TASK-109 | Pending |
| US-002 | Developer Fixes Medium Bugs | TASK-104 to TASK-108 | Pending |
| US-003 | Developer Installs CLI Successfully | TASK-201 to TASK-212 | Pending |
| US-004 | Developer Runs Local Services | TASK-207, TASK-211 | Pending |
| US-005 | Squawk Data Persists Across Restarts | TASK-301 to TASK-307 | Pending |
| US-006 | Server API Starts Correctly | TASK-401 to TASK-408 | Pending |
| US-007 | Plugins Work with Editors | TASK-501 to TASK-507 | Pending |
| US-008 | TypeScript Compiles Cleanly | TASK-203, TASK-204, TASK-210 | Pending |

## Architecture

### Parallel Execution Tracks

```
TRACK A (Build System)          TRACK B (Bug Fixes)           TRACK C (Research)
─────────────────────          ─────────────────────         ─────────────────────
TASK-201: Root package.json    TASK-101: CLI execSync        TASK-501: OpenCode API
TASK-202: CLI package.json     TASK-102: Squawk UUID         TASK-502: Claude Code API
TASK-203: CLI tsconfig.json    TASK-103: Lock release var
TASK-204: Squawk package.json  TASK-104: Podman check
                               TASK-105: Postgres check
                               TASK-106: Mailbox retrieval
                               TASK-107: Plugin catch (CC)
                               TASK-108: Plugin catch (OC)
        ↓                              ↓                              ↓
        └──────────────────────────────┴──────────────────────────────┘
                                       ↓
                            TASK-209: npm install
                            TASK-210: tsc compile
                            TASK-211: Verify CLI runs
                                       ↓
                            ┌──────────┴──────────┐
                            ↓                     ↓
                    PHASE 3: SQLite       PHASE 4: Server
                    (Sequential)          (After Phase 3)
```

## Phase 1: Critical Bug Fixes

**Goal**: Fix all 12 identified bugs so CLI and APIs run without crashes
**Duration**: 2-4 hours (human estimate)
**User Stories**: US-001, US-002

### TASK-101: Fix CLI execSync Import

- **ID**: TASK-101
- **User Story**: US-001
- **Depends On**: None
- **Files**:
  - `cli/index.cjs` (modify) - Add execSync to import
- **Acceptance Criteria**:
  - [ ] Line 11 imports both `exec` and `execSync`
  - [ ] `const { exec, execSync } = require('child_process');`
  - [ ] No runtime errors when calling checkPodmanSync()
- **Time**: 15 min
- **Complexity**: Low

### TASK-102: Fix Squawk UUID Usage

- **ID**: TASK-102
- **User Story**: US-001
- **Depends On**: None
- **Files**:
  - `squawk/api/index.js` (modify)
- **Acceptance Criteria**:
  - [ ] Line 5: Remove `const { v4: randomUUID } = require('crypto');`
  - [ ] Keep `const crypto = require('crypto');` on line 4
  - [ ] Line 37: Change `v4.randomUUID()` to `crypto.randomUUID()`
  - [ ] Line 159: Change `v4.randomUUID()` to `crypto.randomUUID()`
  - [ ] Server starts without errors
- **Time**: 15 min
- **Complexity**: Low

### TASK-103: Fix Lock Release Variable

- **ID**: TASK-103
- **User Story**: US-001
- **Depends On**: None
- **Files**:
  - `squawk/api/index.js` (modify)
- **Acceptance Criteria**:
  - [ ] Line 181: Destructure `specialist_id` from `req.body`
  - [ ] `const { lock_id, specialist_id } = req.body;`
  - [ ] Lock release endpoint returns 200 for valid requests
- **Time**: 15 min
- **Complexity**: Low

### TASK-104: Fix Podman Version Check

- **ID**: TASK-104
- **User Story**: US-002
- **Depends On**: TASK-101
- **Files**:
  - `cli/index.cjs` (modify)
- **Acceptance Criteria**:
  - [ ] Lines 248-254: Remove `!result.error` check
  - [ ] Return `true` if execSync succeeds (no exception)
  - [ ] Return `false` in catch block
  - [ ] `fleet status` shows correct Podman availability
- **Time**: 15 min
- **Complexity**: Low

### TASK-105: Fix Postgres Status Check

- **ID**: TASK-105
- **User Story**: US-002
- **Depends On**: TASK-101
- **Files**:
  - `cli/index.cjs` (modify)
- **Acceptance Criteria**:
  - [ ] Lines 265-270: Change `result.stdout.trim()` to `result.trim()`
  - [ ] execSync returns string directly, not object
  - [ ] `fleet services status` shows correct Postgres state
- **Time**: 15 min
- **Complexity**: Low

### TASK-106: Fix Mailbox Retrieval

- **ID**: TASK-106
- **User Story**: US-002
- **Depends On**: None
- **Files**:
  - `squawk/api/index.js` (modify)
- **Acceptance Criteria**:
  - [ ] Lines 59-69: Add `else` branch to get existing mailbox
  - [ ] `else { mailbox = mailboxes.get(stream_id); }`
  - [ ] Second append to same stream works without TypeError
- **Time**: 15 min
- **Complexity**: Low

### TASK-107: Fix Claude Code Plugin Catch Block

- **ID**: TASK-107
- **User Story**: US-002
- **Depends On**: None
- **Files**:
  - `plugins/claude-code/index.js` (modify)
- **Acceptance Criteria**:
  - [ ] Lines 106-109: Replace `this.showOutput(output)` with inline message
  - [ ] `this.showOutput(['Failed to parse status output']);`
  - [ ] No ReferenceError when JSON parse fails
- **Time**: 15 min
- **Complexity**: Low

### TASK-108: Fix OpenCode Plugin Catch Block

- **ID**: TASK-108
- **User Story**: US-002
- **Depends On**: None
- **Files**:
  - `plugins/opencode/index.js` (modify)
- **Acceptance Criteria**:
  - [ ] Lines 105-108: Replace `this.showOutput(output)` with inline message
  - [ ] `this.showOutput(['Failed to parse status output']);`
  - [ ] No ReferenceError when JSON parse fails
- **Time**: 15 min
- **Complexity**: Low

### TASK-109: Verify All Bug Fixes

- **ID**: TASK-109
- **User Story**: US-001, US-002
- **Depends On**: TASK-101 through TASK-108
- **Files**:
  - `tests/bug-fixes.test.js` (create)
- **Acceptance Criteria**:
  - [ ] Test file created with all bug verification tests
  - [ ] All 8 bugs verified fixed
  - [ ] Tests pass: `node --test tests/bug-fixes.test.js`
- **Time**: 30 min
- **Complexity**: Medium

## Phase 2: Build System & TypeScript Migration

**Goal**: Establish monorepo structure with npm workspaces and TypeScript compilation
**Duration**: 4-8 hours (human estimate)
**User Stories**: US-003, US-004, US-008

### TASK-201: Create Root package.json

- **ID**: TASK-201
- **User Story**: US-003
- **Depends On**: None
- **Files**:
  - `package.json` (create)
- **Acceptance Criteria**:
  - [ ] Workspaces configured: cli, squawk, server/api, plugins/*
  - [ ] Scripts: install:all, build, test, lint, doctor
  - [ ] Engine: node >= 18.0.0
  - [ ] TypeScript as devDependency
- **Time**: 30 min
- **Complexity**: Low

### TASK-202: Fix CLI package.json

- **ID**: TASK-202
- **User Story**: US-003
- **Depends On**: None
- **Files**:
  - `cli/package.json` (modify)
- **Acceptance Criteria**:
  - [ ] bin path: `"./index.ts"` (not `"./cli/index.ts"`)
  - [ ] build script: `"tsc --project tsconfig.json"`
  - [ ] Add dependencies: yaml, better-sqlite3, express
  - [ ] Add devDependencies: @types/node, @types/better-sqlite3, tsx
- **Time**: 20 min
- **Complexity**: Low

### TASK-203: Create CLI tsconfig.json

- **ID**: TASK-203
- **User Story**: US-008
- **Depends On**: None
- **Files**:
  - `cli/tsconfig.json` (create)
- **Acceptance Criteria**:
  - [ ] Target: ES2022, Module: NodeNext
  - [ ] outDir: ./dist, rootDir: .
  - [ ] Strict mode enabled
  - [ ] Include: index.ts, providers/**/*.ts
- **Time**: 20 min
- **Complexity**: Low

### TASK-204: Create Squawk package.json

- **ID**: TASK-204
- **User Story**: US-003
- **Depends On**: None
- **Files**:
  - `squawk/package.json` (create)
- **Acceptance Criteria**:
  - [ ] Name: @fleettools/squawk
  - [ ] Dependencies: express, better-sqlite3
  - [ ] Build script configured
- **Time**: 20 min
- **Complexity**: Low

### TASK-205: Create Squawk tsconfig.json

- **ID**: TASK-205
- **User Story**: US-008
- **Depends On**: TASK-204
- **Files**:
  - `squawk/tsconfig.json` (create)
- **Acceptance Criteria**:
  - [ ] Matches CLI tsconfig pattern
  - [ ] outDir: ./dist
  - [ ] Include: src/**/*.ts, api/**/*.ts
- **Time**: 15 min
- **Complexity**: Low

### TASK-206: Update Server API package.json

- **ID**: TASK-206
- **User Story**: US-003
- **Depends On**: None
- **Files**:
  - `server/api/package.json` (modify)
- **Acceptance Criteria**:
  - [ ] Name: @fleettools/server
  - [ ] Add TypeScript dependencies
  - [ ] Build script configured
- **Time**: 15 min
- **Complexity**: Low

### TASK-207: Migrate CLI to TypeScript

- **ID**: TASK-207
- **User Story**: US-003, US-004
- **Depends On**: TASK-202, TASK-203
- **Files**:
  - `cli/index.ts` (modify - add missing sync functions)
  - `cli/index.cjs` (delete after migration verified)
- **Acceptance Criteria**:
  - [ ] Add execSync-based functions from index.cjs
  - [ ] Add checkPodmanSync, checkPostgresStatusSync
  - [ ] Add servicesUpSync, servicesDownSync
  - [ ] TypeScript compiles without errors
- **Time**: 60 min
- **Complexity**: Medium

### TASK-208: Add YAML Parser Dependency

- **ID**: TASK-208
- **User Story**: US-003
- **Depends On**: TASK-202
- **Files**:
  - `cli/index.ts` (modify)
  - `cli/package.json` (already has yaml)
- **Acceptance Criteria**:
  - [ ] Replace parseSimpleYaml with proper yaml package
  - [ ] `import YAML from 'yaml';`
  - [ ] Config loading works with real YAML files
- **Time**: 30 min
- **Complexity**: Low

### TASK-209: Run npm install at Root

- **ID**: TASK-209
- **User Story**: US-003
- **Depends On**: TASK-201, TASK-202, TASK-204, TASK-206
- **Files**: None (command execution)
- **Acceptance Criteria**:
  - [ ] `npm install` completes without errors
  - [ ] node_modules created in root and workspaces
  - [ ] All dependencies resolved
- **Time**: 15 min
- **Complexity**: Low

### TASK-210: Compile TypeScript

- **ID**: TASK-210
- **User Story**: US-008
- **Depends On**: TASK-203, TASK-205, TASK-207, TASK-209
- **Files**: None (command execution)
- **Acceptance Criteria**:
  - [ ] `npm run build` completes without errors
  - [ ] cli/dist/index.js created
  - [ ] No TypeScript errors
- **Time**: 30 min
- **Complexity**: Medium

### TASK-211: Verify CLI Runs

- **ID**: TASK-211
- **User Story**: US-003, US-004
- **Depends On**: TASK-210
- **Files**:
  - `tests/cli.test.js` (create)
- **Acceptance Criteria**:
  - [ ] `fleet status` runs without errors
  - [ ] `fleet setup` runs without errors
  - [ ] `fleet doctor` runs without errors
  - [ ] `fleet services status` runs without errors
  - [ ] Test file verifies all commands
- **Time**: 30 min
- **Complexity**: Medium

### TASK-212: Remove index.cjs

- **ID**: TASK-212
- **User Story**: US-003
- **Depends On**: TASK-211
- **Files**:
  - `cli/index.cjs` (delete)
- **Acceptance Criteria**:
  - [ ] File removed from repository
  - [ ] No references to index.cjs remain
  - [ ] CLI still works via index.ts
- **Time**: 10 min
- **Complexity**: Low

## Phase 3: SQLite Persistence

**Goal**: Implement persistent storage for Squawk coordination system
**Duration**: 4-8 hours (human estimate)
**User Story**: US-005

### TASK-301: Create Database Schema

- **ID**: TASK-301
- **User Story**: US-005
- **Depends On**: TASK-204
- **Files**:
  - `squawk/src/db/schema.sql` (create)
- **Acceptance Criteria**:
  - [ ] Tables: mailboxes, events, cursors, locks, specialists
  - [ ] Indexes for performance
  - [ ] Foreign keys with CASCADE delete
  - [ ] Triggers for updated_at
- **Time**: 45 min
- **Complexity**: Medium

### TASK-302: Create Database Module

- **ID**: TASK-302
- **User Story**: US-005
- **Depends On**: TASK-301
- **Files**:
  - `squawk/src/db/index.ts` (create)
- **Acceptance Criteria**:
  - [ ] getDatabase() returns singleton connection
  - [ ] Database path: ~/.local/share/fleet/squawk.db
  - [ ] WAL mode enabled
  - [ ] Schema initialized on first connection
  - [ ] Type definitions for all entities
- **Time**: 60 min
- **Complexity**: Medium

### TASK-303: Update Mailbox API to Use SQLite

- **ID**: TASK-303
- **User Story**: US-005
- **Depends On**: TASK-302
- **Files**:
  - `squawk/api/index.js` → `squawk/src/api/mailbox.ts` (create)
- **Acceptance Criteria**:
  - [ ] POST /mailbox/append uses SQLite
  - [ ] GET /mailbox/:streamId uses SQLite
  - [ ] Events persist across restarts
- **Time**: 60 min
- **Complexity**: Medium

### TASK-304: Update Cursor API to Use SQLite

- **ID**: TASK-304
- **User Story**: US-005
- **Depends On**: TASK-302
- **Files**:
  - `squawk/src/api/cursor.ts` (create)
- **Acceptance Criteria**:
  - [ ] POST /cursor/advance uses SQLite
  - [ ] GET /cursor/:cursorId uses SQLite
  - [ ] Cursor positions persist across restarts
- **Time**: 45 min
- **Complexity**: Medium

### TASK-305: Update Lock API to Use SQLite

- **ID**: TASK-305
- **User Story**: US-005
- **Depends On**: TASK-302
- **Files**:
  - `squawk/src/api/lock.ts` (create)
- **Acceptance Criteria**:
  - [ ] POST /lock/acquire uses SQLite
  - [ ] POST /lock/release uses SQLite
  - [ ] GET /locks uses SQLite
  - [ ] Locks persist across restarts
  - [ ] Lock timeout cleanup implemented
- **Time**: 60 min
- **Complexity**: Medium

### TASK-306: Test Persistence Across Restarts

- **ID**: TASK-306
- **User Story**: US-005
- **Depends On**: TASK-303, TASK-304, TASK-305
- **Files**:
  - `tests/squawk-persistence.test.js` (create)
- **Acceptance Criteria**:
  - [ ] Create mailbox, restart server, verify mailbox exists
  - [ ] Create cursor, restart server, verify cursor position
  - [ ] Create lock, restart server, verify lock exists
  - [ ] All tests pass
- **Time**: 45 min
- **Complexity**: Medium

### TASK-307: Implement Lock Timeout

- **ID**: TASK-307
- **User Story**: US-005
- **Depends On**: TASK-305
- **Files**:
  - `squawk/src/api/lock.ts` (modify)
- **Acceptance Criteria**:
  - [ ] Background job checks for expired locks
  - [ ] Expired locks auto-released
  - [ ] Timeout configurable (default 30s)
  - [ ] Test verifies timeout behavior
- **Time**: 45 min
- **Complexity**: Medium

## Phase 4: Server Consolidation

**Goal**: Create single Express server combining Flightline and Squawk APIs
**Duration**: 4-8 hours (human estimate)
**User Story**: US-006

### TASK-401: Create Consolidated Server Entry

- **ID**: TASK-401
- **User Story**: US-006
- **Depends On**: TASK-305
- **Files**:
  - `server/api/src/index.ts` (create)
- **Acceptance Criteria**:
  - [ ] Express server with JSON middleware
  - [ ] Health endpoint at /health
  - [ ] Port configurable via PORT env var
  - [ ] Graceful shutdown handling
- **Time**: 45 min
- **Complexity**: Medium

### TASK-402: Migrate Flightline Work Orders

- **ID**: TASK-402
- **User Story**: US-006
- **Depends On**: TASK-401
- **Files**:
  - `server/api/src/flightline/work-orders.ts` (create)
- **Acceptance Criteria**:
  - [ ] All work order endpoints migrated
  - [ ] CRUD operations work
  - [ ] File-based storage preserved
- **Time**: 45 min
- **Complexity**: Medium

### TASK-403: Migrate Flightline CTK

- **ID**: TASK-403
- **User Story**: US-006
- **Depends On**: TASK-401
- **Files**:
  - `server/api/src/flightline/ctk.ts` (create)
- **Acceptance Criteria**:
  - [ ] All CTK endpoints migrated
  - [ ] Reserve/release work
  - [ ] File-based storage preserved
- **Time**: 30 min
- **Complexity**: Low

### TASK-404: Migrate Flightline Tech Orders

- **ID**: TASK-404
- **User Story**: US-006
- **Depends On**: TASK-401
- **Files**:
  - `server/api/src/flightline/tech-orders.ts` (create)
- **Acceptance Criteria**:
  - [ ] All tech order endpoints migrated
  - [ ] CRUD operations work
- **Time**: 30 min
- **Complexity**: Low

### TASK-405: Integrate Squawk Routes

- **ID**: TASK-405
- **User Story**: US-006
- **Depends On**: TASK-401, TASK-303, TASK-304, TASK-305
- **Files**:
  - `server/api/src/index.ts` (modify)
- **Acceptance Criteria**:
  - [ ] Squawk routes mounted at /api/v1/
  - [ ] Mailbox, cursor, lock, coordinator endpoints work
  - [ ] SQLite persistence active
- **Time**: 30 min
- **Complexity**: Low

### TASK-406: Add Error Handling Middleware

- **ID**: TASK-406
- **User Story**: US-006
- **Depends On**: TASK-401
- **Files**:
  - `server/api/src/middleware/error-handler.ts` (create)
- **Acceptance Criteria**:
  - [ ] Catches all unhandled errors
  - [ ] Returns consistent error format
  - [ ] Logs errors appropriately
  - [ ] No sensitive data in responses
- **Time**: 30 min
- **Complexity**: Low

### TASK-407: Add Logging Middleware

- **ID**: TASK-407
- **User Story**: US-006
- **Depends On**: TASK-401
- **Files**:
  - `server/api/src/middleware/logger.ts` (create)
- **Acceptance Criteria**:
  - [ ] Logs all requests with method, path, status
  - [ ] Configurable log level
  - [ ] No sensitive data logged
- **Time**: 30 min
- **Complexity**: Low

### TASK-408: Test All Endpoints

- **ID**: TASK-408
- **User Story**: US-006
- **Depends On**: TASK-402, TASK-403, TASK-404, TASK-405
- **Files**:
  - `tests/server-api.test.js` (create)
- **Acceptance Criteria**:
  - [ ] Health endpoint returns 200
  - [ ] Work orders CRUD works
  - [ ] CTK reserve/release works
  - [ ] Tech orders CRUD works
  - [ ] Squawk endpoints work
  - [ ] All tests pass
- **Time**: 60 min
- **Complexity**: Medium

## Phase 5: Plugin API Research

**Goal**: Research actual editor plugin APIs and implement working plugins
**Duration**: 4-8 hours (human estimate)
**User Story**: US-007

### TASK-501: Research OpenCode Plugin API

- **ID**: TASK-501
- **User Story**: US-007
- **Depends On**: None (parallel track)
- **Files**:
  - `specs/fleettools-fixes/research-opencode.md` (create)
- **Acceptance Criteria**:
  - [ ] Document actual OpenCode plugin interface
  - [ ] Identify registerCommand signature
  - [ ] Identify showOutput, showError methods
  - [ ] Note any SDK requirements
- **Time**: 60 min
- **Complexity**: Medium

### TASK-502: Research Claude Code Plugin API

- **ID**: TASK-502
- **User Story**: US-007
- **Depends On**: None (parallel track)
- **Files**:
  - `specs/fleettools-fixes/research-claude-code.md` (create)
- **Acceptance Criteria**:
  - [ ] Document actual Claude Code plugin interface
  - [ ] Identify @anthropic-ai/sdk usage
  - [ ] Identify Command class interface
  - [ ] Note any SDK requirements
- **Time**: 60 min
- **Complexity**: Medium

### TASK-503: Update OpenCode Plugin

- **ID**: TASK-503
- **User Story**: US-007
- **Depends On**: TASK-501, TASK-211
- **Files**:
  - `plugins/opencode/index.js` → `plugins/opencode/src/index.ts` (create)
- **Acceptance Criteria**:
  - [ ] Uses actual OpenCode API (or graceful fallback)
  - [ ] All /fleet commands registered
  - [ ] Error handling improved
  - [ ] TypeScript types added
- **Time**: 60 min
- **Complexity**: Medium

### TASK-504: Update Claude Code Plugin

- **ID**: TASK-504
- **User Story**: US-007
- **Depends On**: TASK-502, TASK-211
- **Files**:
  - `plugins/claude-code/index.js` → `plugins/claude-code/src/index.ts` (create)
- **Acceptance Criteria**:
  - [ ] Uses actual Claude Code API (or graceful fallback)
  - [ ] All /fleet commands registered
  - [ ] Error handling improved
  - [ ] TypeScript types added
- **Time**: 60 min
- **Complexity**: Medium

### TASK-505: Add Graceful Degradation

- **ID**: TASK-505
- **User Story**: US-007
- **Depends On**: TASK-503, TASK-504
- **Files**:
  - `plugins/opencode/src/index.ts` (modify)
  - `plugins/claude-code/src/index.ts` (modify)
- **Acceptance Criteria**:
  - [ ] Plugins work even if SDK unavailable
  - [ ] Falls back to CLI wrapper approach
  - [ ] Logs warning if API unavailable
- **Time**: 45 min
- **Complexity**: Medium

### TASK-506: Test Plugins in Editors

- **ID**: TASK-506
- **User Story**: US-007
- **Depends On**: TASK-505
- **Files**:
  - `tests/plugins.test.js` (create)
- **Acceptance Criteria**:
  - [ ] OpenCode plugin loads without errors
  - [ ] Claude Code plugin loads without errors
  - [ ] /fleet status works in both
  - [ ] /fleet setup works in both
  - [ ] /fleet doctor works in both
- **Time**: 45 min
- **Complexity**: Medium

### TASK-507: Update Plugin package.json Files

- **ID**: TASK-507
- **User Story**: US-007
- **Depends On**: TASK-503, TASK-504
- **Files**:
  - `plugins/opencode/package.json` (modify)
  - `plugins/claude-code/package.json` (modify)
- **Acceptance Criteria**:
  - [ ] TypeScript build configured
  - [ ] Main entry points to dist/
  - [ ] Dependencies updated
- **Time**: 20 min
- **Complexity**: Low

## Dependencies

### Internal Dependencies

- TASK-101 → TASK-104, TASK-105 (uses execSync)
- TASK-102, TASK-103 → TASK-109 (bug verification)
- TASK-104, TASK-105 → TASK-109 (bug verification)
- TASK-106 → TASK-109 (bug verification)
- TASK-107, TASK-108 → TASK-109 (bug verification)
- TASK-202, TASK-203 → TASK-207 (TypeScript migration)
- TASK-204 → TASK-301 (database schema)
- TASK-207, TASK-209 → TASK-210 (build)
- TASK-210 → TASK-211 (verification)
- TASK-211 → TASK-503, TASK-504 (plugin updates)
- TASK-301 → TASK-302 (database module)
- TASK-302 → TASK-303, TASK-304, TASK-305 (SQLite APIs)
- TASK-303, TASK-304, TASK-305 → TASK-306 (testing)
- TASK-305 → TASK-307 (lock timeout)
- TASK-401 → TASK-402, TASK-403, TASK-404 (route migration)
- TASK-401 → TASK-406, TASK-407 (middleware)
- TASK-402, TASK-403, TASK-404, TASK-405 → TASK-408 (testing)
- TASK-501 → TASK-503 (plugin update based on research)
- TASK-502 → TASK-504 (plugin update based on research)

### External Dependencies

- node >= 18.0.0
- better-sqlite3 >= 9.2.0
- express >= 4.18.0
- commander >= 12.0.0
- yaml >= 2.3.0
- typescript >= 5.3.0

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Plugin APIs don't exist as expected | High | Medium | Use CLI wrapper fallback (TASK-505) |
| SQLite native module build fails | High | Low | Use better-sqlite3 prebuilds, document Node version |
| TypeScript migration breaks existing functionality | Medium | Medium | Keep index.cjs until TASK-211 verified |
| Workspace npm install conflicts | Medium | Low | Pin dependency versions, use npm workspaces correctly |
| Server consolidation breaks existing integrations | Medium | Low | Keep old APIs running during migration, test thoroughly |

## Testing Plan

### Unit Tests

| Test File | Coverage | Tasks |
|-----------|----------|-------|
| `tests/bug-fixes.test.js` | All 8 bug fixes | TASK-109 |
| `tests/cli.test.js` | CLI commands | TASK-211 |
| `tests/squawk-persistence.test.js` | SQLite persistence | TASK-306 |
| `tests/server-api.test.js` | All API endpoints | TASK-408 |
| `tests/plugins.test.js` | Plugin loading | TASK-506 |

### Integration Tests

- CLI → API integration (via TASK-211)
- Plugin → CLI integration (via TASK-506)
- SQLite persistence across restarts (via TASK-306)

### Manual Tests

- Full installation flow: `npm install` → `npm run build` → `fleet status`
- Work order CRUD flow via API
- Squawk coordination flow via API
- Service start/stop flow: `fleet services up/down`

### Spec Validation

- [ ] All user stories have corresponding tasks
- [ ] All spec acceptance criteria are covered by task acceptance criteria
- [ ] Non-functional requirements are addressed in implementation

## Rollback Plan

1. **Build System Issues**: Run `git checkout -- package.json cli/` to restore previous state
2. **TypeScript Compilation**: Keep `cli/index.cjs` as fallback until TASK-211 passes
3. **Database Migration**: SQLite creates new file; old in-memory data lost on restart (acceptable for MVP)
4. **Server Consolidation**: Keep `flightline/api.js` and `squawk/api/index.js` until TASK-408 passes

## Files to Create/Modify

### New Files

```
package.json                              # Root monorepo config
cli/tsconfig.json                         # CLI TypeScript config
squawk/package.json                       # Squawk package config
squawk/tsconfig.json                      # Squawk TypeScript config
squawk/src/db/schema.sql                  # Database schema
squawk/src/db/index.ts                    # Database module
squawk/src/api/mailbox.ts                 # Mailbox API
squawk/src/api/cursor.ts                  # Cursor API
squawk/src/api/lock.ts                    # Lock API
server/api/src/index.ts                   # Consolidated server
server/api/src/flightline/work-orders.ts  # Work orders routes
server/api/src/flightline/ctk.ts          # CTK routes
server/api/src/flightline/tech-orders.ts  # Tech orders routes
server/api/src/middleware/error-handler.ts # Error middleware
server/api/src/middleware/logger.ts       # Logging middleware
plugins/opencode/src/index.ts             # OpenCode plugin (TS)
plugins/claude-code/src/index.ts          # Claude Code plugin (TS)
tests/bug-fixes.test.js                   # Bug fix tests
tests/cli.test.js                         # CLI tests
tests/squawk-persistence.test.js          # Persistence tests
tests/server-api.test.js                  # API tests
tests/plugins.test.js                     # Plugin tests
specs/fleettools-fixes/research-opencode.md    # Research doc
specs/fleettools-fixes/research-claude-code.md # Research doc
```

### Modified Files

```
cli/package.json                          # Fix bin path, add deps
cli/index.ts                              # Add sync functions
squawk/api/index.js                       # Bug fixes (then migrate)
plugins/opencode/index.js                 # Bug fix (then migrate)
plugins/claude-code/index.js              # Bug fix (then migrate)
plugins/opencode/package.json             # TypeScript config
plugins/claude-code/package.json          # TypeScript config
server/api/package.json                   # Update for TypeScript
```

### Deleted Files

```
cli/index.cjs                             # After migration verified
```

## Timeline Estimate

| Phase | Human Days | Human Hours | Agentic (est.) |
|-------|------------|-------------|----------------|
| Phase 1: Critical Bugs | 0.25-0.5 | 2-4 | ~30 min |
| Phase 2: Build System | 0.5-1 | 4-8 | ~1 hour |
| Phase 3: SQLite | 0.5-1 | 4-8 | ~1 hour |
| Phase 4: Server | 0.5-1 | 4-8 | ~1 hour |
| Phase 5: Plugins | 0.5-1 | 4-8 | ~1 hour |
| **Total** | **2.25-4.5** | **18-36** | **~4.5 hours** |

## References

- Specification: specs/fleettools-fixes/spec.md
- Research: specs/fleettools-fixes/research-opencode.md, research-claude-code.md
- Original CLI: cli/index.cjs, cli/index.ts
- Original APIs: squawk/api/index.js, flightline/api.js
- Plugins: plugins/opencode/index.js, plugins/claude-code/index.js

---

**Status**: Ready for Execution
**Confidence**: 0.90
**Last Updated**: 2026-01-03
**Plan Version**: 1.0.0
