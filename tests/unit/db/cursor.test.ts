/// <reference types="bun-types" />

/**
 * Cursor Database Operations Tests
 * Tests for squawk/src/db/index.ts - cursorOps
 */

import { testCursorOps, testMailboxOps, resetTestData, resetTestDataToFixture } from '../../helpers/test-db'
import { generateTestId, createTestCursor } from '../../setup'

describe('cursorOps', () => {
  beforeEach(() => {
    resetTestData()
  })

  describe('upsert()', () => {
    it('should create a new cursor with correct structure', () => {
      const streamId = generateTestId('stream')
      const cursor = testCursorOps.upsert({
        stream_id: streamId,
        position: 5,
        updated_at: new Date().toISOString()
      })

      expect(cursor).toBeDefined()
      expect(cursor.id).toBe(`${streamId}_cursor`)
      expect(cursor.stream_id).toBe(streamId)
      expect(cursor.position).toBe(5)
      expect(cursor.updated_at).toBeDefined()
    })

    it('should store cursor in data store', () => {
      const streamId = generateTestId('stream')
      testCursorOps.upsert({
        stream_id: streamId,
        position: 10,
        updated_at: new Date().toISOString()
      })

      const retrieved = testCursorOps.getById(`${streamId}_cursor`)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.position).toBe(10)
    })

    it('should update existing cursor position', () => {
      const streamId = generateTestId('stream')
      testCursorOps.upsert({
        stream_id: streamId,
        position: 5,
        updated_at: new Date().toISOString()
      })

      testCursorOps.upsert({
        stream_id: streamId,
        position: 15,
        updated_at: new Date().toISOString()
      })

      const cursor = testCursorOps.getById(`${streamId}_cursor`)
      expect(cursor!.position).toBe(15)
    })

    it('should preserve stream_id on update', () => {
      const streamId = generateTestId('stream')
      testCursorOps.upsert({
        stream_id: streamId,
        position: 5,
        updated_at: new Date().toISOString()
      })

      testCursorOps.upsert({
        stream_id: streamId,
        position: 10,
        updated_at: new Date().toISOString()
      })

      const cursor = testCursorOps.getById(`${streamId}_cursor`)
      expect(cursor!.stream_id).toBe(streamId)
    })
  })

  describe('getById()', () => {
    it('should return cursor when it exists', () => {
      const streamId = generateTestId('stream')
      testCursorOps.upsert({
        stream_id: streamId,
        position: 5,
        updated_at: new Date().toISOString()
      })

      const cursor = testCursorOps.getById(`${streamId}_cursor`)
      expect(cursor).not.toBeNull()
      expect(cursor!.id).toBe(`${streamId}_cursor`)
    })

    it('should return null when cursor does not exist', () => {
      const cursor = testCursorOps.getById('non-existent_cursor')
      expect(cursor).toBeNull()
    })
  })

  describe('getByStream()', () => {
    it('should return cursor by stream_id', () => {
      const streamId = generateTestId('stream')
      testCursorOps.upsert({
        stream_id: streamId,
        position: 5,
        updated_at: new Date().toISOString()
      })

      const cursor = testCursorOps.getByStream(streamId)
      expect(cursor).not.toBeNull()
      expect(cursor!.stream_id).toBe(streamId)
    })

    it('should return null for non-existent stream', () => {
      const cursor = testCursorOps.getByStream('non-existent')
      expect(cursor).toBeNull()
    })

    it('should return correct position', () => {
      const streamId = generateTestId('stream')
      testCursorOps.upsert({
        stream_id: streamId,
        position: 42,
        updated_at: new Date().toISOString()
      })

      const cursor = testCursorOps.getByStream(streamId)
      expect(cursor!.position).toBe(42)
    })

    it('should work with fixture data', () => {
      resetTestDataToFixture()
      
      const cursor = testCursorOps.getByStream('test-stream-1')
      expect(cursor).not.toBeNull()
      expect(cursor!.position).toBe(5)
    })
  })
})
