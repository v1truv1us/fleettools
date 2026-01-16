import { describe, test, expect, beforeEach } from 'bun:test';
import { createEvent, validateEvent, FleetEventSchema } from '../src/helpers.js';
import { EventStore } from '../src/store.js';
import { createInMemoryDb } from '@fleettools/db';

describe('FleetTools Events', () => {
  let eventStore: EventStore;

  beforeEach(() => {
    const db = createInMemoryDb();
    eventStore = EventStore.fromDb(db);
  });

  test('creates valid pilot registered event', () => {
    const event = createEvent('pilot_registered', {
      callsign: 'viper-1',
      program: 'opencode',
      model: 'claude-sonnet'
    });

    expect(event.type).toBe('pilot_registered');
    expect((event.data as any).callsign).toBe('viper-1');
    expect(event.id).toBeDefined();
    expect(event.timestamp).toBeDefined();

    // Validate with schema
    const validated = validateEvent(event);
    expect(validated).toEqual(event);
  });

  test('appends and queries events', async () => {
    const event = createEvent('pilot_registered', {
      callsign: 'viper-1',
      program: 'opencode',
      model: 'claude-sonnet'
    });

    // Append event
    const stored = await eventStore.append(event, '/test-project');
    expect(stored.sequence).toBe(1);
    expect(stored.id).toBe(event.id);

    // Query events
    const events = await eventStore.query({
      project_key: '/test-project'
    });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('pilot_registered');
    expect((events[0].data as any).callsign).toBe('viper-1');
  });

  test('validates event types correctly', () => {
    const validEvent = createEvent('pilot_registered', {
      callsign: 'viper-1',
      program: 'opencode',
      model: 'claude-sonnet'
    });

    const result = FleetEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('pilot_registered');
    }

    const invalidEvent = {
      type: 'invalid_type',
      project_key: '/test',
      timestamp: '2025-01-10T00:00:00.000Z',
      sequence: 1,
      id: 'test-id',
      data: {}
    };

    const invalidResult = FleetEventSchema.safeParse(invalidEvent);
    expect(invalidResult.success).toBe(false);
  });

  test('gets latest event', async () => {
    const event1 = createEvent('pilot_registered', {
      callsign: 'viper-1',
      program: 'opencode',
      model: 'claude-sonnet'
    });

    const event2 = createEvent('pilot_active', {
      callsign: 'viper-1',
      status: 'active'
    });

    // Append events
    await eventStore.append(event1, '/test-project');
    await eventStore.append(event2, '/test-project');

    // Get latest
    const latest = await eventStore.getLatest('/test-project');
    expect(latest).toBeTruthy();
    expect(latest?.type).toBe('pilot_active');
  });
});