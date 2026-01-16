# Phase 3: Context Survival - TDD Test Plan

**Version:** 1.0.0  
**Status:** Ready for Implementation  
**Date:** 2026-01-04  
**Coverage Target:** 95% line, 95% function, 90% branch

---

## 1. Overview

### 1.1 Architecture Summary

Phase 3 implements the Context Survival System, enabling AI agent fleets to survive context window compaction by automatically checkpointing state and providing seamless recovery.

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Context Survival Architecture                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Triggers   │───▶│  Checkpoint  │───▶│   Storage    │          │
│  │  (Progress/  │    │   Service    │    │ (SQLite +    │          │
│  │   Error)     │    │              │    │   File)      │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│                             │                    │                  │
│                             ▼                    │                  │
│                      ┌──────────────┐            │                  │
│                      │   Recovery   │◀───────────┘                  │
│                      │   Service    │                               │
│                      └──────┬───────┘                               │
│                             │                                       │
│              ┌──────────────┼──────────────┐                       │
│              ▼              ▼              ▼                       │
│       ┌──────────┐   ┌──────────┐   ┌──────────┐                  │
│       │  State   │   │   Lock   │   │ Context  │                  │
│       │ Restore  │   │ Re-acquire│   │ Inject   │                  │
│       └──────────┘   └──────────┘   └──────────┘                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Dependency on Phase 2

Phase 3 depends on Phase 2 interfaces but can be developed in parallel using mock implementations:

| Phase 2 Interface | Phase 3 Usage | Mock Strategy |
|-------------------|---------------|---------------|
| `MissionOps` | Query mission state | In-memory mock |
| `SortieOps` | Query/restore sorties | In-memory mock |
| `LockOps` | Re-acquire locks | In-memory mock |
| `EventOps` | Emit checkpoint events | In-memory mock |
| `DatabaseAdapter` | Storage operations | SQLite mock |

### 1.3 Test Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Test Pyramid                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                          ┌─────┐                                    │
│                         /  E2E  \         4 tests (5%)              │
│                        /─────────\                                  │
│                       / Integration\      27 tests (30%)            │
│                      /──────────────\                               │
│                     /     Unit       \    55 tests (65%)            │
│                    /──────────────────\                             │
│                                                                      │
│  Total: 86 tests targeting 95%+ coverage                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Test Categories

### 2.1 Coverage Targets by Category

| Category | Tests | Line % | Function % | Branch % |
|----------|-------|--------|------------|----------|
| Checkpoint Service | 15 | 95% | 95% | 90% |
| Checkpoint Storage | 10 | 95% | 95% | 90% |
| Recovery Detection | 8 | 95% | 95% | 90% |
| State Restoration | 12 | 95% | 95% | 90% |
| Context Injection | 6 | 95% | 95% | 90% |
| CLI Commands | 15 | 95% | 95% | 90% |
| API Endpoints | 12 | 95% | 95% | 90% |
| Cleanup/Pruning | 8 | 95% | 95% | 90% |
| **Total** | **86** | **95%** | **95%** | **90%** |

---

## 3. Detailed Test Cases

### 3.1 Checkpoint Service Tests (15 tests)

**File:** `tests/unit/phase3/checkpoint/service.test.ts`

| ID | Test Case | Description | AC Reference |
|----|-----------|-------------|--------------|
| CKP-001 | should create checkpoint at 25% progress | Progress milestone | US-301 AC-1 |
| CKP-002 | should create checkpoint at 50% progress | Progress milestone | US-301 AC-2 |
| CKP-003 | should create checkpoint at 75% progress | Progress milestone | US-301 AC-3 |
| CKP-004 | should calculate progress correctly | completed/total * 100 | US-301 AC-4 |
| CKP-005 | should include all active sortie states | Sortie snapshot | US-301 AC-5 |
| CKP-006 | should include all held file locks | Lock snapshot | US-301 AC-6 |
| CKP-007 | should include all pending messages | Message snapshot | US-301 AC-7 |
| CKP-008 | should emit fleet_checkpointed event | Event sourcing | US-301 AC-8 |
| CKP-009 | should create checkpoint on unhandled exception | Error trigger | US-302 AC-1 |
| CKP-010 | should create checkpoint on API error | Error trigger | US-302 AC-2 |
| CKP-011 | should create checkpoint on lock timeout | Error trigger | US-302 AC-3 |
| CKP-012 | should capture error in recovery_context.blockers | Error context | US-302 AC-5 |
| CKP-013 | should mark trigger as "error" | Trigger type | US-302 AC-6 |
| CKP-014 | should generate unique checkpoint ID | Identity | Schema |
| CKP-015 | should include schema version | Migration support | Schema |

```typescript
describe('CheckpointService', () => {
  let checkpointService: CheckpointService;
  let mockMissionOps: MockMissionOps;
  let mockSortieOps: MockSortieOps;
  let mockLockOps: MockLockOps;

  beforeEach(() => {
    mockMissionOps = createMockMissionOps();
    mockSortieOps = createMockSortieOps();
    mockLockOps = createMockLockOps();
    checkpointService = new CheckpointService({
      missionOps: mockMissionOps,
      sortieOps: mockSortieOps,
      lockOps: mockLockOps
    });
  });

  describe('progress checkpoints', () => {
    it('should create checkpoint at 25% progress', async () => {
      // Setup: 4 sorties, 1 completed
      const mission = await mockMissionOps.create({ title: 'Test Mission' });
      for (let i = 0; i < 4; i++) {
        await mockSortieOps.create({ mission_id: mission.id, title: `Sortie ${i}` });
      }
      await mockSortieOps.complete(mockSortieOps.getByMission(mission.id)[0].id);

      // Trigger progress check
      const checkpoint = await checkpointService.checkProgress(mission.id);

      expect(checkpoint).toBeDefined();
      expect(checkpoint.trigger).toBe('progress');
      expect(checkpoint.progress_percent).toBe(25);
    });

    it('should calculate progress correctly', async () => {
      const mission = await mockMissionOps.create({ title: 'Test' });
      await mockSortieOps.create({ mission_id: mission.id, title: 'S1' });
      await mockSortieOps.create({ mission_id: mission.id, title: 'S2' });
      
      const sorties = mockSortieOps.getByMission(mission.id);
      await mockSortieOps.complete(sorties[0].id);

      const progress = checkpointService.calculateProgress(mission.id);
      expect(progress).toBe(50);
    });

    it('should include all active sortie states', async () => {
      const mission = await mockMissionOps.create({ title: 'Test' });
      await mockSortieOps.create({ 
        mission_id: mission.id, 
        title: 'S1',
        assigned_to: 'spec-1'
      });
      await mockSortieOps.create({ 
        mission_id: mission.id, 
        title: 'S2',
        assigned_to: 'spec-2'
      });

      const checkpoint = await checkpointService.createCheckpoint({
        mission_id: mission.id,
        trigger: 'manual',
        created_by: 'dispatch-1'
      });

      expect(checkpoint.sorties).toHaveLength(2);
      expect(checkpoint.sorties[0].assigned_to).toBe('spec-1');
    });
  });

  describe('error checkpoints', () => {
    it('should create checkpoint on unhandled exception', async () => {
      const mission = await mockMissionOps.create({ title: 'Test' });
      const error = new Error('Unhandled exception');

      const checkpoint = await checkpointService.createErrorCheckpoint(
        mission.id,
        error,
        'dispatch-1'
      );

      expect(checkpoint.trigger).toBe('error');
      expect(checkpoint.trigger_details).toContain('Unhandled exception');
      expect(checkpoint.recovery_context.blockers).toContain('Error: Unhandled exception');
    });

    it('should capture error in recovery_context.blockers', async () => {
      const mission = await mockMissionOps.create({ title: 'Test' });
      const error = new Error('Lock acquisition timeout');

      const checkpoint = await checkpointService.createErrorCheckpoint(
        mission.id,
        error,
        'dispatch-1'
      );

      expect(checkpoint.recovery_context.blockers).toContain('Error: Lock acquisition timeout');
    });
  });
});
```

---

### 3.2 Checkpoint Storage Tests (10 tests)

**File:** `tests/unit/phase3/checkpoint/storage.test.ts`

| ID | Test Case | Description | AC Reference |
|----|-----------|-------------|--------------|
| STR-001 | should store checkpoint in SQLite | Primary storage | NFR Reliability |
| STR-002 | should store checkpoint as file backup | Dual storage | NFR Reliability |
| STR-003 | should create file in .flightline/checkpoints/ | File location | Schema |
| STR-004 | should create latest.json symlink | Quick access | Schema |
| STR-005 | should retrieve checkpoint from SQLite | Read primary | NFR Reliability |
| STR-006 | should fallback to file if SQLite missing | Fallback | Edge Cases |
| STR-007 | should validate checkpoint schema on load | Corruption detection | NFR Reliability |
| STR-008 | should handle corrupted checkpoint gracefully | Error handling | Edge Cases |
| STR-009 | should list checkpoints by mission | Query | API |
| STR-010 | should delete checkpoint from both stores | Cleanup | US-308 |

```typescript
describe('CheckpointStorage', () => {
  let storage: CheckpointStorage;
  let testDir: string;

  beforeEach(() => {
    testDir = createTempDir();
    storage = new CheckpointStorage({
      dbPath: ':memory:',
      fileDir: path.join(testDir, '.flightline', 'checkpoints')
    });
  });

  afterEach(() => {
    cleanupTempDir(testDir);
  });

  describe('dual storage', () => {
    it('should store checkpoint in SQLite', async () => {
      const checkpoint = createTestCheckpoint();
      await storage.save(checkpoint);

      const retrieved = await storage.getFromSQLite(checkpoint.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(checkpoint.id);
    });

    it('should store checkpoint as file backup', async () => {
      const checkpoint = createTestCheckpoint();
      await storage.save(checkpoint);

      const filePath = path.join(
        testDir, 
        '.flightline', 
        'checkpoints', 
        checkpoint.mission_id,
        `${checkpoint.id}.json`
      );
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should create latest.json symlink', async () => {
      const checkpoint = createTestCheckpoint();
      await storage.save(checkpoint);

      const latestPath = path.join(
        testDir,
        '.flightline',
        'checkpoints',
        checkpoint.mission_id,
        'latest.json'
      );
      expect(fs.existsSync(latestPath)).toBe(true);
      
      const content = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
      expect(content.id).toBe(checkpoint.id);
    });
  });

  describe('fallback behavior', () => {
    it('should fallback to file if SQLite missing', async () => {
      const checkpoint = createTestCheckpoint();
      
      // Save to file only
      await storage.saveToFile(checkpoint);
      
      // SQLite should not have it
      const fromSQLite = await storage.getFromSQLite(checkpoint.id);
      expect(fromSQLite).toBeNull();
      
      // But get() should find it via fallback
      const retrieved = await storage.get(checkpoint.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(checkpoint.id);
    });
  });

  describe('validation', () => {
    it('should validate checkpoint schema on load', async () => {
      const checkpoint = createTestCheckpoint();
      await storage.save(checkpoint);

      const retrieved = await storage.get(checkpoint.id);
      expect(retrieved.version).toBe('1.0.0');
      expect(retrieved.sorties).toBeInstanceOf(Array);
      expect(retrieved.recovery_context).toBeDefined();
    });

    it('should handle corrupted checkpoint gracefully', async () => {
      const checkpoint = createTestCheckpoint();
      await storage.save(checkpoint);

      // Corrupt the file
      const filePath = path.join(
        testDir,
        '.flightline',
        'checkpoints',
        checkpoint.mission_id,
        `${checkpoint.id}.json`
      );
      fs.writeFileSync(filePath, 'invalid json{{{');

      // Should throw with helpful message
      await expect(storage.getFromFile(checkpoint.id, checkpoint.mission_id))
        .rejects.toThrow('Corrupted checkpoint file');
    });
  });
});
```

---

### 3.3 Recovery Detection Tests (8 tests)

**File:** `tests/unit/phase3/recovery/detection.test.ts`

| ID | Test Case | Description | AC Reference |
|----|-----------|-------------|--------------|
| DET-001 | should detect active missions without completion | Stale detection | US-304 AC-1 |
| DET-002 | should detect missions with no recent activity | Inactivity threshold | US-304 AC-2 |
| DET-003 | should use 5 minute activity threshold | Threshold config | US-304 AC-3 |
| DET-004 | should prompt user with recovery option | User prompt | US-304 AC-4 |
| DET-005 | should emit context_compacted event | Event sourcing | US-304 AC-5 |
| DET-006 | should support --auto-resume flag | Non-interactive | US-304 AC-6 |
| DET-007 | should not detect completed missions | Filter completed | Edge case |
| DET-008 | should handle multiple stale missions | Multiple recovery | Edge case |

```typescript
describe('RecoveryDetection', () => {
  let detector: RecoveryDetector;
  let mockMissionOps: MockMissionOps;
  let mockEventOps: MockEventOps;

  beforeEach(() => {
    mockMissionOps = createMockMissionOps();
    mockEventOps = createMockEventOps();
    detector = new RecoveryDetector({
      missionOps: mockMissionOps,
      eventOps: mockEventOps,
      activityThresholdMs: 5 * 60 * 1000 // 5 minutes
    });
  });

  describe('stale mission detection', () => {
    it('should detect active missions without completion', async () => {
      const mission = await mockMissionOps.create({ title: 'Test' });
      await mockMissionOps.start(mission.id);
      
      // No completion, should be detected
      const stale = await detector.findStaleMissions();
      expect(stale).toHaveLength(1);
      expect(stale[0].id).toBe(mission.id);
    });

    it('should detect missions with no recent activity', async () => {
      const mission = await mockMissionOps.create({ title: 'Test' });
      await mockMissionOps.start(mission.id);
      
      // Simulate old activity by backdating last event
      mockEventOps.setLastEventTime(mission.id, Date.now() - 10 * 60 * 1000);
      
      const stale = await detector.findStaleMissions();
      expect(stale).toHaveLength(1);
    });

    it('should use 5 minute activity threshold', async () => {
      const mission = await mockMissionOps.create({ title: 'Test' });
      await mockMissionOps.start(mission.id);
      
      // Activity 4 minutes ago - should NOT be stale
      mockEventOps.setLastEventTime(mission.id, Date.now() - 4 * 60 * 1000);
      let stale = await detector.findStaleMissions();
      expect(stale).toHaveLength(0);
      
      // Activity 6 minutes ago - should be stale
      mockEventOps.setLastEventTime(mission.id, Date.now() - 6 * 60 * 1000);
      stale = await detector.findStaleMissions();
      expect(stale).toHaveLength(1);
    });

    it('should not detect completed missions', async () => {
      const mission = await mockMissionOps.create({ title: 'Test' });
      await mockMissionOps.start(mission.id);
      await mockMissionOps.complete(mission.id);
      
      const stale = await detector.findStaleMissions();
      expect(stale).toHaveLength(0);
    });
  });

  describe('recovery prompting', () => {
    it('should emit context_compacted event', async () => {
      const mission = await mockMissionOps.create({ title: 'Test' });
      await mockMissionOps.start(mission.id);
      mockEventOps.setLastEventTime(mission.id, Date.now() - 10 * 60 * 1000);
      
      const events: any[] = [];
      detector.on('context_compacted', (e) => events.push(e));
      
      await detector.checkForRecovery();
      
      expect(events).toHaveLength(1);
      expect(events[0].mission_id).toBe(mission.id);
    });
  });
});
```

---

### 3.4 State Restoration Tests (12 tests)

**File:** `tests/unit/phase3/recovery/restoration.test.ts`

| ID | Test Case | Description | AC Reference |
|----|-----------|-------------|--------------|
| RST-001 | should load checkpoint from SQLite | Primary load | US-305 AC-1 |
| RST-002 | should load specific checkpoint by ID | Specific recovery | US-305 AC-2 |
| RST-003 | should restore sortie states | Sortie restoration | US-305 AC-3 |
| RST-004 | should re-acquire valid file locks | Lock restoration | US-305 AC-4 |
| RST-005 | should inject recovery context | Context injection | US-305 AC-5 |
| RST-006 | should emit fleet_recovered event | Event sourcing | US-305 AC-6 |
| RST-007 | should release orphaned locks | Orphan cleanup | US-305 AC-7 |
| RST-008 | should handle expired locks gracefully | Lock expiration | Edge Cases |
| RST-009 | should handle lock conflicts on recovery | Conflict handling | Edge Cases |
| RST-010 | should requeue undelivered messages | Message restoration | Recovery Algorithm |
| RST-011 | should validate checkpoint schema version | Migration | Edge Cases |
| RST-012 | should be idempotent (safe to run multiple times) | Idempotency | NFR Reliability |

```typescript
describe('StateRestoration', () => {
  let restorer: StateRestorer;
  let mockSortieOps: MockSortieOps;
  let mockLockOps: MockLockOps;
  let mockMessageOps: MockMessageOps;
  let storage: MockCheckpointStorage;

  beforeEach(() => {
    mockSortieOps = createMockSortieOps();
    mockLockOps = createMockLockOps();
    mockMessageOps = createMockMessageOps();
    storage = createMockCheckpointStorage();
    
    restorer = new StateRestorer({
      sortieOps: mockSortieOps,
      lockOps: mockLockOps,
      messageOps: mockMessageOps,
      storage
    });
  });

  describe('sortie restoration', () => {
    it('should restore sortie states', async () => {
      const checkpoint = createTestCheckpoint({
        sorties: [
          { id: 'srt-1', status: 'in_progress', progress_notes: 'Working on auth' },
          { id: 'srt-2', status: 'pending' }
        ]
      });
      await storage.save(checkpoint);

      await restorer.restore(checkpoint.id);

      const sortie1 = await mockSortieOps.getById('srt-1');
      expect(sortie1.status).toBe('in_progress');
      expect(sortie1.progress_notes).toBe('Working on auth');
    });
  });

  describe('lock restoration', () => {
    it('should re-acquire valid file locks', async () => {
      const checkpoint = createTestCheckpoint({
        active_locks: [
          { 
            id: 'lock-1', 
            file: '/src/auth.ts', 
            held_by: 'spec-1',
            timeout_ms: 30000,
            acquired_at: new Date().toISOString()
          }
        ]
      });
      await storage.save(checkpoint);

      await restorer.restore(checkpoint.id);

      const locks = await mockLockOps.getActive();
      expect(locks).toHaveLength(1);
      expect(locks[0].file).toBe('/src/auth.ts');
    });

    it('should handle expired locks gracefully', async () => {
      const checkpoint = createTestCheckpoint({
        active_locks: [
          { 
            id: 'lock-1', 
            file: '/src/auth.ts', 
            held_by: 'spec-1',
            timeout_ms: 1000,
            acquired_at: new Date(Date.now() - 60000).toISOString() // Expired
          }
        ]
      });
      await storage.save(checkpoint);

      const result = await restorer.restore(checkpoint.id);

      expect(result.recovery_context.blockers).toContain(
        'Lock expired: /src/auth.ts'
      );
    });

    it('should handle lock conflicts on recovery', async () => {
      // Another agent holds the lock
      await mockLockOps.acquire({
        file: '/src/auth.ts',
        specialist_id: 'other-agent',
        timeout_ms: 30000
      });

      const checkpoint = createTestCheckpoint({
        active_locks: [
          { 
            id: 'lock-1', 
            file: '/src/auth.ts', 
            held_by: 'spec-1',
            timeout_ms: 30000,
            acquired_at: new Date().toISOString()
          }
        ]
      });
      await storage.save(checkpoint);

      const result = await restorer.restore(checkpoint.id);

      expect(result.recovery_context.blockers).toContain(
        'Lock conflict: /src/auth.ts held by other-agent'
      );
    });
  });

  describe('idempotency', () => {
    it('should be idempotent (safe to run multiple times)', async () => {
      const checkpoint = createTestCheckpoint({
        sorties: [{ id: 'srt-1', status: 'in_progress' }]
      });
      await storage.save(checkpoint);

      // Run twice
      await restorer.restore(checkpoint.id);
      await restorer.restore(checkpoint.id);

      // Should still have correct state
      const sortie = await mockSortieOps.getById('srt-1');
      expect(sortie.status).toBe('in_progress');
    });
  });
});
```

---

### 3.5 Context Injection Tests (6 tests)

**File:** `tests/unit/phase3/recovery/context-injection.test.ts`

| ID | Test Case | Description | AC Reference |
|----|-----------|-------------|--------------|
| INJ-001 | should include last_action description | Context field | US-307 AC-1 |
| INJ-002 | should include next_steps array | Context field | US-307 AC-2 |
| INJ-003 | should include blockers array | Context field | US-307 AC-3 |
| INJ-004 | should include files_modified array | Context field | US-307 AC-4 |
| INJ-005 | should format for LLM consumption | Natural language | US-307 AC-5 |
| INJ-006 | should allow specialist-specific context query | Specialist context | US-307 AC-6 |

```typescript
describe('ContextInjection', () => {
  let injector: ContextInjector;

  beforeEach(() => {
    injector = new ContextInjector();
  });

  describe('context formatting', () => {
    it('should include last_action description', () => {
      const context: RecoveryContext = {
        last_action: 'Specialist-2 was editing src/auth.ts',
        next_steps: ['Complete auth.ts changes'],
        blockers: [],
        files_modified: ['src/auth.ts'],
        mission_summary: 'Implementing authentication',
        elapsed_time_ms: 3600000,
        last_activity_at: new Date().toISOString()
      };

      const prompt = injector.formatPrompt(context);

      expect(prompt).toContain('Specialist-2 was editing src/auth.ts');
    });

    it('should format for LLM consumption', () => {
      const context: RecoveryContext = {
        last_action: 'Working on auth',
        next_steps: ['Step 1', 'Step 2'],
        blockers: ['Blocker 1'],
        files_modified: ['file1.ts', 'file2.ts'],
        mission_summary: 'Test mission',
        elapsed_time_ms: 3600000,
        last_activity_at: new Date().toISOString()
      };

      const prompt = injector.formatPrompt(context);

      // Should be natural language, not JSON
      expect(prompt).toContain('## Recovery Context');
      expect(prompt).toContain('**Mission**:');
      expect(prompt).toContain('### Next Steps');
      expect(prompt).toContain('- Step 1');
      expect(prompt).toContain('- Step 2');
    });
  });

  describe('specialist-specific context', () => {
    it('should allow specialist-specific context query', () => {
      const checkpoint = createTestCheckpoint({
        sorties: [
          { id: 'srt-1', assigned_to: 'spec-1', files: ['auth.ts'] },
          { id: 'srt-2', assigned_to: 'spec-2', files: ['api.ts'] }
        ]
      });

      const context = injector.getSpecialistContext(checkpoint, 'spec-1');

      expect(context.files_modified).toContain('auth.ts');
      expect(context.files_modified).not.toContain('api.ts');
    });
  });
});
```

---

### 3.6 CLI Command Tests (15 tests)

**File:** `tests/integration/phase3/cli/*.test.ts`

| ID | Test Case | Description | AC Reference |
|----|-----------|-------------|--------------|
| CLI-001 | fleet checkpoint creates checkpoint | Manual checkpoint | US-303 AC-1 |
| CLI-002 | fleet checkpoint --mission targets specific | Mission targeting | US-303 AC-2 |
| CLI-003 | fleet checkpoint --note adds context | Note addition | US-303 AC-3 |
| CLI-004 | fleet checkpoint returns checkpoint ID | ID return | US-303 AC-5 |
| CLI-005 | fleet resume loads latest checkpoint | Resume latest | US-305 AC-1 |
| CLI-006 | fleet resume --checkpoint loads specific | Resume specific | US-305 AC-2 |
| CLI-007 | fleet resume --dry-run shows preview | Dry run | CLI Spec |
| CLI-008 | fleet checkpoints list shows all | List checkpoints | US-306 AC-1 |
| CLI-009 | fleet checkpoints list --mission targets | Mission filter | US-306 AC-2 |
| CLI-010 | fleet checkpoints show displays details | Show details | US-306 AC-3 |
| CLI-011 | fleet checkpoints show --json outputs JSON | JSON output | US-306 AC-5 |
| CLI-012 | fleet checkpoints prune deletes old | Prune old | US-308 AC-4 |
| CLI-013 | fleet checkpoints prune --dry-run previews | Prune preview | CLI Spec |
| CLI-014 | fleet checkpoints prune --keep N keeps N | Keep minimum | US-308 AC-2 |
| CLI-015 | fleet checkpoint works in local mode | Local mode | US-303 AC-6 |

```typescript
describe('CLI Commands', () => {
  let cli: TestCLI;
  let testDir: string;

  beforeEach(() => {
    testDir = createTempDir();
    cli = createTestCLI({ workdir: testDir });
  });

  afterEach(() => {
    cleanupTempDir(testDir);
  });

  describe('fleet checkpoint', () => {
    it('should create checkpoint', async () => {
      // Setup mission
      await cli.run('fleet mission create "Test Mission"');
      await cli.run('fleet mission start');

      const result = await cli.run('fleet checkpoint');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Checkpoint created:');
      expect(result.stdout).toMatch(/chk-[a-z0-9]+/);
    });

    it('should target specific mission with --mission', async () => {
      await cli.run('fleet mission create "Mission 1"');
      const mission2 = await cli.run('fleet mission create "Mission 2"');
      const missionId = extractMissionId(mission2.stdout);

      const result = await cli.run(`fleet checkpoint --mission ${missionId}`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(missionId);
    });

    it('should add note with --note', async () => {
      await cli.run('fleet mission create "Test"');
      await cli.run('fleet mission start');

      const result = await cli.run('fleet checkpoint --note "Before refactoring"');

      expect(result.exitCode).toBe(0);
      
      // Verify note in checkpoint
      const checkpointId = extractCheckpointId(result.stdout);
      const showResult = await cli.run(`fleet checkpoints show ${checkpointId}`);
      expect(showResult.stdout).toContain('Before refactoring');
    });
  });

  describe('fleet resume', () => {
    it('should load latest checkpoint', async () => {
      await cli.run('fleet mission create "Test"');
      await cli.run('fleet mission start');
      await cli.run('fleet checkpoint');

      const result = await cli.run('fleet resume -y');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Recovery complete');
    });

    it('should show preview with --dry-run', async () => {
      await cli.run('fleet mission create "Test"');
      await cli.run('fleet mission start');
      await cli.run('fleet checkpoint');

      const result = await cli.run('fleet resume --dry-run');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Would restore');
      expect(result.stdout).not.toContain('Recovery complete');
    });
  });

  describe('fleet checkpoints list', () => {
    it('should list all checkpoints', async () => {
      await cli.run('fleet mission create "Test"');
      await cli.run('fleet mission start');
      await cli.run('fleet checkpoint');
      await cli.run('fleet checkpoint');

      const result = await cli.run('fleet checkpoints list');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Total: 2 checkpoints');
    });
  });

  describe('fleet checkpoints prune', () => {
    it('should delete old checkpoints', async () => {
      await cli.run('fleet mission create "Test"');
      await cli.run('fleet mission start');
      
      // Create multiple checkpoints
      for (let i = 0; i < 5; i++) {
        await cli.run('fleet checkpoint');
      }

      const result = await cli.run('fleet checkpoints prune --older-than 0 --keep 2 -y');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Deleted: 3 checkpoints');
    });
  });
});
```

---

### 3.7 API Endpoint Tests (12 tests)

**File:** `tests/integration/phase3/api/*.test.ts`

| ID | Test Case | Description | AC Reference |
|----|-----------|-------------|--------------|
| API-301 | POST /api/v1/checkpoints creates checkpoint | Create | API Spec |
| API-302 | GET /api/v1/checkpoints lists checkpoints | List | API Spec |
| API-303 | GET /api/v1/checkpoints/:id gets details | Get | API Spec |
| API-304 | POST /api/v1/checkpoints/:id/recover initiates recovery | Recover | API Spec |
| API-305 | DELETE /api/v1/checkpoints/:id deletes checkpoint | Delete | API Spec |
| API-306 | POST /api/v1/checkpoints/prune prunes old | Prune | API Spec |
| API-307 | Recovery returns recovery_context | Context return | API Spec |
| API-308 | Recovery with dry_run shows preview | Dry run | API Spec |
| API-309 | List supports mission_id filter | Filter | API Spec |
| API-310 | List supports limit parameter | Pagination | API Spec |
| API-311 | Prune respects keep_per_mission | Keep minimum | API Spec |
| API-312 | Returns 404 for non-existent checkpoint | Error handling | API Spec |

```typescript
describe('Checkpoint API', () => {
  let app: Hono;

  beforeAll(async () => {
    app = createTestApp();
  });

  describe('POST /api/v1/checkpoints', () => {
    it('should create checkpoint', async () => {
      // Setup mission first
      const missionRes = await app.request('/api/v1/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Mission' })
      });
      const mission = await missionRes.json();

      const response = await app.request('/api/v1/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission_id: mission.mission.id,
          trigger: 'manual',
          created_by: 'dispatch-001'
        })
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.checkpoint.id).toMatch(/^chk-/);
      expect(body.checkpoint.trigger).toBe('manual');
    });
  });

  describe('POST /api/v1/checkpoints/:id/recover', () => {
    it('should initiate recovery', async () => {
      // Setup and create checkpoint
      const missionRes = await app.request('/api/v1/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Mission' })
      });
      const mission = await missionRes.json();

      const checkpointRes = await app.request('/api/v1/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission_id: mission.mission.id,
          trigger: 'manual',
          created_by: 'dispatch-001'
        })
      });
      const checkpoint = await checkpointRes.json();

      // Recover
      const response = await app.request(
        `/api/v1/checkpoints/${checkpoint.checkpoint.id}/recover`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dry_run: false,
            agent_id: 'dispatch-001'
          })
        }
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.recovery_context).toBeDefined();
      expect(body.recovery_context.mission_summary).toBeDefined();
    });

    it('should return preview with dry_run', async () => {
      // Setup checkpoint
      const missionRes = await app.request('/api/v1/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Mission' })
      });
      const mission = await missionRes.json();

      const checkpointRes = await app.request('/api/v1/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission_id: mission.mission.id,
          trigger: 'manual',
          created_by: 'dispatch-001'
        })
      });
      const checkpoint = await checkpointRes.json();

      // Dry run recovery
      const response = await app.request(
        `/api/v1/checkpoints/${checkpoint.checkpoint.id}/recover`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dry_run: true,
            agent_id: 'dispatch-001'
          })
        }
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.dry_run).toBe(true);
      expect(body.would_restore).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should return 404 for non-existent checkpoint', async () => {
      const response = await app.request('/api/v1/checkpoints/chk-nonexistent');

      expect(response.status).toBe(404);
    });
  });
});
```

---

### 3.8 Cleanup/Pruning Tests (8 tests)

**File:** `tests/unit/phase3/cleanup/pruning.test.ts`

| ID | Test Case | Description | AC Reference |
|----|-----------|-------------|--------------|
| PRN-001 | should delete checkpoints older than threshold | Age threshold | US-308 AC-1 |
| PRN-002 | should keep at least 3 most recent per mission | Minimum keep | US-308 AC-2 |
| PRN-003 | should keep only final checkpoint for completed missions | Completed cleanup | US-308 AC-3 |
| PRN-004 | should run on server startup | Startup cleanup | US-308 AC-5 |
| PRN-005 | should run daily | Scheduled cleanup | US-308 AC-5 |
| PRN-006 | should not block operations | Non-blocking | US-308 AC-6 |
| PRN-007 | should delete from both SQLite and file | Dual cleanup | Storage |
| PRN-008 | should log cleanup operations | Logging | US-308 AC-6 |

```typescript
describe('Checkpoint Pruning', () => {
  let pruner: CheckpointPruner;
  let storage: MockCheckpointStorage;

  beforeEach(() => {
    storage = createMockCheckpointStorage();
    pruner = new CheckpointPruner({
      storage,
      defaultRetentionDays: 7,
      minKeepPerMission: 3,
      completedRetentionDays: 30
    });
  });

  describe('age-based pruning', () => {
    it('should delete checkpoints older than threshold', async () => {
      const missionId = 'msn-1';
      
      // Create old checkpoints
      for (let i = 0; i < 5; i++) {
        const checkpoint = createTestCheckpoint({
          mission_id: missionId,
          timestamp: new Date(Date.now() - (10 + i) * 24 * 60 * 60 * 1000).toISOString()
        });
        await storage.save(checkpoint);
      }
      
      // Create recent checkpoints
      for (let i = 0; i < 3; i++) {
        const checkpoint = createTestCheckpoint({
          mission_id: missionId,
          timestamp: new Date().toISOString()
        });
        await storage.save(checkpoint);
      }

      const result = await pruner.prune({ olderThanDays: 7 });

      expect(result.deleted).toBe(5);
      const remaining = await storage.listByMission(missionId);
      expect(remaining).toHaveLength(3);
    });
  });

  describe('minimum retention', () => {
    it('should keep at least 3 most recent per mission', async () => {
      const missionId = 'msn-1';
      
      // Create 5 old checkpoints
      for (let i = 0; i < 5; i++) {
        const checkpoint = createTestCheckpoint({
          mission_id: missionId,
          timestamp: new Date(Date.now() - (10 + i) * 24 * 60 * 60 * 1000).toISOString()
        });
        await storage.save(checkpoint);
      }

      const result = await pruner.prune({ 
        olderThanDays: 1,
        keepPerMission: 3
      });

      expect(result.deleted).toBe(2);
      const remaining = await storage.listByMission(missionId);
      expect(remaining).toHaveLength(3);
    });
  });

  describe('completed mission handling', () => {
    it('should keep only final checkpoint for completed missions', async () => {
      const missionId = 'msn-completed';
      
      // Create multiple checkpoints
      for (let i = 0; i < 5; i++) {
        const checkpoint = createTestCheckpoint({
          mission_id: missionId,
          progress_percent: (i + 1) * 20
        });
        await storage.save(checkpoint);
      }

      // Mark mission as completed
      await pruner.markMissionCompleted(missionId);
      await pruner.pruneCompletedMissions();

      const remaining = await storage.listByMission(missionId);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].progress_percent).toBe(100);
    });
  });

  describe('dual storage cleanup', () => {
    it('should delete from both SQLite and file', async () => {
      const checkpoint = createTestCheckpoint();
      await storage.save(checkpoint);

      await pruner.deleteCheckpoint(checkpoint.id, checkpoint.mission_id);

      expect(await storage.getFromSQLite(checkpoint.id)).toBeNull();
      expect(await storage.getFromFile(checkpoint.id, checkpoint.mission_id)).toBeNull();
    });
  });
});
```

---

## 4. Acceptance Criteria Mapping

### 4.1 User Story Coverage Matrix

| User Story | Test IDs | Coverage |
|------------|----------|----------|
| US-301 Automatic Progress Checkpointing | CKP-001 to CKP-008 | 100% |
| US-302 Error-Triggered Checkpointing | CKP-009 to CKP-013 | 100% |
| US-303 Manual Checkpoint Command | CLI-001 to CLI-004, CLI-015 | 100% |
| US-304 Context Compaction Detection | DET-001 to DET-008 | 100% |
| US-305 Checkpoint Recovery Flow | RST-001 to RST-007, CLI-005 to CLI-007 | 100% |
| US-306 Checkpoint Listing and Inspection | CLI-008 to CLI-011 | 100% |
| US-307 Specialist Recovery Context | INJ-001 to INJ-006 | 100% |
| US-308 Checkpoint Cleanup | PRN-001 to PRN-008, CLI-012 to CLI-014 | 100% |

### 4.2 Non-Functional Requirements Coverage

| NFR | Test IDs | Verification Method |
|-----|----------|---------------------|
| Checkpoint creation < 100ms | PERF-301 | Benchmark test |
| Recovery < 500ms | PERF-302 | Benchmark test |
| Dual storage (SQLite + file) | STR-001, STR-002 | Unit test |
| Idempotent recovery | RST-012 | Unit test |
| Non-blocking cleanup | PRN-006 | Async test |

---

## 5. Test File Structure

```
tests/
├── setup.ts
├── fixtures/
│   └── phase3/
│       ├── checkpoint-sample.json
│       ├── recovery-context-sample.json
│       └── corrupted-checkpoint.json
├── helpers/
│   ├── test-sqlite.ts
│   ├── mock-database.ts
│   └── contract-tests.ts
├── unit/
│   └── phase3/
│       ├── checkpoint/
│       │   ├── service.test.ts        # CKP-001 to CKP-015
│       │   └── storage.test.ts        # STR-001 to STR-010
│       ├── recovery/
│       │   ├── detection.test.ts      # DET-001 to DET-008
│       │   ├── restoration.test.ts    # RST-001 to RST-012
│       │   └── context-injection.test.ts # INJ-001 to INJ-006
│       └── cleanup/
│           └── pruning.test.ts        # PRN-001 to PRN-008
├── integration/
│   └── phase3/
│       ├── api/
│       │   └── checkpoints.test.ts    # API-301 to API-312
│       ├── cli/
│       │   ├── checkpoint.test.ts     # CLI-001 to CLI-004
│       │   ├── resume.test.ts         # CLI-005 to CLI-007
│       │   └── checkpoints.test.ts    # CLI-008 to CLI-015
│       └── coordinator/
│           └── integration.test.ts    # Dispatch integration
└── e2e/
    └── phase3/
        ├── recovery-flow.test.ts      # Full recovery E2E
        ├── checkpoint-lifecycle.test.ts # Create/list/prune
        └── multi-agent-recovery.test.ts # Multiple agents
```

---

## 6. Implementation Order

### 6.1 Day-by-Day Implementation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Phase 3 Implementation Order                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Day 1: Mock Infrastructure                                          │
│  ├── [ ] Create mock implementations for Phase 2 interfaces         │
│  ├── [ ] Setup test fixtures                                        │
│  └── [ ] Contract tests for mock implementations                    │
│                                                                      │
│  Day 2: Checkpoint Service                                           │
│  ├── [ ] CKP-001 to CKP-015 (Checkpoint service)                    │
│  ├── [ ] STR-001 to STR-010 (Checkpoint storage)                    │
│  └── [ ] Dual storage implementation                                │
│                                                                      │
│  Day 3: Recovery System                                              │
│  ├── [ ] DET-001 to DET-008 (Recovery detection)                    │
│  ├── [ ] RST-001 to RST-012 (State restoration)                     │
│  └── [ ] INJ-001 to INJ-006 (Context injection)                     │
│                                                                      │
│  Day 4: CLI & API                                                    │
│  ├── [ ] CLI-001 to CLI-015 (CLI commands)                          │
│  ├── [ ] API-301 to API-312 (API endpoints)                         │
│  └── [ ] PRN-001 to PRN-008 (Cleanup/pruning)                       │
│                                                                      │
│  Day 5: Integration & E2E                                            │
│  ├── [ ] E2E tests                                                  │
│  ├── [ ] Swap mocks for real Phase 2 implementations                │
│  └── [ ] Coverage verification                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Dependency Graph

```
                    ┌──────────────────┐
                    │  Mock Database   │
                    │  (Phase 2 Mocks) │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │Checkpoint│  │ Storage  │  │ Contract │
        │ Service  │  │  Layer   │  │  Tests   │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │             │             │
             └─────────────┼─────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │Detection │ │Restoration│ │ Context  │
        │          │ │          │ │ Injection│
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
        ┌──────────┐           ┌──────────┐
        │   CLI    │           │   API    │
        │ Commands │           │ Endpoints│
        └────┬─────┘           └────┬─────┘
             │                      │
             └──────────┬───────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   E2E Tests  │
                 └──────────────┘
```

---

## 7. Mock Implementation Guidelines

### 7.1 mock-database.ts

```typescript
// tests/helpers/mock-database.ts

/**
 * Mock implementations for Phase 2 interfaces
 * Used by Phase 3 tests until Phase 2 is complete
 */

// In-memory storage
let mockMissions: Map<string, Mission> = new Map();
let mockSorties: Map<string, Sortie> = new Map();
let mockLocks: Map<string, Lock> = new Map();
let mockEvents: Event[] = [];
let mockCheckpoints: Map<string, Checkpoint> = new Map();

/**
 * Mock MissionOps implementation
 */
export const mockMissionOps: MissionOps = {
  async create(input: CreateMissionInput): Promise<Mission> {
    const mission: Mission = {
      id: `msn-${crypto.randomUUID().slice(0, 8)}`,
      title: input.title,
      description: input.description,
      status: 'pending',
      priority: input.priority || 'medium',
      created_at: new Date().toISOString(),
      total_sorties: 0,
      completed_sorties: 0
    };
    mockMissions.set(mission.id, mission);
    return mission;
  },

  async getById(id: string): Promise<Mission | null> {
    return mockMissions.get(id) || null;
  },

  async start(id: string): Promise<Mission> {
    const mission = mockMissions.get(id);
    if (!mission) throw new Error('Mission not found');
    mission.status = 'in_progress';
    mission.started_at = new Date().toISOString();
    return mission;
  },

  async complete(id: string): Promise<Mission> {
    const mission = mockMissions.get(id);
    if (!mission) throw new Error('Mission not found');
    
    // Check all sorties complete
    const sorties = Array.from(mockSorties.values())
      .filter(s => s.mission_id === id);
    const incomplete = sorties.filter(s => s.status !== 'completed');
    if (incomplete.length > 0) {
      throw new Error('Cannot complete mission with incomplete sorties');
    }
    
    mission.status = 'completed';
    mission.completed_at = new Date().toISOString();
    return mission;
  },

  async list(filter?: MissionFilter): Promise<Mission[]> {
    let missions = Array.from(mockMissions.values());
    if (filter?.status) {
      missions = missions.filter(m => m.status === filter.status);
    }
    return missions;
  }
};

/**
 * Mock SortieOps implementation
 */
export const mockSortieOps: SortieOps = {
  async create(input: CreateSortieInput): Promise<Sortie> {
    const sortie: Sortie = {
      id: `srt-${crypto.randomUUID().slice(0, 8)}`,
      mission_id: input.mission_id,
      title: input.title,
      description: input.description,
      status: 'pending',
      priority: input.priority || 'medium',
      assigned_to: input.assigned_to,
      created_at: new Date().toISOString(),
      progress: 0
    };
    mockSorties.set(sortie.id, sortie);
    
    // Update mission sortie count
    if (input.mission_id) {
      const mission = mockMissions.get(input.mission_id);
      if (mission) mission.total_sorties++;
    }
    
    return sortie;
  },

  async getById(id: string): Promise<Sortie | null> {
    return mockSorties.get(id) || null;
  },

  async start(id: string, specialistId: string): Promise<Sortie> {
    const sortie = mockSorties.get(id);
    if (!sortie) throw new Error('Sortie not found');
    if (sortie.assigned_to && sortie.assigned_to !== specialistId) {
      throw new Error('Only assigned specialist can start sortie');
    }
    sortie.status = 'in_progress';
    sortie.started_at = new Date().toISOString();
    return sortie;
  },

  async progress(id: string, percent: number, notes?: string): Promise<Sortie> {
    if (percent < 0 || percent > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    const sortie = mockSorties.get(id);
    if (!sortie) throw new Error('Sortie not found');
    sortie.progress = percent;
    if (notes) sortie.progress_notes = notes;
    return sortie;
  },

  async complete(id: string): Promise<Sortie> {
    const sortie = mockSorties.get(id);
    if (!sortie) throw new Error('Sortie not found');
    sortie.status = 'completed';
    sortie.completed_at = new Date().toISOString();
    sortie.progress = 100;
    
    // Update mission completed count
    if (sortie.mission_id) {
      const mission = mockMissions.get(sortie.mission_id);
      if (mission) mission.completed_sorties++;
    }
    
    return sortie;
  },

  async getByMission(missionId: string): Promise<Sortie[]> {
    return Array.from(mockSorties.values())
      .filter(s => s.mission_id === missionId);
  }
};

/**
 * Mock LockOps implementation
 */
export const mockLockOps: LockOps = {
  async acquire(input: AcquireLockInput): Promise<LockResult> {
    // Check for existing lock
    const existing = Array.from(mockLocks.values())
      .find(l => l.file === input.file && l.status === 'active');
    
    if (existing) {
      return {
        conflict: true,
        existing_lock: existing
      };
    }

    const lock: Lock = {
      id: `lock-${crypto.randomUUID().slice(0, 8)}`,
      file: input.file,
      reserved_by: input.specialist_id,
      reserved_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + input.timeout_ms).toISOString(),
      status: 'active',
      purpose: input.purpose || 'edit'
    };
    mockLocks.set(lock.id, lock);
    return { conflict: false, lock };
  },

  async release(id: string, specialistId: string): Promise<Lock> {
    const lock = mockLocks.get(id);
    if (!lock) throw new Error('Lock not found');
    if (lock.reserved_by !== specialistId) {
      throw new Error('Only lock owner can release');
    }
    lock.status = 'released';
    lock.released_at = new Date().toISOString();
    return lock;
  },

  async getActive(): Promise<Lock[]> {
    const now = Date.now();
    return Array.from(mockLocks.values())
      .filter(l => l.status === 'active' && new Date(l.expires_at).getTime() > now);
  }
};

/**
 * Mock CheckpointOps implementation
 */
export const mockCheckpointOps: CheckpointOps = {
  async create(input: CreateCheckpointInput): Promise<Checkpoint> {
    const checkpoint: Checkpoint = {
      id: `chk-${crypto.randomUUID().slice(0, 8)}`,
      mission_id: input.mission_id,
      timestamp: new Date().toISOString(),
      trigger: input.trigger,
      trigger_details: input.trigger_details,
      progress_percent: input.progress_percent || 0,
      sorties: [],
      active_locks: [],
      pending_messages: [],
      recovery_context: {
        last_action: '',
        next_steps: [],
        blockers: [],
        files_modified: [],
        mission_summary: '',
        elapsed_time_ms: 0,
        last_activity_at: new Date().toISOString()
      },
      created_by: input.created_by,
      version: '1.0.0'
    };
    mockCheckpoints.set(checkpoint.id, checkpoint);
    return checkpoint;
  },

  async getById(id: string): Promise<Checkpoint | null> {
    return mockCheckpoints.get(id) || null;
  },

  async getLatest(missionId: string): Promise<Checkpoint | null> {
    const checkpoints = Array.from(mockCheckpoints.values())
      .filter(c => c.mission_id === missionId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return checkpoints[0] || null;
  },

  async listByMission(missionId: string): Promise<Checkpoint[]> {
    return Array.from(mockCheckpoints.values())
      .filter(c => c.mission_id === missionId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async delete(id: string): Promise<void> {
    mockCheckpoints.delete(id);
  }
};

/**
 * Reset all mock data
 */
export function resetMockDatabase(): void {
  mockMissions.clear();
  mockSorties.clear();
  mockLocks.clear();
  mockEvents = [];
  mockCheckpoints.clear();
}

/**
 * Seed mock database with test data
 */
export function seedMockDatabase(): void {
  // Create test mission
  const mission: Mission = {
    id: 'msn-test-001',
    title: 'Test Mission',
    status: 'in_progress',
    priority: 'high',
    created_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    total_sorties: 2,
    completed_sorties: 1
  };
  mockMissions.set(mission.id, mission);

  // Create test sorties
  const sortie1: Sortie = {
    id: 'srt-test-001',
    mission_id: mission.id,
    title: 'Completed Sortie',
    status: 'completed',
    priority: 'high',
    assigned_to: 'spec-1',
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    progress: 100
  };
  mockSorties.set(sortie1.id, sortie1);

  const sortie2: Sortie = {
    id: 'srt-test-002',
    mission_id: mission.id,
    title: 'In Progress Sortie',
    status: 'in_progress',
    priority: 'medium',
    assigned_to: 'spec-2',
    created_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    progress: 50,
    progress_notes: 'Working on auth'
  };
  mockSorties.set(sortie2.id, sortie2);
}
```

---

## 8. Success Criteria Checklist

### 8.1 Test Coverage

- [ ] All 86 tests passing
- [ ] Line coverage >= 95%
- [ ] Function coverage >= 95%
- [ ] Branch coverage >= 90%
- [ ] No uncovered critical paths

### 8.2 Functional Verification

- [ ] Automatic checkpoints at 25%, 50%, 75% progress
- [ ] Error-triggered checkpoints capture context
- [ ] Manual checkpoint command works
- [ ] Recovery detects stale missions
- [ ] Recovery restores sortie states
- [ ] Recovery re-acquires valid locks
- [ ] Recovery context injected into prompts
- [ ] CLI commands work in local and synced modes
- [ ] API endpoints return correct responses
- [ ] Cleanup prevents unbounded growth

### 8.3 Integration Verification

- [ ] Mock implementations pass contract tests
- [ ] Mocks can be swapped for real Phase 2 implementations
- [ ] Events flow through Squawk mailbox
- [ ] File backups sync with .flightline/

### 8.4 Performance Verification

- [ ] Checkpoint creation < 100ms (p95)
- [ ] Recovery < 500ms (p95)
- [ ] Non-blocking cleanup operations

---

## Appendix A: Running Tests

```bash
# Run all Phase 3 tests
bun test tests/unit/phase3 tests/integration/phase3

# Run with coverage
bun test --coverage tests/unit/phase3 tests/integration/phase3

# Run specific test file
bun test tests/unit/phase3/checkpoint/service.test.ts

# Run tests matching pattern
bun test --test-name-pattern "should create checkpoint"

---

## 5. Performance Benchmarks

### 5.1 Benchmarks by Component

| Component | Metric | Target | Test Method | Priority |
|-----------|---------|--------|-------------|----------|
| Checkpoint Creation | < 100ms p95 | Measure 100 checkpoints | P0 |
| Recovery (from checkpoint) | < 500ms p95 | Measure 100 recoveries | P0 |
| Progress Calculation | < 10ms p95 | Measure 1000 calculations | P1 |
| Storage Write (SQLite) | < 5ms p95 | Measure 1000 writes | P0 |
| Storage Write (File) | < 200ms p95 | Measure 1000 writes | P0 |

### 5.2 Benchmark Test Structure

```typescript
// tests/benchmark/checkpoint-creation.bench.ts

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createTestDatabase } from '../helpers/test-sqlite';
import { createCheckpointFixture } from '../setup';

describe('Checkpoint Creation Performance Benchmark', () => {
  let db: Database;
  const CHECKPOINT_COUNT = 100;
  const P95_THRESHOLD_MS = 100;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    db.close();
  });

  it('create 100 checkpoints with p95 < 100ms', async () => {
    const durations: number[] = [];
    
    for (let i = 0; i < CHECKPOINT_COUNT; i++) {
      const mission = await db.missions.create({ title: `Benchmark Mission ${i}` });
      const sorties = await db.sorties.create({
        mission_id: mission.id,
        title: `Sortie ${i}`,
        status: 'completed',
        progress: 100,
      });
      await db.missions.start(mission.id);
      
      const start = performance.now();
      await db.checkpoints.create({
        mission_id: mission.id,
        trigger: 'progress',
        created_by: 'bench-test',
      });
      const duration = performance.now() - start;
      durations.push(duration);
    }

    // Calculate p95 (95th percentile)
    const sorted = durations.sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index];
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    console.log(`Checkpoint Creation Performance:`);
    console.log(`  Average: ${avg.toFixed(2)}ms`);
    console.log(`  P95: ${p95.toFixed(2)}ms`);
    console.log(`  Min: ${Math.min(...durations).toFixed(2)}ms`);
    console.log(`  Max: ${Math.max(...durations).toFixed(2)}ms`);

    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
    expect(avg).toBeLessThan(P95_THRESHOLD_MS);
  });
});
```

### 5.3 Recovery Performance

```typescript
// tests/benchmark/recovery.bench.ts

describe('Recovery Performance Benchmark', () => {
  it('recover from 100 checkpoints with p95 < 500ms', async () => {
    const db = createTestDatabase();
    const checkpoints = [];
    
    // Create 100 checkpoints
    for (let i = 0; i < 100; i++) {
      const mission = await db.missions.create({ title: `Mission ${i}` });
      const checkpoint = await db.checkpoints.create({
        mission_id: mission.id,
        trigger: 'progress',
        created_by: 'bench-test',
      });
      checkpoints.push(checkpoint);
    }
    
    const durations = [];
    for (const checkpoint of checkpoints) {
      const start = performance.now();
      await db.recoveries.restore(checkpoint.id);
      const duration = performance.now() - start;
      durations.push(duration);
    }
    
    const sorted = durations.sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index];
    
    console.log(`Recovery Performance: P95=${p95.toFixed(2)}ms`);
    expect(p95).toBeLessThan(500);
  });
});
```

---

## 6. Edge Cases

### 6.1 Checkpoint Edge Cases

| Scenario | Expected Behavior | Test ID |
|----------|-------------------|----------|
| Corrupted Checkpoint File | Invalid JSON detected, fallback to SQLite | EDGE-001 |
| Checkpoint File Missing | SQLite record only, warning logged | EDGE-002 |
| SQLite Record Missing | File backup only, warning logged | EDGE-003 |
| Both Missing | Error with recovery options, no recovery | EDGE-004 |
| Schema Version Mismatch | Migration run before loading | EDGE-005 |
| Lock Conflict | Lock held by another agent | Added to blockers | EDGE-006 |
| Expired Checkpoint | TTL passed, skip checkpoint | EDGE-007 |
| Large Checkpoint | >100 sorties, performance warning | EDGE-008 |

### 6.2 Edge Case Test Structure

```typescript
// tests/unit/phase3/edge-cases/corrupted-checkpoint.test.ts

describe('Corrupted Checkpoint Handling', () => {
  it('should handle invalid JSON in file backup', async () => {
    const testDb = createTestDatabase();
    const fileStore = createFileStore();
    
    // Simulate corrupted file backup
    await writeFile(
      getCheckpointPath('msn-test-001'),
      'INVALID JSON {',
      'utf-8'
    );
    
    // Should fall back to SQLite record
    const service = new CheckpointService({
      checkpointOps: testDb.checkpoints,
      fileStore,
      db: testDb,
    });
    
    const checkpoint = await service.getLatest('msn-test-001');
    expect(checkpoint).toBeDefined();
    // Should have logged warning
  });
});
```

```typescript
// tests/unit/phase3/edge-cases/lock-conflict.test.ts

describe('Lock Conflict During Recovery', () => {
  it('should add lock conflict to blockers', async () => {
    const testDb = createTestDatabase();
    
    // Create checkpoint with active lock
    const lock = await testDb.locks.acquire({
      file: '/test/file.ts',
      specialist_id: 'spec-1',
      timeout_ms: 30000,
    });
    
    const checkpoint = await testDb.checkpoints.create({
      mission_id: 'msn-test',
      trigger: 'progress',
      sorties: [],
      active_locks: [lock],
    });
    
    // Another agent tries to acquire lock
    const conflictLock = await testDb.locks.acquire({
      file: '/test/file.ts',
      specialist_id: 'spec-2',
      timeout_ms: 30000,
    });
    
    const service = new RecoveryService({
      db: testDb,
      checkpointOps: testDb.checkpoints,
    });
    
    const result = await service.restore(checkpoint.id);
    
    expect(result.success).toBe(true);
    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0]).toContain('Lock held by another agent');
  });
});
```

---

## 7. Contract Tests

### 7.1 Missing Contract Tests

| Interface | Missing Tests | Priority |
|-----------|----------------|----------|
| `CheckpointOps` | `getPrunable()` logic | P1 |
| `CheckpointOps` | `deleteMany()` bulk operations | P1 |
| `CheckpointOps` | `markConsumed()` TTL tracking | P1 |
| `RecoveryService` | `restore()` idempotency | P0 |
| `RecoveryService` | Lock conflict resolution | P0 |

---

## 8. Test Utilities

### 8.1 Recovery Test Utilities

```typescript
// tests/helpers/recovery-utils.ts

export function createRecoveryScenario(
  sorties: Sortie[],
  locks: Lock[],
  messages: Message[]
): { mission: Mission; checkpoint: Checkpoint } {
  const mission = createTestMission();
  const checkpoint = createTestCheckpoint({
    mission_id: mission.id,
    sorties,
    active_locks: locks,
    pending_messages: messages,
  });
  
  return { mission, checkpoint };
}

export function simulatePartialFailure(): Checkpoint {
  return createTestCheckpoint({
    trigger: 'error',
    trigger_details: 'Simulated partial failure',
    recovery_context: createTestRecoveryContext({
      last_action: 'Error occurred',
      blockers: ['Simulated error'],
    }),
  });
}

export function createTestRecoveryContext(
  overrides?: Partial<RecoveryContext>
): RecoveryContext {
  return {
    last_action: 'Test action',
    next_steps: ['Step 1', 'Step 2'],
    blockers: [],
    files_modified: ['/test/file1.ts', '/test/file2.ts'],
    mission_summary: 'Test mission',
    elapsed_time_ms: 60000,
    last_activity_at: new Date().toISOString(),
    ...overrides,
  };
}

export function verifyRecoveryContext(
  context: RecoveryContext,
  expectedActions: string[]
): void {
  expect(context.next_steps).toEqual(expectedActions);
  expect(context.blockers.length).toBe(0);
  expect(context.files_modified).toBeDefined();
}
```

### 8.2 Performance Utilities

```typescript
// tests/helpers/performance.ts

export class PerformanceTimer {
  private marks: Map<string, number> = new Map();

  start(markName: string): void {
    this.marks.set(markName, performance.now());
  }

  end(markName: string): number {
    const startTime = this.marks.get(markName);
    if (!startTime) throw new Error(`No start mark for ${markName}`);

    const duration = performance.now() - startTime;
    this.marks.delete(markName);
    return duration;
  }

  measure<T>(markName: string, fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    this.start(markName);

    try {
      const result = await fn();
      const duration = this.end(markName);

      return { result, duration };
    } catch (error) {
      this.end(markName);
      throw error;
    }
  }

  report(): void {
    const report = Array.from(this.marks.entries())
      .map(([name, start]) => [name, start])
      .filter(([_, start]) => start !== undefined);

    if (report.length === 0) {
      console.log('No active performance timers');
      return;
    }

    console.log('\n=== Performance Report ===\n');
    for (const [name, start] of report) {
      const duration = performance.now() - start;
      console.log(`${name}: ${duration.toFixed(2)}ms`);
    }
    console.log('========================\n');
  }
}

export function assertPerformance(
  operation: string,
  duration: number,
  maxDurationMs: number
): void {
  if (duration > maxDurationMs) {
    throw new Error(
      `${operation} exceeded performance threshold: ${duration}ms > ${maxDurationMs}ms`
    );
  }
}

export function calculateStats(values: number[]): {
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;

  if (values.length === 0) {
    return { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const avg = sum / values.length;
  const min = sorted[0];
  const max = sorted[values.length - 1];

  const p50Index = Math.floor(sorted.length * 0.50);
  const p95Index = Math.floor(sorted.length * 0.95);
  const p99Index = Math.floor(sorted.length * 0.99);

  return {
    avg,
    min,
    max,
    p50: sorted[p50Index],
    p95: sorted[p95Index],
    p99: sorted[p99Index],
  };
}
```

---

## 4. Test Fixtures

### 4.1 Fixture File Structure

Test fixtures provide consistent, reproducible test data for checkpoint and recovery scenarios.

```
tests/fixtures/phase3/
├── checkpoint-sample.json         # Sample checkpoint structure
├── recovery-context-sample.json  # Sample recovery context
├── multiple-checkpoints.json      # Multiple checkpoints for same mission
└── edge-cases/
    ├── expired-checkpoint.json
    ├── corrupted-checkpoint.json
    ├── missing-dependencies.json
    └── lock-conflict-checkpoint.json
```

### 4.2 Sample Checkpoint Fixtures

#### Full Checkpoint Example
```json
{
  "id": "chk-sample-001",
  "mission_id": "msn-test-001",
  "timestamp": "2026-01-04T12:00:00.000Z",
  "trigger": "progress",
  "trigger_details": "Reached 50% milestone",
  "progress_percent": 50,
  "sorties": [
    {
      "id": "srt-001",
      "status": "completed",
      "assigned_to": "spec-1",
      "files": ["src/auth.ts"],
      "progress": 100,
      "progress_notes": "Completed auth implementation",
      "started_at": "2026-01-04T11:00:00.000Z",
      "completed_at": "2026-01-04T11:30:00.000Z"
    },
    {
      "id": "srt-002",
      "status": "in_progress",
      "assigned_to": "spec-2",
      "files": ["src/api.ts"],
      "progress": 50,
      "progress_notes": "Adding GET /users endpoint",
      "started_at": "2026-01-04T11:35:00.000Z"
    },
    {
      "id": "srt-003",
      "status": "pending",
      "files": ["tests/users.test.ts"],
      "progress": 0
    },
    {
      "id": "srt-004",
      "status": "pending",
      "files": ["tests/api.test.ts"]
    }
  ],
  "active_locks": [
    {
      "id": "lock-001",
      "file": "/src/auth.ts",
      "normalized_path": "/home/project/src/auth.ts",
      "held_by": "spec-2",
      "acquired_at": "2026-01-04T11:30:00.000Z",
      "expires_at": "2026-01-04T12:00:00.000Z",
      "purpose": "edit",
      "timeout_ms": 30000
    },
    {
      "id": "lock-002",
      "file": "/src/api.ts",
      "normalized_path": "/home/project/src/api.ts",
      "held_by": "spec-2",
      "acquired_at": "2026-01-04T11:35:00.000Z",
      "expires_at": "2026-01-04T12:05:00.000Z",
      "purpose": "edit",
      "timeout_ms": 30000
    }
  ],
  "pending_messages": [],
  "recovery_context": {
    "last_action": "Specialist-2 implementing API routes",
    "next_steps": [
      "Complete routes.ts implementation",
      "Write unit tests"
    ],
    "blockers": [],
    "files_modified": ["src/auth.ts", "src/api.ts"],
    "mission_summary": "Implementing user authentication feature",
    "elapsed_time_ms": 3600000,
    "last_activity_at": "2026-01-04T11:55:00.000Z"
  },
  "created_by": "dispatch-001",
  "version": "1.0.0"
}
```

---

## Appendix B: Test Fixtures

### checkpoint-sample.json

```json
{
  "id": "chk-sample-001",
  "mission_id": "msn-test-001",
  "timestamp": "2026-01-04T12:00:00.000Z",
  "trigger": "progress",
  "trigger_details": "Reached 50% milestone",
  "progress_percent": 50,
  "sorties": [
    {
      "id": "srt-001",
      "status": "completed",
      "assigned_to": "spec-1",
      "files": ["src/auth.ts"],
      "started_at": "2026-01-04T11:00:00.000Z",
      "progress_notes": "Completed auth implementation"
    },
    {
      "id": "srt-002",
      "status": "in_progress",
      "assigned_to": "spec-2",
      "files": ["src/api.ts"],
      "started_at": "2026-01-04T11:30:00.000Z",
      "progress_notes": "Working on API routes"
    }
  ],
  "active_locks": [
    {
      "id": "lock-001",
      "file": "src/api.ts",
      "held_by": "spec-2",
      "acquired_at": "2026-01-04T11:30:00.000Z",
      "purpose": "edit",
      "timeout_ms": 30000
    }
  ],
  "pending_messages": [],
  "recovery_context": {
    "last_action": "Specialist-2 implementing API routes",
    "next_steps": [
      "Complete API routes implementation",
      "Write integration tests"
    ],
    "blockers": [],
    "files_modified": ["src/auth.ts", "src/api.ts"],
    "mission_summary": "Implementing user authentication feature",
    "elapsed_time_ms": 3600000,
    "last_activity_at": "2026-01-04T12:00:00.000Z"
  },
  "created_by": "dispatch-001",
  "version": "1.0.0"
}
```

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-01-04  
**Author:** Documentation Specialist
