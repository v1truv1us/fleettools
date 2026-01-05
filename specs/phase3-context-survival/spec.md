# FleetTools Phase 3: Context Survival System Specification

## Overview

The Context Survival System enables AI agent fleets to survive context window compaction ("context death") by automatically checkpointing state at progress milestones and providing seamless recovery. When an agent's context is compacted, all in-progress work state is lost. This system captures snapshots of mission state, active locks, pending messages, and recovery context that allow work to resume from the last checkpoint.

### Problem Statement

AI agents operating in fleet coordination have finite context windows. When context is compacted:
- In-progress sortie state is lost
- File locks become orphaned
- Pending messages are never delivered
- Specialists lose track of their assignments
- Dispatch loses visibility into fleet status

### Solution

Implement a checkpoint system that:
1. Automatically captures fleet state at 25%, 50%, 75% progress milestones
2. Stores checkpoints durably in SQLite and `.flightline/` backup
3. Detects when resumption is needed on agent startup
4. Injects recovery context into agent prompts for seamless continuation

### Design Principles

1. **Fail-safe defaults**: Checkpoint on any ambiguous state change
2. **Minimal overhead**: Checkpoints are lightweight JSON snapshots
3. **Dual storage**: SQLite primary + file backup for resilience
4. **LLM-friendly recovery**: Context includes natural language summaries
5. **Non-blocking**: Checkpoint operations don't block mission progress

---

## User Stories

### US-301: Automatic Progress Checkpointing

**As a** Dispatch coordinator managing a multi-sortie mission  
**I want** fleet state automatically checkpointed at progress milestones  
**So that** work can resume if my context window is compacted

#### Acceptance Criteria

- [ ] Checkpoint created when mission reaches 25% completion
- [ ] Checkpoint created when mission reaches 50% completion
- [ ] Checkpoint created when mission reaches 75% completion
- [ ] Progress calculated as: `completed_sorties / total_sorties * 100`
- [ ] Checkpoint includes all active sortie states
- [ ] Checkpoint includes all held file locks
- [ ] Checkpoint includes all pending mailbox messages
- [ ] `fleet_checkpointed` event emitted on checkpoint creation

### US-302: Error-Triggered Checkpointing

**As a** Specialist worker encountering an error  
**I want** current state checkpointed before error handling  
**So that** recovery can resume from a known-good state

#### Acceptance Criteria

- [ ] Checkpoint created on unhandled exception in sortie execution
- [ ] Checkpoint created on API error (4xx/5xx responses)
- [ ] Checkpoint created on lock acquisition timeout
- [ ] Checkpoint created on message delivery failure
- [ ] Error details captured in `recovery_context.blockers`
- [ ] Checkpoint trigger marked as `"error"`

### US-303: Manual Checkpoint Command

**As a** developer debugging a complex mission  
**I want** to manually trigger a checkpoint  
**So that** I can capture state at specific points

#### Acceptance Criteria

- [ ] `fleet checkpoint` CLI command creates checkpoint
- [ ] `fleet checkpoint --mission <id>` targets specific mission
- [ ] `fleet checkpoint --note "description"` adds context
- [ ] Checkpoint trigger marked as `"manual"`
- [ ] Command returns checkpoint ID for reference
- [ ] Works in both local and synced modes

### US-304: Context Compaction Detection

**As a** Dispatch coordinator resuming after context compaction  
**I want** the system to detect I need recovery  
**So that** I can resume from the last checkpoint

#### Acceptance Criteria

- [ ] On agent startup, check for active missions without completion
- [ ] Detect missions with `status = "in_progress"` and no recent activity
- [ ] Activity threshold: no events in last 5 minutes
- [ ] Prompt user with recovery option if checkpoint exists
- [ ] `context_compacted` event emitted when compaction detected
- [ ] Support `--auto-resume` flag for non-interactive recovery

### US-305: Checkpoint Recovery Flow

**As a** Dispatch coordinator recovering from context death  
**I want** to resume from the latest checkpoint  
**So that** I can continue the mission without data loss

#### Acceptance Criteria

- [ ] `fleet resume` loads latest checkpoint for active mission
- [ ] `fleet resume --checkpoint <id>` loads specific checkpoint
- [ ] Recovery restores sortie states to checkpoint values
- [ ] Recovery re-acquires file locks that were held
- [ ] Recovery context injected into agent prompt
- [ ] `fleet_recovered` event emitted on successful recovery
- [ ] Orphaned locks from crashed agents are released

### US-306: Checkpoint Listing and Inspection

**As a** developer troubleshooting a mission  
**I want** to list and inspect checkpoints  
**So that** I can understand mission history

#### Acceptance Criteria

- [ ] `fleet checkpoints list` shows all checkpoints for current mission
- [ ] `fleet checkpoints list --mission <id>` targets specific mission
- [ ] `fleet checkpoints show <id>` displays checkpoint details
- [ ] Output includes timestamp, trigger, progress, sortie count
- [ ] JSON output available with `--json` flag
- [ ] Checkpoints sorted by timestamp descending

### US-307: Specialist Recovery Context

**As a** Specialist worker resuming after context death  
**I want** clear context about my previous work  
**So that** I can continue without confusion

#### Acceptance Criteria

- [ ] Recovery context includes `last_action` description
- [ ] Recovery context includes `next_steps` array
- [ ] Recovery context includes `blockers` array
- [ ] Recovery context includes `files_modified` array
- [ ] Context formatted for LLM consumption (natural language)
- [ ] Specialist can query their specific recovery context

### US-308: Checkpoint Cleanup

**As a** system administrator  
**I want** old checkpoints automatically cleaned up  
**So that** storage doesn't grow unbounded

#### Acceptance Criteria

- [ ] Checkpoints older than 7 days auto-deleted (configurable)
- [ ] Keep at least 3 most recent checkpoints per mission
- [ ] Completed missions: keep only final checkpoint for 30 days
- [ ] `fleet checkpoints prune` manual cleanup command
- [ ] Cleanup runs on server startup and daily thereafter
- [ ] Cleanup logged but doesn't block operations

---

## Checkpoint Schema

### TypeScript Interface

```typescript
interface Checkpoint {
  // Identity
  id: string;                      // "chk-<uuid>" format
  mission_id: string;              // Parent mission ID
  timestamp: string;               // ISO 8601 timestamp
  
  // Trigger metadata
  trigger: CheckpointTrigger;
  trigger_details?: string;        // Additional context for trigger
  progress_percent: number;        // 0-100, calculated from sorties
  
  // State snapshot
  sorties: SortieSnapshot[];
  active_locks: LockSnapshot[];
  pending_messages: MessageSnapshot[];
  
  // Recovery context for LLM
  recovery_context: RecoveryContext;
  
  // Metadata
  created_by: string;              // Agent ID that created checkpoint
  version: string;                 // Schema version for migrations
}

type CheckpointTrigger = 
  | "progress"      // Milestone reached (25/50/75%)
  | "error"         // Exception or failure
  | "manual"        // User-triggered
  | "compaction";   // Pre-compaction (if detectable)

interface SortieSnapshot {
  id: string;
  status: SortieStatus;
  assigned_to?: string;            // Specialist ID
  files: string[];                 // Files being worked on
  started_at?: string;
  progress_notes?: string;         // Last status update
}

type SortieStatus = 
  | "pending"
  | "assigned" 
  | "in_progress"
  | "blocked"
  | "completed"
  | "failed";

interface LockSnapshot {
  id: string;
  file: string;
  held_by: string;                 // Specialist ID
  acquired_at: string;
  purpose: string;
  timeout_ms: number;
}

interface MessageSnapshot {
  id: string;
  from: string;
  to: string[];
  subject: string;
  sent_at: string;
  delivered: boolean;
}

interface RecoveryContext {
  // What was happening
  last_action: string;             // "Specialist-2 was editing auth.ts"
  
  // What should happen next
  next_steps: string[];            // ["Complete auth.ts changes", "Run tests"]
  
  // What's blocking progress
  blockers: string[];              // ["Waiting for API response", "Lock conflict"]
  
  // Files touched in this session
  files_modified: string[];        // ["src/auth.ts", "tests/auth.test.ts"]
  
  // Mission-level summary
  mission_summary: string;         // "Implementing user authentication feature"
  
  // Time context
  elapsed_time_ms: number;         // Time since mission start
  last_activity_at: string;        // Last event timestamp
}
```

### SQLite Schema

```sql
-- Checkpoints table
CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    trigger TEXT NOT NULL CHECK (trigger IN ('progress', 'error', 'manual', 'compaction')),
    trigger_details TEXT,
    progress_percent INTEGER NOT NULL CHECK (progress_percent >= 0 AND progress_percent <= 100),
    
    -- Serialized JSON snapshots
    sorties_json TEXT NOT NULL,
    locks_json TEXT NOT NULL,
    messages_json TEXT NOT NULL,
    recovery_context_json TEXT NOT NULL,
    
    -- Metadata
    created_by TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    
    -- Indexes
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_checkpoints_mission ON checkpoints(mission_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_checkpoints_trigger ON checkpoints(trigger);
CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON checkpoints(timestamp);

-- Missions table (if not exists from Phase 2)
CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
```

### File Backup Schema

Checkpoints are also stored as JSON files for resilience:

```
.flightline/
└── checkpoints/
    └── <mission-id>/
        ├── chk-abc123.json
        ├── chk-def456.json
        └── latest.json          # Symlink to most recent
```

Each checkpoint file contains the full `Checkpoint` interface serialized as JSON.

---

## Recovery Algorithm

### Phase 1: Detection

```
ON agent_startup:
  1. Query missions WHERE status = 'in_progress'
  2. FOR each active_mission:
       a. Get latest event timestamp
       b. IF (now - latest_event) > ACTIVITY_THRESHOLD (5 min):
            - Mark as potentially_stale
       c. Get latest checkpoint for mission
       d. IF checkpoint exists AND checkpoint.progress < 100:
            - Add to recovery_candidates
  3. IF recovery_candidates is not empty:
       - Emit 'context_compacted' event
       - Prompt for recovery OR auto-resume if --auto-resume
```

### Phase 2: State Restoration

```
ON fleet_resume(checkpoint_id):
  1. Load checkpoint from SQLite (fallback to file if missing)
  2. Validate checkpoint schema version
  3. BEGIN TRANSACTION:
       a. FOR each sortie in checkpoint.sorties:
            - Update sortie status to checkpoint state
            - Clear any post-checkpoint progress
       b. FOR each lock in checkpoint.active_locks:
            - IF lock still valid (not expired):
                - Re-acquire lock for original holder
            - ELSE:
                - Add to recovery_context.blockers
       c. FOR each message in checkpoint.pending_messages:
            - IF not delivered:
                - Re-queue for delivery
  4. COMMIT TRANSACTION
  5. Emit 'fleet_recovered' event with checkpoint details
  6. Return recovery_context for prompt injection
```

### Phase 3: Context Injection

```
ON recovery_complete(recovery_context):
  1. Format recovery prompt:
     """
     ## Recovery Context
     
     You are resuming a mission after context compaction.
     
     **Mission**: {recovery_context.mission_summary}
     **Progress**: {checkpoint.progress_percent}%
     **Last Action**: {recovery_context.last_action}
     
     ### Next Steps
     {for step in recovery_context.next_steps: "- " + step}
     
     ### Current Blockers
     {for blocker in recovery_context.blockers: "- " + blocker}
     
     ### Files Modified
     {for file in recovery_context.files_modified: "- " + file}
     
     ### Time Context
     - Elapsed: {format_duration(recovery_context.elapsed_time_ms)}
     - Last activity: {recovery_context.last_activity_at}
     
     Please review the current state and continue the mission.
     """
  2. Inject prompt into agent context
  3. Resume normal operation
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Checkpoint file missing | Fall back to SQLite, warn user |
| SQLite record missing | Fall back to file, warn user |
| Both missing | Error, cannot recover |
| Lock expired during recovery | Add to blockers, attempt re-acquire |
| Lock held by another agent | Add to blockers, notify user |
| Message already delivered | Skip, log duplicate prevention |
| Schema version mismatch | Run migration, then recover |
| Corrupted checkpoint | Try previous checkpoint, warn user |

---

## Integration with Dispatch (Coordinator)

### Checkpoint Triggers in Dispatch

```typescript
class DispatchCoordinator {
  private lastCheckpointProgress = 0;
  private checkpointThresholds = [25, 50, 75];
  
  async onSortieCompleted(sortieId: string): Promise<void> {
    const mission = await this.getCurrentMission();
    const progress = this.calculateProgress(mission);
    
    // Check if we crossed a threshold
    for (const threshold of this.checkpointThresholds) {
      if (this.lastCheckpointProgress < threshold && progress >= threshold) {
        await this.createCheckpoint({
          trigger: 'progress',
          trigger_details: `Reached ${threshold}% milestone`,
          progress_percent: progress,
        });
        this.lastCheckpointProgress = threshold;
        break;
      }
    }
  }
  
  async onError(error: Error, context: ErrorContext): Promise<void> {
    await this.createCheckpoint({
      trigger: 'error',
      trigger_details: `${error.name}: ${error.message}`,
      progress_percent: this.calculateProgress(await this.getCurrentMission()),
    });
  }
  
  private calculateProgress(mission: Mission): number {
    const total = mission.sorties.length;
    if (total === 0) return 0;
    
    const completed = mission.sorties.filter(
      s => s.status === 'completed'
    ).length;
    
    return Math.round((completed / total) * 100);
  }
}
```

### Recovery Integration

```typescript
class DispatchCoordinator {
  async initialize(): Promise<void> {
    // Check for recovery on startup
    const recoveryNeeded = await this.checkForRecovery();
    
    if (recoveryNeeded) {
      const checkpoint = await this.getLatestCheckpoint();
      
      if (this.options.autoResume) {
        await this.resumeFromCheckpoint(checkpoint);
      } else {
        this.emit('recovery_available', {
          checkpoint,
          message: `Found checkpoint from ${checkpoint.timestamp}. Resume?`,
        });
      }
    }
  }
  
  async resumeFromCheckpoint(checkpoint: Checkpoint): Promise<RecoveryContext> {
    // Restore state
    await this.restoreSorties(checkpoint.sorties);
    await this.restoreLocks(checkpoint.active_locks);
    await this.requeueMessages(checkpoint.pending_messages);
    
    // Emit recovery event
    this.emit('fleet_recovered', {
      checkpoint_id: checkpoint.id,
      mission_id: checkpoint.mission_id,
      progress: checkpoint.progress_percent,
    });
    
    return checkpoint.recovery_context;
  }
}
```

---

## Integration with Specialists (Workers)

### Specialist Checkpoint Awareness

```typescript
class Specialist {
  private currentSortie: Sortie | null = null;
  
  async onAssignment(sortie: Sortie): Promise<void> {
    this.currentSortie = sortie;
    
    // Check if this is a recovery assignment
    if (sortie.recovery_context) {
      await this.handleRecoveryAssignment(sortie);
    } else {
      await this.handleNewAssignment(sortie);
    }
  }
  
  private async handleRecoveryAssignment(sortie: Sortie): Promise<void> {
    const context = sortie.recovery_context;
    
    // Log recovery context
    this.log(`Resuming sortie from checkpoint`);
    this.log(`Last action: ${context.last_action}`);
    this.log(`Next steps: ${context.next_steps.join(', ')}`);
    
    // Re-acquire locks if needed
    for (const file of context.files_modified) {
      await this.ensureLock(file);
    }
    
    // Continue from where we left off
    await this.continueWork(context);
  }
  
  async reportProgress(notes: string): Promise<void> {
    if (!this.currentSortie) return;
    
    // Update sortie with progress notes (used in checkpoints)
    await this.api.updateSortie(this.currentSortie.id, {
      progress_notes: notes,
      last_activity_at: new Date().toISOString(),
    });
  }
}
```

### Specialist Recovery Context Query

```typescript
class Specialist {
  async getMyRecoveryContext(): Promise<RecoveryContext | null> {
    const checkpoint = await this.api.getLatestCheckpoint();
    if (!checkpoint) return null;
    
    // Find my sortie in the checkpoint
    const mySortie = checkpoint.sorties.find(
      s => s.assigned_to === this.id
    );
    
    if (!mySortie) return null;
    
    // Build specialist-specific context
    return {
      last_action: mySortie.progress_notes || 'Unknown',
      next_steps: this.inferNextSteps(mySortie),
      blockers: this.findMyBlockers(checkpoint),
      files_modified: mySortie.files,
      mission_summary: checkpoint.recovery_context.mission_summary,
      elapsed_time_ms: checkpoint.recovery_context.elapsed_time_ms,
      last_activity_at: checkpoint.recovery_context.last_activity_at,
    };
  }
}
```

---

## Event Definitions

### fleet_checkpointed

Emitted when a checkpoint is successfully created.

```typescript
interface FleetCheckpointedEvent {
  type: 'fleet_checkpointed';
  timestamp: string;
  data: {
    checkpoint_id: string;
    mission_id: string;
    trigger: CheckpointTrigger;
    progress_percent: number;
    sortie_count: number;
    lock_count: number;
    message_count: number;
  };
}
```

### fleet_recovered

Emitted when fleet successfully resumes from a checkpoint.

```typescript
interface FleetRecoveredEvent {
  type: 'fleet_recovered';
  timestamp: string;
  data: {
    checkpoint_id: string;
    mission_id: string;
    recovered_sorties: number;
    recovered_locks: number;
    requeued_messages: number;
    recovery_duration_ms: number;
  };
}
```

### checkpoint_created

Emitted for each individual checkpoint record (lower-level than fleet_checkpointed).

```typescript
interface CheckpointCreatedEvent {
  type: 'checkpoint_created';
  timestamp: string;
  data: {
    checkpoint_id: string;
    mission_id: string;
    trigger: CheckpointTrigger;
    storage_locations: ('sqlite' | 'file')[];
  };
}
```

### context_compacted

Emitted when context compaction is detected.

```typescript
interface ContextCompactedEvent {
  type: 'context_compacted';
  timestamp: string;
  data: {
    mission_id: string;
    last_activity_at: string;
    inactivity_duration_ms: number;
    checkpoint_available: boolean;
    checkpoint_id?: string;
  };
}
```

---

## CLI Command Specifications

### fleet checkpoint

Create a manual checkpoint of current mission state.

```
USAGE:
    fleet checkpoint [OPTIONS]

OPTIONS:
    --mission <ID>      Target specific mission (default: current active)
    --note <TEXT>       Add descriptive note to checkpoint
    --json              Output checkpoint details as JSON
    -q, --quiet         Suppress output except errors

EXAMPLES:
    # Checkpoint current mission
    fleet checkpoint
    
    # Checkpoint with note
    fleet checkpoint --note "Before refactoring auth module"
    
    # Checkpoint specific mission
    fleet checkpoint --mission msn-abc123

OUTPUT:
    Checkpoint created: chk-def456
    Mission: msn-abc123
    Progress: 50%
    Sorties: 4 (2 completed, 1 in_progress, 1 pending)
    Locks: 2 active
    Messages: 1 pending
```

### fleet resume

Resume mission from latest or specified checkpoint.

```
USAGE:
    fleet resume [OPTIONS]

OPTIONS:
    --checkpoint <ID>   Resume from specific checkpoint
    --mission <ID>      Resume specific mission (default: most recent active)
    --dry-run           Show what would be restored without applying
    --json              Output recovery context as JSON
    -y, --yes           Skip confirmation prompt

EXAMPLES:
    # Resume from latest checkpoint
    fleet resume
    
    # Resume specific checkpoint
    fleet resume --checkpoint chk-def456
    
    # Preview recovery
    fleet resume --dry-run

OUTPUT:
    Resuming from checkpoint: chk-def456
    Mission: msn-abc123 - "Implement user authentication"
    
    Recovery Context:
    - Last action: Specialist-2 was editing src/auth.ts
    - Progress: 50% (2/4 sorties complete)
    
    Next Steps:
    1. Complete auth.ts changes
    2. Run authentication tests
    3. Update API documentation
    
    Blockers:
    - None
    
    Files Modified:
    - src/auth.ts
    - src/middleware/auth-middleware.ts
    
    Restoring state...
    - Restored 4 sorties
    - Re-acquired 2 locks
    - Requeued 1 message
    
    Recovery complete. Mission resumed.
```

### fleet checkpoints list

List checkpoints for a mission.

```
USAGE:
    fleet checkpoints list [OPTIONS]

OPTIONS:
    --mission <ID>      Target specific mission (default: current active)
    --limit <N>         Maximum checkpoints to show (default: 10)
    --json              Output as JSON array

EXAMPLES:
    # List checkpoints for current mission
    fleet checkpoints list
    
    # List for specific mission
    fleet checkpoints list --mission msn-abc123

OUTPUT:
    Checkpoints for mission: msn-abc123
    
    ID              TIMESTAMP                 TRIGGER    PROGRESS
    chk-def456      2026-01-04T15:30:00Z     progress   75%
    chk-abc123      2026-01-04T14:15:00Z     progress   50%
    chk-789xyz      2026-01-04T13:00:00Z     progress   25%
    chk-manual1     2026-01-04T12:30:00Z     manual     20%
    
    Total: 4 checkpoints
```

### fleet checkpoints show

Display detailed checkpoint information.

```
USAGE:
    fleet checkpoints show <CHECKPOINT_ID> [OPTIONS]

OPTIONS:
    --json              Output as JSON

EXAMPLES:
    fleet checkpoints show chk-def456

OUTPUT:
    Checkpoint: chk-def456
    Mission: msn-abc123
    Created: 2026-01-04T15:30:00Z
    Trigger: progress (Reached 75% milestone)
    Progress: 75%
    
    Sorties (4):
      srt-001  completed   Specialist-1  src/models/user.ts
      srt-002  completed   Specialist-2  src/auth.ts
      srt-003  in_progress Specialist-1  src/api/routes.ts
      srt-004  pending     -             tests/auth.test.ts
    
    Active Locks (2):
      src/api/routes.ts      Specialist-1  acquired 5m ago
      src/middleware/auth.ts Specialist-2  acquired 3m ago
    
    Pending Messages (1):
      From: Dispatch  To: Specialist-2  Subject: "Review auth changes"
    
    Recovery Context:
      Last Action: Specialist-1 implementing API routes
      Next Steps:
        - Complete routes.ts implementation
        - Write authentication tests
      Blockers: None
      Files Modified: src/models/user.ts, src/auth.ts, src/api/routes.ts
```

### fleet checkpoints prune

Manually clean up old checkpoints.

```
USAGE:
    fleet checkpoints prune [OPTIONS]

OPTIONS:
    --mission <ID>      Prune specific mission only
    --older-than <DAYS> Delete checkpoints older than N days (default: 7)
    --keep <N>          Keep at least N most recent per mission (default: 3)
    --dry-run           Show what would be deleted
    -y, --yes           Skip confirmation

EXAMPLES:
    # Prune with defaults
    fleet checkpoints prune
    
    # Preview cleanup
    fleet checkpoints prune --dry-run
    
    # Aggressive cleanup
    fleet checkpoints prune --older-than 3 --keep 1

OUTPUT:
    Pruning checkpoints older than 7 days (keeping 3 per mission)...
    
    Would delete:
      chk-old001  msn-abc123  2025-12-20  progress
      chk-old002  msn-abc123  2025-12-21  manual
      chk-old003  msn-def456  2025-12-22  error
    
    Total: 3 checkpoints (2.4 MB)
    
    Proceed? [y/N]
```

---

## API Endpoints

### POST /api/v1/checkpoints

Create a new checkpoint.

```http
POST /api/v1/checkpoints
Content-Type: application/json

{
  "mission_id": "msn-abc123",
  "trigger": "manual",
  "trigger_details": "Before refactoring",
  "created_by": "dispatch-001"
}
```

Response:
```json
{
  "checkpoint": {
    "id": "chk-def456",
    "mission_id": "msn-abc123",
    "timestamp": "2026-01-04T15:30:00.000Z",
    "trigger": "manual",
    "trigger_details": "Before refactoring",
    "progress_percent": 50,
    "sorties": [...],
    "active_locks": [...],
    "pending_messages": [...],
    "recovery_context": {...},
    "created_by": "dispatch-001",
    "version": "1.0.0"
  }
}
```

### GET /api/v1/checkpoints

List checkpoints for a mission.

```http
GET /api/v1/checkpoints?mission_id=msn-abc123&limit=10
```

Response:
```json
{
  "checkpoints": [
    {
      "id": "chk-def456",
      "mission_id": "msn-abc123",
      "timestamp": "2026-01-04T15:30:00.000Z",
      "trigger": "progress",
      "progress_percent": 75
    }
  ],
  "total": 4
}
```

### GET /api/v1/checkpoints/:id

Get checkpoint details.

```http
GET /api/v1/checkpoints/chk-def456
```

Response: Full checkpoint object.

### POST /api/v1/checkpoints/:id/recover

Initiate recovery from a checkpoint.

```http
POST /api/v1/checkpoints/chk-def456/recover
Content-Type: application/json

{
  "dry_run": false,
  "agent_id": "dispatch-001"
}
```

Response:
```json
{
  "success": true,
  "recovery_context": {
    "last_action": "Specialist-2 was editing src/auth.ts",
    "next_steps": ["Complete auth.ts changes", "Run tests"],
    "blockers": [],
    "files_modified": ["src/auth.ts"],
    "mission_summary": "Implementing user authentication",
    "elapsed_time_ms": 3600000,
    "last_activity_at": "2026-01-04T15:25:00.000Z"
  },
  "restored": {
    "sorties": 4,
    "locks": 2,
    "messages": 1
  }
}
```

### DELETE /api/v1/checkpoints/:id

Delete a specific checkpoint.

```http
DELETE /api/v1/checkpoints/chk-def456
```

Response: 204 No Content

### POST /api/v1/checkpoints/prune

Prune old checkpoints.

```http
POST /api/v1/checkpoints/prune
Content-Type: application/json

{
  "older_than_days": 7,
  "keep_per_mission": 3,
  "mission_id": null,
  "dry_run": false
}
```

Response:
```json
{
  "deleted": 3,
  "freed_bytes": 2457600,
  "details": [
    {"id": "chk-old001", "mission_id": "msn-abc123"},
    {"id": "chk-old002", "mission_id": "msn-abc123"},
    {"id": "chk-old003", "mission_id": "msn-def456"}
  ]
}
```

---

## Non-Functional Requirements

### Performance

| Metric | Target | Rationale |
|--------|--------|-----------|
| Checkpoint creation | < 100ms | Non-blocking, shouldn't delay mission |
| Checkpoint size | < 100KB typical | JSON snapshots are lightweight |
| Recovery time | < 500ms | Fast resumption critical for UX |
| Query latency | < 50ms | SQLite with proper indexes |
| File backup write | < 200ms | Async, non-blocking |

### Reliability

| Requirement | Implementation |
|-------------|----------------|
| Dual storage | SQLite primary + file backup |
| Atomic writes | SQLite transactions, atomic file rename |
| Corruption detection | JSON schema validation on load |
| Graceful degradation | Continue if backup fails, warn user |
| Idempotent recovery | Safe to run multiple times |

### Storage

| Constraint | Value |
|------------|-------|
| Max checkpoints per mission | 100 (configurable) |
| Default retention | 7 days |
| Minimum retention | 3 most recent per mission |
| Completed mission retention | 30 days (final checkpoint only) |
| Max checkpoint size | 1MB (warn if exceeded) |

### Security

| Concern | Mitigation |
|---------|------------|
| Sensitive data in checkpoints | Exclude secrets, tokens from snapshots |
| File permissions | 0600 for checkpoint files |
| SQLite permissions | 0600 for database file |
| Injection attacks | Parameterized queries only |

---

## Success Criteria

### Functional

- [ ] Automatic checkpoints created at 25%, 50%, 75% progress
- [ ] Manual checkpoint command works
- [ ] Error-triggered checkpoints capture failure context
- [ ] Recovery detects stale missions on startup
- [ ] Recovery restores sortie states correctly
- [ ] Recovery re-acquires valid locks
- [ ] Recovery requeues undelivered messages
- [ ] Recovery context injected into agent prompt
- [ ] CLI commands work in local and synced modes
- [ ] API endpoints return correct responses
- [ ] Events emitted for all checkpoint operations

### Non-Functional

- [ ] Checkpoint creation < 100ms (p95)
- [ ] Recovery < 500ms (p95)
- [ ] No data loss on recovery
- [ ] Graceful handling of corrupted checkpoints
- [ ] Automatic cleanup prevents unbounded growth
- [ ] Works offline (local mode)

### Integration

- [ ] Dispatch creates checkpoints on progress
- [ ] Specialists receive recovery context
- [ ] Events flow through Squawk mailbox
- [ ] File backups sync with `.flightline/`
- [ ] CLI integrates with existing commands

---

## Files to Create

### New Files

| File | Purpose |
|------|---------|
| `server/api/src/checkpoints/index.ts` | Checkpoint API routes |
| `server/api/src/checkpoints/service.ts` | Checkpoint business logic |
| `server/api/src/checkpoints/storage.ts` | Dual storage (SQLite + file) |
| `server/api/src/checkpoints/recovery.ts` | Recovery algorithm |
| `squawk/src/db/migrations/002_checkpoints.sql` | Schema migration |
| `cli/src/commands/checkpoint.ts` | CLI checkpoint command |
| `cli/src/commands/resume.ts` | CLI resume command |
| `cli/src/commands/checkpoints.ts` | CLI checkpoints list/show/prune |
| `tests/integration/api/checkpoints.test.ts` | API integration tests |
| `tests/unit/checkpoints/service.test.ts` | Service unit tests |
| `tests/unit/checkpoints/recovery.test.ts` | Recovery algorithm tests |
| `specs/phase3-context-survival/spec.md` | This specification |

### Modified Files

| File | Changes |
|------|---------|
| `server/api/src/index.ts` | Register checkpoint routes |
| `server/api/src/squawk/coordinator.ts` | Add checkpoint triggers |
| `squawk/src/db/schema.sql` | Add checkpoints table |
| `squawk/src/db/index.ts` | Add checkpoint operations |
| `cli/index.ts` | Register new commands |
| `README.md` | Document checkpoint feature |

---

## Implementation Phases

### Phase 3.1: Core Schema & Storage (Day 1)

- [ ] Add checkpoints table to SQLite schema
- [ ] Implement checkpoint storage service
- [ ] Implement file backup storage
- [ ] Add checkpoint CRUD operations
- [ ] Write storage unit tests

### Phase 3.2: Checkpoint Creation (Day 1-2)

- [ ] Implement progress calculation
- [ ] Add automatic checkpoint triggers
- [ ] Add error checkpoint triggers
- [ ] Add manual checkpoint API
- [ ] Emit checkpoint events
- [ ] Write creation tests

### Phase 3.3: Recovery Algorithm (Day 2-3)

- [ ] Implement compaction detection
- [ ] Implement state restoration
- [ ] Implement lock re-acquisition
- [ ] Implement message requeuing
- [ ] Build recovery context
- [ ] Write recovery tests

### Phase 3.4: CLI Commands (Day 3)

- [ ] Implement `fleet checkpoint`
- [ ] Implement `fleet resume`
- [ ] Implement `fleet checkpoints list`
- [ ] Implement `fleet checkpoints show`
- [ ] Implement `fleet checkpoints prune`
- [ ] Write CLI tests

### Phase 3.5: Integration & Polish (Day 4)

- [ ] Integrate with Dispatch coordinator
- [ ] Integrate with Specialist workers
- [ ] Add cleanup job
- [ ] End-to-end testing
- [ ] Documentation updates

---

## Open Questions

1. **Pre-compaction detection**: Can we detect when context compaction is about to happen? Current approach relies on inactivity detection.

2. **Cross-agent recovery**: If Dispatch dies but Specialists continue, how do we handle partial state?

3. **Checkpoint conflicts**: If two agents try to checkpoint simultaneously, how do we resolve?

4. **Large file lists**: If a sortie touches hundreds of files, should we truncate `files_modified`?

5. **Recovery prompt format**: Should recovery context be structured data or natural language for LLM consumption?

---

## Related Documentation

- [FleetTools README](/home/vitruvius/git/fleettools/README.md)
- [Phase 1-2 Spec](/home/vitruvius/git/fleettools/specs/fleettools-fixes/spec.md)
- [Squawk README](/home/vitruvius/git/fleettools/squawk/README.md)
- [Implementation Summary](/home/vitruvius/git/fleettools/IMPLEMENTATION.md)

---

**Status**: Ready for Implementation  
**Confidence**: 0.88  
**Last Updated**: 2026-01-04  
**Spec Version**: 1.0.0

### Assumptions

1. Missions and sorties already exist from Phase 2 work orders
2. SQLite database is available and initialized
3. `.flightline/` directory exists and is writable
4. Agents have unique IDs for tracking
5. Lock timeout mechanism from Phase 2 is functional

### Limitations

1. Cannot detect context compaction in real-time (relies on inactivity)
2. Recovery requires agent restart (no hot-reload)
3. File backup is best-effort (SQLite is source of truth)
4. Large checkpoints (>1MB) may impact performance
