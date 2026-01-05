# FleetTools

**FleetTools** - A developer toolkit for coordinating AI "fleets" of specialized agents working together to solve problems.

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

## Project Structure

```
fleettools/
├── cli/                          # Fleet CLI (TypeScript)
│   ├── src/
│   │   └── index.ts              # CLI implementation
│   ├── dist/                     # Compiled JavaScript
│   ├── package.json
│   └── tsconfig.json
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
├── config/
│   └── fleet.yaml                # Configuration file
│
├── specs/fleettools-fixes/       # Planning documents
│   ├── spec.md                   # Specification
│   ├── plan.md                   # Implementation plan
│   ├── research-opencode.md      # OpenCode research
│   └── research-claude-code.md   # Claude Code research
│
└── package.json                  # Root workspace (npm workspaces)
```

## Installation

### Prerequisites

- Node.js 18+ or Bun 1.0+
- Podman (optional, for local Postgres services)
- npm 10+ or Bun for workspace management

### Install Dependencies

```bash
# Install all workspace dependencies
npm install

# Build all TypeScript packages
npm run build --workspaces
```

## CLI Commands

### Basic Commands

```bash
# Check FleetTools status
node cli/dist/index.js status

# Initialize configuration
node cli/dist/index.js setup

# Diagnose installation
node cli/dist/index.js doctor

# Show help
node cli/dist/index.js --help
```

### Services Management

```bash
# Check services status
node cli/dist/index.js services status

# Start local services
node cli/dist/index.js services up

# Stop local services
node cli/dist/index.js services down

# View services logs
node cli/dist/index.js services logs
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
npm run test --workspaces
```

## Development

### Build All Packages

```bash
npm run build --workspaces
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

## Status

✅ **Implementation Complete** - All 5 phases finished:
- Phase 1: 8 critical/medium bugs fixed
- Phase 2: Build system with Bun/TypeScript
- Phase 3: JSON file-based persistence
- Phase 4: Consolidated API server (19 tests passing)
- Phase 5: TypeScript plugins for Claude Code and OpenCode

Ready for development and testing.
