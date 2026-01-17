/**
 * FleetTools Specialist Tools (Fleet API)
 *
 * These tools allow Specialist agents to coordinate with the Dispatch coordinator.
 * Each tool handles a specific aspect of the specialist lifecycle:
 * - Registration: Announce readiness
 * - Reservation: Lock files before editing
 * - Progress: Report work progress
 * - Completion: Mark sortie complete
 * - Blocking: Report blockers
 * - Messaging: Send/receive messages
 *
 * @version 1.0.0
 * @since 2026-01-08
 */
import type { Message, Checkpoint, Sortie } from '../../../../squawk/src/db/types.js';
/**
 * Fleet Register Input
 * Specialist announces readiness to Dispatch
 */
export interface FleetRegisterInput {
    specialist_id: string;
    mission_id: string;
    sortie_id: string;
    capabilities?: string[];
    metadata?: Record<string, unknown>;
}
/**
 * Fleet Register Output
 */
export interface FleetRegisterOutput {
    status: 'registered' | 'error';
    specialist_id: string;
    dispatch_id?: string;
    mailbox_id?: string;
    recovery_context?: Checkpoint;
    error?: string;
}
/**
 * Fleet Reserve Input
 * Specialist locks files before editing
 */
export interface FleetReserveInput {
    specialist_id: string;
    mission_id: string;
    file_paths: string[];
    duration_ms: number;
    purpose?: 'edit' | 'read' | 'delete';
}
/**
 * Fleet Reserve Output
 */
export interface FleetReserveOutput {
    status: 'reserved' | 'conflict' | 'timeout' | 'error';
    lock_ids?: string[];
    conflicts?: Array<{
        file_path: string;
        held_by: string;
        expires_at: string;
    }>;
    error?: string;
}
/**
 * Fleet Progress Input
 * Specialist reports work progress
 */
export interface FleetProgressInput {
    specialist_id: string;
    mission_id: string;
    sortie_id: string;
    progress_percent: number;
    status_message: string;
    blockers?: Array<{
        type: 'lock_timeout' | 'api_error' | 'dependency' | 'other';
        description: string;
        affected_sortie?: string;
        resolution_hint?: string;
    }>;
}
/**
 * Fleet Progress Output
 */
export interface FleetProgressOutput {
    status: 'acknowledged' | 'error';
    next_action: 'continue' | 'pause' | 'abort';
    error?: string;
}
/**
 * Fleet Complete Input
 * Specialist marks sortie complete
 */
export interface FleetCompleteInput {
    specialist_id: string;
    mission_id: string;
    sortie_id: string;
    result: {
        success: boolean;
        summary: string;
        files_modified?: string[];
        errors?: string[];
    };
}
/**
 * Fleet Complete Output
 */
export interface FleetCompleteOutput {
    status: 'completed' | 'review_required' | 'error';
    next_sortie?: Sortie;
    error?: string;
}
/**
 * Fleet Blocked Input
 * Specialist reports blocker
 */
export interface FleetBlockedInput {
    specialist_id: string;
    mission_id: string;
    sortie_id: string;
    blocker: {
        type: 'lock_timeout' | 'api_error' | 'dependency' | 'other';
        description: string;
        affected_sortie?: string;
        resolution_hint?: string;
    };
}
/**
 * Fleet Blocked Output
 */
export interface FleetBlockedOutput {
    status: 'acknowledged' | 'error';
    resolution_hint?: string;
    retry_after_ms?: number;
    error?: string;
}
/**
 * Fleet Squawk Input
 * Specialist sends/receives messages
 */
export interface FleetSquawkInput {
    specialist_id: string;
    mission_id: string;
    action: 'send' | 'receive';
    message?: {
        to: string;
        payload: Record<string, unknown>;
    };
}
/**
 * Fleet Squawk Output
 */
export interface FleetSquawkOutput {
    status: 'sent' | 'received' | 'error';
    messages?: Message[];
    error?: string;
}
/**
 * Fleet Register Tool
 * Specialist announces readiness to Dispatch
 */
export declare function fleetRegister(input: FleetRegisterInput): Promise<FleetRegisterOutput>;
/**
 * Fleet Reserve Tool
 * Specialist locks files before editing
 */
export declare function fleetReserve(input: FleetReserveInput): Promise<FleetReserveOutput>;
/**
 * Fleet Progress Tool
 * Specialist reports work progress
 */
export declare function fleetProgress(input: FleetProgressInput): Promise<FleetProgressOutput>;
/**
 * Fleet Complete Tool
 * Specialist marks sortie complete
 */
export declare function fleetComplete(input: FleetCompleteInput): Promise<FleetCompleteOutput>;
/**
 * Fleet Blocked Tool
 * Specialist reports blocker
 */
export declare function fleetBlocked(input: FleetBlockedInput): Promise<FleetBlockedOutput>;
/**
 * Fleet Squawk Tool
 * Specialist sends/receives messages
 */
export declare function fleetSquawk(input: FleetSquawkInput): Promise<FleetSquawkOutput>;
/**
 * Specialist tools registry
 * Maps tool names to implementations
 */
export declare const specialistTools: {
    fleet_register: typeof fleetRegister;
    fleet_reserve: typeof fleetReserve;
    fleet_progress: typeof fleetProgress;
    fleet_complete: typeof fleetComplete;
    fleet_blocked: typeof fleetBlocked;
    fleet_squawk: typeof fleetSquawk;
};
/**
 * Get tool by name
 */
export declare function getTool(name: string): ((input: any) => Promise<any>) | undefined;
/**
 * List all available tools
 */
export declare function listTools(): string[];
//# sourceMappingURL=specialist-tools.d.ts.map