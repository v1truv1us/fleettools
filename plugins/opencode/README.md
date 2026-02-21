# FleetTools OpenCode Plugin

Integrates FleetTools CLI functionality into OpenCode using a tools-first approach.

## Installation

Add this plugin to your OpenCode config:

```json
{
  "plugin": ["@fleettools/opencode-plugin"]
}
```

After restarting OpenCode, the plugin will provide tools for FleetTools management.

## Initial Setup

**First time users**: Run the setup command to create OpenCode command files:

```bash
/fleet_opencode_setup
```

This creates `.opencode/commands/fleet.md` and subcommand files for easier access.

## Available Tools

### 🔧 `fleet_opencode_setup`
Create OpenCode command files for FleetTools (run once)

**Parameters:**
- `projectPath` (optional, string) - Project path (defaults to current directory)
- `overwrite` (optional, boolean) - Overwrite existing command files

### 📊 `fleet_status`
Get FleetTools service status and configuration

**Parameters:**
- `format` (optional, enum: text|json, default: text) - Output format

### 🚀 `fleet_start`
Start FleetTools services

**Parameters:**
- `services` (optional, array: api,squawk) - Services to start (default: all enabled)

### 🛑 `fleet_stop`
Stop FleetTools services

**Parameters:**
- `services` (optional, array: api,squawk) - Services to stop (default: all running)
- `force` (optional, boolean) - Force stop without graceful shutdown
- `timeout_ms` (optional, number) - Timeout for graceful shutdown (ms)
- `json` (optional, boolean) - Output in JSON format

### 🩺 `fleet_doctor`
Check FleetTools installation and configuration

**Parameters:**
- `fix` (optional, boolean) - Attempt to fix common issues automatically

### ⚙️ `fleet_setup`
Initialize FleetTools configuration

**Parameters:**
- `global` (optional, boolean) - Setup global configuration only
- `setup_force` (optional, boolean) - Force re-initialization

### 🔍 `fleet_services`
Manage FleetTools services

**Parameters:**
- `args` (optional, string) - Arguments to pass to fleet services command

### 📝 `fleet_help`
Show FleetTools help and usage

**Parameters:**
- `args` (optional, string) - Additional help arguments

### 🧠 `fleet_context`
Get compact FleetTools state for context/memory

**Parameters:**
- `verbose` (optional, boolean) - Include detailed information

## Usage Examples

After running `fleet_opencode_setup` once, you can use slash commands:

```bash
# Check FleetTools status
/fleet status

# Start services
/fleet start

# Stop services  
/fleet stop

# Get help
/fleet help

# Doctor check
/fleet doctor

# Check services
/fleet services
```

Or use tools directly:

```bash
# Get status in JSON format
fleet_status --format json

# Force stop with timeout
fleet_stop --force true --timeout_ms 5000

# Auto-fix issues
fleet_doctor --fix true
```

## Memory Features

The plugin automatically injects FleetTools context:
- **Session start**: Provides FleetTools state snapshot
- **Session compaction**: Preserves FleetTools guidance across compactions

This prevents repeated setup/context loss during long conversations.

## Requirements

- OpenCode >= 1.0.0
- FleetTools CLI (must be available in PATH)
- Node.js >= 18.0.0
- Bun >= 1.0.0 (for building)

## Development

```bash
cd plugins/opencode
bun run build    # Compile TypeScript
bun test         # Run tests
```

## License

MIT License - see LICENSE file for details.