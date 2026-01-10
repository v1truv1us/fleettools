# FleetTools Implementation Fixes Specification

## Overview

This specification defines all fixes, improvements, and implementations needed to make FleetTools fully functional. The system is currently ~35% complete with 12 identified bugs and significant missing functionality. This spec covers critical bug fixes, build system improvements, local mode completion, and preparation for future sync capabilities.

## Context

### Research Context

Key findings from research analysis:

1. **Critical Bugs (3)**: Missing imports, undefined variables, incorrect API usage that will cause runtime crashes
2. **Medium Bugs (5)**: Logic errors that may cause unexpected behavior
3. **Build System Broken**: No root package.json, wrong bin paths, missing dependencies
4. **Local Mode ~50%**: Work orders and tech orders work, but Squawk has no persistence
5. **Sync Mode 0%**: Zero integration, Cloudflare Access, and enrollment flow not implemented
6. **Two CLI implementations**: Both index.ts and index.cjs exist with inconsistencies

### System Context

FleetTools is a fork/rebrand of SwarmTools for AI agent coordination with:
- **CLI**: Node.js-based command interface for operations
- **Flightline**: Git-backed work tracking (work orders, CTK, tech orders)
- **Squawk**: Agent coordination and durable messaging (mailboxes, cursors, locks)
- **Plugins**: OpenCode and Claude Code integration via /fleet commands
- **Sync Mode**: Optional Rocicorp Zero sync with Cloudflare Access authentication
- **Semantic Memory**: VPS-hosted embeddings with pgvector storage

### Technical Decisions (Locked)

1. **TypeScript with proper build**: Consolidate to TypeScript with tsc compilation
2. **SQLite for Squawk persistence**: Use better-sqlite3 for reliable local storage
3. **flightline/api.js as server**: Single Express server for all APIs
4. **Research plugin APIs**: Investigate actual OpenCode/Claude Code plugin interfaces

## User Stories

### US-001: Developer Fixes Critical Bugs
**As a** developer setting up FleetTools
**I want** to run the CLI without crashes
**So that** I can actually use the tool

#### Acceptance Criteria
- [ ] CLI index.cjs has correct execSync import (cli/index.cjs:11)
- [ ] Squawk API uses correct crypto.randomUUID() (squawk/api/index.js:5,37,159)
- [ ] Lock release endpoint has specialist_id variable (squawk/api/index.js:192)
- [ ] All 3 critical bugs verified fixed via test execution

### US-002: Developer Fixes Medium Bugs
**As a** developer testing FleetTools
**I want** all code paths to work correctly
**So that** I can trust the system behavior

#### Acceptance Criteria
- [ ] Podman version check returns correct boolean (cli/index.cjs:250-254)
- [ ] Postgres status check uses correct execSync return (cli/index.cjs:265-270)
- [ ] Mailbox retrieval works for existing streams (squawk/api/index.js:59-69)
- [ ] Plugin catch blocks handle parse errors gracefully (plugins/*/index.js:106-108)

### US-003: Developer Installs CLI Successfully
**As a** developer wanting to use FleetTools
**I want** to install the CLI globally
**So that** I can run fleet commands from anywhere

#### Acceptance Criteria
- [ ] Root package.json exists with workspaces configuration
- [ ] cli/package.json has correct bin path (./index.ts)
- [ ] Build script compiles TypeScript to dist/
- [ ] npm install completes without errors
- [ ] fleet status runs without errors

### US-004: Developer Runs Local Services
**As a** developer working with local data
**I want** to start and stop local services
**So that** I can control my development environment

#### Acceptance Criteria
- [ ] fleet services up starts Postgres container
- [ ] fleet services down stops Postgres container
- [ ] fleet services status shows correct state
- [ ] fleet services logs postgres shows container logs

### US-005: Squawk Data Persists Across Restarts
**As a** developer using coordination features
**I want** my mailboxes and locks to persist
**So that** I don't lose state when restarting

#### Acceptance Criteria
- [ ] SQLite database created at ~/.local/share/fleet/squawk.db
- [ ] Mailbox events persist after server restart
- [ ] Cursor positions persist after server restart
- [ ] File locks persist after server restart
- [ ] Locks auto-release on timeout

### US-006: Server API Starts Correctly
**As a** developer deploying FleetTools
**I want** the server to start without errors
**So that** I can use API endpoints

#### Acceptance Criteria
- [ ] server/api/index.js exists and is functional
- [ ] Express server starts on configured port
- [ ] /health endpoint returns 200
- [ ] Work orders CRUD endpoints function
- [ ] CTK reservations endpoints function

### US-007: Plugins Work with Editors
**As a** developer using OpenCode or Claude Code
**I want** to use /fleet commands in my editor
**So that** I can manage FleetTools from my workflow

#### Acceptance Criteria
- [ ] /fleet status command works in OpenCode
- [ ] /fleet status command works in Claude Code
- [ ] /fleet setup command works in both editors
- [ ] /fleet doctor command works in both editors
- [ ] Plugins use actual editor plugin APIs correctly

### US-008: TypeScript Compiles Cleanly
**As a** developer contributing to FleetTools
**I want** TypeScript to compile without errors
**So that** I can use type safety

#### Acceptance Criteria
- [ ] tsc --noEmit passes with no errors
- [ ] All type definitions are correct
- [ ] No any types unless explicitly justified
- [ ] tsconfig.json is properly configured

## Non-Functional Requirements

### Security
- No sensitive data in logs (config files, tokens, passwords)
- SQLite database file permissions restrict access (0600)
- Podman commands escape user input properly
- Plugin APIs use sanitized command execution

### Performance
- CLI commands complete within 500ms (p95)
- SQLite queries complete within 50ms (p95)
- Server startup completes within 2 seconds
- Memory usage stays under 100MB for CLI

### Availability & Reliability
- Graceful degradation if Podman unavailable
- SQLite transactions use proper error handling
- Server retries on transient failures
- Configuration validation before operations

### Maintainability
- All functions have JSDoc comments
- Error messages include actionable guidance
- Log levels used appropriately (debug/info/warn/error)
- Configuration schema is documented

### Compatibility
- Node.js 18+ compatibility
- Podman 4.0+ compatibility
- SQLite 3.35+ (better-sqlite3)
- Works on Linux and macOS

## Technical Specifications

### 1. Critical Bug Fixes

#### 1.1 CLI execSync Import (cli/index.cjs:11)

**Current Code:**
```javascript
const { exec } = require('child_process');
```

**Expected Code:**
```javascript
const { exec, execSync } = require('child_process');
```

**Implementation Notes:**
- Required for lines 250 and 265 which use execSync
- Both usages need encoding: 'utf-8' option

#### 1.2 Squawk UUID Fix (squawk/api/index.js:5,37,159)

**Current Code (line 5):**
```javascript
const { v4: randomUUID } = require('crypto');
```

**Expected Code (remove line 5):**
```javascript
const crypto = require('crypto');
```

**Current Code (lines 37, 159):**
```javascript
id: v4.randomUUID(),
```

**Expected Code:**
```javascript
id: crypto.randomUUID(),
```

**Implementation Notes:**
- crypto.randomUUID() is available in Node.js 14.17+
- Remove the incorrect v4 destructuring import

#### 1.3 Lock Release Variable (squawk/api/index.js:179-194)

**Current Code:**
```javascript
app.post('/api/v1/lock/release', (req, res) => {
  try {
    const { lock_id } = req.body;
    // ...
    if (lock.reserved_by !== specialist_id) {
```

**Expected Code:**
```javascript
app.post('/api/v1/lock/release', (req, res) => {
  try {
    const { lock_id, specialist_id } = req.body;
    // ...
```

**Implementation Notes:**
- specialist_id must match the one used when acquiring the lock
- Consider adding authorization check

### 2. Medium Bug Fixes

#### 2.1 Podman Version Check (cli/index.cjs:250-254)

**Current Code:**
```javascript
function checkPodmanSync() {
  try {
    const result = execSync('podman --version', { encoding: 'utf-8' });
    return !result.error;
  } catch {
    return false;
  }
}
```

**Expected Code:**
```javascript
function checkPodmanSync() {
  try {
    execSync('podman --version', { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}
```

**Implementation Notes:**
- execSync throws on error, returns string on success
- No error property on string return value

#### 2.2 Postgres Status Check (cli/index.cjs:265-270)

**Current Code:**
```javascript
function checkPostgresStatusSync() {
  // ...
  try {
    const result = execSync('podman ps --filter name=fleettools-pg --format {{.Names}}', { encoding: 'utf-8' });
    const running = result.stdout.trim().length > 0;
    return running;
  } catch {
    return false;
  }
}
```

**Expected Code:**
```javascript
function checkPostgresStatusSync() {
  // ...
  try {
    const result = execSync('podman ps --filter name=fleettools-pg --format {{.Names}}', { encoding: 'utf-8' });
    const running = result.trim().length > 0;
    return running;
  } catch {
    return false;
  }
}
```

**Implementation Notes:**
- execSync returns stdout directly, not { stdout: '...' }
- When encoding is specified, result is the string

#### 2.3 Mailbox Retrieval (squawk/api/index.js:59-69)

**Current Code:**
```javascript
let mailbox;
if (!mailboxes.has(stream_id)) {
  mailbox = {
    id: stream_id,
    events: [],
    created_at: new Date().toISOString(),
  };
  mailboxes.set(stream_id, mailbox);
}

mailbox.events.push(...events);  // BUG: mailbox undefined if already exists
```

**Expected Code:**
```javascript
let mailbox;
if (!mailboxes.has(stream_id)) {
  mailbox = {
    id: stream_id,
    events: [],
    created_at: new Date().toISOString(),
  };
  mailboxes.set(stream_id, mailbox);
} else {
  mailbox = mailboxes.get(stream_id);
}

mailbox.events.push(...events);
```

**Implementation Notes:**
- Need to retrieve existing mailbox if already created
- This bug would cause TypeError on second append to same stream

#### 2.4 Plugin Catch Blocks (plugins/*/index.js:106-108)

**Current Code (claude-code/index.js:106-109):**
```javascript
} catch (parseError) {
  this.showOutput(output);  // BUG: output not defined in catch
  this.showInAssistantMessage('Status Details', stdout);
}
```

**Expected Code:**
```javascript
} catch (parseError) {
  this.showOutput(['Failed to parse status output']);
  this.showInAssistantMessage('Status Details', stdout);
}
```

**Implementation Notes:**
- output variable is scoped to try block
- Need inline fallback message or move output declaration outside try

### 3. Build System Fixes

#### 3.1 Root package.json

**File:** `/home/vitruvius/git/fleettools/package.json`

**Content:**
```json
{
  "name": "fleettools",
  "version": "0.1.0",
  "description": "FleetTools - AI Agent Coordination System",
  "private": true,
  "workspaces": [
    "cli",
    "squawk",
    "server/api",
    "plugins/*"
  ],
  "scripts": {
    "install:all": "npm install",
    "build": "npm run build --workspaces",
    "build:cli": "npm run build -w @fleettools/cli",
    "build:squawk": "npm run build -w @fleettools/squawk",
    "build:server": "npm run build -w @fleettools/server",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces",
    "doctor": "node cli/index.cjs doctor"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

**Implementation Notes:**
- Uses npm workspaces for monorepo management
- Build runs in all workspaces
- Root level only has dev dependencies

#### 3.2 cli/package.json

**Current Issues:**
- bin path wrong: "./cli/index.ts" should be "./index.ts"
- build script path wrong: "cli/index.ts" should be "index.ts"

**Expected Content:**
```json
{
  "name": "@fleettools/cli",
  "version": "0.1.0",
  "description": "FleetTools CLI - Operations and setup",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "fleet": "./index.ts"
  },
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "start": "node dist/index.js",
    "dev": "tsx index.ts",
    "test": "node --test *.test.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "yaml": "^2.3.4",
    "better-sqlite3": "^9.2.2",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/better-sqlite3": "^7.6.8",
    "@types/express": "^4.17.21",
    "tsx": "^4.6.2",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "files": [
    "dist",
    "*.md"
  ]
}
```

**Implementation Notes:**
- bin points to index.ts (not cli/index.ts)
- build uses tsc with project tsconfig
- Main entry is dist/index.js (compiled output)
- Includes all runtime dependencies

#### 3.3 cli/tsconfig.json

**File:** `/home/vitruvius/git/fleettools/cli/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "include": [
    "index.ts",
    "providers/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

**Implementation Notes:**
- outDir is dist (not cli/dist)
- rootDir is . (not explicitly set, inferred)
- Strict mode enabled for type safety

### 4. Squawk SQLite Persistence

#### 4.1 Database Schema

**File:** `/home/vitruvius/git/fleettools/squawk/src/db/schema.sql`

```sql
-- Mailboxes table
CREATE TABLE IF NOT EXISTS mailboxes (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    mailbox_id TEXT NOT NULL,
    type TEXT NOT NULL,
    stream_id TEXT NOT NULL,
    data TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    causation_id TEXT,
    metadata TEXT,
    FOREIGN KEY (mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE
);

-- Cursors table
CREATE TABLE IF NOT EXISTS cursors (
    id TEXT PRIMARY KEY,
    stream_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(stream_id)
);

-- Locks table
CREATE TABLE IF NOT EXISTS locks (
    id TEXT PRIMARY KEY,
    file TEXT NOT NULL,
    reserved_by TEXT NOT NULL,
    reserved_at TEXT NOT NULL,
    released_at TEXT,
    purpose TEXT DEFAULT 'edit',
    checksum TEXT,
    timeout_ms INTEGER DEFAULT 30000,
    metadata TEXT
);

-- Specialists table (for tracking active specialists)
CREATE TABLE IF NOT EXISTS specialists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    last_seen TEXT NOT NULL,
    metadata TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_mailbox ON events(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_events_stream ON events(stream_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_locks_file ON locks(file);
CREATE INDEX IF NOT EXISTS idx_locks_reserved_by ON locks(reserved_by);
CREATE INDEX IF NOT EXISTS idx_specialists_status ON specialists(status);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_mailbox_timestamp
    AFTER UPDATE ON mailboxes
    BEGIN
        UPDATE mailboxes SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
```

**Implementation Notes:**
- Uses TEXT for UUIDs (SQLite doesn't have UUID type)
- Timestamps stored as ISO 8601 TEXT
- Cascade delete for mailboxes removes events
- Timeouts for locks (auto-release)

#### 4.2 Database Module

**File:** `/home/vitruvius/git/fleettools/squawk/src/db/index.ts`

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(
  process.env.XDG_DATA_HOME || path.join(process.env.HOME || '', '.local', 'share'),
  'fleet',
  'squawk.db'
);

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database): void {
  // Read and execute schema.sql
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Type definitions
export interface Mailbox {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  mailbox_id: string;
  type: string;
  stream_id: string;
  data: string;  // JSON string
  occurred_at: string;
  causation_id: string | null;
  metadata: string | null;  // JSON string
}

export interface Cursor {
  id: string;
  stream_id: string;
  position: number;
  updated_at: string;
}

export interface Lock {
  id: string;
  file: string;
  reserved_by: string;
  reserved_at: string;
  released_at: string | null;
  purpose: string;
  checksum: string | null;
  timeout_ms: number;
  metadata: string | null;  // JSON string
}
```

#### 4.3 Squawk Package

**File:** `/home/vitruvius/git/fleettools/squawk/package.json`

```json
{
  "name": "@fleettools/squawk",
  "version": "0.1.0",
  "description": "FleetTools Squawk - Agent Coordination System",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "test": "node --test *.test.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.2.2",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/better-sqlite3": "^7.6.8",
    "@types/express": "^4.17.21",
    "@types/uuid": "^9.0.7",
    "tsx": "^4.6.2",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "files": [
    "dist",
    "src/db"
  ]
}
```

**Implementation Notes:**
- Uses better-sqlite3 for synchronous SQLite API
- uuid package for consistent UUID generation
- Separate build for Squawk module

### 5. Server API Consolidation

#### 5.1 Server Structure

The server will use flightline/api.js as the base but include Squawk endpoints:

```
server/
├── api/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          # Main server entry
│       ├── flightline/       # Work orders, CTK, tech orders
│       ├── squawk/           # Mailboxes, cursors, locks
│       └── middleware/       # Auth, logging, errors
```

#### 5.2 Main Server Entry

**File:** `/home/vitruvius/git/fleettools/server/api/src/index.ts`

```typescript
import express from 'express';
import { getDatabase } from '../squawk/db';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  const db = getDatabase();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Flightline routes
app.use('/api/v1/work-orders', (await import('./flightline/work-orders.js')).default);
app.use('/api/v1/ctk', (await import('./flightline/ctk.js')).default);
app.use('/api/v1/tech-orders', (await import('./flightline/tech-orders.js')).default);

// Squawk routes
app.use('/api/v1/mailbox', (await import('./squawk/mailbox.js')).default);
app.use('/api/v1/cursor', (await import('./squawk/cursor.js')).default);
app.use('/api/v1/lock', (await import('./squawk/lock.js')).default);
app.use('/api/v1/coordinator', (await import('./squawk/coordinator.js')).default);

app.listen(PORT, () => {
  console.log(`FleetTools API server listening on port ${PORT}`);
});
```

### 6. Plugin API Research

#### 6.1 OpenCode Plugin Interface

**Research Required:**
- What is the actual OpenCode plugin API?
- How do plugins register commands?
- What callbacks are available for showOutput, showError, etc.?

**Approach:**
- Create minimal stub implementation that works with expected API
- Use child_process to delegate to fleet CLI
- Log warning if plugin API unavailable

#### 6.2 Claude Code Plugin Interface

**Research Required:**
- What is @anthropic-ai/sdk package?
- How do Claude Code plugins work?
- What is the Command class interface?

**Approach:**
- Research actual Claude Code extensibility
- Create plugin that works without SDK if needed
- Use process events for graceful degradation

#### 6.3 Plugin Implementation

**File:** `/home/vitruvius/git/fleettools/plugins/opencode/src/index.ts`

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface OpenCodePluginAPI {
  showOutput(message: string | string[]): void;
  showError(message: string, error?: Error): void;
  showInOutputPane(title: string, content: string): void;
}

interface CommandHandler {
  (): Promise<void>;
}

interface CommandsAPI {
  registerCommand(cmd: {
    id: string;
    name: string;
    description: string;
    handler: CommandHandler;
  }): void;
}

class FleetToolsOpenCodePlugin {
  name = 'FleetTools';
  version = '0.1.0';
  commands: CommandsAPI | null = null;
  api: OpenCodePluginAPI | null = null;

  async register(commands: CommandsAPI): Promise<void> {
    this.commands = commands;
    commands.registerCommand({
      id: 'fleet-status',
      name: '/fleet status',
      description: 'Show FleetTools status',
      handler: this.handleStatus.bind(this),
    });
    // ... other commands
  }

  private async handleStatus(): Promise<void> {
    this.showMessage('Fetching FleetTools status...');
    try {
      const { stdout } = await execAsync('fleet status --json');
      const status = JSON.parse(stdout);
      this.showFormattedStatus(status);
    } catch (error) {
      this.showError('Failed to get status', error as Error);
    }
  }

  private showMessage(message: string): void {
    this.api?.showOutput(`\n${message}\n`);
  }

  private showError(message: string, error?: Error): void {
    this.api?.showOutput(`\n❌ Error: ${message}\n`);
    if (error) {
      this.api?.showOutput(`   ${error.message}\n`);
    }
  }

  private showFormattedStatus(status: any): void {
    const output = [
      'FleetTools Status',
      '================',
      '',
      `Mode: ${status.mode?.toUpperCase() || 'LOCAL'}`,
      `User: ${status.config?.fleet?.user_id || 'Not enrolled'}`,
    ];
    this.api?.showOutput(output);
    this.api?.showInOutputPane('Status Details', JSON.stringify(status, null, 2));
  }
}

export default {
  name: 'FleetTools',
  version: '0.1.0',
  async register(commands: CommandsAPI): Promise<void> {
    const plugin = new FleetToolsOpenCodePlugin();
    await plugin.register(commands);
  },
};
```

## Implementation Tasks

### Phase 1: Critical Bug Fixes (Day 1)

- [ ] 1.1 Fix cli/index.cjs execSync import
- [ ] 1.2 Fix squawk/api/index.js crypto.randomUUID()
- [ ] 1.3 Fix squawk/api/index.js specialist_id variable
- [ ] 1.4 Fix cli/index.cjs Podman version check
- [ ] 1.5 Fix cli/index.cjs Postgres status check
- [ ] 1.6 Fix squawk/api/index.js mailbox retrieval
- [ ] 1.7 Fix plugins/claude-code/index.js catch block
- [ ] 1.8 Fix plugins/opencode/index.js catch block
- [ ] 1.9 Verify all fixes with test execution

### Phase 2: Build System (Day 1-2)

- [ ] 2.1 Create root package.json
- [ ] 2.2 Fix cli/package.json bin path
- [ ] 2.3 Fix cli/package.json build script
- [ ] 2.4 Create cli/tsconfig.json
- [ ] 2.5 Create squawk/package.json
- [ ] 2.6 Create squawk/tsconfig.json
- [ ] 2.7 Create server/api/package.json
- [ ] 2.8 Create server/api/tsconfig.json
- [ ] 2.9 Run npm install at root
- [ ] 2.10 Run tsc in cli workspace
- [ ] 2.11 Verify CLI runs after build

### Phase 3: SQLite Persistence (Day 2-3)

- [ ] 3.1 Create squawk/src/db/schema.sql
- [ ] 3.2 Create squawk/src/db/index.ts
- [ ] 3.3 Update squawk API to use SQLite
- [ ] 3.4 Add migration support for future schema changes
- [ ] 3.5 Test persistence across restarts
- [ ] 3.6 Test lock timeout behavior

### Phase 4: Server Consolidation (Day 3-4)

- [ ] 4.1 Create server/api/src/index.ts
- [ ] 4.2 Move/adapt flightline endpoints to server
- [ ] 4.3 Move/adapt squawk endpoints to server
- [ ] 4.4 Add error handling middleware
- [ ] 4.5 Add logging middleware
- [ ] 4.6 Test all endpoints work
- [ ] 4.7 Test health endpoint

### Phase 5: Plugin API Research (Day 4-5)

- [ ] 5.1 Research OpenCode plugin API
- [ ] 5.2 Research Claude Code plugin API
- [ ] 5.3 Update opencode plugin with real API
- [ ] 5.4 Update claude-code plugin with real API
- [ ] 5.5 Add graceful degradation for missing APIs
- [ ] 5.6 Test plugins work in editors

## Testing Strategy

### Unit Tests

- CLI command tests
- API endpoint tests
- Database operation tests
- Bug fix verification tests

### Integration Tests

- CLI → API integration
- Plugin → CLI integration
- Podman container management
- SQLite persistence

### Manual Tests

- Full installation flow
- Work order CRUD flow
- Squawk coordination flow
- Service start/stop flow

## Success Criteria

- [ ] All 12 bugs verified fixed
- [ ] npm install completes at root
- [ ] tsc compiles without errors in all workspaces
- [ ] fleet status runs without errors
- [ ] fleet services up/down work
- [ ] Squawk data persists across restarts
- [ ] Server API starts and responds
- [ ] Plugins work in editors
- [ ] TypeScript strict mode passes
- [ ] All tests pass

## Open Questions

- [ ] **OpenCode API**: What is the exact interface for showOutput and registerCommand?
- [ ] **Claude Code API**: What is @anthropic-ai/sdk Command class?
- [ ] **Zero Integration**: Should we use Rocicorp Zero or consider simpler sync options?
- [ ] **Cloudflare Access**: What token format to expect from Cloudflare?

## Dependencies

### Runtime Dependencies

- node >= 18.0.0
- better-sqlite3 >= 9.2.0
- express >= 4.18.0
- commander >= 12.0.0
- yaml >= 2.3.0
- uuid >= 9.0.0

### Development Dependencies

- typescript >= 5.3.0
- @types/node >= 20.10.0
- @types/express >= 4.17.0
- @types/better-sqlite3 >= 7.6.0
- @types/uuid >= 9.0.0
- tsx >= 4.6.0

## Files to Create/Modify

### New Files

- `/home/vitruvius/git/fleettools/package.json` (root)
- `/home/vitruvius/git/fleettools/cli/tsconfig.json`
- `/home/vitruvius/git/fleettools/squawk/package.json`
- `/home/vitruvius/git/fleettools/squawk/tsconfig.json`
- `/home/vitruvius/git/fleettools/squawk/src/db/schema.sql`
- `/home/vitruvius/git/fleettools/squawk/src/db/index.ts`
- `/home/vitruvius/git/fleettools/server/api/package.json`
- `/home/vitruvius/git/fleettools/server/api/tsconfig.json`
- `/home/vitruvius/git/fleettools/server/api/src/index.ts`
- `/home/vitruvius/git/fleettools/specs/fleettools-fixes/spec.md` (this file)

### Modified Files

- `/home/vitruvius/git/fleettools/cli/index.cjs` (bug fixes)
- `/home/vitruvius/git/fleettools/cli/package.json` (path fixes)
- `/home/vitruvius/git/fleettools/squawk/api/index.js` (bug fixes, persistence)
- `/home/vitruvius/git/fleettools/plugins/opencode/index.js` (bug fixes, API)
- `/home/vitruvius/git/fleettools/plugins/claude-code/index.js` (bug fixes, API)
- `/home/vitruvius/git/fleettools/flightline/api.js` (server integration)
- `/home/vitruvius/git/fleettools/tsconfig.json` (may be removed or updated)

### Removed Files (Optional)

- `/home/vitruvius/git/fleettools/cli/index.ts` (consolidate to .cjs)
- `/home/vitruvius/git/fleettools/server/api/index.js` (doesn't exist, referenced)

## Timeline Estimate

| Phase | Days | Effort |
|-------|------|--------|
| Phase 1: Critical Bugs | 1 | 2-4 hours |
| Phase 2: Build System | 1-2 | 4-8 hours |
| Phase 3: SQLite | 1-2 | 4-8 hours |
| Phase 4: Server | 1-2 | 4-8 hours |
| Phase 5: Plugins | 1-2 | 4-8 hours |
| **Total** | **5-9** | **18-36 hours** |

## Related Documentation

- `/home/vitruvius/git/fleettools/README.md` - Project overview
- `/home/vitruvius/git/fleettools/IMPLEMENTATION.md` - Architecture decisions
- `/home/vitruvius/git/fleettools/DEPLOYMENT.md` - VPS deployment
- `/home/vitruvius/git/fleettools/flightline/README.md` - Work tracking
- `/home/vitruvius/git/fleettools/squawk/README.md` - Coordination

---

**Status**: Ready for Planning
**Confidence**: 0.85
**Last Updated**: 2026-01-03
**Spec Version**: 1.0.0
