# CLI Reference

Complete reference for all FleetTools CLI commands.

## Command Overview

| Command | Description |
|---------|-------------|
| `fleet init` | Initialize a new FleetTools project |
| `fleet start` | Start all FleetTools services |
| `fleet stop` | Stop all FleetTools services |
| `fleet status` | Check system status |
| `fleet config` | Manage configuration |
| `fleet mission` | Manage missions |
| `fleet work-order` | Manage work orders |
| `fleet checkpoint` | Manage checkpoints |
| `fleet agent` | Manage agent assignments |

## Global Options

```bash
fleet [command] [options]
```

| Option | Description |
|--------|-------------|
| `-v, --version` | Show version number |
| `-h, --help` | Show help information |
| `--verbose` | Enable verbose logging |
| `--config <path>` | Use custom config file |

---

## `fleet init`

Initialize a new FleetTools project.

### Usage

```bash
fleet init <project-name> [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--template <name>` | Use specific template | `default` |
| `--agent-types <list>` | Specify agent types | `["full-stack-developer"]` |
| `--squawk-url <url>` | Squawk service URL | `http://localhost:3002` |
| `--no-git` | Skip git initialization | `false` |

### Examples

```bash
# Basic project
fleet init my-project

# With specific template
fleet init my-project --template full-stack

# With multiple agent types
fleet init my-project --agent-types full-stack-developer,code-reviewer,security-scanner

# Without git initialization
fleet init my-project --no-git
```

### Output Structure

```
my-project/
├── .fleet/
│   ├── config.json      # FleetTools configuration
│   └── state.db         # Local SQLite database
├── fleet.json           # Project metadata
├── README.md            # Generated documentation
└── src/                 # Source code (if template includes)
```

---

## `fleet start`

Start all FleetTools services.

### Usage

```bash
fleet start [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--squawk-only` | Start only Squawk service | `false` |
| `--api-only` | Start only API server | `false` |
| `--port <number>` | Custom port for API | `3001` |
| `--squawk-port <number>` | Custom port for Squawk | `3002` |
| `--daemon` | Run as background daemon | `false` |

### Examples

```bash
# Start all services
fleet start

# Start only Squawk
fleet start --squawk-only

# Start API with custom port
fleet start --api-only --port 8080

# Run as daemon
fleet start --daemon
```

### Output

```
✓ Starting Squawk service on port 3002...
✓ Squawk service ready: http://localhost:3002

✓ Starting API server on port 3001...
✓ API server ready: http://localhost:3001

✓ Connecting Claude Code plugin...
✓ Claude Code plugin connected

✓ Connecting OpenCode plugin...
✓ OpenCode plugin connected

All services started successfully!
```

---

## `fleet stop`

Stop all FleetTools services.

### Usage

```bash
fleet stop [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--force` | Force stop without waiting | `false` |
| `--squawk-only` | Stop only Squawk service | `false` |
| `--api-only` | Stop only API server | `false` |

### Examples

```bash
# Stop all services gracefully
fleet stop

# Force stop
fleet stop --force

# Stop only Squawk
fleet stop --squawk-only
```

---

## `fleet status`

Check system and service status.

### Usage

```bash
fleet status [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--json` | Output as JSON | `false` |
| `--verbose` | Show detailed information | `false` |

### Examples

```bash
# Basic status
fleet status

# JSON output
fleet status --json

# Detailed status
fleet status --verbose
```

### Output

```
FleetTools Status
==================

Version: 1.0.0

Services:
  ✅ Squawk Service: http://localhost:3002
  ✅ API Server: http://localhost:3001
  ✅ Claude Code Plugin: connected
  ✅ OpenCode Plugin: connected

Database:
  ✅ SQLite: .fleet/state.db
  ✅ Missions: 3
  ✅ Work Orders: 12
  ✅ Checkpoints: 8

Active Agents:
  ✅ full-stack-developer (2 active)
  ✅ code-reviewer (1 active)
```

---

## `fleet config`

Manage FleetTools configuration.

### Usage

```bash
fleet config <command> [options]
```

### Subcommands

#### `fleet config get <key>`

Get configuration value.

```bash
fleet config get squawk_port
# Output: 3002

fleet config get agent_timeout
# Output: 300000
```

#### `fleet config set <key> <value>`

Set configuration value.

```bash
fleet config set log_level debug
fleet config set max_concurrent_agents 10
```

#### `fleet config list`

List all configuration values.

```bash
fleet config list
```

#### `fleet config reset`

Reset configuration to defaults.

```bash
fleet config reset
```

### Configuration Keys

| Key | Description | Default |
|-----|-------------|---------|
| `squawk_port` | Squawk service port | `3002` |
| `api_port` | API server port | `3001` |
| `log_level` | Logging level | `info` |
| `agent_timeout` | Agent timeout (ms) | `300000` |
| `max_concurrent_agents` | Max concurrent agents | `5` |
| `heartbeat_interval` | Heartbeat interval (ms) | `5000` |
| `default_editor` | Default editor plugin | `claude-code` |

---

## `fleet mission`

Manage missions.

### Usage

```bash
fleet mission <command> [options]
```

### Subcommands

#### `fleet mission create <title>`

Create a new mission.

```bash
fleet mission create "Build authentication system"
# Output: Created mission: msn-abc123

fleet mission create "Build authentication system" --priority high
```

#### `fleet mission list`

List all missions.

```bash
# List all missions
fleet mission list

# Filter by status
fleet mission list --status in_progress

# JSON output
fleet mission list --json
```

**Output**:
```
Missions (3)
==================

msn-abc123 | Build authentication system | in_progress | 2026-01-14
msn-def456 | Implement payment API       | pending      | 2026-01-15
msn-ghi789 | Add user dashboard          | completed    | 2026-01-10
```

#### `fleet mission get <mission-id>`

Get mission details.

```bash
fleet mission get msn-abc123
```

**Output**:
```
Mission: msn-abc123
Title: Build authentication system
Status: in_progress
Created: 2026-01-14T10:00:00Z
Updated: 2026-01-14T15:30:00Z

Work Orders:
  wo-jkl012 | Design database schema | in_progress
  wo-mno345 | Implement login API     | pending
  wo-pqr678 | Add tests               | pending

Assigned Agents:
  full-stack-developer
```

#### `fleet mission update <mission-id>`

Update mission details.

```bash
fleet mission update msn-abc123 --status completed
fleet mission update msn-abc123 --title "Build auth system (v2)"
```

#### `fleet mission delete <mission-id>`

Delete a mission.

```bash
fleet mission delete msn-abc123
```

---

## `fleet work-order`

Manage work orders.

### Usage

```bash
fleet work-order <command> [options]
```

### Subcommands

#### `fleet work-order create <mission-id> <title>`

Create a new work order.

```bash
fleet work-order create msn-abc123 "Design database schema"
# Output: Created work order: wo-jkl012

fleet work-order create msn-abc123 "Implement API" --priority high
```

#### `fleet work-order list`

List all work orders.

```bash
# List all work orders
fleet work-order list

# Filter by mission
fleet work-order list --mission msn-abc123

# Filter by status
fleet work-order list --status in_progress
```

**Output**:
```
Work Orders (12)
==================

wo-jkl012 | Design database schema    | msn-abc123 | in_progress
wo-mno345 | Implement login API       | msn-abc123 | pending
wo-pqr678 | Add tests                 | msn-abc123 | pending
wo-stu901 | Create payment models     | msn-def456 | pending
```

#### `fleet work-order get <work-order-id>`

Get work order details.

```bash
fleet work-order get wo-jkl012
```

#### `fleet work-order update <work-order-id>`

Update work order details.

```bash
fleet work-order update wo-jkl012 --status completed
```

#### `fleet work-order assign <work-order-id> <agent-type>`

Assign work order to an agent.

```bash
fleet work-order assign wo-jkl012 full-stack-developer
```

---

## `fleet checkpoint`

Manage checkpoints.

### Usage

```bash
fleet checkpoint <command> [options]
```

### Subcommands

#### `fleet checkpoint create <work-order-id> <description>`

Create a new checkpoint.

```bash
fleet checkpoint create wo-jkl012 "Database schema validated"
# Output: Created checkpoint: chk-vwx123
```

#### `fleet checkpoint list`

List all checkpoints.

```bash
# List all checkpoints
fleet checkpoint list

# Filter by work order
fleet checkpoint list --work-order wo-jkl012

# Filter by status
fleet checkpoint list --passed
```

#### `fleet checkpoint pass <checkpoint-id>`

Mark checkpoint as passed.

```bash
fleet checkpoint pass chk-vwx123
```

---

## `fleet agent`

Manage agent assignments and status.

### Usage

```bash
fleet agent <command> [options]
```

### Subcommands

#### `fleet agent list`

List available agents.

```bash
fleet agent list
```

**Output**:
```
Available Agents:
==================

full-stack-developer | End-to-end development | ✅ Available
code-reviewer        | Code quality assessment | ✅ Available
security-scanner     | Security vulnerability  | ✅ Available
api-builder-advanced | API development         | ✅ Available
```

#### `fleet agent status`

Check agent status.

```bash
# All agents
fleet agent status

# Specific agent
fleet agent status full-stack-developer
```

**Output**:
```
Agent: full-stack-developer
Status: active
Current Task: wo-jkl012
Tasks Completed: 5
Last Activity: 2026-01-14T15:30:00Z
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLEET_SQUAWK_PORT` | Squawk service port | `3002` |
| `FLEET_API_PORT` | API server port | `3001` |
| `FLEET_LOG_LEVEL` | Logging level | `info` |
| `FLEET_CONFIG_PATH` | Config file path | `~/.fleet/config.json` |
| `FLEET_DB_PATH` | Database path | `.fleet/state.db` |

---

## Exit Codes

| Code | Description |
|------|-------------|
| `0` | Success |
| `1` | General error |
| `2` | Invalid arguments |
| `3` | Service unavailable |
| `4` | Configuration error |

---

## Tips & Tricks

### Auto-completion

Enable shell auto-completion:

```bash
# Bash
echo 'eval "$(fleet completion bash)"' >> ~/.bashrc

# Zsh
echo 'eval "$(fleet completion zsh)"' >> ~/.zshrc

# Fish
fleet completion fish > ~/.config/fish/completions/fleet.fish
```

### Aliases

Create command aliases:

```bash
# ~/.bashrc or ~/.zshrc
alias f='fleet'
alias fs='fleet start'
alias fst='fleet status'
alias fm='fleet mission'
alias fwo='fleet work-order'
```

### Batch Operations

```bash
# Create multiple work orders
for task in "design schema" "implement api" "add tests"; do
  fleet work-order create msn-abc123 "$task"
done
```

---

## Troubleshooting

### Common Issues

**Issue**: Port already in use
```bash
# Solution: Kill process or change port
lsof -ti:3001 | xargs kill -9
fleet start --port 8080
```

**Issue**: Permission denied
```bash
# Solution: Fix permissions
chmod 755 ~/.fleet
```

**Issue**: Database locked
```bash
# Solution: Remove lock files
rm .fleet/state.db-wal .fleet/state.db-shm
```

---

**Version**: [Current Version]
**Last Updated**: 2026-01-14
