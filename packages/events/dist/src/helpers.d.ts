/**
 * FleetTools Event Helpers
 *
 * Utility functions for event creation, validation, and type guards.
 */
import { FleetEventSchema, type FleetEvent } from './types/index.js';
export { FleetEventSchema };
/**
 * Create a typed event with validation
 */
export declare function createEvent<T extends FleetEvent>(type: T['type'], data: T['data'], options?: {
    id?: string;
    project_key?: string;
    timestamp?: string;
    sequence?: number;
}): T;
/**
 * Validate an event using the FleetEvent schema
 */
export declare function validateEvent(event: unknown): FleetEvent;
/**
 * Safe event validation that returns a result
 */
export declare function safeValidateEvent(event: unknown): {
    success: boolean;
    data?: FleetEvent;
    error?: string;
};
/**
 * Type guard for specific event types
 */
export declare function isEventType<T extends FleetEvent>(event: FleetEvent, type: T['type']): event is T;
/**
 * Type guard for pilot events
 */
export declare function isPilotEvent(event: FleetEvent): boolean;
/**
 * Type guard for message events
 */
export declare function isMessageEvent(event: FleetEvent): boolean;
/**
 * Type guard for reservation events
 */
export declare function isReservationEvent(event: FleetEvent): boolean;
/**
 * Type guard for sortie events
 */
export declare function isSortieEvent(event: FleetEvent): boolean;
/**
 * Type guard for mission events
 */
export declare function isMissionEvent(event: FleetEvent): boolean;
/**
 * Type guard for checkpoint events
 */
export declare function isCheckpointEvent(event: FleetEvent): boolean;
/**
 * Type guard for coordination events
 */
export declare function isCoordinationEvent(event: FleetEvent): boolean;
/**
 * Extract event data with proper typing
 */
export declare function getEventData<T extends FleetEvent>(event: T): T['data'];
/**
 * Get event type information
 */
export declare function getEventInfo(event: FleetEvent): {
    category: 'pilot' | 'message' | 'reservation' | 'sortie' | 'mission' | 'checkpoint' | 'coordination';
    isAggregateEvent: boolean;
    isSystemEvent: boolean;
};
//# sourceMappingURL=helpers.d.ts.map