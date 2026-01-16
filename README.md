# FleetTools

**FleetTools** - A developer toolkit for coordinating AI "fleets" of specialized agents working together to solve problems.

## Quick Start

```bash
# Install globally
npm install -g @fleettools/fleet-cli
# or
bun install -g @fleettools/fleet-cli

# Initialize project
fleet init my-project
cd my-project

# Start services
fleet start

# Check status
fleet status
```

## Concept Overview

FleetTools provides:

- **Flightline** - Git-backed work tracking and coordination
- **Squawk** - Agent coordination and durable messaging primitives
- **Dispatch** - Coordinator for fleet operations
- **Specialists** - Agent workers with specialized capabilities
- **CTK** - File reservation system (Consolidated Tool Kit)
- **Tech Orders** - Learned patterns and anti-patterns storage

## Key Features

### Local-First Mode (Default)
- Fully functional without any server or sync
- JSON file-based persistence for agent coordination
- Git-backed persistence for work tracking
- Optional Podman/Postgres for enhanced features

### Editor Plugins
- **Claude Code** plugin - `/fleet` commands in Claude Code
- **OpenCode** plugin - `/fleet` commands in OpenCode

### API Server
- Consolidated Bun.serve HTTP server
- 19+ REST API endpoints
- Work orders, CTK reservations, tech orders
- Mailboxes, cursors, locks for agent coordination

## Documentation

📖 **Comprehensive documentation available in [docs/](./docs/)**

For detailed guides, API reference, and development information, see:
- [Getting Started Guide](./docs/getting-started.md) - Installation, setup, first project
- [Architecture](./docs/architecture.md) - System design, components, data flow
- [CLI Reference](./docs/cli-reference.md) - All fleet commands with examples
- [API Reference](./docs/api-reference.md) - All endpoints, request/response examples
- [Plugin Development](./docs/plugin-development.md) - Creating plugins for editors
- [Configuration](./docs/configuration.md) - Global and project config options
- [Development](./docs/development.md) - Building, testing, contributing
- [Migration](./docs/migration.md) - From legacy setup
- [FAQ](./docs/faq.md) - Common questions and answers

Run `bun run docs` to view all documentation files.

**Documentation Overview:** See [docs/README.md](./docs/README.md) for complete documentation index.

## Project Structure

```
fleettools/
├── packages/                     # Workspace packages
│   ├── fleet-cli/               # Global CLI (publishable)
│   │   ├── src/
│   │   │   ├── index.ts        # CLI entry point
│   │   │   └── commands/       # Command implementations
│   │   ├── dist/               # Compiled JavaScript
│   │   └── package.json
│   │
│   ├── fleet-shared/            # Shared utilities
│   │   ├── src/
│   │   │   ├── config.ts       # Configuration management
│   │   │   ├── runtime.ts      # Runtime detection
│   │   │   ├── project.ts      # Project management
│   │   │   └── utils.ts        # General utilities
│   │   └── package.json
│   │
│   ├── core/                   # Core types and interfaces
│   ├── db/                     # Database layer
│   └── events/                 # Event management
│
├── squawk/                       # Agent coordination (TypeScript)
│   ├── src/
│   │   ├── index.ts              # Squawk API server
│   │   └── db/
│   │       └── index.ts          # JSON persistence layer
│   ├── dist/
│   ├── package.json
│   └── tsconfig.json
│
├── server/api/                   # Consolidated API server
│   ├── src/
│   │   ├── index.ts              # Main Bun.serve server
│   │   ├── flightline/
│   │   │   ├── work-orders.ts    # Work orders CRUD
│   │   │   ├── ctk.ts            # CTK file reservations
│   │   │   └── tech-orders.ts    # Tech orders
│   │   ├── squawk/
│   │   │   ├── mailbox.ts        # Mailbox events
│   │   │   ├── cursor.ts         # Cursor positions
│   │   │   ├── lock.ts           # File locks
│   │   │   └── coordinator.ts    # Coordinator status
│   │   └── middleware/
│   │       ├── logger.ts         # Request logging
│   │       └── error-handler.ts  # Error handling
│   ├── test-api.ts               # 19 passing tests
│   ├── package.json
│   └── tsconfig.json
│
├── plugins/                      # Editor plugins
│   ├── claude-code/
│   │   ├── src/index.ts          # TypeScript source
│   │   ├── dist/                 # Compiled JS + .d.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── opencode/
│       ├── src/index.ts          # TypeScript source
│       ├── dist/                 # Compiled JS + .d.ts
│       ├── package.json
│       └── tsconfig.json
│
├── cli/                         # Legacy CLI (deprecated)
├── config/                     # Legacy configuration
├── docs/                        # Documentation
├── specs/                       # Planning documents
└── package.json                  # Root workspace
```

## Installation

### Option 1: Global Installation (Recommended)

```bash
# Install globally with npm
npm install -g @fleettools/fleet-cli

# Or install globally with Bun
bun install -g @fleettools/fleet-cli

# Verify installation
fleet --help
```

### Option 2: Development Installation

```bash
# Clone repository
git clone https://github.com/v1truvius/fleettools.git
cd fleettools

# Install dependencies
bun install

# Build packages
bun run build:packages

# Link for development
cd packages/fleet-cli && bun run build && npm link
```

### Runtime Support

FleetTools supports multiple JavaScript runtimes:

- **Bun** (default): Optimal performance and built-in TypeScript
- **Node.js**: Compatibility with existing Node.js workflows (18+)

### Prerequisites

- **Bun 1.0+** OR **Node.js 18+**
- **Podman** or **Docker** (optional, for database services)

### Quick Setup

```bash
# 1. Initialize new project
fleet init my-project

# 2. Enter project
cd my-project

# 3. Start services
fleet start

# 4. Check status
fleet status
```

## Development

### Building

```bash
# Build all packages
bun run build

# Build only shared packages
bun run build:packages

# Build specific package
cd packages/fleet-cli && bun run build
```

### Testing

```bash
# Run all tests
bun test

# Test specific package
cd packages/fleet-cli && bun test
```

## CLI Commands

### Project Management

```bash
# Initialize new project
fleet init [project-name] --template basic

# Start all services
fleet start

# Stop all services
fleet stop

# Check fleet status
fleet status
```

### Configuration Management

```bash
# Show current configuration
fleet config list

# Set configuration value
fleet config set services.squawk.port 3005

# Interactive configuration editor
fleet config edit

# Global configuration
fleet config --global list
```

### Service Management

```bash
# Start specific services
fleet services start squawk

# Show service logs
fleet services logs api --follow

# Service management
fleet services status
```

### Utilities

```bash
# Show logs
fleet logs

# Clean data and caches
fleet clean --logs

# Runtime information
fleet --debug-runtime
```

### Advanced Usage

```bash
# Custom configuration path
fleet --config /path/to/config.yaml start

# Verbose output
fleet --verbose status

# JSON output
fleet status --json
```

## API Server

### Start Server

```bash
# Start consolidated API server (port 3001)
cd server/api && bun run src/index.ts

# Or with custom port
PORT=8080 bun run src/index.ts
```

### Health Check

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "healthy",
  "service": "fleettools-server",
  "timestamp": "2026-01-04T12:00:00.000Z"
}
```

### API Endpoints

#### Work Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/work-orders` | List all work orders |
| POST | `/api/v1/work-orders` | Create new work order |
| GET | `/api/v1/work-orders/:id` | Get work order |
| PATCH | `/api/v1/work-orders/:id` | Update work order |
| DELETE | `/api/v1/work-orders/:id` | Delete work order |

**Create Work Order:**
```bash
curl -X POST http://localhost:3001/api/v1/work-orders \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement user authentication",
    "description": "Add login/logout functionality",
    "priority": "high",
    "assigned_to": ["agent-1", "agent-2"]
  }'
```

**Update Work Order:**
```bash
curl -X PATCH http://localhost:3001/api/v1/work-orders/wo_xxx \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

#### CTK (File Reservations)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/ctk/reservations` | List all reservations |
| POST | `/api/v1/ctk/reserve` | Reserve a file |
| POST | `/api/v1/ctk/release` | Release reservation |

**Reserve File:**
```bash
curl -X POST http://localhost:3001/api/v1/ctk/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "file": "/path/to/file.txt",
    "specialist_id": "agent-1",
    "purpose": "edit"
  }'
```

**Release Reservation:**
```bash
curl -X POST http://localhost:3001/api/v1/ctk/release \
  -H "Content-Type: application/json" \
  -d '{"reservation_id": "xxx"}'
```

#### Tech Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tech-orders` | List tech orders |
| POST | `/api/v1/tech-orders` | Create tech order |

**Create Tech Order:**
```bash
curl -X POST http://localhost:3001/api/v1/tech-orders \
  -H "Content-Type: application/json" \
  -d '{
    "name": "React Component Pattern",
    "pattern": "function ${name}(props) { return <div />; }",
    "context": "Creating functional React components"
  }'
```

#### Squawk Mailbox

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/mailbox/append` | Append events to mailbox |
| GET | `/api/v1/mailbox/:streamId` | Get mailbox contents |

**Append Events:**
```bash
curl -X POST http://localhost:3001/api/v1/mailbox/append \
  -H "Content-Type: application/json" \
  -d '{
    "stream_id": "agent-1-task-123",
    "events": [
      {
        "type": "message",
        "data": {"text": "Starting task"},
        "metadata": {"priority": "high"}
      }
    ]
  }'
```

#### Squawk Cursor

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/cursor/advance` | Advance cursor position |
| GET | `/api/v1/cursor/:cursorId` | Get cursor position |

**Advance Cursor:**
```bash
curl -X POST http://localhost:3001/api/v1/cursor/advance \
  -H "Content-Type: application/json" \
  -d '{"stream_id": "agent-1-task-123", "position": 5}'
```

#### Squawk Locks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/lock/acquire` | Acquire file lock |
| POST | `/api/v1/lock/release` | Release file lock |
| GET | `/api/v1/locks` | List all active locks |

**Acquire Lock:**
```bash
curl -X POST http://localhost:3001/api/v1/lock/acquire \
  -H "Content-Type: application/json" \
  -d '{
    "file": "/path/to/file.txt",
    "specialist_id": "agent-1",
    "timeout_ms": 30000
  }'
```

#### Coordinator

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/coordinator/status` | Get coordinator status |

```bash
curl http://localhost:3001/api/v1/coordinator/status
```

Response:
```json
{
  "active_mailboxes": 2,
  "active_locks": 1,
  "timestamp": "2026-01-04T12:00:00.000Z"
}
```

## Persistence

### Squawk Data

Squawk API uses JSON file-based persistence:

- **Location**: `~/.local/share/fleet/squawk.json`
- **Data stored**: Mailboxes, events, cursors, locks
- **Auto-save**: Every 5 seconds
- **Survives restarts**: Yes

### Flightline Data

Flightline APIs use Git-backed file storage:

- **Location**: `.flightline/` directory
- **Work orders**: `.flightline/work-orders/{orderId}/manifest.json`
- **CTK reservations**: `.flightline/ctk/{reservationId}.json`
- **Tech orders**: `.flightline/tech-orders/{orderId}.json`

## Editor Plugins

### Claude Code Plugin

**Location**: `plugins/claude-code/`

**Commands:**
- `/fleet status` - Show FleetTools status
- `/fleet setup` - Initialize configuration
- `/fleet doctor` - Diagnose installation
- `/fleet services` - Manage local services
- `/fleet help` - Show help

**Build:**
```bash
cd plugins/claude-code && npm run build
```

**Output:**
- `dist/index.js` - Compiled plugin
- `dist/index.d.ts` - TypeScript declarations

### OpenCode Plugin

**Location**: `plugins/opencode/`

**Commands:**
- `/fleet status` - Show FleetTools status
- `/fleet setup` - Initialize configuration
- `/fleet doctor` - Diagnose installation
- `/fleet services` - Manage local services
- `/fleet help` - Show help

**Build:**
```bash
cd plugins/opencode && npm run build
```

**Output:**
- `dist/index.js` - Compiled plugin
- `dist/index.d.ts` - TypeScript declarations

## Testing

### Run API Tests

```bash
cd server/api

# Start server in background
bun run src/index.ts &
sleep 3

# Run tests
bun test-api.ts

# Kill server
kill %1
```

**Expected output**: 19 tests passing

### Run All Workspace Tests

```bash
bun run test
```

## Development

### Build All Packages

```bash
bun run build
```

### Watch Mode

```bash
# Watch CLI
cd cli && bun run --watch src/index.ts

# Watch server
cd server/api && bun run --watch src/index.ts
```

### Type Checking

```bash
npm run type-check --workspaces
```

### Linting

```bash
npm run lint --workspaces
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  OpenCode / Claude Code (Plugins)                                   │
│  └─→ /fleet commands                                                │
│         ↓                                                           │
│  Fleet CLI (Operations)                                             │
│  ├─→ Setup / Doctor / Services                                      │
│  ├─→ Local Mode:                                                    │
│  │    ├─→ JSON persistence (~/.local/share/fleet/)                  │
│  │    └─→ .flightline/ (git-backed)                                 │
│  └─→ Sync Mode (opt-in):                                            │
│       ├─→ API writes                                                │
│       └─→ Zero reads (future)                                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  FleetTools API Server (Bun.serve)                                  │
│  ├─→ /api/v1/work-orders (Flightline)                               │
│  ├─→ /api/v1/ctk/* (File reservations)                              │
│  ├─→ /api/v1/tech-orders (Patterns)                                 │
│  ├─→ /api/v1/mailbox/* (Squawk messaging)                           │
│  ├─→ /api/v1/cursor/* (Position tracking)                           │
│  ├─→ /api/v1/lock/* (File locking)                                  │
│  └─→ /api/v1/coordinator/* (Status)                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Configuration

### fleet.yaml

```yaml
fleet:
  user_id: "user-123"
  workspace_id: "workspace-456"
  mode: "local"  # or "synced"

podman:
  api:
    url: "http://localhost:7777"

sync:
  enabled: false
  zero:
    url: "http://localhost:1420"
```

## License

FleetTools includes vendored code from SwarmTools (MIT License).
See `THIRD_PARTY_NOTICES.md` for full attribution.

## Architecture

The new SwarmTools-matching architecture provides:

### Global CLI (`@fleettools/fleet-cli`)
- Project bootstrapping (`fleet init`)
- Service management (`fleet start/stop/status`)
- Configuration management (`fleet config`)
- Cross-platform runtime support (Bun + Node.js)

### Shared Package (`@fleettools/fleet-shared`)
- Runtime detection and optimization
- Configuration management (global + project)
- Project templates and utilities
- Cross-platform compatibility

### Services
- **Squawk**: Agent coordination and messaging
- **API Server**: REST endpoints for FleetTools features
- **Plugins**: Editor integrations (Claude Code, OpenCode)

### Configuration
- **Global**: `~/.config/fleet/config.yaml`
- **Project**: `fleet.yaml` (Git-friendly)
- **Environment**: Override support
- **Migration**: Path from legacy `.fleet/` structure

## Migration

See [MIGRATION.md](MIGRATION.md) for detailed migration guide from legacy FleetTools to the new architecture.

## Status

✅ **New Architecture Complete** - SwarmTools-matching implementation:
- ✅ Global CLI with `fleet` command
- ✅ Publishable packages (`@fleettools/fleet-cli`, `@fleettools/fleet-shared`)
- ✅ Dual runtime support (Bun + Node.js)
- ✅ Project bootstrapping (`fleet init/start/config`)
- ✅ Central configuration management
- ✅ Cross-platform compatibility
- ✅ Migration documentation and tools

🚀 **Ready for deployment and public release**
