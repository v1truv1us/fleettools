/**
 * FleetTools Test Setup
 * Global test configuration and utilities
 * 
 * Note: In Bun, test globals (describe, test, beforeAll, afterAll, etc.)
 * are automatically available without imports.
 */

import fs from 'fs'
import path from 'path'

// Test directories and files
export const TEST_DIR = path.join(process.cwd(), 'tests')
export const FIXTURES_DIR = path.join(TEST_DIR, 'fixtures')
export const UNIT_DIR = path.join(TEST_DIR, 'unit')
export const INTEGRATION_DIR = path.join(TEST_DIR, 'integration')
export const E2E_DIR = path.join(TEST_DIR, 'e2e')

// Test database paths
export const SQUAWK_FIXTURE_PATH = path.join(FIXTURES_DIR, 'squawk-test.json')
export const SQUAWK_TEMP_PATH = path.join(FIXTURES_DIR, 'squawk-temp.json')

// Test flightline directory
export const FLIGHTLINE_TEST_DIR = path.join(process.cwd(), '.flightline-test')

// Helper to copy fixture to temp location
export function copyTestDatabase(): void {
  if (fs.existsSync(SQUAWK_FIXTURE_PATH)) {
    fs.copyFileSync(SQUAWK_FIXTURE_PATH, SQUAWK_TEMP_PATH)
  } else {
    // Create empty test database if fixture doesn't exist
    const emptyDb = {
      mailboxes: {},
      events: {},
      cursors: {},
      locks: {}
    }
    fs.writeFileSync(SQUAWK_TEMP_PATH, JSON.stringify(emptyDb, null, 2))
  }
}

// Helper to clean up temp database
export function cleanTestDatabase(): void {
  if (fs.existsSync(SQUAWK_TEMP_PATH)) {
    fs.unlinkSync(SQUAWK_TEMP_PATH)
  }
}

// Helper to reset test database to fixture state
export function resetTestDatabase(): void {
  cleanTestDatabase()
  copyTestDatabase()
}

// Helper to ensure test directories exist
export function ensureTestDirectories(): void {
  const dirs = [
    FLIGHTLINE_TEST_DIR,
    path.join(FLIGHTLINE_TEST_DIR, 'work-orders'),
    path.join(FLIGHTLINE_TEST_DIR, 'ctk'),
    path.join(FLIGHTLINE_TEST_DIR, 'tech-orders')
  ]
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

// Helper to clean test directories
export function cleanTestDirectories(): void {
  if (fs.existsSync(FLIGHTLINE_TEST_DIR)) {
    fs.rmSync(FLIGHTLINE_TEST_DIR, { recursive: true, force: true })
  }
}

// Export test utilities
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function createTestMailbox(id: string = generateTestId('mb')) {
  return {
    id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

export function createTestEvent(mailboxId: string, type: string = 'TestEvent') {
  return {
    id: generateTestId('evt'),
    mailbox_id: mailboxId,
    type,
    stream_id: mailboxId,
    data: JSON.stringify({ test: true }),
    occurred_at: new Date().toISOString(),
    causation_id: null,
    metadata: null
  }
}

export function createTestCursor(streamId: string, position: number = 0) {
  return {
    id: `${streamId}_cursor`,
    stream_id: streamId,
    position,
    updated_at: new Date().toISOString()
  }
}

export function createTestLock(filePath: string = '/test/file.txt', specialistId: string = 'test-specialist') {
  return {
    id: generateTestId('lock'),
    file: filePath,
    reserved_by: specialistId,
    reserved_at: new Date().toISOString(),
    released_at: null,
    purpose: 'edit',
    checksum: null,
    timeout_ms: 60000,
    metadata: null
  }
}

export function createTestWorkOrder(title: string = 'Test Work Order') {
  return {
    id: generateTestId('wo'),
    title,
    description: 'Test description',
    status: 'pending',
    priority: 'medium',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    assigned_to: ['test-agent-1'],
    cells: [],
    tech_orders: []
  }
}

export function createTestReservation(filePath: string = '/test/file.txt', specialistId: string = 'test-specialist') {
  return {
    id: generateTestId('res'),
    file: filePath,
    reserved_by: specialistId,
    reserved_at: new Date().toISOString(),
    released_at: null,
    purpose: 'edit',
    checksum: null
  }
}

export function createTestTechOrder(name: string = 'Test Pattern') {
  return {
    id: generateTestId('to'),
    name,
    pattern: 'function ${name}(props) { return <div />; }',
    context: 'Test context',
    created_at: new Date().toISOString()
  }
}
