

import { testMailboxOps, resetTestData, resetTestDataToFixture } from '../../helpers/test-db'
import { generateTestId } from '../../setup'

describe('mailboxOps', () => {
  beforeEach(() => {
    resetTestData()
  })

  describe('create()', () => {
    it('should create a new mailbox with correct structure', () => {
      const id = generateTestId('mb')
      const mailbox = testMailboxOps.create(id)

      expect(mailbox).toBeDefined()
      expect(mailbox.id).toBe(id)
      expect(mailbox.created_at).toBeDefined()
      expect(mailbox.updated_at).toBeDefined()
      expect(typeof mailbox.created_at).toBe('string')
      expect(typeof mailbox.updated_at).toBe('string')
    })

    it('should store mailbox in data store', () => {
      const id = generateTestId('mb')
      testMailboxOps.create(id)

      const retrieved = testMailboxOps.getById(id)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(id)
    })

    it('should generate ISO timestamp', () => {
      const id = generateTestId('mb')
      const before = new Date().toISOString()
      const mailbox = testMailboxOps.create(id)
      const after = new Date().toISOString()

      expect(mailbox.created_at >= before).toBe(true)
      expect(mailbox.created_at <= after).toBe(true)
    })
  })

  describe('getById()', () => {
    it('should return mailbox when it exists', () => {
      const id = generateTestId('mb')
      testMailboxOps.create(id)

      const mailbox = testMailboxOps.getById(id)
      expect(mailbox).not.toBeNull()
      expect(mailbox!.id).toBe(id)
    })

    it('should return null when mailbox does not exist', () => {
      const mailbox = testMailboxOps.getById('non-existent-id')
      expect(mailbox).toBeNull()
    })

    it('should return correct mailbox data', () => {
      const id = generateTestId('mb')
      const created = testMailboxOps.create(id)

      const retrieved = testMailboxOps.getById(id)
      expect(retrieved!.id).toBe(created.id)
      expect(retrieved!.created_at).toBe(created.created_at)
      expect(retrieved!.updated_at).toBe(created.updated_at)
    })
  })

  describe('exists()', () => {
    it('should return true for existing mailbox', () => {
      const id = generateTestId('mb')
      testMailboxOps.create(id)

      expect(testMailboxOps.exists(id)).toBe(true)
    })

    it('should return false for non-existent mailbox', () => {
      expect(testMailboxOps.exists('non-existent')).toBe(false)
    })

    it('should return true for created mailbox', () => {
      const id = generateTestId('mb')
      testMailboxOps.create(id)
      expect(testMailboxOps.exists(id)).toBe(true)
    })
  })

  describe('getAll()', () => {
    it('should return empty array when no mailboxes exist', () => {
      resetTestData()
      const mailboxes = testMailboxOps.getAll()
      expect(mailboxes).toEqual([])
    })

    it('should return all created mailboxes', () => {
      const id1 = generateTestId('mb')
      const id2 = generateTestId('mb')
      testMailboxOps.create(id1)
      testMailboxOps.create(id2)

      const mailboxes = testMailboxOps.getAll()
      expect(mailboxes).toHaveLength(2)
    })

    it('should sort mailboxes by created_at descending (newest first)', () => {
      const id1 = generateTestId('mb')
      const id2 = generateTestId('mb')
      const id3 = generateTestId('mb')
      
      testMailboxOps.create(id1)
      testMailboxOps.create(id2)
      testMailboxOps.create(id3)

      const mailboxes = testMailboxOps.getAll()
      
      const timestamps = mailboxes.map(m => m.created_at)
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i] >= timestamps[i + 1]).toBe(true)
      }
    })

    it('should work with fixture data', () => {
      resetTestDataToFixture()
      
      const mailboxes = testMailboxOps.getAll()
      expect(mailboxes.length).toBeGreaterThanOrEqual(1)
    })
  })
})
