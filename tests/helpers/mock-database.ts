
import type {
  Mission,
  Sortie,
  Lock,
  Event,
  Checkpoint,
  Specialist,
  Message,
  Cursor,
  CreateMissionInput,
  UpdateMissionInput,
  CreateSortieInput,
  UpdateSortieInput,
  AcquireLockInput,
  AppendEventInput,
  CreateCheckpointInput,
  RegisterSpecialistInput,
  SendMessageInput,
  CreateCursorInput,
  MissionStats,
  LockResult,
  EventFilter,
  MissionFilter,
  SortieFilter,
  SortieSnapshot,
  LockSnapshot,
  MessageSnapshot,
  RecoveryContext,
  DatabaseStats
} from '../../squawk/src/db/types';

function generateId(prefix: string): string {
  const uuid = crypto.randomUUID().split('-')[0];
  return `${prefix}-${uuid}`;
}

class MockStorage {
  missions = new Map<string, Mission>();
  sorties = new Map<string, Sortie>();
  locks = new Map<string, Lock>();
  events = new Map<number, Event>(); // Keyed by sequence_number
  checkpoints = new Map<string, Checkpoint>();
  specialists = new Map<string, Specialist>();
  messages = new Map<string, Message>();
  cursors = new Map<string, Cursor>();

  reset(): void {
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

const storage = new MockStorage();

export const mockMissionOps = {
  version: '1.0.0',

  create: async (input: CreateMissionInput): Promise<Mission> => {
    const isTestMission = (input as any).id;

    let mission: Mission;
    if (isTestMission) {
      mission = input as any;
    } else {
      mission = {
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
    }

    storage.missions.set(mission.id, mission);
    return mission;
  },

  getById: async (id: string): Promise<Mission | null> => {
    return storage.missions.get(id) || null;
  },

  update: async (id: string, input: UpdateMissionInput): Promise<Mission | null> => {
    const mission = storage.missions.get(id);
    if (!mission) return null;

    const updated = {
      ...mission,
      ...input
    };

    storage.missions.set(id, updated);
    return updated;
  },

  start: async (id: string): Promise<Mission | null> => {
    const mission = storage.missions.get(id);
    if (!mission) return null;

    const updated: Mission = {
      ...mission,
      status: 'in_progress',
      started_at: new Date().toISOString()
    };

    storage.missions.set(id, updated);
    return updated;
  },

  complete: async (id: string, result?: Mission['result']): Promise<Mission | null> => {
    const mission = storage.missions.get(id);
    if (!mission) return null;

    const updated: Mission = {
      ...mission,
      status: 'completed',
      completed_at: new Date().toISOString(),
      result
    };

    storage.missions.set(id, updated);
    return updated;
  },

  getByStatus: async (status: string): Promise<Mission[]> => {
    return Array.from(storage.missions.values()).filter(m => m.status === status);
  },

  list: async (filter?: MissionFilter): Promise<Mission[]> => {
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

  getStats: async (id: string): Promise<MissionStats | null> => {
    const mission = storage.missions.get(id);
    if (!mission) return null;

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

  delete: async (id: string): Promise<boolean> => {
    return storage.missions.delete(id);
  }
};

export const mockSortieOps = {
  version: '1.0.0',

  create: async (input: CreateSortieInput): Promise<Sortie> => {
    const sortie: Sortie = {
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

    if (sortie.mission_id) {
      const mission = storage.missions.get(sortie.mission_id);
      if (mission) {
        mission.total_sorties += 1;
        storage.missions.set(mission.id, mission);
      }
    }

    return sortie;
  },

  getById: async (id: string): Promise<Sortie | null> => {
    return storage.sorties.get(id) || null;
  },

  update: async (id: string, input: UpdateSortieInput): Promise<Sortie | null> => {
    const sortie = storage.sorties.get(id);
    if (!sortie) return null;

    const updated = { ...sortie, ...input };
    storage.sorties.set(id, updated);
    return updated;
  },

  start: async (id: string, specialistId: string): Promise<Sortie | null> => {
    const sortie = storage.sorties.get(id);
    if (!sortie) return null;

    const updated: Sortie = {
      ...sortie,
      status: 'in_progress',
      assigned_to: specialistId,
      started_at: new Date().toISOString()
    };

    storage.sorties.set(id, updated);
    return updated;
  },

  progress: async (id: string, percent: number, notes?: string): Promise<Sortie | null> => {
    const sortie = storage.sorties.get(id);
    if (!sortie) return null;

    const updated: Sortie = {
      ...sortie,
      progress: Math.min(100, Math.max(0, percent)),
      progress_notes: notes
    };

    storage.sorties.set(id, updated);
    return updated;
  },

  complete: async (id: string, result?: Sortie['result']): Promise<Sortie | null> => {
    const sortie = storage.sorties.get(id);
    if (!sortie) return null;

    const updated: Sortie = {
      ...sortie,
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
      result
    };

    storage.sorties.set(id, updated);

    if (sortie.mission_id) {
      const mission = storage.missions.get(sortie.mission_id);
      if (mission) {
        mission.completed_sorties += 1;
        storage.missions.set(mission.id, mission);
      }
    }

    return updated;
  },

  getByMission: async (missionId: string): Promise<Sortie[]> => {
    return Array.from(storage.sorties.values()).filter(s => s.mission_id === missionId);
  },

  list: async (filter?: SortieFilter): Promise<Sortie[]> => {
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

  delete: async (id: string): Promise<boolean> => {
    return storage.sorties.delete(id);
  }
};

export const mockLockOps = {
  version: '1.0.0',

  acquire: async (input: AcquireLockInput): Promise<LockResult> => {
    const existingLocks = Array.from(storage.locks.values()).filter(
      l => l.file === input.file && l.status === 'active' && !l.released_at
    );

    if (existingLocks.length > 0) {
      return {
        conflict: true,
        existing_lock: existingLocks[0]
      };
    }

    const lock: Lock = {
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

  release: async (id: string): Promise<Lock | null> => {
    const lock = storage.locks.get(id);
    if (!lock) return null;

    const updated: Lock = {
      ...lock,
      status: 'released',
      released_at: new Date().toISOString()
    };

    storage.locks.set(id, updated);
    return updated;
  },

  getById: async (id: string): Promise<Lock | null> => {
    return storage.locks.get(id) || null;
  },

  getByFile: async (file: string): Promise<Lock | null> => {
    return Array.from(storage.locks.values()).find(l => l.file === file) || null;
  },

  getActiveLocks: async (): Promise<Lock[]> => {
    return Array.from(storage.locks.values()).filter(l => l.status === 'active');
  },

  getExpiredLocks: async (): Promise<Lock[]> => {
    const now = new Date().toISOString();
    return Array.from(storage.locks.values()).filter(
      l => l.status === 'active' && l.expires_at < now
    );
  },

  re_acquire: async (originalLockId: string, specialistId: string): Promise<any> => {
    const originalLock = storage.locks.get(originalLockId);
    if (!originalLock) {
      return {
        original_lock_id: originalLockId,
        success: false,
        error: 'Lock not found'
      };
    }

    const conflicts = Array.from(storage.locks.values()).filter(
      l => l.file === originalLock.file && l.id !== originalLockId && l.status === 'active'
    );

    if (conflicts.length > 0) {
      return {
        original_lock_id: originalLockId,
        success: false,
        conflict: conflicts[0]
      };
    }

    const newLockId = generateId('lock');
    const newLock: Lock = {
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

  delete: async (id: string): Promise<boolean> => {
    return storage.locks.delete(id);
  },

  forceRelease: async (id: string): Promise<Lock | null> => {
    const lock = storage.locks.get(id);
    if (!lock) return null;

    const updated: Lock = {
      ...lock,
      status: 'released',
      released_at: new Date().toISOString()
    };

    storage.locks.set(id, updated);
    return updated;
  }
};

export const mockEventOps = {
  version: '1.0.0',

  append: async (input: AppendEventInput): Promise<Event> => {
    const seqNum = storage.events.size + 1;

    const event: Event = {
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

  getById: async (id: string): Promise<Event | null> => {
    return Array.from(storage.events.values()).find(e => e.event_id === id) || null;
  },

  getByStream: async (streamId: string, filter?: EventFilter): Promise<Event[]> => {
    let events = Array.from(storage.events.values()).filter(e => e.stream_id === streamId);

    if (filter) {
      if (filter.event_type) {
        const types = Array.isArray(filter.event_type) ? filter.event_type : [filter.event_type];
        events = events.filter(e => types.includes(e.event_type));
      }

      if (filter.after_sequence !== undefined) {
        events = events.filter(e => e.sequence_number > filter.after_sequence!);
      }

      if (filter.before_sequence !== undefined) {
        events = events.filter(e => e.sequence_number < filter.before_sequence!);
      }
    }

    return events;
  },

  getLatestByStream: async (streamType: string, streamId: string): Promise<Event | null> => {
    const events = Array.from(storage.events.values()).filter(e => e.stream_id === streamId && e.stream_type === streamType);
    if (events.length === 0) return null;
    return events.reduce((latest, current) =>
      new Date(current.occurred_at) > new Date(latest.occurred_at) ? current : latest
    );
  },

  query: async (filter: EventFilter): Promise<Event[]> => {
    let events = Array.from(storage.events.values());

    if (filter.event_type) {
      const types = Array.isArray(filter.event_type) ? filter.event_type : [filter.event_type];
      events = events.filter(e => types.includes(e.event_type));
    }

    if (filter.stream_id) {
      events = events.filter(e => e.stream_id === filter.stream_id);
    }

    if (filter.after_sequence !== undefined) {
      events = events.filter(e => e.sequence_number > filter.after_sequence!);
    }

    if (filter.before_sequence !== undefined) {
      events = events.filter(e => e.sequence_number < filter.before_sequence!);
    }

    return events.sort((a, b) => a.sequence_number - b.sequence_number);
  },

  getStats: async (): Promise<{ total_events: number; last_sequence: number }> => {
    return {
      total_events: storage.events.size,
      last_sequence: storage.events.size
    };
  }
};

export const mockCheckpointOps = {
  version: '1.0.0',

  create: async (input: CreateCheckpointInput): Promise<Checkpoint> => {
    const isTestCheckpoint = (input as any).id && (input as any).timestamp;

    if (isTestCheckpoint) {
      const checkpoint: Checkpoint = input as any;
      storage.checkpoints.set(checkpoint.id, checkpoint);
      return checkpoint;
    }

    const sorties = input.sorties ||
      Array.from(storage.sorties.values()).filter(s => s.mission_id === input.mission_id).map(s => ({
        id: s.id,
        status: s.status,
        assigned_to: s.assigned_to,
        files: s.files,
        started_at: s.started_at,
        progress: s.progress,
        progress_notes: s.progress_notes
      }));

    const activeLocks = input.active_locks ||
      Array.from(storage.locks.values()).filter(l => l.status === 'active').map(l => ({
        id: l.id,
        file: l.file,
        held_by: l.reserved_by,
        acquired_at: l.reserved_at,
        purpose: l.purpose,
        timeout_ms: new Date(l.expires_at).getTime() - new Date(l.reserved_at).getTime()
      }));

    const pendingMessages = input.pending_messages ||
      Array.from(storage.messages.values()).filter(m => m.status === 'pending').map(m => ({
        id: m.id,
        from: m.sender_id || 'unknown',
        to: [m.mailbox_id],
        subject: m.message_type,
        sent_at: m.sent_at,
        delivered: m.status !== 'pending'
      }));

    const checkpoint: Checkpoint = {
      id: generateId('chk'),
      mission_id: input.mission_id,
      timestamp: new Date().toISOString(),
      trigger: input.trigger,
      trigger_details: input.trigger_details,
      progress_percent: input.progress_percent || 0,
      sorties,
      active_locks: activeLocks,
      pending_messages: pendingMessages,
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

  getById: async (id: string): Promise<Checkpoint | null> => {
    return storage.checkpoints.get(id) || null;
  },

  getLatest: async (missionId: string): Promise<Checkpoint | null> => {
    const checkpoints = Array.from(storage.checkpoints.values())
      .filter(c => c.mission_id === missionId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return checkpoints[0] || null;
  },

  getLatestByMission: async (missionId: string): Promise<Checkpoint | null> => {
    const checkpoints = Array.from(storage.checkpoints.values())
      .filter(c => c.mission_id === missionId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return checkpoints[0] || null;
  },

  list: async (missionId?: string): Promise<Checkpoint[]> => {
    let checkpoints = Array.from(storage.checkpoints.values());

    if (missionId) {
      checkpoints = checkpoints.filter(c => c.mission_id === missionId);
    }

    return checkpoints.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  delete: async (id: string): Promise<boolean> => {
    return storage.checkpoints.delete(id);
  },

  markConsumed: async (id: string): Promise<Checkpoint | null> => {
    const checkpoint = storage.checkpoints.get(id);
    if (!checkpoint) return null;

    const updated: Checkpoint = {
      ...checkpoint,
      consumed_at: new Date().toISOString()
    };

    storage.checkpoints.set(id, updated);
    return updated;
  }
};

export const mockSpecialistOps = {
  version: '1.0.0',

  register: async (input: RegisterSpecialistInput): Promise<Specialist> => {
    const specialist: Specialist = {
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

  getById: async (id: string): Promise<Specialist | null> => {
    return storage.specialists.get(id) || null;
  },

  updateStatus: async (id: string, status: Specialist['status']): Promise<Specialist | null> => {
    const specialist = storage.specialists.get(id);
    if (!specialist) return null;

    const updated: Specialist = {
      ...specialist,
      status,
      last_seen: new Date().toISOString()
    };

    storage.specialists.set(id, updated);
    return updated;
  },

  heartbeat: async (id: string): Promise<boolean> => {
    const specialist = storage.specialists.get(id);
    if (!specialist) return false;

    specialist.last_seen = new Date().toISOString();
    storage.specialists.set(id, specialist);
    return true;
  },

  setCurrentSortie: async (id: string, sortieId: string | null): Promise<Specialist | null> => {
    const specialist = storage.specialists.get(id);
    if (!specialist) return null;

    const updated: Specialist = {
      ...specialist,
      current_sortie: sortieId || undefined,
      last_seen: new Date().toISOString()
    };

    storage.specialists.set(id, updated);
    return updated;
  },

  list: async (): Promise<Specialist[]> => {
    return Array.from(storage.specialists.values());
  },

  delete: async (id: string): Promise<boolean> => {
    return storage.specialists.delete(id);
  }
};

export const mockMessageOps = {
  version: '1.0.0',

  send: async (input: SendMessageInput): Promise<Message> => {
    const message: Message = {
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

  getById: async (id: string): Promise<Message | null> => {
    return storage.messages.get(id) || null;
  },

  getByMailbox: async (mailboxId: string): Promise<Message[]> => {
    return Array.from(storage.messages.values())
      .filter(m => m.mailbox_id === mailboxId)
      .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
  },

  markRead: async (id: string): Promise<Message | null> => {
    const message = storage.messages.get(id);
    if (!message) return null;

    const updated: Message = {
      ...message,
      status: 'read',
      read_at: new Date().toISOString()
    };

    storage.messages.set(id, updated);
    return updated;
  },

  markAcked: async (id: string): Promise<Message | null> => {
    const message = storage.messages.get(id);
    if (!message) return null;

    const updated: Message = {
      ...message,
      status: 'acked',
      acked_at: new Date().toISOString()
    };

    storage.messages.set(id, updated);
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    return storage.messages.delete(id);
  }
};

export const mockCursorOps = {
  version: '1.0.0',

  create: async (input: CreateCursorInput): Promise<Cursor> => {
    const id = `${input.stream_type}-${input.stream_id}-cursor`;

    const cursor: Cursor = {
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

  getById: async (id: string): Promise<Cursor | null> => {
    return storage.cursors.get(id) || null;
  },

  getByStream: async (streamType: string, streamId: string): Promise<Cursor | null> => {
    const id = `${streamType}-${streamId}-cursor`;
    return storage.cursors.get(id) || null;
  },

  updatePosition: async (id: string, position: number): Promise<Cursor | null> => {
    const cursor = storage.cursors.get(id);
    if (!cursor) return null;

    const updated: Cursor = {
      ...cursor,
      position,
      updated_at: new Date().toISOString()
    };

    storage.cursors.set(id, updated);
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    return storage.cursors.delete(id);
  }
};

export function resetMockStorage(): void {
  storage.reset();
}

let transactionDepth = 0;

export const mockTransactionOps = {
  beginTransaction: async (): Promise<void> => {
    transactionDepth++;
  },
  
  commitTransaction: async (): Promise<void> => {
    if (transactionDepth > 0) {
      transactionDepth--;
    }
  },
  
  rollbackTransaction: async (): Promise<void> => {
    transactionDepth = 0;
  }
};

export const mockDatabase = {
  missions: mockMissionOps,
  sorties: mockSortieOps,
  locks: mockLockOps,
  events: mockEventOps,
  checkpoints: mockCheckpointOps,
  specialists: mockSpecialistOps,
  messages: mockMessageOps,
  cursors: mockCursorOps,
  ...mockTransactionOps,
  reset: resetMockStorage,
  getStorage: () => storage,
  setMissions: (missions: any[]) => {
    missions.forEach(m => storage.missions.set(m.id, m));
  },
  setEvents: (events: any[]) => {
    events.forEach(e => storage.events.set(e.sequence_number, e));
  },
  setCheckpoints: (checkpoints: any[]) => {
    checkpoints.forEach(c => storage.checkpoints.set(c.id, c));
  },
  setLocks: (locks: any[]) => {
    locks.forEach(l => storage.locks.set(l.id, l));
  }
};

export function createMockAdapter() {
  return mockDatabase;
}
