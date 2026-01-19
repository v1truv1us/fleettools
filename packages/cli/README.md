# @fleettools/fleet-cli

Global CLI for FleetTools - AI Agent Coordination System

## Installation

```bash
# Global installation
npm install -g @fleettools/fleet-cli
# or
bun install -g @fleettools/fleet-cli

# Development installation
git clone https://github.com/v1truvius/fleettools.git
cd fleettools
bun install
bun run build:packages
cd packages/fleet-cli
bun run build
npm link  # or bun link
```

## Quick Start

```bash
# Initialize a new project
fleet init my-project

# Start services
cd my-project
fleet start

# Check status
fleet status
```

## Commands

### Project Management

- `fleet init [path]` - Initialize a new FleetTools project
- `fleet start` - Start FleetTools services
- `fleet stop` - Stop FleetTools services
- `fleet restart` - Restart FleetTools services
- `fleet status` - Show fleet status and configuration

### Configuration

- `fleet config list` - Show current configuration
- `fleet config set <key> <value>` - Set configuration value
- `fleet config edit` - Interactive configuration editor

### Services

- `fleet services start [service]` - Start specific service
- `fleet services stop [service]` - Stop specific service
- `fleet services logs [service]` - Show service logs

### Utilities

- `fleet logs` - Show FleetTools logs
- `fleet clean` - Clean FleetTools data and caches

## Project Templates

### Basic Template
```bash
fleet init --template basic
```

Basic FleetTools setup with:
- Squawk coordination service
- API server
- Git-backed work tracking

### Agent Template
```bash
fleet init --template agent
```

Template for developing AI agents with:
- Agent development structure
- Task definitions
- Tool implementations

## Runtime Support

FleetTools CLI supports both Bun and Node.js runtimes:

- **Bun** (default): Optimal performance and built-in TypeScript support
- **Node.js**: Compatibility with existing Node.js workflows

The CLI automatically detects the runtime and optimizes for the best performance.

## Configuration

### Global Configuration

Located at `~/.config/fleet/config.yaml`:

```yaml
version: "1.0.0"
defaultRuntime: "bun"
telemetry:
  enabled: false
services:
  autoStart: false
  squawkPort: 3000
  apiPort: 3001
paths:
  configDir: "~/.config/fleet"
  dataDir: "~/.local/share/fleet"
  logDir: "~/.local/state/fleet/logs"
```

### Project Configuration

Located at `fleet.yaml` in project root:

```yaml
name: "my-fleet-project"
version: "1.0.0"
fleet:
  version: "0.1.0"
  mode: "local"
services:
  squawk:
    enabled: true
    port: 3000
    dataDir: "./.fleet/squawk"
  api:
    enabled: true
    port: 3001
  postgres:
    enabled: false
    provider: "podman"
    port: 5432
    dataDir: "./.fleet/postgres"
plugins:
  claudeCode: true
  openCode: true
```

## Integration with Editors

FleetTools provides plugins for popular code editors:

- **Claude Code**: Fleet commands available via `/fleet`
- **OpenCode**: Fleet commands available via `/fleet`

## Environment Variables

- `FLEET_CONFIG_PATH` - Path to global configuration file
- `FLEET_DATA_DIR` - Override for data directory
- `FLEET_LOG_LEVEL` - Log level (debug, info, warn, error)

## Examples

### Initialize Project with Custom Settings

```bash
fleet init my-project --template agent --yes
cd my-project
fleet config set services.squawk.port 3005
fleet config set services.api.port 3006
```

### Start Specific Services

```bash
fleet start
fleet services start api
fleet services logs squawk --follow
```

### Check Status

```bash
fleet status --json  # JSON output
fleet status         # Human-readable output
```

## Development

```bash
git clone https://github.com/v1truvius/fleettools.git
cd fleettools/packages/fleet-cli
bun install
bun run dev  # Development mode with watch
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.