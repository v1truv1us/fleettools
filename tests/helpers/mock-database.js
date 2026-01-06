"use strict";
/**
 * Mock Database Helper for Phase 3 (Context Survival)
 *
 * Provides in-memory mock implementations that match the interface contracts
 * from squawk/src/db/types.ts. These mocks enable parallel development of
 * Phase 3 while Phase 2 SQLite implementation is being built.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockDatabase = exports.mockCursorOps = exports.mockMessageOps = exports.mockSpecialistOps = exports.mockCheckpointOps = exports.mockEventOps = exports.mockLockOps = exports.mockSortieOps = exports.mockMissionOps = void 0;
exports.resetMockStorage = resetMockStorage;
/**
 * Generate a unique ID
 */
function generateId(prefix) {
    const uuid = crypto.randomUUID().split('-')[0];
    return `${prefix}-${uuid}`;
}
/**
 * In-memory storage for mock database
 */
class MockStorage {
    missions = new Map();
    sorties = new Map();
    locks = new Map();
    events = new Map(); // Keyed by sequence_number
    checkpoints = new Map();
    specialists = new Map();
    messages = new Map();
    cursors = new Map();
    reset() {
        this.missions.clear();
        this.sorties.clear();
        this.locks.clear();
        this.events.clear();
        this.checkpoints.clear();
        this.specialists.clear();
        this.messages.clear();
        this.cursors.clear();
    }
}
// Shared storage instance
const storage = new MockStorage();
/**
 * Mock Mission Operations
 */
exports.mockMissionOps = {
    version: '1.0.0',
    create: async (input) => {
        const mission = {
            id: generateId('msn'),
            title: input.title,
            description: input.description,
            status: 'pending',
            priority: input.priority || 'medium',
            created_at: new Date().toISOString(),
            total_sorties: 0,
            completed_sorties: 0,
            metadata: input.metadata
        };
        storage.missions.set(mission.id, mission);
        return mission;
    },
    getById: async (id) => {
        return storage.missions.get(id) || null;
    },
    update: async (id, input) => {
        const mission = storage.missions.get(id);
        if (!mission)
            return null;
        const updated = {
            ...mission,
            ...input
        };
        storage.missions.set(id, updated);
        return updated;
    },
    start: async (id) => {
        const mission = storage.missions.get(id);
        if (!mission)
            return null;
        const updated = {
            ...mission,
            status: 'in_progress',
            started_at: new Date().toISOString()
        };
        storage.missions.set(id, updated);
        return updated;
    },
    complete: async (id, result) => {
        const mission = storage.missions.get(id);
        if (!mission)
            return null;
        const updated = {
            ...mission,
            status: 'completed',
            completed_at: new Date().toISOString(),
            result
        };
        storage.missions.set(id, updated);
        return updated;
    },
    list: async (filter) => {
        let missions = Array.from(storage.missions.values());
        if (filter) {
            if (filter.status) {
                const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
                missions = missions.filter(m => statuses.includes(m.status));
            }
            if (filter.priority) {
                const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
                missions = missions.filter(m => priorities.includes(m.priority));
            }
            if (filter.limit) {
                missions = missions.slice(filter.offset || 0, (filter.offset || 0) + filter.limit);
            }
        }
        return missions;
    },
    getStats: async (id) => {
        const mission = storage.missions.get(id);
        if (!mission)
            return null;
        const sorties = Array.from(storage.sorties.values()).filter(s => s.mission_id === id);
        return {
            total_sorties: sorties.length,
            completed_sorties: sorties.filter(s => s.status === 'completed').length,
            failed_sorties: sorties.filter(s => s.status === 'failed').length,
            blocked_sorties: sorties.filter(s => s.status === 'blocked').length,
            in_progress_sorties: sorties.filter(s => s.status === 'in_progress').length,
            pending_sorties: sorties.filter(s => s.status === 'pending').length
        };
    },
    delete: async (id) => {
        return storage.missions.delete(id);
    }
};
/**
 * Mock Sortie Operations
 */
exports.mockSortieOps = {
    version: '1.0.0',
    create: async (input) => {
        const sortie = {
            id: generateId('srt'),
            mission_id: input.mission_id,
            title: input.title,
            description: input.description,
            status: 'pending',
            priority: input.priority || 'medium',
            assigned_to: input.assigned_to,
            files: input.files,
            progress: 0,
            metadata: input.metadata
        };
        storage.sorties.set(sortie.id, sortie);
        // Update mission total_sorties
        if (sortie.mission_id) {
            const mission = storage.missions.get(sortie.mission_id);
            if (mission) {
                mission.total_sorties += 1;
                storage.missions.set(mission.id, mission);
            }
        }
        return sortie;
    },
    getById: async (id) => {
        return storage.sorties.get(id) || null;
    },
    update: async (id, input) => {
        const sortie = storage.sorties.get(id);
        if (!sortie)
            return null;
        const updated = { ...sortie, ...input };
        storage.sorties.set(id, updated);
        return updated;
    },
    start: async (id, specialistId) => {
        const sortie = storage.sorties.get(id);
        if (!sortie)
            return null;
        const updated = {
            ...sortie,
            status: 'in_progress',
            assigned_to: specialistId,
            started_at: new Date().toISOString()
        };
        storage.sorties.set(id, updated);
        return updated;
    },
    progress: async (id, percent, notes) => {
        const sortie = storage.sorties.get(id);
        if (!sortie)
            return null;
        const updated = {
            ...sortie,
            progress: Math.min(100, Math.max(0, percent)),
            progress_notes: notes
        };
        storage.sorties.set(id, updated);
        return updated;
    },
    complete: async (id, result) => {
        const sortie = storage.sorties.get(id);
        if (!sortie)
            return null;
        const updated = {
            ...sortie,
            status: 'completed',
            progress: 100,
            completed_at: new Date().toISOString(),
            result
        };
        storage.sorties.set(id, updated);
        // Update mission completed_sorties
        if (sortie.mission_id) {
            const mission = storage.missions.get(sortie.mission_id);
            if (mission) {
                mission.completed_sorties += 1;
                storage.missions.set(mission.id, mission);
            }
        }
        return updated;
    },
    getByMission: async (missionId) => {
        return Array.from(storage.sorties.values()).filter(s => s.mission_id === missionId);
    },
    list: async (filter) => {
        let sorties = Array.from(storage.sorties.values());
        if (filter) {
            if (filter.mission_id) {
                sorties = sorties.filter(s => s.mission_id === filter.mission_id);
            }
            if (filter.status) {
                const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
                sorties = sorties.filter(s => statuses.includes(s.status));
            }
            if (filter.assigned_to) {
                sorties = sorties.filter(s => s.assigned_to === filter.assigned_to);
            }
            if (filter.priority) {
                const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
                sorties = sorties.filter(s => priorities.includes(s.priority));
            }
            if (filter.limit) {
                sorties = sorties.slice(filter.offset || 0, (filter.offset || 0) + filter.limit);
            }
        }
        return sorties;
    },
    delete: async (id) => {
        return storage.sorties.delete(id);
    }
};
/**
 * Mock Lock Operations
 */
exports.mockLockOps = {
    version: '1.0.0',
    acquire: async (input) => {
        const existingLocks = Array.from(storage.locks.values()).filter(l => l.file === input.file && l.status === 'active' && !l.released_at);
        if (existingLocks.length > 0) {
            return {
                conflict: true,
                existing_lock: existingLocks[0]
            };
        }
        const lock = {
            id: generateId('lock'),
            file: input.file,
            normalized_path: input.file, // Simplified normalization
            reserved_by: input.specialist_id,
            reserved_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + input.timeout_ms).toISOString(),
            purpose: input.purpose || 'edit',
            checksum: input.checksum,
            status: 'active',
            metadata: input.metadata
        };
        storage.locks.set(lock.id, lock);
        return {
            conflict: false,
            lock
        };
    },
    release: async (id) => {
        const lock = storage.locks.get(id);
        if (!lock)
            return null;
        const updated = {
            ...lock,
            status: 'released',
            released_at: new Date().toISOString()
        };
        storage.locks.set(id, updated);
        return updated;
    },
    getById: async (id) => {
        return storage.locks.get(id) || null;
    },
    getByFile: async (file) => {
        return Array.from(storage.locks.values()).find(l => l.file === file) || null;
    },
    getActiveLocks: async () => {
        return Array.from(storage.locks.values()).filter(l => l.status === 'active');
    },
    getExpiredLocks: async () => {
        const now = new Date().toISOString();
        return Array.from(storage.locks.values()).filter(l => l.status === 'active' && l.expires_at < now);
    },
    re_acquire: async (originalLockId, specialistId) => {
        const originalLock = storage.locks.get(originalLockId);
        if (!originalLock) {
            return {
                original_lock_id: originalLockId,
                success: false,
                error: 'Lock not found'
            };
        }
        // Check for conflicts
        const conflicts = Array.from(storage.locks.values()).filter(l => l.file === originalLock.file && l.id !== originalLockId && l.status === 'active');
        if (conflicts.length > 0) {
            return {
                original_lock_id: originalLockId,
                success: false,
                conflict: conflicts[0]
            };
        }
        const newLockId = generateId('lock');
        const newLock = {
            ...originalLock,
            id: newLockId,
            reserved_by: specialistId,
            reserved_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30000).toISOString()
        };
        storage.locks.set(newLockId, newLock);
        storage.locks.delete(originalLockId);
        return {
            original_lock_id: originalLockId,
            success: true,
            new_lock: newLock
        };
    },
    delete: async (id) => {
        return storage.locks.delete(id);
    }
};
/**
 * Mock Event Operations
 */
exports.mockEventOps = {
    version: '1.0.0',
    append: async (input) => {
        const seqNum = storage.events.size + 1;
        const event = {
            sequence_number: seqNum,
            event_id: generateId('evt'),
            event_type: input.event_type,
            stream_type: input.stream_type,
            stream_id: input.stream_id,
            data: input.data,
            causation_id: input.causation_id,
            correlation_id: input.correlation_id,
            metadata: input.metadata,
            occurred_at: input.occurred_at || new Date().toISOString(),
            recorded_at: input.recorded_at || new Date().toISOString(),
            schema_version: input.schema_version || 1
        };
        storage.events.set(seqNum, event);
        return event;
    },
    getById: async (id) => {
        return Array.from(storage.events.values()).find(e => e.event_id === id) || null;
    },
    getByStream: async (streamId, filter) => {
        let events = Array.from(storage.events.values()).filter(e => e.stream_id === streamId);
        if (filter) {
            if (filter.event_type) {
                const types = Array.isArray(filter.event_type) ? filter.event_type : [filter.event_type];
                events = events.filter(e => types.includes(e.event_type));
            }
            if (filter.after_sequence !== undefined) {
                events = events.filter(e => e.sequence_number > filter.after_sequence);
            }
            if (filter.before_sequence !== undefined) {
                events = events.filter(e => e.sequence_number < filter.before_sequence);
            }
        }
        return events;
    },
    query: async (filter) => {
        let events = Array.from(storage.events.values());
        if (filter.event_type) {
            const types = Array.isArray(filter.event_type) ? filter.event_type : [filter.event_type];
            events = events.filter(e => types.includes(e.event_type));
        }
        if (filter.stream_id) {
            events = events.filter(e => e.stream_id === filter.stream_id);
        }
        if (filter.after_sequence !== undefined) {
            events = events.filter(e => e.sequence_number > filter.after_sequence);
        }
        if (filter.before_sequence !== undefined) {
            events = events.filter(e => e.sequence_number < filter.before_sequence);
        }
        return events.sort((a, b) => a.sequence_number - b.sequence_number);
    },
    getStats: async () => {
        return {
            total_events: storage.events.size,
            last_sequence: storage.events.size
        };
    }
};
/**
 * Mock Checkpoint Operations
 */
exports.mockCheckpointOps = {
    version: '1.0.0',
    create: async (input) => {
        // Capture current state
        const sorties = Array.from(storage.sorties.values()).filter(s => s.mission_id === input.mission_id);
        const activeLocks = Array.from(storage.locks.values()).filter(l => l.status === 'active');
        const pendingMessages = Array.from(storage.messages.values()).filter(m => m.status === 'pending');
        const checkpoint = {
            id: generateId('chk'),
            mission_id: input.mission_id,
            timestamp: new Date().toISOString(),
            trigger: input.trigger,
            trigger_details: input.trigger_details,
            progress_percent: input.progress_percent || 0,
            sorties: sorties.map(s => ({
                id: s.id,
                status: s.status,
                assigned_to: s.assigned_to,
                files: s.files,
                started_at: s.started_at,
                progress: s.progress,
                progress_notes: s.progress_notes
            })),
            active_locks: activeLocks.map(l => ({
                id: l.id,
                file: l.file,
                held_by: l.reserved_by,
                acquired_at: l.reserved_at,
                purpose: l.purpose,
                timeout_ms: new Date(l.expires_at).getTime() - new Date(l.reserved_at).getTime()
            })),
            pending_messages: pendingMessages.map(m => ({
                id: m.id,
                from: m.sender_id || 'unknown',
                to: [m.mailbox_id],
                subject: m.message_type,
                sent_at: m.sent_at,
                delivered: m.status !== 'pending'
            })),
            recovery_context: input.recovery_context || {
                last_action: 'checkpoint created',
                next_steps: [],
                blockers: [],
                files_modified: [],
                mission_summary: '',
                elapsed_time_ms: 0,
                last_activity_at: new Date().toISOString()
            },
            created_by: input.created_by,
            expires_at: input.expires_at,
            version: '1.0.0',
            metadata: input.metadata
        };
        storage.checkpoints.set(checkpoint.id, checkpoint);
        return checkpoint;
    },
    getById: async (id) => {
        return storage.checkpoints.get(id) || null;
    },
    getLatest: async (missionId) => {
        const checkpoints = Array.from(storage.checkpoints.values())
            .filter(c => c.mission_id === missionId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return checkpoints[0] || null;
    },
    list: async (missionId) => {
        let checkpoints = Array.from(storage.checkpoints.values());
        if (missionId) {
            checkpoints = checkpoints.filter(c => c.mission_id === missionId);
        }
        return checkpoints.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },
    delete: async (id) => {
        return storage.checkpoints.delete(id);
    },
    markConsumed: async (id) => {
        const checkpoint = storage.checkpoints.get(id);
        if (!checkpoint)
            return null;
        const updated = {
            ...checkpoint,
            consumed_at: new Date().toISOString()
        };
        storage.checkpoints.set(id, updated);
        return updated;
    }
};
/**
 * Mock Specialist Operations
 */
exports.mockSpecialistOps = {
    version: '1.0.0',
    register: async (input) => {
        const specialist = {
            id: input.id || generateId('spec'),
            name: input.name,
            status: 'active',
            capabilities: input.capabilities,
            registered_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            metadata: input.metadata
        };
        storage.specialists.set(specialist.id, specialist);
        return specialist;
    },
    getById: async (id) => {
        return storage.specialists.get(id) || null;
    },
    updateStatus: async (id, status) => {
        const specialist = storage.specialists.get(id);
        if (!specialist)
            return null;
        const updated = {
            ...specialist,
            status,
            last_seen: new Date().toISOString()
        };
        storage.specialists.set(id, updated);
        return updated;
    },
    heartbeat: async (id) => {
        const specialist = storage.specialists.get(id);
        if (!specialist)
            return false;
        specialist.last_seen = new Date().toISOString();
        storage.specialists.set(id, specialist);
        return true;
    },
    setCurrentSortie: async (id, sortieId) => {
        const specialist = storage.specialists.get(id);
        if (!specialist)
            return null;
        const updated = {
            ...specialist,
            current_sortie: sortieId || undefined,
            last_seen: new Date().toISOString()
        };
        storage.specialists.set(id, updated);
        return updated;
    },
    list: async () => {
        return Array.from(storage.specialists.values());
    },
    delete: async (id) => {
        return storage.specialists.delete(id);
    }
};
/**
 * Mock Message Operations
 */
exports.mockMessageOps = {
    version: '1.0.0',
    send: async (input) => {
        const message = {
            id: generateId('msg'),
            mailbox_id: input.mailbox_id,
            sender_id: input.sender_id,
            thread_id: input.thread_id,
            message_type: input.message_type,
            content: input.content,
            priority: input.priority || 'normal',
            status: 'pending',
            sent_at: new Date().toISOString(),
            causation_id: input.causation_id,
            correlation_id: input.correlation_id,
            metadata: input.metadata
        };
        storage.messages.set(message.id, message);
        return message;
    },
    getById: async (id) => {
        return storage.messages.get(id) || null;
    },
    getByMailbox: async (mailboxId) => {
        return Array.from(storage.messages.values())
            .filter(m => m.mailbox_id === mailboxId)
            .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
    },
    markRead: async (id) => {
        const message = storage.messages.get(id);
        if (!message)
            return null;
        const updated = {
            ...message,
            status: 'read',
            read_at: new Date().toISOString()
        };
        storage.messages.set(id, updated);
        return updated;
    },
    markAcked: async (id) => {
        const message = storage.messages.get(id);
        if (!message)
            return null;
        const updated = {
            ...message,
            status: 'acked',
            acked_at: new Date().toISOString()
        };
        storage.messages.set(id, updated);
        return updated;
    },
    delete: async (id) => {
        return storage.messages.delete(id);
    }
};
/**
 * Mock Cursor Operations
 */
exports.mockCursorOps = {
    version: '1.0.0',
    create: async (input) => {
        const id = `${input.stream_type}-${input.stream_id}-cursor`;
        const cursor = {
            id,
            stream_type: input.stream_type,
            stream_id: input.stream_id,
            position: 0,
            consumer_id: input.consumer_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: input.metadata
        };
        storage.cursors.set(id, cursor);
        return cursor;
    },
    getById: async (id) => {
        return storage.cursors.get(id) || null;
    },
    getByStream: async (streamType, streamId) => {
        const id = `${streamType}-${streamId}-cursor`;
        return storage.cursors.get(id) || null;
    },
    updatePosition: async (id, position) => {
        const cursor = storage.cursors.get(id);
        if (!cursor)
            return null;
        const updated = {
            ...cursor,
            position,
            updated_at: new Date().toISOString()
        };
        storage.cursors.set(id, updated);
        return updated;
    },
    delete: async (id) => {
        return storage.cursors.delete(id);
    }
};
/**
 * Reset all mock storage
 */
function resetMockStorage() {
    storage.reset();
}
/**
 * Export all mock ops
 */
exports.mockDatabase = {
    missions: exports.mockMissionOps,
    sorties: exports.mockSortieOps,
    locks: exports.mockLockOps,
    events: exports.mockEventOps,
    checkpoints: exports.mockCheckpointOps,
    specialists: exports.mockSpecialistOps,
    messages: exports.mockMessageOps,
    cursors: exports.mockCursorOps,
    reset: resetMockStorage,
    getStorage: () => storage
};
//# sourceMappingURL=mock-database.js.map