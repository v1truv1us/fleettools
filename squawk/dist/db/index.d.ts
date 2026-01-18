import { SQLiteAdapter } from './sqlite.js';
import type { Event, Mailbox, Cursor, Lock } from './types.js';
export declare function initializeDatabase(dbPath?: string): Promise<void>;
export declare function getAdapter(): SQLiteAdapter;
export declare function closeDatabase(): Promise<void>;
export declare const mailboxOps: {
    getAll: () => Promise<any>;
    getById: (id: string) => Promise<any>;
    create: (id: string) => Promise<any>;
    exists: (id: string) => Promise<boolean>;
};
export declare const eventOps: {
    getByMailbox: (mailboxId: string) => Promise<any>;
    append: (mailboxId: string, events: any[]) => Promise<Event[]>;
};
export declare const cursorOps: {
    getById: (id: string) => Promise<any>;
    getByStream: (streamId: string) => Promise<any>;
    upsert: (cursor: any) => Promise<any>;
};
export declare const lockOps: {
    getAll: () => Promise<any>;
    getById: (id: string) => Promise<any>;
    acquire: (lock: any) => Promise<any>;
    release: (id: string) => Promise<any>;
    getExpired: () => Promise<any>;
    releaseExpired: () => Promise<any>;
};
export type { Mailbox, Event, Cursor, Lock };
//# sourceMappingURL=index.d.ts.map