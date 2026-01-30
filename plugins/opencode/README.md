# FleetTools OpenCode Plugin

Integrates FleetTools CLI functionality into OpenCode.

## Installation

Add this plugin to your OpenCode config:

```json
{
  "plugin": ["@fleettools/opencode-plugin"]
}
```

After restarting OpenCode, the plugin will provide tools and commands for FleetTools management.

## Tools

### 📊 `fleet-status`
Get FleetTools service status and configuration

**Parameters:**
- `format` (optional, enum: text|json, default: text) - Output format

**Examples:**
```bash
# Human-readable status
/fleet-status

# JSON format
/fleet-status --format json
```

### 🚀 `fleet-start`
Start FleetTools services

**Parameters:**
- `services` (optional, array: api,squawk) - Services to start (default: all enabled)

**Examples:**
```bash
# Start specific services
/fleet-start --services api,squawk
```

### 🛑 `fleet-stop`
Stop FleetTools services

**Parameters:**
- `services` (optional, array: api,squawk) - Services to stop (default: all running)
- `force` (optional, boolean) - Force stop without graceful shutdown
- `timeoutMs` (optional, number) - Timeout for graceful shutdown (ms)
- `format` (optional, enum: text|json, default: text) - Output format

**Examples:**
```bash
# Graceful stop specific services
/fleet-stop --services api,squawk

# Force stop
/fleet-stop --force api,squawk --timeout 5000
```

## Commands

The plugin also provides these slash commands for quick access:

- **/fleet-status** - Show FleetTools status
- **/fleet-start** - Start FleetTools services  
- **/fleet-stop** - Stop FleetTools services
- **/fleet-help** - Show FleetTools help and usage

## Requirements

- OpenCode >= 1.0.0
- FleetTools CLI (must be available in PATH)
- Node.js >= 18.0.0

## License

MIT License - see LICENSE file for details.