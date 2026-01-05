export declare function closeDatabase(): void;
export interface Mailbox {
    id: string;
    created_at: string;
    updated_at: string;
}
export interface Event {
    id: string;
    mailbox_id: string;
    type: string;
    stream_id: string;
    data: string;
    occurred_at: string;
    causation_id: string | null;
    metadata: string | null;
}
export interface Cursor {
    id: string;
    stream_id: string;
    position: number;
    updated_at: string;
}
export interface Lock {
    id: string;
    file: string;
    reserved_by: string;
    reserved_at: string;
    released_at: string | null;
    purpose: string;
    checksum: string | null;
    timeout_ms: number;
    metadata: string | null;
}
export declare const mailboxOps: {
    getAll: () => unknown[];
    getById: (id: string) => any;
    create: (id: string) => {
        id: string;
        created_at: string;
        updated_at: string;
    };
    exists: (id: string) => boolean;
};
export declare const eventOps: {
    getByMailbox: (mailboxId: string) => any;
    append: (mailboxId: string, events: any[]) => any[];
};
export declare const cursorOps: {
    getById: (id: string) => any;
    getByStream: (streamId: string) => any;
    upsert: (cursor: any) => {
        id: string;
        stream_id: any;
        position: any;
        updated_at: string;
    };
};
export declare const lockOps: {
    getAll: () => unknown[];
    getById: (id: string) => any;
    acquire: (lock: any) => any;
    release: (id: string) => any;
    getExpired: () => unknown[];
    releaseExpired: () => number;
};
//# sourceMappingURL=index.d.ts.map