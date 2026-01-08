
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

export function createHighPriorityWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    priority: 'high',
    title: 'High Priority Work Order'
  })
}

export function createCriticalWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    priority: 'critical',
    title: 'Critical Work Order'
  })
}

export function createAssignedWorkOrder(specialistIds: string[]): WorkOrderFixture {
  return createWorkOrderFixture({
    assigned_to: specialistIds,
    title: `Work Order assigned to ${specialistIds.length} specialist(s)`
  })
}

export function createInProgressWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    status: 'in_progress',
    title: 'In Progress Work Order'
  })
}

export function createCompletedWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    status: 'completed',
    title: 'Completed Work Order'
  })
}

export function createFailedWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    status: 'failed',
    title: 'Failed Work Order'
  })
}

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

export function createWorkOrderWithTechOrders(techOrderIds: string[]): WorkOrderFixture {
  return createWorkOrderFixture({
    tech_orders: techOrderIds.map(id => ({ id })),
    title: 'Work Order with Tech Orders'
  })
}

export function createWorkOrderWithCells(cellIds: string[]): WorkOrderFixture {
  return createWorkOrderFixture({
    cells: cellIds.map(id => ({ id })),
    title: 'Work Order with Cells'
  })
}

export function createLongRunningWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    title: 'Long Running Work Order',
    description: 'A work order that takes a long time to complete'
  })
}

export function createFailingWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    title: 'Failing Work Order',
    description: 'This work order is designed to fail',
    priority: 'high'
  })
}

export function createRetryableWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    title: 'Retryable Work Order',
    description: 'This work order can be retried on failure'
  })
}

export function createConcurrentWorkOrder(index: number): WorkOrderFixture {
  return createWorkOrderFixture({
    title: `Concurrent Work Order ${index}`,
    description: `Concurrent work order for testing parallel execution (${index})`
  })
}

export function createSequentialWorkOrder(index: number, dependsOn?: string): WorkOrderFixture {
  return createWorkOrderFixture({
    title: `Sequential Work Order ${index}`,
    description: dependsOn 
      ? `Sequential work order ${index} (depends on ${dependsOn})`
      : `Sequential work order ${index}`
  })
}

export function createCheckpointWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    title: 'Checkpoint Work Order',
    description: 'Work order for testing checkpoint creation and resumption'
  })
}

export function createBlockedWorkOrder(blockedBy: string): WorkOrderFixture {
  return createWorkOrderFixture({
    title: 'Blocked Work Order',
    description: `This work order is blocked by ${blockedBy}`
  })
}

export function createBlockingWorkOrder(): WorkOrderFixture {
  return createWorkOrderFixture({
    title: 'Blocking Work Order',
    description: 'This work order blocks other work orders'
  })
}
