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

## Phase 3: Context Survival System

**Goal**: Implement automatic checkpointing and seamless recovery to survive context compaction
**Duration**: 4-8 hours (human estimate)
**User Story**: US-005 (extended for context survival)

### TASK-301: Automatic Progress Checkpointing (25%, 50%, 75%)

- **ID**: TASK-301
- **User Story**: US-301
- **Depends On**: TASK-307 (SQLite persistence complete)
- **Files**:
  - `squawk/src/checkpointing/progress-checkpoint.ts` (create)
- - `server/api/src/checkpoints/routes.ts` (create)
- **Acceptance Criteria**:
  - [ ] Checkpoint created when mission reaches 25% completion
  - [ ] Checkpoint created when mission reaches 50% completion
  - [ ] Checkpoint created when mission reaches 75% completion
  - [ ] Progress calculated as completed_sorties/total_sorties * 100
  - [ ] Checkpoint includes all active sortie states
  - [ ] Checkpoint includes all held file locks
  - [ ] Checkpoint includes all pending mailbox messages
  - [ ] `fleet_checkpointed` event emitted on checkpoint creation
- **Time**: 60 min
- **Complexity**: Medium

### TASK-302: Error-Triggered Checkpointing

- **ID**: TASK-302
- **User Story**: US-302
- **Depends On**: TASK-301
- **Files**:
  - `squawk/src/checkpointing/error-checkpoint.ts` (modify)
- **Acceptance Criteria**:
  - [ ] Checkpoint created on unhandled exception in sortie execution
  - [ ] Checkpoint created on API error (4xx/5xx responses)
  - [ ] Checkpoint created on lock acquisition timeout
  - [ ] Checkpoint created on message delivery failure
  - [ ] Error details captured in recovery_context.blockers
  - [ ] Checkpoint trigger marked as "error"
- **Time**: 45 min
- **Complexity**: Medium

### TASK-303: Manual Checkpoint Command

- **ID**: TASK-303
- **User Story**: US-303
- **Depends On**: TASK-307
- **Files**:
  - `cli/index.ts` (add command)
  - `cli/src/commands/checkpoint.ts` (create)
- **Acceptance Criteria**:
  - [ ] `fleet checkpoint` CLI command creates checkpoint
  - [ ] `fleet checkpoint --mission <id>` targets specific mission
  - [ ] `fleet checkpoint --note "description"` adds context
  - [ ] Checkpoint trigger marked as "manual"
  - [ ] Command returns checkpoint ID for reference
  - [ ] Works in both local and synced modes
- **Time**: 30 min
- **Complexity**: Low

### TASK-304: Context Compaction Detection

- **ID**: TASK-304
- **User Story**: US-304
- **Depends On**: TASK-301, TASK-302
- **Files**:
  - `squawk/src/checkpointing/compaction-detection.ts` (create)
  - `server/api/src/checkpoints/compaction.ts` (create)
- **Acceptance Criteria**:
  - [ ] On agent startup, check for active missions without completion
  - [ ] Detect missions with status = "in_progress" and no recent activity
  - [ ] Activity threshold: no events in last 5 minutes
  - [ ] Prompt user with recovery option if checkpoint exists
  - [ ] `context_compacted` event emitted when compaction detected
  - [ ] Support --auto-resume flag for non-interactive recovery
- **Time**: 45 min
- **Complexity**: Medium

### TASK-305: Checkpoint Recovery Flow

- **ID**: TASK-305
- **User Story**: US-305
- **Depends On**: TASK-304
- **Files**:
  - `cli/index.ts` (add recovery command)
  - `squawk/src/checkpointing/recovery.ts` (create)
- **Acceptance Criteria**:
  - [ ] Checkpoint loaded and context restored
  - [ ] `fleet_recovered` event emitted
  - [ ] Returns full checkpoint context
  - [ ] Marks checkpoint as consumed (optional)
  - [ ] Restores active sorties, held locks, pending messages
  - [ ] Updates specialist status to active
- **Time**: 60 min
- **Complexity**: Medium

### TASK-306: Checkpoint API Endpoints

- **ID**: TASK-306
- **User Story**: US-301, US-302, US-303, US-305
- **Depends On**: TASK-302, TASK-303, TASK-305
- **Files**:
  - `server/api/src/checkpoints/routes.ts` (modify)
- **Acceptance Criteria**:
  - [ ] POST /api/v1/checkpoints creates checkpoint
  - [ ] GET /api/v1/checkpoints/:id retrieves checkpoint
  - [ ] POST /api/v1/checkpoints/:id/recover triggers recovery
  - [ ] Checkpoints persist across restarts
  - [ ] Error handling for invalid IDs
  - [ ] Checkpoint TTL expiration handled
- **Time**: 45 min
- **Complexity**: Medium

### TASK-307: Test Checkpoint/Resume Cycle

- **ID**: TASK-307
- **User Story**: All Phase 3 stories
- **Depends On**: TASK-306
- **Files**:
  - `tests/integration/checkpointing.test.ts` (create)
- **Acceptance Criteria**:
  - [ ] Test automatic progress checkpointing at 25%, 50%, 75%
  - [ ] Test error-triggered checkpointing
  - [ ] Test manual checkpoint command
  - [ ] Test context compaction detection
  - [ ] Test checkpoint recovery flow
  - [ ] Verify state is correctly restored
  - [ ] Verify held locks and pending messages restored
  - [ ] All tests pass
- **Time**: 60 min
- **Complexity**: Medium

---

## Phase 4: Task Decomposition System

**Goal**: Implement intelligent task decomposition with LLM planner
**Duration**: 4-8 hours (human estimate)
**User Stories**: US-001 to US-005 (from phase4 spec)

### TASK-401: Create LLM Planner Module

- **ID**: TASK-401
- **User Story**: US-001
- **Depends On**: TASK-307 (SQLite persistence)
- **Files**:
  - `dispatch/planner/llm-planner.ts` (create)
  - `dispatch/planner/schemas.ts` (create)
- **Acceptance Criteria**:
  - [ ] LLM planner accepts natural language task description
  - [ ] Analyzes codebase context (files, patterns)
  - [ ] Generates SortieTree with missions and sorties
  - [ ] Validates decomposition (conflicts, dependencies)
  - [ ] Supports multiple strategies (file-based, feature-based, risk-based)
  - [ ] Returns estimated complexity per sortie
- **Time**: 90 min
- **Complexity**: High

### TASK-402: Implement Strategy Auto-Detection

- **ID**: TASK-402
- **User Story**: US-001
- **Depends On**: TASK-401
- **Files**:
  - `dispatch/planner/strategy-selector.ts` (create)
- **Acceptance Criteria**:
  - [ ] Auto-detects strategy from task keywords
  - [ ] Keyword mapping: refactor, migrate, rename → file-based
  - [ ] Keyword mapping: add, implement, build, create → feature-based
  - [ ] Keyword mapping: fix, bug, security, critical → risk-based
  - [ ] Allows manual strategy override
  - [ ] Falls back to default strategy if no match
- **Time**: 60 min
- **Complexity**: Medium

### TASK-403: Create `/fleet decompose` CLI Command

- **ID**: TASK-403
- **User Story**: US-002
- **Depends On**: TASK-401, TASK-402
- **Files**:
  - `cli/index.ts` (add command)
  - `cli/src/commands/decompose.ts` (create)
- **Acceptance Criteria**:
  - [ ] CLI accepts task description as positional argument
  - [ ] --strategy flag allows manual strategy override
  - [ ] --dry-run flag shows plan without creating files
  - [ ] --json flag outputs machine-readable format
  - [ ] Mission ID is returned for tracking
  - [ ] Creates mission and sorties in Flightline
- **Time**: 45 min
- **Complexity**: Low

### TASK-404: Create Decomposition API Endpoint

- **ID**: TASK-404
- **User Story**: US-003
- **Depends On**: TASK-401, TASK-403
- **Files**:
  - `server/api/src/decomposition/routes.ts` (create)
- **Acceptance Criteria**:
  - [ ] API accepts task description and optional strategy
  - [ ] Returns complete SortieTree with mission and sortie IDs
  - [ ] Validation errors return 400 with specific error messages
  - [ ] Created mission is immediately queryable via GET endpoints
  - [ ] Integration with LLM planner
- **Time**: 60 min
- **Complexity**: Medium

### TASK-405: Implement File-Based Decomposition

- **ID**: TASK-405
- **User Story**: US-001 (file-based strategy)
- **Depends On**: TASK-401
- **Files**:
  - `dispatch/planner/strategies/file-based.ts` (create)
- **Acceptance Criteria**:
  - [ ] Analyzes files for pattern changes
  - [ ] Groups related files into sorties
  - [ ] One sortie per file group
  - [ ] High parallelization (independent file groups)
  - [ ] Validates file conflicts via CTK
  - [ ] Estimates complexity based on file count and size
- **Time**: 90 min
- **Complexity**: Medium

### TASK-406: Implement Feature-Based Decomposition

- **ID**: TASK-406
- **User Story**: US-001 (feature-based strategy)
- **Depends On**: TASK-401
- **Files**:
  - `dispatch/planner/strategies/feature-based.ts` (create)
- **Acceptance Criteria**:
  - [ ] Decomposes features into vertical slices
  - [ ] Groups by architectural layer (API, UI, database)
  - [ ] Medium parallelization (layer dependencies)
  - [ ] Estimates complexity based on feature depth
  - [ ] Validates dependencies between layers
- **Time**: 75 min
- **Complexity**: Medium

### TASK-407: Implement Risk-Based Decomposition

- **ID**: TASK-407
- **User Story**: US-001 (risk-based strategy)
- **Depends On**: TASK-401
- **Files**:
  - `dispatch/planner/strategies/risk-based.ts` (create)
- **Acceptance Criteria**:
  - [ ] Sequential execution for critical fixes
  - [ ] Low priority for bug fixes
  - [ ] Careful review for security changes
  - [ ] Validation of security implications
  - [ ] Low parallelization (sequential order)
- **Time**: 60 min
- **Complexity**: Low

### TASK-408: Implement Strategy Selection Algorithm

- **ID**: TASK-408
- **User Story**: US-001
- **Depends On**: TASK-405, TASK-406, TASK-407
- **Files**:
  - `dispatch/planner/strategy-selector.ts` (modify)
- **Acceptance Criteria**:
  - [ ] Evaluates task type and keywords
  - [ ] Selects appropriate strategy (file, feature, risk)
  - [ ] Allows manual override
  - [ ] Returns strategy rationale
  - [ ] Integrates with all strategy implementations
- **Time**: 45 min
- **Complexity**: Medium

### TASK-409: Add Dependency Management for Sorties

- **ID**: TASK-409
- **User Story**: US-001 (dependency validation)
- **Depends On**: TASK-401
- **Files**:
  - `dispatch/planner/dependencies.ts` (create)
- **Acceptance Criteria**:
  - [ ] Analyzes SortieTree for dependencies
  - [ ] Assigns topological order
  - [ ] Sequential execution for dependent sorties
  - [ ] Parallel execution for independent sorties
  - [ ] Detects circular dependencies
  - [ ] Validates all dependencies exist
- **Time**: 60 min
- **Complexity**: High

### TASK-410: Validate Decompositions

- **ID**: TASK-410
- **User Story**: US-001 (validation)
- **Depends On**: TASK-409
- **Files**:
  - `dispatch/planner/validation.ts` (create)
- **Acceptance Criteria**:
  - [ ] Catches file conflicts (overlapping files)
  - [ ] Validates dependency chains
  - [ ] Detects missing dependencies
  - [ ] Validates estimated complexity
  - [ ] Returns specific error messages
  - [ ] Blocks invalid decompositions
- **Time**: 45 min
- **Complexity**: Medium

### TASK-411: Record Decomposition Patterns for Learning

- **ID**: TASK-411
- **User Story**: US-005 (learning integration)
- **Depends On**: TASK-401, TASK-410
- **Files**:
  - `dispatch/learning.ts` (create)
- **Acceptance Criteria**:
  - [ ] `decomposition_generated` event is emitted with full context
  - [ ] Successful mission completions update pattern confidence
  - [ ] Failed decompositions are flagged for review
  - [ ] Tech Orders can be created from successful patterns
  - [ ] Records strategy used and effectiveness
- **Time**: 60 min
- **Complexity**: Medium

### TASK-412: Create Mission/Sortie in Flightline

- **ID**: TASK-412
- **User Story**: All Phase 4 stories
- **Depends On**: TASK-403, TASK-411
- **Files**:
  - `flightline/missions/manifest.ts` (modify)
  - `flightline/sorties/manifest.ts` (modify)
- **Acceptance Criteria**:
  - [ ] Mission manifest created from SortieTree
  - [ ] Sortie manifests created for each sortie
  - [ ] Git-backed in .flightline/ directory
  - [ ] Dependencies recorded in manifests
  - [ ] Can be queried via Flightline APIs
- **Time**: 45 min
- **Complexity**: Low

---

## Phase 5: Parallel Agent Spawning System

**Goal**: Implement dispatch coordination and parallel specialist spawning
**Duration**: 4-8 hours (human estimate)
**User Stories**: US-501, US-502 (from phase5 spec)

### TASK-501: Create Dispatch Coordinator Agent

- **ID**: TASK-501
- **User Story**: US-501
- **Depends On**: TASK-401 (LLM planner)
- **Files**:
  - `dispatch/coordinator.ts` (create)
  - `dispatch/coordinator/schema.ts` (create)
- **Acceptance Criteria**:
  - [ ] Dispatch reads Mission manifest and identifies all Sorties
  - [ ] Dispatch spawns one Specialist per Sortie using native Task tool
  - [ ] Independent Sorties spawn in parallel (same message)
  - [ ] Dependent Sorties spawn sequentially (await previous completion)
  - [ ] Each Specialist receives complete prompt with identity, task, and contract
  - [ ] `specialist_spawned` event emitted for each spawn
  - [ ] Dispatch tracks all active Specialists in SQLite
- **Time**: 90 min
- **Complexity**: High

### TASK-502: Implement Task Tool Integration

- **ID**: TASK-502
- **User Story**: US-501
- **Depends On**: TASK-501
- **Files**:
  - `dispatch/task-tool.ts` (create)
- **Acceptance Criteria**:
  - [ ] Uses Bun Task API to spawn specialists
  - [ ] Creates isolated environment for each specialist
  - [ ] Passes task context as arguments
  - [ ] Captures stdout/stderr for progress tracking
  - [ ] Returns specialist PID for monitoring
  - [ ] Handles process cleanup on completion
- **Time**: 60 min
- **Complexity**: Medium

### TASK-503: Implement Parallel Sorties Spawning

- **ID**: TASK-503
- **User Story**: US-501 (parallel execution)
- **Depends On**: TASK-501, TASK-502
- **Files**:
  - `dispatch/spawning/parallel-spawner.ts` (create)
- **Acceptance Criteria**:
  - [ ] Identifies independent sorties from mission
  - [ ] Spawns all independent sorties simultaneously
  - [ ] Tracks all active specialists
  - [ ] Reports spawning status to Dispatch
  - [ ] Handles spawning failures with retries
  - [ ] Emits `specialist_spawned` events
- **Time**: 75 min
- **Complexity**: High

### TASK-504: Implement Sequential Dependency Handling

- **ID**: TASK-504
- **User Story**: US-501 (sequential coordination)
- **Depends On**: TASK-503
- **Files**:
  - `dispatch/spawning/sequential-handler.ts` (create)
- **Acceptance Criteria**:
  - [ ] Identifies dependency chains in SortieTree
  - [ ] Awaits parent sortie completion before spawning child
  - [ ] Passes results to dependent sorties
  - [ ] Handles failure propagation (parent fail → children cancel)
  - [ ] Emits events for dependency transitions
- **Time**: 60 min
- **Complexity**: Medium

### TASK-505: Create Progress Tracking System

- **ID**: TASK-505
- **User Story**: US-501 (progress tracking)
- **Depends On**: TASK-503, TASK-504
- **Files**:
  - `dispatch/progress/tracker.ts` (create)
- **Acceptance Criteria**:
  - [ ] Real-time visibility into Specialist status
  - [ ] Tracks specialist events (spawned, completed, failed)
  - [ ] Tracks sortie progress events (started, progress, completed)
  - [ ] Aggregates progress at mission level
  - [ ] Calculates completion percentage
  - [ ] Detects blocked specialists
- **Time**: 75 min
- **Complexity**: Medium

### TASK-506: Implement Blocker Detection and Handling

- **ID**: TASK-506
- **User Story**: US-501 (blocker handling)
- **Depends On**: TASK-505
- **Files**:
  - `dispatch/blocking/handler.ts` (create)
- **Acceptance Criteria**:
  - [ ] Detects when specialist is blocked
  - [ ] Identifies blocker type (sortie, specialist, external, resource)
  - [ ] Logs blocking details
  - [ ] Attempts automatic resolution (retry, escalate)
  - [ ] Emits `sortie_blocked` event
  - [ ] Updates sortie status
- **Time**: 60 min
- **Complexity**: Medium

### TASK-507: Implement CTK File Locking Integration

- **ID**: TASK-507
- **User Story**: US-501 (file coordination)
- **Depends On**: TASK-505
- **Files**:
  - `dispatch/ctk/integration.ts` (create)
- **Acceptance Criteria**:
  - [ ] Specialist calls fleet_reserve with file list before editing
  - [ ] CTK creates locks for all files atomically
  - [ ] Locks held throughout specialist execution
  - [ ] Locks released on specialist completion/error
  - [ ] Conflicts detected and reported
  - [ ] Prevents file overlap between concurrent sorties
- **Time**: 45 min
- **Complexity**: Medium

### TASK-508: Implement Review Process for Completed Sorties

- **ID**: TASK-508
- **User Story**: US-501 (review process)
- **Depends On**: TASK-505, TASK-507
- **Files**:
  - `dispatch/review/validator.ts` (create)
- **Acceptance Criteria**:
  - [ ] Review created for completed sortie
  - [ ] Reviewer specialist assigned
  - [ ] Emits `review_started` event
  - [ ] Returns review ID
  - [ ] Validates work before mission completion
  - [ ] Review can approve, reject, or request changes
- **Time**: 60 min
- **Complexity**: Medium

### TASK-509: Track Active Specialists in SQLite

- **ID**: TASK-509
- **User Story**: US-501
- **Depends On**: TASK-503, TASK-505, TASK-508
- **Files**:
  - `squawk/src/db/specialists-tracker.ts` (create)
  - `server/api/src/specialists/routes.ts` (modify)
- **Acceptance Criteria**:
  - [ ] Specialists registered on spawn
  - [ ] Heartbeats update last_seen timestamp
  - [ ] Status tracked (active, busy, idle, completed)
  - [ ] Current sortie stored
  - [ ] Metrics recorded (memory, uptime)
  - [ ] Queryable via Squawk API
- **Time**: 45 min
- **Complexity**: Medium

### TASK-510: Handle Specialist Completion/Error

- **ID**: TASK-510
- **User Story**: US-502 (specialist lifecycle)
- **Depends On**: TASK-509
- **Files**:
  - `dispatch/lifecycle/completion-handler.ts` (create)
- **Acceptance Criteria**:
  - [ ] Specialist marked as completed on success
  - [ ] Emits `specialist_completed` event
  - [ ] All locks released
  - [ ] Final checkpoint created
  - [ ] Handles error/failure cases
  - [ ] Updates mission status
  - [ ] Notifies Dispatch coordinator
- **Time**: 60 min
- **Complexity**: Medium

### TASK-511: Implement specialist_spawned Event Emitter

- **ID**: TASK-511
- **User Story**: All Phase 5 stories
- **Depends On**: TASK-501
- **Files**:
  - `squawk/src/events/specialist-spawned.ts` (create)
- **Acceptance Criteria**:
  - [ ] Event emitted on each specialist spawn
  - [ ] Includes specialist ID, name, spawned_by, mission_id, sortie_id
  - [ ] Includes specialist config
  - [ ] Recorded in SQLite events table
  - [ ] Proper causation chain maintained
- **Time**: 30 min
- **Complexity**: Low

### TASK-512: Implement specialist_completed Event Emitter

- **ID**: TASK-512
- **User Story**: US-502
- **Depends On**: TASK-510
- **Files**:
  - `squawk/src/events/specialist-completed.ts` (create)
- **Acceptance Criteria**:
  - [ ] Event emitted on specialist completion
  - [ ] Includes specialist ID, reason, final_checkpoint_id
  - [ ] Includes summary of work done
  - [ ] Includes duration metrics
  - [ ] Recorded in SQLite events table
- **Time**: 30 min
- **Complexity**: Low

---

## Phase 6: Integration Testing

**Goal**: Comprehensive end-to-end testing of fleet coordination workflow
**Duration**: 4-8 hours (human estimate)
**Note**: Phase 6 spec does not exist - these tasks fill the gap

### TASK-601: Create Phase 6 Spec Document

- **ID**: TASK-601
- **User Story**: Fill missing spec gap
- **Depends On**: None
- **Files**:
  - `specs/phase6-integration-testing/spec.md` (create)
- **Acceptance Criteria**:
  - [ ] Comprehensive spec document created
  - [ ] Includes end-to-end workflow scenarios
  - [ ] Covers all previous phases integration
  - [ ] Includes test strategy and coverage goals
  - [ ] Matches spec format of other phases
- **Time**: 30 min
- **Complexity**: Low

### TASK-602: Create tests/e2/ Directory

- **ID**: TASK-602
- **User Story**: Phase 6 E2 tests
- **Depends On**: TASK-601
- **Files**:
  - `tests/e2/` (create directory)
  - `tests/e2/coordination.test.ts` (create)
- **Acceptance Criteria**:
  - [ ] Tests spawn coordinator with multiple specialists
  - [ ] Tests parallel sortie execution
  - [ ] Tests dependency handling
  - [ ] Tests progress tracking
  - [ ] Tests blocker detection
  - [ ] Tests error recovery
  - [ ] Directory structure matches E2 test conventions
- **Time**: 60 min
- **Complexity**: Medium

### TASK-603: Create tests/e3/ Directory

- **ID**: TASK-603
- **User Story**: Phase 6 E3 tests
- **Depends On**: TASK-601
- **Files**:
  - `tests/e3/` (create directory)
  - `tests/e3/full-workflow.test.ts` (create)
- **Acceptance Criteria**:
  - [ ] Tests complete fleet coordination workflow
  - [ ] Tests mission → sorties → specialists → completion cycle
  - [ ] Tests checkpoint/resume across context compaction
  - [ ] Tests task decomposition and spawning
  - [ ] Tests lock conflict resolution
  - [ ] Directory structure matches E3 test conventions
- **Time**: 90 min
- **Complexity**: High

### TASK-604: Write End-to-End Coordination Workflow Test

- **ID**: TASK-604
- **User Story**: Phase 6
- **Depends On**: TASK-603
- **Files**:
  - `tests/e3/full-workflow.test.ts` (modify)
- **Acceptance Criteria**:
  - [ ] Creates mission via decomposition
  - [ ] Spawns parallel specialists
  - [ ] Tracks progress through completion
  - [ ] Handles errors and recovery
  - [ ] Verifies all events emitted
  - [ ] Validates final state in SQLite
  - [ ] Tests run and pass consistently
- **Time**: 120 min
- **Complexity**: High

### TASK-605: Test Specialist Spawning Parallelism

- **ID**: TASK-605
- **User Story**: Phase 6
- **Depends On**: TASK-602
- **Files**:
  - `tests/e2/parallelism.test.ts` (create)
- **Acceptance Criteria**:
  - [ ] Tests independent sorties spawn simultaneously
  - [ ] Measures spawn performance
  - [ ] Tests resource limits
  - [ ] Verifies no race conditions
  - [ ] Confirms task tool integration works correctly
- **Time**: 60 min
- **Complexity**: Medium

### TASK-606: Test Checkpoint/Resume Cycle

- **ID**: TASK-606
- **User Story**: Phase 6
- **Depends On**: TASK-602
- **Files**:
  - `tests/e3/checkpointing.test.ts` (create)
- **Acceptance Criteria**:
  - [ ] Tests automatic progress checkpointing
  - [ ] Tests error-triggered checkpointing
  - [ ] Tests manual checkpoint command
  - [ ] Tests context compaction detection
  - [ ] Tests checkpoint recovery flow
  - [ ] Verifies state is correctly restored
  - [ ] Verifies held locks and pending messages restored
  - [ ] Tests run and pass consistently
- **Time**: 90 min
- **Complexity**: Medium

### TASK-607: Test Task Decomposition Flow

- **ID**: TASK-607
- **User Story**: Phase 6
- **Depends On**: TASK-602
- **Files**:
  - `tests/e2/decomposition.test.ts` (create)
- **Acceptance Criteria**:
  - [ ] Tests LLM planner with various task descriptions
  - [ ] Tests strategy auto-detection
  - [ ] Tests all decomposition strategies
  - [ ] Tests CLI decompose command
  - [ ] Tests API decomposition endpoint
  - [ ] Validates SortieTree generation
  - [ ] Tests run and pass consistently
- **Time**: 75 min
- **Complexity**: High

### TASK-608: Test Lock Conflict Resolution

- **ID**: TASK-608
- **User Story**: Phase 6
- **Depends On**: TASK-605
- **Files**:
  - `tests/e2/locking.test.ts` (create)
- **Acceptance Criteria**:
  - [ ] Tests CTK lock acquisition
  - [ ] Tests conflict detection (concurrent file access)
  - [ ] Tests lock release
  - [ ] Tests timeout handling
  - [ ] Tests lock recovery after specialist failure
  - [ ] Tests run and pass consistently
- **Time**: 60 min
- **Complexity**: Medium

### TASK-609: Test Mission/Sortie Lifecycle

- **ID**: TASK-609
- **User Story**: Phase 6
- **Depends On**: TASK-603
- **Files**:
  - `tests/e3/lifecycle.test.ts` (create)
- **Acceptance Criteria**:
  - [ ] Tests mission creation and status changes
  - [ ] Tests sortie creation, updates, completion
  - [ ] Tests dependency chain handling
  - [ ] Tests review process
  - [ ] Tests final mission completion
  - [ ] Validates all event emissions
  - [ ] Tests run and pass consistently
- **Time**: 90 min
- **Complexity**: High

### TASK-610: Test Error Handling and Recovery

- **ID**: TASK-610
- **User Story**: Phase 6
- **Depends On**: All Phase 6 tasks
- **Files**:
  - `tests/e3/recovery.test.ts` (create)
- **Acceptance Criteria**:
  - [ ] Tests error-triggered checkpointing
  - [ ] Tests specialist failure handling
  - [ ] Tests mission abort scenarios
  - [ ] Tests context death recovery
  - [ ] Tests rollback procedures
  - [ ] Tests partial failure recovery
  - [ ] Tests run and pass consistently
- **Time**: 75 min
- **Complexity**: High

---

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
- TASK-302 → PH2-008 to PH2-017 (event store & projections)
- PH2-008 to PH2-017 → PH3-001 (SQLite complete)
- PH3-001 to PH3-002 → PH3-003 (checkpointing tasks)
- PH3-003 to PH3-004 → PH3-005 (checkpointing tasks)
- PH3-005 to PH3-006 → PH3-007 (checkpointing tasks)
- PH3-001, PH3-007 → PH4-001 (checkpointing complete)
- PH4-001 → PH4-002 to PH4-003 (LLM planner & strategies)
- PH4-003 → PH4-004 to PH4-011 (decomposition components)
- PH4-008 to PH4-011 → PH4-012 (validation & Flightline integration)
- PH4-001, PH4-012 → PH5-001 to PH5-002 (decomposition complete)
- PH5-001 → PH5-003 to PH5-004 (dispatch & task tool)
- PH5-004 → PH5-005 to PH5-008 (spawning & coordination)
- PH5-005 to PH5-008 → PH5-009 (coordination & progress)
- PH5-008 → PH5-009 to PH5-010 (progress & blockering)
- PH5-009 → PH5-010 to PH5-011 (blockering & CTK integration)
- PH5-010 → PH5-011 to PH5-012 (CTK & review)
- PH5-011 → PH5-012 → PH5-509 (specialist tracking)
- PH5-012 → PH5-509 to PH5-510 (lifecycle handlers)
- PH5-509 → PH5-510, PH5-511 → PH6-001 to PH6-002 (all phases complete)
- PH6-001 → PH6-003 to PH6-010 (spec & E2 tests)
- PH6-003 → PH6-010 (E2 tests complete)
- PH6-010 → All Phase 1-5 tasks (full integration)

### External Dependencies

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
