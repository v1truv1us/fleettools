/**
 * FleetTools Projection Index
 *
 * Unified projection handler for all event types.
 */
import type { DrizzleDB } from '@fleettools/db';
import type { FleetEvent } from '../types/index.js';
/**
 * Handle an event and update appropriate projections
 */
export declare function handleEvent(db: DrizzleDB, event: FleetEvent, projectKey: string): Promise<void>;
/**
 * Handle multiple events in sequence
 */
export declare function handleEvents(db: DrizzleDB, events: FleetEvent[], projectKey: string): Promise<void>;
export * from './pilots.js';
//# sourceMappingURL=index.d.ts.map