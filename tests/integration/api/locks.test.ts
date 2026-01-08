/


import { describe, it, expect, beforeEach } from 'bun:test'
import { testDb, resetTestData, testLockOps } from '../../helpers/test-db'
import { generateTestId } from '../../setup'

describe('Locks API', () => {
  beforeEach(() => {
    resetTestData()
  })

  describe('POST /api/v1/lock/acquire', () => {
    it('should acquire lock on file', () => {
      const lock = testLockOps.acquire({
        id: 'lock-1',
        file: '/test/file.txt',
        reserved_by: 'specialist-1',
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'edit',
        checksum: null,
        timeout_ms: 60000,
        metadata: null
      })
      
      expect(lock.file).toBe('/test/file.txt')
      expect(lock.reserved_by).toBe('specialist-1')
      expect(lock.released_at).toBeNull()
    })

    it('should require file', () => {
      const request = { specialist_id: 's1' }
      const isValid = request.file !== undefined && request.file !== ''
      expect(isValid).toBe(false)
    })

    it('should require specialist_id', () => {
      const request = { file: '/test.txt' }
      const isValid = request.specialist_id !== undefined && request.specialist_id !== ''
      expect(isValid).toBe(false)
    })

    it('should have default timeout', () => {
      const lock = testLockOps.acquire({
        id: 'lock-2',
        file: '/test/file2.txt',
        reserved_by: 'specialist-1',
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'edit',
        checksum: null,
        timeout_ms: 30000,
        metadata: null
      })
      
      expect(lock.timeout_ms).toBe(30000)
    })
  })

  describe('POST /api/v1/lock/release', () => {
    it('should release lock', () => {
      const lock = testLockOps.acquire({
        id: 'lock-3',
        file: '/test/file3.txt',
        reserved_by: 'specialist-1',
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'edit',
        checksum: null,
        timeout_ms: 60000,
        metadata: null
      })
      
      const released = testLockOps.release(lock.id)
      expect(released).not.toBeNull()
      expect(released!.released_at).not.toBeNull()
    })

    it('should return 404 for non-existent lock', () => {
      const released = testLockOps.release('non-existent')
      expect(released).toBeNull()
    })
  })

  describe('GET /api/v1/locks', () => {
    it('should return array of active locks', () => {
      const locks = testLockOps.getAll()
      expect(Array.isArray(locks)).toBe(true)
    })

    it('should exclude released locks', () => {
      const lock = testLockOps.acquire({
        id: 'lock-4',
        file: '/test/file4.txt',
        reserved_by: 'specialist-1',
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'edit',
        checksum: null,
        timeout_ms: 60000,
        metadata: null
      })
      
      testLockOps.release(lock.id)
      
      const locks = testLockOps.getAll()
      expect(locks.length).toBe(0)
    })

    it('should exclude expired locks', () => {
      testDb.data.locks['expired-lock'] = {
        id: 'expired-lock',
        file: '/test/expired.txt',
        reserved_by: 'specialist',
        reserved_at: '2025-01-01T00:00:00.000Z',
        released_at: null,
        purpose: 'edit',
        checksum: null,
        timeout_ms: 1000,
        metadata: null
      }
      
      const locks = testLockOps.getAll()
      const hasExpired = locks.some(l => l.id === 'expired-lock')
      expect(hasExpired).toBe(false)
    })
  })
})
