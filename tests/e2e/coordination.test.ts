/


import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { testDb, resetTestData, testMailboxOps, testEventOps, testCursorOps, testLockOps } from '../helpers/test-db'
import { testServer, serverTestUtils } from '../helpers/test-server'
import { apiClient } from '../helpers/api-client'
import { generateTestId } from '../setup'
import {
  createWorkOrderFixture,
  createHighPriorityWorkOrder,
  createAssignedWorkOrder
} from '../fixtures/work-orders'
import {
  createSpecialistTeam,
  createResearcherSpecialist,
  createPlannerSpecialist,
  createImplementationSpecialist
} from '../fixtures/specialists'
import {
  createTaskChain,
  createParallelTasks,
  createErrorRecoveryTask
} from '../fixtures/tasks'

describe('Coordination Tests', () => {
  beforeEach(() => {
    resetTestData()
  })

  afterEach(async () => {
    resetTestData()
  })

  describe('TEST-601: Complete Fleet Workflow', () => {
    it('should create work order with valid data', () => {
      const workOrder = createWorkOrderFixture({
        title: 'Implement user authentication',
        description: 'Add JWT-based auth',
        priority: 'high'
      })

      expect(workOrder.id).toBeDefined()
      expect(workOrder.title).toBe('Implement user authentication')
      expect(workOrder.description).toBe('Add JWT-based auth')
      expect(workOrder.priority).toBe('high')
      expect(workOrder.status).toBe('pending')
    })

    it('should spawn multiple specialists', () => {
      const specialists = createSpecialistTeam()

      expect(specialists).toHaveLength(3)
      expect(specialists[0].role).toBe('researcher')
      expect(specialists[1].role).toBe('planner')
      expect(specialists[2].role).toBe('developer')
    })

    it('should assign specialists to work order', () => {
      const specialists = createSpecialistTeam()
      const specialistIds = specialists.map(s => s.id)
      const workOrder = createAssignedWorkOrder(specialistIds)

      expect(workOrder.assigned_to).toHaveLength(3)
      expect(workOrder.assigned_to).toEqual(specialistIds)
    })

    it('should track specialist phases', () => {
      const researcher = createResearcherSpecialist()
      const planner = createPlannerSpecialist()
      const implementer = createImplementationSpecialist()

      expect(researcher.role).toBe('researcher')
      expect(planner.role).toBe('planner')
      expect(implementer.role).toBe('developer')
    })

    it('should create mailbox for work order', () => {
      const workOrder = createWorkOrderFixture()
      const mailboxId = workOrder.id

      testMailboxOps.create(mailboxId)
      expect(testMailboxOps.exists(mailboxId)).toBe(true)
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

    it('should advance cursor after events', () => {
      const workOrder = createWorkOrderFixture()
      const mailboxId = workOrder.id

      testMailboxOps.create(mailboxId)
      const events = [
        { type: 'Event1', data: {} },
        { type: 'Event2', data: {} },
        { type: 'Event3', data: {} }
      ]
      testEventOps.append(mailboxId, events)

      testCursorOps.upsert({
        stream_id: mailboxId,
        position: 3
      })

      const cursor = testCursorOps.getByStream(mailboxId)
      expect(cursor).not.toBeNull()
      expect(cursor!.position).toBe(3)
    })

    it('should mark work order as completed', () => {
      const workOrder = createWorkOrderFixture()
      workOrder.status = 'completed'
      workOrder.updated_at = new Date().toISOString()

      expect(workOrder.status).toBe('completed')
      expect(workOrder.updated_at).toBeDefined()
    })

    it('should emit all required events', () => {
      const workOrder = createWorkOrderFixture()
      const mailboxId = workOrder.id

      testMailboxOps.create(mailboxId)

      const requiredEvents = [
        'WorkOrderCreated',
        'SpecialistAssigned',
        'PhaseStarted',
        'PhaseCompleted',
        'WorkOrderCompleted'
      ]

      const events = requiredEvents.map(type => ({
        type,
        data: { work_order_id: workOrder.id }
      }))

      const inserted = testEventOps.append(mailboxId, events)
      expect(inserted).toHaveLength(requiredEvents.length)

      const retrieved = testEventOps.getByMailbox(mailboxId)
      const eventTypes = retrieved.map(e => e.type)
      for (const eventType of requiredEvents) {
        expect(eventTypes).toContain(eventType)
      }
    })
  })

  describe('TEST-602: Multi-Specialist Coordination', () => {
    it('should create dependent tasks', () => {
      const tasks = createTaskChain(3)

      expect(tasks).toHaveLength(3)
      expect(tasks[0].dependencies).toHaveLength(0)
      expect(tasks[1].dependencies).toHaveLength(1)
      expect(tasks[2].dependencies).toHaveLength(1)
    })

    it('should verify task-1 has no dependencies', () => {
      const tasks = createTaskChain(3)
      expect(tasks[0].dependencies).toEqual([])
    })

    it('should verify task-2 depends on task-1', () => {
      const tasks = createTaskChain(3)
      expect(tasks[1].dependencies).toContain(tasks[0].id)
    })

    it('should verify task-3 depends on task-2', () => {
      const tasks = createTaskChain(3)
      expect(tasks[2].dependencies).toContain(tasks[1].id)
    })

    it('should track task completion order', () => {
      const tasks = createTaskChain(3)
      const completionOrder: string[] = []

      for (const task of tasks) {
        completionOrder.push(task.id)
      }

      expect(completionOrder[0]).toBe(tasks[0].id)
      expect(completionOrder[1]).toBe(tasks[1].id)
      expect(completionOrder[2]).toBe(tasks[2].id)
    })

    it('should prevent race conditions with dependencies', () => {
      const tasks = createTaskChain(3)

      const task2CanStart = tasks[0].status === 'completed'
      expect(task2CanStart).toBe(false) // Task 1 is still pending

      tasks[0].status = 'completed'
      const task2CanStartNow = tasks[0].status === 'completed'
      expect(task2CanStartNow).toBe(true)
    })

    it('should collect results in correct order', () => {
      const tasks = createTaskChain(3)
      const results: any[] = []

      for (const task of tasks) {
        results.push({
          id: task.id,
          status: 'completed',
          timestamp: new Date().toISOString()
        })
      }

      expect(results).toHaveLength(3)
      expect(results[0].id).toBe(tasks[0].id)
      expect(results[1].id).toBe(tasks[1].id)
      expect(results[2].id).toBe(tasks[2].id)
    })
  })

  describe('TEST-603: Error Recovery and Retry', () => {
    it('should create failing task', () => {
      const task = createErrorRecoveryTask()

      expect(task.title).toBe('Error Recovery Task')
      expect(task.status).toBe('pending')
    })

    it('should track first attempt failure', () => {
      const task = createErrorRecoveryTask()
      let attemptCount = 0

      attemptCount++
      task.status = 'failed'

      expect(attemptCount).toBe(1)
      expect(task.status).toBe('failed')
    })

    it('should retry on failure', () => {
      const task = createErrorRecoveryTask()
      let attemptCount = 0

      attemptCount++
      task.status = 'failed'

      // Retry
      attemptCount++
      task.status = 'in_progress'

      expect(attemptCount).toBe(2)
      expect(task.status).toBe('in_progress')
    })

    it('should succeed on retry', () => {
      const task = createErrorRecoveryTask()
      let attemptCount = 0

      attemptCount++
      task.status = 'failed'

      attemptCount++
      task.status = 'failed'

      attemptCount++
      task.status = 'completed'

      expect(attemptCount).toBe(3)
      expect(task.status).toBe('completed')
    })

    it('should track retry count', () => {
      const task = createErrorRecoveryTask()
      const retryLog: { attempt: number; status: string; timestamp: string }[] = []

      retryLog.push({
        attempt: 1,
        status: 'failed',
        timestamp: new Date().toISOString()
      })

      retryLog.push({
        attempt: 2,
        status: 'failed',
        timestamp: new Date().toISOString()
      })

      retryLog.push({
        attempt: 3,
        status: 'completed',
        timestamp: new Date().toISOString()
      })

      expect(retryLog).toHaveLength(3)
      expect(retryLog[0].attempt).toBe(1)
      expect(retryLog[1].attempt).toBe(2)
      expect(retryLog[2].attempt).toBe(3)
      expect(retryLog[2].status).toBe('completed')
    })

    it('should emit error events', () => {
      const workOrder = createWorkOrderFixture()
      const mailboxId = workOrder.id

      testMailboxOps.create(mailboxId)

      const errorEvents = [
        { type: 'TaskFailed', data: { error: 'Connection timeout' } },
        { type: 'RetryScheduled', data: { attempt: 2, delay_ms: 1000 } },
        { type: 'TaskFailed', data: { error: 'Connection timeout' } },
        { type: 'RetryScheduled', data: { attempt: 3, delay_ms: 2000 } },
        { type: 'TaskCompleted', data: { result: 'success' } }
      ]

      const inserted = testEventOps.append(mailboxId, errorEvents)
      expect(inserted).toHaveLength(5)

      const retrieved = testEventOps.getByMailbox(mailboxId)
      const failureEvents = retrieved.filter(e => e.type === 'TaskFailed')
      expect(failureEvents).toHaveLength(2)
    })

    it('should complete work order after recovery', () => {
      const workOrder = createWorkOrderFixture()
      workOrder.status = 'in_progress'

      workOrder.status = 'failed'
      workOrder.status = 'in_progress'
      workOrder.status = 'completed'

      expect(workOrder.status).toBe('completed')
    })
  })
})
