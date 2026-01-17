import type { Checkpoint, CreateCheckpointInput } from './types.js';
export declare class CheckpointStorage {
    version: string;
    constructor();
    create(input: CreateCheckpointInput): Promise<Checkpoint>;
    getById(checkpointId: string): Promise<Checkpoint | null>;
    getLatest(missionId: string): Promise<Checkpoint | null>;
    list(missionId?: string): Promise<Checkpoint[]>;
    delete(checkpointId: string): Promise<boolean>;
    markConsumed(checkpointId: string): Promise<Checkpoint | null>;
    getStats(): Promise<{
        total_checkpoints: number;
        file_count: number;
        latest_checkpoint?: Checkpoint;
    }>;
    cleanup(): Promise<number>;
}
export declare const checkpointStorage: CheckpointStorage;
//# sourceMappingURL=checkpoint-storage.d.ts.map