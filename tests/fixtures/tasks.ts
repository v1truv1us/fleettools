
import { generateTestId } from '../setup'

export interface TaskFixture {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused'
  priority: 'low' | 'medium' | 'high' | 'critical'
  dependencies: string[]
  blockedBy: string[]
  created_at: string
  updated_at: string
  assigned_to?: string
  duration?: number
  checkpointIntervals?: number[]
}

export function createTaskFixture(overrides?: Partial<TaskFixture>): TaskFixture {
  const now = new Date().toISOString()
  return {
    id: generateTestId('task'),
    title: 'Test Task',
    description: 'A test task for integration testing',
    status: 'pending',
    priority: 'medium',
    dependencies: [],
    blockedBy: [],
    created_at: now,
    updated_at: now,
    ...overrides
  }
}

export function createSimpleTask(): TaskFixture {
  return createTaskFixture({
    title: 'Simple Task',
    description: 'A simple task with no dependencies'
  })
}

export function createDependentTask(dependsOn: string[]): TaskFixture {
  return createTaskFixture({
    title: 'Dependent Task',
    description: `Task that depends on ${dependsOn.length} other task(s)`,
    dependencies: dependsOn
  })
}

export function createBlockingTask(): TaskFixture {
  return createTaskFixture({
    title: 'Blocking Task',
    description: 'This task blocks other tasks'
  })
}

export function createBlockedTask(blockedBy: string): TaskFixture {
  return createTaskFixture({
    title: 'Blocked Task',
    description: `This task is blocked by ${blockedBy}`,
    blockedBy: [blockedBy]
  })
}

export function createInProgressTask(): TaskFixture {
  return createTaskFixture({
    status: 'in_progress',
    title: 'In Progress Task'
  })
}

export function createCompletedTask(): TaskFixture {
  return createTaskFixture({
    status: 'completed',
    title: 'Completed Task'
  })
}

export function createFailedTask(): TaskFixture {
  return createTaskFixture({
    status: 'failed',
    title: 'Failed Task'
  })
}

export function createMultipleTasks(count: number, overrides?: Partial<TaskFixture>): TaskFixture[] {
  const tasks: TaskFixture[] = []
  for (let i = 0; i < count; i++) {
    tasks.push(createTaskFixture({
      ...overrides,
      title: `Task ${i + 1}`
    }))
  }
  return tasks
}

export function createTaskChain(length: number): TaskFixture[] {
  const tasks: TaskFixture[] = []
  for (let i = 0; i < length; i++) {
    const dependencies = i > 0 ? [tasks[i - 1].id] : []
    tasks.push(createTaskFixture({
      title: `Task ${i + 1}`,
      dependencies,
      id: generateTestId(`task-chain-${i}`)
    }))
  }
  return tasks
}

export function createParallelTasks(count: number): TaskFixture[] {
  const tasks: TaskFixture[] = []
  for (let i = 0; i < count; i++) {
    tasks.push(createTaskFixture({
      title: `Parallel Task ${i + 1}`,
      id: generateTestId(`task-parallel-${i}`),
      dependencies: []
    }))
  }
  return tasks
}

export function createLongRunningTask(durationMs: number = 120000): TaskFixture {
  return createTaskFixture({
    title: 'Long Running Task',
    description: 'A task that takes a long time to complete',
    duration: durationMs
  })
}

export function createCheckpointTask(intervals: number[] = [25, 50, 75]): TaskFixture {
  return createTaskFixture({
    title: 'Checkpoint Task',
    description: 'Task with checkpoint intervals',
    duration: 120000,
    checkpointIntervals: intervals
  })
}

export function createErrorRecoveryTask(): TaskFixture {
  return createTaskFixture({
    title: 'Error Recovery Task',
    description: 'Task designed to test error recovery and retry logic',
    priority: 'high'
  })
}

export function createConcurrentTask(index: number): TaskFixture {
  return createTaskFixture({
    title: `Concurrent Task ${index}`,
    id: generateTestId(`task-concurrent-${index}`),
    dependencies: []
  })
}

export function createSequentialTask(index: number, dependsOn?: string): TaskFixture {
  return createTaskFixture({
    title: `Sequential Task ${index}`,
    id: generateTestId(`task-seq-${index}`),
    dependencies: dependsOn ? [dependsOn] : []
  })
}

export function createHighPriorityTask(): TaskFixture {
  return createTaskFixture({
    priority: 'high',
    title: 'High Priority Task'
  })
}

export function createCriticalTask(): TaskFixture {
  return createTaskFixture({
    priority: 'critical',
    title: 'Critical Task'
  })
}

export function createAssignedTask(specialistId: string): TaskFixture {
  return createTaskFixture({
    assigned_to: specialistId,
    title: `Task assigned to ${specialistId}`
  })
}

export function createComplexTaskGraph(): TaskFixture[] {
  const task1 = createTaskFixture({
    id: 'task-1',
    title: 'Setup Database',
    dependencies: []
  })
  
  const task2 = createTaskFixture({
    id: 'task-2',
    title: 'Create Schema',
    dependencies: ['task-1']
  })
  
  const task3 = createTaskFixture({
    id: 'task-3',
    title: 'Seed Data',
    dependencies: ['task-2']
  })
  
  const task4 = createTaskFixture({
    id: 'task-4',
    title: 'Run Migrations',
    dependencies: ['task-2']
  })
  
  const task5 = createTaskFixture({
    id: 'task-5',
    title: 'Verify Setup',
    dependencies: ['task-3', 'task-4']
  })
  
  return [task1, task2, task3, task4, task5]
}
