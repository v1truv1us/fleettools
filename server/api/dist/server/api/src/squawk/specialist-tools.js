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
import { randomUUID } from 'crypto';
import { getAdapter } from '../../../../squawk/src/db/index.js';
// ============================================================================
// VALIDATION HELPERS
// ============================================================================
/**
 * Validate required string field
 */
function validateString(value, fieldName) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`${fieldName} is required and must be a non-empty string`);
    }
    return value;
}
/**
 * Validate required number field
 */
function validateNumber(value, fieldName, min, max) {
    if (typeof value !== 'number') {
        throw new Error(`${fieldName} must be a number`);
    }
    if (min !== undefined && value < min) {
        throw new Error(`${fieldName} must be >= ${min}`);
    }
    if (max !== undefined && value > max) {
        throw new Error(`${fieldName} must be <= ${max}`);
    }
    return value;
}
/**
 * Validate required array field
 */
function validateArray(value, fieldName) {
    if (!Array.isArray(value)) {
        throw new Error(`${fieldName} must be an array`);
    }
    return value;
}
// ============================================================================
// SPECIALIST TOOLS IMPLEMENTATION
// ============================================================================
/**
 * Fleet Register Tool
 * Specialist announces readiness to Dispatch
 */
export async function fleetRegister(input) {
    try {
        // Validate input
        const specialistId = validateString(input.specialist_id, 'specialist_id');
        const missionId = validateString(input.mission_id, 'mission_id');
        const sortieId = validateString(input.sortie_id, 'sortie_id');
        const db = getAdapter();
        // Register specialist
        const specialist = await db.specialists.register({
            id: specialistId,
            name: `Specialist-${specialistId.substring(0, 8)}`,
            capabilities: input.capabilities || [],
            metadata: input.metadata,
        });
        // Create mailbox for specialist
        const mailboxId = `mailbox-${randomUUID()}`;
        // Check for recovery context (checkpoint)
        const checkpoint = await db.checkpoints.getLatestByMission(missionId);
        return {
            status: 'registered',
            specialist_id: specialist.id,
            dispatch_id: 'dispatch-coordinator',
            mailbox_id: mailboxId,
            recovery_context: checkpoint || undefined,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[fleet_register] Error:', message);
        return {
            status: 'error',
            specialist_id: input.specialist_id,
            error: message,
        };
    }
}
/**
 * Fleet Reserve Tool
 * Specialist locks files before editing
 */
export async function fleetReserve(input) {
    try {
        // Validate input
        const specialistId = validateString(input.specialist_id, 'specialist_id');
        validateString(input.mission_id, 'mission_id');
        const filePaths = validateArray(input.file_paths, 'file_paths');
        const durationMs = validateNumber(input.duration_ms, 'duration_ms', 1);
        if (filePaths.length === 0) {
            throw new Error('file_paths must contain at least one file');
        }
        const db = getAdapter();
        const lockIds = [];
        const conflicts = [];
        // Try to acquire locks for each file
        for (const filePath of filePaths) {
            const result = await db.locks.acquire({
                file: filePath,
                specialist_id: specialistId,
                timeout_ms: durationMs,
                purpose: (input.purpose || 'edit'),
            });
            if (result.conflict && result.existing_lock) {
                conflicts.push({
                    file_path: filePath,
                    held_by: result.existing_lock.reserved_by,
                    expires_at: result.existing_lock.expires_at,
                });
            }
            else if (result.lock) {
                lockIds.push(result.lock.id);
            }
        }
        // If any conflicts, return conflict status
        if (conflicts.length > 0) {
            return {
                status: 'conflict',
                lock_ids: lockIds,
                conflicts,
            };
        }
        return {
            status: 'reserved',
            lock_ids: lockIds,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[fleet_reserve] Error:', message);
        return {
            status: 'error',
            error: message,
        };
    }
}
/**
 * Fleet Progress Tool
 * Specialist reports work progress
 */
export async function fleetProgress(input) {
    try {
        // Validate input
        validateString(input.specialist_id, 'specialist_id');
        validateString(input.mission_id, 'mission_id');
        const sortieId = validateString(input.sortie_id, 'sortie_id');
        const progressPercent = validateNumber(input.progress_percent, 'progress_percent', 0, 100);
        validateString(input.status_message, 'status_message');
        const db = getAdapter();
        // Get sortie
        const sortie = await db.sorties.getById(sortieId);
        if (!sortie) {
            return {
                status: 'error',
                next_action: 'abort',
                error: `Sortie ${sortieId} not found`,
            };
        }
        // Update sortie with progress (store in metadata since progress_notes not in UpdateSortieInput)
        await db.sorties.update(sortieId, {
            metadata: {
                progress_percent: progressPercent,
                status_message: input.status_message,
            },
        });
        // If there are blockers, emit event
        if (input.blockers && input.blockers.length > 0) {
            console.log(`[fleet_progress] Blockers reported for sortie ${sortieId}:`, input.blockers);
        }
        return {
            status: 'acknowledged',
            next_action: 'continue',
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[fleet_progress] Error:', message);
        return {
            status: 'error',
            next_action: 'abort',
            error: message,
        };
    }
}
/**
 * Fleet Complete Tool
 * Specialist marks sortie complete
 */
export async function fleetComplete(input) {
    try {
        // Validate input
        const specialistId = validateString(input.specialist_id, 'specialist_id');
        const missionId = validateString(input.mission_id, 'mission_id');
        const sortieId = validateString(input.sortie_id, 'sortie_id');
        if (!input.result || typeof input.result.success !== 'boolean') {
            throw new Error('result.success is required and must be a boolean');
        }
        validateString(input.result.summary, 'result.summary');
        const db = getAdapter();
        // Get sortie
        const sortie = await db.sorties.getById(sortieId);
        if (!sortie) {
            return {
                status: 'error',
                error: `Sortie ${sortieId} not found`,
            };
        }
        // Update sortie with completion info (store in metadata since progress_notes not in UpdateSortieInput)
        await db.sorties.update(sortieId, {
            metadata: {
                completion_summary: input.result.summary,
                files_modified: input.result.files_modified || [],
                errors: input.result.errors || [],
            },
        });
        // Release locks for this specialist
        const activeLocks = await db.locks.getActive();
        for (const lock of activeLocks) {
            if (lock.reserved_by === specialistId) {
                await db.locks.release(lock.id);
            }
        }
        // Get next sortie (if any)
        const sorties = await db.sorties.getByMission(missionId);
        const nextSortie = sorties.find(s => s.status === 'pending');
        return {
            status: 'completed',
            next_sortie: nextSortie,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[fleet_complete] Error:', message);
        return {
            status: 'error',
            error: message,
        };
    }
}
/**
 * Fleet Blocked Tool
 * Specialist reports blocker
 */
export async function fleetBlocked(input) {
    try {
        // Validate input
        validateString(input.specialist_id, 'specialist_id');
        validateString(input.mission_id, 'mission_id');
        const sortieId = validateString(input.sortie_id, 'sortie_id');
        if (!input.blocker || typeof input.blocker.type !== 'string') {
            throw new Error('blocker.type is required');
        }
        validateString(input.blocker.description, 'blocker.description');
        const db = getAdapter();
        // Update sortie status to blocked (store in metadata since progress_notes not in UpdateSortieInput)
        await db.sorties.update(sortieId, {
            metadata: {
                blocker_type: input.blocker.type,
                blocker_description: input.blocker.description,
            },
        });
        // Emit blocked event
        await db.events.append({
            event_type: 'specialist_blocked',
            stream_type: 'specialist',
            stream_id: input.specialist_id,
            data: {
                mission_id: input.mission_id,
                sortie_id: sortieId,
                blocker: input.blocker,
            },
        });
        // Determine resolution hint based on blocker type
        let resolutionHint = 'Unable to resolve blocker';
        let retryAfterMs;
        switch (input.blocker.type) {
            case 'lock_timeout':
                resolutionHint = 'File lock timeout. Retrying with exponential backoff.';
                retryAfterMs = 5000; // 5 seconds
                break;
            case 'api_error':
                resolutionHint = 'API error encountered. Retrying with exponential backoff.';
                retryAfterMs = 10000; // 10 seconds
                break;
            case 'dependency':
                resolutionHint = 'Waiting for dependency to complete.';
                break;
            case 'other':
                resolutionHint = 'Manual intervention may be required.';
                break;
        }
        return {
            status: 'acknowledged',
            resolution_hint: resolutionHint,
            retry_after_ms: retryAfterMs,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[fleet_blocked] Error:', message);
        return {
            status: 'error',
            error: message,
        };
    }
}
/**
 * Fleet Squawk Tool
 * Specialist sends/receives messages
 */
export async function fleetSquawk(input) {
    try {
        // Validate input
        validateString(input.specialist_id, 'specialist_id');
        validateString(input.mission_id, 'mission_id');
        if (input.action !== 'send' && input.action !== 'receive') {
            throw new Error('action must be "send" or "receive"');
        }
        const db = getAdapter();
        if (input.action === 'send') {
            if (!input.message) {
                return {
                    status: 'error',
                    error: 'message is required for send action',
                };
            }
            validateString(input.message.to, 'message.to');
            // Send message
            const message = await db.messages.send({
                mailbox_id: input.message.to,
                sender_id: input.specialist_id,
                message_type: 'specialist_message',
                content: input.message.payload,
            });
            return {
                status: 'sent',
                messages: [message],
            };
        }
        else {
            // Receive messages
            const mailboxId = `mailbox-${input.specialist_id}`;
            const messages = await db.messages.getByMailbox(mailboxId, {
                status: 'pending',
                limit: 10,
            });
            // Mark messages as read
            for (const msg of messages) {
                await db.messages.markRead(msg.id);
            }
            return {
                status: 'received',
                messages,
            };
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[fleet_squawk] Error:', message);
        return {
            status: 'error',
            error: message,
        };
    }
}
// ============================================================================
// TOOL REGISTRY
// ============================================================================
/**
 * Specialist tools registry
 * Maps tool names to implementations
 */
export const specialistTools = {
    fleet_register: fleetRegister,
    fleet_reserve: fleetReserve,
    fleet_progress: fleetProgress,
    fleet_complete: fleetComplete,
    fleet_blocked: fleetBlocked,
    fleet_squawk: fleetSquawk,
};
/**
 * Get tool by name
 */
export function getTool(name) {
    return specialistTools[name];
}
/**
 * List all available tools
 */
export function listTools() {
    return Object.keys(specialistTools);
}
//# sourceMappingURL=specialist-tools.js.map