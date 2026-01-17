/**
 * Checkpoint Routes for FleetTools Coordination System
 *
 * Provides REST API endpoints for checkpoint management
 */
interface Checkpoint {
    id: string;
    mission_id: string;
    timestamp: string;
    trigger: 'manual' | 'auto' | 'error' | 'completion';
    trigger_details?: string;
    progress_percent?: number;
    sorties?: any[];
    active_locks?: any[];
    pending_messages?: any[];
    recovery_context?: Record<string, any>;
    created_by: string;
    version: string;
}
declare class CheckpointManager {
    private db;
    constructor(dbPath?: string);
    private initializeDatabase;
    createCheckpoint(checkpoint: Omit<Checkpoint, 'id'>): Promise<Checkpoint>;
    getCheckpoint(checkpointId: string): Promise<Checkpoint | null>;
    getCheckpointsByMission(missionId: string): Promise<Checkpoint[]>;
    getLatestCheckpoint(missionId: string): Promise<Checkpoint | null>;
    deleteCheckpoint(checkpointId: string): Promise<boolean>;
    private rowToCheckpoint;
}
export { CheckpointManager };
export declare function registerCheckpointRoutes(router: any, headers: Record<string, string>): void;
//# sourceMappingURL=checkpoint-routes.d.ts.map