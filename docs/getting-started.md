# Getting Started

This guide walks you through installing FleetTools, setting up your environment, and creating your first project.

## Prerequisites

Before installing FleetTools, ensure you have:

- **Bun** (>=1.0.0) or **Node.js** (>=18.0.0)
  ```bash
  # Install Bun (recommended)
  curl -fsSL https://bun.sh/install | bash

  # Or verify Node.js version
  node --version  # Should be >=18.0.0
  ```

- **Git** (for version control)
  ```bash
  git --version
  ```

- **TypeScript** 5.9.3 (included as dependency)

## Installation

### Option 1: Clone Repository (Development)

```bash
# Clone repository
git clone https://github.com/yourusername/fleettools.git
cd fleettools

# Install all dependencies
bun install

# Build all workspaces
bun run build
```

### Option 2: Global Installation (Production)

```bash
# Install globally (after package publishing)
bun add -g @fleettools/fleet-cli

# Verify installation
fleet --version
```

### Verifying Installation

```bash
# Check all components are installed
bun run fleet status

# Expected output:
# ✓ FleetTools CLI
# ✓ Squawk Service
# ✓ Server/API
# ✓ Plugins
```

## First Project Setup

### Initialize a New Project

```bash
# Create a new project
bun run fleet init my-awesome-project

# Navigate to project
cd my-awesome-project
```

This creates a project structure with:

```
my-awesome-project/
├── .fleet/
│   ├── config.json      # FleetTools configuration
│   └── state.db         # Local state (SQLite)
├── fleet.json           # Project metadata
└── README.md
```

### Project Configuration

The `fleet.json` file contains basic project settings:

```json
{
  "name": "my-awesome-project",
  "version": "0.1.0",
  "agent_types": ["full-stack-developer", "code-reviewer"],
  "coordination": {
    "squawk_url": "http://localhost:3002"
  }
}
```

## Starting FleetTools

### Start All Services

```bash
# Start Squawk coordination service
cd squawk
bun run dev

# In another terminal, start API server
cd server/api
bun run dev

# In another terminal, start plugins
cd plugins/claude-code
bun run dev
```

### Start with CLI

```bash
# Start all services via CLI
bun run fleet start

# This launches:
# - Squawk service (port 3002)
# - Server/API (port 3001)
# - Plugin listeners
```

### Verify Services

```bash
# Check service status
bun run fleet status

# Expected output:
# ✅ Squawk Service: http://localhost:3002
# ✅ Server/API: http://localhost:3001
# ✅ Claude Code Plugin: connected
# ✅ OpenCode Plugin: connected
```

## Your First Mission

### Create a Mission

```bash
# Create a new mission
bun run fleet mission create "Build authentication system"

# Output:
# Created mission: msn-abc123
# Status: pending
```

### Create Work Orders

```bash
# Add work orders to mission
bun run fleet work-order create msn-abc123 "Design database schema"
bun run fleet work-order create msn-abc123 "Implement login API"
bun run fleet work-order create msn-abc123 "Add tests"

# Output:
# Created work order: wo-def456
# Created work order: wo-ghi789
# Created work order: wo-jkl012
```

### Check Progress

```bash
# View mission status
bun run fleet mission status msn-abc123

# Output:
# Mission: msn-abc123
# Title: Build authentication system
# Status: in_progress
# Work Orders: 3 total, 0 complete
```

## Using Editor Plugins

### Claude Code Integration

1. Open your project in Claude Code
2. The FleetTools plugin automatically connects
3. Use to `/fleet` command to interact

```bash
# In Claude Code
/fleet list-missions
/fleet assign msn-abc123 to @full-stack-developer
```

### OpenCode Integration

1. Open your project in OpenCode
2. Enable to FleetTools extension
3. Access coordination panel from sidebar

## Basic Workflow

```
┌─────────────┐
│  Create     │
│  Mission    │
└──────┬──────┘
       │
       v
┌─────────────┐
│ Add Work    │
│  Orders     │
└──────┬──────┘
       │
       v
┌─────────────┐
│  Assign to  │
│  Agents     │
└──────┬──────┘
       │
       v
┌─────────────┐
│  Monitor    │
│  Progress   │
└─────────────┘
```

## Configuration Options

### Global Configuration

Located at `~/.fleet/config.json`:

```json
{
  "squawk_port": 3002,
  "api_port": 3001,
  "log_level": "info",
  "default_editor": "claude-code"
}
```

### Project Configuration

Located at `.fleet/config.json`:

```json
{
  "agent_timeout": 300000,
  "max_concurrent_agents": 5,
  "coordination": {
    "heartbeat_interval": 5000
  }
}
```

## Common Commands

| Command | Description |
|---------|-------------|
| `fleet init <name>` | Create new project |
| `fleet start` | Start all services |
| `fleet status` | Check system status |
| `fleet mission list` | List all missions |
| `fleet work-order create` | Create new work order |
| `fleet config get/set` | View/set configuration |

## Troubleshooting

### Port Already in Use

If you see "Port already in use" errors:

```bash
# Kill processes on ports
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9

# Or change ports in config.json
```

### Plugin Not Connecting

```bash
# Verify Squawk is running
curl http://localhost:3002/health

# Restart plugin
cd plugins/claude-code
bun run dev
```

### Database Lock Issues

```bash
# Remove lock file
rm .fleet/state.db-wal
rm .fleet/state.db-shm
```

## Next Steps

- 📖 Read [Architecture](./architecture.md) to understand system design
- 🔧 Explore [CLI Reference](./cli-reference.md) for all commands
- 🌐 Check [API Reference](./api-reference.md) for API endpoints
- 🧩 Learn [Plugin Development](./plugin-development.md) to create custom plugins

## Support

- 🐛 [Report Issues](https://github.com/yourusername/fleettools/issues)
- 💬 [Discussions](https://github.com/yourusername/fleettools/discussions)
- 📧 [Email Support](mailto:support@fleettools.dev)

---

**Version**: [Current Version]
**Last Updated**: 2026-01-14
