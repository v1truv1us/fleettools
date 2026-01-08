/


import { testEventOps, testMailboxOps, resetTestData, resetTestDataToFixture } from '../../helpers/test-db'
import { generateTestId, createTestEvent } from '../../setup'

describe('eventOps', () => {
  beforeEach(() => {
    resetTestData()
  })

  describe('append()', () => {
    it('should append a single event to mailbox', () => {
      const mailboxId = generateTestId('mb')
      testMailboxOps.create(mailboxId)
      
      const events = [createTestEvent(mailboxId)]
      const inserted = testEventOps.append(mailboxId, events)

      expect(inserted).toHaveLength(1)
      expect(inserted[0].id).toBeDefined()
      expect(inserted[0].mailbox_id).toBe(mailboxId)
      expect(inserted[0].type).toBe('TestEvent')
    })

    it('should append multiple events to mailbox', () => {
      const mailboxId = generateTestId('mb')
      testMailboxOps.create(mailboxId)
      
      const events = [
        createTestEvent(mailboxId, 'TaskStarted'),
        createTestEvent(mailboxId, 'TaskCompleted')
      ]
      const inserted = testEventOps.append(mailboxId, events)

      expect(inserted).toHaveLength(2)
    })

    it('should generate unique IDs for each event', () => {
      const mailboxId = generateTestId('mb')
      testMailboxOps.create(mailboxId)
      
      const events = [
        createTestEvent(mailboxId),
        createTestEvent(mailboxId),
        createTestEvent(mailboxId)
      ]
      const inserted = testEventOps.append(mailboxId, events)

      const ids = inserted.map(e => e.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('should create mailbox if it does not exist', () => {
      const mailboxId = generateTestId('mb')
      
      const events = [createTestEvent(mailboxId)]
      const inserted = testEventOps.append(mailboxId, events)

      expect(inserted).toHaveLength(1)
      expect(testMailboxOps.exists(mailboxId)).toBe(true)
    })

    it('should preserve event data', () => {
      const mailboxId = generateTestId('mb')
      testMailboxOps.create(mailboxId)
      
      const event = createTestEvent(mailboxId, 'CustomEvent')
      event.data = JSON.stringify({ key: 'value' })
      event.metadata = JSON.stringify({ priority: 'high' })
      
      const inserted = testEventOps.append(mailboxId, [event])
      
      expect(inserted[0].type).toBe('CustomEvent')
      expect(inserted[0].data).toBe(JSON.stringify({ key: 'value' }))
      expect(inserted[0].metadata).toBe(JSON.stringify({ priority: 'high' }))
    })

    it('should store events in data store', () => {
      const mailboxId = generateTestId('mb')
      testMailboxOps.create(mailboxId)
      
      const events = [createTestEvent(mailboxId)]
      testEventOps.append(mailboxId, events)

      const retrieved = testEventOps.getByMailbox(mailboxId)
      expect(retrieved).toHaveLength(1)
    })
  })

  describe('getByMailbox()', () => {
    it('should return empty array when mailbox has no events', () => {
      const mailboxId = generateTestId('mb')
      testMailboxOps.create(mailboxId)
      
      const events = testEventOps.getByMailbox(mailboxId)
      expect(events).toEqual([])
    })

    it('should return all events for mailbox', () => {
      const mailboxId = generateTestId('mb')
      testMailboxOps.create(mailboxId)
      
      testEventOps.append(mailboxId, [createTestEvent(mailboxId)])
      testEventOps.append(mailboxId, [createTestEvent(mailboxId)])
      testEventOps.append(mailboxId, [createTestEvent(mailboxId)])

      const events = testEventOps.getByMailbox(mailboxId)
      expect(events).toHaveLength(3)
    })

    it('should sort events by occurred_at ascending (oldest first)', () => {
      const mailboxId = generateTestId('mb')
      testMailboxOps.create(mailboxId)
      
      const event1 = createTestEvent(mailboxId, 'First')
      const event2 = createTestEvent(mailboxId, 'Second')
      const event3 = createTestEvent(mailboxId, 'Third')
      
      testEventOps.append(mailboxId, [event1])
      testEventOps.append(mailboxId, [event2])
      testEventOps.append(mailboxId, [event3])

      const events = testEventOps.getByMailbox(mailboxId)
      expect(events[0].type).toBe('First')
      expect(events[1].type).toBe('Second')
      expect(events[2].type).toBe('Third')
    })

    it('should return empty array for non-existent mailbox', () => {
      const events = testEventOps.getByMailbox('non-existent')
      expect(events).toEqual([])
    })

    it('should work with fixture data', () => {
      resetTestDataToFixture()
      
      const events = testEventOps.getByMailbox('test-stream-1')
      expect(events.length).toBeGreaterThanOrEqual(1)
    })
  })
})
