
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
  activityThresholdMs?: number
  includeCompleted?: boolean;    
}

const DEFAULT_ACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; 

export class RecoveryDetector {
  constructor(
    private db: {
      missions: { getByStatus: (status: string) => Promise<Mission[]> };
      events: { getLatestByStream: (type: string, id: string) => Promise<any | null> };
      checkpoints: { getLatestByMission: (missionId: string) => Promise<Checkpoint | null> };
    }
  ) {}

  async detectRecoveryCandidates(
    options: DetectionOptions = {}
  ): Promise<RecoveryCandidate[]> {
    const {
      activityThresholdMs = DEFAULT_ACTIVITY_THRESHOLD_MS,
      includeCompleted = false,
    } = options;

    const now = Date.now();
    const candidates: RecoveryCandidate[] = [];

    const activeMissions = await this.db.missions.getByStatus('in_progress');

    for (const mission of activeMissions) {
      const latestEvent = await this.db.events.getLatestByStream('mission', mission.id);

      if (!latestEvent) continue;

      const lastActivityAt = new Date(latestEvent.occurred_at).getTime();
      const inactivityDuration = now - lastActivityAt;

      if (inactivityDuration > activityThresholdMs) {
        const checkpoint = await this.db.checkpoints.getLatestByMission(mission.id);

        candidates.push({
          mission_id: mission.id,
          mission_title: mission.title,
          last_activity_at: latestEvent.occurred_at,
          inactivity_duration_ms: inactivityDuration,
          checkpoint_id: checkpoint?.id,
          checkpoint_progress: checkpoint?.progress_percent,
          checkpoint_timestamp: checkpoint?.timestamp,
        });
      }
    }

    return candidates;
  }

  async checkForRecovery(options: DetectionOptions = {}): Promise<{
    needed: boolean;
    candidates: RecoveryCandidate[];
  }> {
    const candidates = await this.detectRecoveryCandidates(options);

    const recoverableCandidates = candidates.filter(c => c.checkpoint_id);

    return {
      needed: recoverableCandidates.length > 0,
      candidates: recoverableCandidates,
    };
  }
}
