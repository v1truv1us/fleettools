# FleetTools Plugin for OpenCode - Development Commands

Use these commands during development to interact with FleetTools services before the plugin is fully implemented.

## Setup Commands

### Initialize Global Config
```bash
fleet setup --global
```

### Initialize Project
```bash
cd /path/to/project
fleet setup
```

### Start Services
```bash
# Start all services
fleet start

# Start specific services
fleet start --services api,squawk

# Start in foreground (for development)
fleet start --foreground
```

### Check Status
```bash
# Human-readable status
fleet status

# JSON status (for parsing)
fleet status --json
```

### Stop Services
```bash
# Stop all services
fleet stop

# Force stop services
fleet stop --force

# Stop specific services with timeout
fleet stop --services api,squawk --timeout 5000
```

## Diagnostic Commands

### Run Doctor
```bash
# Basic diagnostics
fleet doctor

# JSON diagnostics
fleet doctor --json

# Auto-fix issues
fleet doctor --fix
```

## API Endpoints

The FleetTools server provides REST endpoints for service management:

- **API Server**: http://localhost:3001
- **Squawk Service**: http://localhost:3002

### Health Checks
```bash
# Check API health
curl http://localhost:3001/health

# Check Squawk health
curl http://localhost:3002/health
```

## Plugin Development

When the OpenCode plugin is ready, it will provide these tools:

- `fleet_status()` - Get FleetTools status
- `fleet_start()` - Start FleetTools services
- `fleet_stop()` - Stop FleetTools services
- `fleet_setup()` - Initialize FleetTools configuration
- `fleet_doctor()` - Diagnose FleetTools installation

## Configuration

FleetTools configuration is stored in:
- **Global**: `~/.fleet/config.json`
- **Project**: `.fleet/config.json` or `fleet.yaml`

## Testing

```bash
# Test plugin contract
cd plugins/opencode
bun run test

# Test basic functionality
bun run test-simple

# Test smoke test
bun run test-smoke

# Build plugin
bun run build
```