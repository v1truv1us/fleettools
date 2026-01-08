
import { generateTestId } from '../setup'

export interface SpecialistFixture {
  id: string
  name: string
  role: string
  status: 'idle' | 'busy' | 'offline'
  created_at: string
  updated_at: string
  capabilities?: string[]
  current_task?: string
}

export function createSpecialistFixture(overrides?: Partial<SpecialistFixture>): SpecialistFixture {
  const now = new Date().toISOString()
  return {
    id: generateTestId('spec'),
    name: 'Test Specialist',
    role: 'developer',
    status: 'idle',
    created_at: now,
    updated_at: now,
    capabilities: ['coding', 'testing', 'documentation'],
    ...overrides
  }
}

export function createResearcherSpecialist(): SpecialistFixture {
  return createSpecialistFixture({
    name: 'Research Specialist',
    role: 'researcher',
    capabilities: ['research', 'analysis', 'documentation']
  })
}

export function createPlannerSpecialist(): SpecialistFixture {
  return createSpecialistFixture({
    name: 'Planning Specialist',
    role: 'planner',
    capabilities: ['planning', 'architecture', 'design']
  })
}

export function createImplementationSpecialist(): SpecialistFixture {
  return createSpecialistFixture({
    name: 'Implementation Specialist',
    role: 'developer',
    capabilities: ['coding', 'testing', 'debugging']
  })
}

export function createBusySpecialist(): SpecialistFixture {
  return createSpecialistFixture({
    status: 'busy',
    current_task: generateTestId('task')
  })
}

export function createOfflineSpecialist(): SpecialistFixture {
  return createSpecialistFixture({
    status: 'offline'
  })
}

export function createMultipleSpecialists(count: number, overrides?: Partial<SpecialistFixture>): SpecialistFixture[] {
  const specialists: SpecialistFixture[] = []
  for (let i = 0; i < count; i++) {
    specialists.push(createSpecialistFixture({
      ...overrides,
      name: `Specialist ${i + 1}`
    }))
  }
  return specialists
}

export function createSpecialistTeam(): SpecialistFixture[] {
  return [
    createResearcherSpecialist(),
    createPlannerSpecialist(),
    createImplementationSpecialist()
  ]
}

export function createSpecialistsWithCapabilities(capabilities: string[]): SpecialistFixture {
  return createSpecialistFixture({
    capabilities,
    name: `Specialist with ${capabilities.join(', ')}`
  })
}

export function createParallelSpecialist(index: number): SpecialistFixture {
  return createSpecialistFixture({
    name: `Parallel Specialist ${index}`,
    id: generateTestId(`spec-parallel-${index}`)
  })
}

export function createSequentialSpecialist(index: number): SpecialistFixture {
  return createSpecialistFixture({
    name: `Sequential Specialist ${index}`,
    id: generateTestId(`spec-seq-${index}`)
  })
}

export function createErrorRecoverySpecialist(): SpecialistFixture {
  return createSpecialistFixture({
    name: 'Error Recovery Specialist',
    role: 'developer',
    capabilities: ['error-handling', 'recovery', 'retry-logic']
  })
}

export function createCheckpointSpecialist(): SpecialistFixture {
  return createSpecialistFixture({
    name: 'Checkpoint Specialist',
    role: 'developer',
    capabilities: ['checkpointing', 'resumption', 'state-management']
  })
}

export function createBlockerDetectionSpecialist(): SpecialistFixture {
  return createSpecialistFixture({
    name: 'Blocker Detection Specialist',
    role: 'coordinator',
    capabilities: ['blocker-detection', 'dependency-resolution', 'coordination']
  })
}

export function createConcurrentOperationSpecialist(index: number): SpecialistFixture {
  return createSpecialistFixture({
    name: `Concurrent Operation Specialist ${index}`,
    id: generateTestId(`spec-concurrent-${index}`),
    capabilities: ['concurrent-operations', 'lock-management', 'synchronization']
  })
}
