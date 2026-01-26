# Silent Failure Prevention Guide

## What Happened: The Silent Subprocess Death

The Ralph loop was failing with `ConnectionRefused` errors that were **impossible to debug** because the actual failure happened silently in a subprocess.

### The Silent Death Chain

```
E2E Test spawns server subprocess
         ↓
Server calls startServer()
         ↓
initializeDatabase() called
         ↓
Tries to write to ~/.local/share/fleet/
         ↓
FAILS: Read-only filesystem (EROFS)
         ↓
Error swallowed by stdio: 'pipe' with no handlers
         ↓
Process exits silently
         ↓
Test waits 2 seconds
         ↓
Tries to connect to localhost:3016
         ↓
Connection refused (server never started)
         ↓
Test fails, no idea why
```

### Why It Was Silent

The subprocess was spawned with:
```typescript
spawn('bun', ['server/api/src/index.ts'], {
  stdio: 'pipe'  // ← Captures output but no handlers!
})
```

This captures stdout/stderr but **sends it to /dev/null** if there are no event listeners. The error information was lost.

---

## What Was Changed

### 1. Database Path Selection (squawk/src/db/index.ts)

**Problem**: Always tried `~/.local/share/fleet/squawk.db` with no fallback

**Solution**: Smart fallback chain with logging:
```
Try ~/.local/share/fleet/squawk.db
  ↓ (fails, log reason)
Try /tmp/fleet/squawk-{pid}.db
  ↓ (fails, log reason)
Use :memory: (log why)
```

Each step logs:
- What path is being tried
- Why it failed (exact error)
- What the next fallback is

### 2. Server Initialization Logging (server/api/src/index.ts)

**Added**: Startup phase logging with status indicators

```
[Startup] Initializing database...
[Startup] ✓ Squawk database initialized
[Startup] Registering API routes...
[Startup] ✓ Routes registered
[Startup] Starting Bun server on port 3001...
FleetTools Consolidated API server listening on port 3001
```

### 3. E2E Test Output Capture (server/api/e2e-integration.test.ts)

**Added**: Event listeners for subprocess streams

```typescript
serverProcess.stderr?.on('data', (data) => {
  console.error('[Server stderr]', data.toString());
});

serverProcess.stdout?.on('data', (data) => {
  console.log('[Server stdout]', data.toString());
});

serverProcess.on('exit', (code) => {
  if (!serverStarted) {
    console.error(`[Server] Process exited with code ${code}`);
    throw new Error(`Server failed to start on port ${apiPort}`);
  }
});
```

**Added**: Startup verification
- Wait up to 10 seconds for server to bind
- Verify with health check
- Fail explicitly if timeout
- Include all startup errors in test failure message

---

## How to Detect Future Silent Failures

### Red Flags in Code

1. **`spawn()` with `stdio: 'pipe'` but no listeners**
   - Bad: `spawn(..., { stdio: 'pipe' })`
   - Good: Add `stdout.on('data', ...)` and `stderr.on('data', ...)`

2. **`process.exit(1)` in try/catch swallowed**
   - Problem: Error gets logged to stderr but not captured
   - Solution: Log to console before exit

3. **Subprocess should output something but doesn't**
   - Problem: No confirmation it started
   - Solution: Log startup milestones

4. **Tests that wait then timeout**
   - Problem: "Connection refused" is often subprocess failure
   - Solution: Capture subprocess output to see why

### Diagnostic Questions

When tests fail mysteriously:

1. **Is the subprocess actually running?**
   - Check if port is in use: `lsof -i :PORT`
   - Check subprocess output for startup messages

2. **Did it try to write to filesystem?**
   - Check permissions: `ls -la ~/.local/share/fleet/`
   - Check filesystem type: `df ~/.local/share/`
   - Try creating test file: `touch ~/.local/share/fleet/test`

3. **What's the error?**
   - Capture stderr from subprocess
   - Look for "unable to open", "permission denied", "read-only"

4. **When did it fail?**
   - Add startup phase logging (what we did here)
   - Binary search: add logs at each major step

---

## The Actual Root Cause: Read-Only Filesystem

The test environment had a read-only filesystem at `~/.local/share/`. This is common in:
- Docker containers with restricted filesystem
- CI/CD environments with custom mounts
- Sandboxed test environments
- Development machines with specific filesystem configurations

### How the Fix Works

The database initialization now:
1. **Detects** when the preferred path isn't writable by testing write access
2. **Falls back** to `/tmp` which is almost always writable
3. **Falls back** to `:memory:` if even `/tmp` fails
4. **Logs** the exact reason and path selected

This allows the server to start successfully in **any** environment:
- Production: Uses persistent database
- Test: Uses `/tmp` (ephemeral per-test)
- Sandboxed: Uses in-memory (fast, isolated)

---

## Why This Pattern Applies Beyond This Bug

Silent subprocess failures are common because:

1. **stdout/stderr is buffered** - You might see nothing until process ends
2. **Piped I/O requires listeners** - Default behavior is discard
3. **Error handling gets complex** - Try/catch in subprocess doesn't propagate well
4. **Tests often timeout** - Confusing symptom of startup failure

### General Pattern for Spawned Processes

```typescript
const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });

let startupError = '';
proc.stderr?.on('data', (data) => {
  const text = data.toString();
  startupError += text;
  console.error('[Subprocess stderr]', text);
});

proc.stdout?.on('data', (data) => {
  console.log('[Subprocess stdout]', data.toString());
});

proc.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Subprocess failed with code ${code}: ${startupError}`);
  }
});

// Verify process actually started (e.g., port listening)
// Don't assume stdio presence means startup success
```

---

## Testing the Fix

Run the E2E tests now:
```bash
bun test server/api/e2e-integration.test.ts
```

You'll see:
- Server startup sequence in logs
- Database path selection and reasoning
- Clear indication of any failures
- Actual test output (not hidden failures)

---

## Lessons Learned

1. **Always listen to subprocess output** - Piped I/O needs handlers
2. **Add logging at phase boundaries** - Know when each step completes
3. **Implement graceful fallbacks** - Don't assume environment is perfect
4. **Fail explicitly** - Turn silent failures into visible errors
5. **Test in multiple environments** - Read-only filesystems expose fragile code

---

## Future Improvements

Consider adding:
- Structured logging (JSON format for parsing)
- Health check monitoring in production
- Database migration validation
- Startup time metrics
- Environment capability detection

---

## Related Files

- `squawk/src/db/index.ts` - Database path selection
- `server/api/src/index.ts` - Server startup logging
- `server/api/e2e-integration.test.ts` - Test process monitoring
- `RALPH_FAILURE_ANALYSIS.md` - Original failure investigation
