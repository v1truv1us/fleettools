# FleetTools Agent Guidelines

## Project Overview

FleetTools is an AI Agent Coordination System built with TypeScript and Bun. Monorepo with CLI, Squawk (coordination), Server/API (consolidated API), and plugins (Claude Code, OpenCode).

**Runtime:** Bun (>=1.0.0) - NOT Node.js
**TypeScript:** 5.9.3, ES2022 target

## Core Philosophy

FleetTools is designed to enable seamless collaboration between AI agents, human developers, and development environments.

**Principles:**
1. **Bun-First Runtime** - All services use Bun for optimal performance
2. **Event-Driven Architecture** - Squawk provides mailbox/cursor/lock APIs for agent coordination
3. **Type-Safe Development** - TypeScript with strict mode enabled across workspaces
4. **Developer Experience** - Minimal dependencies, clear patterns, standardized tooling
5. **Editor Integration** - First-class support for Claude Code and OpenCode via plugins

**Architecture:**
- **CLI**: User-facing interface for setup, status, and orchestration
- **Squawk**: Central coordination service with event sourcing and state management
- **Server/API**: Consolidated endpoints for Flightline (work management) and Squawk (coordination)
- **Plugins**: Bridge between FleetTools and editor environments

**Design Decisions:**
- No Express/Node.js HTTP - Bun.serve provides faster, simpler HTTP servers
- SQLite for Persistence - bun:sqlite offers zero-dependency embedded database
- Monorepo with Workspaces - Shared tooling, independent deployment
- ISO 8601 Timestamps - Universal, sortable, human-readable date format
- Prefix-Based IDs - Self-documenting identifiers (msn-, wo-, chk-, etc.)

## Commands

### Root
```bash
bun install              # Install all deps
bun run build            # Build all workspaces
bun test                 # Run tests
```

### Individual Workspaces
```bash
cd cli || squawk || server/api
bun run build            # Compile TypeScript to dist/
bun run dev              # bun src/index.ts
bun start                # bun dist/index.js

# Server/API only
bun test                 # bun test-api.ts (single test file)
```

## Code Style

### Imports
```typescript
// Node.js built-ins: use 'node:' prefix
import fs from 'node:fs';
import path from 'node:path';

// External deps: no prefix
import { Command } from 'commander';

// Bun APIs
import Database from 'bun:sqlite';

// Local imports: .js extensions (NodeNext)
import { fn } from './types.js';
```

### Naming
- **Files:** kebab-case (`work-orders.ts`)
- **Functions/Variables:** camelCase (`getUserById`)
- **Classes/Interfaces:** PascalCase (`DatabaseAdapter`)
- **Constants:** UPPER_SNAKE_CASE (`FLIGHTLINE_DIR`)
- **IDs:** Prefix-based (`msn-abc123`, `wo_def456`)

### Types
```typescript
/** JSDoc comments for docs */
export interface Mission {
  id: string;
  title: string;
  created_at: string;  // ISO 8601
}

export type Status = 'pending' | 'in_progress';
```

### Error Handling
```typescript
router.post('/api/v1/resource', async (req: Request) => {
  try {
    const body = await req.json();
    return new Response(JSON.stringify({ data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### HTTP Server (Bun.serve)
```typescript
const server = Bun.serve({
  port: parseInt(process.env.PORT || '3001', 10),
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers });

    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { ...headers, 'Content-Type': 'application/json' },
    });
  },
});

process.on('SIGINT', () => { server.stop(); process.exit(0); });
```

### Database (bun:sqlite)
```typescript
import Database from 'bun:sqlite';
const db = new Database(':memory:');

// Prepared statements
const stmt = db.prepare('SELECT * FROM missions WHERE id = ?');
const result = stmt.get(missionId);

// Batch inserts
const insert = db.prepare('INSERT INTO events VALUES (?, ?)');
const insertMany = db.transaction((events) => {
  for (const e of events) insert.run(e.type, JSON.stringify(e.data));
});
insertMany(events);
```

## Development Workflow

1. **Initialize**: `bun install` sets up all workspaces
2. **Build**: `bun run build` compiles TypeScript across workspaces
3. **Develop**: Use `bun run dev` in individual workspaces
4. **Test**: `bun test` runs test suites
5. **Lint**: Consistent code style across all packages

## Testing Philosophy

- Server/API uses integration tests (`test-api.ts`)
- Tests verify server is running before execution
- Simple, readable assertions with color-coded output
- No heavy test frameworks - custom runner sufficient for current needs

## Error Handling Philosophy

- Consistent JSON error responses across all APIs
- Proper HTTP status codes (400, 404, 500)
- CORS headers enabled for cross-origin requests
- Graceful degradation when dependencies unavailable
- Detailed error logging for debugging

## Key Patterns

1. **Always use Bun.serve** - NOT express or Node.js http
2. **Use .js extensions** for local imports (NodeNext)
3. **CORS headers** in all API responses
4. **ISO 8601 timestamps** (`new Date().toISOString()`)
5. **UUID-based IDs** with prefixes
6. **Environment variables** for ports (`PORT`, `SQUAWK_PORT`)
7. **Graceful shutdown** with SIGINT/SIGTERM handlers

## Project Structure
```
fleettools/
├── cli/              # CLI
├── squawk/           # Coordination service
├── server/api/       # Consolidated API
└── plugins/          # Editor plugins
```

## Directory Context Index

| Directory | Hierarchy Level | Purpose | Key Files |
|-----------|-----------------|---------|-----------|
| `cli/` | CLI Application | FleetTools CLI tool | `index.ts`, `src/commands/` |
| `squawk/` | Coordination Service | Agent coordination APIs | `src/db/`, `src/recovery/` |
| `server/api/` | Consolidated API Server | Flightline + Squawk API | `src/flightline/`, `src/squawk/` |
| `plugins/claude-code/` | Editor Plugin | Claude Code integration | `src/index.ts` |
| `plugins/opencode/` | Editor Plugin | OpenCode integration | `src/index.ts` |

Each subdirectory's AGENTS.md includes hierarchy metadata linking to:
- **Parent:** This AGENTS.md for agent coordination
- **Philosophy:** Project principles (see sections above)

## Pitfalls

❌ Using express/http modules → Use Bun.serve
❌ Missing 'node:' prefix for built-ins
❌ Using ts-node/tsx → Use bun directly
❌ Missing .js in local imports
❌ No CORS in API responses
❌ Running .ts with node → Use bun
