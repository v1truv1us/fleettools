import type { Mission, Sortie, Lock, Event, Checkpoint, Specialist, Message, Cursor, CreateMissionInput, UpdateMissionInput, CreateSortieInput, UpdateSortieInput, AcquireLockInput, AppendEventInput, CreateCheckpointInput, RegisterSpecialistInput, SendMessageInput, CreateCursorInput, MissionStats, LockResult, EventFilter, MissionFilter, SortieFilter } from '../../squawk/src/db/types';
declare class MockStorage {
    missions: Map<string, Mission>;
    sorties: Map<string, Sortie>;
    locks: Map<string, Lock>;
    events: Map<number, Event>;
    checkpoints: Map<string, Checkpoint>;
    specialists: Map<string, Specialist>;
    messages: Map<string, Message>;
    cursors: Map<string, Cursor>;
    reset(): void;
}
export declare const mockMissionOps: {
    version: string;
    create: (input: CreateMissionInput) => Promise<Mission>;
    getById: (id: string) => Promise<Mission | null>;
    update: (id: string, input: UpdateMissionInput) => Promise<Mission | null>;
    start: (id: string) => Promise<Mission | null>;
    complete: (id: string, result?: Mission["result"]) => Promise<Mission | null>;
    list: (filter?: MissionFilter) => Promise<Mission[]>;
    getStats: (id: string) => Promise<MissionStats | null>;
    delete: (id: string) => Promise<boolean>;
};
export declare const mockSortieOps: {
    version: string;
    create: (input: CreateSortieInput) => Promise<Sortie>;
    getById: (id: string) => Promise<Sortie | null>;
    update: (id: string, input: UpdateSortieInput) => Promise<Sortie | null>;
    start: (id: string, specialistId: string) => Promise<Sortie | null>;
    progress: (id: string, percent: number, notes?: string) => Promise<Sortie | null>;
    complete: (id: string, result?: Sortie["result"]) => Promise<Sortie | null>;
    getByMission: (missionId: string) => Promise<Sortie[]>;
    list: (filter?: SortieFilter) => Promise<Sortie[]>;
    delete: (id: string) => Promise<boolean>;
};
export declare const mockLockOps: {
    version: string;
    acquire: (input: AcquireLockInput) => Promise<LockResult>;
    release: (id: string) => Promise<Lock | null>;
    getById: (id: string) => Promise<Lock | null>;
    getByFile: (file: string) => Promise<Lock | null>;
    getActiveLocks: () => Promise<Lock[]>;
    getExpiredLocks: () => Promise<Lock[]>;
    re_acquire: (originalLockId: string, specialistId: string) => Promise<any>;
    delete: (id: string) => Promise<boolean>;
};
export declare const mockEventOps: {
    version: string;
    append: (input: AppendEventInput) => Promise<Event>;
    getById: (id: string) => Promise<Event | null>;
    getByStream: (streamId: string, filter?: EventFilter) => Promise<Event[]>;
    query: (filter: EventFilter) => Promise<Event[]>;
    getStats: () => Promise<{
        total_events: number;
        last_sequence: number;
    }>;
};
export declare const mockCheckpointOps: {
    version: string;
    create: (input: CreateCheckpointInput) => Promise<Checkpoint>;
    getById: (id: string) => Promise<Checkpoint | null>;
    getLatest: (missionId: string) => Promise<Checkpoint | null>;
    list: (missionId?: string) => Promise<Checkpoint[]>;
    delete: (id: string) => Promise<boolean>;
    markConsumed: (id: string) => Promise<Checkpoint | null>;
};
export declare const mockSpecialistOps: {
    version: string;
    register: (input: RegisterSpecialistInput) => Promise<Specialist>;
    getById: (id: string) => Promise<Specialist | null>;
    updateStatus: (id: string, status: Specialist["status"]) => Promise<Specialist | null>;
    heartbeat: (id: string) => Promise<boolean>;
    setCurrentSortie: (id: string, sortieId: string | null) => Promise<Specialist | null>;
    list: () => Promise<Specialist[]>;
    delete: (id: string) => Promise<boolean>;
};
export declare const mockMessageOps: {
    version: string;
    send: (input: SendMessageInput) => Promise<Message>;
    getById: (id: string) => Promise<Message | null>;
    getByMailbox: (mailboxId: string) => Promise<Message[]>;
    markRead: (id: string) => Promise<Message | null>;
    markAcked: (id: string) => Promise<Message | null>;
    delete: (id: string) => Promise<boolean>;
};
export declare const mockCursorOps: {
    version: string;
    create: (input: CreateCursorInput) => Promise<Cursor>;
    getById: (id: string) => Promise<Cursor | null>;
    getByStream: (streamType: string, streamId: string) => Promise<Cursor | null>;
    updatePosition: (id: string, position: number) => Promise<Cursor | null>;
    delete: (id: string) => Promise<boolean>;
};
export declare function resetMockStorage(): void;
export declare const mockDatabase: {
    missions: {
        version: string;
        create: (input: CreateMissionInput) => Promise<Mission>;
        getById: (id: string) => Promise<Mission | null>;
        update: (id: string, input: UpdateMissionInput) => Promise<Mission | null>;
        start: (id: string) => Promise<Mission | null>;
        complete: (id: string, result?: Mission["result"]) => Promise<Mission | null>;
        list: (filter?: MissionFilter) => Promise<Mission[]>;
        getStats: (id: string) => Promise<MissionStats | null>;
        delete: (id: string) => Promise<boolean>;
    };
    sorties: {
        version: string;
        create: (input: CreateSortieInput) => Promise<Sortie>;
        getById: (id: string) => Promise<Sortie | null>;
        update: (id: string, input: UpdateSortieInput) => Promise<Sortie | null>;
        start: (id: string, specialistId: string) => Promise<Sortie | null>;
        progress: (id: string, percent: number, notes?: string) => Promise<Sortie | null>;
        complete: (id: string, result?: Sortie["result"]) => Promise<Sortie | null>;
        getByMission: (missionId: string) => Promise<Sortie[]>;
        list: (filter?: SortieFilter) => Promise<Sortie[]>;
        delete: (id: string) => Promise<boolean>;
    };
    locks: {
        version: string;
        acquire: (input: AcquireLockInput) => Promise<LockResult>;
        release: (id: string) => Promise<Lock | null>;
        getById: (id: string) => Promise<Lock | null>;
        getByFile: (file: string) => Promise<Lock | null>;
        getActiveLocks: () => Promise<Lock[]>;
        getExpiredLocks: () => Promise<Lock[]>;
        re_acquire: (originalLockId: string, specialistId: string) => Promise<any>;
        delete: (id: string) => Promise<boolean>;
    };
    events: {
        version: string;
        append: (input: AppendEventInput) => Promise<Event>;
        getById: (id: string) => Promise<Event | null>;
        getByStream: (streamId: string, filter?: EventFilter) => Promise<Event[]>;
        query: (filter: EventFilter) => Promise<Event[]>;
        getStats: () => Promise<{
            total_events: number;
            last_sequence: number;
        }>;
    };
    checkpoints: {
        version: string;
        create: (input: CreateCheckpointInput) => Promise<Checkpoint>;
        getById: (id: string) => Promise<Checkpoint | null>;
        getLatest: (missionId: string) => Promise<Checkpoint | null>;
        list: (missionId?: string) => Promise<Checkpoint[]>;
        delete: (id: string) => Promise<boolean>;
        markConsumed: (id: string) => Promise<Checkpoint | null>;
    };
    specialists: {
        version: string;
        register: (input: RegisterSpecialistInput) => Promise<Specialist>;
        getById: (id: string) => Promise<Specialist | null>;
        updateStatus: (id: string, status: Specialist["status"]) => Promise<Specialist | null>;
        heartbeat: (id: string) => Promise<boolean>;
        setCurrentSortie: (id: string, sortieId: string | null) => Promise<Specialist | null>;
        list: () => Promise<Specialist[]>;
        delete: (id: string) => Promise<boolean>;
    };
    messages: {
        version: string;
        send: (input: SendMessageInput) => Promise<Message>;
        getById: (id: string) => Promise<Message | null>;
        getByMailbox: (mailboxId: string) => Promise<Message[]>;
        markRead: (id: string) => Promise<Message | null>;
        markAcked: (id: string) => Promise<Message | null>;
        delete: (id: string) => Promise<boolean>;
    };
    cursors: {
        version: string;
        create: (input: CreateCursorInput) => Promise<Cursor>;
        getById: (id: string) => Promise<Cursor | null>;
        getByStream: (streamType: string, streamId: string) => Promise<Cursor | null>;
        updatePosition: (id: string, position: number) => Promise<Cursor | null>;
        delete: (id: string) => Promise<boolean>;
    };
    reset: typeof resetMockStorage;
    getStorage: () => MockStorage;
};
export {};
//# sourceMappingURL=mock-database.d.ts.map