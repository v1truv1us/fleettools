/**
 * FleetTools Event Replay
 *
 * Event replay functionality for rebuilding projections.
 */
import type { DrizzleDB } from '@fleettools/db';
import type { FleetEvent } from './types/index.js';
/**
 * Replay events from history to rebuild projections
 */
export declare function replayEvents(db: DrizzleDB, events?: FleetEvent[], projectKey?: string): Promise<void>;
/**
 * Replay events from a specific sequence number
 */
export declare function replayEventsFromSequence(db: DrizzleDB, projectKey: string, fromSequence: number): Promise<void>;
/**
 * Replay events within a time range
 */
export declare function replayEventsInTimeRange(db: DrizzleDB, projectKey: string, fromTimestamp: string, toTimestamp: string): Promise<void>;
//# sourceMappingURL=replay.d.ts.map