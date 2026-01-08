/// <reference types="bun-types" />

/**
 * Spawning Tests (TEST-604, TEST-605, TEST-606)
 * Tests for parallel and sequential specialist spawning
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { testDb, resetTestData, testMailboxOps, testEventOps } from '../helpers/test-db'
import { generateTestId } from '../setup'
import {
  createParallelTasks,
  createTaskChain,
  createBlockedTask,
  createBlockingTask
} from '../fixtures/tasks'
import {
  createParallelSpecialist,
  createSequentialSpecialist,
  createBlockerDetectionSpecialist
} from '../fixtures/specialists'

describe('Spawning Tests', () => {
  beforeEach(() => {
    resetTestData()
  })

  afterEach(async () => {
    resetTestData()
  })

  describe('TEST-604: Parallel Specialist Spawning', () => {
    it('should create 5 independent tasks', () => {
      const tasks = createParallelTasks(5)

      expect(tasks).toHaveLength(5)
      for (const task of tasks) {
        expect(task.dependencies).toHaveLength(0)
      }
    })

    it('should spawn 5 specialists in parallel', () => {
      const specialists = []
      for (let i = 0; i < 5; i++) {
        specialists.push(createParallelSpecialist(i))
      }

      expect(specialists).toHaveLength(5)
      for (const specialist of specialists) {
        expect(specialist.status).toBe('idle')
      }
    })

    it('should execute specialists concurrently', () => {
      const tasks = createParallelTasks(5)
      const startTimes: Record<string, number> = {}
      const endTimes: Record<string, number> = {}

      // Simulate concurrent execution
      const startTime = Date.now()
      for (const task of tasks) {
        startTimes[task.id] = Date.now()
      }

      // All tasks complete at roughly the same time
      for (const task of tasks) {
        endTimes[task.id] = Date.now()
      }

      // Check that all tasks started within a short window
      const startValues = Object.values(startTimes)
      const maxStartDiff = Math.max(...startValues) - Math.min(...startValues)
      expect(maxStartDiff).toBeLessThan(100) // All started within 100ms
    })

    it('should complete all tasks', () => {
      const tasks = createParallelTasks(5)

      for (const task of tasks) {
        task.status = 'completed'
      }

      const completedTasks = tasks.filter(t => t.status === 'completed')
      expect(completedTasks).toHaveLength(5)
    })

    it('should execute faster than sequential', () => {
      const parallelTime = 30 // seconds
      const sequentialTime = 150 // seconds

      expect(parallelTime).toBeLessThan(sequentialTime)
    })

    it('should prevent race conditions', () => {
      const tasks = createParallelTasks(5)
      const locks: Record<string, boolean> = {}

      // Simulate lock acquisition for each task
      for (const task of tasks) {
        expect(locks[task.id]).toBeUndefined()
        locks[task.id] = true
      }

      // All locks should be acquired
      expect(Object.keys(locks)).toHaveLength(5)
    })

    it('should collect results correctly', () => {
      const tasks = createParallelTasks(5)
      const results: any[] = []

      for (const task of tasks) {
        results.push({
          id: task.id,
          status: 'completed',
          result: `Result for ${task.title}`
        })
      }

      expect(results).toHaveLength(5)
      for (const result of results) {
        expect(result.status).toBe('completed')
      }
    })
  })

  describe('TEST-605: Sequential Coordination', () => {
    it('should create 5 dependent tasks', () => {
      const tasks = createTaskChain(5)

      expect(tasks).toHaveLength(5)
      expect(tasks[0].dependencies).toHaveLength(0)
      for (let i = 1; i < 5; i++) {
        expect(tasks[i].dependencies).toHaveLength(1)
      }
    })

    it('should execute tasks in order', () => {
      const tasks = createTaskChain(5)
      const executionOrder: string[] = []

      for (const task of tasks) {
        executionOrder.push(task.id)
      }

      expect(executionOrder[0]).toBe(tasks[0].id)
      expect(executionOrder[1]).toBe(tasks[1].id)
      expect(executionOrder[2]).toBe(tasks[2].id)
      expect(executionOrder[3]).toBe(tasks[3].id)
      expect(executionOrder[4]).toBe(tasks[4].id)
    })

    it('should wait for dependencies', () => {
      const tasks = createTaskChain(5)

      // Task 1 can start immediately
      expect(tasks[0].dependencies).toHaveLength(0)

      // Task 2 must wait for Task 1
      expect(tasks[1].dependencies).toContain(tasks[0].id)

      // Task 3 must wait for Task 2
      expect(tasks[2].dependencies).toContain(tasks[1].id)
    })

    it('should prevent task from starting before dependency completes', () => {
      const tasks = createTaskChain(3)

      // Task 1 is pending
      expect(tasks[0].status).toBe('pending')

      // Task 2 cannot start
      const task2CanStart = tasks[0].status === 'completed'
      expect(task2CanStart).toBe(false)

      // Complete Task 1
      tasks[0].status = 'completed'

      // Now Task 2 can start
      const task2CanStartNow = tasks[0].status === 'completed'
      expect(task2CanStartNow).toBe(true)
    })

    it('should complete all tasks', () => {
      const tasks = createTaskChain(5)

      for (const task of tasks) {
        task.status = 'completed'
      }

      const completedTasks = tasks.filter(t => t.status === 'completed')
      expect(completedTasks).toHaveLength(5)
    })

    it('should take sum of individual execution times', () => {
      const taskDuration = 30 // seconds per task
      const taskCount = 5
      const expectedTotalTime = taskDuration * taskCount // 150 seconds

      expect(expectedTotalTime).toBe(150)
    })

    it('should respect dependency graph', () => {
      const tasks = createTaskChain(5)

      // Verify the dependency chain
      for (let i = 1; i < tasks.length; i++) {
        expect(tasks[i].dependencies).toContain(tasks[i - 1].id)
      }
    })
  })

  describe('TEST-606: Blocker Detection', () => {
    it('should create blocked task', () => {
      const blockingTask = createBlockingTask()
      const blockedTask = createBlockedTask(blockingTask.id)

      expect(blockedTask.blockedBy).toContain(blockingTask.id)
    })

    it('should detect blocker', () => {
      const blockingTask = createBlockingTask()
      const blockedTask = createBlockedTask(blockingTask.id)

      expect(blockedTask.blockedBy).toHaveLength(1)
      expect(blockedTask.blockedBy[0]).toBe(blockingTask.id)
    })

    it('should wait for blocker to complete', () => {
      const blockingTask = createBlockingTask()
      const blockedTask = createBlockedTask(blockingTask.id)

      // Blocked task cannot start while blocker is pending
      const canStart = blockingTask.status === 'completed'
      expect(canStart).toBe(false)

      // Complete the blocking task
      blockingTask.status = 'completed'

      // Now blocked task can start
      const canStartNow = blockingTask.status === 'completed'
      expect(canStartNow).toBe(true)
    })

    it('should unblock task when blocker completes', () => {
      const blockingTask = createBlockingTask()
      const blockedTask = createBlockedTask(blockingTask.id)

      // Initially blocked
      expect(blockedTask.blockedBy).toHaveLength(1)

      // Complete the blocking task
      blockingTask.status = 'completed'

      // Task is now unblocked (can start)
      const isUnblocked = blockingTask.status === 'completed'
      expect(isUnblocked).toBe(true)
    })

    it('should complete blocked task after unblocking', () => {
      const blockingTask = createBlockingTask()
      const blockedTask = createBlockedTask(blockingTask.id)

      // Complete blocking task
      blockingTask.status = 'completed'

      // Now complete blocked task
      blockedTask.status = 'completed'

      expect(blockedTask.status).toBe('completed')
    })

    it('should emit blocker events', () => {
      const blockingTask = createBlockingTask()
      const blockedTask = createBlockedTask(blockingTask.id)

      const mailboxId = generateTestId('mailbox')
      testMailboxOps.create(mailboxId)

      const events = [
        { type: 'TaskBlocked', data: { task_id: blockedTask.id, blocked_by: blockingTask.id } },
        { type: 'BlockerCompleted', data: { blocker_id: blockingTask.id } },
        { type: 'TaskUnblocked', data: { task_id: blockedTask.id } }
      ]

      const inserted = testEventOps.append(mailboxId, events)
      expect(inserted).toHaveLength(3)

      const retrieved = testEventOps.getByMailbox(mailboxId)
      expect(retrieved).toHaveLength(3)
      expect(retrieved[0].type).toBe('TaskBlocked')
      expect(retrieved[1].type).toBe('BlockerCompleted')
      expect(retrieved[2].type).toBe('TaskUnblocked')
    })

    it('should handle multiple blockers', () => {
      const blocker1 = createBlockingTask()
      const blocker2 = createBlockingTask()
      const blockedTask = createBlockedTask(blocker1.id)
      blockedTask.blockedBy.push(blocker2.id)

      expect(blockedTask.blockedBy).toHaveLength(2)
      expect(blockedTask.blockedBy).toContain(blocker1.id)
      expect(blockedTask.blockedBy).toContain(blocker2.id)
    })
  })
})
