# Checkpoint and Recovery Guide

This guide explains how to use checkpoints for mission recovery and resumption in FleetTools.

## Overview

Checkpoints are snapshots of mission state that allow you to resume work from a known point. This is critical for:
- **Fault tolerance**: Recover from failures without losing progress
- **Long-running missions**: Pause and resume across sessions
- **Debugging**: Return to a specific state for investigation

## Creating Checkpoints

Checkpoints are created automatically at key points:

- When a mission completes successfully
- When an error occurs
- Manually via API

## CLI Commands

### List Checkpoints

View all checkpoints for a mission:

```bash
fleet checkpoints list <mission-id>
fleet checkpoints ls <mission-id>
```

### Show Checkpoint Details

Get detailed information about a checkpoint:

```bash
fleet checkpoints show <checkpoint-id>
```

**Output includes:**
- Mission and trigger information
- Progress percentage
- Sorties (sub-tasks) captured
- Active locks and pending messages
- Recovery context

### Get Latest Checkpoint

Get the most recent checkpoint for a mission:

```bash
fleet checkpoints latest <mission-id>
```

### Prune Old Checkpoints

Clean up old checkpoints to save space:

```bash
fleet checkpoints prune <mission-id>
fleet checkpoints prune <mission-id> --older-than 30
fleet checkpoints prune <mission-id> --keep 10

# With confirmation
fleet checkpoints prune <mission-id> --force
```

**Options:**
- `--older-than <days>`: Delete checkpoints older than N days (default: 30)
- `--keep <count>`: Keep last N checkpoints (default: 5)
- `--force`: Skip confirmation prompt

## Resuming from Checkpoints

### Resume from Latest

Resume a mission from its most recent checkpoint:

```bash
fleet resume --mission <mission-id>
```

### Resume from Specific Checkpoint

Resume from a particular checkpoint:

```bash
fleet resume --checkpoint <checkpoint-id>
```

### Dry Run

Preview what would be recovered without executing:

```bash
fleet resume --checkpoint <checkpoint-id> --dry-run
fleet resume --mission <mission-id> --dry-run
```

The dry-run shows:
- Number of agents to restore
- Number of tasks to resume
- Locks to re-establish
- Recovery plan details

### Force Resume

Skip confirmation prompts:

```bash
fleet resume --checkpoint <checkpoint-id> --force
```

## Understanding Recovery

When you resume from a checkpoint, the system:

1. **Restores agents**: Re-initializes agents with their previous state
2. **Requeues tasks**: Adds incomplete tasks back to the queue
3. **Restores locks**: Re-establishes file locks from the checkpoint
4. **Continues execution**: Resumes mission from the checkpoint state

The recovery is transparent to your mission logic - execution continues as if the interruption never happened.

## Recovery Context

Each checkpoint includes recovery context - metadata that helps in restoration:

```json
{
  "agents_to_restore": ["FSD-001", "FSD-002"],
  "tasks_to_resume": ["task-123", "task-456"],
  "locks_to_restore": ["file.lock"],
  "environment": {
    "mission_variables": {},
    "shared_state": {}
  }
}
```

## Best Practices

- **Regular checkpoints**: Enable auto-checkpointing for long missions
- **Test recovery**: Periodically test recovery from old checkpoints
- **Cleanup**: Prune checkpoints regularly to manage storage
- **Monitor**: Check checkpoint timestamps for recent recovery points

## Checkpoint Triggers

Checkpoints are created with different triggers:

- `manual`: Created by user via API
- `auto`: Created automatically (e.g., hourly)
- `error`: Created when an error occurs
- `completion`: Created when mission completes

Use the `--json` flag to see trigger details:

```bash
fleet checkpoints show <id> --json
```

## Troubleshooting

**No checkpoints found?**
```bash
fleet checkpoints list <mission-id>
```
If empty, the mission hasn't created any checkpoints yet.

**Recovery failed?**
Check the detailed error:
```bash
fleet resume --checkpoint <id> --dry-run
```

**Need to see all recovery details?**
```bash
fleet checkpoints show <id> --json | jq .recovery_context
```

## Integration with Agents

When you resume a mission, agents are automatically restored to their previous assignments. See also: [Agent Coordination Guide](./agent-coordination.md)
