# Agent Coordination Guide

This guide explains how to manage agents in FleetTools using the CLI.

## Overview

Agents are autonomous workers that execute tasks as part of missions. The FleetTools agent coordination system allows you to spawn, monitor, and manage agents efficiently.

## CLI Commands

### Spawn an Agent

Create a new agent:

```bash
fleet agents spawn <type> [task]
fleet agents spawn testing "Write unit tests for auth module"
fleet agents spawn backend "Implement user API endpoint"
```

**Options:**
- `--callsign <name>`: Custom name for the agent (defaults to Agent-{timestamp})

### List Agents

View all active agents:

```bash
fleet agents list
fleet agents ls  # Shorthand
```

### Check Agent Status

View detailed agent information:

```bash
fleet agents status [callsign]
fleet agents status FSD-001

# Get statistics for all agents
fleet agents status
```

### Monitor Agent Health

Check if agents are healthy and responsive:

```bash
fleet agents health [callsign]
fleet agents health FSD-001

# Check all agents
fleet agents health
```

### Monitor Resources

View agent resource utilization:

```bash
fleet agents resources [callsign]
fleet agents resources FSD-001

# View all agent resources
fleet agents resources
```

**Output includes:**
- Current workload vs capacity
- Resource utilization percentage
- Visual bar chart

### Terminate an Agent

Stop a running agent:

```bash
fleet agents terminate <callsign>
fleet agents terminate FSD-001
```

## JSON Output

All commands support `--json` flag for machine-readable output:

```bash
fleet agents list --json
fleet agents status FSD-001 --json
```

## Agent Lifecycle

1. **Spawn**: Create a new agent with specific task type
2. **Idle**: Agent waits for work assignments
3. **Busy**: Agent actively executes tasks
4. **Offline**: Agent becomes unavailable (network issue, crash, etc.)

## Best Practices

- Monitor resource utilization regularly to prevent overload
- Use health checks before assigning critical tasks
- Spawn multiple agents for parallel work
- Terminate unused agents to free resources

## Troubleshooting

**Agent not responding?**
```bash
fleet agents health <callsign>
```
If unhealthy, check server logs and consider terminating/re-spawning.

**Want to see JSON details?**
```bash
fleet agents status <callsign> --json
```

## Integration with Missions

Agents are coordinated by the mission system. When you create a mission, agents are automatically assigned work from the task queue.

See also: [Checkpoint and Recovery Guide](./checkpoint-resume.md)
