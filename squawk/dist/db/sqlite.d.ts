import Database from 'bun:sqlite';
import type { DatabaseAdapter, DatabaseStats, MissionOps, SortieOps, LockOps, EventOps, CheckpointOps, SpecialistOps, MessageOps, CursorOps } from './types.js';
export declare class SQLiteAdapter implements DatabaseAdapter {
    version: "1.0.0";
    private db;
    private dbPath;
    private schemaPath;
    missions: MissionOps;
    sorties: SortieOps;
    locks: LockOps;
    events: EventOps;
    checkpoints: CheckpointOps;
    specialists: SpecialistOps;
    messages: MessageOps;
    cursors: CursorOps;
    constructor(dbPath?: string, schemaPath?: string);
    private resolveSchemaPath;
    initialize(): Promise<void>;
    private initializeOperations;
    close(): Promise<void>;
    isHealthy(): Promise<boolean>;
    getStats(): Promise<DatabaseStats>;
    maintenance(): Promise<void>;
    beginTransaction(): Promise<void>;
    commitTransaction(): Promise<void>;
    rollbackTransaction(): Promise<void>;
    getDatabase(): Database | null;
}
export declare function createSQLiteAdapter(dbPath?: string): Promise<SQLiteAdapter>;
export declare function createInMemoryAdapter(): Promise<SQLiteAdapter>;
//# sourceMappingURL=sqlite.d.ts.map