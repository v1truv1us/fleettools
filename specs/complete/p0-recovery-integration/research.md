# Technical Research & Decisions - P0 Recovery Integration

## Overview

This document captures technical research findings and design decisions made during P0 Recovery Integration planning. Each decision includes rationale, alternatives considered, and trade-offs.

## Decision Log

### D001: SQLite Migration Approach

**Context**: FleetTools currently uses legacy JSON file-based persistence (`squawk.json`) with periodic in-memory saves. Phase 2 implemented `SQLiteAdapter` with `EventOps`, but other operations are stubs.

**Decision**: Create wrapper layer in `squawk/src/db/index.ts` that delegates to `SQLiteAdapter` while maintaining backward compatibility with existing API signatures.

**Rationale**:
1. **Backward Compatibility**: Existing code imports from `squawk/src/db/index.ts` and expects specific function signatures (`mailboxOps`, `eventOps`, `cursorOps`, `lockOps`). Wrapper maintains these exports.
2. **Incremental Migration**: Can migrate one operation at a time without breaking existing tests.
3. **Clear Separation**: Wrapper separates migration logic from SQLiteAdapter implementation.
4. **Testability**: Wrapper functions can be tested independently of SQLiteAdapter.

**Alternatives Considered**:
- **A. Replace `squawk/src/db/index.ts` entirely with SQLiteAdapter**:
  - **Pros**: Simpler, fewer layers
  - **Cons**: Breaking change to all imports, requires updating 19 existing tests
  - **Verdict**: Too risky for P0 critical blocker

- **B. Extend SQLiteAdapter with legacy wrapper methods**:
  - **Pros**: Single adapter implementation
  - **Cons**: SQLiteAdapter becomes bloated with legacy methods
  - **Verdict**: Violates single responsibility principle

- **C. Adapter pattern with legacy and modern implementations**:
  - **Pros**: Clean separation, can switch implementations
  - **Cons**: Over-engineering for one-time migration
  - **Verdict**: Not necessary for P0

**Trade-offs**:
- **Performance**: Wrapper adds indirection (negligible for current volume)
- **Maintenance**: Two layers to maintain (acceptable during migration period)
- **Complexity**: Wrapper logic for backward compatibility (offset by clear interface)

**Reference**: Spec US-P0-001 AC-6 (All existing API tests pass without modification)

---

### D002: JSON to SQLite Migration Strategy

**Context**: Existing users may have data in `~/.local/share/fleet/squawk.json` with nested structure: `{ mailboxes, events, cursors, locks }`.

**Decision**: Implement one-time migration on first run that:
1. Detects legacy JSON file
2. Parses and validates structure
3. Migrates each entity type to SQLite tables
4. Validates counts before and after
5. Renames JSON to `.backup` on success
6. Keeps `.backup` file indefinitely

**Rationale**:
1. **Safety**: Keep original file until migration succeeds
2. **Validation**: Compare counts before/after to detect data loss
3. **Rollback**: `.backup` file allows manual rollback if needed
4. **Indefinite Retention**: Users may need to inspect old data

**Alternatives Considered**:
- **A. Delete JSON file after migration**:
  - **Pros**: Cleaner file system
  - **Cons**: No rollback path
  - **Verdict**: Too risky for user data

- **B. Migrate in batches**:
  - **Pros**: Can pause/resume migration
  - **Pros**: Better progress feedback
  - **Cons**: Complex to implement
  - **Cons**: Inconsistent state during migration
  - **Verdict**: Over-engineering for < 10K typical events

- **C. Parallel migration**:
  - **Pros**: Faster for large datasets
  - **Cons**: Complex coordination
  - **Cons**: Not needed for typical FleetTools usage
  - **Verdict**: Unnecessary complexity

**Trade-offs**:
- **Time**: One-time migration takes < 1s for typical data (acceptable)
- **Space**: Keeps backup file (negligible storage cost)
- **User Experience**: First run delay (acceptable for one-time cost)

**Reference**: Spec US-P0-001 AC-4 (Data migration path exists for existing JSON data), AC-6 (Old JSON file renamed to `.backup` after successful migration)

---

### D003: Recovery Detection Algorithm

**Context**: Need to detect when context compaction occurs (agent died, context window exceeded, etc.) and prompt user for recovery.

**Decision**: Implement inactivity-based detection:
1. Query all missions with `status = 'in_progress'`
2. Get latest event for each mission
3. Calculate inactivity duration: `now - latest_event.occurred_at`
4. If inactivity > threshold (default: 5 minutes), add to recovery candidates
5. Check for checkpoint existence for each candidate

**Rationale**:
1. **Simplicity**: No complex state tracking
2. **Reliable**: Event log is source of truth
3. **Configurable**: Threshold can be adjusted via environment variable
4. **Non-intrusive**: Doesn't require agent instrumentation

**Alternatives Considered**:
- **A. Agent heartbeat mechanism**:
  - **Pros**: Real-time detection
  - **Pros**: Detects immediate crashes
  - **Cons**: Requires agent modifications
  - **Cons**: Additional complexity (heartbeat service)
  - **Cons**: False positives if network issues
  - **Verdict**: Over-engineering for P0

- **B. Context window monitoring**:
  - **Pros**: Direct detection of compaction
  - **Pros**: No waiting required
  - **Cons**: Requires LLM provider API access
  - **Cons**: Provider-specific implementation
  - **Cons**: Not all providers expose this data
  - **Verdict**: Too complex and provider-dependent

- **C. File lock expiration**:
  - **Pros**: Uses existing lock timeout mechanism
  - **Pros**: No additional tracking
  - **Cons**: False positives (expired locks ≠ context compaction)
  - **Cons**: No recovery guidance
  - **Verdict**: Insufficient for recovery needs

**Trade-offs**:
- **Detection Delay**: 5-minute minimum delay (acceptable for recovery workflow)
- **False Positives**: Could detect active missions with no events (mitigated by configurable threshold)
- **False Negatives**: Agent alive but stuck in loop (acceptable for P0)

**Reference**: Spec US-P0-002 AC-3 (Activity threshold: no events in last 5 minutes)

---

### D004: State Restoration Strategy

**Context**: Need to restore mission state from checkpoint including sorties, locks, messages, and recovery context.

**Decision**: Implement transactional restoration with:
1. **Transaction Wrapper**: All operations in `BEGIN/COMMIT/ROLLBACK`
2. **Sortie Restoration**: Update sortie records with checkpoint state
3. **Lock Re-acquisition**: Attempt to acquire locks, handle conflicts/expirations
4. **Message Requeue**: Reset pending messages to `pending` status
5. **Checkpoint Marking**: Set `consumed_at` timestamp
6. **Event Emission**: Emit `fleet_recovered` event with stats

**Rationale**:
1. **Atomicity**: Transaction ensures all-or-nothing restoration
2. **Error Recovery**: Rollback on partial failure
3. **Data Integrity**: Maintains database constraints
4. **Audit Trail**: Event provides recovery history

**Alternatives Considered**:
- **A. Non-transactional restoration**:
  - **Pros**: Simpler implementation
  - **Cons**: Partial restoration leaves inconsistent state
  - **Cons**: Hard to diagnose failures
  - **Verdict**: Unacceptable for user data

- **B. Delete and recreate records**:
  - **Pros**: Simpler update logic
  - **Cons**: Loses audit trail (created_at, updated_at)
  - **Cons**: Breaks foreign key relationships
  - **Verdict**: Violates data integrity principles

- **C. Checkpoint-based branching**:
  - **Pros**: Keep multiple restored versions
  - **Pros**: Easy to undo restoration
  - **Cons**: Complex schema changes
  - **Cons**: Storage overhead
  - **Cons**: Git-style branching overkill
  - **Verdict**: Future enhancement, not P0

**Trade-offs**:
- **Complexity**: Transaction logic adds complexity (mitigated by SQLite transaction support)
- **Lock Conflicts**: Manual conflict resolution required (documented in user guide)
- **Performance**: Transaction overhead (acceptable for single operation)

**Reference**: Spec US-P0-003 AC-9 (Transaction rollback on partial failure)

---

### D005: Lock Conflict Resolution

**Context**: During recovery, locks may be held by other agents or have expired.

**Decision**: Default to safe behavior with override option:
1. **Default**: Add conflicts to `recovery_context.blockers`
2. **Force Option**: `--force-locks` flag forces release of conflicting locks
3. **User Confirmation**: Always prompt before force-release (unless `--yes`)
4. **Logging**: Clear error messages for conflicts

**Rationale**:
1. **Safety First**: Default prevents data corruption from concurrent modifications
2. **User Control**: Explicit flag makes override intentional
3. **Transparency**: Clear prompts and error messages
4. **Audit Trail**: Blockers documented in recovery context

**Alternatives Considered**:
- **A. Always force-release conflicts**:
  - **Pros**: Simpler restoration
  - **Cons**: High risk of data corruption
  - **Cons**: Overwrites other agent's work
  - **Verdict**: Dangerous default

- **B. Skip conflicting locks**:
  - **Pros**: No data corruption risk
  - **Cons**: Inconsistent restored state
  - **Cons**: User may not notice missing locks
  - **Verdict**: Insufficient error handling

- **C. Negotiated resolution**:
  - **Pros**: Collaborative approach
  - **Pros**: No data loss
  - **Cons**: Requires agent-to-agent communication
  - **Cons**: Complex to implement
  - **Verdict**: Over-engineering for P0

**Trade-offs**:
- **User Friction**: Default requires manual intervention (acceptable for safety)
- **Complexity**: Force-release logic (necessary for recovery)
- **Risk**: Force-release can corrupt data (documented and requires confirmation)

**Reference**: Spec US-P0-003 AC-8 (Lock conflicts added to recovery_context.blockers)

---

### D006: CLI Command Structure

**Context**: Need to add checkpoint, resume, and checkpoints commands to CLI. Existing CLI has flat command structure (`fleet status`, `fleet setup`, etc.).

**Decision**: Top-level flat commands with no subcommand nesting:
- `fleet checkpoint [options]`
- `fleet resume [options]`
- `fleet checkpoints [options]` (has subcommands: list, show, prune)

**Rationale**:
1. **Consistency**: Matches existing CLI structure
2. **Discoverability**: Commands are visible at top level
3. **Simplicity**: No complex nesting
4. **Flexibility**: Subcommands only where natural grouping exists

**Alternatives Considered**:
- **A. Nested structure** (`fleet checkpoint create`, `fleet checkpoint list`):
  - **Pros**: Logical grouping
  - **Pros**: Extensible (add more checkpoint commands later)
  - **Cons**: More keystrokes
  - **Cons**: `fleet checkpoint` vs `fleet checkpoints` confusion
  - **Verdict**: Over-complicated for P0

- **B. Single `checkpoint` command with action argument** (`fleet checkpoint create --note "..."`):
  - **Pros**: Single command
  - **Cons**: Ambiguous (is `checkpoint` the command or action?)
  - **Cons**: Poor discoverability
  - **Verdict**: Poor UX

- **C. All under `checkpoint` subcommand**:
  - **Pros**: Clear separation
  - **Cons**: Every operation requires more typing
  - **Cons**: Breaks pattern of existing CLI
  - **Verdict**: Inconsistent with existing structure

**Trade-offs**:
- **Namespace**: `fleet checkpoint` vs `fleet checkpoints` (mitigated by clear help text)
- **Extensibility**: Adding more checkpoint commands may require nesting (acceptable for P0)

**Reference**: Spec US-P0-004, US-P0-005, US-P0-006 command signatures

---

### D007: Checkpoint Storage Integration

**Context**: `CheckpointStorage` exists but uses mock-database for testing. Need to integrate with real `SQLiteAdapter`.

**Decision**: Modify `CheckpointStorage` to use `SQLiteAdapter` for primary storage while keeping file backup:
1. Change mock import to SQLiteAdapter
2. Update `create()` to use `adapter.checkpoints.create()`
3. Keep JSON file write for backup
4. Fallback to file if SQLite fails

**Rationale**:
1. **Dual Storage**: Primary SQLite + file backup for safety
2. **Performance**: SQLite is faster than file I/O
3. **Reliability**: Fallback to file if database unavailable
4. **Backward Compatible**: Existing file-based tests continue to work

**Alternatives Considered**:
- **A. SQLite only**:
  - **Pros**: Simpler, faster
  - **Pros**: Single source of truth
  - **Cons**: No fallback if database corrupted
  - **Cons**: Can't inspect data without database access
  - **Verdict**: Too fragile for user data

- **B. File only**:
  - **Pros**: Simple, inspectable
  - **Pros**: No database dependencies
  - **Cons**: Poor performance for many checkpoints
  - **Cons**: No querying capabilities
  - **Verdict**: Doesn't leverage Phase 2 infrastructure

- **C. External storage (S3, etc.)**:
  - **Pros**: Scalable
  - **Pros**: Multi-machine access
  - **Cons**: Network dependencies
  - **Cons**: Additional complexity
  - **Verdict**: Future enhancement for distributed fleets

**Trade-offs**:
- **Complexity**: Dual storage coordination (acceptable for safety)
- **Storage**: Redundant storage (acceptable for backup benefit)
- **Consistency**: Must keep SQLite and file in sync (transactional writes)

**Reference**: Spec CheckpointStorage implementation requirements

---

### D008: Transaction Implementation in SQLite

**Context**: Need transaction support for recovery restoration to ensure atomicity.

**Decision**: Use SQLite's `BEGIN`, `COMMIT`, `ROLLBACK` statements with wrapper methods:
```typescript
beginTransaction(): Promise<void>
commitTransaction(): Promise<void>
rollbackTransaction(): Promise<void>
```

**Rationale**:
1. **Native Support**: SQLite has built-in transactions
2. **Explicit Control**: Clear transaction boundaries
3. **Error Handling**: Can catch errors and rollback
4. **Testing**: Easy to mock transaction methods

**Alternatives Considered**:
- **A. Auto-commit mode**:
  - **Pros**: Simpler, no transaction management
  - **Cons**: No atomicity guarantees
  - **Cons**: Partial restoration possible
  - **Verdict**: Unacceptable for recovery

- **B. Savepoints**:
  - **Pros**: Nested transactions
  - **Pros**: Rollback to specific savepoint
  - **Cons**: More complex
  - **Cons**: Overkill for P0
  - **Verdict**: Future enhancement for complex workflows

- **C. ORM transaction handling**:
  - **Pros**: Declarative transactions
  - **Pros**: Automatic rollback on exception
  - **Cons**: Requires ORM (not used in FleetTools)
  - **Verdict**: Unnecessary dependency

**Trade-offs**:
- **Manual Management**: Must remember to commit/rollback (mitigated by try/catch pattern)
- **Error Handling**: Need to catch all errors (standard async/await pattern)

**Reference**: Spec US-P0-003 AC-9 (Transaction rollback on partial failure)

---

### D009: Test Structure and Coverage

**Context**: Need to ensure comprehensive testing for migration, recovery, and CLI commands.

**Decision**: Multi-level testing strategy:
1. **Unit Tests**: Individual component testing (detector, restorer, CLI commands)
2. **Integration Tests**: Cross-component testing (recovery flow, CLI + storage)
3. **Regression Tests**: Verify existing functionality (19 API tests)
4. **Coverage Target**: 90%+ for new code

**Rationale**:
1. **Comprehensive**: Tests at each layer catch different types of bugs
2. **Maintainable**: Clear separation of concerns
3. **Regression**: Ensure no breaking changes
4. **Quality Metric**: Coverage target guides test writing

**Alternatives Considered**:
- **A. Integration tests only**:
  - **Pros**: Tests real behavior
  - **Pros**: Fewer tests to write
  - **Cons**: Harder to debug failures
  - **Cons**: Poor unit isolation
  - **Verdict**: Insufficient for quality

- **B. 100% coverage**:
  - **Pros**: Maximum confidence
  - **Pros**: Easy to measure
  - **Cons**: Diminishing returns
  - **Cons**: Tests trivial code
  - **Verdict**: 90% is practical and high-quality

- **C. Property-based testing**:
  - **Pros**: Finds edge cases automatically
  - **Pros**: Generative testing
  - **Cons**: Complex setup
  - **Cons**: Hard to maintain
  - **Verdict**: Future enhancement for critical components

**Trade-offs**:
- **Test Count**: 33 new tests (acceptable for 2-day effort)
- **Execution Time**: Longer test runs (acceptable for CI)
- **Maintenance**: Tests must be updated with code changes (standard practice)

**Reference**: Spec Test Plan section (25+ new tests, 90%+ coverage)

---

### D010: Performance Targets

**Context**: Non-functional requirements specify performance targets for key operations.

**Decision**: Set aggressive but achievable targets based on SQLite performance:
1. **Migration**: < 1s for 10K events
2. **Detection**: < 100ms for typical mission count
3. **Restoration**: < 500ms for typical checkpoint
4. **CLI Commands**: < 200ms for simple operations
5. **Checkpoint Creation**: < 100ms

**Rationale**:
1. **User Experience**: Fast operations feel responsive
2. **SQLite Capabilities**: Targets align with SQLite performance
3. **Benchmark-Based**: Based on SQLite benchmarks (not arbitrary)
4. **Measurable**: Each target can be verified with tests

**Alternatives Considered**:
- **A. Looser targets**:
  - **Pros**: Easier to achieve
  - **Pros**: Less optimization pressure
  - **Cons**: Poor user experience
  - **Verdict**: Unacceptable for P0 critical features

- **B. Stricter targets**:
  - **Pros**: Better performance
  - **Pros**: More optimization
  - **Cons**: May require over-engineering
  - **Cons**: Harder to maintain
  - **Verdict**: Unnecessary for current scale

- **C. No targets**:
  - **Pros**: Simpler implementation
  - **Cons**: No performance guarantees
  - **Cons**: No regression detection
  - **Verdict**: Violates spec requirements

**Trade-offs**:
- **Optimization Effort**: May require query tuning (acceptable for quality)
- **Testing Overhead**: Need benchmark tests (adds to test suite)
- **Complexity**: May need caching (not required for P0 scale)

**Reference**: Spec Non-Functional Requirements - Performance table

---

## Unresolved Questions

### Q001: Should we support reverse migration (SQLite → JSON)?

**Status**: Not required for P0
**Context**: Some users may want to export SQLite data to JSON

**Options**:
- **A. Implement reverse migration**: Complex, adds maintenance burden
- **B. Use SQLite dump tools**: `.dump` command exports to SQL
- **C. JSON export endpoint**: Read-only export via API
- **D. Defer**: Future enhancement if requested

**Recommendation**: Defer to P1 or user request. Users can use SQLite tools for export.

---

### Q002: How to handle checkpoint versioning?

**Status**: Version field exists, but no migration strategy

**Context**: Checkpoint format may evolve over time. Need to handle different versions during recovery.

**Options**:
- **A. Version-specific readers**: `restoreV1()`, `restoreV2()`, etc.
- **B. Migration strategy**: Upgrade old checkpoints on load
- **C. Reject old versions**: Fail with clear error
- **D. Defer**: Only one version exists now

**Recommendation**: Defer until multiple versions needed. Current strategy: Reject unsupported versions with clear error message.

---

### Q003: Should we implement automatic checkpoint creation?

**Status**: Not in P0 spec

**Context**: Currently only manual checkpoints. Could add periodic or milestone-based auto-checkpoints.

**Options**:
- **A. Time-based**: Every N minutes
- **B. Event-based**: On specific events (e.g., sortie completed)
- **C. Milestone-based**: At 25%, 50%, 75% progress
- **D. Defer**: Manual only for P0

**Recommendation**: Defer to P1. Manual checkpoints are sufficient for P0. Auto-checkpoints can be added with user experience data.

---

### Q004: How to handle distributed recovery?

**Status**: Out of scope for P0

**Context**: If multiple agents work on same mission, recovery may need coordination.

**Options**:
- **A. Agent negotiation**: Agents agree on recovery point
- **B. Leader election**: One agent coordinates recovery
- **C. User manual**: User specifies which agent recovers
- **D. Defer**: Single-agent model for P0

**Recommendation**: Defer to P2. Single-agent model is sufficient for current FleetTools architecture.

---

## Technology Choices

### SQLite vs Other Databases

**Evaluation**:

| Database | Pros | Cons | Verdict |
|----------|-------|--------|---------|
| **SQLite** | Bun built-in, no external deps, file-based, WAL mode, fast reads | Limited write concurrency, single-writer | ✅ **Selected** |
| PostgreSQL | High concurrency, mature, scalable | External service, Podman required, complex setup | ❌ Overkill |
| MySQL | Similar to PostgreSQL | External service, license concerns | ❌ Overkill |
| LevelDB | Fast, embedded | No SQL, limited querying | ❌ Not suitable for queries |
| RocksDB | Very fast, embedded | C++ only, complex API | ❌ Not suitable for TypeScript/Bun |

**Decision**: SQLite (via `bun:sqlite`) is optimal for FleetTools:
- Zero external dependencies
- Fast for current scale (< 100K events)
- File-based (easy backup)
- Mature and well-supported

---

### Commander.js vs Other CLI Frameworks

**Evaluation**:

| Framework | Pros | Cons | Verdict |
|-----------|-------|--------|---------|
| **Commander.js** | Already in use, mature, popular, auto-help | Some verbosity issues | ✅ **Selected** |
| Yargs | More features, better parsing | Larger dependency, steeper learning | ❌ Unnecessary |
| Clap | Fast, modern, TypeScript-native | Newer, smaller ecosystem | ❌ Not in use |
| Oclif | Great features, plugins | Heavy, complex | ❌ Overkill |

**Decision**: Keep Commander.js (already used in project):
- No migration cost
- Familiar to team
- Sufficient for P0 needs

---

### Testing Framework

**Evaluation**:

| Framework | Pros | Cons | Verdict |
|-----------|-------|--------|---------|
| **Bun Test** | Built-in, fast, modern | New, less mature, smaller ecosystem | ✅ **Selected** |
| Jest | Mature, features, coverage | Slow, heavy, Node.js only | ❌ Not aligned with Bun |
| Mocha | Mature, flexible | Requires setup, slower | ❌ Not aligned with Bun |
| Vitest | Modern, fast, ESM-first | Newer, smaller ecosystem | ❌ Not selected yet |

**Decision**: Use Bun's built-in test runner:
- Fast execution
- No extra dependencies
- Already in use (see existing tests)
- Good TypeScript support

---

## Performance Research

### SQLite Performance Characteristics

Based on SQLite benchmarks and FleetTools workload:

**Write Performance**:
- Single INSERT: ~0.1ms
- Batch INSERT (1000 rows): ~50ms
- With WAL mode: ~2x faster writes
- With transactions: ~10x faster than individual inserts

**Read Performance**:
- Indexed query: < 1ms
- Full table scan: ~10ms/1000 rows
- JOIN query: ~1-5ms

**Checkpoint Creation**:
- Capture state (query sorties, locks, messages): ~20ms
- Insert checkpoint: ~5ms
- Write JSON file: ~10ms
- **Total**: ~35ms (well under 100ms target)

**Migration (10K events)**:
- Read JSON file: ~50ms
- Insert 10K events (transactional): ~500ms
- Insert mailboxes/cursors/locks: ~50ms
- **Total**: ~600ms (well under 1s target)

**Conclusion**: Performance targets are achievable with proper indexing and transaction usage.

---

## Security Considerations

### File Permissions

**Issue**: Checkpoint files and database contain sensitive data.

**Decision**:
1. **Database file**: 0600 permissions (owner read/write only)
2. **Checkpoint files**: 0600 permissions
3. **Backup file**: 0600 permissions
4. **Directory**: 0700 permissions (owner access only)

**Implementation**: Set permissions after file creation using `fs.chmod()`.

### Data Exclusion

**Issue**: Checkpoints should not include secrets or sensitive data.

**Decision**:
1. **Exclude from checkpoints**:
   - Passwords (if stored)
   - API keys (if in state)
   - Private keys
   - Session tokens

2. **Include only**:
   - Mission metadata
   - Sortie progress
   - Lock references (file paths only)
   - Message subjects (not content)

**Implementation**: Filter sensitive fields during checkpoint creation.

### SQL Injection Prevention

**Issue**: User input may contain SQL if not handled properly.

**Decision**:
1. Use parameterized queries exclusively
2. Never concatenate user input into SQL strings
3. Validate all inputs before use

**Implementation**: All SQLite queries use `prepare()` with binding parameters.

---

## Future Research Areas

### R001: Hot-Reload Recovery

**Research Question**: Can we detect context compaction in real-time without waiting for inactivity?

**Approaches**:
- Monitor LLM response metadata for context window warnings
- Track token usage per turn
- Heuristics on context length

**Status**: Future enhancement (P1+)

---

### R002: Distributed Checkpoint Storage

**Research Question**: How to support checkpoints across multiple machines?

**Approaches**:
- Sync to cloud storage (S3, Azure Blob)
- Peer-to-peer replication
- Shared database (PostgreSQL)

**Status**: Future enhancement (P2+)

---

### R003: Checkpoint Compression

**Research Question**: Can we reduce checkpoint storage size?

**Approaches**:
- Compress JSON files (gzip)
- Use binary format (MessagePack)
- Delta encoding between checkpoints

**Status**: Future enhancement (P1+)

---

## References

- [SQLite Performance](https://www.sqlite.org/performance.html)
- [Bun SQLite Documentation](https://bun.sh/docs/api/sqlite)
- [Commander.js Documentation](https://www.npmjs.com/package/commander)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

---

**Version**: 1.0.0
**Last Updated**: 2026-01-05
**Confidence**: 0.92
