/**
 * Migration Tests - SQLite Data Migration Implementation
 * 
 * Tests for MIG-002: Complete SQLite data migration implementation
 * Tests migration from legacy JSON format to SQLite adapter
 */

import { beforeEach, afterEach, describe, it, expect, jest } from 'bun:test';
import { initializeDatabase, closeDatabase, getAdapter } from '../../squawk/src/db/index';
import { SQLiteAdapter } from '../../squawk/src/db/sqlite';
import fs from 'fs';
import path from 'path';

describe('SQLite Migration Tests', () => {
  let tempDir: string;
  let legacyJsonPath: string;
  let sqliteDbPath: string;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = `/tmp/fleet-test-${Date.now()}`;
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Create the fleet directory structure that the migration expects
    const fleetDir = path.join(tempDir, '.local', 'share', 'fleet');
    fs.mkdirSync(fleetDir, { recursive: true });
    
    legacyJsonPath = path.join(fleetDir, 'squawk.json');
    sqliteDbPath = path.join(tempDir, 'squawk.db'); // Keep SQLite DB in temp root for custom path
    
    // Copy schema file to temp directory to avoid path resolution issues
    const sourceSchemaPath = path.join(process.cwd(), 'squawk', 'src', 'db', 'schema.sql');
    const tempSchemaPath = path.join(tempDir, 'schema.sql');
    if (fs.existsSync(sourceSchemaPath)) {
      fs.copyFileSync(sourceSchemaPath, tempSchemaPath);
    }
  });

  /**
   * Helper to create SQLite adapter with proper schema path for tests
   */
  function createTestAdapter(dbPath: string): SQLiteAdapter {
    const schemaPath = path.join(tempDir, 'schema.sql');
    return new SQLiteAdapter(dbPath, schemaPath);
  }

  afterEach(async () => {
    // Cleanup temporary files
    await closeDatabase();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Migration Scenarios', () => {
    it('should migrate empty JSON file', async () => {
      // Arrange
      const emptyJson = {
        mailboxes: {},
        events: {},
        cursors: {},
        locks: {}
      };
      
      fs.writeFileSync(legacyJsonPath, JSON.stringify(emptyJson, null, 2));
      
      // Override environment for test
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;
      
      // Act
      await initializeDatabase(sqliteDbPath);
      
      // Restore environment
      process.env.HOME = originalHome;
      
      // Assert - Use the same adapter that was initialized during migration
      const adapter = getAdapter();
      
      // Verify database is empty but initialized
      const stats = await adapter.getStats();
      expect(stats.total_events).toBe(0);
      expect(stats.total_missions).toBe(0);
      expect(stats.active_locks).toBe(0);
      expect(stats.total_checkpoints).toBe(0);
      
      // Verify individual counts through direct queries
      const mailboxes = await (adapter as any).mailboxes.getAll();
      const cursors = await (adapter as any).cursors.getAll();
      const locks = await (adapter as any).locks.getAll();
      
      expect(mailboxes).toHaveLength(0);
      expect(cursors).toHaveLength(0);
      expect(locks).toHaveLength(0);
      
      // Verify backup was created
      const backupPath = legacyJsonPath + '.backup';
      expect(fs.existsSync(backupPath)).toBe(true);
      expect(fs.existsSync(legacyJsonPath)).toBe(false);
      
      await adapter.close();
    });

    it('should migrate JSON with mailboxes, events, cursors, and locks', async () => {
      // Arrange
      const testData = {
        mailboxes: {
          'mailbox-1': {
            id: 'mailbox-1',
            created_at: '2026-01-05T10:00:00Z',
            updated_at: '2026-01-05T10:30:00Z'
          },
          'mailbox-2': {
            id: 'mailbox-2',
            created_at: '2026-01-05T09:00:00Z',
            updated_at: '2026-01-05T09:15:00Z'
          }
        },
        events: {
          'mailbox-1': [
            {
              type: 'test_event',
              occurred_at: '2026-01-05T10:05:00Z',
              data: '{"message": "test message 1"}',
              causation_id: 'causation-1',
              correlation_id: 'correlation-1',
              metadata: '{"source": "test"}'
            },
            {
              type: 'test_event_2',
              occurred_at: '2026-01-05T10:10:00Z',
              data: {"message": "test message 2"},
              causation_id: 'causation-2',
              correlation_id: 'correlation-2'
            }
          ],
          'mailbox-2': [
            {
              type: 'other_event',
              occurred_at: '2026-01-05T09:05:00Z',
              data: '{"message": "other message"}'
            }
          ]
        },
        cursors: {
          'cursor-1': {
            id: 'cursor-1',
            stream_id: 'stream-1',
            position: 100,
            consumer_id: 'consumer-1'
          },
          'cursor-2': {
            stream_id: 'stream-2',
            position: 200
            // consumer_id will default to 'migrated'
          }
        },
        locks: {
          'lock-1': {
            id: 'lock-1',
            file: 'test.ts',
            reserved_by: 'specialist-1',
            timeout_ms: 30000,
            purpose: 'edit',
            checksum: 'checksum1',
            acquired_at: '2026-01-05T10:00:00Z'
            // No released_at - should be migrated (active lock)
          },
          'lock-2': {
            id: 'lock-2',
            file: 'other.ts',
            reserved_by: 'specialist-2',
            timeout_ms: 60000,
            purpose: 'delete',
            checksum: 'checksum2',
            acquired_at: '2026-01-05T09:00:00Z',
            released_at: '2026-01-05T09:30:00Z'
            // Has released_at - should NOT be migrated (released lock)
          }
        }
      };
      
      fs.writeFileSync(legacyJsonPath, JSON.stringify(testData, null, 2));
      
      // Override environment for test
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;
      
      // Act
      await initializeDatabase(sqliteDbPath);
      
      // Restore environment
      process.env.HOME = originalHome;
      
      // Assert - Use the same adapter that was initialized during migration
      const adapter = getAdapter();
      
      // Verify mailboxes
      const mailboxes = await (adapter as any).mailboxes.getAll();
      expect(mailboxes).toHaveLength(2);
      
      const mailbox1 = mailboxes.find(m => m.id === 'mailbox-1');
      const mailbox2 = mailboxes.find(m => m.id === 'mailbox-2');
      
      expect(mailbox1).toBeDefined();
      expect(mailbox1!.created_at).toBe('2026-01-05T10:00:00Z');
      expect(mailbox1!.updated_at).toBe('2026-01-05T10:30:00Z');
      
      expect(mailbox2).toBeDefined();
      expect(mailbox2!.created_at).toBe('2026-01-05T09:00:00Z');
      
      // Verify events
      const mailbox1Events = await (adapter as any).events.queryByStream('squawk', 'mailbox-1');
      const mailbox2Events = await (adapter as any).events.queryByStream('squawk', 'mailbox-2');
      
      expect(mailbox1Events).toHaveLength(2);
      expect(mailbox2Events).toHaveLength(1);
      
      const firstEvent = mailbox1Events.find((e: any) => e.event_type === 'test_event');
      expect(firstEvent).toBeDefined();
      expect(firstEvent!.data).toEqual({ message: 'test message 1' });
      expect(firstEvent!.causation_id).toBe('causation-1');
      expect(firstEvent!.correlation_id).toBe('correlation-1');
      expect(firstEvent!.metadata).toEqual({ source: 'test' });
      
      const secondEvent = mailbox1Events.find((e: any) => e.event_type === 'test_event_2');
      expect(secondEvent).toBeDefined();
      expect(secondEvent!.data).toEqual({ message: 'test message 2' });
      
      const otherEvent = mailbox2Events[0];
      expect(otherEvent.event_type).toBe('other_event');
      expect(otherEvent.data).toEqual({ message: 'other message' });
      
      // Verify cursors
      const cursors = await (adapter as any).cursors.getAll();
      expect(cursors).toHaveLength(2);
      
      const cursor1 = cursors.find((c: any) => c.id === 'cursor-1');
      expect(cursor1).toBeDefined();
      expect(cursor1!.stream_id).toBe('stream-1');
      expect(cursor1!.position).toBe(100);
      expect(cursor1!.consumer_id).toBe('consumer-1');
      
      const cursor2 = cursors.find((c: any) => c.stream_id === 'stream-2');
      expect(cursor2).toBeDefined();
      expect(cursor2!.position).toBe(200);
      expect(cursor2!.consumer_id).toBe('migrated'); // Default value
      
      // Verify locks (only active ones)
      const locks = await (adapter as any).locks.getAll();
      expect(locks).toHaveLength(1); // Only lock-1 should be migrated (lock-2 has released_at)
      
      const activeLock = locks[0];
      expect(activeLock.file).toBe('test.ts');
      expect(activeLock.reserved_by).toBe('specialist-1');
      expect(activeLock.purpose).toBe('edit');
      expect(activeLock.checksum).toBe('checksum1');
      
      // Verify backup was created
      const backupPath = legacyJsonPath + '.backup';
      expect(fs.existsSync(backupPath)).toBe(true);
      expect(fs.existsSync(legacyJsonPath)).toBe(false);
      
      await adapter.close();
    });

    it('should handle corrupted JSON gracefully', async () => {
      // Arrange
      const corruptedJson = '{"mailboxes": {"broken": }'; // Invalid JSON syntax
      fs.writeFileSync(legacyJsonPath, corruptedJson);
      
      // Override environment for test
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;
      
      // Act & Assert
      await expect(initializeDatabase(sqliteDbPath)).rejects.toThrow();
      
      // Verify original file still exists (backup not created on failure)
      expect(fs.existsSync(legacyJsonPath)).toBe(true);
      expect(fs.existsSync(legacyJsonPath + '.backup')).toBe(false);
      
      // Restore environment
      process.env.HOME = originalHome;
    });

    it('should skip migration if no JSON file exists', async () => {
      // Arrange - Don't create legacy JSON file
      // Override environment for test
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;
      
      // Act
      await initializeDatabase(sqliteDbPath);
      
      // Restore environment
      process.env.HOME = originalHome;
      
      // Assert - Use the same adapter that was initialized during migration
      const adapter = getAdapter();
      
      // Database should be initialized but empty
      const stats = await adapter.getStats();
      expect(stats.total_events).toBe(0);
      expect(stats.total_missions).toBe(0);
      expect(stats.active_locks).toBe(0);
      expect(stats.total_checkpoints).toBe(0);
      
      // No backup should be created since no original file
      expect(fs.existsSync(legacyJsonPath + '.backup')).toBe(false);
      
      await adapter.close();
    });

    it('should verify all data migrated correctly (counts match)', async () => {
      // Arrange
      const largeTestData = {
        mailboxes: {
          'mbox-1': { id: 'mbox-1', created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },
          'mbox-2': { id: 'mbox-2', created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },
          'mbox-3': { id: 'mbox-3', created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' }
        },
        events: {
          'mbox-1': [
            { type: 'e1', occurred_at: '2026-01-05T10:00:00Z', data: '{}' },
            { type: 'e2', occurred_at: '2026-01-05T10:01:00Z', data: '{}' }
          ],
          'mbox-2': [
            { type: 'e3', occurred_at: '2026-01-05T10:00:00Z', data: '{}' }
          ],
          'mbox-3': [] // Empty events array
        },
        cursors: {
          'cursor-1': { stream_id: 'stream-1', position: 10 },
          'cursor-2': { stream_id: 'stream-2', position: 20 },
          'cursor-3': { stream_id: 'stream-3', position: 30 },
          'cursor-4': { stream_id: 'stream-4', position: 40 }
        },
        locks: {
          'lock-active-1': { file: 'file1.ts', reserved_by: 'spec-1', timeout_ms: 30000 }, // Active
          'lock-active-2': { file: 'file2.ts', reserved_by: 'spec-2', timeout_ms: 30000 }, // Active
          'lock-released': { file: 'file3.ts', reserved_by: 'spec-3', timeout_ms: 30000, released_at: '2026-01-05T10:00:00Z' } // Released
        }
      };
      
      fs.writeFileSync(legacyJsonPath, JSON.stringify(largeTestData, null, 2));
      
      // Override environment for test
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;
      
      // Act
      await initializeDatabase(sqliteDbPath);
      
      // Restore environment
      process.env.HOME = originalHome;
      
      // Assert - Use the same adapter that was initialized during migration
      const adapter = getAdapter();
      
      // Count verification
      const mailboxes = await (adapter as any).mailboxes.getAll();
      const events: any[] = [];
      
      // Get events from each mailbox
      for (const mboxId of ['mbox-1', 'mbox-2', 'mbox-3']) {
        const mboxEvents = await (adapter as any).events.queryByStream('squawk', mboxId);
        events.push(...mboxEvents);
      }
      
      const cursors = await (adapter as any).cursors.getAll();
      const locks = await (adapter as any).locks.getAll();
      
      // Mailboxes: should migrate all 3
      expect(mailboxes).toHaveLength(3);
      
      // Events: should migrate all 3 events from mailboxes 1 & 2 (mailbox 3 has empty array)
      expect(events).toHaveLength(3);
      
      // Cursors: should migrate all 4
      expect(cursors).toHaveLength(4);
      
      // Locks: should migrate only 2 active locks (skip released one)
      expect(locks).toHaveLength(2);
      
      // Verify specific lock filtering
      const activeLockFiles = locks.map((l: any) => l.file);
      expect(activeLockFiles).toContain('file1.ts');
      expect(activeLockFiles).toContain('file2.ts');
      expect(activeLockFiles).not.toContain('file3.ts'); // Released lock should be skipped
      
      await adapter.close();
    });
  });

  describe('Migration Error Handling', () => {
    it('should handle file system errors during JSON reading', async () => {
      // Arrange - Create directory instead of file to trigger read error
      fs.mkdirSync(legacyJsonPath);
      
      // Override environment for test
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;
      
      // Act & Assert
      await expect(initializeDatabase(sqliteDbPath)).rejects.toThrow();
      
      // Restore environment
      process.env.HOME = originalHome;
    });

    it('should handle invalid data structures gracefully', async () => {
      // Arrange - JSON with missing expected properties
      const invalidJson = {
        // Missing mailboxes key
        events: 'not-an-object', // Should be object
        cursors: null, // Should be object
        locks: undefined // Should be object
      };
      
      fs.writeFileSync(legacyJsonPath, JSON.stringify(invalidJson, null, 2));
      
      // Override environment for test
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;
      
      // Act - Initialize database with invalid data (should handle gracefully)
      await initializeDatabase(sqliteDbPath);
      
      // Restore environment
      process.env.HOME = originalHome;
      
      // Assert - Database should be initialized using the adapter from migration
      const adapter = getAdapter();
      
      const stats = await adapter.getStats();
      expect(stats.total_events).toBe(0);
      expect(stats.active_locks).toBe(0);
      
      // Backup should still be created
      expect(fs.existsSync(legacyJsonPath + '.backup')).toBe(true);
      
      await adapter.close();
    });

    it('should handle individual record migration failures', async () => {
      // Arrange - Valid data structure but with some problematic records
      const problematicJson = {
        mailboxes: {
          'valid-mailbox': { id: 'valid-mailbox', created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },
          'invalid-mailbox': { /* Missing required fields */ }
        },
        events: {
          'valid-mailbox': [
            { type: 'valid-event', occurred_at: '2026-01-05T10:00:00Z', data: '{}' },
            { /* Missing required fields */ }
          ]
        },
        cursors: {
          'valid-cursor': { stream_id: 'valid-stream', position: 100 },
          'invalid-cursor': { /* Missing stream_id */ }
        },
        locks: {
          'valid-lock': { file: 'valid.ts', reserved_by: 'valid-spec', timeout_ms: 30000 },
          'invalid-lock': { /* Missing file */ }
        }
      };
      
      fs.writeFileSync(legacyJsonPath, JSON.stringify(problematicJson, null, 2));
      
      // Override environment for test
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;
      
      // Capture console warnings
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Act
      await initializeDatabase(sqliteDbPath);
      
      // Restore environment and cleanup spy
      process.env.HOME = originalHome;
      consoleWarnSpy.mockRestore();
      
      // Assert - Should have logged warnings for failed migrations
      // Use the same adapter that was initialized during migration
      const adapter = getAdapter();
      
      const mailboxes = await (adapter as any).mailboxes.getAll();
      const events: any[] = [];
      events.push(...await (adapter as any).events.queryByStream('squawk', 'valid-mailbox'));
      const cursors = await (adapter as any).cursors.getAll();
      const locks = await (adapter as any).locks.getAll();
      
      expect(mailboxes).toHaveLength(1); // Only valid mailbox
      expect(events).toHaveLength(1); // Only valid event
      expect(cursors).toHaveLength(1); // Only valid cursor
      expect(locks).toHaveLength(1); // Only valid lock
      
      await adapter.close();
    });
  });

  describe('Migration Statistics and Logging', () => {
    it('should log migration summary with correct counts', async () => {
      // Arrange
      const testData = {
        mailboxes: { 'mbox1': { id: 'mbox1', created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' } },
        events: { 'mbox1': [{ type: 'test', occurred_at: '2026-01-05T10:00:00Z', data: '{}' }] },
        cursors: { 'cursor1': { stream_id: 'stream1', position: 100 } },
        locks: { 'lock1': { file: 'file1.ts', reserved_by: 'spec1', timeout_ms: 30000 } }
      };
      
      fs.writeFileSync(legacyJsonPath, JSON.stringify(testData, null, 2));
      
      // Override environment for test
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;
      
      // Capture console logs
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Act
      await initializeDatabase(sqliteDbPath);
      
      // Restore environment and cleanup spy
      process.env.HOME = originalHome;
      consoleLogSpy.mockRestore();
      
      // Assert - Should have logged migration start, summary, and backup info
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Migration] Starting migration from:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Migration] Complete:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('- Mailboxes: 1')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('- Events: 1')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('- Cursors: 1')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('- Locks: 1')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Migration] Legacy data migrated to SQLite')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Migration] Backup saved to:')
      );
    });
  });
});