# Architecture

This document describes FleetTools' system architecture, components, and data flow.

## System Overview

FleetTools is an event-driven, type-safe coordination system for AI agents. It uses a monorepo structure with TypeScript, Bun runtime, and SQLite for persistence.

```
┌─────────────────────────────────────────────────────────────┐
│                      FleetTools System                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   CLI Tool   │  │  Server/API  │  │   Squawk     │      │
│  │              │  │              │  │   Service    │      │
│  │  @fleet-cli  │◄─┤  Flightline  │◄─┤  Coordination│      │
│  │              │  │      +       │  │              │      │
│  └──────────────┘  │   Squawk     │  └──────┬───────┘      │
│                   └──────────────┘         │               │
│                          │               │               │
│  ┌──────────────┐       │               │               │
│  │   Plugins    │       │               │               │
│  │              │───────┘               │               │
│  │ Claude Code  │                       │               │
│  │ OpenCode     │                       │               │
│  └──────────────┘                       │               │
│                                          │               │
│                   ┌──────────────┐      │               │
│                   │  Shared Pkg  │      │               │
│                   │  Utilities   │◄─────┘               │
│                   └──────────────┘                      │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

## Core Components

### 1. CLI Tool (@fleet/cli)

**Purpose**: User-facing interface for project management and orchestration

**Responsibilities**:
- Project initialization and bootstrapping
- Service lifecycle management (start/stop/status)
- Configuration management
- Command routing to services

**Key Features**:
- Global commands: `fleet init`, `fleet start`, `fleet status`
- Project-scoped commands: `mission create`, `work-order list`
- Runtime detection (Bun vs Node.js)
- Template-based project generation

**Location**: `packages/fleet-cli/`

### 2. Server/API (Consolidated)

**Purpose**: Unified API server for Flightline and Squawk

**Responsibilities**:
- Flightline API: Work management (missions, work orders, checkpoints)
- Squawk API: Agent coordination (mailbox, cursor, lock)
- Request validation and error handling
- CORS and security

**Key Features**:
- Bun.serve for HTTP server
- RESTful API design
- Consistent error responses
- Health check endpoints

**API Structure**:
```
/api/v1/
├── /flightline/
│   ├── /missions
│   ├── /work-orders
│   └── /checkpoints
└── /squawk/
    ├── /mailbox
    ├── /cursor
    └── /locks
```

**Location**: `server/api/`

### 3. Squawk Service

**Purpose**: Core coordination service for agent interaction

**Responsibilities**:
- Mailbox API: Message passing between agents
- Cursor API: Shared state management and synchronization
- Lock API: Distributed locking for resource coordination
- Event sourcing and state management

**Key Features**:
- Event-driven architecture
- SQLite persistence (bun:sqlite)
- Recovery mechanisms
- Cursor-based state tracking

**API Endpoints**:
```
/squawk/v1/
├── /mailbox/{agent-id}/messages
├── /cursor/{resource-id}
└── /locks/{resource-id}
```

**Location**: `squawk/`

### 4. Plugins

**Purpose**: Bridge FleetTools with editor environments

**Responsibilities**:
- Connect to Squawk service
- Forward commands from editor to coordination system
- Display agent status and progress
- Handle editor-specific integrations

**Key Features**:
- Real-time updates via Squawk
- Editor-agnostic coordination protocol
- Type-safe message handling

**Available Plugins**:
- **Claude Code Plugin**: Native Claude Code integration
- **OpenCode Plugin**: OpenCode editor support

**Location**: `plugins/`

### 5. Shared Package (@fleet/shared)

**Purpose**: Common utilities and configuration across workspaces

**Responsibilities**:
- Runtime detection (Bun vs Node.js)
- Configuration management
- Project bootstrapping helpers
- Type definitions

**Key Features**:
- Reusable abstractions
- Type-safe configuration
- Environment variable handling

**Location**: `packages/fleet-shared/`

## Data Flow

### Agent Coordination Flow

```
┌──────────────┐
│   Editor     │
│  (Claude)    │
└──────┬───────┘
       │
       │ 1. User command
       v
┌──────────────┐
│   Plugin     │
│  (Bridge)    │
└──────┬───────┘
       │
       │ 2. Forward to Squawk
       v
┌──────────────┐
│   Squawk     │
│   Service    │
└──────┬───────┘
       │
       │ 3. Store in mailbox
       v
┌──────────────┐
│   Agent      │
│   Process    │
└──────┬───────┘
       │
       │ 4. Process & respond
       v
┌──────────────┐
│   Squawk     │
│   Service    │
└──────┬───────┘
       │
       │ 5. Update cursor state
       v
┌──────────────┐
│   Plugin     │
│  (Display)   │
└──────────────┘
```

### Work Management Flow

```
┌──────────────┐
│   CLI / UI   │
└──────┬───────┘
       │
       │ 1. Create mission
       v
┌──────────────┐
│  Flightline  │
│     API      │
└──────┬───────┘
       │
       │ 2. Store in database
       v
┌──────────────┐
│  SQLite DB   │
└──────┬───────┘
       │
       │ 3. Notify agents via Squawk
       v
┌──────────────┐
│    Agent     │
│  Assignment  │
└──────┬───────┘
       │
       │ 4. Report progress
       v
┌──────────────┐
│  Flightline  │
│     API      │
└──────┬───────┘
       │
       │ 5. Update status
       v
┌──────────────┐
│   CLI / UI   │
│   Display    │
└──────────────┘
```

## Database Schema

### Flightline Schema

```sql
-- Missions
CREATE TABLE missions (
  id TEXT PRIMARY KEY,  -- msn-UUID
  title TEXT NOT NULL,
  status TEXT NOT NULL,  -- pending|in_progress|completed
  created_at TEXT NOT NULL,  -- ISO 8601
  updated_at TEXT NOT NULL
);

-- Work Orders
CREATE TABLE work_orders (
  id TEXT PRIMARY KEY,  -- wo-UUID
  mission_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,  -- pending|in_progress|completed
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

-- Checkpoints
CREATE TABLE checkpoints (
  id TEXT PRIMARY KEY,  -- chk-UUID
  work_order_id TEXT NOT NULL,
  description TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
);
```

### Squawk Schema

```sql
-- Mailbox Messages
CREATE TABLE mailbox (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  payload TEXT NOT NULL,  -- JSON
  created_at TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE
);

-- Cursor State
CREATE TABLE cursors (
  resource_id TEXT PRIMARY KEY,
  cursor_value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Locks
CREATE TABLE locks (
  resource_id TEXT PRIMARY KEY,
  holder_id TEXT NOT NULL,
  acquired_at TEXT NOT NULL,
  expires_at TEXT
);
```

## Communication Protocols

### Squawk Mailbox Protocol

**Message Format**:
```json
{
  "id": "msg-abc123",
  "from": "agent-xyz",
  "to": "agent-def",
  "type": "work_assignment",
  "payload": {
    "work_order_id": "wo-def456",
    "priority": "high"
  },
  "timestamp": "2026-01-14T10:30:00Z"
}
```

**Message Types**:
- `work_assignment`: Assign work to agent
- `status_update`: Report progress
- `checkpoint_request`: Request verification
- `coordination`: Agent coordination

### Flightline API Protocol

**Request Format**:
```json
{
  "mission_id": "msn-abc123",
  "title": "Implement authentication"
}
```

**Response Format**:
```json
{
  "data": { ... },
  "error": null,
  "timestamp": "2026-01-14T10:30:00Z"
}
```

## Error Handling Strategy

### Error Categories

| Category | HTTP Status | Example |
|----------|-------------|---------|
| Validation | 400 | Invalid input |
| Not Found | 404 | Resource missing |
| Conflict | 409 | Duplicate entry |
| Server Error | 500 | Database failure |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid mission ID format",
    "details": { "field": "mission_id" }
  },
  "timestamp": "2026-01-14T10:30:00Z"
}
```

## Security Considerations

### Current Implementation
- CORS headers for cross-origin requests
- Input validation on all endpoints
- SQLite database with file permissions
- No secret embedding in code

### Future Enhancements
- Authentication/Authorization
- Message encryption
- Rate limiting
- Audit logging

## Performance Optimizations

### Runtime Optimizations
- Bun runtime for faster execution
- Prepared SQLite statements
- Batch inserts with transactions

### Network Optimizations
- JSON serialization optimization
- Keep-alive connections
- Response compression

### Data Optimizations
- Indexed database columns
- Cursor-based pagination
- Event sourcing for audit trail

## Scalability Considerations

### Current Limitations
- Single SQLite instance (not distributed)
- In-memory coordination state
- No horizontal scaling

### Scaling Path
- PostgreSQL for distributed persistence
- Redis for coordination state
- Microservice decomposition
- Load balancing

## Monitoring & Observability

### Health Checks

```bash
# Server health
curl http://localhost:3001/health

# Squawk health
curl http://localhost:3002/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-14T10:30:00Z",
  "version": "1.0.0"
}
```

### Logging Strategy
- Structured JSON logs
- Log levels: error, warn, info, debug
- Request/response logging for debugging

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Bun / Node.js | >=1.0.0 / >=18.0.0 |
| Language | TypeScript | 5.9.3 |
| Target | ES2022 | - |
| Database | SQLite (bun:sqlite) | - |
| HTTP Server | Bun.serve | - |
| Package Manager | Bun | - |

## Design Patterns

### 1. Event Sourcing
- Store events as immutable records
- Rebuild state from event log
- Audit trail built-in

### 2. Repository Pattern
- Abstract database operations
- Testable data access layer
- Migration-friendly

### 3. Command Pattern
- Encapsulate requests as objects
- Queue-based processing
- Undo/redo capability

### 4. Observer Pattern
- Agents subscribe to events
- Real-time notifications
- Loose coupling

---

**Version**: [Current Version]
**Last Updated**: 2026-01-14
