/**
 * FleetTools Event Replay
 * 
 * Event replay functionality for rebuilding projections.
 */

import type { DrizzleDB } from '@fleettools/db';
import { EventStore } from './store.js';
import type { FleetEvent } from './types/index.js';
import { handleEvent } from './projections/index.js';

/**
 * Replay events from history to rebuild projections
 */
export async function replayEvents(
  db: DrizzleDB,
  events?: FleetEvent[],
  projectKey?: string
): Promise<void> {
  const eventStore = EventStore.fromDb(db);
  
  // If no events provided, fetch all events for the project
  const eventsToReplay = events || 
    (projectKey ? await eventStore.query({ project_key: projectKey, limit: 10000 }) : []);
  
  console.log(`Replaying ${eventsToReplay.length} events...`);
  
  for (const event of eventsToReplay) {
    await handleEvent(db, event, event.project_key);
  }
  
  console.log('✅ Event replay completed');
}

/**
 * Replay events from a specific sequence number
 */
export async function replayEventsFromSequence(
  db: DrizzleDB,
  projectKey: string,
  fromSequence: number
): Promise<void> {
  const eventStore = EventStore.fromDb(db);
  
  const events = await eventStore.query({
    project_key: projectKey,
    from_sequence: fromSequence,
    limit: 10000,
  });
  
  await replayEvents(db, events, projectKey);
}

/**
 * Replay events within a time range
 */
export async function replayEventsInTimeRange(
  db: DrizzleDB,
  projectKey: string,
  fromTimestamp: string,
  toTimestamp: string
): Promise<void> {
  const eventStore = EventStore.fromDb(db);
  
  const events = await eventStore.query({
    project_key: projectKey,
    from_timestamp: fromTimestamp,
    to_timestamp: toTimestamp,
    limit: 10000,
  });
  
  await replayEvents(db, events, projectKey);
}