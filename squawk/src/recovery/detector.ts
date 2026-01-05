/**
 * Recovery Detection Module
 *
 * Detects stale missions that may need recovery from checkpoints.
 */

import type { Mission, Checkpoint } from '../db/types';

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
  activityThresholdMs?: number;  // Default: 5 minutes
  includeCompleted?: boolean;    // Default: false
}

const DEFAULT_ACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export class RecoveryDetector {
  constructor(
    private db: {
      missions: { getByStatus: (status: string) => Promise<Mission[]> };
      events: { getLatestByStream: (type: string, id: string) => Promise<any | null> };
      checkpoints: { getLatestByMission: (missionId: string) => Promise<Checkpoint | null> };
    }
  ) {}

  /**
   * Detect missions that may need recovery
   */
  async detectRecoveryCandidates(
    options: DetectionOptions = {}
  ): Promise<RecoveryCandidate[]> {
    const {
      activityThresholdMs = DEFAULT_ACTIVITY_THRESHOLD_MS,
      includeCompleted = false,
    } = options;

    const now = Date.now();
    const candidates: RecoveryCandidate[] = [];

    // Get all in-progress missions
    const activeMissions = await this.db.missions.getByStatus('in_progress');

    for (const mission of activeMissions) {
      // Get latest event for this mission
      const latestEvent = await this.db.events.getLatestByStream('mission', mission.id);

      if (!latestEvent) continue;

      const lastActivityAt = new Date(latestEvent.occurred_at).getTime();
      const inactivityDuration = now - lastActivityAt;

      if (inactivityDuration > activityThresholdMs) {
        // Get latest checkpoint
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

  /**
   * Check if recovery is needed on startup
   */
  async checkForRecovery(options: DetectionOptions = {}): Promise<{
    needed: boolean;
    candidates: RecoveryCandidate[];
  }> {
    const candidates = await this.detectRecoveryCandidates(options);

    // Filter to only those with checkpoints
    const recoverableCandidates = candidates.filter(c => c.checkpoint_id);

    return {
      needed: recoverableCandidates.length > 0,
      candidates: recoverableCandidates,
    };
  }
}
