# Ralph Loop Failure Analysis - The Real Root Cause

## What Actually Happened

The Ralph loop test gate was failing with `ConnectionRefused` errors. I traced through the full stack to find **the actual root cause**:

```
error: Unable to connect. Is the computer able to access the url?
path: "http://localhost:3016/health"
code: "ConnectionRefused"
```

## The Real Problem: Read-Only Filesystem

**The API server subprocess was dying silently during startup.**

When the E2E test tried to spawn the server:
```typescript
spawn('bun', ['server/api/src/index.ts'], {
  env: { ...process.env, PORT: apiPort.toString() },
  stdio: 'pipe'  // ← This hides errors!
})
```

The server initialization chain was:
1. `startServer()` called
2. `initializeDatabase()` called
3. Database tried to create `/home/vitruvius/.local/share/fleet/squawk.db`
4. **FAILED**: `SQLiteError: unable to open database file (errno: 14, code: SQLITE_CANTOPEN)`
5. Root cause: `Read-only file system`
6. Error was silently swallowed by `stdio: 'pipe'`
7. Process exited
8. Test waited 2 seconds then tried to connect
9. Connection refused because server never started

## Why This Happened

The environment has a read-only filesystem at `~/.local/share/`. When the database tried to:
1. Create the directory: `fs.mkdirSync(dbDir, { recursive: true })` → Failed silently in try/catch
2. Create the file: `new Database(dbPath)` → Threw SQLITE_CANTOPEN error
3. The subprocess died before the server could call `Bun.serve()`

The E2E test couldn't see this because stderr/stdout were piped away with no handlers.

## The Fix Applied

**Commit 619f517**: Added intelligent fallback logic to `getSqliteDbPath()`:

```typescript
function getSqliteDbPath(): string {
  // 1. Try preferred path (~/.local/share/fleet/squawk.db)
  // 2. Test write access by creating/deleting a temp file
  // 3. If fails, fall back to /tmp/fleet/squawk-{pid}.db
  // 4. If /tmp also fails, use :memory: in-memory database
  // 5. Log which path was selected
}
```

## Verification

After the fix, the server now starts successfully:

```
[Database] Neither preferred nor temporary paths are writable, using in-memory database
SQLite database initialized: :memory:
Squawk database initialized
FleetTools Consolidated API server listening on port 9999
Health check: http://localhost:9999/health
```

The E2E tests now connect and run (though they have assertion issues, but that's different).

## Why My Initial Analysis Was Wrong

I initially focused on:
- CLI path being wrong (`./cli/index.ts`)
- CLI not checking environment variables
- Test infrastructure misalignment

These issues exist but were **secondary** - they couldn't even be tested because the server never started. The test was failing before it even got to run the CLI.

## Impact on Ralph Loop

**Before**: Test gate fails immediately with zero output
- Server subprocess dies before starting
- E2E tests can't run
- Connection refused after 2 second wait
- Loop gets stuck

**After**: Test gate can now run
- Server starts with fallback database
- E2E tests execute and validate integration
- Loop can iterate through test failures
- Proper test output gives Ralph loop context for improvements

## The Lesson

When debugging test failures in isolated environments:
1. **Verify subprocess actually starts** - Don't assume it did
2. **Check filesystem permissions** - Common in container/test environments
3. **Capture stderr from spawned processes** - Errors can be silent
4. **Add fallback logic for paths** - Test environments often have unusual constraints
5. **Log what actually happens** - Silent failures are debugging nightmares

Ralph loop will now be able to make actual progress instead of getting stuck on subprocess startup failure.
