# FleetTools OpenCode Plugin

Integrates FleetTools AI Agent Coordination System into OpenCode.

## Installation

### From npm (Recommended)
```bash
npm install @fleettools/opencode-plugin
```

### From OpenCode CLI
```bash
opencode plugin install @fleettools/opencode-plugin
```

## Usage

Once installed, the plugin provides three tools:

### 🚀 `fleet-start`
Start FleetTools services (API, Squawk coordination)

```bash
# Start all services
fleet-start

# Start specific services
fleet-start --services api,squawk

# Run in foreground
fleet-start --foreground
```

### 🛑 `fleet-stop`
Stop FleetTools services

```bash
# Graceful stop
fleet-stop

# Force stop
fleet-stop --force
```

### 📊 `fleet-status`
Get FleetTools service status and configuration

```bash
# Human-readable status
fleet-status

# JSON format
fleet-status --format json
```

## Features

- ✅ **Service Management**: Start, stop, and monitor FleetTools services
- ✅ **JSON & Text Output**: Flexible output formats for different use cases  
- ✅ **Error Handling**: Graceful error reporting and process management
- ✅ **Background/Foreground**: Choose how services run
- ✅ **Service Selection**: Start specific services or all services

## Requirements

- OpenCode >= 1.0.0
- FleetTools CLI >= 0.1.0
- Node.js >= 18.0.0

## License

MIT License - see LICENSE file for details.