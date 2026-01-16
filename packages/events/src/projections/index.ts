/**
 * FleetTools Projection Index
 * 
 * Unified projection handler for all event types.
 */

import type { DrizzleDB } from '@fleettools/db';
import type { FleetEvent } from '../types/index.js';

// Import individual projection handlers
import * as pilotProjections from './pilots.js';

/**
 * Handle an event and update appropriate projections
 */
export async function handleEvent(
  db: DrizzleDB, 
  event: FleetEvent, 
  projectKey: string
): Promise<void> {
  switch (event.type) {
    case 'pilot_registered':
      await pilotProjections.handlePilotRegistered(db, event, projectKey);
      break;
    case 'pilot_active':
      await pilotProjections.handlePilotActive(db, event, projectKey);
      break;
    case 'pilot_deregistered':
      await pilotProjections.handlePilotDeregistered(db, event, projectKey);
      break;
    
    // TODO: Add other projection handlers
    default:
      // Log unhandled events for debugging
      console.warn(`Unhandled event type: ${event.type}`);
      break;
  }
}

/**
 * Handle multiple events in sequence
 */
export async function handleEvents(
  db: DrizzleDB, 
  events: FleetEvent[], 
  projectKey: string
): Promise<void> {
  for (const event of events) {
    await handleEvent(db, event, projectKey);
  }
}

// Export all projection handlers for advanced usage
export * from './pilots.js';