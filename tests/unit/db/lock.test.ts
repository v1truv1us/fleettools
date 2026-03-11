

import { testLockOps, testDb, resetTestData } from '../../helpers/test-db'
import { generateTestId, createTestLock } from '../../setup'

describe('lockOps', () => {
  beforeEach(() => {
    testDb.reset()
  })

  describe('acquire()', () => {
    it('should create a new lock with correct structure', () => {
      const lock = testLockOps.acquire(createTestLock())

      expect(lock).toBeDefined()
      expect(lock.id).toBeDefined()
      expect(lock.file).toBe('/test/file.txt')
      expect(lock.reserved_by).toBe('test-specialist')
      expect(lock.released_at).toBeNull()
      expect(lock.purpose).toBe('edit')
      expect(lock.timeout_ms).toBe(60000)
    })

    it('should store lock in data store using lock.id', () => {
      const lockInput = createTestLock()
      const lock = testLockOps.acquire(lockInput)

      const retrieved = testLockOps.getById(lock.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.file).toBe(lock.file)
    })

    it('should set released_at to null on acquire', () => {
      const lock = testLockOps.acquire(createTestLock())

      expect(lock.released_at).toBeNull()
    })

    it('should use provided timeout_ms', () => {
      const lock = testLockOps.acquire({
        ...createTestLock(),
        timeout_ms: 120000
      })

      expect(lock.timeout_ms).toBe(120000)
    })
  })

  describe('release()', () => {
    it('should mark lock as released', () => {
      const lock = testLockOps.acquire(createTestLock())

      const released = testLockOps.release(lock.id)

      expect(released).not.toBeNull()
      expect(released!.released_at).not.toBeNull()
    })

    it('should set released_at timestamp', () => {
      const lock = testLockOps.acquire(createTestLock())

      const before = new Date().toISOString()
      const released = testLockOps.release(lock.id)
      const after = new Date().toISOString()

      expect(released!.released_at >= before).toBe(true)
      expect(released!.released_at <= after).toBe(true)
    })

    it('should return null for non-existent lock', () => {
      const released = testLockOps.release('non-existent-id')
      expect(released).toBeNull()
    })
  })

  describe('getAll()', () => {
    it('should return empty array when no locks exist', () => {
      const locks = testLockOps.getAll()
      expect(locks).toEqual([])
    })

    it('should return only active (non-released) locks', () => {
      const lock1 = testLockOps.acquire(createTestLock())
      const lock2 = testLockOps.acquire(createTestLock())
      testLockOps.release(lock1.id)

      const locks = testLockOps.getAll()
      expect(locks.length).toBe(1)
      expect(locks[0].id).toBe(lock2.id)
    })

    it('should exclude expired locks', () => {
      const expiredLockId = 'expired-lock-1'
      testDb.data.locks[expiredLockId] = {
        id: expiredLockId,
        file: '/test/expired.txt',
        reserved_by: 'specialist',
        reserved_at: '2025-01-01T00:00:00.000Z',
        released_at: null,
        purpose: 'edit',
        checksum: null,
        timeout_ms: 1000,
        metadata: null
      }

      const activeLock = testLockOps.acquire(createTestLock())

      const locks = testLockOps.getAll()
      expect(locks.length).toBe(1)
      expect(locks[0].id).toBe(activeLock.id)
    })
  })

  describe('getById()', () => {
    it('should return lock when it exists', () => {
      const lock = testLockOps.acquire(createTestLock())

      const retrieved = testLockOps.getById(lock.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(lock.id)
    })

    it('should return null when lock does not exist', () => {
      const lock = testLockOps.getById('non-existent')
      expect(lock).toBeNull()
    })
  })

  describe('getExpired()', () => {
    it('should return empty array when no expired locks', () => {
      testLockOps.acquire(createTestLock())

      const expired = testLockOps.getExpired()
      expect(expired).toEqual([])
    })

    it('should return expired locks', () => {
      const expiredLockId = 'expired-lock-2'
      testDb.data.locks[expiredLockId] = {
        id: expiredLockId,
        file: '/test/expired.txt',
        reserved_by: 'specialist',
        reserved_at: '2025-01-01T00:00:00.000Z',
        released_at: null,
        purpose: 'edit',
        checksum: null,
        timeout_ms: 1000,
        metadata: null
      }

      const expired = testLockOps.getExpired()
      expect(expired.length).toBe(1)
      expect(expired[0].id).toBe(expiredLockId)
    })

    it('should exclude released locks', () => {
      const lock = testLockOps.acquire(createTestLock())
      testLockOps.release(lock.id)

      const expired = testLockOps.getExpired()
      expect(expired.length).toBe(0)
    })
  })

  describe('releaseExpired()', () => {
    it('should release all expired locks', () => {
      const expiredLockId = 'expired-lock-3'
      testDb.data.locks[expiredLockId] = {
        id: expiredLockId,
        file: '/test/expired.txt',
        reserved_by: 'specialist',
        reserved_at: '2025-01-01T00:00:00.000Z',
        released_at: null,
        purpose: 'edit',
        checksum: null,
        timeout_ms: 1000,
        metadata: null
      }

      const count = testLockOps.releaseExpired()

      expect(count).toBe(1)
      const released = testLockOps.getById(expiredLockId)
      expect(released!.released_at).not.toBeNull()
    })

    it('should return count of released locks', () => {
      for (let i = 0; i < 3; i++) {
        testDb.data.locks[`expired-${i}`] = {
          id: `expired-${i}`,
          file: `/test/expired-${i}.txt`,
          reserved_by: 'specialist',
          reserved_at: '2025-01-01T00:00:00.000Z',
          released_at: null,
          purpose: 'edit',
          checksum: null,
          timeout_ms: 1000,
          metadata: null
        }
      }

      const count = testLockOps.releaseExpired()

      expect(count).toBe(3)
    })
  })
})
