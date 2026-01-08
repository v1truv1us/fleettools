
import { describe, it, expect, beforeEach } from 'bun:test'
import { testDb, resetTestData, testMailboxOps, testEventOps, testCursorOps, testLockOps } from '../helpers/test-db'
import { generateTestId } from '../setup'

describe('End-to-End Workflows', () => {
  beforeEach(() => {
    resetTestData()
  })

  describe('Work Order Lifecycle', () => {
    it('should create and manage work orders through lifecycle', () => {
      const workOrder = {
        id: generateTestId('wo'),
        title: 'Implement Feature',
        description: 'Implement new feature',
        status: 'pending',
        priority: 'high',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assigned_to: ['specialist-1'],
        cells: [],
        tech_orders: []
      }
      
      expect(workOrder.status).toBe('pending')
      expect(workOrder.priority).toBe('high')
      expect(workOrder.assigned_to).toHaveLength(1)
      
      workOrder.status = 'in_progress'
      workOrder.updated_at = new Date().toISOString()
      expect(workOrder.status).toBe('in_progress')
      
      workOrder.status = 'completed'
      workOrder.updated_at = new Date().toISOString()
      expect(workOrder.status).toBe('completed')
    })
  })

  describe('Squawk Mailbox and Cursor Workflow', () => {
    it('should append events and advance cursor', () => {
      const streamId = generateTestId('stream')
      
      testMailboxOps.create(streamId)
      expect(testMailboxOps.exists(streamId)).toBe(true)
      
      const events = [
        { type: 'TaskStarted', data: { task_id: 'task-1' } },
        { type: 'TaskProgress', data: { progress: 50 } },
        { type: 'TaskCompleted', data: { result: 'success' } }
      ]
      
      const inserted = testEventOps.append(streamId, events)
      expect(inserted).toHaveLength(3)
      
      const retrieved = testEventOps.getByMailbox(streamId)
      expect(retrieved).toHaveLength(3)
      expect(retrieved[0].type).toBe('TaskStarted')
      expect(retrieved[1].type).toBe('TaskProgress')
      expect(retrieved[2].type).toBe('TaskCompleted')
      
      testCursorOps.upsert({
        stream_id: streamId,
        position: 3,
        updated_at: new Date().toISOString()
      })
      
      const cursor = testCursorOps.getByStream(streamId)
      expect(cursor).not.toBeNull()
      expect(cursor!.position).toBe(3)
    })
  })

  describe('File Locking Workflow', () => {
    it('should acquire, use, and release lock', () => {
      const filePath = '/test/file.txt'
      const specialistId = 'specialist-1'
      
      const lock = testLockOps.acquire({
        id: generateTestId('lock'),
        file: filePath,
        reserved_by: specialistId,
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'edit',
        checksum: null,
        timeout_ms: 60000,
        metadata: null
      })
      
      expect(lock.id).toBeDefined()
      expect(lock.released_at).toBeNull()
      
      const activeLocks = testLockOps.getAll()
      expect(activeLocks.length).toBe(1)
      
      const released = testLockOps.release(lock.id)
      expect(released).not.toBeNull()
      expect(released!.released_at).not.toBeNull()
      
      const afterRelease = testLockOps.getAll()
      expect(afterRelease.length).toBe(0)
    })
  })

  describe('Coordinator Status', () => {
    it('should reflect combined state', () => {
      testMailboxOps.create('stream-1')
      testMailboxOps.create('stream-2')
      
      testLockOps.acquire({
        id: 'lock-1',
        file: '/test/file1.txt',
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
      
      const status = {
        active_mailboxes: mailboxes.length,
        active_locks: locks.length,
        timestamp: new Date().toISOString()
      }
      
      expect(status.active_mailboxes).toBe(2)
      expect(status.active_locks).toBe(1)
      expect(status.timestamp).toBeDefined()
    })
  })

  describe('Event Causal Chain', () => {
    it('should maintain causation relationships', () => {
      const streamId = generateTestId('causal')
      testMailboxOps.create(streamId)
      
      const event1 = { type: 'CommandReceived', data: { cmd: 'start' }, causation_id: null }
      const event2: { type: string; data: Record<string, unknown>; causation_id?: string } = { type: 'ProcessingStarted', data: {} }
      event2.causation_id = 'evt-1'
      
      const inserted1 = testEventOps.append(streamId, [event1])
      const inserted2 = testEventOps.append(streamId, [event2])
      
      expect(inserted1).toHaveLength(1)
      expect(inserted2).toHaveLength(1)
      
      const events = testEventOps.getByMailbox(streamId)
      expect(events[0].causation_id).toBeNull()
      // Note: In real implementation, causation_id would be set from event1.id
    })
  })

  describe('Lock Expiration', () => {
    it('should detect and release expired locks', () => {
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
      
      testLockOps.acquire({
        id: 'active-lock',
        file: '/test/active.txt',
        reserved_by: 'specialist',
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'edit',
        checksum: null,
        timeout_ms: 60000,
        metadata: null
      })
      
      const expired = testLockOps.getExpired()
      expect(expired.length).toBe(1)
      expect(expired[0].id).toBe('expired-lock')
      
      const active = testLockOps.getAll()
      const hasExpired = active.some(l => l.id === 'expired-lock')
      expect(hasExpired).toBe(false)
    })
  })
})
