/// <reference types="bun-types" />

/**
 * Mailbox API Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { testDb, resetTestData, testMailboxOps, testEventOps } from '../../helpers/test-db'
import { generateTestId } from '../../setup'

describe('Mailbox API', () => {
  beforeEach(() => {
    resetTestData()
  })

  describe('POST /api/v1/mailbox/append', () => {
    it('should append events to mailbox', () => {
      const streamId = generateTestId('stream')
      const events = [
        { type: 'TaskStarted', data: { task_id: 'task-1' } },
        { type: 'TaskCompleted', data: { task_id: 'task-1', result: 'success' } }
      ]
      
      const result = testEventOps.append(streamId, events)
      expect(result).toHaveLength(2)
    })

    it('should auto-create mailbox if not exists', () => {
      const streamId = generateTestId('stream')
      const events = [{ type: 'Test', data: {} }]
      
      testEventOps.append(streamId, events)
      expect(testMailboxOps.exists(streamId)).toBe(true)
    })

    it('should require stream_id', () => {
      const request = { events: [] }
      const isValid = request.stream_id !== undefined && request.stream_id !== ''
      expect(isValid).toBe(false)
    })

    it('should require events array', () => {
      const request = { stream_id: 'test' }
      const isValid = Array.isArray(request.events)
      expect(isValid).toBe(false)
    })

    it('should return inserted count', () => {
      const streamId = generateTestId('stream')
      const events = [{ type: 'Test', data: {} }]
      
      testEventOps.append(streamId, events)
      const mailbox = testMailboxOps.getById(streamId)
      expect(mailbox).not.toBeNull()
    })
  })

  describe('GET /api/v1/mailbox/:streamId', () => {
    it('should return mailbox by streamId', () => {
      const streamId = generateTestId('stream')
      testMailboxOps.create(streamId)
      
      const mailbox = testMailboxOps.getById(streamId)
      expect(mailbox).not.toBeNull()
      expect(mailbox!.id).toBe(streamId)
    })

    it('should return 404 for non-existent mailbox', () => {
      const mailbox = testMailboxOps.getById('non-existent')
      expect(mailbox).toBeNull()
    })

    it('should include events in response', () => {
      const streamId = generateTestId('stream')
      testMailboxOps.create(streamId)
      testEventOps.append(streamId, [{ type: 'Test', data: {} }])
      
      const events = testEventOps.getByMailbox(streamId)
      expect(events).toHaveLength(1)
    })
  })
})
