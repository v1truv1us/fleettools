/**
 * Test Database Helper
 * Provides database isolation and utilities for testing
 */

import fs from 'fs'
import path from 'path'

// Import paths from setup
import { 
  SQUAWK_TEMP_PATH, 
  SQUAWK_FIXTURE_PATH,
  copyTestDatabase,
  cleanTestDatabase,
  resetTestDatabase
} from '../setup'

// Default database path (from squawk/src/db/index.ts)
const DEFAULT_DB_PATH = path.join(process.cwd(), '.local', 'share', 'fleet', 'squawk.json')

// In-memory data store for tests - this is the SINGLE source of truth
let testData: {
  mailboxes: Record<string, any>
  events: Record<string, any[]>
  cursors: Record<string, any>
  locks: Record<string, any>
} = {
  mailboxes: {},
  events: {},
  cursors: {},
  locks: {}
}

// Shared data instance for all test operations
export const testDb = {
  data: testData,
  
  load(): void {
    if (fs.existsSync(SQUAWK_TEMP_PATH)) {
      try {
        const content = fs.readFileSync(SQUAWK_TEMP_PATH, 'utf-8')
        const parsed = JSON.parse(content)
        testDb.data = {
          mailboxes: parsed.mailboxes || {},
          events: parsed.events || {},
          cursors: parsed.cursors || {},
          locks: parsed.locks || {}
        }
      } catch {
        testDb.reset()
      }
    } else {
      testDb.reset()
    }
  },
  
  save(): void {
    fs.writeFileSync(SQUAWK_TEMP_PATH, JSON.stringify(testDb.data, null, 2))
  },
  
  reset(): void {
    testDb.data = {
      mailboxes: {},
      events: {},
      cursors: {},
      locks: {}
    }
  },
  
  loadFromFixture(): void {
    resetTestDatabase()
    testDb.load()
  },
  
  get(): typeof testData {
    return testDb.data
  }
}

// Database operation mocks for testing - all use testDb.data

export const testMailboxOps = {
  getAll: () => {
    return Object.values(testDb.data.mailboxes).sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  },
  
  getById: (id: string) => {
    return testDb.data.mailboxes[id] || null
  },
  
  create: (id: string) => {
    const mailbox = {
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    testDb.data.mailboxes[id] = mailbox
    testDb.save()
    return mailbox
  },
  
  exists: (id: string) => {
    return !!testDb.data.mailboxes[id]
  },
}

export const testEventOps = {
  getByMailbox: (mailboxId: string) => {
    return (testDb.data.events[mailboxId] || []).sort((a: any, b: any) => 
      new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
    )
  },
  
  append: (mailboxId: string, events: any[]): any[] => {
    // Ensure mailbox exists (auto-create behavior)
    if (!testDb.data.mailboxes[mailboxId]) {
      testDb.data.mailboxes[mailboxId] = {
        id: mailboxId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
    
    if (!testDb.data.events[mailboxId]) {
      testDb.data.events[mailboxId] = []
    }
    
    const inserted: any[] = []
    for (const event of events) {
      const newEvent = {
        id: crypto.randomUUID(),
        mailbox_id: mailboxId,
        ...event
      }
      testDb.data.events[mailboxId].push(newEvent)
      inserted.push(newEvent)
    }
    testDb.save()
    return inserted
  },
}

export const testCursorOps = {
  getById: (id: string) => {
    return testDb.data.cursors[id] || null
  },
  
  getByStream: (streamId: string) => {
    return testDb.data.cursors[`${streamId}_cursor`] || null
  },
  
  upsert: (cursor: any) => {
    const id = `${cursor.stream_id}_cursor`
    const newCursor = {
      id,
      stream_id: cursor.stream_id,
      position: cursor.position,
      updated_at: new Date().toISOString()
    }
    testDb.data.cursors[id] = newCursor
    testDb.save()
    return newCursor
  },
}

export const testLockOps = {
  getAll: (): any[] => {
    const now = Date.now()
    return Object.values(testDb.data.locks).filter((lock: any) => {
      if (lock.released_at) return false
      const reservedAt = new Date(lock.reserved_at).getTime()
      const expiresAt = reservedAt + lock.timeout_ms
      return now < expiresAt
    })
  },
  
  getById: (id: string): any => {
    return testDb.data.locks[id] || null
  },
  
  acquire: (lock: any): any => {
    const id = crypto.randomUUID()
    const newLock = {
      id,
      ...lock,
      released_at: null
    }
    // Store using the lock.id (which may have been set by spread)
    testDb.data.locks[newLock.id] = newLock
    testDb.save()
    return newLock
  },
  
  release: (id: string): any => {
    if (testDb.data.locks[id]) {
      testDb.data.locks[id].released_at = new Date().toISOString()
      testDb.save()
    }
    return testDb.data.locks[id] || null
  },
  
  getExpired: (): any[] => {
    const now = Date.now()
    return Object.values(testDb.data.locks).filter((lock: any) => {
      if (lock.released_at) return false
      const reservedAt = new Date(lock.reserved_at).getTime()
      const expiresAt = reservedAt + lock.timeout_ms
      return now >= expiresAt
    })
  },
  
  releaseExpired: (): number => {
    const expired = testLockOps.getExpired()
    for (const lock of expired) {
      testLockOps.release(lock.id)
    }
    return expired.length
  },
}

// All test operations
export const testDbOps = {
  mailbox: testMailboxOps,
  event: testEventOps,
  cursor: testCursorOps,
  lock: testLockOps
}

// Export for convenience
export { resetTestDatabase, copyTestDatabase } from '../setup'

// Re-export reset functions using testDb
export function resetTestData(): void {
  testDb.reset()
}

export function resetTestDataToFixture(): void {
  testDb.loadFromFixture()
}

export function initTestData(): void {
  testDb.load()
}
