/**
 * Event Operations Tests (EVT-001 to EVT-008)
 *
 * These tests verify the SQLiteAdapter EventOps implementation:
 * - Event append with sequence numbers
 * - Unique event ID generation
 * - Causation and correlation tracking
 * - Event queries by stream, type, and sequence
 * - Event schema validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { SQLiteAdapter } from '../../../../squawk/src/db/sqlite';
import type { Event, AppendEventInput, EventFilter } from '../../../../squawk/src/db/types';

describe('Event Operations Tests (EVT-001 to EVT-008)', () => {
  let adapter: SQLiteAdapter;
  let eventOps: any;

  beforeEach(async () => {
    adapter = new SQLiteAdapter(':memory:');
    await adapter.initialize();
    eventOps = adapter.events;
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.close();
    }
  });

  describe('EVT-001: should append event with sequence number', () => {
    it('should generate sequential numbers for events in same stream', async () => {
      const event1 = await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { title: 'Test Mission 1' }
      });

      const event2 = await eventOps.append({
        event_type: 'mission_updated',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { title: 'Test Mission 1 Updated' }
      });

      const event3 = await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-2',
        data: { title: 'Test Mission 2' }
      });

      expect(event1.sequence_number).toBe(1);
      expect(event2.sequence_number).toBe(2);
      expect(event3.sequence_number).toBe(1); // Different stream starts over
    });
  });

  describe('EVT-002: should generate unique event_id', () => {
    it('should generate unique IDs for each event', async () => {
      const event1 = await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { title: 'Test Mission' }
      });

      const event2 = await eventOps.append({
        event_type: 'mission_started',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: {}
      });

      const event3 = await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-2',
        data: { title: 'Another Mission' }
      });

      expect(event1.event_id).not.toBe(event2.event_id);
      expect(event2.event_id).not.toBe(event3.event_id);
      expect(event1.event_id).not.toBe(event3.event_id);
      
      // Verify ID format
      expect(event1.event_id).toMatch(/^evt_[a-z0-9]{8}$/);
    });
  });

  describe('EVT-003: should track causation_id chain', () => {
    it('should maintain causation chain between events', async () => {
      const event1 = await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { title: 'Test Mission' }
      });

      const event2 = await eventOps.append({
        event_type: 'mission_started',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { started_by: 'specialist-001' },
        causation_id: event1.event_id
      });

      const event3 = await eventOps.append({
        event_type: 'sortie_created',
        stream_type: 'sortie',
        stream_id: 'srt-test-1',
        data: { mission_id: 'msn-test-1' },
        causation_id: event2.event_id
      });

      expect(event1.causation_id).toBeUndefined();
      expect(event2.causation_id).toBe(event1.event_id);
      expect(event3.causation_id).toBe(event2.event_id);
    });
  });

  describe('EVT-004: should track correlation_id', () => {
    it('should group related events with correlation_id', async () => {
      const correlationId = 'corr_mission_flow_1';

      const event1 = await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { title: 'Test Mission' },
        correlation_id: correlationId
      });

      const event2 = await eventOps.append({
        event_type: 'mission_started',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: {},
        causation_id: event1.event_id,
        correlation_id: correlationId
      });

      const event3 = await eventOps.append({
        event_type: 'sortie_created',
        stream_type: 'sortie',
        stream_id: 'srt-test-1',
        data: { mission_id: 'msn-test-1' },
        causation_id: event2.event_id,
        correlation_id: correlationId
      });

      const unrelatedEvent = await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-2',
        data: { title: 'Another Mission' }
      });

      expect(event1.correlation_id).toBe(correlationId);
      expect(event2.correlation_id).toBe(correlationId);
      expect(event3.correlation_id).toBe(correlationId);
      expect(unrelatedEvent.correlation_id).toBeUndefined();
    });
  });

  describe('EVT-005: should query events by stream', () => {
    it('should retrieve events for specific stream', async () => {
      // Create events in different streams
      await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { title: 'Mission 1' }
      });

      await eventOps.append({
        event_type: 'mission_started',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: {}
      });

      await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-2',
        data: { title: 'Mission 2' }
      });

      await eventOps.append({
        event_type: 'sortie_created',
        stream_type: 'sortie',
        stream_id: 'srt-test-1',
        data: { mission_id: 'msn-test-1' }
      });

      // Query mission stream
      const missionEvents = await eventOps.queryByStream('mission', 'msn-test-1');
      expect(missionEvents).toHaveLength(2);
      expect(missionEvents[0].event_type).toBe('mission_created');
      expect(missionEvents[1].event_type).toBe('mission_started');

      // Query sortie stream
      const sortieEvents = await eventOps.queryByStream('sortie', 'srt-test-1');
      expect(sortieEvents).toHaveLength(1);
      expect(sortieEvents[0].event_type).toBe('sortie_created');
    });

    it('should support querying after specific sequence', async () => {
      await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { title: 'Mission 1' }
      });

      await eventOps.append({
        event_type: 'mission_started',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: {}
      });

      await eventOps.append({
        event_type: 'mission_updated',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { status: 'in_progress' }
      });

      const eventsAfterSeq1 = await eventOps.queryByStream('mission', 'msn-test-1', 1);
      expect(eventsAfterSeq1.length).toBeGreaterThan(0);
      
      // Should include events after sequence 1
      const eventTypes = eventsAfterSeq1.map(e => e.event_type);
      expect(eventTypes).toContain('mission_started');
      expect(eventTypes).toContain('mission_updated');
    });
  });

  describe('EVT-006: should query events by type', () => {
    it('should retrieve events by event type', async () => {
      await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { title: 'Mission 1' }
      });

      await eventOps.append({
        event_type: 'mission_started',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: {}
      });

      await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-2',
        data: { title: 'Mission 2' }
      });

      const missionCreatedEvents = await eventOps.queryByType('mission_created');
      expect(missionCreatedEvents).toHaveLength(2);
      
      const missionStartedEvents = await eventOps.queryByType('mission_started');
      expect(missionStartedEvents).toHaveLength(1);

      const noEvents = await eventOps.queryByType('nonexistent_type');
      expect(noEvents).toHaveLength(0);
    });
  });

  describe('EVT-007: should query events after sequence', () => {
    it('should filter events by sequence number', async () => {
      await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { title: 'Mission 1' }
      });

      await eventOps.append({
        event_type: 'mission_started',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: {}
      });

      await eventOps.append({
        event_type: 'mission_updated',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { status: 'in_progress' }
      });

      const eventsAfterSeq1 = await eventOps.getEvents({
        stream_id: 'msn-test-1',
        after_sequence: 1
      });

      expect(eventsAfterSeq1.length).toBeGreaterThanOrEqual(2);
      
      // Verify that sequence filtering works
      const eventTypes = eventsAfterSeq1.map(e => e.event_type);
      expect(eventTypes).toContain('mission_started');
      expect(eventTypes).toContain('mission_updated');
    });
  });

  describe('EVT-008: should validate event schema', () => {
    it('should validate required event fields', async () => {
      const validEvent = await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { title: 'Test Mission' }
      });

      // Verify required fields are present and correctly typed
      expect(validEvent.event_id).toBeDefined();
      expect(validEvent.event_id).toMatch(/^evt_[a-z0-9]{8}$/);
      expect(validEvent.event_type).toBe('mission_created');
      expect(validEvent.stream_type).toBe('mission');
      expect(validEvent.stream_id).toBe('msn-test-1');
      expect(validEvent.data).toEqual({ title: 'Test Mission' });
      expect(validEvent.occurred_at).toBeDefined();
      expect(validEvent.recorded_at).toBeDefined();
      expect(validEvent.schema_version).toBe(1);
    });

    it('should validate stream_type is from allowed values', async () => {
      const validStreamTypes = ['specialist', 'squawk', 'ctk', 'sortie', 'mission', 'checkpoint', 'fleet', 'system'];
      
      for (const streamType of validStreamTypes) {
        const event = await eventOps.append({
          event_type: 'test_event',
          stream_type: streamType as any,
          stream_id: 'test-stream-1',
          data: { test: true }
        });
        
        expect(event.stream_type).toBe(streamType);
      }
    });

    it('should handle optional fields correctly', async () => {
      const minimalEvent = await eventOps.append({
        event_type: 'mission_created',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: { title: 'Minimal Mission' }
      });

      expect(minimalEvent.causation_id).toBeUndefined();
      expect(minimalEvent.correlation_id).toBeUndefined();
      expect(minimalEvent.metadata).toBeUndefined();

      const eventWithOptions = await eventOps.append({
        event_type: 'mission_started',
        stream_type: 'mission',
        stream_id: 'msn-test-1',
        data: {},
        causation_id: minimalEvent.event_id,
        correlation_id: 'corr_test_1',
        metadata: { source: 'test', version: '1.0.0' }
      });

      expect(eventWithOptions.causation_id).toBe(minimalEvent.event_id);
      expect(eventWithOptions.correlation_id).toBe('corr_test_1');
      expect(eventWithOptions.metadata).toEqual({ source: 'test', version: '1.0.0' });
    });
  });
});