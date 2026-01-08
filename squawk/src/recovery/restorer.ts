
import type {
  Checkpoint,
  RecoveryContext,
  SortieSnapshot,
  LockSnapshot,
  MessageSnapshot,
  LockResult,
  AppendEventInput
} from '../db/types.js';

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

export class StateRestorer {
  constructor(
    private db: {
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
    }
  ) {}

  async restoreFromCheckpoint(checkpointId: string, options: RestoreOptions = {}): Promise<RestoreResult> {
    const { dryRun = false, forceLocks = false } = options;

    try {
      const checkpoint = await this.db.checkpoints.getById(checkpointId);
      if (!checkpoint) {
        return {
          success: false,
          checkpoint_id: checkpointId,
          mission_id: '',
          recovery_context: {} as RecoveryContext,
          restored: { sorties: 0, locks: 0, messages: 0 },
          errors: [`Checkpoint not found: ${checkpointId}`],
          warnings: []
        };
      }

      return await this.restore(checkpoint, { dryRun, forceLocks });
    } catch (error) {
      return {
        success: false,
        checkpoint_id: checkpointId,
        mission_id: '',
        recovery_context: {} as RecoveryContext,
        restored: { sorties: 0, locks: 0, messages: 0 },
        errors: [`Restore failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }

  async restoreLatest(missionId: string, options: RestoreOptions = {}): Promise<RestoreResult> {
    const { dryRun = false, forceLocks = false } = options;

    try {
      const checkpoint = await this.db.checkpoints.getLatestByMission(missionId);
      if (!checkpoint) {
        return {
          success: false,
          checkpoint_id: '',
          mission_id: missionId,
          recovery_context: {} as RecoveryContext,
          restored: { sorties: 0, locks: 0, messages: 0 },
          errors: [`No checkpoints found for mission: ${missionId}`],
          warnings: []
        };
      }

      return await this.restore(checkpoint, { dryRun, forceLocks });
    } catch (error) {
      return {
        success: false,
        checkpoint_id: '',
        mission_id: missionId,
        recovery_context: {} as RecoveryContext,
        restored: { sorties: 0, locks: 0, messages: 0 },
        errors: [`Restore failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }

  private async restore(checkpoint: Checkpoint, options: RestoreOptions): Promise<RestoreResult> {
    const { dryRun = false, forceLocks = false } = options;
    const now = new Date().toISOString();

    const result: RestoreResult = {
      success: true,
      checkpoint_id: checkpoint.id,
      mission_id: checkpoint.mission_id,
      recovery_context: {
        last_action: 'Restored from checkpoint',
        next_steps: this.extractNextSteps(checkpoint),
        blockers: [],
        files_modified: this.extractModifiedFiles(checkpoint),
        mission_summary: `${checkpoint.mission_id} checkpoint restoration`,
        elapsed_time_ms: Date.now() - new Date(checkpoint.timestamp).getTime(),
        last_activity_at: checkpoint.timestamp
      },
      restored: { sorties: 0, locks: 0, messages: 0 },
      errors: [],
      warnings: []
    };

    try {
      if (!dryRun) {
        await this.db.beginTransaction();
      }

      // 1. Restore sortie states
      for (const sortie of checkpoint.sorties || []) {
        try {
          if (!dryRun) {
            await this.db.sorties.update(sortie.id, {
              status: sortie.status,
              assigned_to: sortie.assigned_to,
              files: sortie.files,
              progress: sortie.progress,
              progress_notes: sortie.progress_notes
            });
          }
          result.restored.sorties++;
        } catch (error) {
          result.errors.push(`Failed to restore sortie ${sortie.id}: ${error}`);
        }
      }

      
      for (const lock of checkpoint.active_locks || []) {
        try {
          const lockAge = Date.now() - new Date(lock.acquired_at).getTime();
          const isExpired = lockAge > (lock.timeout_ms || 30000);

          if (isExpired) {
            result.warnings.push(`Lock ${lock.id} expired, skipping re-acquisition`);
            result.recovery_context.blockers.push(`Expired lock on ${lock.file} (held by ${lock.held_by})`);
            continue;
          }

          if (!dryRun) {
            const lockResult = await this.db.locks.acquire({
              file: lock.file,
              specialist_id: lock.held_by,
              timeout_ms: lock.timeout_ms,
              purpose: lock.purpose
            });

            if (lockResult.conflict) {
              if (forceLocks) {
                await this.db.locks.forceRelease(lockResult.existing_lock?.id || '');
                await this.db.locks.acquire({
                  file: lock.file,
                  specialist_id: lock.held_by,
                  timeout_ms: lock.timeout_ms,
                  purpose: lock.purpose
                });
              } else {
                result.warnings.push(`Lock conflict on ${lock.file}, skipping re-acquisition`);
                result.recovery_context.blockers.push(`Lock conflict on ${lock.file} (held by ${lock.held_by})`);
                continue;
              }
            }
          }
          result.restored.locks++;
        } catch (error) {
          result.errors.push(`Failed to restore lock ${lock.id}: ${error}`);
        }
      }

      // 3. Requeue pending messages
      for (const message of checkpoint.pending_messages || []) {
        try {
          if (!message.delivered) {
            if (!dryRun) {
              await this.db.messages.requeue(message.id);
            }
            result.restored.messages++;
          }
        } catch (error) {
          result.errors.push(`Failed to requeue message ${message.id}: ${error}`);
        }
      }

      // 4. Mark checkpoint as consumed (only if not dry run and successful)
      if (!dryRun && result.errors.length === 0) {
        await this.db.checkpoints.markConsumed(checkpoint.id);
      }

      // 5. Emit fleet_recovered event
      if (!dryRun && result.errors.length === 0) {
        await this.db.events.append({
          event_type: 'fleet_recovered',
          stream_type: 'mission',
          stream_id: checkpoint.mission_id,
          data: {
            checkpoint_id: checkpoint.id,
            restored_at: now,
            sorties_restored: result.restored.sorties,
            locks_restored: result.restored.locks,
            messages_requeued: result.restored.messages,
            warnings: result.warnings.length
          },
          occurred_at: now
        });
      }

      if (!dryRun) {
        await this.db.commitTransaction();
      }

      return result;
    } catch (error) {
      if (!dryRun) {
        try {
          await this.db.rollbackTransaction();
        } catch (rollbackError) {
          result.errors.push(`Failed to rollback transaction: ${rollbackError}`);
        }
      }
      
      result.success = false;
      result.errors.push(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  private extractNextSteps(checkpoint: Checkpoint): string[] {
    const steps: string[] = [];
    
     const inProgressSorties = checkpoint.sorties?.filter((s: any) => s.status === 'in_progress') || [];
     const blockedSorties = checkpoint.sorties?.filter((s: any) => 
       s.progress_notes && s.progress_notes.toLowerCase().includes('blocked')
     ) || [];

    if (inProgressSorties && inProgressSorties.length > 0) {
      steps.push('Continue work on in-progress sorties');
    }

    if (blockedSorties && blockedSorties.length > 0) {
      steps.push('Resolve blockers for stuck sorties');
    }

    if (checkpoint.active_locks && checkpoint.active_locks.length > 0) {
      steps.push('Verify file lock integrity');
    }

    if (checkpoint.pending_messages && checkpoint.pending_messages.length > 0) {
      steps.push('Process pending messages');
    }

    if (steps.length === 0) {
      steps.push('Review mission status and continue');
    }

    return steps;
  }

  private extractModifiedFiles(checkpoint: Checkpoint): string[] {
    const files: Set<string> = new Set();

     checkpoint.sorties?.forEach((sortie: any) => {
       sortie.files?.forEach((file: any) => files.add(file));
     });

     checkpoint.active_locks?.forEach((lock: any) => {
       files.add(lock.file);
     });

    return Array.from(files);
  }

  formatRecoveryPrompt(result: RestoreResult): string {
    const { recovery_context, restored, errors, warnings } = result;

    const sections = [
      '# Mission Recovery Context',
      '',
      '## Mission Summary',
      recovery_context.mission_summary,
      '',
      '## Last Action',
      recovery_context.last_action,
      '',
      '## Time Context',
      `- Last activity: ${recovery_context.last_activity_at}`,
      `- Elapsed time: ${Math.round(recovery_context.elapsed_time_ms / 60000)} minutes`,
      '',
       '## Next Steps',
       ...recovery_context.next_steps.map((step: any) => `- ${step}`),
       ''
     ];

     if (recovery_context.files_modified.length > 0) {
       sections.push(
         '## Files Modified',
         ...recovery_context.files_modified.map((file: any) => `- ${file}`),
         ''
       );
     }

     if (recovery_context.blockers.length > 0) {
       sections.push(
         '## Blockers',
         ...recovery_context.blockers.map((blocker: any) => `- ${blocker}`),
         ''
       );
     }

    sections.push(
      '## Restoration Summary',
      `- Sorties restored: ${restored.sorties}`,
      `- Locks restored: ${restored.locks}`,
      `- Messages requeued: ${restored.messages}`,
      ''
    );

    if (warnings.length > 0) {
      sections.push(
        '## Warnings',
        ...warnings.map(warning => `- ${warning}`),
        ''
      );
    }

    if (errors.length > 0) {
      sections.push(
        '## Errors',
        ...errors.map(error => `- ${error}`),
        ''
      );
    }

    sections.push(
      '---',
      '*This context was automatically generated from checkpoint restoration.*'
    );

    return sections.join('\n');
  }
}