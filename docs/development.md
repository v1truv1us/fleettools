# Development Guide

Guide for building, testing, and contributing to FleetTools.

## Prerequisites

- Bun (>=1.0.0) or Node.js (>=18.0.0)
- Git
- TypeScript 5.9.3 (included)

## Project Structure

```
fleettools/
├── squawk/                 # Coordination service
│   ├── src/
│   │   ├── db/            # Database operations
│   │   ├── recovery/      # Recovery mechanisms
│   │   └── index.ts
│   └── package.json
├── server/api/             # Consolidated API server
│   ├── src/
│   │   ├── flightline/    # Flightline API
│   │   ├── squawk/        # Squawk API
│   │   └── index.ts
│   ├── test-api.ts
│   └── package.json
├── plugins/               # Editor plugins
│   ├── claude-code/
│   │   └── src/
│   └── opencode/
│       └── src/
└── packages/              # Shared packages
    ├── fleet-cli/         # Global CLI (@fleettools)
    │   └── src/
    └── fleet-shared/      # Shared utilities
        └── src/
```

## Development Workflow

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/fleettools.git
cd fleettools
```

### 2. Install Dependencies

```bash
# Install all dependencies
bun install

# Verify installation
fleet --version
# Should show: @fleettools v0.2.0
```

### 3. Build All Workspaces

```bash
# Build all packages
bun run build

# Verify build
ls -la packages/fleet-cli/dist
ls -la squawk/dist
ls -la server/api/dist
```

### 4. Run Services

```bash
# Terminal 1: Start Squawk
cd squawk
bun run dev

# Terminal 2: Start API Server
cd server/api
bun run dev
```

### 5. Run Tests

```bash
# Run all tests
bun test

# Run specific workspace tests
cd server/api && bun test

# Run with coverage
bun test --coverage
```

---

## Code Style

### File Naming

```bash
# Use kebab-case for files
work-orders.ts
mission-manager.ts
database-adapter.ts
```

### Import Style

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
import { helper } from '../utils/helpers.js';
```

### Naming Conventions

```typescript
// Variables and functions: camelCase
const userId = '123';
function getUserById(id: string) { }

// Classes and interfaces: PascalCase
class DatabaseAdapter { }
interface Mission { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const SQUAWK_PORT = 3002;

// IDs: Prefix-based
const missionId = 'msn-abc123';
const workOrderId = 'wo-def456';
const checkpointId = 'chk-ghi789';
```

### Type Definitions

```typescript
/** JSDoc for documentation */
export interface Mission {
  id: string;
  title: string;
  description?: string;
  status: MissionStatus;
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}

export type MissionStatus = 'pending' | 'in_progress' | 'completed';

export interface WorkOrder {
  id: string;
  mission_id: string;
  title: string;
  status: WorkOrderStatus;
  assigned_agent?: string;
  created_at: string;
  updated_at: string;
}

export type WorkOrderStatus = 'pending' | 'in_progress' | 'completed';
```

### Error Handling

```typescript
export class FleetError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'FleetError';
  }
}

// Usage
try {
  const result = await someOperation();
} catch (error) {
  if (error instanceof FleetError) {
    console.error(`[${error.code}] ${error.message}`);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Testing

### Test Structure

```typescript
// Example test file
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('MissionManager', () => {
  let manager: MissionManager;

  beforeEach(() => {
    manager = new MissionManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  it('should create a mission', () => {
    const mission = manager.create('Test Mission');
    expect(mission.id).toMatch(/^msn-/);
    expect(mission.title).toBe('Test Mission');
  });

  it('should get mission by ID', () => {
    const created = manager.create('Test Mission');
    const retrieved = manager.getById(created.id);
    expect(retrieved).toEqual(created);
  });
});
```

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test path/to/test.ts

# Run with verbose output
bun test --verbose

# Run with watch mode
bun test --watch
```

### Integration Tests

```typescript
// server/api/test-api.ts
import { beforeAll, afterAll } from 'bun:test';

describe('API Integration Tests', () => {
  let server: any;

  beforeAll(async () => {
    // Start server
    server = await startTestServer();
  });

  afterAll(() => {
    // Stop server
    server.stop();
  });

  it('should create mission via API', async () => {
    const response = await fetch('http://localhost:3001/api/v1/flightline/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Mission' })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.id).toMatch(/^msn-/);
  });
});
```

---

## Building

### Build Commands

```bash
# Build all workspaces
bun run build

# Build specific workspace
cd packages/fleet-cli && bun run build
cd squawk && bun run build
cd server/api && bun run build

# Build with type checking
bun run build --type-check

# Clean build
bun run clean && bun run build
```

### Build Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Database Operations

### Using bun:sqlite

```typescript
import Database from 'bun:sqlite';

// Open database
const db = new Database(':memory:');

// Create table
db.exec(`
  CREATE TABLE missions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

// Insert with prepared statement
const insert = db.prepare(`
  INSERT INTO missions (id, title, status, created_at)
  VALUES (?, ?, ?, ?)
`);

const mission = {
  id: generateId('msn'),
  title: 'Test Mission',
  status: 'pending',
  created_at: new Date().toISOString()
};

insert.run(mission.id, mission.title, mission.status, mission.created_at);

// Query
const select = db.prepare('SELECT * FROM missions WHERE id = ?');
const result = select.get(mission.id);
console.log(result);

// Batch insert with transaction
const insertMany = db.transaction((missions) => {
  for (const m of missions) {
    insert.run(m.id, m.title, m.status, m.created_at);
  }
});

insertMany([
  { id: 'msn-1', title: 'Mission 1', status: 'pending', created_at: now() },
  { id: 'msn-2', title: 'Mission 2', status: 'pending', created_at: now() }
]);

// Cleanup
db.close();
```

---

## HTTP Server (Bun.serve)

### Basic Server

```typescript
const server = Bun.serve({
  port: parseInt(process.env.PORT || '3001', 10),
  async fetch(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname;

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (path === '/health') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString()
        }),
        { headers }
      );
    }

    if (path === '/api/v1/missions' && request.method === 'GET') {
      const missions = await getMissions();
      return new Response(
        JSON.stringify({ data: missions, error: null }),
        { headers }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers }
    );
  }
});

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.stop();
  process.exit(0);
});
```

---

## Contributing

### Setting Up Development Environment

```bash
# Fork repository
git clone https://github.com/yourusername/fleettools.git
cd fleettools

# Create feature branch
git checkout -b feature/my-feature

# Install dependencies
bun install

# Build
bun run build

# Run tests
bun test
```

### Commit Guidelines

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(cli): add mission create command

Add new CLI command to create missions with automatic ID generation.

Closes #123
```

```
fix(api): handle null values in work order update

Prevent error when updating work order with partial data.
```

### Pull Request Process

1. Update documentation
2. Add/update tests
3. Run tests: `bun test`
4. Run build: `bun run build`
5. Push to feature branch
6. Create pull request

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No linting errors
- [ ] All tests pass
- [ ] Changes are minimal and focused

---

## Debugging

### Debugging Server/API

```bash
# Start with debug logging
cd server/api
LOG_LEVEL=debug bun run dev

# Use built-in debugger
bun --debug-brk src/index.ts
```

### Debugging Squawk

```bash
# Start with verbose logging
cd squawk
LOG_LEVEL=debug bun run dev

# Check database contents
sqlite3 ~/.fleet/state.db
sqlite> SELECT * FROM missions;
```

### Common Debugging Commands

```typescript
// Add debug logging
console.debug('[DEBUG] Mission created:', mission);

// Use Bun logger
Bun.env.DEBUG = 'true';
if (Bun.env.DEBUG === 'true') {
  console.debug('Debug mode enabled');
}
```

---

## Performance Profiling

### Profile Server

```bash
# Start with profiling
bun --profile server/api/src/index.ts

# Analyze profile
bun --profile analysis server/api/src/index.ts
```

### Profile Operations

```typescript
const start = performance.now();
await someOperation();
const duration = performance.now() - start;
console.log(`Operation took ${duration}ms`);
```

---

## Packaging and Publishing

### Package Structure

```json
// packages/fleet-cli/package.json
{
  "name": "@fleettools/fleet-cli",
  "version": "1.0.0",
  "description": "FleetTools CLI",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "fleet": "./dist/index.js"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "publishConfig": {
    "access": "public"
  }
}
```

### Publishing to npm

```bash
# Build package
cd packages/fleet-cli
bun run build

# Publish
npm publish

# Or publish dry-run
npm publish --dry-run
```

### Publishing to private registry

```bash
# Configure registry
npm config set registry https://registry.example.com

# Publish
npm publish --registry https://registry.example.com
```

---

## Common Tasks

### Adding a New Agent Type

```typescript
// packages/fleet-shared/src/agent-types.ts
export const AGENT_TYPES = [
  'full-stack-developer',
  'code-reviewer',
  'security-scanner',
  'your-new-agent-type'
] as const;

export type AgentType = typeof AGENT_TYPES[number];
```

### Adding a New API Endpoint

```typescript
// server/api/src/your-feature/route.ts
import type { RequestContext } from '../types.js';

export async function handleGetResource(
  ctx: RequestContext
): Promise<Response> {
  const { params } = ctx;

  // Logic here
  const data = await getResource(params.id);

  return new Response(
    JSON.stringify({ data, error: null }),
    { headers: ctx.headers }
  );
}
```

### Adding a New CLI Command

```typescript
// packages/fleet-cli/src/commands/your-command.ts
import { Command } from 'commander';

export function registerCommand(program: Command): void {
  program
    .command('your-command <arg>')
    .description('Description of your command')
    .option('--option <value>', 'Option description')
    .action(async (arg, options) => {
      // Command logic
      console.log('Running your command with:', arg, options);
    });
}
```

---

## Troubleshooting

### Build Issues

```bash
# Clean build artifacts
bun run clean

# Clear node_modules
rm -rf node_modules packages/*/node_modules

# Reinstall
bun install

# Rebuild
bun run build
```

### Test Failures

```bash
# Run tests with verbose output
bun test --verbose

# Run specific test
bun test path/to/test.ts

# Debug test
bun test --inspect-brk path/to/test.ts
```

### Port Conflicts

```bash
# Find process using port
lsof -i :3001
lsof -i :3002

# Kill process
lsof -ti :3001 | xargs kill -9
```

---

## Resources

- [Architecture Documentation](./architecture.md)
- [API Reference](./api-reference.md)
- [CLI Reference](./cli-reference.md)
- [FleetTools GitHub](https://github.com/v1truvius/fleettools)

---

**Version**: [Current Version]
**Last Updated**: 2026-01-14
