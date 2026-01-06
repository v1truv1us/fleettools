# P0 Tasks Specification: Recovery Integration & SQLite Migration

**Version:** 1.0.0  
**Status:** Ready for Implementation  
**Date:** 2026-01-05  
**Priority:** P0 (Critical Blockers)  
**Estimated Duration:** 2 Days (Day 3-4)

---

## Overview

This specification defines the **Priority 0 (P0) critical blockers** that must be completed before FleetTools can function as a fleet coordination system. These tasks address the gap between the existing storage infrastructure (Day 2 complete) and the coordination logic that makes the system useful.

### Problem Statement

FleetTools has completed Day 2 deliverables:
- ✅ Event Operations (SQLiteAdapter with EventOps) - 11 tests passing
- ✅ Checkpoint Storage (dual storage with SQLite + file backup) - 26 tests passing
- ✅ Integration tests - 17 tests passing
- ✅ Total: 54 tests passing with 68% coverage

However, critical gaps remain:
1. **Legacy JSON persistence still active** - `squawk/src/db/index.ts` uses old in-memory + JSON approach
2. **No recovery algorithm** - Checkpoints can be created but never used for recovery
3. **No CLI checkpoint commands** - `fleet checkpoint`, `fleet resume`, `fleet checkpoints` not implemented
4. **No checkpoint API endpoints** - Storage exists but no REST API

### Solution

Implement three P0 tasks in parallel:
1. **P0-1: SQLite Migration** - Replace legacy JSON with SQLiteAdapter
2. **P0-2: Recovery Algorithm** - Implement context compaction detection and state restoration
3. **P0-3: CLI Checkpoint Commands** - Wire CLI commands to checkpoint storage

### Design Principles

1. **Backward Compatibility**: Existing API contracts must not break
2. **Data Safety**: Migration must preserve all existing data
3. **Fail-Safe**: Recovery operations must be idempotent and safe to retry
4. **User-Friendly**: CLI commands provide clear feedback and confirmation prompts

---

## User Stories

### US-P0-001: SQLite Migration

**As a** FleetTools developer  
**I want** the legacy JSON persistence replaced with SQLiteAdapter  
**So that** all data flows through a single, consistent storage layer

#### Acceptance Criteria

- [ ] `squawk/src/db/index.ts` uses SQLiteAdapter instead of in-memory + JSON
- [ ] All existing API endpoints continue to work identically
- [ ] All 19 existing API tests pass without modification
- [ ] Data migration path exists for existing JSON data
- [ ] No breaking changes to public API contracts
- [ ] WAL mode enabled for concurrent access
- [ ] Graceful fallback if SQLite initialization fails
- [ ] Old JSON file renamed to `.backup` after successful migration

### US-P0-002: Recovery Detection

**As a** Dispatch coordinator resuming after context compaction  
**I want** the system to detect I need recovery  
**So that** I can resume from the last checkpoint

#### Acceptance Criteria

- [ ] On agent startup, check for active missions without completion
- [ ] Detect missions with `status = "in_progress"` and no recent activity
- [ ] Activity threshold: no events in last 5 minutes (configurable via `FLEET_ACTIVITY_THRESHOLD_MS`)
- [ ] Prompt user with recovery option if checkpoint exists
- [ ] `context_compacted` event emitted when compaction detected
- [ ] Support `--auto-resume` flag for non-interactive recovery
- [ ] Works in both local and synced modes
- [ ] Returns list of recovery candidates with checkpoint info

### US-P0-003: State Restoration

**As a** Dispatch coordinator recovering from context death  
**I want** to resume from the latest checkpoint  
**So that** I can continue the mission without data loss

#### Acceptance Criteria

- [ ] `fleet resume` loads latest checkpoint for active mission
- [ ] `fleet resume --checkpoint <id>` loads specific checkpoint
- [ ] Recovery restores sortie states to checkpoint values
- [ ] Recovery re-acquires file locks that were held (if not expired)
- [ ] Expired locks added to `recovery_context.blockers`
- [ ] Lock conflicts added to `recovery_context.blockers`
- [ ] Recovery context injected into agent prompt
- [ ] `fleet_recovered` event emitted on successful recovery
- [ ] Orphaned locks from crashed agents are released
- [ ] Transaction rollback on partial failure
- [ ] Checkpoint marked as `consumed` after successful recovery

### US-P0-004: CLI Checkpoint Command

**As a** developer debugging a complex mission  
**I want** to manually trigger a checkpoint  
**So that** I can capture state at specific points

#### Acceptance Criteria

- [ ] `fleet checkpoint` CLI command creates checkpoint
- [ ] `fleet checkpoint --mission <id>` targets specific mission
- [ ] `fleet checkpoint --note "description"` adds context to `trigger_details`
- [ ] Checkpoint trigger marked as `"manual"`
- [ ] Command returns checkpoint ID for reference
- [ ] Works in both local and synced modes
- [ ] Proper error handling with user-friendly messages
- [ ] `--json` flag outputs checkpoint as JSON
- [ ] `-q, --quiet` flag suppresses output except errors

### US-P0-005: CLI Resume Command

**As a** developer recovering from context death  
**I want** to resume from a checkpoint via CLI  
**So that** I can continue work without data loss

#### Acceptance Criteria

- [ ] `fleet resume` loads latest checkpoint for active mission
- [ ] `fleet resume --checkpoint <id>` loads specific checkpoint
- [ ] `fleet resume --mission <id>` targets specific mission
- [ ] `fleet resume --dry-run` shows what would be restored without applying
- [ ] `fleet resume --json` outputs recovery context as JSON
- [ ] `fleet resume -y, --yes` skips confirmation prompt
- [ ] Clear output showing restored state (sorties, locks, messages)
- [ ] Works in both local and synced modes
- [ ] Error if no checkpoint available for mission

### US-P0-006: CLI Checkpoints List/Show/Prune

**As a** developer troubleshooting a mission  
**I want** to list and inspect checkpoints  
**So that** I can understand mission history

#### Acceptance Criteria

- [ ] `fleet checkpoints list` shows all checkpoints for current mission
- [ ] `fleet checkpoints list --mission <id>` targets specific mission
- [ ] `fleet checkpoints list --limit <N>` limits results (default: 10)
- [ ] `fleet checkpoints show <id>` displays checkpoint details
- [ ] `fleet checkpoints prune` cleans up old checkpoints
- [ ] `fleet checkpoints prune --older-than <DAYS>` configures age threshold (default: 7)
- [ ] `fleet checkpoints prune --keep <N>` keeps N most recent per mission (default: 3)
- [ ] `fleet checkpoints prune --dry-run` shows what would be deleted
- [ ] Output includes timestamp, trigger, progress, sortie count
- [ ] JSON output available with `--json` flag
- [ ] Checkpoints sorted by timestamp descending
- [ ] `-y, --yes` skips confirmation for prune

---

## Technical Design

### P0-1: SQLite Migration

#### Current State (Legacy)

```typescript
// squawk/src/db/index.ts (LEGACY - to be replaced)
let data = {
  mailboxes: {},
  events: {},
  cursors: {},
  locks: {}
};

// In-memory with periodic JSON save
setInterval(saveData, 5000);
```

#### Target State

```typescript
// squawk/src/db/index.ts (NEW)
import { SQLiteAdapter } from './sqlite';
import { existsSync, renameSync, readFileSync } from 'fs';
import path from 'path';

let adapter: SQLiteAdapter | null = null;
const LEGACY_DB_PATH = path.join(process.env.HOME || '', '.local', 'share', 'fleet', 'squawk.json');
const SQLITE_DB_PATH = path.join(process.env.HOME || '', '.local', 'share', 'fleet', 'squawk.db');

/**
 * Initialize database with automatic migration from JSON if needed
 */
export async function initializeDatabase(dbPath?: string): Promise<void> {
  const targetPath = dbPath || SQLITE_DB_PATH;
  
  adapter = new SQLiteAdapter(targetPath);
  await adapter.initialize();
  
  // Check for legacy JSON data and migrate
  if (existsSync(LEGACY_DB_PATH)) {
    await migrateFromJson(LEGACY_DB_PATH);
    renameSync(LEGACY_DB_PATH, LEGACY_DB_PATH + '.backup');
    console.log(`Migrated legacy data. Backup saved to ${LEGACY_DB_PATH}.backup`);
  }
}

/**
 * Get the database adapter (throws if not initialized)
 */
export function getAdapter(): SQLiteAdapter {
  if (!adapter) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return adapter;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (adapter) {
    await adapter.close();
    adapter = null;
  }
}

/**
 * Migrate data from legacy JSON file to SQLite
 */
async function migrateFromJson(jsonPath: string): Promise<void> {
  const content = readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content);
  
  // Migrate mailboxes
  for (const [id, mailbox] of Object.entries(data.mailboxes || {})) {
    await adapter!.mailboxes.create(mailbox as any);
  }
  
  // Migrate events
  for (const [id, events] of Object.entries(data.events || {})) {
    for (const event of events as any[]) {
      await adapter!.events.append(event);
    }
  }
  
  // Migrate cursors
  for (const [id, cursor] of Object.entries(data.cursors || {})) {
    await adapter!.cursors.create(cursor as any);
  }
  
  // Migrate locks (only active ones)
  for (const [id, lock] of Object.entries(data.locks || {})) {
    const lockData = lock as any;
    if (!lockData.released_at) {
      await adapter!.locks.acquire({
        file: lockData.file,
        specialist_id: lockData.reserved_by,
        timeout_ms: lockData.timeout_ms || 30000,
        purpose: lockData.purpose || 'edit',
      });
    }
  }
}

// Re-export operations for backward compatibility
export const mailboxOps = {
  create: async (id: string) => getAdapter().mailboxes.create({ id }),
  getById: async (id: string) => getAdapter().mailboxes.getById(id),
  getAll: async () => getAdapter().mailboxes.getAll(),
  delete: async (id: string) => getAdapter().mailboxes.delete(id),
};

export const eventOps = {
  append: async (mailboxId: string, event: any) => getAdapter().events.append({
    ...event,
    stream_id: mailboxId,
    stream_type: 'squawk',
  }),
  getByMailbox: async (mailboxId: string) => getAdapter().events.queryByStream('squawk', mailboxId),
};

export const cursorOps = {
  get: async (streamId: string) => getAdapter().cursors.getByStream(streamId),
  advance: async (streamId: string, position: number) => getAdapter().cursors.advance(streamId, position),
};

export const lockOps = {
  acquire: async (file: string, specialistId: string, timeoutMs: number) => 
    getAdapter().locks.acquire({ file, specialist_id: specialistId, timeout_ms: timeoutMs }),
  release: async (lockId: string) => getAdapter().locks.release(lockId),
  getActive: async () => getAdapter().locks.getActive(),
  getByFile: async (file: string) => getAdapter().locks.getByFile(file),
};
```

#### Migration Strategy

1. **Phase 1: Wrapper Layer** (Day 3 Morning)
   - Create wrapper functions that delegate to SQLiteAdapter
   - Maintain same public API signatures
   - Add initialization function

2. **Phase 2: Data Migration** (Day 3 Morning)
   - On first run, check for existing JSON data
   - If found, migrate to SQLite in transaction
   - Rename old JSON file to `.backup`

3. **Phase 3: Cleanup** (Day 3 Morning)
   - Remove in-memory data structures
   - Remove periodic save interval
   - Remove JSON file operations

### P0-2: Recovery Algorithm

#### File: `squawk/src/recovery/detector.ts`

```typescript
/**
 * Recovery Detection Module
 * 
 * Detects stale missions that may need recovery from checkpoints.
 */

import type { Mission, Checkpoint } from '../db/types';

export interface RecoveryCandidate {
  mission_id: string;
  mission_title: string;
  last_activity_at: string;
  inactivity_duration_ms: number;
  checkpoint_id?: string;
  checkpoint_progress?: number;
  checkpoint_timestamp?: string;
}

export interface DetectionOptions {
  activityThresholdMs?: number;  // Default: 5 minutes
  includeCompleted?: boolean;    // Default: false
}

const DEFAULT_ACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export class RecoveryDetector {
  constructor(
    private db: {
      missions: { getByStatus: (status: string) => Promise<Mission[]> };
      events: { getLatestByStream: (type: string, id: string) => Promise<any> };
      checkpoints: { getLatestByMission: (missionId: string) => Promise<Checkpoint | null> };
    }
  ) {}

  /**
   * Detect missions that may need recovery
   */
  async detectRecoveryCandidates(
    options: DetectionOptions = {}
  ): Promise<RecoveryCandidate[]> {
    const {
      activityThresholdMs = DEFAULT_ACTIVITY_THRESHOLD_MS,
      includeCompleted = false,
    } = options;

    const now = Date.now();
    const candidates: RecoveryCandidate[] = [];

    // Get all in-progress missions
    const activeMissions = await this.db.missions.getByStatus('in_progress');

    for (const mission of activeMissions) {
      // Get latest event for this mission
      const latestEvent = await this.db.events.getLatestByStream('mission', mission.id);

      if (!latestEvent) continue;

      const lastActivityAt = new Date(latestEvent.occurred_at).getTime();
      const inactivityDuration = now - lastActivityAt;

      if (inactivityDuration > activityThresholdMs) {
        // Get latest checkpoint
        const checkpoint = await this.db.checkpoints.getLatestByMission(mission.id);

        candidates.push({
          mission_id: mission.id,
          mission_title: mission.title,
          last_activity_at: latestEvent.occurred_at,
          inactivity_duration_ms: inactivityDuration,
          checkpoint_id: checkpoint?.id,
          checkpoint_progress: checkpoint?.progress_percent,
          checkpoint_timestamp: checkpoint?.timestamp,
        });
      }
    }

    return candidates;
  }

  /**
   * Check if recovery is needed on startup
   */
  async checkForRecovery(options: DetectionOptions = {}): Promise<{
    needed: boolean;
    candidates: RecoveryCandidate[];
  }> {
    const candidates = await this.detectRecoveryCandidates(options);
    
    // Filter to only those with checkpoints
    const recoverableCandidates = candidates.filter(c => c.checkpoint_id);

    return {
      needed: recoverableCandidates.length > 0,
      candidates: recoverableCandidates,
    };
  }
}
```

#### File: `squawk/src/recovery/restorer.ts`

```typescript
/**
 * State Restoration Module
 * 
 * Restores mission state from checkpoints.
 */

import type { Checkpoint, RecoveryContext, LockResult } from '../db/types';

export interface RestoreResult {
  success: boolean;
  checkpoint_id: string;
  mission_id: string;
  recovery_context: RecoveryContext;
  restored: {
    sorties: number;
    locks: number;
    messages: number;
  };
  errors: string[];
  warnings: string[];
}

export interface RestoreOptions {
  dryRun?: boolean;
  forceLocks?: boolean;  // Force-release conflicting locks
}

export class StateRestorer {
  constructor(
    private db: {
      checkpoints: {
        getById: (id: string) => Promise<Checkpoint | null>;
        getLatestByMission: (missionId: string) => Promise<Checkpoint | null>;
        markConsumed: (id: string) => Promise<void>;
      };
      sorties: {
        update: (id: string, data: any) => Promise<void>;
      };
      locks: {
        acquire: (input: any) => Promise<LockResult>;
        forceRelease: (id: string) => Promise<void>;
      };
      messages: {
        requeue: (id: string) => Promise<void>;
      };
      events: {
        append: (input: any) => Promise<any>;
      };
      beginTransaction: () => Promise<void>;
      commitTransaction: () => Promise<void>;
      rollbackTransaction: () => Promise<void>;
    }
  ) {}

  /**
   * Restore state from a specific checkpoint
   */
  async restoreFromCheckpoint(
    checkpointId: string,
    options: RestoreOptions = {}
  ): Promise<RestoreResult> {
    const checkpoint = await this.db.checkpoints.getById(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    return this.restore(checkpoint, options);
  }

  /**
   * Restore state from the latest checkpoint for a mission
   */
  async restoreLatest(
    missionId: string,
    options: RestoreOptions = {}
  ): Promise<RestoreResult> {
    const checkpoint = await this.db.checkpoints.getLatestByMission(missionId);
    if (!checkpoint) {
      throw new Error(`No checkpoint found for mission: ${missionId}`);
    }

    return this.restore(checkpoint, options);
  }

  /**
   * Internal restore implementation
   */
  private async restore(
    checkpoint: Checkpoint,
    options: RestoreOptions
  ): Promise<RestoreResult> {
    const { dryRun = false, forceLocks = false } = options;

    const errors: string[] = [];
    const warnings: string[] = [];
    let sortiesRestored = 0;
    let locksRestored = 0;
    let messagesRequeued = 0;

    if (!dryRun) {
      await this.db.beginTransaction();

      try {
        // 1. Restore sortie states
        for (const sortie of checkpoint.sorties) {
          await this.db.sorties.update(sortie.id, {
            status: sortie.status,
            assigned_to: sortie.assigned_to,
            progress: sortie.progress,
            progress_notes: sortie.progress_notes,
          });
          sortiesRestored++;
        }

        // 2. Re-acquire locks
        for (const lock of checkpoint.active_locks) {
          // Check if lock is expired
          const lockAge = Date.now() - new Date(lock.acquired_at).getTime();
          if (lockAge > lock.timeout_ms) {
            warnings.push(`Lock expired: ${lock.file} (was held by ${lock.held_by})`);
            continue;
          }

          const result = await this.db.locks.acquire({
            file: lock.file,
            specialist_id: lock.held_by,
            timeout_ms: lock.timeout_ms,
            purpose: lock.purpose,
          });

          if (result.conflict) {
            if (forceLocks && result.existing_lock) {
              await this.db.locks.forceRelease(result.existing_lock.id);
              // Retry acquisition
              const retryResult = await this.db.locks.acquire({
                file: lock.file,
                specialist_id: lock.held_by,
                timeout_ms: lock.timeout_ms,
                purpose: lock.purpose,
              });
              if (!retryResult.conflict) {
                locksRestored++;
                warnings.push(`Force-released lock: ${lock.file} (was held by ${result.existing_lock.reserved_by})`);
              } else {
                errors.push(`Failed to re-acquire lock after force-release: ${lock.file}`);
              }
            } else {
              errors.push(`Lock conflict: ${lock.file} held by ${result.existing_lock?.reserved_by}`);
            }
          } else {
            locksRestored++;
          }
        }

        // 3. Requeue pending messages
        for (const message of checkpoint.pending_messages) {
          if (!message.delivered) {
            await this.db.messages.requeue(message.id);
            messagesRequeued++;
          }
        }

        // 4. Mark checkpoint as consumed
        await this.db.checkpoints.markConsumed(checkpoint.id);

        // 5. Emit recovery event
        await this.db.events.append({
          event_type: 'fleet_recovered',
          stream_type: 'fleet',
          stream_id: checkpoint.mission_id,
          data: {
            checkpoint_id: checkpoint.id,
            sorties_restored: sortiesRestored,
            locks_restored: locksRestored,
            messages_requeued: messagesRequeued,
            errors: errors.length,
            warnings: warnings.length,
          },
        });

        await this.db.commitTransaction();
      } catch (error) {
        await this.db.rollbackTransaction();
        throw error;
      }
    } else {
      // Dry run - just count what would be restored
      sortiesRestored = checkpoint.sorties.length;
      locksRestored = checkpoint.active_locks.length;
      messagesRequeued = checkpoint.pending_messages.filter(m => !m.delivered).length;
    }

    return {
      success: errors.length === 0,
      checkpoint_id: checkpoint.id,
      mission_id: checkpoint.mission_id,
      recovery_context: checkpoint.recovery_context,
      restored: {
        sorties: sortiesRestored,
        locks: locksRestored,
        messages: messagesRequeued,
      },
      errors,
      warnings,
    };
  }

  /**
   * Format recovery context for LLM prompt injection
   */
  formatRecoveryPrompt(result: RestoreResult): string {
    const ctx = result.recovery_context;
    
    let prompt = `## Recovery Context

You are resuming a mission after context compaction.

**Mission**: ${ctx.mission_summary}
**Progress**: ${result.restored.sorties} sorties restored
**Last Action**: ${ctx.last_action}

### Next Steps
${ctx.next_steps.map(step => `- ${step}`).join('\n')}

### Current Blockers
${ctx.blockers.length > 0 ? ctx.blockers.map(b => `- ${b}`).join('\n') : '- None'}

### Files Modified
${ctx.files_modified.map(f => `- ${f}`).join('\n')}

### Time Context
- Elapsed: ${this.formatDuration(ctx.elapsed_time_ms)}
- Last activity: ${ctx.last_activity_at}

Please review the current state and continue the mission.`;

    if (result.errors.length > 0) {
      prompt += `\n\n### Recovery Errors\n${result.errors.map(e => `- ${e}`).join('\n')}`;
    }

    if (result.warnings.length > 0) {
      prompt += `\n\n### Recovery Warnings\n${result.warnings.map(w => `- ${w}`).join('\n')}`;
    }

    return prompt;
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
```

### P0-3: CLI Commands

#### File: `cli/src/commands/checkpoint.ts`

```typescript
/**
 * fleet checkpoint command
 * 
 * Create a manual checkpoint of current mission state.
 */

import { Command } from 'commander';
import { getAdapter } from '../../squawk/src/db';
import { CheckpointStorage } from '../../squawk/src/db/checkpoint-storage';

export function createCheckpointCommand(): Command {
  const cmd = new Command('checkpoint')
    .description('Create a manual checkpoint of current mission state')
    .option('--mission <id>', 'Target specific mission (default: current active)')
    .option('--note <text>', 'Add descriptive note to checkpoint')
    .option('--json', 'Output checkpoint details as JSON')
    .option('-q, --quiet', 'Suppress output except errors')
    .action(async (options) => {
      try {
        const db = getAdapter();
        const storage = new CheckpointStorage({
          dbPath: ':memory:', // Will use actual path
          fileDir: '.flightline/checkpoints',
        });

        // Get mission ID
        let missionId = options.mission;
        if (!missionId) {
          // Get current active mission
          const activeMissions = await db.missions.getByStatus('in_progress');
          if (activeMissions.length === 0) {
            console.error('Error: No active mission found. Use --mission <id> to specify.');
            process.exit(1);
          }
          missionId = activeMissions[0].id;
        }

        // Create checkpoint
        const checkpoint = await storage.save({
          mission_id: missionId,
          trigger: 'manual',
          trigger_details: options.note,
          created_by: 'cli',
        });

        if (options.json) {
          console.log(JSON.stringify(checkpoint, null, 2));
        } else if (!options.quiet) {
          console.log(`Checkpoint created: ${checkpoint.id}`);
          console.log(`Mission: ${missionId}`);
          console.log(`Progress: ${checkpoint.progress_percent}%`);
          console.log(`Sorties: ${checkpoint.sorties.length}`);
          console.log(`Locks: ${checkpoint.active_locks.length} active`);
          console.log(`Messages: ${checkpoint.pending_messages.length} pending`);
        }
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  return cmd;
}
```

#### File: `cli/src/commands/resume.ts`

```typescript
/**
 * fleet resume command
 * 
 * Resume mission from latest or specified checkpoint.
 */

import { Command } from 'commander';
import { getAdapter } from '../../squawk/src/db';
import { StateRestorer } from '../../squawk/src/recovery/restorer';
import { RecoveryDetector } from '../../squawk/src/recovery/detector';
import * as readline from 'readline';

export function createResumeCommand(): Command {
  const cmd = new Command('resume')
    .description('Resume mission from latest or specified checkpoint')
    .option('--checkpoint <id>', 'Resume from specific checkpoint')
    .option('--mission <id>', 'Resume specific mission (default: most recent active)')
    .option('--dry-run', 'Show what would be restored without applying')
    .option('--json', 'Output recovery context as JSON')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (options) => {
      try {
        const db = getAdapter();
        const restorer = new StateRestorer(db as any);
        const detector = new RecoveryDetector(db as any);

        let checkpointId = options.checkpoint;

        if (!checkpointId) {
          // Detect recovery candidates
          const { needed, candidates } = await detector.checkForRecovery();

          if (!needed) {
            console.log('No missions need recovery.');
            return;
          }

          // Filter by mission if specified
          let targetCandidates = candidates;
          if (options.mission) {
            targetCandidates = candidates.filter(c => c.mission_id === options.mission);
            if (targetCandidates.length === 0) {
              console.error(`Error: No checkpoint found for mission: ${options.mission}`);
              process.exit(1);
            }
          }

          // Use first candidate
          const candidate = targetCandidates[0];
          checkpointId = candidate.checkpoint_id;

          console.log(`Found stale mission: ${candidate.mission_title}`);
          console.log(`Last activity: ${candidate.last_activity_at}`);
          console.log(`Checkpoint: ${candidate.checkpoint_id} (${candidate.checkpoint_progress}%)`);
        }

        // Confirm unless --yes or --dry-run
        if (!options.yes && !options.dryRun) {
          const confirmed = await confirm('Proceed with recovery?');
          if (!confirmed) {
            console.log('Recovery cancelled.');
            return;
          }
        }

        // Perform restoration
        const result = await restorer.restoreFromCheckpoint(checkpointId!, {
          dryRun: options.dryRun,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          if (options.dryRun) {
            console.log('\n[DRY RUN] Would restore:');
          } else {
            console.log('\nRecovery complete:');
          }

          console.log(`- Sorties: ${result.restored.sorties}`);
          console.log(`- Locks: ${result.restored.locks}`);
          console.log(`- Messages: ${result.restored.messages}`);

          if (result.errors.length > 0) {
            console.log('\nErrors:');
            result.errors.forEach(e => console.log(`  - ${e}`));
          }

          if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            result.warnings.forEach(w => console.log(`  - ${w}`));
          }

          if (!options.dryRun) {
            console.log('\n--- Recovery Context ---');
            console.log(restorer.formatRecoveryPrompt(result));
          }
        }
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  return cmd;
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}
```

#### File: `cli/src/commands/checkpoints.ts`

```typescript
/**
 * fleet checkpoints command
 * 
 * List, show, and prune checkpoints.
 */

import { Command } from 'commander';
import { getAdapter } from '../../squawk/src/db';
import { CheckpointStorage } from '../../squawk/src/db/checkpoint-storage';
import * as readline from 'readline';

export function createCheckpointsCommand(): Command {
  const cmd = new Command('checkpoints')
    .description('Manage checkpoints');

  // fleet checkpoints list
  cmd.command('list')
    .description('List checkpoints for a mission')
    .option('--mission <id>', 'Target specific mission (default: current active)')
    .option('--limit <n>', 'Maximum checkpoints to show', '10')
    .option('--json', 'Output as JSON array')
    .action(async (options) => {
      try {
        const storage = new CheckpointStorage({
          dbPath: ':memory:',
          fileDir: '.flightline/checkpoints',
        });

        const checkpoints = await storage.list({
          mission_id: options.mission,
          limit: parseInt(options.limit, 10),
        });

        if (options.json) {
          console.log(JSON.stringify(checkpoints, null, 2));
        } else {
          if (checkpoints.length === 0) {
            console.log('No checkpoints found.');
            return;
          }

          console.log('ID              TIMESTAMP                 TRIGGER    PROGRESS');
          console.log('─'.repeat(70));
          
          for (const cp of checkpoints) {
            const id = cp.id.padEnd(15);
            const ts = cp.timestamp.padEnd(25);
            const trigger = cp.trigger.padEnd(10);
            const progress = `${cp.progress_percent}%`;
            console.log(`${id} ${ts} ${trigger} ${progress}`);
          }

          console.log(`\nTotal: ${checkpoints.length} checkpoints`);
        }
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // fleet checkpoints show <id>
  cmd.command('show <id>')
    .description('Display detailed checkpoint information')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      try {
        const storage = new CheckpointStorage({
          dbPath: ':memory:',
          fileDir: '.flightline/checkpoints',
        });

        const checkpoint = await storage.get(id);

        if (!checkpoint) {
          console.error(`Error: Checkpoint not found: ${id}`);
          process.exit(1);
        }

        if (options.json) {
          console.log(JSON.stringify(checkpoint, null, 2));
        } else {
          console.log(`Checkpoint: ${checkpoint.id}`);
          console.log(`Mission: ${checkpoint.mission_id}`);
          console.log(`Created: ${checkpoint.timestamp}`);
          console.log(`Trigger: ${checkpoint.trigger}${checkpoint.trigger_details ? ` (${checkpoint.trigger_details})` : ''}`);
          console.log(`Progress: ${checkpoint.progress_percent}%`);
          console.log(`Created by: ${checkpoint.created_by}`);

          console.log(`\nSorties (${checkpoint.sorties.length}):`);
          for (const s of checkpoint.sorties) {
            const assigned = s.assigned_to || '-';
            const files = s.files?.join(', ') || '-';
            console.log(`  ${s.id}  ${s.status.padEnd(12)} ${assigned.padEnd(15)} ${files}`);
          }

          console.log(`\nActive Locks (${checkpoint.active_locks.length}):`);
          for (const l of checkpoint.active_locks) {
            console.log(`  ${l.file.padEnd(40)} ${l.held_by.padEnd(15)} ${l.purpose}`);
          }

          console.log(`\nPending Messages (${checkpoint.pending_messages.length}):`);
          for (const m of checkpoint.pending_messages) {
            console.log(`  From: ${m.from}  To: ${m.to.join(', ')}  Subject: "${m.subject}"`);
          }

          console.log(`\nRecovery Context:`);
          console.log(`  Last Action: ${checkpoint.recovery_context.last_action}`);
          console.log(`  Next Steps:`);
          checkpoint.recovery_context.next_steps.forEach(s => console.log(`    - ${s}`));
          console.log(`  Blockers: ${checkpoint.recovery_context.blockers.length > 0 ? checkpoint.recovery_context.blockers.join(', ') : 'None'}`);
          console.log(`  Files Modified: ${checkpoint.recovery_context.files_modified.join(', ')}`);
        }
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // fleet checkpoints prune
  cmd.command('prune')
    .description('Clean up old checkpoints')
    .option('--mission <id>', 'Prune specific mission only')
    .option('--older-than <days>', 'Delete checkpoints older than N days', '7')
    .option('--keep <n>', 'Keep at least N most recent per mission', '3')
    .option('--dry-run', 'Show what would be deleted')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (options) => {
      try {
        const storage = new CheckpointStorage({
          dbPath: ':memory:',
          fileDir: '.flightline/checkpoints',
        });

        const olderThanDays = parseInt(options.olderThan, 10);
        const keepPerMission = parseInt(options.keep, 10);

        const toDelete = await storage.findPruneCandidates({
          mission_id: options.mission,
          older_than_days: olderThanDays,
          keep_per_mission: keepPerMission,
        });

        if (toDelete.length === 0) {
          console.log('No checkpoints to prune.');
          return;
        }

        console.log(`Found ${toDelete.length} checkpoints to prune:`);
        for (const cp of toDelete) {
          console.log(`  ${cp.id}  ${cp.mission_id}  ${cp.timestamp}  ${cp.trigger}`);
        }

        if (options.dryRun) {
          console.log('\n[DRY RUN] No checkpoints were deleted.');
          return;
        }

        if (!options.yes) {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const confirmed = await new Promise<boolean>((resolve) => {
            rl.question('\nProceed? [y/N] ', (answer) => {
              rl.close();
              resolve(answer.toLowerCase() === 'y');
            });
          });

          if (!confirmed) {
            console.log('Prune cancelled.');
            return;
          }
        }

        let deleted = 0;
        for (const cp of toDelete) {
          await storage.delete(cp.id);
          deleted++;
        }

        console.log(`\nDeleted ${deleted} checkpoints.`);
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  return cmd;
}
```

---

## Non-Functional Requirements

### Performance

| Metric | Target | Rationale |
|--------|--------|-----------|
| SQLite migration | < 1s for 10K events | One-time operation |
| Recovery detection | < 100ms | Runs on startup |
| State restoration | < 500ms | Fast resumption critical |
| CLI command response | < 200ms | Interactive UX |
| Checkpoint creation | < 100ms | Non-blocking |

### Reliability

| Requirement | Implementation |
|-------------|----------------|
| Atomic migration | SQLite transaction, rollback on failure |
| Idempotent recovery | Safe to run multiple times |
| Graceful degradation | Continue if optional features fail |
| Data integrity | Validate before and after migration |
| Dual storage | SQLite primary + file backup |

### Backward Compatibility

| Concern | Mitigation |
|---------|------------|
| Existing API contracts | Wrapper layer maintains signatures |
| JSON data | Migration path with backup |
| CLI commands | New commands, no changes to existing |
| Event schemas | Maintain existing event types |

### Security

| Concern | Mitigation |
|---------|------------|
| File permissions | 0600 for database and checkpoint files |
| Sensitive data | Exclude secrets from checkpoints |
| SQL injection | Parameterized queries only |

---

## Implementation Plan

### Day 3: Core Implementation

**Morning (4 hours):**
- [ ] P0-1: Create SQLite migration wrapper in `squawk/src/db/index.ts`
- [ ] P0-1: Implement data migration from JSON to SQLite
- [ ] P0-1: Write migration tests (5 tests)
- [ ] P0-1: Verify all 19 existing API tests pass

**Afternoon (4 hours):**
- [ ] P0-2: Implement `RecoveryDetector` class
- [ ] P0-2: Implement `StateRestorer` class
- [ ] P0-2: Write recovery tests (8 tests)
- [ ] P0-2: Test recovery flow end-to-end

### Day 4: CLI & Integration

**Morning (4 hours):**
- [ ] P0-3: Implement `fleet checkpoint` command
- [ ] P0-3: Implement `fleet resume` command
- [ ] P0-3: Write CLI tests (6 tests)

**Afternoon (4 hours):**
- [ ] P0-3: Implement `fleet checkpoints list/show/prune` commands
- [ ] P0-3: Write CLI tests (6 tests)
- [ ] Integration testing across all P0 tasks
- [ ] Update documentation

---

## Files to Create/Modify

### New Files

| File | Purpose | Lines (est.) |
|------|---------|--------------|
| `squawk/src/recovery/detector.ts` | Recovery detection algorithm | 100 |
| `squawk/src/recovery/restorer.ts` | State restoration algorithm | 200 |
| `squawk/src/recovery/index.ts` | Recovery module exports | 10 |
| `cli/src/commands/checkpoint.ts` | CLI checkpoint command | 80 |
| `cli/src/commands/resume.ts` | CLI resume command | 120 |
| `cli/src/commands/checkpoints.ts` | CLI checkpoints list/show/prune | 180 |
| `tests/unit/recovery/detector.test.ts` | Detection tests | 150 |
| `tests/unit/recovery/restorer.test.ts` | Restoration tests | 200 |
| `tests/unit/cli/checkpoint.test.ts` | CLI checkpoint tests | 100 |
| `tests/unit/cli/resume.test.ts` | CLI resume tests | 100 |
| `tests/unit/cli/checkpoints.test.ts` | CLI checkpoints tests | 150 |
| `tests/integration/recovery-flow.test.ts` | E2E recovery tests | 200 |
| `tests/integration/migration.test.ts` | Migration tests | 100 |

### Modified Files

| File | Changes |
|------|---------|
| `squawk/src/db/index.ts` | Replace JSON with SQLiteAdapter wrapper |
| `squawk/src/db/sqlite.ts` | Add MissionOps, CheckpointOps, transaction support |
| `squawk/src/db/types.ts` | Add missing operation interfaces |
| `cli/index.ts` | Register new commands |
| `server/api/src/index.ts` | Initialize SQLite on startup |

---

## Test Plan

### Unit Tests

| Test File | Tests | Coverage Target |
|-----------|-------|-----------------|
| `detector.test.ts` | 8 | 95% |
| `restorer.test.ts` | 10 | 95% |
| `checkpoint.test.ts` | 6 | 90% |
| `resume.test.ts` | 6 | 90% |
| `checkpoints.test.ts` | 8 | 90% |

### Integration Tests

| Test File | Tests | Coverage Target |
|-----------|-------|-----------------|
| `recovery-flow.test.ts` | 5 | 90% |
| `migration.test.ts` | 5 | 95% |

### Test Scenarios

**Migration Tests:**
1. Migrate empty JSON file
2. Migrate JSON with mailboxes, events, cursors, locks
3. Handle corrupted JSON gracefully
4. Skip migration if no JSON file exists
5. Verify all data migrated correctly

**Detection Tests:**
1. Detect stale mission with checkpoint
2. Detect stale mission without checkpoint
3. Ignore active missions (recent activity)
4. Ignore completed missions
5. Configurable activity threshold
6. Multiple stale missions
7. No stale missions
8. Mission with no events

**Restoration Tests:**
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

**CLI Tests:**
1. `fleet checkpoint` creates checkpoint
2. `fleet checkpoint --mission` targets specific mission
3. `fleet checkpoint --note` adds trigger details
4. `fleet resume` restores from latest
5. `fleet resume --checkpoint` restores specific
6. `fleet resume --dry-run` shows preview
7. `fleet checkpoints list` shows all
8. `fleet checkpoints show` displays details
9. `fleet checkpoints prune` cleans up
10. `fleet checkpoints prune --dry-run` previews

---

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

---

## Open Questions (Resolved)

1. **Migration rollback**: If migration fails partway, restore from JSON backup automatically.
   - **Resolution**: Yes, keep JSON file until migration succeeds, then rename to `.backup`

2. **Lock conflict resolution**: If a lock is held by another agent during recovery, add to blockers by default. Support `--force-locks` flag to force-release.
   - **Resolution**: Add to blockers by default, `--force-locks` for override

3. **Multiple active missions**: Prompt for each mission individually, or use `--mission` to target specific one.
   - **Resolution**: Show list, use first by default, `--mission` for specific

4. **Auto-resume behavior**: CLI flag `--auto-resume` for non-interactive recovery.
   - **Resolution**: CLI flag, not config setting (explicit is better)

---

## Related Documentation

- [Phase 3 Context Survival Spec](../phase3-context-survival/spec.md)
- [TDD Implementation Guide](../tdd-implementation-guide.md)
- [Day 1 Implementation Summary](../day1-implementation-summary.md)
- [Shared Interfaces](../shared-interfaces.md)

---

**Status**: Ready for Implementation  
**Confidence**: 0.92  
**Last Updated**: 2026-01-05  
**Spec Version**: 1.0.0

### Assumptions

1. SQLiteAdapter from Day 2 is functional and tested
2. CheckpointStorage from Day 2 is functional and tested
3. CLI framework (Commander.js) is already set up
4. `.flightline/` directory structure exists

### Limitations

1. Recovery requires agent restart (no hot-reload)
2. Cannot detect context compaction in real-time (relies on inactivity)
3. Force-lock release may cause data inconsistency if original holder is still active
