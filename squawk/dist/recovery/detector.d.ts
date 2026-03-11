import type { Mission, Checkpoint } from '../db/types.js';
export interface RecoveryCandidate {
    mission_id: string;
    mission_title: string;
    last_activity_at: string;
    inactivity_duration_ms: number;
    checkpoint_id?: string;
    checkpoint_progress?: number;
    checkpoint_timestamp?: string;
}
export interface DetectionOptions {
    activityThresholdMs?: number;
    includeCompleted?: boolean;
}
export declare class RecoveryDetector {
    private db;
    constructor(db: {
        missions: {
            getByStatus: (status: string) => Promise<Mission[]>;
        };
        events: {
            getLatestByStream: (type: string, id: string) => Promise<any | null>;
        };
        checkpoints: {
            getLatestByMission: (missionId: string) => Promise<Checkpoint | null>;
        };
    });
    detectRecoveryCandidates(options?: DetectionOptions): Promise<RecoveryCandidate[]>;
    checkForRecovery(options?: DetectionOptions): Promise<{
        needed: boolean;
        candidates: RecoveryCandidate[];
    }>;
}
//# sourceMappingURL=detector.d.ts.map