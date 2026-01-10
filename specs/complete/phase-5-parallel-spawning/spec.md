# FleetTools Phase 5: Parallel Agent Spawning System

## Overview

Phase 5 implements the Parallel Agent Spawning System, enabling Dispatch (the coordinator agent) to spawn multiple Specialist agents that work on Sorties in parallel. This phase builds on Phase 4's Mission/Sortie decomposition by providing the execution layer that assigns work to Specialists, tracks their progress, and coordinates their completion.

### Goals

1. **Parallel Execution** - Spawn multiple Specialists simultaneously for independent Sorties
2. **Sequential Coordination** - Handle dependency chains where Sorties must complete in order
3. **Progress Tracking** - Real-time visibility into Specialist status and work progress
4. **Blocker Handling** - Detect and resolve blocked Specialists
5. **File Coordination** - Prevent conflicts via CTK (file locking) integration
6. **Review Process** - Validate completed work before Mission completion

### Terminology

| Term | Definition |
|------|------------|
| **Mission** | Parent work item containing multiple Sorties |
| **Sortie** | Child work item assigned to a single Specialist |
| **Specialist** | Worker agent spawned to complete a Sortie |
| **Dispatch** | Coordinator agent that spawns and monitors Specialists |
| **Squawk** | Messaging system for agent communication |
| **CTK** | Composite Tool Kit - file locking system |
| **Flightline** | `.flightline/` directory for work tracking |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DISPATCH                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Mission: msn-abc123                                     │    │
│  │  Status: in_progress                                     │    │
│  │  Sorties: 4 total, 2 in_progress, 1 completed, 1 pending │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │ Specialist  │     │ Specialist  │     │ Specialist  │       │
│  │ spc-001     │     │ spc-002     │     │ spc-003     │       │
│  │ Sortie: A   │     │ Sortie: B   │     │ Sortie: C   │       │
│  │ Status: 75% │     │ Status: 50% │     │ Status: done│       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│         │                    │                    │             │
│         └────────────────────┼────────────────────┘             │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │  Squawk Mailbox │                          │
│                    │  (Events/Msgs)  │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Stories

### US-501: Dispatch Spawns Specialists for Mission

**As a** Dispatch coordinator
**I want** to spawn Specialist agents for each Sortie in a Mission
**So that** work can be executed in parallel

#### Acceptance Criteria

- [ ] Dispatch reads Mission manifest and identifies all Sorties
- [ ] Dispatch spawns one Specialist per Sortie using native Task tool
- [ ] Independent Sorties spawn in parallel (same message)
- [ ] Dependent Sorties spawn sequentially (await previous completion)
- [ ] Each Specialist receives complete prompt with identity, task, and contract
- [ ] `specialist_spawned` event emitted for each spawn
- [ ] Dispatch tracks all active Specialists in SQLite

### US-502: Specialist Registers with Dispatch

**As a** Specialist agent
**I want** to register with Dispatch upon spawning
**So that** Dispatch knows I'm active and ready

#### Acceptance Criteria

- [ ] Specialist calls `fleet_register` as first action
- [ ] Registration includes Specialist ID, Sortie ID, Mission ID
- [ ] `specialist_registered` event emitted to Mission mailbox
- [ ] Specialist appears in `specialists` table with status `active`
- [ ] Dispatch acknowledges registration via Squawk

### US-503: Specialist Reserves Files via CTK

**As a** Specialist agent
**I want** to reserve files before editing
**So that** no other Specialist modifies the same files

#### Acceptance Criteria

- [ ] Specialist calls `fleet_reserve` with file list
- [ ] CTK creates locks for all files atomically
- [ ] Lock includes Specialist ID, timeout, purpose
- [ ] `ctk_reserved` event emitted
- [ ] Conflicting reservation returns error with lock holder info
- [ ] Specialist can extend lock timeout if needed

### US-504: Specialist Reports Progress

**As a** Specialist agent
**I want** to report my progress periodically
**So that** Dispatch can monitor work status

#### Acceptance Criteria

- [ ] Specialist calls `fleet_progress` at 25%, 50%, 75% milestones
- [ ] Progress includes percentage, message, files touched
- [ ] `sortie_progress` event emitted to Mission mailbox
- [ ] Dispatch updates Specialist record with last progress
- [ ] Progress visible in coordinator status endpoint

### US-505: Specialist Completes Sortie

**As a** Specialist agent
**I want** to mark my Sortie as complete
**So that** Dispatch can proceed with dependent work

#### Acceptance Criteria

- [ ] Specialist calls `fleet_complete` with summary and files
- [ ] `sortie_completed` event emitted to Mission mailbox
- [ ] Specialist releases all CTK locks via `fleet_release`
- [ ] `ctk_released` event emitted
- [ ] Specialist status updated to `completed`
- [ ] Dispatch checks for dependent Sorties to spawn

### US-506: Specialist Reports Blocker

**As a** Specialist agent
**I want** to report when I'm blocked
**So that** Dispatch can help resolve the issue

#### Acceptance Criteria

- [ ] Specialist calls `fleet_blocked` with reason and context
- [ ] `sortie_blocked` event emitted to Mission mailbox
- [ ] Dispatch receives notification immediately
- [ ] Blocker includes category (dependency, file_conflict, error, clarification)
- [ ] Dispatch can respond via Squawk with resolution

### US-507: Dispatch Monitors Active Specialists

**As a** Dispatch coordinator
**I want** to see status of all active Specialists
**So that** I can track Mission progress

#### Acceptance Criteria

- [ ] `GET /api/v1/coordinator/status` returns active Specialists
- [ ] Each Specialist shows: ID, Sortie, status, progress, last_seen
- [ ] Stale Specialists (no heartbeat > 5min) flagged
- [ ] Mission progress calculated from Sortie completion
- [ ] Blocked Specialists highlighted

### US-508: Dispatch Reviews Completed Work

**As a** Dispatch coordinator
**I want** to review Specialist work before Mission completion
**So that** I can ensure quality and consistency

#### Acceptance Criteria

- [ ] Dispatch receives `sortie_completed` events
- [ ] Dispatch can query files touched by each Specialist
- [ ] Dispatch runs validation checks (tests pass, lint clean)
- [ ] Dispatch can request revisions via Squawk
- [ ] All Sorties must be reviewed before Mission marked complete

---

## Dispatch Orchestration Algorithm

### Spawning Strategy

```typescript
interface SpawnStrategy {
  parallel: SortieId[];    // Spawn all at once
  sequential: SortieId[];  // Spawn one at a time, await completion
}

function determineSpawnStrategy(mission: Mission): SpawnStrategy {
  const graph = buildDependencyGraph(mission.sorties);
  const parallel: SortieId[] = [];
  const sequential: SortieId[] = [];
  
  for (const sortie of mission.sorties) {
    if (sortie.dependencies.length === 0) {
      parallel.push(sortie.id);
    } else {
      sequential.push(sortie.id);
    }
  }
  
  return { parallel, sequential };
}
```

### Orchestration Flow

```
1. RECEIVE Mission with Sorties
   │
2. ANALYZE dependency graph
   │
3. IDENTIFY independent Sorties (no dependencies)
   │
4. SPAWN Specialists for independent Sorties (parallel)
   │  ├── Task(prompt=specialist_prompt_1)
   │  ├── Task(prompt=specialist_prompt_2)
   │  └── Task(prompt=specialist_prompt_3)
   │
5. MONITOR via Squawk mailbox
   │  ├── specialist_registered events
   │  ├── sortie_progress events
   │  ├── sortie_blocked events
   │  └── sortie_completed events
   │
6. ON sortie_completed:
   │  ├── Check for dependent Sorties now unblocked
   │  ├── Spawn Specialists for newly unblocked Sorties
   │  └── Update Mission progress
   │
7. ON sortie_blocked:
   │  ├── Analyze blocker reason
   │  ├── Attempt resolution (reassign files, provide info)
   │  └── Notify Specialist of resolution
   │
8. WHEN all Sorties completed:
   │  ├── Run review process
   │  ├── Validate all work
   │  └── Mark Mission complete
   │
9. EMIT mission_completed event
```

### Dependency Resolution

```typescript
interface DependencyGraph {
  nodes: Map<SortieId, Sortie>;
  edges: Map<SortieId, SortieId[]>;  // sortie -> depends_on
}

function getReadySorties(
  graph: DependencyGraph, 
  completed: Set<SortieId>
): Sortie[] {
  const ready: Sortie[] = [];
  
  for (const [sortieId, sortie] of graph.nodes) {
    if (completed.has(sortieId)) continue;
    
    const deps = graph.edges.get(sortieId) || [];
    const allDepsComplete = deps.every(d => completed.has(d));
    
    if (allDepsComplete) {
      ready.push(sortie);
    }
  }
  
  return ready;
}
```

---

## Specialist Prompt Template

### Full Template

```markdown
# Specialist Assignment

You are a FleetTools Specialist agent assigned to complete a specific Sortie.
Follow the MANDATORY SURVIVAL CHECKLIST exactly - skipping steps will cause failures.

## Identity

- **Specialist ID:** {{specialist_id}}
- **Sortie ID:** {{sortie_id}}
- **Mission ID:** {{mission_id}}
- **Role:** {{specialist_role}}

## Task

**Title:** {{sortie_title}}

**Description:**
{{sortie_description}}

**Success Criteria:**
{{#each success_criteria}}
- {{this}}
{{/each}}

## File Contract

### Exclusive Access (You Own These)
These files are reserved for you. You may create, modify, or delete them.

{{#each exclusive_files}}
- `{{this}}`
{{/each}}

### Read Only (Reference Only)
These files are owned by other Specialists. Read but do not modify.

{{#each readonly_files}}
- `{{this}}`
{{/each}}

### Dependencies Completed
Previous Specialists have completed:

{{#each completed_dependencies}}
- **{{this.sortie_id}}:** {{this.summary}}
{{/each}}

## Communication

- **Dispatch Mailbox:** `dispatch-{{mission_id}}`
- **Your Mailbox:** `specialist-{{specialist_id}}`

Use `fleet_squawk` to send messages to Dispatch or other Specialists.

---

## MANDATORY SURVIVAL CHECKLIST

You MUST complete these steps in order. Failure to follow this checklist
will result in coordination failures, file conflicts, and Mission failure.

### Step 1: Register with Dispatch

**FIRST ACTION - Do this immediately upon spawning.**

```
fleet_register(
  specialist_id="{{specialist_id}}",
  sortie_id="{{sortie_id}}",
  mission_id="{{mission_id}}"
)
```

Expected response: `{ "status": "registered", "acknowledged": true }`

### Step 2: Reserve Your Files

**BEFORE any file modifications.**

```
fleet_reserve(
  files=[{{#each exclusive_files}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}],
  specialist_id="{{specialist_id}}",
  timeout_ms=300000
)
```

Expected response: `{ "locks": [...], "all_acquired": true }`

If `all_acquired: false`, check `conflicts` array and wait or request reassignment.

### Step 3: Do the Work

Follow TDD methodology:
1. **RED** - Write failing tests first
2. **GREEN** - Implement minimum code to pass
3. **REFACTOR** - Clean up while tests pass

Run tests frequently:
```bash
bun test {{test_pattern}}
```

Commit working increments:
```bash
git add -A && git commit -m "{{sortie_id}}: <description>"
```

### Step 4: Report Progress

Report at each milestone:

```
# At 25% - Initial structure/tests
fleet_progress(
  sortie_id="{{sortie_id}}",
  percent=25,
  message="Initial tests written, structure in place"
)

# At 50% - Core implementation
fleet_progress(
  sortie_id="{{sortie_id}}",
  percent=50,
  message="Core functionality implemented"
)

# At 75% - Tests passing, cleanup
fleet_progress(
  sortie_id="{{sortie_id}}",
  percent=75,
  message="All tests passing, refactoring"
)
```

### Step 5: Handle Blockers

If you encounter a blocker, report immediately:

```
fleet_blocked(
  sortie_id="{{sortie_id}}",
  reason="<description of blocker>",
  category="dependency|file_conflict|error|clarification",
  context={
    "file": "<file if applicable>",
    "error": "<error message if applicable>",
    "needed_from": "<specialist_id if waiting on another>"
  }
)
```

Wait for Dispatch response before proceeding.

### Step 6: Complete the Sortie

**ONLY after all success criteria are met.**

```
fleet_complete(
  sortie_id="{{sortie_id}}",
  summary="<1-2 sentence summary of what was done>",
  files_touched=[<list of files created/modified>],
  tests_passed=true
)
```

### Step 7: Release File Locks

**FINAL ACTION - Release all locks.**

```
fleet_release(
  specialist_id="{{specialist_id}}"
)
```

---

## Error Recovery

### If Registration Fails
- Retry up to 3 times with exponential backoff
- If still failing, log error and terminate

### If File Reservation Fails
- Check which files are conflicted
- Send `fleet_blocked` with category `file_conflict`
- Wait for Dispatch to resolve

### If Tests Fail
- Do not proceed to completion
- Fix tests or report blocker
- Never mark complete with failing tests

### If Stuck > 10 minutes
- Send `fleet_progress` with current state
- Send `fleet_blocked` if truly stuck
- Dispatch may provide guidance or reassign

---

## Quality Standards

1. **All tests must pass** before completion
2. **No lint errors** in touched files
3. **Type safety** - no `any` types without justification
4. **Documentation** - JSDoc for public functions
5. **Commits** - atomic, descriptive messages

---

## Example Workflow

```
1. fleet_register(...)           # Register with Dispatch
2. fleet_reserve(files=[...])    # Lock my files
3. <write tests>                 # RED phase
4. fleet_progress(percent=25)    # Report progress
5. <implement code>              # GREEN phase
6. fleet_progress(percent=50)    # Report progress
7. <run tests, fix issues>       # Iterate
8. fleet_progress(percent=75)    # Report progress
9. <refactor, cleanup>           # REFACTOR phase
10. <final test run>             # Verify all passing
11. fleet_complete(...)          # Mark done
12. fleet_release(...)           # Release locks
```

---

**Remember:** You are part of a coordinated fleet. Your actions affect other
Specialists. Follow the checklist, communicate via Squawk, and complete your
Sortie with quality.
```

### Template Variables

| Variable | Type | Description |
|----------|------|-------------|
| `specialist_id` | string | Unique ID for this Specialist (spc-uuid) |
| `sortie_id` | string | ID of assigned Sortie |
| `mission_id` | string | Parent Mission ID |
| `specialist_role` | string | Role description (e.g., "Backend Developer") |
| `sortie_title` | string | Human-readable Sortie title |
| `sortie_description` | string | Detailed task description |
| `success_criteria` | string[] | List of completion criteria |
| `exclusive_files` | string[] | Files this Specialist owns |
| `readonly_files` | string[] | Files to reference only |
| `completed_dependencies` | object[] | Previous Sortie completions |
| `test_pattern` | string | Test file pattern to run |

---

## Specialist Tools Specification

### fleet_register

Registers Specialist with Dispatch upon spawning.

```typescript
interface FleetRegisterParams {
  specialist_id: string;
  sortie_id: string;
  mission_id: string;
  metadata?: Record<string, unknown>;
}

interface FleetRegisterResponse {
  status: 'registered' | 'error';
  acknowledged: boolean;
  dispatch_mailbox: string;
  timestamp: string;
  error?: string;
}
```

**API Endpoint:** `POST /api/v1/specialist/register`

**Events Emitted:**
- `specialist_registered` to Mission mailbox

### fleet_reserve

Reserves files for exclusive access via CTK.

```typescript
interface FleetReserveParams {
  files: string[];
  specialist_id: string;
  timeout_ms?: number;  // Default: 300000 (5 min)
  purpose?: string;     // Default: 'edit'
}

interface FleetReserveResponse {
  locks: Lock[];
  all_acquired: boolean;
  conflicts?: {
    file: string;
    held_by: string;
    expires_at: string;
  }[];
}
```

**API Endpoint:** `POST /api/v1/specialist/reserve`

**Events Emitted:**
- `ctk_reserved` to Mission mailbox

### fleet_release

Releases all file locks held by Specialist.

```typescript
interface FleetReleaseParams {
  specialist_id: string;
  lock_ids?: string[];  // Optional: specific locks, default: all
}

interface FleetReleaseResponse {
  released: string[];
  failed: string[];
}
```

**API Endpoint:** `POST /api/v1/specialist/release`

**Events Emitted:**
- `ctk_released` to Mission mailbox

### fleet_progress

Reports progress on Sortie.

```typescript
interface FleetProgressParams {
  sortie_id: string;
  percent: number;      // 0-100
  message: string;
  files_touched?: string[];
  metadata?: Record<string, unknown>;
}

interface FleetProgressResponse {
  acknowledged: boolean;
  timestamp: string;
}
```

**API Endpoint:** `POST /api/v1/specialist/progress`

**Events Emitted:**
- `sortie_progress` to Mission mailbox

### fleet_complete

Marks Sortie as complete.

```typescript
interface FleetCompleteParams {
  sortie_id: string;
  summary: string;
  files_touched: string[];
  tests_passed: boolean;
  commits?: string[];
  metadata?: Record<string, unknown>;
}

interface FleetCompleteResponse {
  status: 'completed' | 'error';
  review_required: boolean;
  next_steps?: string;
  error?: string;
}
```

**API Endpoint:** `POST /api/v1/specialist/complete`

**Events Emitted:**
- `sortie_completed` to Mission mailbox

### fleet_blocked

Reports a blocker preventing progress.

```typescript
interface FleetBlockedParams {
  sortie_id: string;
  reason: string;
  category: 'dependency' | 'file_conflict' | 'error' | 'clarification';
  context?: {
    file?: string;
    error?: string;
    needed_from?: string;
    stack_trace?: string;
  };
}

interface FleetBlockedResponse {
  acknowledged: boolean;
  ticket_id: string;
  estimated_resolution?: string;
}
```

**API Endpoint:** `POST /api/v1/specialist/blocked`

**Events Emitted:**
- `sortie_blocked` to Mission mailbox

### fleet_squawk

Sends message to Dispatch or another Specialist.

```typescript
interface FleetSquawkParams {
  to: string;           // Mailbox ID (dispatch-xxx or specialist-xxx)
  message_type: string;
  payload: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high';
}

interface FleetSquawkResponse {
  message_id: string;
  delivered: boolean;
  timestamp: string;
}
```

**API Endpoint:** `POST /api/v1/specialist/squawk`

**Events Emitted:**
- Custom event to target mailbox

---

## Parallel vs Sequential Spawning Logic

### Parallel Spawning

Used when Sorties have no dependencies on each other.

```typescript
// In Dispatch agent context
async function spawnParallelSpecialists(sorties: Sortie[]): Promise<void> {
  // All Task calls in same message = parallel execution
  const prompts = sorties.map(s => buildSpecialistPrompt(s));
  
  // These execute in parallel
  await Promise.all([
    Task({ subagent_type: 'fleet-specialist', prompt: prompts[0] }),
    Task({ subagent_type: 'fleet-specialist', prompt: prompts[1] }),
    Task({ subagent_type: 'fleet-specialist', prompt: prompts[2] }),
  ]);
}
```

### Sequential Spawning

Used when Sorties have dependencies.

```typescript
async function spawnSequentialSpecialists(
  sorties: Sortie[], 
  dependencyOrder: SortieId[]
): Promise<void> {
  for (const sortieId of dependencyOrder) {
    const sortie = sorties.find(s => s.id === sortieId);
    const prompt = buildSpecialistPrompt(sortie);
    
    // Wait for completion before spawning next
    const result = await Task({ 
      subagent_type: 'fleet-specialist', 
      prompt 
    });
    
    // Verify completion
    await waitForSortieCompletion(sortieId);
  }
}
```

### Hybrid Spawning

Most Missions use a combination.

```typescript
async function spawnMissionSpecialists(mission: Mission): Promise<void> {
  const { parallel, sequential } = determineSpawnStrategy(mission);
  
  // Phase 1: Spawn all independent Sorties in parallel
  await spawnParallelSpecialists(
    mission.sorties.filter(s => parallel.includes(s.id))
  );
  
  // Phase 2: As Sorties complete, spawn dependent ones
  const completed = new Set<SortieId>();
  
  while (completed.size < mission.sorties.length) {
    // Wait for any completion event
    const event = await waitForCompletionEvent(mission.id);
    completed.add(event.sortie_id);
    
    // Find newly unblocked Sorties
    const ready = getReadySorties(mission.sorties, completed);
    
    // Spawn them in parallel
    await spawnParallelSpecialists(ready);
  }
}
```

---

## Progress Tracking

### Specialist Status States

```typescript
type SpecialistStatus = 
  | 'spawned'      // Task created, not yet registered
  | 'registered'   // Registered with Dispatch
  | 'reserving'    // Acquiring file locks
  | 'working'      // Actively working on Sortie
  | 'blocked'      // Reported a blocker
  | 'completing'   // Finishing up, releasing locks
  | 'completed'    // Successfully completed
  | 'failed'       // Failed to complete
  | 'stale';       // No heartbeat > 5 minutes
```

### Progress Tracking Table

```sql
-- Extended specialists table for Phase 5
CREATE TABLE IF NOT EXISTS specialists (
    id TEXT PRIMARY KEY,
    sortie_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    status TEXT DEFAULT 'spawned',
    progress_percent INTEGER DEFAULT 0,
    progress_message TEXT,
    files_reserved TEXT,           -- JSON array
    files_touched TEXT,            -- JSON array
    last_seen TEXT NOT NULL,
    registered_at TEXT,
    completed_at TEXT,
    blocked_reason TEXT,
    blocked_category TEXT,
    metadata TEXT,
    FOREIGN KEY (sortie_id) REFERENCES sorties(id),
    FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE INDEX IF NOT EXISTS idx_specialists_mission ON specialists(mission_id);
CREATE INDEX IF NOT EXISTS idx_specialists_status ON specialists(status);
CREATE INDEX IF NOT EXISTS idx_specialists_sortie ON specialists(sortie_id);
```

### Heartbeat Mechanism

Specialists send implicit heartbeats via progress reports. Dispatch marks
Specialists as `stale` if no activity for 5 minutes.

```typescript
// Run every 60 seconds
async function checkStaleSpecialists(): Promise<void> {
  const staleThreshold = Date.now() - (5 * 60 * 1000);
  
  const stale = await db.query(`
    UPDATE specialists 
    SET status = 'stale'
    WHERE status IN ('registered', 'working', 'reserving')
    AND datetime(last_seen) < datetime(?, 'unixepoch')
    RETURNING id, sortie_id
  `, [staleThreshold / 1000]);
  
  for (const specialist of stale) {
    await emitEvent('specialist_stale', {
      specialist_id: specialist.id,
      sortie_id: specialist.sortie_id,
    });
  }
}
```

---

## Blocker Handling

### Blocker Categories

| Category | Description | Resolution Strategy |
|----------|-------------|---------------------|
| `dependency` | Waiting on another Sortie | Check if dependency complete, notify when ready |
| `file_conflict` | Cannot acquire file lock | Negotiate with lock holder, reassign files |
| `error` | Runtime error or test failure | Provide debugging guidance, may reassign |
| `clarification` | Needs more information | Dispatch provides clarification via Squawk |

### Blocker Resolution Flow

```
1. Specialist sends fleet_blocked(category, reason, context)
   │
2. Dispatch receives sortie_blocked event
   │
3. Dispatch analyzes blocker:
   │
   ├── dependency:
   │   ├── Check if dependency actually complete
   │   ├── If complete, notify Specialist to proceed
   │   └── If not, add to wait queue
   │
   ├── file_conflict:
   │   ├── Identify lock holder
   │   ├── Check if lock expired (auto-release)
   │   ├── Request lock holder to release early
   │   └── Or reassign files between Specialists
   │
   ├── error:
   │   ├── Analyze error context
   │   ├── Provide debugging suggestions
   │   ├── May spawn helper Specialist
   │   └── Or reassign Sortie to new Specialist
   │
   └── clarification:
       ├── Review original requirements
       ├── Provide additional context
       └── Update Sortie description if needed
   │
4. Dispatch sends resolution via fleet_squawk
   │
5. Specialist receives message, continues work
```

### Blocker Timeout

If a blocker is not resolved within 15 minutes, Dispatch may:
1. Reassign the Sortie to a new Specialist
2. Mark the Sortie as failed
3. Escalate to human operator

---

## Review Process

### Automatic Validation

When a Specialist calls `fleet_complete`, Dispatch runs:

```typescript
interface ValidationResult {
  passed: boolean;
  checks: {
    tests_pass: boolean;
    lint_clean: boolean;
    types_valid: boolean;
    files_match: boolean;  // Touched files match declared
    no_conflicts: boolean; // No merge conflicts
  };
  errors: string[];
}

async function validateSortieCompletion(
  sortie: Sortie,
  completion: FleetCompleteParams
): Promise<ValidationResult> {
  const checks = {
    tests_pass: await runTests(sortie.test_pattern),
    lint_clean: await runLint(completion.files_touched),
    types_valid: await runTypeCheck(),
    files_match: validateFilesTouched(sortie, completion),
    no_conflicts: await checkMergeConflicts(),
  };
  
  return {
    passed: Object.values(checks).every(Boolean),
    checks,
    errors: buildErrorList(checks),
  };
}
```

### Review States

```typescript
type ReviewState = 
  | 'pending'     // Awaiting review
  | 'validating'  // Running automatic checks
  | 'approved'    // Passed all checks
  | 'rejected'    // Failed checks, needs revision
  | 'revised';    // Specialist made revisions
```

### Revision Request

If validation fails, Dispatch sends revision request:

```typescript
await fleet_squawk({
  to: `specialist-${specialist_id}`,
  message_type: 'revision_required',
  payload: {
    sortie_id,
    validation_result,
    instructions: 'Please fix the following issues...',
  },
  priority: 'high',
});
```

---

## Events

### Event Types

| Event | Emitted By | Description |
|-------|------------|-------------|
| `specialist_spawned` | Dispatch | Specialist Task created |
| `specialist_registered` | Specialist | Specialist registered with Dispatch |
| `specialist_stale` | Dispatch | No heartbeat > 5 minutes |
| `specialist_completed` | Specialist | Specialist finished all work |
| `ctk_reserved` | Specialist | Files locked |
| `ctk_released` | Specialist | Files unlocked |
| `ctk_conflict` | System | Lock conflict detected |
| `sortie_started` | Specialist | Work begun on Sortie |
| `sortie_progress` | Specialist | Progress update |
| `sortie_blocked` | Specialist | Blocker reported |
| `sortie_completed` | Specialist | Sortie finished |
| `sortie_failed` | Dispatch | Sortie could not complete |
| `mission_progress` | Dispatch | Overall Mission progress |
| `mission_completed` | Dispatch | All Sorties done |

### Event Schema

```typescript
interface SpecialistEvent {
  id: string;
  type: string;
  stream_id: string;        // Mission mailbox ID
  occurred_at: string;
  data: {
    specialist_id?: string;
    sortie_id?: string;
    mission_id?: string;
    [key: string]: unknown;
  };
  causation_id?: string;    // Previous event that caused this
  metadata?: {
    source: 'dispatch' | 'specialist' | 'system';
    version: string;
  };
}
```

### Event Flow Example

```
1. specialist_spawned (Dispatch)
   │
2. specialist_registered (Specialist)
   │
3. ctk_reserved (Specialist)
   │
4. sortie_started (Specialist)
   │
5. sortie_progress (Specialist, 25%)
   │
6. sortie_progress (Specialist, 50%)
   │
7. sortie_blocked (Specialist)
   │
8. [Dispatch resolves blocker via Squawk]
   │
9. sortie_progress (Specialist, 75%)
   │
10. sortie_completed (Specialist)
    │
11. ctk_released (Specialist)
    │
12. specialist_completed (Specialist)
```

---

## API Endpoints

### Specialist Operations

#### POST /api/v1/specialist/register

Register a new Specialist with Dispatch.

**Request:**
```json
{
  "specialist_id": "spc-abc123",
  "sortie_id": "srt-def456",
  "mission_id": "msn-ghi789",
  "metadata": {}
}
```

**Response:**
```json
{
  "status": "registered",
  "acknowledged": true,
  "dispatch_mailbox": "dispatch-msn-ghi789",
  "timestamp": "2026-01-04T12:00:00.000Z"
}
```

#### POST /api/v1/specialist/reserve

Reserve files for exclusive access.

**Request:**
```json
{
  "files": ["src/api/handler.ts", "src/api/types.ts"],
  "specialist_id": "spc-abc123",
  "timeout_ms": 300000
}
```

**Response:**
```json
{
  "locks": [
    {
      "id": "lock-001",
      "file": "src/api/handler.ts",
      "reserved_by": "spc-abc123",
      "expires_at": "2026-01-04T12:05:00.000Z"
    }
  ],
  "all_acquired": true
}
```

#### POST /api/v1/specialist/release

Release file locks.

**Request:**
```json
{
  "specialist_id": "spc-abc123"
}
```

**Response:**
```json
{
  "released": ["lock-001", "lock-002"],
  "failed": []
}
```

#### POST /api/v1/specialist/progress

Report progress on Sortie.

**Request:**
```json
{
  "sortie_id": "srt-def456",
  "percent": 50,
  "message": "Core implementation complete",
  "files_touched": ["src/api/handler.ts"]
}
```

**Response:**
```json
{
  "acknowledged": true,
  "timestamp": "2026-01-04T12:02:00.000Z"
}
```

#### POST /api/v1/specialist/complete

Mark Sortie as complete.

**Request:**
```json
{
  "sortie_id": "srt-def456",
  "summary": "Implemented API handler with full test coverage",
  "files_touched": ["src/api/handler.ts", "tests/api/handler.test.ts"],
  "tests_passed": true,
  "commits": ["abc123", "def456"]
}
```

**Response:**
```json
{
  "status": "completed",
  "review_required": true,
  "next_steps": "Awaiting Dispatch review"
}
```

#### POST /api/v1/specialist/blocked

Report a blocker.

**Request:**
```json
{
  "sortie_id": "srt-def456",
  "reason": "Cannot acquire lock on shared config file",
  "category": "file_conflict",
  "context": {
    "file": "src/config.ts",
    "needed_from": "spc-xyz789"
  }
}
```

**Response:**
```json
{
  "acknowledged": true,
  "ticket_id": "blk-001",
  "estimated_resolution": "2 minutes"
}
```

#### POST /api/v1/specialist/squawk

Send message to another agent.

**Request:**
```json
{
  "to": "dispatch-msn-ghi789",
  "message_type": "question",
  "payload": {
    "question": "Should I include deprecated API support?"
  },
  "priority": "normal"
}
```

**Response:**
```json
{
  "message_id": "msg-001",
  "delivered": true,
  "timestamp": "2026-01-04T12:03:00.000Z"
}
```

### Coordinator Operations

#### GET /api/v1/coordinator/status

Get coordinator status with active Specialists.

**Response:**
```json
{
  "active_mailboxes": 5,
  "active_locks": 12,
  "active_specialists": [
    {
      "id": "spc-abc123",
      "sortie_id": "srt-def456",
      "mission_id": "msn-ghi789",
      "status": "working",
      "progress_percent": 50,
      "progress_message": "Core implementation complete",
      "last_seen": "2026-01-04T12:02:00.000Z"
    }
  ],
  "missions": [
    {
      "id": "msn-ghi789",
      "status": "in_progress",
      "sorties_total": 4,
      "sorties_completed": 1,
      "sorties_in_progress": 2,
      "sorties_pending": 1
    }
  ],
  "blocked_specialists": [],
  "stale_specialists": [],
  "timestamp": "2026-01-04T12:05:00.000Z"
}
```

#### GET /api/v1/coordinator/specialists

List all Specialists for a Mission.

**Query Parameters:**
- `mission_id` (required): Mission ID
- `status` (optional): Filter by status

**Response:**
```json
{
  "specialists": [
    {
      "id": "spc-abc123",
      "sortie_id": "srt-def456",
      "status": "working",
      "progress_percent": 50,
      "files_reserved": ["src/api/handler.ts"],
      "registered_at": "2026-01-04T12:00:00.000Z",
      "last_seen": "2026-01-04T12:02:00.000Z"
    }
  ]
}
```

#### POST /api/v1/coordinator/spawn

Spawn Specialists for a Mission (used by Dispatch).

**Request:**
```json
{
  "mission_id": "msn-ghi789",
  "sorties": ["srt-def456", "srt-ghi012"],
  "parallel": true
}
```

**Response:**
```json
{
  "spawned": [
    {
      "specialist_id": "spc-abc123",
      "sortie_id": "srt-def456",
      "status": "spawned"
    }
  ],
  "timestamp": "2026-01-04T12:00:00.000Z"
}
```

---

## Non-Functional Requirements

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Specialist spawn latency | < 2s | Time from spawn request to registered |
| Progress event delivery | < 500ms | Time from emit to Dispatch receipt |
| Lock acquisition | < 100ms | Time to acquire file lock |
| Coordinator status query | < 200ms | API response time |
| Concurrent Specialists | 10+ | Per Mission |

### Reliability

- **Event durability**: All events persisted to SQLite before acknowledgment
- **Lock timeout**: Automatic release after timeout (default 5 min)
- **Stale detection**: Specialists marked stale after 5 min inactivity
- **Retry logic**: 3 retries with exponential backoff for transient failures
- **Graceful degradation**: Mission continues if single Specialist fails

### Scalability

- **Horizontal**: Multiple Missions can run concurrently
- **Vertical**: Single Mission supports 10+ parallel Specialists
- **Storage**: SQLite handles 1000+ events per Mission

### Security

- **Specialist isolation**: Each Specialist only accesses assigned files
- **Lock ownership**: Only lock holder can release lock
- **Event authentication**: Events include source identification
- **No secrets in prompts**: Credentials passed via environment

### Observability

- **Logging**: All Specialist actions logged with correlation IDs
- **Metrics**: Specialist count, progress, completion rate
- **Tracing**: Event causation chain for debugging
- **Alerting**: Stale Specialists, blocked > 15 min

---

## Success Criteria

### Phase 5 Complete When:

1. [ ] Dispatch can spawn Specialists for a Mission
2. [ ] Specialists register and appear in coordinator status
3. [ ] Specialists reserve files via CTK without conflicts
4. [ ] Progress events flow from Specialists to Dispatch
5. [ ] Blocked Specialists receive resolution from Dispatch
6. [ ] Completed Sorties trigger dependent Sortie spawning
7. [ ] All Sorties complete triggers Mission completion
8. [ ] Review process validates Specialist work
9. [ ] Stale Specialists detected and handled
10. [ ] 10+ Specialists can work in parallel on single Mission

### Test Coverage

- [ ] Unit tests for all Specialist tools
- [ ] Integration tests for Dispatch orchestration
- [ ] E2E test: 3-Sortie Mission with dependencies
- [ ] Load test: 10 parallel Specialists
- [ ] Failure test: Specialist crash recovery

---

## Files to Create/Modify

### New Files

```
server/api/src/specialist/
├── register.ts          # POST /api/v1/specialist/register
├── reserve.ts           # POST /api/v1/specialist/reserve
├── release.ts           # POST /api/v1/specialist/release
├── progress.ts          # POST /api/v1/specialist/progress
├── complete.ts          # POST /api/v1/specialist/complete
├── blocked.ts           # POST /api/v1/specialist/blocked
├── squawk.ts            # POST /api/v1/specialist/squawk
└── index.ts             # Route registration

server/api/src/dispatch/
├── orchestrator.ts      # Spawning and coordination logic
├── dependency-graph.ts  # Dependency resolution
├── review.ts            # Validation and review
└── index.ts             # Dispatch utilities

squawk/src/db/
├── specialists.ts       # Specialist CRUD operations
└── schema-v2.sql        # Extended schema with specialists

templates/
└── specialist-prompt.hbs  # Handlebars template for prompts

tests/integration/api/
├── specialist-register.test.ts
├── specialist-reserve.test.ts
├── specialist-progress.test.ts
├── specialist-complete.test.ts
├── specialist-blocked.test.ts
└── dispatch-orchestration.test.ts

tests/e2e/
└── parallel-spawning.test.ts
```

### Modified Files

```
server/api/src/index.ts
  - Register specialist routes
  - Register dispatch routes

server/api/src/squawk/coordinator.ts
  - Add active_specialists to status
  - Add missions summary

squawk/src/db/index.ts
  - Add specialistOps CRUD
  - Add mission tracking

squawk/src/db/schema.sql
  - Add specialists table extensions
  - Add missions table
  - Add sorties table
```

---

## Implementation Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 5.1 | 2 days | Specialist tools (register, reserve, release) |
| 5.2 | 2 days | Progress and completion tools |
| 5.3 | 2 days | Blocker handling and Squawk messaging |
| 5.4 | 3 days | Dispatch orchestrator and dependency graph |
| 5.5 | 2 days | Review process and validation |
| 5.6 | 2 days | Integration tests and E2E tests |
| 5.7 | 1 day | Documentation and cleanup |

**Total: 14 days**

---

## Related Documentation

- [Phase 4 Spec: Mission/Sortie Decomposition](../phase-4-decomposition/spec.md)
- [FleetTools Implementation Fixes](../fleettools-fixes/spec.md)
- [Squawk README](../../squawk/README.md)
- [Flightline README](../../flightline/README.md)

---

**Status:** Ready for Implementation
**Confidence:** 0.90
**Last Updated:** 2026-01-04
**Spec Version:** 1.0.0
