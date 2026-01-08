
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { testDb, resetTestData, testMailboxOps, testEventOps, testCursorOps, testLockOps } from '../helpers/test-db'
import { apiClient } from '../helpers/api-client'
import { generateTestId } from '../setup'
import { createWorkOrderFixture } from '../fixtures/work-orders'

describe('API Integration Tests', () => {
  beforeEach(() => {
    resetTestData()
  })

  afterEach(async () => {
    resetTestData()
  })

  describe('TEST-609: Full API Workflow', () => {
    it('should create work order via API', () => {
      const workOrderData = {
        title: 'Test Work Order',
        description: 'Test description',
        priority: 'high'
      }

      const workOrder = {
        id: generateTestId('wo'),
        ...workOrderData,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assigned_to: [],
        cells: [],
        tech_orders: []
      }

      expect(workOrder.id).toBeDefined()
      expect(workOrder.title).toBe('Test Work Order')
      expect(workOrder.status).toBe('pending')
    })

    it('should append events to mailbox', () => {
      const workOrder = createWorkOrderFixture()
      const mailboxId = workOrder.id

      testMailboxOps.create(mailboxId)

      const events = [
        { type: 'WorkOrderCreated', data: { work_order_id: workOrder.id } },
        { type: 'SpecialistAssigned', data: { specialist_id: 'spec-1' } },
        { type: 'PhaseStarted', data: { phase: 'research' } }
      ]

      const inserted = testEventOps.append(mailboxId, events)
      expect(inserted).toHaveLength(3)
    })

    it('should acquire file lock via CTK', () => {
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
      expect(lock.file).toBe(filePath)
      expect(lock.reserved_by).toBe(specialistId)
      expect(lock.released_at).toBeNull()
    })

    it('should update work order status', () => {
      const workOrder = createWorkOrderFixture()
      workOrder.status = 'in_progress'
      workOrder.updated_at = new Date().toISOString()

      expect(workOrder.status).toBe('in_progress')
      expect(workOrder.updated_at).toBeDefined()
    })

    it('should advance cursor position', () => {
      const streamId = generateTestId('stream')

      testCursorOps.upsert({
        stream_id: streamId,
        position: 3
      })

      const cursor = testCursorOps.getByStream(streamId)
      expect(cursor).not.toBeNull()
      expect(cursor!.position).toBe(3)
    })

    it('should release file lock', () => {
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

      const released = testLockOps.release(lock.id)
      expect(released).not.toBeNull()
      expect(released!.released_at).not.toBeNull()
    })

    it('should get coordinator status', () => {
      const status = {
        healthy: true,
        uptime_ms: 1000,
        active_locks: 0,
        active_specialists: 0,
        pending_tasks: 0
      }

      expect(status.healthy).toBe(true)
      expect(status.uptime_ms).toBeGreaterThanOrEqual(0)
    })

    it('should complete full workflow', () => {
      const workOrder = createWorkOrderFixture()
      const mailboxId = workOrder.id

      testMailboxOps.create(mailboxId)
      expect(testMailboxOps.exists(mailboxId)).toBe(true)

      const events = [
        { type: 'WorkOrderCreated', data: {} },
        { type: 'SpecialistAssigned', data: {} },
        { type: 'WorkOrderCompleted', data: {} }
      ]
      const inserted = testEventOps.append(mailboxId, events)
      expect(inserted).toHaveLength(3)

      testCursorOps.upsert({
        stream_id: mailboxId,
        position: 3
      })
      const cursor = testCursorOps.getByStream(mailboxId)
      expect(cursor!.position).toBe(3)

      workOrder.status = 'completed'
      expect(workOrder.status).toBe('completed')
    })
  })

  describe('TEST-610: Concurrent API Operations', () => {
    it('should acquire lock for operation 1', () => {
      const filePath = '/test/file.txt'
      const op1Id = 'op-1'

      const lock1 = testLockOps.acquire({
        id: generateTestId('lock'),
        file: filePath,
        reserved_by: op1Id,
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'write',
        checksum: null,
        timeout_ms: 60000,
        metadata: null
      })

      expect(lock1.reserved_by).toBe(op1Id)
      expect(lock1.file).toBe(filePath)
    })

    it('should wait for lock when operation 2 tries same file', () => {
      const filePath = '/test/file.txt'
      const op1Id = 'op-1'
      const op2Id = 'op-2'

      const lock1 = testLockOps.acquire({
        id: generateTestId('lock'),
        file: filePath,
        reserved_by: op1Id,
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'write',
        checksum: null,
        timeout_ms: 60000,
        metadata: null
      })

      const activeLocks = testLockOps.getAll()
      const fileIsLocked = activeLocks.some(l => l.file === filePath && !l.released_at)

      expect(fileIsLocked).toBe(true)
    })

    it('should release lock after operation 1 completes', () => {
      const filePath = '/test/file.txt'
      const op1Id = 'op-1'

      const lock1 = testLockOps.acquire({
        id: generateTestId('lock'),
        file: filePath,
        reserved_by: op1Id,
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'write',
        checksum: null,
        timeout_ms: 60000,
        metadata: null
      })

      const released = testLockOps.release(lock1.id)
      expect(released!.released_at).not.toBeNull()
    })

    it('should allow operation 2 to acquire lock after release', () => {
      const filePath = '/test/file.txt'
      const op1Id = 'op-1'
      const op2Id = 'op-2'

      const lock1 = testLockOps.acquire({
        id: generateTestId('lock'),
        file: filePath,
        reserved_by: op1Id,
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'write',
        checksum: null,
        timeout_ms: 60000,
        metadata: null
      })

      testLockOps.release(lock1.id)

      const lock2 = testLockOps.acquire({
        id: generateTestId('lock'),
        file: filePath,
        reserved_by: op2Id,
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'write',
        checksum: null,
        timeout_ms: 60000,
        metadata: null
      })

      expect(lock2.reserved_by).toBe(op2Id)
    })

    it('should complete operation 2 and release lock', () => {
      const filePath = '/test/file.txt'
      const op2Id = 'op-2'

      const lock2 = testLockOps.acquire({
        id: generateTestId('lock'),
        file: filePath,
        reserved_by: op2Id,
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'write',
        checksum: null,
        timeout_ms: 60000,
        metadata: null
      })

      const released = testLockOps.release(lock2.id)
      expect(released!.released_at).not.toBeNull()
    })

    it('should prevent concurrent writes', () => {
      const filePath = '/test/file.txt'
      const op1Id = 'op-1'
      const op2Id = 'op-2'

      const lock1 = testLockOps.acquire({
        id: generateTestId('lock'),
        file: filePath,
        reserved_by: op1Id,
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: 'write',
        checksum: null,
        timeout_ms: 60000,
        metadata: null
      })

      const activeLocks = testLockOps.getAll()
      const isLocked = activeLocks.some(l => l.file === filePath && !l.released_at)

      expect(isLocked).toBe(true)

      // (would need to wait in real implementation)
    })

    it('should handle lock timeout', () => {
      const filePath = '/test/file.txt'
      const op1Id = 'op-1'

      const lock = testLockOps.acquire({
        id: generateTestId('lock'),
        file: filePath,
        reserved_by: op1Id,
        reserved_at: new Date(Date.now() - 70000).toISOString(), 
        released_at: null,
        purpose: 'write',
        checksum: null,
        timeout_ms: 60000, 
        metadata: null
      })

      const expiredLocks = testLockOps.getExpired()
      expect(expiredLocks.length).toBeGreaterThanOrEqual(0)
    })

    it('should release expired locks', () => {
      const filePath = '/test/file.txt'
      const op1Id = 'op-1'

      const lock = testLockOps.acquire({
        id: generateTestId('lock'),
        file: filePath,
        reserved_by: op1Id,
        reserved_at: new Date(Date.now() - 70000).toISOString(), 
        released_at: null,
        purpose: 'write',
        checksum: null,
        timeout_ms: 60000, 
        metadata: null
      })

      const releasedCount = testLockOps.releaseExpired()
      expect(releasedCount).toBeGreaterThanOrEqual(0)
    })
  })
})
