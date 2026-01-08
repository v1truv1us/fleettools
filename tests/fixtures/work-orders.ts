/**
 * Work Order Test Fixtures
 * Provides reusable test data for work order tests
 */

import { generateTestId } from '../setup'

export interface WorkOrderFixture {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
  updated_at: string
  assigned_to: string[]
  cells: any[]
  tech_orders: any[]
}

/**
 * Create a basic work order fixture
 */
export function createWorkOrderFixture(overrides?: Partial<WorkOrderFixture>): WorkOrderFixture {
  const now = new Date().toISOString()
  return {
    id: generateTestId('wo'),
    title: 'Test Work Order',
    description: 'A test work order for integration testing',
    status: 'pending',
    priority: 'medium',
    created_at: now,
    updated_at: now,
    assigned_to: [],
    cells: [],
    tech_orders: [],
    ...overrides
  }
}

/**
 * Create a high-priority work order
 */
export function createHighPriorityWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    priority: 'high',
    title: 'High Priority Work Order'
  })
}

/**
 * Create a critical-priority work order
 */
export function createCriticalWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    priority: 'critical',
    title: 'Critical Work Order'
  })
}

/**
 * Create a work order with assigned specialists
 */
export function createAssignedWorkOrder(specialistIds: string[]): WorkOrderFixture {
  return createWorkOrderFixture({
    assigned_to: specialistIds,
    title: `Work Order assigned to ${specialistIds.length} specialist(s)`
  })
}

/**
 * Create a work order in progress
 */
export function createInProgressWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    status: 'in_progress',
    title: 'In Progress Work Order'
  })
}

/**
 * Create a completed work order
 */
export function createCompletedWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    status: 'completed',
    title: 'Completed Work Order'
  })
}

/**
 * Create a failed work order
 */
export function createFailedWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    status: 'failed',
    title: 'Failed Work Order'
  })
}

/**
 * Create multiple work orders
 */
export function createMultipleWorkOrders(count: number, overrides?: Partial<WorkOrderFixture>): WorkOrderFixture[] {
  const orders: WorkOrderFixture[] = []
  for (let i = 0; i < count; i++) {
    orders.push(createWorkOrderFixture({
      ...overrides,
      title: `Work Order ${i + 1}`
    }))
  }
  return orders
}

/**
 * Create a work order with tech orders
 */
export function createWorkOrderWithTechOrders(techOrderIds: string[]): WorkOrderFixture {
  return createWorkOrderFixture({
    tech_orders: techOrderIds.map(id => ({ id })),
    title: 'Work Order with Tech Orders'
  })
}

/**
 * Create a work order with cells
 */
export function createWorkOrderWithCells(cellIds: string[]): WorkOrderFixture {
  return createWorkOrderFixture({
    cells: cellIds.map(id => ({ id })),
    title: 'Work Order with Cells'
  })
}

/**
 * Create a long-running work order
 */
export function createLongRunningWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    title: 'Long Running Work Order',
    description: 'A work order that takes a long time to complete'
  })
}

/**
 * Create a work order for testing error scenarios
 */
export function createFailingWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    title: 'Failing Work Order',
    description: 'This work order is designed to fail',
    priority: 'high'
  })
}

/**
 * Create a work order for testing retry scenarios
 */
export function createRetryableWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    title: 'Retryable Work Order',
    description: 'This work order can be retried on failure'
  })
}

/**
 * Create a work order for testing concurrent operations
 */
export function createConcurrentWorkOrder(index: number): WorkOrderFixture {
  return createWorkOrderFixture({
    title: `Concurrent Work Order ${index}`,
    description: `Concurrent work order for testing parallel execution (${index})`
  })
}

/**
 * Create a work order for testing sequential operations
 */
export function createSequentialWorkOrder(index: number, dependsOn?: string): WorkOrderFixture {
  return createWorkOrderFixture({
    title: `Sequential Work Order ${index}`,
    description: dependsOn 
      ? `Sequential work order ${index} (depends on ${dependsOn})`
      : `Sequential work order ${index}`
  })
}

/**
 * Create a work order for testing checkpoint functionality
 */
export function createCheckpointWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    title: 'Checkpoint Work Order',
    description: 'Work order for testing checkpoint creation and resumption'
  })
}

/**
 * Create a work order for testing blocker detection
 */
export function createBlockedWorkOrder(blockedBy: string): WorkOrderFixture {
  return createWorkOrderFixture({
    title: 'Blocked Work Order',
    description: `This work order is blocked by ${blockedBy}`
  })
}

/**
 * Create a work order for testing blocker resolution
 */
export function createBlockingWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    title: 'Blocking Work Order',
    description: 'This work order blocks other work orders'
  })
}
