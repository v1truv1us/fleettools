/**
 * FleetTools Pilot Projection (Simplified)
 *
 * Updates pilots table from pilot events using raw SQL.
 */
import type { DrizzleDB } from '@fleettools/db';
import type { PilotRegisteredEvent, PilotActiveEvent, PilotDeregisteredEvent } from '../types/pilots.js';
/**
 * Handle pilot registered event
 */
export declare function handlePilotRegistered(db: DrizzleDB, event: PilotRegisteredEvent, projectKey: string): Promise<void>;
/**
 * Handle pilot active event
 */
export declare function handlePilotActive(db: DrizzleDB, event: PilotActiveEvent, projectKey: string): Promise<void>;
/**
 * Handle pilot deregistered event
 */
export declare function handlePilotDeregistered(db: DrizzleDB, event: PilotDeregisteredEvent, projectKey: string): Promise<void>;
