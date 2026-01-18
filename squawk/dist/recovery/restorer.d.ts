import type { Checkpoint, RecoveryContext, LockResult, AppendEventInput } from '../db/types.js';
export interface RestoreOptions {
    dryRun?: boolean;
    forceLocks?: boolean;
}
export interface RestoreResult {
    success: boolean;
    checkpoint_id: string;
    mission_id: string;
    recovery_context: RecoveryContext;
    restored: {
        sorties: number;
        locks: number;
        messages: number;
    };
    errors: string[];
    warnings: string[];
}
export declare class StateRestorer {
    private db;
    constructor(db: {
        checkpoints: {
            getById: (id: string) => Promise<Checkpoint | null>;
            getLatestByMission: (missionId: string) => Promise<Checkpoint | null>;
            markConsumed: (id: string) => Promise<void>;
        };
        sorties: {
            update: (id: string, data: any) => Promise<void>;
        };
        locks: {
            acquire: (input: any) => Promise<LockResult>;
            forceRelease: (id: string) => Promise<void>;
        };
        messages: {
            requeue: (id: string) => Promise<void>;
        };
        events: {
            append: (input: AppendEventInput) => Promise<any>;
        };
        beginTransaction: () => Promise<void>;
        commitTransaction: () => Promise<void>;
        rollbackTransaction: () => Promise<void>;
    });
    restoreFromCheckpoint(checkpointId: string, options?: RestoreOptions): Promise<RestoreResult>;
    restoreLatest(missionId: string, options?: RestoreOptions): Promise<RestoreResult>;
    private restore;
    private extractNextSteps;
    private extractModifiedFiles;
    formatRecoveryPrompt(result: RestoreResult): string;
}
//# sourceMappingURL=restorer.d.ts.map