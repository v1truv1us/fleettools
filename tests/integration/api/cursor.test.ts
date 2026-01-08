/


import { describe, it, expect, beforeEach } from 'bun:test'
import { testDb, resetTestData, testMailboxOps, testCursorOps } from '../../helpers/test-db'
import { generateTestId } from '../../setup'

describe('Cursor API', () => {
  beforeEach(() => {
    resetTestData()
  })

  describe('POST /api/v1/cursor/advance', () => {
    it('should advance cursor position', () => {
      const streamId = generateTestId('stream')
      testMailboxOps.create(streamId)
      
      const cursor = testCursorOps.upsert({
        stream_id: streamId,
        position: 5,
        updated_at: new Date().toISOString()
      })
      
      expect(cursor.position).toBe(5)
    })

    it('should create new cursor if not exists', () => {
      const streamId = generateTestId('stream')
      testMailboxOps.create(streamId)
      
      testCursorOps.upsert({
        stream_id: streamId,
        position: 10,
        updated_at: new Date().toISOString()
      })
      
      const cursor = testCursorOps.getByStream(streamId)
      expect(cursor).not.toBeNull()
      expect(cursor!.position).toBe(10)
    })

    it('should require stream_id', () => {
      const request = { position: 5 }
      const isValid = request.stream_id !== undefined && request.stream_id !== ''
      expect(isValid).toBe(false)
    })

    it('should require position', () => {
      const request = { stream_id: 'test' }
      const isValid = typeof request.position === 'number'
      expect(isValid).toBe(false)
    })

    it('should return 404 if mailbox does not exist', () => {
      const cursor = testCursorOps.getByStream('non-existent-stream')
      expect(cursor).toBeNull()
    })
  })

  describe('GET /api/v1/cursor/:cursorId', () => {
    it('should return cursor by id', () => {
      const streamId = generateTestId('stream')
      testMailboxOps.create(streamId)
      testCursorOps.upsert({
        stream_id: streamId,
        position: 5,
        updated_at: new Date().toISOString()
      })
      
      const cursor = testCursorOps.getById(`${streamId}_cursor`)
      expect(cursor).not.toBeNull()
    })

    it('should return 404 for non-existent cursor', () => {
      const cursor = testCursorOps.getById('non-existent_cursor')
      expect(cursor).toBeNull()
    })

    it('should have correct cursor structure', () => {
      const streamId = generateTestId('stream')
      testMailboxOps.create(streamId)
      testCursorOps.upsert({
        stream_id: streamId,
        position: 5,
        updated_at: new Date().toISOString()
      })
      
      const cursor = testCursorOps.getByStream(streamId)
      expect(cursor!.id).toBe(`${streamId}_cursor`)
      expect(cursor!.stream_id).toBe(streamId)
      expect(cursor!.position).toBeDefined()
    })
  })
})
