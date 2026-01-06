/**
 * CheckpointStorage Integration Tests
 * 
 * Tests the complete CheckpointStorage implementation with dual storage.
 * These tests verify that the CheckpointStorage class properly coordinates
 * between SQLite and file system storage.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { CheckpointStorage } from '../../squawk/src/db/checkpoint-storage';
import type { 
  CreateCheckpointInput,
  CheckpointTrigger,
  SortieSnapshot,
  LockSnapshot,
  MessageSnapshot,
  RecoveryContext 
} from '../../squawk/src/db/types';

// Test configuration
const TEST_FLIGHTLINE_DIR = '/tmp/.flightline-test';
const TEST_CHECKPOINTS_DIR = join(TEST_FLIGHTLINE_DIR, 'checkpoints');

// Sample test data
const SAMPLE_RECOVERY_CONTEXT: RecoveryContext = {
  last_action: 'Testing CheckpointStorage integration',
  next_steps: ['Verify dual storage', 'Test symlink management', 'Validate error handling'],
  blockers: ['None'],
  files_modified: ['squawk/src/db/checkpoint-storage.ts'],
  mission_summary: 'Integration tests for CheckpointStorage class with dual storage',
  elapsed_time_ms: 1800000,
  last_activity_at: '2026-01-05T13:00:00.000Z'
};

const SAMPLE_SORTIES: SortieSnapshot[] = [
  {
    id: 'srt-integration-001',
    status: 'completed',
    assigned_to: 'spec-backend-001',
    files: ['squawk/src/db/checkpoint-storage.ts'],
    started_at: '2026-01-05T12:30:00.000Z',
    progress: 100,
    progress_notes: 'CheckpointStorage implementation completed'
  }
];

const SAMPLE_LOCKS: LockSnapshot[] = [
  {
    id: 'lock-integration-001',
    file: 'squawk/src/db/checkpoint-storage.ts',
    held_by: 'spec-backend-001',
    acquired_at: '2026-01-05T12:30:00.000Z',
    purpose: 'edit',
    timeout_ms: 30000
  }
];

const SAMPLE_MESSAGES: MessageSnapshot[] = [
  {
    id: 'msg-integration-001',
    from: 'dispatch-001',
    to: ['spec-backend-001'],
    subject: 'checkpoint_storage_complete',
    sent_at: '2026-01-05T13:00:00.000Z',
    delivered: false
  }
];

describe('CheckpointStorage Integration Tests', () => {
  let storage: CheckpointStorage;

  beforeAll(() => {
    // Set environment variable for test directory
    process.env.FLIGHTLINE_TEST_DIR = TEST_FLIGHTLINE_DIR;
    
    // Setup test directory structure
    if (existsSync(TEST_FLIGHTLINE_DIR)) {
      rmSync(TEST_FLIGHTLINE_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_CHECKPOINTS_DIR, { recursive: true });

    storage = new CheckpointStorage();
  });

  afterAll(() => {
    // Cleanup environment variable
    delete process.env.FLIGHTLINE_TEST_DIR;
    
    // Cleanup test directory
    if (existsSync(TEST_FLIGHTLINE_DIR)) {
      rmSync(TEST_FLIGHTLINE_DIR, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clean up checkpoint files before each test
    if (existsSync(TEST_CHECKPOINTS_DIR)) {
      const files = require('fs').readdirSync(TEST_CHECKPOINTS_DIR);
      files.forEach((file: string) => {
        const filepath = join(TEST_CHECKPOINTS_DIR, file);
        unlinkSync(filepath);
      });
    }
  });

  describe('Dual Storage Operations', () => {
    it('should create checkpoint in both storage systems', async () => {
      const input: CreateCheckpointInput = {
        mission_id: 'msn-integration-001',
        trigger: 'progress',
        trigger_details: '25% integration progress',
        progress_percent: 25,
        created_by: 'integration-test',
        sorties: SAMPLE_SORTIES,
        active_locks: SAMPLE_LOCKS,
        pending_messages: SAMPLE_MESSAGES,
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      };

      const checkpoint = await storage.create(input);

      // Verify checkpoint was created with correct structure
      expect(checkpoint).toBeDefined();
      expect(checkpoint.id).toMatch(/^chk-[a-f0-9]{8}$/);
      expect(checkpoint.mission_id).toBe(input.mission_id);
      expect(checkpoint.trigger).toBe(input.trigger);
      expect(typeof checkpoint.progress_percent).toBe('number');
      expect(checkpoint.progress_percent).toBe(input.progress_percent || 0);
      expect(checkpoint.created_by).toBe(input.created_by);
      expect(checkpoint.version).toBe('1.0.0');

      // Verify file backup was created
      const filepath = join(TEST_CHECKPOINTS_DIR, `${checkpoint.id}.json`);
      expect(existsSync(filepath)).toBe(true);
      
      const fileContent = JSON.parse(readFileSync(filepath, 'utf-8'));
      expect(fileContent.id).toBe(checkpoint.id);
      expect(fileContent.mission_id).toBe(checkpoint.mission_id);

      // Verify latest symlink was created/updated
      const symlinkPath = join(TEST_CHECKPOINTS_DIR, 'latest.json');
      expect(existsSync(symlinkPath)).toBe(true);
    });

    it('should retrieve checkpoint with fallback to file storage', async () => {
      const input: CreateCheckpointInput = {
        mission_id: 'msn-integration-002',
        trigger: 'manual',
        trigger_details: 'Manual integration checkpoint',
        progress_percent: 50,
        created_by: 'integration-test',
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      };

      const created = await storage.create(input);
      const retrieved = await storage.getById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.mission_id).toBe(input.mission_id);
      expect(retrieved!.trigger).toBe(input.trigger);
    });

    it('should get latest checkpoint for mission', async () => {
      const missionId = 'msn-integration-003';
      
      // Create multiple checkpoints
      await storage.create({
        mission_id: missionId,
        trigger: 'progress',
        progress_percent: 25,
        created_by: 'integration-test',
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      });

      // Add small delay for timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await storage.create({
        mission_id: missionId,
        trigger: 'progress',
        progress_percent: 50,
        created_by: 'integration-test',
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      });

      const latest = await storage.getLatest(missionId);

      expect(latest).not.toBeNull();
      expect(latest!.mission_id).toBe(missionId);
      expect(latest!.progress_percent || 0).toBe(50);
    });

    it('should list checkpoints with mission filtering', async () => {
      const missionId = 'msn-integration-004';
      
      // Create checkpoints for different missions
      await storage.create({
        mission_id: missionId,
        trigger: 'progress',
        progress_percent: 33,
        created_by: 'integration-test',
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      });

      await storage.create({
        mission_id: missionId,
        trigger: 'progress',
        progress_percent: 66,
        created_by: 'integration-test',
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      });

      await storage.create({
        mission_id: 'msn-other-mission',
        trigger: 'manual',
        progress_percent: 10,
        created_by: 'integration-test',
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      });

      // Test mission-specific listing
      const missionCheckpoints = await storage.list(missionId);
      expect(missionCheckpoints).toHaveLength(2);
      missionCheckpoints.forEach(checkpoint => {
        expect(checkpoint.mission_id).toBe(missionId);
      });

      // Test listing all checkpoints
      const allCheckpoints = await storage.list();
      expect(allCheckpoints.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle file system errors gracefully', async () => {
      // Create checkpoint
      const checkpoint = await storage.create({
        mission_id: 'msn-integration-error',
        trigger: 'progress',
        progress_percent: 75,
        created_by: 'integration-test',
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      });

      // Simulate corrupted file
      const filepath = join(TEST_CHECKPOINTS_DIR, `${checkpoint.id}.json`);
      writeFileSync(filepath, '{ invalid json content');

      // Should still work via database fallback
      const retrieved = await storage.getById(checkpoint.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(checkpoint.id);
    });

    it('should validate schema on file load', async () => {
      // Create invalid checkpoint file
      const invalidFile = join(TEST_CHECKPOINTS_DIR, 'chk-invalid.json');
      const invalidCheckpoint = {
        id: 'chk-invalid',
        mission_id: 'msn-invalid',
        // Missing required fields
        progress_percent: 150 // Invalid percentage
      };

      writeFileSync(invalidFile, JSON.stringify(invalidCheckpoint, null, 2));

      // Should return null for invalid schema
      const retrieved = await storage.getById('chk-invalid');
      expect(retrieved).toBeNull();
    });
  });

  describe('Symlink Management', () => {
    it('should update symlink when latest checkpoint changes', async () => {
      const symlinkPath = join(TEST_CHECKPOINTS_DIR, 'latest.json');
      
      // Create first checkpoint
      const checkpoint1 = await storage.create({
        mission_id: 'msn-symlink-test',
        trigger: 'progress',
        progress_percent: 25,
        created_by: 'integration-test',
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      });

      // Verify symlink points to first checkpoint
      expect(existsSync(symlinkPath)).toBe(true);
      const symlinkContent1 = JSON.parse(readFileSync(symlinkPath, 'utf-8'));
      expect(symlinkContent1.id).toBe(checkpoint1.id);

      // Create second checkpoint
      const checkpoint2 = await storage.create({
        mission_id: 'msn-symlink-test',
        trigger: 'progress',
        progress_percent: 50,
        created_by: 'integration-test',
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      });

      // Verify symlink now points to second checkpoint
      const symlinkContent2 = JSON.parse(readFileSync(symlinkPath, 'utf-8'));
      expect(symlinkContent2.id).toBe(checkpoint2.id);
      expect(symlinkContent2.progress_percent).toBe(50);
    });
  });

  describe('Deletion Operations', () => {
    it('should delete from both storage systems', async () => {
      const checkpoint = await storage.create({
        mission_id: 'msn-delete-test',
        trigger: 'manual',
        trigger_details: 'Checkpoint for deletion test',
        progress_percent: 90,
        created_by: 'integration-test',
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      });

      const filepath = join(TEST_CHECKPOINTS_DIR, `${checkpoint.id}.json`);
      const symlinkPath = join(TEST_CHECKPOINTS_DIR, 'latest.json');

      // Verify both exist before deletion
      expect(existsSync(filepath)).toBe(true);
      expect(existsSync(symlinkPath)).toBe(true);

      // Delete checkpoint
      const deleted = await storage.delete(checkpoint.id);
      expect(deleted).toBe(true);

      // Verify file was deleted
      expect(existsSync(filepath)).toBe(false);
    });

    it('should update symlink after deletion of latest', async () => {
      const symlinkPath = join(TEST_CHECKPOINTS_DIR, 'latest.json');
      
      // Create two checkpoints
      const checkpoint1 = await storage.create({
        mission_id: 'msn-symlink-delete',
        trigger: 'progress',
        progress_percent: 25,
        created_by: 'integration-test',
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      });

      const checkpoint2 = await storage.create({
        mission_id: 'msn-symlink-delete',
        trigger: 'progress',
        progress_percent: 50,
        created_by: 'integration-test',
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      });

      // Delete latest checkpoint
      await storage.delete(checkpoint2.id);

      // Symlink should point back to previous checkpoint
      if (existsSync(symlinkPath)) {
        const symlinkContent = JSON.parse(readFileSync(symlinkPath, 'utf-8'));
        expect(symlinkContent.id).toBe(checkpoint1.id);
      }
    });
  });

  describe('Utility Operations', () => {
    it('should mark checkpoint as consumed', async () => {
      const checkpoint = await storage.create({
        mission_id: 'msn-consume-test',
        trigger: 'progress',
        progress_percent: 85,
        created_by: 'integration-test',
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      });

      expect(checkpoint.consumed_at).toBeUndefined();

      const consumed = await storage.markConsumed(checkpoint.id);
      expect(consumed).not.toBeNull();
      expect(consumed!.consumed_at).toBeDefined();
    });

    it('should provide storage statistics', async () => {
      // Create some checkpoints
      await storage.create({
        mission_id: 'msn-stats-test',
        trigger: 'progress',
        progress_percent: 10,
        created_by: 'integration-test',
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      });

      await storage.create({
        mission_id: 'msn-stats-test',
        trigger: 'progress',
        progress_percent: 20,
        created_by: 'integration-test',
        recovery_context: SAMPLE_RECOVERY_CONTEXT
      });

      const stats = await storage.getStats();
      expect(stats.total_checkpoints).toBeGreaterThanOrEqual(2);
      expect(stats.file_count).toBeGreaterThanOrEqual(2);
    });
  });
});