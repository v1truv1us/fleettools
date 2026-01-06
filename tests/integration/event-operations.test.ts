/**
 * Event Operations Integration Tests
 * 
 * Tests the actual SQLiteAdapter EventOps implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { SQLiteAdapter } from '../../squawk/src/db/sqlite';
import type { AppendEventInput } from '../../squawk/src/db/types';

describe('Event Operations Integration Tests', () => {
  let adapter: SQLiteAdapter;

  beforeEach(async () => {
    adapter = new SQLiteAdapter(':memory:');
    await adapter.initialize();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.close();
    }
  });

  describe('Event Append functionality', () => {
    it('should append events with sequential numbers', async () => {
      const event1Input: AppendEventInput = {
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { title: 'Test Mission 1' }
      };

      const event2Input: AppendEventInput = {
        event_type: 'mission_started',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: {}
      };

      const event1 = await adapter.events.append(event1Input);
      const event2 = await adapter.events.append(event2Input);

      expect(event1.sequence_number).toBe(1);
      expect(event2.sequence_number).toBe(2);
      expect(event1.event_id).toMatch(/^evt_[a-z0-9]{8}$/);
      expect(event2.event_id).toMatch(/^evt_[a-z0-9]{8}$/);
      expect(event2.causation_id).toBeUndefined();
    });

    it('should handle causation and correlation tracking', async () => {
      const correlationId = 'corr_test_123';

      const event1 = await adapter.events.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { title: 'Test Mission' },
        correlation_id: correlationId
      });

      const event2 = await adapter.events.append({
        event_type: 'mission_started',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: {},
        causation_id: event1.event_id,
        correlation_id: correlationId
      });

      expect(event1.correlation_id).toBe(correlationId);
      expect(event2.causation_id).toBe(event1.event_id);
      expect(event2.correlation_id).toBe(correlationId);
    });
  });

  describe('Event Query functionality', () => {
    beforeEach(async () => {
      // Setup test data
      await adapter.events.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { title: 'Mission 1' }
      });

      await adapter.events.append({
        event_type: 'mission_started',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: {}
      });

      await adapter.events.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-2',
        data: { title: 'Mission 2' }
      });
    });

    it('should query events by stream', async () => {
      const mission1Events = await adapter.events.queryByStream('mission', 'msn-test-1');
      const mission2Events = await adapter.events.queryByStream('mission', 'msn-test-2');

      expect(mission1Events).toHaveLength(2);
      expect(mission2Events).toHaveLength(1);
      expect(mission1Events[0].sequence_number).toBe(1);
      expect(mission1Events[1].sequence_number).toBe(2);
    });

    it('should query events by type', async () => {
      const missionCreatedEvents = await adapter.events.queryByType('mission_created');
      const missionStartedEvents = await adapter.events.queryByType('mission_started');

      expect(missionCreatedEvents).toHaveLength(2);
      expect(missionStartedEvents).toHaveLength(1);
    });

    it('should query events with filters', async () => {
      const events = await adapter.events.getEvents({
        stream_id: 'msn-test-1',
        event_type: 'mission_created'
      });

      expect(events).toHaveLength(1);
      expect(events[0].stream_id).toBe('msn-test-1');
      expect(events[0].event_type).toBe('mission_created');
    });
  });

  describe('Cross-stream sequence numbering', () => {
    it('should maintain separate sequences for different streams', async () => {
      // Add events to different streams
      const msnEvent1 = await adapter.events.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-1',
        data: { title: 'Mission 1' }
      });

      const srtEvent1 = await adapter.events.append({
        event_type: 'sortie_created',
        stream_type: 'sortie',
        stream_id: 'srt-1',
        data: { title: 'Sortie 1' }
      });

      const msnEvent2 = await adapter.events.append({
        event_type: 'mission_started',
        stream_type: 'mission',
        stream_id: 'msn-1',
        data: {}
      });

      const srtEvent2 = await adapter.events.append({
        event_type: 'sortie_assigned',
        stream_type: 'sortie',
        stream_id: 'srt-1',
        data: {}
      });

      // Each stream should have its own sequence
      expect(msnEvent1.sequence_number).toBe(1);
      expect(msnEvent2.sequence_number).toBe(2);
      expect(srtEvent1.sequence_number).toBe(1);
      expect(srtEvent2.sequence_number).toBe(2);
    });
  });
});