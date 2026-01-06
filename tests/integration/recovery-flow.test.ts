/**
 * E2E Recovery Flow Tests (REC-005)
 * 
 * Tests the complete recovery workflow from detection through restoration
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { RecoveryDetector } from '../../squawk/src/recovery/detector';
import { StateRestorer } from '../../squawk/src/recovery/restorer';
import { CheckpointStorage } from '../../squawk/src/db/checkpoint-storage';
import { initializeDatabase, getAdapter, closeDatabase } from '../../squawk/src/db/index';
import { createMockAdapter } from '../helpers/mock-database';
import type { RecoveryCandidate } from '../../squawk/src/recovery/types';

describe('E2E Recovery Flow Tests (REC-005)', () => {
  let db: any;
  let detector: RecoveryDetector;
  let restorer: StateRestorer;
  let checkpointStorage: CheckpointStorage;
  let tempDir: string;

  beforeEach(async () => {
    // Use in-memory database for testing
    tempDir = await createTempDir();
    await initializeDatabase(':memory:');
    db = getAdapter();
    
    detector = new RecoveryDetector(db);
    restorer = new StateRestorer(db);
    checkpointStorage = new CheckpointStorage(':memory:', db);
  });

  afterEach(async () => {
    await closeDatabase();
    await cleanupTempDir(tempDir);
  });

  describe('Full Recovery Workflow', () => {
    test('should recover from checkpoint when recovery is needed', async () => {
      // Setup mission with stale activity
      const missionId = 'test-mission-e2e';
      await db.missions.create({
        id: missionId,
        title: 'E2E Recovery Test Mission',
        status: 'in_progress',
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        total_sorties: 5,
        completed_sorties: 2,
        priority: 'high'
      });

      // Add stale events to simulate inactivity
      await db.events.append({
        event_type: 'mission_started',
        stream_type: 'mission',
        stream_id: missionId,
        data: { action: 'start_mission', specialist_id: 'test-agent' },
        occurred_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      });

      // Create checkpoint with progress
      const checkpoint = await checkpointStorage.create({
        mission_id: missionId,
        trigger: 'progress',
        trigger_details: 'Checkpoint for E2E recovery test',
        progress_percent: 40,
        sorties: [
          {
            id: 'srt-e2e-1',
            status: 'in_progress',
            assigned_to: 'test-agent',
            files: ['src/component1.ts'],
            started_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
            progress: 60,
            progress_notes: 'Working on component 1'
          },
          {
            id: 'srt-e2e-2',
            status: 'completed',
            assigned_to: 'test-agent',
            files: ['src/component2.ts'],
            started_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
            progress: 100,
            progress_notes: 'Completed component 2'
          }
        ],
        active_locks: [
          {
            id: 'lock-e2e-1',
            file: 'src/shared.ts',
            held_by: 'test-agent',
            acquired_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            purpose: 'edit',
            timeout_ms: 300000
          }
        ],
        recovery_context: {
          last_action: 'Working on component 1',
          next_steps: ['Complete component 1', 'Start component 2'],
          blockers: [],
          files_modified: ['src/component1.ts', 'src/shared.ts'],
          mission_summary: 'E2E Recovery Test Mission',
          elapsed_time_ms: 8 * 60 * 1000,
          last_activity_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
        }
      });

      // Check for recovery
      const recovery = await detector.checkForRecovery({ activityThresholdMs: 5 * 60 * 1000 });
      expect(recovery.needed).toBe(true);
      expect(recovery.candidates).toHaveLength(1);
      expect(recovery.candidates[0].mission_id).toBe(missionId);
      expect(recovery.candidates[0].checkpoint_id).toBe(checkpoint.id);

      // Perform recovery
      const restoreResult = await restorer.restoreFromCheckpoint(checkpoint.id);
      
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.mission_id).toBe(missionId);
      expect(restoreResult.restored.sorties).toBe(2);
      expect(restoreResult.restored.locks).toBe(1);
      expect(restoreResult.recovery_context.next_steps).toContain('Complete component 1');
      expect(restoreResult.recovery_context.next_steps).toContain('Start component 2');
    });

    test('should handle recovery when no checkpoint exists', async () => {
      // Setup mission without checkpoint
      const missionId = 'test-mission-no-checkpoint';
      await db.missions.create({
        id: missionId,
        title: 'Mission Without Checkpoint',
        status: 'in_progress',
        created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        total_sorties: 3,
        completed_sorties: 1,
        priority: 'medium'
      });

      // Add stale event
      await db.events.append({
        event_type: 'mission_stalled',
        stream_type: 'mission',
        stream_id: missionId,
        data: { reason: 'external_blocker', details: 'Context compaction' },
        occurred_at: new Date(Date.now() - 12 * 60 * 1000).toISOString()
      });

      // Check for recovery
      const recovery = await detector.checkForRecovery({ activityThresholdMs: 5 * 60 * 1000 });
      
      expect(recovery.needed).toBe(false);
      expect(recovery.candidates).toHaveLength(0);
    });

    test('should handle concurrent recovery scenarios', async () => {
      // Setup mission with multiple checkpoints
      const missionId = 'test-mission-concurrent';
      
      // Create initial state
      await db.missions.create({
        id: missionId,
        title: 'Concurrent Recovery Test Mission',
        status: 'in_progress',
        created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        total_sorties: 8,
        completed_sorties: 3,
        priority: 'high'
      });

      // Create multiple checkpoints
      const checkpoint1 = await checkpointStorage.create({
        mission_id: missionId,
        trigger: 'progress',
        progress_percent: 25,
        sorties: [
          { id: 'srt-concurrent-1', status: 'completed', files: ['src/api.ts'] },
          { id: 'srt-concurrent-2', status: 'in_progress', files: ['src/service.ts'] }
        ],
        recovery_context: { last_action: 'API endpoint completed' }
      });

      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay

      const checkpoint2 = await checkpointStorage.create({
        mission_id: missionId,
        trigger: 'manual',
        progress_percent: 75,
        sorties: [
          { id: 'srt-concurrent-2', status: 'completed', files: ['src/service.ts'] },
          { id: 'srt-concurrent-3', status: 'in_progress', files: ['src/ui.ts'] }
        ],
        recovery_context: { last_action: 'Manual checkpoint creation' }
      });

      // Check for recovery (should pick latest)
      const recovery = await detector.checkForRecovery({ activityThresholdMs: 5 * 60 * 1000 });
      expect(recovery.needed).toBe(true);
      expect(recovery.candidates).toHaveLength(1);
      expect(recovery.candidates[0].checkpoint_id).toBe(checkpoint2.id); // Latest checkpoint

      // Perform recovery
      const restoreResult = await restorer.restoreLatest(missionId);
      
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restored.sorties).toBe(3);
      expect(restoreResult.restored.locks).toBe(0); // No locks in checkpoint2
      expect(restoreResult.recovery_context.next_steps).toContain('Continue work on concurrent sorties');
    });

    test('should handle lock conflicts during recovery', async () => {
      // Setup mission with conflicting lock
      const missionId = 'test-mission-lock-conflict';
      
      await db.missions.create({
        id: missionId,
        title: 'Lock Conflict Test Mission',
        status: 'in_progress',
        created_at: new Date().toISOString()
      });

      // Create checkpoint with active lock
      const checkpoint = await checkpointStorage.create({
        mission_id: missionId,
        trigger: 'progress',
        progress_percent: 50,
        sorties: [
          { id: 'srt-lock-1', status: 'in_progress', files: ['src/locked-file.ts'] }
        ],
        active_locks: [
          {
            id: 'lock-conflict-1',
            file: 'src/locked-file.ts',
            held_by: 'other-agent',
            acquired_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            purpose: 'edit',
            timeout_ms: 300000
          }
        ],
        recovery_context: { last_action: 'Working on locked file' }
      });

      // Simulate lock conflict by creating conflicting lock
      await db.locks.acquire({
        file: 'src/locked-file.ts',
        specialist_id: 'conflicting-agent',
        timeout_ms: 300000,
        purpose: 'edit'
      });

      // Attempt recovery (should handle conflict)
      const restoreResult = await restorer.restoreFromCheckpoint(checkpoint.id, { forceLocks: false });
      
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restored.sorties).toBe(1);
      expect(restoreResult.restored.locks).toBe(0); // Conflict prevented lock restoration
      expect(restoreResult.warnings).toContain('Lock conflict');
      expect(restoreResult.recovery_context.blockers).toContain('Lock conflict on src/locked-file.ts');
    });

    test('should handle expired locks gracefully', async () => {
      // Setup mission with expired lock
      const missionId = 'test-mission-expired-lock';
      
      await db.missions.create({
        id: missionId,
        title: 'Expired Lock Test Mission',
        status: 'in_progress',
        created_at: new Date().toISOString()
      });

      // Create checkpoint with expired lock
      const checkpoint = await checkpointStorage.create({
        mission_id: missionId,
        trigger: 'progress',
        progress_percent: 60,
        sorties: [
          { id: 'srt-expired-1', status: 'completed', files: ['src/expired.ts'] }
        ],
        active_locks: [
          {
            id: 'lock-expired-1',
            file: 'src/expired.ts',
            held_by: 'test-agent',
            acquired_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 minutes ago
            purpose: 'edit',
            timeout_ms: 900000 // 15 minutes timeout
          }
        ],
        recovery_context: { last_action: 'Completed expired lock task' }
      });

      // Attempt recovery
      const restoreResult = await restorer.restoreFromCheckpoint(checkpoint.id);
      
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restored.sorties).toBe(1);
      expect(restoreResult.restored.locks).toBe(0); // Expired lock not restored
      expect(restoreResult.warnings).toContain('expired');
      expect(restoreResult.recovery_context.blockers).toContain('Expired lock');
    });

    test('should be idempotent on multiple restores', async () => {
      // Setup mission with checkpoint
      const missionId = 'test-mission-idempotent';
      
      const checkpoint = await checkpointStorage.create({
        mission_id: missionId,
        trigger: 'manual',
        progress_percent: 75,
        sorties: [
          { id: 'srt-idemp-1', status: 'completed', files: ['src/idempotent.ts'] }
        ],
        active_locks: [
          {
            id: 'lock-idempotent-1',
            file: 'src/idempotent.ts',
            held_by: 'test-agent',
            acquired_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            purpose: 'edit',
            timeout_ms: 300000
          }
        ],
        recovery_context: { last_action: 'Initial state captured' }
      });

      // First restore
      const restore1 = await restorer.restoreFromCheckpoint(checkpoint.id);
      
      // Second restore (should be idempotent)
      const restore2 = await restorer.restoreFromCheckpoint(checkpoint.id);
      
      expect(restore1.success).toBe(true);
      expect(restore2.success).toBe(true);
      expect(restore1.restored.sorties).toBe(restore2.restored.sorties);
      expect(restore1.restored.locks).toBe(restore2.restored.locks);
      expect(restore1.recovery_context).toEqual(restore2.recovery_context);
    });

    test('should emit fleet_recovered event', async () => {
      // Setup mission and checkpoint
      const missionId = 'test-mission-event-test';
      
      await db.missions.create({
        id: missionId,
        title: 'Event Emission Test Mission',
        status: 'in_progress',
        created_at: new Date().toISOString()
      });

      const checkpoint = await checkpointStorage.create({
        mission_id: missionId,
        trigger: 'manual',
        progress_percent: 90,
        sorties: [{ id: 'srt-event-1', status: 'completed', files: ['src/event-test.ts'] }],
        active_locks: [],
        recovery_context: { last_action: 'Ready for event testing' }
      });

      // Perform recovery
      const restoreResult = await restorer.restoreFromCheckpoint(checkpoint.id);
      
      expect(restoreResult.success).toBe(true);
      
      // Verify event was emitted
      const events = await db.events.queryByStream('mission', missionId);
      const recoveryEvent = events.find(e => e.event_type === 'fleet_recovered');
      
      expect(recoveryEvent).toBeDefined();
      expect(recoveryEvent.event_type).toBe('fleet_recovered');
      expect(recoveryEvent.data.checkpoint_id).toBe(checkpoint.id);
      expect(recoveryEvent.data.restored_at).toBeDefined();
      expect(recoveryEvent.data.sorties_restored).toBe(1);
    });
  });

  // Helper functions for test setup
  async function createTempDir(): Promise<string> {
    const fs = await import('node:fs/promises');
    const os = await import('node:os');
    const tmpdir = os.tmpdir();
    return await fs.mkdtemp('fleettools-test-');
  }

  async function cleanupTempDir(dir: string): Promise<void> {
    const fs = await import('node:fs/promises');
    await fs.rm(dir, { recursive: true, force: true });
  }
});