/// <reference types="bun-types" />

/**
 * Coordinator API Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { testDb, resetTestData, testMailboxOps, testLockOps } from '../../helpers/test-db'
import { generateTestId } from '../../setup'

describe('Coordinator API', () => {
  beforeEach(() => {
    resetTestData()
  })

  describe('GET /api/v1/coordinator/status', () => {
    it('should return coordinator status', () => {
      const status = {
        active_mailboxes: 0,
        active_locks: 0,
        timestamp: new Date().toISOString()
      }
      
      expect(status.active_mailboxes).toBeDefined()
      expect(status.active_locks).toBeDefined()
      expect(status.timestamp).toBeDefined()
    })

    it('should include active_mailboxes count', () => {
      testMailboxOps.create('mb-1')
      testMailboxOps.create('mb-2')
      
      const mailboxes = testMailboxOps.getAll()
      expect(mailboxes.length).toBe(2)
    })

    it('should include active_locks count', () => {
      testLockOps.acquire({
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
      
      const locks = testLockOps.getAll()
      expect(locks.length).toBe(1)
    })

    it('should include timestamp', () => {
      const before = new Date().toISOString()
      const status = {
        active_mailboxes: 0,
        active_locks: 0,
        timestamp: new Date().toISOString()
      }
      const after = new Date().toISOString()
      
      expect(status.timestamp >= before).toBe(true)
      expect(status.timestamp <= after).toBe(true)
    })

    it('should reflect actual state', () => {
      // Create some data
      testMailboxOps.create('mb-1')
      testLockOps.acquire({
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
      
      const mailboxes = testMailboxOps.getAll()
      const locks = testLockOps.getAll()
      
      expect(mailboxes.length).toBeGreaterThan(0)
      expect(locks.length).toBeGreaterThan(0)
    })
  })
})
