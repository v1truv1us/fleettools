# FleetTools Phase 1: CLI Service Management Specification

## Overview

This specification defines the implementation required to wire the existing `PodmanPostgresProvider` class to the FleetTools CLI service management commands. The CLI currently has placeholder `TODO` implementations for `fleet services up/down/logs` commands, while a fully functional provider exists at `providers/podman-postgres.ts` that is not connected. This phase completes the integration to enable developers to manage local Postgres containers via Podman.

## Context

### Current State

- **CLI Location**: `cli/index.ts`
- **Provider Location**: `providers/podman-postgres.ts`
- **Problem**: CLI service commands print "TODO" instead of calling the provider
- **Provider Status**: Complete implementation with `start()`, `stop()`, `logs()`, `status()` methods
- **Missing Import**: Provider file lacks `path` import required by `createPodmanPostgresProvider()`

### FleetTools Naming Convention

| SwarmTools Term | FleetTools Term |
|-----------------|-----------------|
| Hive | Flightline |
| Swarm Mail | Squawk |
| Coordinator | Dispatch |
| Workers | Specialists |
| Cells/Beads | Sorties |
| Epics | Missions |
| File Reservations | CTK (Consolidated Tool Kit) |
| Patterns | Tech Orders |

## User Stories

### US-001: Start Local Services

**As a** developer setting up FleetTools locally  
**I want** to run `fleet services up` to start the Postgres container  
**So that** I can use FleetTools with a local database

#### Acceptance Criteria

- [ ] Running `fleet services up` starts a Podman container named `fleettools-pg`
- [ ] Container uses `postgres:16` image
- [ ] Container exposes port 5432 on localhost
- [ ] Container uses persistent volume `fleettools-pg-data`
- [ ] Command waits for Postgres to be ready before returning
- [ ] Success message displays connection information
- [ ] If container already exists, it starts the existing container
- [ ] If Podman is not installed, displays actionable error message

#### Example Output (Success)

```
Starting FleetTools services...
Starting Postgres via Podman...
Starting new container: fleettools-pg
Waiting for Postgres to be ready... (0/30)
Waiting for Postgres to be ready... (1/30)
✓ Postgres is ready
✓ Postgres started and ready
  Connection: localhost:5432
  Container: fleettools-pg

Services started.
Connection info:
  Postgres: localhost:5432

Run: fleet services status for details
```

#### Example Output (Podman Not Installed)

```
Starting FleetTools services...
Error: Podman is not installed or not in PATH

To install Podman:
  macOS:   brew install podman
  Linux:   sudo apt install podman  (or dnf/pacman)
  Windows: https://podman.io/getting-started/installation

Run: fleet doctor  for more diagnostics
```

---

### US-002: Stop Local Services

**As a** developer finished working with FleetTools  
**I want** to run `fleet services down` to stop the Postgres container  
**So that** I can free up system resources

#### Acceptance Criteria

- [ ] Running `fleet services down` stops the `fleettools-pg` container
- [ ] Container is stopped gracefully (not removed)
- [ ] Data persists in the volume for next startup
- [ ] Success message confirms container stopped
- [ ] If container is not running, displays informative message
- [ ] If Podman is not installed, displays actionable error message

#### Example Output (Success)

```
Stopping FleetTools services...
Stopping Postgres container...
✓ Postgres container stopped

Services stopped.
```

#### Example Output (Not Running)

```
Stopping FleetTools services...
Container is not running

Services stopped.
```

---

### US-003: View Service Logs

**As a** developer debugging FleetTools  
**I want** to run `fleet services logs` to view Postgres container logs  
**So that** I can diagnose database issues

#### Acceptance Criteria

- [ ] Running `fleet services logs` displays last 100 lines of container logs
- [ ] Optional `--tail <n>` flag to specify number of lines
- [ ] If container does not exist, displays informative message
- [ ] Logs are displayed in real-time format with timestamps
- [ ] If Podman is not installed, displays actionable error message

#### Example Output (Success)

```
Fetching logs for service: postgres

2026-01-04 12:00:00.000 UTC [1] LOG:  starting PostgreSQL 16.1
2026-01-04 12:00:00.100 UTC [1] LOG:  listening on IPv4 address "0.0.0.0", port 5432
2026-01-04 12:00:00.200 UTC [1] LOG:  database system is ready to accept connections
...
```

#### Example Output (Container Not Found)

```
Fetching logs for service: postgres
Container not found

Run: fleet services up  to start services
```

---

### US-004: Check Service Status

**As a** developer checking FleetTools state  
**I want** to run `fleet services status` to see container status  
**So that** I can verify services are running correctly

#### Acceptance Criteria

- [ ] Running `fleet services status` displays current container state
- [ ] Shows running/stopped status with visual indicator
- [ ] Shows container image and version
- [ ] Shows exposed port
- [ ] Shows Postgres version if running
- [ ] If Podman is not installed, displays warning but continues

#### Example Output (Running)

```
FleetTools Services Status
========================

Postgres:
  Status: ✓ Running
  Provider: podman
  Image: postgres:16
  Version: 16.1
  Port: 5432
  Container: fleettools-pg

Zero (sync): Not enabled (mode = local)
```

#### Example Output (Stopped)

```
FleetTools Services Status
========================

Postgres:
  Status: ✗ Not running
  Provider: podman
  Image: postgres:16
  Port: 5432

Zero (sync): Not enabled (mode = local)
```

---

## Technical Requirements

### TR-001: Fix Missing `path` Import in Provider

**File**: `providers/podman-postgres.ts`  
**Line**: 306

**Current Code**:
```typescript
dataDir: config.dataDir || path.join(process.env.HOME || '', '.local', 'share', 'fleet', 'postgres'),
```

**Problem**: `path` module is not imported, causing `ReferenceError: path is not defined`

**Required Change**:
```typescript
import { spawn } from 'node:child_process';
import path from 'node:path';  // ADD THIS LINE
```

---

### TR-002: Import PodmanPostgresProvider into CLI

**File**: `cli/index.ts`  
**Location**: After existing imports (line 15)

**Required Addition**:
```typescript
import { createPodmanPostgresProvider, PodmanPostgresProvider } from '../providers/podman-postgres.js';
```

---

### TR-003: Wire `servicesUpSync()` to Provider

**File**: `cli/index.ts`  
**Function**: `servicesUpSync()` (lines 361-385)

**Current Implementation**:
```typescript
function servicesUpSync(): void {
  console.log('Starting FleetTools services...');
  const config = loadConfigSync();

  if (config.services?.postgres?.enabled) {
    const podmanAvailable = checkPodmanSync();
    if (!podmanAvailable) {
      console.error('Podman is not available. Cannot start Postgres.');
      return;
    }

    console.log('Starting Postgres via Podman...');
    console.log('  (Implementation: Podman container start - TODO)');  // <-- TODO
    console.log('  Container: fleettools-pg');
    console.log('  Image: postgres:16');
    console.log('  Port: 5432');
  }

  console.log('');
  console.log('Services started.');
  console.log('Connection info:');
  console.log('  Postgres: localhost:5432');
  console.log('');
  console.log('Run: fleet services status for details');
}
```

**Required Implementation**:
```typescript
async function servicesUp(): Promise<void> {
  console.log('Starting FleetTools services...');
  const config = loadConfigSync();

  if (config.services?.postgres?.enabled) {
    const podmanAvailable = checkPodmanSync();
    if (!podmanAvailable) {
      console.error('Error: Podman is not installed or not in PATH');
      console.error('');
      console.error('To install Podman:');
      console.error('  macOS:   brew install podman');
      console.error('  Linux:   sudo apt install podman  (or dnf/pacman)');
      console.error('  Windows: https://podman.io/getting-started/installation');
      console.error('');
      console.error('Run: fleet doctor  for more diagnostics');
      process.exit(1);
    }

    const provider = createPodmanPostgresProvider({
      port: config.services.postgres.port || 5432,
    });

    try {
      await provider.start();
    } catch (error) {
      console.error(`Failed to start Postgres: ${(error as Error).message}`);
      process.exit(1);
    }
  }

  console.log('');
  console.log('Services started.');
  console.log('Connection info:');
  console.log('  Postgres: localhost:5432');
  console.log('');
  console.log('Run: fleet services status for details');
}
```

---

### TR-004: Wire `servicesDownSync()` to Provider

**File**: `cli/index.ts`  
**Function**: `servicesDownSync()` (lines 387-405)

**Current Implementation**:
```typescript
function servicesDownSync(): void {
  console.log('Stopping FleetTools services...');
  const config = loadConfigSync();

  if (config.services?.postgres?.enabled) {
    const podmanAvailable = checkPodmanSync();
    if (!podmanAvailable) {
      console.log('Postgres is not managed by Podman.');
      return;
    }

    console.log('Stopping Postgres container...');
    console.log('  (Implementation: Podman container stop - TODO)');  // <-- TODO
    console.log('  ✓ Stopped');
  }

  console.log('');
  console.log('Services stopped.');
}
```

**Required Implementation**:
```typescript
async function servicesDown(): Promise<void> {
  console.log('Stopping FleetTools services...');
  const config = loadConfigSync();

  if (config.services?.postgres?.enabled) {
    const podmanAvailable = checkPodmanSync();
    if (!podmanAvailable) {
      console.error('Error: Podman is not installed or not in PATH');
      process.exit(1);
    }

    const provider = createPodmanPostgresProvider({
      port: config.services.postgres.port || 5432,
    });

    try {
      await provider.stop();
    } catch (error) {
      console.error(`Failed to stop Postgres: ${(error as Error).message}`);
      process.exit(1);
    }
  }

  console.log('');
  console.log('Services stopped.');
}
```

---

### TR-005: Wire `servicesLogsSync()` to Provider

**File**: `cli/index.ts`  
**Function**: `servicesLogsSync()` (lines 439-442)

**Current Implementation**:
```typescript
function servicesLogsSync(service: string): void {
  console.log(`Fetching logs for service: ${service}`);
  console.log('  (Log fetching not implemented yet)');
}
```

**Required Implementation**:
```typescript
async function servicesLogs(service: string, tail: number = 100): Promise<void> {
  console.log(`Fetching logs for service: ${service}`);
  console.log('');

  if (service === 'postgres' || service === 'pg') {
    const config = loadConfigSync();
    const provider = createPodmanPostgresProvider({
      port: config.services?.postgres?.port || 5432,
    });

    try {
      const logs = await provider.logs(tail);
      console.log(logs);
    } catch (error) {
      console.error(`Failed to fetch logs: ${(error as Error).message}`);
      console.error('');
      console.error('Run: fleet services up  to start services');
      process.exit(1);
    }
  } else {
    console.error(`Unknown service: ${service}`);
    console.error('Available services: postgres');
    process.exit(1);
  }
}
```

---

### TR-006: Enhance `servicesStatusSync()` with Provider Status

**File**: `cli/index.ts`  
**Function**: `servicesStatusSync()` (lines 407-437)

**Required Enhancement**:
```typescript
async function servicesStatus(): Promise<void> {
  console.log('FleetTools Services Status');
  console.log('========================');
  console.log('');

  const config = loadConfigSync();

  if (config.services?.postgres?.enabled) {
    const provider = createPodmanPostgresProvider({
      port: config.services.postgres.port || 5432,
    });

    try {
      const status = await provider.status();
      console.log('Postgres:');
      console.log(`  Status: ${status.running ? '✓ Running' : '✗ Not running'}`);
      console.log(`  Provider: ${config.services.postgres.provider}`);
      console.log(`  Image: ${status.image}`);
      if (status.running && status.version) {
        console.log(`  Version: ${status.version}`);
      }
      console.log(`  Port: ${status.port}`);
      if (status.containerId) {
        console.log(`  Container: ${status.containerId}`);
      }
    } catch (error) {
      console.log('Postgres:');
      console.log('  Status: ✗ Error checking status');
      console.log(`  Error: ${(error as Error).message}`);
    }
  } else {
    console.log('Postgres: Not enabled in config');
  }

  console.log('');

  const mode = getCurrentModeSync();
  if (mode === 'synced') {
    console.log('Zero (sync):');
    console.log(`  Status: ${config.sync?.zero?.url ? '✓ Connected' : '✗ Not connected'}`);
    if (config.sync?.zero?.url) {
      console.log(`  URL: ${config.sync.zero.url}`);
    }
  } else {
    console.log('Zero (sync): Not enabled (mode = local)');
  }
}
```

---

### TR-007: Update Command Handler for Async Functions

**File**: `cli/index.ts`  
**Location**: Services command action (lines 280-301)

**Current Implementation**:
```typescript
.action(async (options) => {
  if (options.up) {
    servicesUpSync();
  } else if (options.down) {
    servicesDownSync();
  } else if (options.status) {
    servicesStatusSync();
  } else if (options.logs) {
    const service = (options as any).logs || 'postgres';
    servicesLogsSync(service);
  }
  // ...
});
```

**Required Implementation**:
```typescript
.action(async (options) => {
  if (options.up) {
    await servicesUp();
  } else if (options.down) {
    await servicesDown();
  } else if (options.status) {
    await servicesStatus();
  } else if (options.logs) {
    const service = typeof options.logs === 'string' ? options.logs : 'postgres';
    await servicesLogs(service);
  }
  // ...
});
```

---

## Non-Functional Requirements

### NFR-001: Error Handling for Podman Not Installed

**Requirement**: When Podman is not installed or not in PATH, all service commands must:
- Display a clear error message explaining the problem
- Provide installation instructions for macOS, Linux, and Windows
- Suggest running `fleet doctor` for additional diagnostics
- Exit with non-zero status code

**Implementation**: Check `checkPodmanSync()` before any provider operations

---

### NFR-002: Error Handling for Container Already Running

**Requirement**: When attempting to start an already-running container:
- The provider should detect the existing container
- Start the existing container instead of creating a new one
- Display appropriate message indicating container was started

**Implementation**: Already handled by `PodmanPostgresProvider.start()` via `containerExists()` check

---

### NFR-003: Timeout Handling for Container Startup

**Requirement**: Container startup must:
- Wait for Postgres to be ready (accepting connections)
- Timeout after 60 seconds (30 attempts × 2 second intervals)
- Display progress messages during wait
- Throw descriptive error if timeout exceeded

**Implementation**: Already handled by `PodmanPostgresProvider.waitForReady()` with configurable `maxAttempts` and `interval`

---

### NFR-004: Graceful Degradation

**Requirement**: Service status command should:
- Work even if Podman is not installed (show warning, continue)
- Handle container inspection failures gracefully
- Never crash with unhandled exceptions

---

### NFR-005: Performance

**Requirement**: 
- `fleet services status` should complete within 2 seconds
- `fleet services up` should complete within 90 seconds (including image pull)
- `fleet services down` should complete within 10 seconds
- `fleet services logs` should complete within 5 seconds

---

## Success Criteria

### Functional Verification

- [ ] `fleet services up` starts Postgres container successfully
- [ ] `fleet services up` (when already running) starts existing container
- [ ] `fleet services down` stops running container
- [ ] `fleet services down` (when not running) displays informative message
- [ ] `fleet services logs` displays container logs
- [ ] `fleet services logs` (when container missing) displays error with guidance
- [ ] `fleet services status` shows running state correctly
- [ ] `fleet services status` shows stopped state correctly

### Error Handling Verification

- [ ] All commands display helpful error when Podman not installed
- [ ] Startup timeout displays clear error message
- [ ] Container creation failure displays actionable error

### Integration Verification

- [ ] Provider `path` import fix allows factory function to work
- [ ] CLI correctly imports and instantiates provider
- [ ] Async/await properly propagates through command handlers

---

## Files to Modify

### Primary Files

| File | Changes Required |
|------|------------------|
| `providers/podman-postgres.ts` | Add missing `path` import (line 7) |
| `cli/index.ts` | Import provider, wire up all service functions |

### Detailed Changes

#### `providers/podman-postgres.ts`

```diff
  import { spawn } from 'node:child_process';
+ import path from 'node:path';
```

#### `cli/index.ts`

1. **Add import** (after line 15):
```typescript
import { createPodmanPostgresProvider } from '../providers/podman-postgres.js';
```

2. **Replace `servicesUpSync()`** with async `servicesUp()`

3. **Replace `servicesDownSync()`** with async `servicesDown()`

4. **Replace `servicesLogsSync()`** with async `servicesLogs()`

5. **Replace `servicesStatusSync()`** with async `servicesStatus()`

6. **Update command action** to use await

---

## Testing Strategy

### Manual Testing Checklist

```bash
# Prerequisite: Ensure Podman is installed
podman --version

# Test 1: Start services
fleet services up
# Expected: Container starts, ready message displayed

# Test 2: Check status (running)
fleet services status
# Expected: Shows "✓ Running" with version info

# Test 3: View logs
fleet services logs
# Expected: Shows Postgres startup logs

# Test 4: Stop services
fleet services down
# Expected: Container stops gracefully

# Test 5: Check status (stopped)
fleet services status
# Expected: Shows "✗ Not running"

# Test 6: Start again (existing container)
fleet services up
# Expected: Starts existing container, not new one

# Test 7: Error handling (uninstall Podman temporarily)
# Expected: Clear error message with installation instructions
```

### Automated Test Cases

```typescript
// tests/integration/cli/services.test.ts

describe('fleet services', () => {
  describe('up', () => {
    it('should start postgres container when podman available');
    it('should display error when podman not installed');
    it('should start existing container if already created');
    it('should wait for postgres to be ready');
    it('should timeout after 60 seconds');
  });

  describe('down', () => {
    it('should stop running container');
    it('should handle already stopped container');
    it('should display error when podman not installed');
  });

  describe('logs', () => {
    it('should display container logs');
    it('should respect --tail flag');
    it('should handle missing container');
  });

  describe('status', () => {
    it('should show running status with version');
    it('should show stopped status');
    it('should handle podman not installed gracefully');
  });
});
```

---

## Implementation Notes

### Async/Await Considerations

The existing CLI uses synchronous functions (`servicesUpSync`, etc.) but the `PodmanPostgresProvider` uses async methods. The implementation must:

1. Convert sync functions to async
2. Update command action handlers to await
3. Ensure proper error propagation with try/catch
4. Use `process.exit(1)` for error conditions

### Provider Configuration

The `createPodmanPostgresProvider()` factory accepts:
```typescript
{
  port?: number;      // Default: 5432
  dataDir?: string;   // Default: ~/.local/share/fleet/postgres
}
```

The CLI should pass configuration from `loadConfigSync().services.postgres`:
```typescript
const provider = createPodmanPostgresProvider({
  port: config.services?.postgres?.port || 5432,
});
```

### macOS Podman Machine

On macOS, Podman requires a VM (podman machine). The provider already handles this:
```typescript
if (platform === 'darwin') {
  const machineRunning = await this.checkPodmanMachine();
  if (!machineRunning) {
    console.log('Starting podman machine for macOS...');
    await this.exec('podman', ['machine', 'start']);
  }
}
```

---

## Timeline Estimate

| Task | Effort |
|------|--------|
| Fix `path` import in provider | 5 minutes |
| Add provider import to CLI | 5 minutes |
| Implement `servicesUp()` | 30 minutes |
| Implement `servicesDown()` | 15 minutes |
| Implement `servicesLogs()` | 15 minutes |
| Enhance `servicesStatus()` | 20 minutes |
| Update command handlers | 10 minutes |
| Manual testing | 30 minutes |
| **Total** | **~2 hours** |

---

## Related Documentation

- `README.md` - Project overview and CLI usage
- `providers/podman-postgres.ts` - Provider implementation details
- `specs/fleettools-fixes/spec.md` - Original specification (US-004)
- `DEPLOYMENT.md` - VPS deployment (uses same Postgres setup)

---

**Status**: Ready for Implementation  
**Confidence**: 0.95  
**Last Updated**: 2026-01-04  
**Spec Version**: 1.0.0
