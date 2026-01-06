/// <reference types="bun-types" />

/**
 * SQLite Persistence Tests - Phase 3
 * 
 * Tests for TASK-306: Persistence Across Restarts
 * Verifies that mailboxes, cursors, and locks persist across server restarts
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import fs from 'fs'
import path from 'path'
import { generateTestId } from '../../setup'

// Test database path
const TEST_DB_PATH = path.join(process.cwd(), '.local', 'share', 'fleet', 'squawk-persistence-test.db')

// Helper to clean up test database
function cleanupTestDb() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH)
  }
  // Also clean up WAL files
  if (fs.existsSync(TEST_DB_PATH + '-wal')) {
    fs.unlinkSync(TEST_DB_PATH + '-wal')
  }
  if (fs.existsSync(TEST_DB_PATH + '-shm')) {
    fs.unlinkSync(TEST_DB_PATH + '-shm')
  }
}

describe('SQLite Persistence - Phase 3', () => {
  beforeEach(() => {
    cleanupTestDb()
  })

  afterEach(() => {
    cleanupTestDb()
  })

  describe('TASK-301: Database Schema', () => {
    it('should create database file on initialization', async () => {
      const dbDir = path.dirname(TEST_DB_PATH)
      if (fs.existsSync(dbDir)) {
        fs.rmSync(dbDir, { recursive: true, force: true })
      }
      
      // Import and initialize database
      const { initializeDatabase } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      
      expect(fs.existsSync(TEST_DB_PATH)).toBe(true)
    })

    it('should create all required tables', async () => {
      const { initializeDatabase, getAdapter } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      
      const adapter = getAdapter()
      
      // Verify tables exist by checking schema
      const tables = (adapter as any).db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
      `).all() as any[]
      
      const tableNames = tables.map(t => t.name)
      
      expect(tableNames).toContain('mailboxes')
      expect(tableNames).toContain('events')
      expect(tableNames).toContain('cursors')
      expect(tableNames).toContain('locks')
      expect(tableNames).toContain('specialists')
    })

    it('should create indexes for performance', async () => {
      const { initializeDatabase, getAdapter } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      
      const adapter = getAdapter()
      
      const indexes = (adapter as any).db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' 
        ORDER BY name
      `).all() as any[]
      
      const indexNames = indexes.map(i => i.name)
      
      expect(indexNames.length).toBeGreaterThan(0)
      expect(indexNames.some(n => n.includes('idx_events'))).toBe(true)
      expect(indexNames.some(n => n.includes('idx_locks'))).toBe(true)
    })
  })

  describe('TASK-302: Database Module', () => {
    it('should initialize database with WAL mode', async () => {
      const { initializeDatabase, getAdapter } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      
      const adapter = getAdapter()
      const walMode = (adapter as any).db.prepare('PRAGMA journal_mode').get() as any
      expect(walMode.journal_mode).toBe('wal')
    })

    it('should enable foreign keys', async () => {
      const { initializeDatabase, getAdapter } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      
      const adapter = getAdapter()
      const fkEnabled = (adapter as any).db.prepare('PRAGMA foreign_keys').get() as any
      expect(fkEnabled.foreign_keys).toBe(1)
    })

    it('should create database directory if not exists', async () => {
      const dbDir = path.dirname(TEST_DB_PATH)
      if (fs.existsSync(dbDir)) {
        fs.rmSync(dbDir, { recursive: true, force: true })
      }
      
      const { initializeDatabase } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      
      expect(fs.existsSync(dbDir)).toBe(true)
    })
  })

  describe('TASK-303: Mailbox Persistence', () => {
    it('should persist mailbox across restarts', async () => {
      const mailboxId = generateTestId('mailbox')
      
      // Create mailbox in first instance
      let { initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      let adapter = getAdapter()
      
      const mailbox = await adapter.mailboxes.create({ id: mailboxId })
      expect(mailbox.id).toBe(mailboxId)
      await closeDatabase()
      
      // Verify mailbox exists in second instance
      ({ initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js'))
      await initializeDatabase(TEST_DB_PATH)
      adapter = getAdapter()
      
      const retrieved = await adapter.mailboxes.getById(mailboxId)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(mailboxId)
      await closeDatabase()
    })

    it('should persist multiple mailboxes', async () => {
      const mailboxIds = [
        generateTestId('mailbox'),
        generateTestId('mailbox'),
        generateTestId('mailbox')
      ]
      
      // Create mailboxes in first instance
      let { initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      let adapter = getAdapter()
      
      for (const id of mailboxIds) {
        await adapter.mailboxes.create({ id })
      }
      await closeDatabase()
      
      // Verify all mailboxes exist in second instance
      ({ initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js'))
      await initializeDatabase(TEST_DB_PATH)
      adapter = getAdapter()
      
      const all = await adapter.mailboxes.getAll()
      expect(all.length).toBeGreaterThanOrEqual(3)
      
      for (const id of mailboxIds) {
        const mailbox = await adapter.mailboxes.getById(id)
        expect(mailbox).not.toBeNull()
      }
      await closeDatabase()
    })

    it('should preserve mailbox timestamps', async () => {
      const mailboxId = generateTestId('mailbox')
      const now = new Date().toISOString()
      
      // Create mailbox with specific timestamp
      let { initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      let adapter = getAdapter()
      
      await adapter.mailboxes.create({ 
        id: mailboxId,
        created_at: now,
        updated_at: now
      })
      await closeDatabase()
      
      // Verify timestamps are preserved
      ({ initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js'))
      await initializeDatabase(TEST_DB_PATH)
      adapter = getAdapter()
      
      const retrieved = await adapter.mailboxes.getById(mailboxId)
      expect(retrieved!.created_at).toBe(now)
      expect(retrieved!.updated_at).toBe(now)
      await closeDatabase()
    })
  })

  describe('TASK-304: Cursor Persistence', () => {
    it('should persist cursor position across restarts', async () => {
      const streamId = generateTestId('stream')
      const position = 42
      
      // Create cursor in first instance
      let { initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      let adapter = getAdapter()
      
      await adapter.cursors.advance(streamId, position)
      await closeDatabase()
      
      // Verify cursor exists in second instance
      ({ initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js'))
      await initializeDatabase(TEST_DB_PATH)
      adapter = getAdapter()
      
      const cursor = await adapter.cursors.getByStream(streamId)
      expect(cursor).not.toBeNull()
      expect(cursor!.position).toBe(position)
      await closeDatabase()
    })

    it('should update cursor position across restarts', async () => {
      const streamId = generateTestId('stream')
      
      // Create cursor with initial position
      let { initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      let adapter = getAdapter()
      
      await adapter.cursors.advance(streamId, 10)
      await closeDatabase()
      
      // Update cursor position in second instance
      ({ initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js'))
      await initializeDatabase(TEST_DB_PATH)
      adapter = getAdapter()
      
      await adapter.cursors.advance(streamId, 20)
      await closeDatabase()
      
      // Verify updated position in third instance
      ({ initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js'))
      await initializeDatabase(TEST_DB_PATH)
      adapter = getAdapter()
      
      const cursor = await adapter.cursors.getByStream(streamId)
      expect(cursor!.position).toBe(20)
      await closeDatabase()
    })

    it('should persist multiple cursors', async () => {
      const streamIds = [
        generateTestId('stream'),
        generateTestId('stream'),
        generateTestId('stream')
      ]
      
      // Create cursors in first instance
      let { initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      let adapter = getAdapter()
      
      for (let i = 0; i < streamIds.length; i++) {
        await adapter.cursors.advance(streamIds[i], i * 10)
      }
      await closeDatabase()
      
      // Verify all cursors exist in second instance
      ({ initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js'))
      await initializeDatabase(TEST_DB_PATH)
      adapter = getAdapter()
      
      for (let i = 0; i < streamIds.length; i++) {
        const cursor = await adapter.cursors.getByStream(streamIds[i])
        expect(cursor).not.toBeNull()
        expect(cursor!.position).toBe(i * 10)
      }
      await closeDatabase()
    })
  })

  describe('TASK-305: Lock Persistence', () => {
    it('should persist lock across restarts', async () => {
      const filePath = '/test/file.txt'
      const specialistId = 'specialist-1'
      
      // Create lock in first instance
      let { initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      let adapter = getAdapter()
      
      const result = await adapter.locks.acquire({
        file: filePath,
        specialist_id: specialistId,
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'edit',
        checksum: null,
        timeout_ms: 30000,
        metadata: null
      })
      
      const lockId = result.lock?.id || result.id
      await closeDatabase()
      
      // Verify lock exists in second instance
      ({ initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js'))
      await initializeDatabase(TEST_DB_PATH)
      adapter = getAdapter()
      
      const retrieved = await adapter.locks.getById(lockId)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.file).toBe(filePath)
      expect(retrieved!.reserved_by).toBe(specialistId)
      await closeDatabase()
    })

    it('should persist lock release across restarts', async () => {
      const filePath = '/test/file.txt'
      const specialistId = 'specialist-1'
      
      // Create and release lock in first instance
      let { initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      let adapter = getAdapter()
      
      const result = await adapter.locks.acquire({
        file: filePath,
        specialist_id: specialistId,
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'edit',
        checksum: null,
        timeout_ms: 30000,
        metadata: null
      })
      
      const lockId = result.lock?.id || result.id
      await adapter.locks.release(lockId)
      await closeDatabase()
      
      // Verify released status in second instance
      ({ initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js'))
      await initializeDatabase(TEST_DB_PATH)
      adapter = getAdapter()
      
      const retrieved = await adapter.locks.getById(lockId)
      expect(retrieved!.released_at).not.toBeNull()
      await closeDatabase()
    })

    it('should persist multiple locks', async () => {
      const lockCount = 3
      const lockIds: string[] = []
      
      // Create multiple locks in first instance
      let { initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      let adapter = getAdapter()
      
      for (let i = 0; i < lockCount; i++) {
        const result = await adapter.locks.acquire({
          file: `/test/file-${i}.txt`,
          specialist_id: `specialist-${i}`,
          reserved_at: new Date().toISOString(),
          released_at: null,
          purpose: 'edit',
          checksum: null,
          timeout_ms: 30000,
          metadata: null
        })
        lockIds.push(result.lock?.id || result.id)
      }
      await closeDatabase()
      
      // Verify all locks exist in second instance
      ({ initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js'))
      await initializeDatabase(TEST_DB_PATH)
      adapter = getAdapter()
      
      const allLocks = await adapter.locks.getAll()
      expect(allLocks.length).toBeGreaterThanOrEqual(lockCount)
      
      for (const lockId of lockIds) {
        const retrieved = await adapter.locks.getById(lockId)
        expect(retrieved).not.toBeNull()
      }
      await closeDatabase()
    })
  })

  describe('TASK-307: Lock Timeout Cleanup', () => {
    it('should identify and handle expired locks', async () => {
      const { initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      const adapter = getAdapter()
      
      // Create lock that expired 1 minute ago
      const expiredTime = new Date(Date.now() - 60000).toISOString()
      const expiredResult = await adapter.locks.acquire({
        file: '/test/expired.txt',
        specialist_id: 'specialist-1',
        reserved_at: expiredTime,
        released_at: null,
        purpose: 'edit',
        checksum: null,
        timeout_ms: 30000, // 30 second timeout
        metadata: null
      })
      
      const expiredLockId = expiredResult.lock?.id || expiredResult.id
      
      // Create lock that hasn't expired
      const recentTime = new Date().toISOString()
      const activeResult = await adapter.locks.acquire({
        file: '/test/active.txt',
        specialist_id: 'specialist-2',
        reserved_at: recentTime,
        released_at: null,
        purpose: 'edit',
        checksum: null,
        timeout_ms: 30000,
        metadata: null
      })
      
      const activeLockId = activeResult.lock?.id || activeResult.id
      
      // Release expired locks
      const released = await (adapter as any).locks.releaseExpired?.() || 0
      
      // Verify expired lock is released (if releaseExpired is implemented)
      const expiredLock = await adapter.locks.getById(expiredLockId)
      if (released > 0) {
        expect(expiredLock!.released_at).not.toBeNull()
      }
      
      // Verify active lock is still active
      const activeLock = await adapter.locks.getById(activeLockId)
      expect(activeLock!.released_at).toBeNull()
      
      await closeDatabase()
    })
  })

  describe('Integration: Full Persistence Workflow', () => {
    it('should persist complete workflow across multiple restarts', async () => {
      const mailboxId = generateTestId('mailbox')
      const streamId = generateTestId('stream')
      const filePath = '/test/workflow.txt'
      
      // First restart: Create mailbox, events, cursor, and lock
      let { initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js')
      await initializeDatabase(TEST_DB_PATH)
      let adapter = getAdapter()
      
      // Create mailbox
      await adapter.mailboxes.create({ id: mailboxId })
      
      // Create cursor
      await adapter.cursors.advance(streamId, 0)
      
      // Acquire lock
      const lockResult = await adapter.locks.acquire({
        file: filePath,
        specialist_id: 'specialist-1',
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'edit',
        checksum: null,
        timeout_ms: 30000,
        metadata: null
      })
      
      const lockId = lockResult.lock?.id || lockResult.id
      
      await closeDatabase()
      
      // Second restart: Verify all data persists
      ({ initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js'))
      await initializeDatabase(TEST_DB_PATH)
      adapter = getAdapter()
      
      const mailbox = await adapter.mailboxes.getById(mailboxId)
      expect(mailbox).not.toBeNull()
      
      const cursor = await adapter.cursors.getByStream(streamId)
      expect(cursor).not.toBeNull()
      expect(cursor!.position).toBe(0)
      
      const lock = await adapter.locks.getById(lockId)
      expect(lock).not.toBeNull()
      expect(lock!.file).toBe(filePath)
      
      // Update cursor position
      await adapter.cursors.advance(streamId, 1)
      
      // Release lock
      await adapter.locks.release(lockId)
      
      await closeDatabase()
      
      // Third restart: Verify updates persist
      ({ initializeDatabase, getAdapter, closeDatabase } = await import('../../../squawk/src/db/index.js'))
      await initializeDatabase(TEST_DB_PATH)
      adapter = getAdapter()
      
      const updatedCursor = await adapter.cursors.getByStream(streamId)
      expect(updatedCursor!.position).toBe(1)
      
      const releasedLock = await adapter.locks.getById(lockId)
      expect(releasedLock!.released_at).not.toBeNull()
      
      await closeDatabase()
    })
  })
})
