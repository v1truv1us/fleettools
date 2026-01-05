# P0 Recovery Integration Implementation Plan

**Status**: Draft
**Created**: 2026-01-05
**Specification**: specs/p0-recovery-integration/spec.md
**Estimated Effort**: 16 hours (2 days)
**Complexity**: High

## Overview

This plan implements three critical P0 features that bridge Day 2 (Storage Infrastructure) and Day 3+ (Coordination Logic):

1. **SQLite Migration** - Replace legacy JSON persistence with SQLiteAdapter
2. **Recovery Algorithm** - Implement context compaction detection and state restoration
3. **CLI Checkpoint Commands** - Wire CLI commands to checkpoint storage for manual operations

These features are blocking FleetTools from functioning as a complete fleet coordination system. The current state has storage infrastructure (SQLiteAdapter, CheckpointStorage) but no way to use it for recovery or manual checkpoint operations.

### Technical Approach

**Migration Strategy** (P0-1):
- Create wrapper layer in `squawk/src/db/index.ts` that delegates to SQLiteAdapter
- Maintain backward compatibility with existing API signatures
- On first run, detect and migrate existing JSON data to SQLite
- Rename old JSON to `.backup` after successful migration

**Recovery Detection** (P0-2):
- Implement `RecoveryDetector` class to scan for stale missions
- Configurable activity threshold (default: 5 minutes)
- Emit `context_compacted` event when recovery needed
- Support `--auto-resume` flag for non-interactive scenarios

**State Restoration** (P0-2):
- Implement `StateRestorer` class with transactional recovery
- Restore sortie states, re-acquire locks, requeue messages
- Handle expired locks and lock conflicts gracefully
- Generate recovery context for LLM prompt injection

**CLI Commands** (P0-3):
- Top-level commands: `fleet checkpoint`, `fleet resume`, `fleet checkpoints`
- Support for both local and synced modes
- User-friendly output with JSON options for automation
- Confirmation prompts for destructive operations

## Specification Reference

### User Stories → Tasks Mapping

| User Story | Description | Tasks | Status |
|------------|-------------|--------|--------|
| **US-P0-001** | SQLite Migration | MIG-001, MIG-002, MIG-003, MIG-004 | Pending |
| **US-P0-002** | Recovery Detection | REC-001, REC-002 | Pending |
| **US-P0-003** | State Restoration | REC-003, REC-004, REC-005 | Pending |
| **US-P0-004** | CLI Checkpoint Command | CLI-001, CLI-002 | Pending |
| **US-P0-005** | CLI Resume Command | CLI-003, CLI-004, CLI-005 | Pending |
| **US-P0-006** | CLI Checkpoints List/Show/Prune | CLI-006, CLI-007, CLI-008 | Pending |

### User Story Coverage Validation

**US-P0-001: SQLite Migration**
- All 8 acceptance criteria covered by tasks MIG-001 through MIG-004

**US-P0-002: Recovery Detection**
- All 8 acceptance criteria covered by tasks REC-001 and REC-002

**US-P0-003: State Restoration**
- All 12 acceptance criteria covered by tasks REC-003 through REC-005

**US-P0-004: CLI Checkpoint Command**
- All 9 acceptance criteria covered by tasks CLI-001 and CLI-002

**US-P0-005: CLI Resume Command**
- All 9 acceptance criteria covered by tasks CLI-003 through CLI-005

**US-P0-006: CLI Checkpoints List/Show/Prune**
- All 11 acceptance criteria covered by tasks CLI-006 through CLI-008

## Architecture

### Component Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLI Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  checkpoint  │  │   resume     │  │  checkpoints  │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
└─────────┼──────────────────┼───────────────────┼────────────┘
          │                  │                   │
          └──────────────────┼───────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                    Database Layer                            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │ SQLiteAdapter │   │ Checkpoint    │   │ Recovery     │    │
│  │              │   │ Storage      │   │ Modules      │    │
│  │ - EventOps   │   │              │   │ - Detector   │    │
│  │ - LockOps    │   │ - create()   │   │ - Restorer   │    │
│  │ - CursorOps  │   │ - getById()  │   │              │    │
│  │              │   │ - list()     │   │              │    │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘    │
│         │                    │                    │            │
│         └────────────────────┼────────────────────┘            │
│                              │                            │
│                    ┌─────────▼──────────┐                │
│                    │   SQLite Database   │                │
│                    │   (squawk.db)      │                │
│                    └─────────────────────┘                │
└────────────────────────────────────────────────────────────┘

Data Flow:
1. CLI commands → CheckpointStorage / Recovery Modules
2. Recovery Modules → SQLiteAdapter → Database
3. CheckpointStorage → SQLiteAdapter + File System (dual storage)
4. JSON data (legacy) → Migration → SQLite
```

### Storage Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Dual Storage System                        │
│                                                       │
│  Primary Storage          Backup Storage                 │
│  ┌──────────────┐       ┌──────────────┐           │
│  │   SQLite     │       │  JSON Files   │           │
│  │   Database   │◄────►│  (checkpoints│           │
│  │   (WAL mode) │       │   .json)     │           │
│  └──────────────┘       └──────────────┘           │
│         │                     │                     │
│         └──────────┬──────────┘                    │
│                    │                               │
│         ┌──────────▼──────────┐                    │
│         │  CheckpointStorage   │                    │
│         │  (coordination)     │                    │
│         └─────────────────────┘                    │
└─────────────────────────────────────────────────────────┘

Fallback Logic:
1. Try SQLite first (fast, indexed)
2. Fall back to JSON files if SQLite unavailable
3. Sync writes to both storage systems
4. Validate schema on file load
```

## Phase 1: SQLite Migration (P0-1)

**Goal**: Replace legacy JSON persistence with SQLiteAdapter while maintaining backward compatibility
**Duration**: 4 hours (Day 3 Morning)
**Blocker**: None - can start immediately

### Task 1.1: Create SQLite Migration Wrapper

**ID**: MIG-001
**User Story**: US-P0-001
**Depends On**: None
**Files**:
- `squawk/src/db/index.ts` (rewrite)
- `squawk/src/db/sqlite.ts` (add minimal operations)

**Acceptance Criteria**:
- [ ] `squawk/src/db/index.ts` imports SQLiteAdapter
- [ ] `initializeDatabase()` function created with async initialization
- [ ] `getAdapter()` function throws if not initialized
- [ ] `closeDatabase()` function properly closes connection
- [ ] Wrapper functions delegate to SQLiteAdapter:
  - `mailboxOps.create()` → `adapter.mailboxes.create()`
  - `mailboxOps.getById()` → `adapter.mailboxes.getById()`
  - `mailboxOps.getAll()` → `adapter.mailboxes.getAll()`
  - `eventOps.append()` → `adapter.events.append()`
  - `eventOps.getByMailbox()` → `adapter.events.queryByStream()`
  - `cursorOps.get()` → `adapter.cursors.getByStream()`
  - `cursorOps.advance()` → `adapter.cursors.advance()`
  - `lockOps.acquire()` → `adapter.locks.acquire()`
  - `lockOps.release()` → `adapter.locks.release()`
  - `lockOps.getActive()` → `adapter.locks.getActive()`
  - `lockOps.getByFile()` → `adapter.locks.getByFile()`
- [ ] WAL mode enabled for concurrent access
- [ ] Spec AC: All existing API tests pass without modification

**Time**: 90 minutes
**Complexity**: Medium

### Task 1.2: Implement Data Migration from JSON

**ID**: MIG-002
**User Story**: US-P0-001 (AC: Data migration path exists)
**Depends On**: MIG-001
**Files**:
- `squawk/src/db/index.ts` (add migration logic)

**Acceptance Criteria**:
- [ ] `migrateFromJson()` function implemented
- [ ] Detects legacy JSON file at `~/.local/share/fleet/squawk.json`
- [ ] Parses JSON structure: `{ mailboxes, events, cursors, locks }`
- [ ] Migrates mailboxes → `adapter.mailboxes.create()`
- [ ] Migrates events → `adapter.events.append()`
- [ ] Migrates cursors → `adapter.cursors.create()`
- [ ] Migrates locks (only active ones) → `adapter.locks.acquire()`
- [ ] Skips locks with `released_at` (already released)
- [ ] Wraps migration in transaction for atomicity
- [ ] On success, renames JSON file to `squawk.json.backup`
- [ ] Logs migration summary (counts of each type)
- [ ] Spec AC: Data migration path exists for existing JSON data
- [ ] Spec AC: Old JSON file renamed to `.backup` after successful migration

**Time**: 60 minutes
**Complexity**: Medium

### Task 1.3: Add Minimal Mission Operations

**ID**: MIG-003
**User Story**: US-P0-002 (needs mission queries)
**Depends On**: MIG-001
**Files**:
- `squawk/src/db/sqlite.ts` (add MissionOps)
- `squawk/src/db/schema.sql` (add missions table)

**Acceptance Criteria**:
- [ ] `missions` table added to schema
- [ ] MissionOps implemented with methods:
  - `getByStatus(status: string): Promise<Mission[]>`
  - `getById(id: string): Promise<Mission | null>`
  - `create(input): Promise<Mission>`
  - `update(id, data): Promise<Mission | null>`
- [ ] `getByStatus()` uses parameterized query
- [ ] Index created on `missions.status` for performance
- [ ] Spec AC: Works in both local and synced modes

**Time**: 45 minutes
**Complexity**: Medium

### Task 1.4: Verify Migration and Write Tests

**ID**: MIG-004
**User Story**: US-P0-001 (AC: All 19 existing API tests pass)
**Depends On**: MIG-002
**Files**:
- `tests/integration/migration.test.ts` (create)
- `tests/unit/phase2/operations/migration.test.ts` (create)

**Acceptance Criteria**:
- [ ] Migration tests written (5 tests):
  1. Migrate empty JSON file
  2. Migrate JSON with mailboxes, events, cursors, locks
  3. Handle corrupted JSON gracefully
  4. Skip migration if no JSON file exists
  5. Verify all data migrated correctly (counts match)
- [ ] All 19 existing API tests pass:
  - `tests/unit/db/mailbox.test.ts` (all tests)
  - `tests/unit/db/events.test.ts` (all tests)
  - `tests/unit/db/cursor.test.ts` (all tests)
  - `tests/unit/db/lock.test.ts` (all tests)
- [ ] Spec AC: All 19 existing API tests pass without modification
- [ ] Spec AC: No breaking changes to public API contracts
- [ ] Spec AC: Graceful fallback if SQLite initialization fails

**Time**: 45 minutes
**Complexity**: Low

## Phase 2: Recovery Algorithm (P0-2)

**Goal**: Implement context compaction detection and state restoration
**Duration**: 4 hours (Day 3 Afternoon)
**Blocker**: MIG-003 (needs MissionOps)

### Task 2.1: Implement Recovery Detection

**ID**: REC-001
**User Story**: US-P0-002
**Depends On**: MIG-003
**Files**:
- `squawk/src/recovery/detector.ts` (create)
- `squawk/src/recovery/index.ts` (create)

**Acceptance Criteria**:
- [ ] `RecoveryDetector` class created
- [ ] Constructor accepts database adapter
- [ ] `detectRecoveryCandidates(options)` method:
  - Gets all missions with `status = 'in_progress'`
  - Gets latest event for each mission
  - Calculates inactivity duration
  - Returns missions with inactivity > threshold
- [ ] Default activity threshold: 5 minutes (300000ms)
  - Configurable via `FLEET_ACTIVITY_THRESHOLD_MS` env var
- [ ] `checkForRecovery()` method:
  - Returns `{ needed: boolean, candidates: RecoveryCandidate[] }`
  - Filters to only candidates with checkpoints
- [ ] `RecoveryCandidate` interface includes:
  - `mission_id`, `mission_title`
  - `last_activity_at`, `inactivity_duration_ms`
  - `checkpoint_id`, `checkpoint_progress`, `checkpoint_timestamp`
- [ ] Spec AC: On agent startup, check for active missions without completion
- [ ] Spec AC: Detect missions with `status = "in_progress"` and no recent activity
- [ ] Spec AC: Activity threshold: no events in last 5 minutes (configurable)
- [ ] Spec AC: Prompt user with recovery option if checkpoint exists
- [ ] Spec AC: `context_compacted` event emitted when compaction detected
- [ ] Spec AC: Support `--auto-resume` flag for non-interactive recovery
- [ ] Spec AC: Works in both local and synced modes
- [ ] Spec AC: Returns list of recovery candidates with checkpoint info

**Time**: 90 minutes
**Complexity**: Medium

### Task 2.2: Implement State Restoration

**ID**: REC-003
**User Story**: US-P0-003
**Depends On**: REC-001
**Files**:
- `squawk/src/recovery/restorer.ts` (create)

**Acceptance Criteria**:
- [ ] `StateRestorer` class created
- [ ] Constructor accepts database adapter with full operations
- [ ] `restoreFromCheckpoint(checkpointId, options)` method:
  - Validates checkpoint exists
  - Calls `restore()` with checkpoint data
- [ ] `restoreLatest(missionId, options)` method:
  - Gets latest checkpoint for mission
  - Calls `restore()` with checkpoint data
- [ ] `restore(checkpoint, options)` internal method:
  - **Dry run mode**: Count what would be restored without applying
  - **Full restore**: Transactional restore with rollback on error
- [ ] Restoration logic:
  1. Restore sortie states (status, assigned_to, progress, notes)
  2. Re-acquire locks:
     - Check if lock expired (acquired_at + timeout_ms < now)
     - Skip expired locks (add to warnings)
     - Acquire valid locks, handle conflicts
  3. Requeue pending messages (only undelivered)
  4. Mark checkpoint as consumed
  5. Emit `fleet_recovered` event with stats
- [ ] Lock conflict handling:
  - By default: Add to `recovery_context.blockers`
  - `forceLocks` option: Force-release conflicting locks
  - Log conflicts clearly in errors array
- [ ] `formatRecoveryPrompt(result)` method:
  - Generate LLM-friendly recovery context
  - Includes mission summary, progress, next steps, blockers
  - Includes files modified and time context
  - Includes recovery errors/warnings if present
- [ ] Spec AC: `fleet resume` loads latest checkpoint for active mission
- [ ] Spec AC: `fleet resume --checkpoint <id>` loads specific checkpoint
- [ ] Spec AC: Recovery restores sortie states to checkpoint values
- [ ] Spec AC: Recovery re-acquires file locks that were held (if not expired)
- [ ] Spec AC: Expired locks added to `recovery_context.blockers`
- [ ] Spec AC: Lock conflicts added to `recovery_context.blockers`
- [ ] Spec AC: Recovery context injected into agent prompt
- [ ] Spec AC: `fleet_recovered` event emitted on successful recovery
- [ ] Spec AC: Orphaned locks from crashed agents are released
- [ ] Spec AC: Transaction rollback on partial failure
- [ ] Spec AC: Checkpoint marked as `consumed` after successful recovery

**Time**: 120 minutes
**Complexity**: High

### Task 2.3: Add Helper Methods to SQLiteAdapter

**ID**: REC-002
**User Story**: US-P0-002, US-P0-003
**Depends On**: REC-001
**Files**:
- `squawk/src/db/sqlite.ts` (add helper methods)

**Acceptance Criteria**:
- [ ] `getLatestByStream(type, id)` method in EventOps
- [ ] `beginTransaction()`, `commitTransaction()`, `rollbackTransaction()` methods
- [ ] `markConsumed(id)` method in CheckpointOps
- [ ] `requeue(id)` method in MessageOps
- [ ] `forceRelease(id)` method in LockOps
- [ ] All methods use parameterized queries
- [ ] Transaction methods wrap multiple operations in BEGIN/COMMIT/ROLLBACK

**Time**: 30 minutes
**Complexity**: Low

### Task 2.4: Write Recovery Tests

**ID**: REC-004
**User Story**: US-P0-002, US-P0-003
**Depends On**: REC-003
**Files**:
- `tests/unit/recovery/detector.test.ts` (create)
- `tests/unit/recovery/restorer.test.ts` (create)

**Acceptance Criteria**:
- [ ] Detector tests (8 tests):
  1. Detect stale mission with checkpoint
  2. Detect stale mission without checkpoint
  3. Ignore active missions (recent activity)
  4. Ignore completed missions
  5. Configurable activity threshold
  6. Multiple stale missions
  7. No stale missions
  8. Mission with no events
- [ ] Restorer tests (10 tests):
  1. Restore sortie states
  2. Re-acquire valid locks
  3. Handle expired locks
  4. Handle lock conflicts
  5. Requeue pending messages
  6. Skip delivered messages
  7. Mark checkpoint consumed
  8. Emit recovery event
  9. Dry run mode
  10. Transaction rollback on error
- [ ] 90%+ code coverage for detector and restorer

**Time**: 60 minutes
**Complexity**: Medium

### Task 2.5: End-to-End Recovery Flow Test

**ID**: REC-005
**User Story**: US-P0-003
**Depends On**: REC-004
**Files**:
- `tests/integration/recovery-flow.test.ts` (create)

**Acceptance Criteria**:
- [ ] Integration tests (5 tests):
  1. Full recovery flow: detect → restore → verify
  2. Recovery with lock conflicts
  3. Recovery with expired locks
  4. Multiple recoveries from same mission
  5. Recovery with no checkpoint (error case)
- [ ] Tests use real CheckpointStorage and SQLiteAdapter
- [ ] Verify events emitted correctly
- [ ] Verify database state after recovery

**Time**: 30 minutes
**Complexity**: Low

## Phase 3: CLI Commands (P0-3)

**Goal**: Implement CLI commands for manual checkpoint operations
**Duration**: 4 hours (Day 4 Morning)
**Blocker**: REC-003 (needs StateRestorer)

### Task 3.1: Implement `fleet checkpoint` Command

**ID**: CLI-001
**User Story**: US-P0-004
**Depends On**: REC-003
**Files**:
- `cli/src/commands/checkpoint.ts` (create)
- `cli/index.ts` (register command)

**Acceptance Criteria**:
- [ ] Command registered with Commander.js
- [ ] Options supported:
  - `--mission <id>`: Target specific mission
  - `--note <text>`: Add trigger details
  - `--json`: Output as JSON
  - `-q, --quiet`: Suppress output except errors
- [ ] Default mission: current active mission (first in_progress)
- [ ] Error if no active mission and no `--mission` specified
- [ ] Calls `CheckpointStorage.save()` with:
  - `mission_id`: from option or detection
  - `trigger`: `"manual"`
  - `trigger_details`: from `--note`
  - `created_by`: `"cli"`
- [ ] Output format:
  - Default: Human-readable with checkpoint ID, mission, progress, counts
  - `--json`: Full checkpoint object
  - `--quiet`: Only errors
- [ ] Spec AC: `fleet checkpoint` CLI command creates checkpoint
- [ ] Spec AC: `fleet checkpoint --mission <id>` targets specific mission
- [ ] Spec AC: `fleet checkpoint --note "description"` adds context to `trigger_details`
- [ ] Spec AC: Checkpoint trigger marked as `"manual"`
- [ ] Spec AC: Command returns checkpoint ID for reference
- [ ] Spec AC: Works in both local and synced modes
- [ ] Spec AC: Proper error handling with user-friendly messages
- [ ] Spec AC: `--json` flag outputs checkpoint as JSON
- [ ] Spec AC: `-q, --quiet` flag suppresses output except errors

**Time**: 45 minutes
**Complexity**: Low

### Task 3.2: Implement `fleet resume` Command

**ID**: CLI-003
**User Story**: US-P0-005
**Depends On**: REC-003, CLI-001
**Files**:
- `cli/src/commands/resume.ts` (create)
- `cli/index.ts` (register command)

**Acceptance Criteria**:
- [ ] Command registered with Commander.js
- [ ] Options supported:
  - `--checkpoint <id>`: Resume from specific checkpoint
  - `--mission <id>`: Target specific mission
  - `--dry-run`: Show what would be restored without applying
  - `--json`: Output recovery context as JSON
  - `-y, --yes`: Skip confirmation prompt
- [ ] Recovery detection logic:
  - If `--checkpoint` specified: Use that checkpoint
  - Otherwise: Use `RecoveryDetector` to find candidates
  - Filter by `--mission` if specified
  - Error if no candidates found
- [ ] Confirmation prompt (unless `--yes` or `--dry-run`):
  - Show mission title, last activity, checkpoint info
  - Ask user to confirm
  - Cancel if user declines
- [ ] Calls `StateRestorer.restoreFromCheckpoint()`:
  - Pass `dryRun: true` if `--dry-run`
  - Pass recovery context for LLM
- [ ] Output format:
  - Default: Human-readable with restored counts, errors, warnings, recovery context
  - `--dry-run`: Prefix with `[DRY RUN]`
  - `--json`: Full RestoreResult object
- [ ] Spec AC: `fleet resume` loads latest checkpoint for active mission
- [ ] Spec AC: `fleet resume --checkpoint <id>` loads specific checkpoint
- [ ] Spec AC: `fleet resume --mission <id>` targets specific mission
- [ ] Spec AC: `fleet resume --dry-run` shows what would be restored without applying
- [ ] Spec AC: `fleet resume --json` outputs recovery context as JSON
- [ ] Spec AC: `fleet resume -y, --yes` skips confirmation prompt
- [ ] Spec AC: Clear output showing restored state (sorties, locks, messages)
- [ ] Spec AC: Works in both local and synced modes
- [ ] Spec AC: Error if no checkpoint available for mission

**Time**: 75 minutes
**Complexity**: Medium

### Task 3.3: Implement `fleet checkpoints list` Command

**ID**: CLI-006
**User Story**: US-P0-006
**Depends On**: CLI-001
**Files**:
- `cli/src/commands/checkpoints.ts` (create - part 1)
- `cli/index.ts` (register command)

**Acceptance Criteria**:
- [ ] Subcommand: `fleet checkpoints list`
- [ ] Options supported:
  - `--mission <id>`: Target specific mission
  - `--limit <N>`: Limit results (default: 10)
  - `--json`: Output as JSON array
- [ ] Calls `CheckpointStorage.list()` with filters
- [ ] Output format:
  - Default: Table with columns (ID, TIMESTAMP, TRIGGER, PROGRESS)
  - `--json`: JSON array of checkpoints
  - Sorted by timestamp descending
- [ ] Spec AC: `fleet checkpoints list` shows all checkpoints for current mission
- [ ] Spec AC: `fleet checkpoints list --mission <id>` targets specific mission
- [ ] Spec AC: `fleet checkpoints list --limit <N>` limits results (default: 10)
- [ ] Spec AC: JSON output available with `--json` flag
- [ ] Spec AC: Checkpoints sorted by timestamp descending

**Time**: 30 minutes
**Complexity**: Low

### Task 3.4: Implement `fleet checkpoints show` Command

**ID**: CLI-007
**User Story**: US-P0-006
**Depends On**: CLI-006
**Files**:
- `cli/src/commands/checkpoints.ts` (modify - part 2)

**Acceptance Criteria**:
- [ ] Subcommand: `fleet checkpoints show <id>`
- [ ] Options supported:
  - `--json`: Output as JSON
- [ ] Calls `CheckpointStorage.getById()` with checkpoint ID
- [ ] Error if checkpoint not found
- [ ] Output format:
  - Default: Detailed sections:
    - Checkpoint metadata (id, mission, timestamp, trigger, progress, created_by)
    - Sorties table (id, status, assigned_to, files)
    - Active locks table (file, held_by, purpose)
    - Pending messages table (from, to, subject)
    - Recovery context (last action, next steps, blockers, files modified)
  - `--json`: Full checkpoint object
- [ ] Spec AC: `fleet checkpoints show <id>` displays checkpoint details
- [ ] Spec AC: JSON output available with `--json` flag

**Time**: 45 minutes
**Complexity**: Low

### Task 3.5: Implement `fleet checkpoints prune` Command

**ID**: CLI-008
**User Story**: US-P0-006
**Depends On**: CLI-007
**Files**:
- `cli/src/commands/checkpoints.ts` (modify - part 3)
- `squawk/src/db/checkpoint-storage.ts` (add findPruneCandidates method)

**Acceptance Criteria**:
- [ ] Subcommand: `fleet checkpoints prune`
- [ ] Options supported:
  - `--mission <id>`: Prune specific mission only
  - `--older-than <DAYS>`: Age threshold (default: 7)
  - `--keep <N>`: Keep N most recent per mission (default: 3)
  - `--dry-run`: Show what would be deleted
  - `-y, --yes`: Skip confirmation
- [ ] `findPruneCandidates()` method in CheckpointStorage:
  - Filter by `older-than` days
  - Keep at least `--keep` per mission
  - Respect `--mission` filter
- [ ] Confirmation prompt (unless `--yes` or `--dry-run`):
  - Show checkpoints to be deleted
  - Ask user to confirm
- [ ] Calls `CheckpointStorage.delete()` for each candidate
- [ ] Output:
  - List of checkpoints to delete
  - `[DRY RUN]` prefix if dry-run
  - Count of deleted checkpoints
- [ ] Spec AC: `fleet checkpoints prune` cleans up old checkpoints
- [ ] Spec AC: `fleet checkpoints prune --older-than <DAYS>` configures age threshold (default: 7)
- [ ] Spec AC: `fleet checkpoints prune --keep <N>` keeps N most recent per mission (default: 3)
- [ ] Spec AC: `fleet checkpoints prune --dry-run` shows what would be deleted
- [ ] Spec AC: Output includes timestamp, trigger, progress, sortie count
- [ ] Spec AC: JSON output available with `--json` flag
- [ ] Spec AC: `-y, --yes` skips confirmation for prune

**Time**: 60 minutes
**Complexity**: Medium

### Task 3.6: Write CLI Tests

**ID**: CLI-002, CLI-004, CLI-005
**User Story**: US-P0-004, US-P0-005, US-P0-006
**Depends On**: CLI-001, CLI-003, CLI-008
**Files**:
- `tests/unit/cli/checkpoint.test.ts` (create)
- `tests/unit/cli/resume.test.ts` (create)
- `tests/unit/cli/checkpoints.test.ts` (create)

**Acceptance Criteria**:
- [ ] Checkpoint tests (6 tests):
  1. `fleet checkpoint` creates checkpoint
  2. `fleet checkpoint --mission` targets specific mission
  3. `fleet checkpoint --note` adds trigger details
  4. `fleet checkpoint --json` outputs JSON
  5. `fleet checkpoint --quiet` suppresses output
  6. Error when no active mission
- [ ] Resume tests (6 tests):
  1. `fleet resume` restores from latest
  2. `fleet resume --checkpoint` restores specific
  3. `fleet resume --dry-run` shows preview
  4. `fleet resume --json` outputs JSON
  5. `fleet resume --yes` skips confirmation
  6. Error when no checkpoint available
- [ ] Checkpoints tests (8 tests):
  1. `fleet checkpoints list` shows all
  2. `fleet checkpoints list --mission` filters
  3. `fleet checkpoints list --limit` limits results
  4. `fleet checkpoints show` displays details
  5. `fleet checkpoints show --json` outputs JSON
  6. `fleet checkpoints prune` deletes old
  7. `fleet checkpoints prune --dry-run` previews
  8. `fleet checkpoints prune --yes` skips confirmation
- [ ] 90%+ code coverage for CLI commands
- [ ] Spec AC: Tests pass for all CLI commands

**Time**: 90 minutes
**Complexity**: Medium

## Phase 4: Integration & Documentation

**Goal**: Final integration testing and documentation
**Duration**: 4 hours (Day 4 Afternoon)
**Blocker**: CLI-002 (all tests written)

### Task 4.1: Cross-Component Integration Testing

**ID**: INT-001
**User Story**: All (validation)
**Depends On**: REC-005, CLI-002
**Files**:
- `tests/integration/recovery-cli.test.ts` (create)

**Acceptance Criteria**:
- [ ] End-to-end tests (3 tests):
  1. CLI creates checkpoint → Recovery detects → Resume restores
  2. Migration from JSON → CLI creates checkpoint → Restore
  3. Full workflow: multiple checkpoints → prune → resume
- [ ] Tests verify:
  - CheckpointStorage and SQLiteAdapter integration
  - Recovery modules use correct storage layer
  - CLI commands use same storage as API
  - Events flow through Squawk mailbox
- [ ] All tests pass
- [ ] Spec AC: SQLiteAdapter used by all API endpoints
- [ ] Spec AC: CheckpointStorage integrated with recovery system
- [ ] Spec AC: CLI commands use same storage layer as API
- [ ] Spec AC: Events flow through Squawk mailbox

**Time**: 60 minutes
**Complexity**: Medium

### Task 4.2: Performance Verification

**ID**: INT-002
**User Story**: All (non-functional requirements)
**Depends On**: INT-001
**Files**: None (verification only)

**Acceptance Criteria**:
- [ ] SQLite migration < 1s for 10K events
- [ ] Recovery detection < 100ms for typical mission count
- [ ] State restoration < 500ms for typical checkpoint
- [ ] CLI commands respond < 200ms for simple operations
- [ ] Checkpoint creation < 100ms
- [ ] Spec AC: Migration completes in < 1s for typical data sizes
- [ ] Spec AC: Recovery detection < 100ms
- [ ] Spec AC: State restoration < 500ms
- [ ] Spec AC: CLI commands respond in < 200ms

**Time**: 30 minutes
**Complexity**: Low

### Task 4.3: Documentation Updates

**ID**: DOC-001
**User Story**: All (usability)
**Depends On**: INT-002
**Files**:
- `README.md` (if exists) or create CLI.md
- Update server API endpoint documentation (if exists)

**Acceptance Criteria**:
- [ ] CLI usage examples for all new commands:
  - `fleet checkpoint`
  - `fleet resume`
  - `fleet checkpoints list/show/prune`
- [ ] Recovery workflow documented
- [ ] Migration guide for existing users (JSON → SQLite)
- [ ] API endpoint documentation for any new endpoints (if added)
- [ ] Spec AC: User-friendly CLI commands provide clear feedback

**Time**: 30 minutes
**Complexity**: Low

### Task 4.4: Final Verification

**ID**: VER-001
**User Story**: All (acceptance)
**Depends On**: DOC-001
**Files**: None (verification only)

**Acceptance Criteria**:
- [ ] All 25+ new tests pass
- [ ] All 19 existing API tests still pass
- [ ] 90%+ line coverage for new code
- [ ] All spec acceptance criteria met (47 total ACs checked)
- [ ] No data loss during migration or recovery
- [ ] Backward compatibility verified
- [ ] Documentation reviewed

**Time**: 60 minutes
**Complexity**: Low

## Dependencies

### External Dependencies
- **SQLite** (via `bun:sqlite`) - Already in use
- **Commander.js** (CLI framework) - Already in use
- **Bun runtime** - For SQLite support and file operations

### Internal Dependencies
```
MIG-001 (Wrapper Layer)
  ├── MIG-002 (JSON Migration)
  └── MIG-003 (MissionOps)
      └── REC-001 (Detector)
          ├── REC-002 (Helper Methods)
          └── REC-003 (Restorer)
              ├── CLI-001 (Checkpoint Command)
              ├── CLI-003 (Resume Command)
              ├── CLI-006 (List Command)
              ├── CLI-007 (Show Command)
              └── CLI-008 (Prune Command)
                  └── CLI-002/004/005 (CLI Tests)
```

### Parallelizable Tracks
**Track A: Migration** (MIG-001, MIG-002, MIG-003, MIG-004) - Must complete first
**Track B: Recovery** (REC-001, REC-002, REC-003, REC-004, REC-005) - After Track A
**Track C: CLI** (CLI-001, CLI-003, CLI-006, CLI-007, CLI-008, CLI-002/004/005) - After Track B
**Track D: Integration** (INT-001, INT-002, DOC-001, VER-001) - After Track C

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Migration failure corrupts data** | High | Low | - Keep JSON file until migration succeeds<br>- Transactional migration<br>- Auto-rollback on error |
| **Lock conflicts during recovery** | Medium | Medium | - Add to blockers by default<br>- Document `--force-locks` flag<br>- User confirmation required |
| **Checkpoint schema mismatch** | Medium | Low | - Validate schema on load<br>- Schema version field<br>- Migration strategy for future versions |
| **SQLite WAL file corruption** | High | Low | - File backup after migration<br>- Regular VACUUM maintenance<br>- WAL mode with checkpointing |
| **CLI command blocking** | Low | Low | - Use async/await properly<br>- Timeout on long operations<br>- User feedback during operations |
| **Performance degradation** | Medium | Low | - Indexes on frequently queried columns<br>- Benchmark during development<br>- Optimize queries before merging |
| **Recovery state inconsistency** | High | Medium | - Transactional restoration<br>- Rollback on partial failure<br>- Validation before and after |
| **JSON to SQLite type mismatches** | Medium | Low | - Explicit type conversion<br>- Validation during migration<br>- Test with edge cases |

## Testing Plan

### Unit Tests (25 tests)

| Test File | Tests | Coverage Target |
|-----------|--------|-----------------|
| `tests/integration/migration.test.ts` | 5 | 95% |
| `tests/unit/recovery/detector.test.ts` | 8 | 95% |
| `tests/unit/recovery/restorer.test.ts` | 10 | 95% |
| `tests/unit/cli/checkpoint.test.ts` | 6 | 90% |
| `tests/unit/cli/resume.test.ts` | 6 | 90% |
| `tests/unit/cli/checkpoints.test.ts` | 8 | 90% |

### Integration Tests (8 tests)

| Test File | Tests | Coverage Target |
|-----------|--------|-----------------|
| `tests/integration/recovery-flow.test.ts` | 5 | 90% |
| `tests/integration/recovery-cli.test.ts` | 3 | 90% |

### Test Scenarios

**Migration Tests (5)**:
1. ✅ Migrate empty JSON file
2. ✅ Migrate JSON with mailboxes, events, cursors, locks
3. ✅ Handle corrupted JSON gracefully
4. ✅ Skip migration if no JSON file exists
5. ✅ Verify all data migrated correctly

**Detection Tests (8)**:
1. ✅ Detect stale mission with checkpoint
2. ✅ Detect stale mission without checkpoint
3. ✅ Ignore active missions (recent activity)
4. ✅ Ignore completed missions
5. ✅ Configurable activity threshold
6. ✅ Multiple stale missions
7. ✅ No stale missions
8. ✅ Mission with no events

**Restoration Tests (10)**:
1. ✅ Restore sortie states
2. ✅ Re-acquire valid locks
3. ✅ Handle expired locks
4. ✅ Handle lock conflicts
5. ✅ Requeue pending messages
6. ✅ Skip delivered messages
7. ✅ Mark checkpoint consumed
8. ✅ Emit recovery event
9. ✅ Dry run mode
10. ✅ Transaction rollback on error

**CLI Tests (20)**:
- **Checkpoint (6)**: create, target mission, add note, JSON output, quiet mode, error handling
- **Resume (6)**: latest, specific checkpoint, dry-run, JSON output, skip confirmation, no checkpoint error
- **Checkpoints (8)**: list, filter mission, limit, show, JSON, prune, dry-run, skip confirmation

**E2E Tests (8)**:
1. ✅ Full recovery flow: detect → restore → verify
2. ✅ Recovery with lock conflicts
3. ✅ Recovery with expired locks
4. ✅ Multiple recoveries from same mission
5. ✅ Recovery with no checkpoint (error case)
6. ✅ CLI creates checkpoint → Recovery detects → Resume restores
7. ✅ Migration from JSON → CLI creates checkpoint → Restore
8. ✅ Full workflow: multiple checkpoints → prune → resume

### Spec Validation

**All 47 acceptance criteria covered**:
- US-P0-001: 8 ACs → MIG-001 to MIG-004
- US-P0-002: 8 ACs → REC-001, REC-002
- US-P0-003: 12 ACs → REC-003, REC-004, REC-005
- US-P0-004: 9 ACs → CLI-001, CLI-002
- US-P0-005: 9 ACs → CLI-003, CLI-004, CLI-005
- US-P0-006: 11 ACs → CLI-006, CLI-007, CLI-008, CLI-005

### Regression Checks

- [ ] All 19 existing API tests pass (mailboxes, events, cursors, locks)
- [ ] Existing CLI commands unaffected
- [ ] Existing server API endpoints unaffected
- [ ] Test coverage maintained or improved

## Rollback Plan

### Pre-Migration Rollback
**Trigger**: Migration fails during testing
**Actions**:
1. Keep original JSON file (don't rename)
2. Restore `squawk/src/db/index.ts` from git
3. No data loss

### Post-Migration Rollback
**Trigger**: Migration succeeds but bugs found in production
**Actions**:
1. JSON backup file exists at `squawk.json.backup`
2. Restore JSON backup to `squawk.json`
3. Restore old `squawk/src/db/index.ts` from git
4. Delete SQLite database
5. Restart application

### Recovery Rollback
**Trigger**: Recovery corrupts state
**Actions**:
1. Checkpoint file still exists (`~/.flightline/checkpoints/<id>.json`)
2. Manually restore from file backup
3. Use `fleet resume --checkpoint <backup_id>` to recover
4. Investigate and fix bug before re-trying

### CLI Rollback
**Trigger**: CLI commands cause data corruption
**Actions**:
1. Use database backup (if any)
2. Manually query SQLite for affected data
3. Restore from checkpoint if available
4. Disable CLI commands temporarily
5. Fix and re-enable

### Database Rollback
**Trigger**: SQLite database corruption
**Actions**:
1. Restore from file backup (checkpoints in `.flightline/`)
2. Use `PRAGMA integrity_check` to diagnose
3. Re-run migration if needed
4. Consider recovery strategy from multiple backups

## Success Criteria

### Functional

- [ ] All 19 existing API tests pass after SQLite migration
- [ ] Legacy JSON data successfully migrated to SQLite
- [ ] Recovery detection identifies stale missions correctly
- [ ] State restoration restores sortie states, locks, and messages
- [ ] CLI commands work in both local and synced modes
- [ ] Events emitted for all checkpoint/recovery operations
- [ ] Checkpoint marked as consumed after recovery

### Non-Functional

- [ ] Migration completes in < 1s for typical data sizes
- [ ] Recovery detection < 100ms
- [ ] State restoration < 500ms
- [ ] CLI commands respond in < 200ms
- [ ] No data loss during migration or recovery

### Integration

- [ ] SQLiteAdapter used by all API endpoints
- [ ] CheckpointStorage integrated with recovery system
- [ ] CLI commands use same storage layer as API
- [ ] Events flow through Squawk mailbox

### Test Coverage

- [ ] 25+ new tests added
- [ ] 90%+ line coverage for new code
- [ ] All edge cases covered
- [ ] All 47 spec acceptance criteria verified

## Implementation Notes

### Assumptions

1. SQLiteAdapter from Day 2 is functional and tested ✅
2. CheckpointStorage from Day 2 is functional and tested ✅
3. CLI framework (Commander.js) is already set up ✅
4. `.flightline/` directory structure exists ✅

### Limitations

1. Recovery requires agent restart (no hot-reload)
2. Cannot detect context compaction in real-time (relies on inactivity)
3. Force-lock release may cause data inconsistency if original holder is still active
4. JSON migration is one-time operation (reverse migration not supported)

### Future Enhancements

1. **Hot-reload recovery**: Detect context compaction in real-time
2. **Automatic checkpoint creation**: Periodic checkpoints during long missions
3. **Checkpoint compression**: Compress large checkpoints to save space
4. **Distributed recovery**: Support recovery across multiple agents
5. **Recovery validation**: Pre-flight checks before applying recovery

## References

- [Specification](./spec.md) - Full user stories and acceptance criteria
- [Phase 3 Context Survival Spec](../phase3-context-survival/spec.md) - Related spec
- [TDD Implementation Guide](../tdd-implementation-guide.md) - Test-driven development practices
- [Day 2 Implementation Summary](../day2-implementation-summary.md) - SQLiteAdapter implementation details
- [Shared Interfaces](../shared-interfaces.md) - Type definitions and contracts

---

**Status**: Ready for Implementation
**Confidence**: 0.92
**Last Updated**: 2026-01-05
**Plan Version**: 1.0.0
