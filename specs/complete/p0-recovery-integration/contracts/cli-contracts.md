# CLI Contracts - P0 Recovery Integration

## Overview

This document defines the command-line interface contracts for P0 Recovery Integration features, including command signatures, options, input/output formats, and error handling.

## Commands

### 1. `fleet checkpoint`

Create a manual checkpoint of current mission state.

#### Signature

```bash
fleet checkpoint [options]
```

#### Options

| Option | Type | Required | Default | Description |
|--------|-------|-----------|-----------|
| `--mission <id>` | string | No | Current active mission (first `in_progress`) |
| `--note <text>` | string | No | Descriptive note for checkpoint trigger |
| `--json` | flag | No | Output checkpoint as JSON |
| `-q, --quiet` | flag | No | Suppress output except errors |

#### Input

No required positional arguments. All inputs via options.

#### Output

**Default (human-readable)**:
```
Checkpoint created: chk-abc12345
Mission: msn-xyz67890
Progress: 50%
Sorties: 3
Locks: 2 active
Messages: 5 pending
```

**JSON format**:
```json
{
  "id": "chk-abc12345",
  "mission_id": "msn-xyz67890",
  "timestamp": "2026-01-05T12:00:00.000Z",
  "trigger": "manual",
  "trigger_details": "Before complex refactor",
  "progress_percent": 50,
  "sorties": [...],
  "active_locks": [...],
  "pending_messages": [...],
  "recovery_context": {...},
  "created_by": "cli",
  "version": "1.0.0"
}
```

**Quiet mode**: No output on success.

#### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (no active mission, database error, etc.) |
| 2 | Invalid arguments |

#### Errors

```
Error: No active mission found. Use --mission <id> to specify.
```

```
Error: Failed to create checkpoint: [error message]
```

---

### 2. `fleet resume`

Resume mission from latest or specified checkpoint.

#### Signature

```bash
fleet resume [options]
```

#### Options

| Option | Type | Required | Default | Description |
|--------|-------|-----------|-----------|
| `--checkpoint <id>` | string | No | Resume from specific checkpoint (default: latest) |
| `--mission <id>` | string | No | Target specific mission (default: most recent active) |
| `--dry-run` | flag | No | Show what would be restored without applying |
| `--json` | flag | No | Output recovery context as JSON |
| `-y, --yes` | flag | No | Skip confirmation prompt |

#### Input

No required positional arguments. All inputs via options.

#### Output

**Default (human-readable)**:
```
Found stale mission: Implement authentication system
Last activity: 2026-01-05T10:00:00.000Z
Checkpoint: chk-abc12345 (50%)

Proceed with recovery? [y/N] y

Recovery complete:
- Sorties: 3
- Locks: 2
- Messages: 5

--- Recovery Context ---
## Recovery Context

You are resuming a mission after context compaction.

**Mission**: Implement authentication system
**Progress**: 3 sorties restored
**Last Action**: Started implementing JWT tokens

### Next Steps
- Complete JWT token implementation
- Add token refresh logic
- Write unit tests

### Current Blockers
- Waiting for API endpoint documentation

### Files Modified
- src/auth/jwt.ts
- src/auth/tokens.ts

### Time Context
- Elapsed: 2h 30m
- Last activity: 2026-01-05T10:00:00.000Z

Please review the current state and continue the mission.
```

**Dry run output**:
```
[DRY RUN] Would restore:
- Sorties: 3
- Locks: 2
- Messages: 5
```

**JSON format**:
```json
{
  "success": true,
  "checkpoint_id": "chk-abc12345",
  "mission_id": "msn-xyz67890",
  "recovery_context": {...},
  "restored": {
    "sorties": 3,
    "locks": 2,
    "messages": 5
  },
  "errors": [],
  "warnings": ["Lock expired: src/file.ts (was held by spec-001)"]
}
```

#### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (no checkpoint, recovery failed, etc.) |
| 2 | Invalid arguments |
| 3 | User cancelled |

#### Errors

```
Error: No missions need recovery.
```

```
Error: No checkpoint found for mission: msn-xyz67890
```

```
Error: Failed to restore from checkpoint: [error message]
```

---

### 3. `fleet checkpoints list`

List checkpoints for a mission.

#### Signature

```bash
fleet checkpoints list [options]
```

#### Options

| Option | Type | Required | Default | Description |
|--------|-------|-----------|-----------|
| `--mission <id>` | string | No | Current active mission |
| `--limit <n>` | integer | 10 | Maximum checkpoints to show |
| `--json` | flag | No | Output as JSON array |

#### Output

**Default (human-readable)**:
```
ID              TIMESTAMP                 TRIGGER    PROGRESS
----------------------------------------------------------------------
chk-abc12345    2026-01-05T12:00:00Z  manual     50%
chk-def67890    2026-01-05T11:30:00Z  progress   25%
chk-ghi13579    2026-01-05T11:00:00Z  error      0%

Total: 3 checkpoints
```

**JSON format**:
```json
[
  {
    "id": "chk-abc12345",
    "mission_id": "msn-xyz67890",
    "timestamp": "2026-01-05T12:00:00.000Z",
    "trigger": "manual",
    "progress_percent": 50,
    ...
  },
  ...
]
```

**No checkpoints**:
```
No checkpoints found.
```

---

### 4. `fleet checkpoints show`

Display detailed checkpoint information.

#### Signature

```bash
fleet checkpoints show <id> [options]
```

#### Arguments

| Argument | Type | Required | Description |
|----------|-------|-----------|-------------|
| `<id>` | string | Yes | Checkpoint ID |

#### Options

| Option | Type | Required | Default | Description |
|--------|-------|-----------|-----------|
| `--json` | flag | No | Output as JSON |

#### Output

**Default (human-readable)**:
```
Checkpoint: chk-abc12345
Mission: msn-xyz67890
Created: 2026-01-05T12:00:00.000Z
Trigger: manual (Before complex refactor)
Progress: 50%
Created by: cli

Sorties (3):
  srt-001  completed    spec-001       src/file.ts
  srt-002  in_progress  spec-002       src/other.ts
  srt-003  pending      -              -

Active Locks (2):
  src/file.ts                          spec-001       edit
  src/other.ts                         spec-002       edit

Pending Messages (5):
  From: dispatch-001  To: [spec-001, spec-002]  Subject: checkpoint_created

Recovery Context:
  Last Action: Started implementing JWT tokens
  Next Steps:
    - Complete JWT token implementation
    - Add token refresh logic
    - Write unit tests
  Blockers: Waiting for API endpoint documentation
  Files Modified: src/auth/jwt.ts, src/auth/tokens.ts
```

**JSON format**: Full checkpoint object (see `fleet checkpoint` JSON output).

#### Errors

```
Error: Checkpoint not found: chk-abc12345
```

---

### 5. `fleet checkpoints prune`

Clean up old checkpoints.

#### Signature

```bash
fleet checkpoints prune [options]
```

#### Options

| Option | Type | Required | Default | Description |
|--------|-------|-----------|-----------|
| `--mission <id>` | string | No | Prune all missions |
| `--older-than <days>` | integer | 7 | Delete checkpoints older than N days |
| `--keep <n>` | integer | 3 | Keep at least N most recent per mission |
| `--dry-run` | flag | No | Show what would be deleted |
| `-y, --yes` | flag | No | Skip confirmation |

#### Output

**Default (human-readable)**:
```
Found 5 checkpoints to prune:
  chk-old-001  msn-001  2026-01-01T12:00:00Z  manual
  chk-old-002  msn-001  2026-01-02T12:00:00Z  progress
  chk-old-003  msn-002  2026-01-01T13:00:00Z  error
  chk-old-004  msn-003  2026-01-01T14:00:00Z  manual
  chk-old-005  msn-003  2026-01-02T14:00:00Z  progress

Proceed? [y/N] y

Deleted 5 checkpoints.
```

**Dry run output**:
```
Found 5 checkpoints to prune:
  chk-old-001  msn-001  2026-01-01T12:00:00Z  manual
  ...

[DRY RUN] No checkpoints were deleted.
```

**No checkpoints to prune**:
```
No checkpoints to prune.
```

#### Confirmation Prompt

Unless `--yes` or `--dry-run` is specified:
```
Found N checkpoints to prune:
  [list of checkpoints]

Proceed? [y/N]
```

---

## Error Handling

### Common Error Patterns

#### Database Errors

```
Error: Database not initialized. Call initializeDatabase() first.
```

```
Error: Failed to query database: [specific error]
```

#### Checkpoint Errors

```
Error: Checkpoint not found: chk-abc12345
```

```
Error: Failed to create checkpoint: [specific error]
```

#### Recovery Errors

```
Error: No checkpoints available for mission: msn-xyz67890
```

```
Error: Recovery failed: Lock conflict on src/file.ts held by spec-003
```

#### File System Errors

```
Error: Failed to write checkpoint file: Permission denied
```

```
Error: Failed to read checkpoint file: File corrupted
```

### Exit Code Summary

| Code | Type | Description |
|------|-------|-------------|
| 0 | Success | Operation completed successfully |
| 1 | Error | Operation failed (database, I/O, validation) |
| 2 | Usage | Invalid arguments or options |
| 3 | Cancel | User cancelled operation (confirmation prompt) |
| 4 | NotFound | Resource not found (checkpoint, mission) |

## Examples

### Complete Recovery Workflow

```bash
# 1. Create manual checkpoint
fleet checkpoint --note "Before API refactoring"
# Output: Checkpoint created: chk-abc12345

# 2. Continue working... (context compacted)

# 3. List available checkpoints
fleet checkpoints list
# Output: Shows all checkpoints for current mission

# 4. Resume from latest
fleet resume
# Output: Prompts for confirmation, shows recovery context

# 5. Resume from specific checkpoint
fleet resume --checkpoint chk-abc12345 --yes
# Output: Skips confirmation, restores from specific checkpoint
```

### Checkpoint Management

```bash
# List all checkpoints
fleet checkpoints list --limit 20

# Show specific checkpoint
fleet checkpoints show chk-abc12345

# Prune old checkpoints (dry run)
fleet checkpoints prune --older-than 30 --dry-run

# Actually prune
fleet checkpoints prune --older-than 30 --yes

# Prune specific mission
fleet checkpoints prune --mission msn-xyz67890 --keep 5
```

### Development Workflow

```bash
# Create checkpoint before risky change
fleet checkpoint --note "Before database schema migration"

# Make changes...

# If something goes wrong:
fleet resume --dry-run  # Check what would be restored
fleet resume --yes       # Actually restore

# Continue from checkpoint
fleet checkpoint --note "Fixed migration issue"
```

### JSON Output for Automation

```bash
# Create checkpoint, get JSON
CHECKPOINT_ID=$(fleet checkpoint --json | jq -r '.id')

# Resume, get JSON output
fleet resume --checkpoint "$CHECKPOINT_ID" --json > recovery-result.json

# Check for errors
if [ $(jq '.errors | length' recovery-result.json) -gt 0 ]; then
  echo "Recovery had errors!"
  exit 1
fi
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `FLIGHTLINE_DIR` | Flightline directory path | `~/.flightline` |
| `FLEET_ACTIVITY_THRESHOLD_MS` | Inactivity threshold for recovery detection | 300000 (5 min) |
| `FLEET_DB_PATH` | SQLite database path | `~/.local/share/fleet/squawk.db` |

## Logging

### Verbosity Levels

**Default**: Info level with user-friendly messages
**Quiet**: Only errors (via `-q, --quiet`)
**Verbose**: Debug information (future enhancement via `-v, --verbose`)

### Log Format

```
[timestamp] [level] message
```

Example:
```
[2026-01-05T12:00:00.000Z] [INFO] Creating checkpoint for mission msn-xyz67890
[2026-01-05T12:00:00.100Z] [INFO] Checkpoint created: chk-abc12345
[2026-01-05T12:00:00.150Z] [INFO] Written to ~/.flightline/checkpoints/chk-abc12345.json
```

## Validation

### Input Validation

- **Checkpoint ID**: Format `chk-[a-f0-9]{8}`
- **Mission ID**: Format `msn-[a-f0-9]{8}`
- **Days**: Positive integer (for prune)
- **Limit**: Positive integer (for list)

### Output Validation

- All JSON outputs are valid JSON
- All timestamps are ISO 8601 format
- Progress percentages are 0-100
- Exit codes follow POSIX conventions

---

**Version**: 1.0.0
**Last Updated**: 2026-01-05
