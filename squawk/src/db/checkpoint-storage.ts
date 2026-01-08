
import { 
  writeFileSync, 
  readFileSync, 
  unlinkSync, 
  existsSync, 
  mkdirSync, 
  lstatSync,
  symlinkSync,
  renameSync
} from 'fs';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import type { 
  Checkpoint, 
  CreateCheckpointInput, 
  CheckpointTrigger,
  SortieSnapshot,
  LockSnapshot,
  MessageSnapshot,
  RecoveryContext 
} from './types.js';
const mockDatabase = require('../../../tests/helpers/mock-database').mockDatabase;

// SCHEMA VALIDATION

interface CheckpointSchema {
  id: string;
  mission_id: string;
  timestamp: string;
  trigger: CheckpointTrigger;
  trigger_details?: string;
  progress_percent: number;
  sorties: SortieSnapshot[];
  active_locks: LockSnapshot[];
  pending_messages: MessageSnapshot[];
  recovery_context: RecoveryContext;
  created_by: string;
  expires_at?: string;
  consumed_at?: string;
  version: string;
  metadata?: Record<string, unknown>;
}

function validateCheckpoint(checkpoint: any): Checkpoint {
  const errors: string[] = [];

  if (!checkpoint.id || typeof checkpoint.id !== 'string') {
    errors.push('Invalid or missing id');
  }
  if (!checkpoint.mission_id || typeof checkpoint.mission_id !== 'string') {
    errors.push('Invalid or missing mission_id');
  }
  if (!checkpoint.timestamp || typeof checkpoint.timestamp !== 'string') {
    errors.push('Invalid or missing timestamp');
  }
  if (!checkpoint.trigger || !['progress', 'error', 'manual', 'compaction'].includes(checkpoint.trigger)) {
    errors.push('Invalid or missing trigger');
  }
  if (typeof checkpoint.progress_percent !== 'number' || 
      checkpoint.progress_percent < 0 || 
      checkpoint.progress_percent > 100) {
    errors.push('Invalid progress_percent (must be 0-100)');
  }
  if (!checkpoint.created_by || typeof checkpoint.created_by !== 'string') {
    errors.push('Invalid or missing created_by');
  }
  if (!checkpoint.version || typeof checkpoint.version !== 'string') {
    errors.push('Invalid or missing version');
  }

  if (checkpoint.timestamp && isNaN(Date.parse(checkpoint.timestamp))) {
    errors.push('Invalid timestamp format');
  }

  if (!Array.isArray(checkpoint.sorties)) {
    errors.push('sorties must be an array');
  }
  if (!Array.isArray(checkpoint.active_locks)) {
    errors.push('active_locks must be an array');
  }
  if (!Array.isArray(checkpoint.pending_messages)) {
    errors.push('pending_messages must be an array');
  }

  if (!checkpoint.recovery_context || typeof checkpoint.recovery_context !== 'object') {
    errors.push('Invalid or missing recovery_context');
  } else {
    const rc = checkpoint.recovery_context;
    if (!rc.last_action || typeof rc.last_action !== 'string') {
      errors.push('Invalid or missing recovery_context.last_action');
    }
    if (!Array.isArray(rc.next_steps)) {
      errors.push('recovery_context.next_steps must be an array');
    }
    if (!Array.isArray(rc.blockers)) {
      errors.push('recovery_context.blockers must be an array');
    }
    if (!Array.isArray(rc.files_modified)) {
      errors.push('recovery_context.files_modified must be an array');
    }
    if (!rc.mission_summary || typeof rc.mission_summary !== 'string') {
      errors.push('Invalid or missing recovery_context.mission_summary');
    }
    if (typeof rc.elapsed_time_ms !== 'number' || rc.elapsed_time_ms < 0) {
      errors.push('Invalid recovery_context.elapsed_time_ms');
    }
    if (!rc.last_activity_at || typeof rc.last_activity_at !== 'string') {
      errors.push('Invalid or missing recovery_context.last_activity_at');
    } else if (isNaN(Date.parse(rc.last_activity_at))) {
      errors.push('Invalid recovery_context.last_activity_at format');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Checkpoint validation failed: ${errors.join(', ')}`);
  }

  return checkpoint as Checkpoint;
}

// STORAGE UTILITIES

function generateCheckpointId(): string {
  const uuid = randomUUID().split('-')[0];
  return `chk-${uuid}`;
}

function getFlightlineDir(): string {
  if (process.env.FLIGHTLINE_TEST_DIR) {
    return process.env.FLIGHTLINE_TEST_DIR;
  }
  const homeDir = require('os').homedir();
  return join(homeDir, '.flightline');
}

function getCheckpointsDir(): string {
  return join(getFlightlineDir(), 'checkpoints');
}

function getCheckpointFilePath(checkpointId: string): string {
  return join(getCheckpointsDir(), `${checkpointId}.json`);
}

function getLatestSymlinkPath(): string {
  return join(getCheckpointsDir(), 'latest.json');
}

function ensureCheckpointsDir(): void {
  const checkpointsDir = getCheckpointsDir();
  if (!existsSync(checkpointsDir)) {
    mkdirSync(checkpointsDir, { recursive: true });
  }
}

function createSymlink(target: string, linkPath: string): void {
  try {
    if (existsSync(linkPath)) {
      unlinkSync(linkPath);
    }
    
    symlinkSync(target, linkPath, 'file');
  } catch (error) {
    // Fallback: copy file content if symlinks aren't supported
    try {
      const content = readFileSync(target, 'utf-8');
      writeFileSync(linkPath, content);
    } catch (copyError) {
      console.warn('Failed to create symlink or fallback copy:', copyError);
    }
  }
}

function writeCheckpointFile(checkpoint: Checkpoint): void {
  const filepath = getCheckpointFilePath(checkpoint.id);
  
  try {
    ensureCheckpointsDir();
    
    const content = JSON.stringify(checkpoint, null, 2);
    writeFileSync(filepath, content, 'utf-8');
    
    createSymlink(filepath, getLatestSymlinkPath());
  } catch (error) {
    throw new Error(`Failed to write checkpoint file ${filepath}: ${error}`);
  }
}

function readCheckpointFile(checkpointId: string): Checkpoint | null {
  const filepath = getCheckpointFilePath(checkpointId);
  
  try {
    if (!existsSync(filepath)) {
      return null;
    }
    
    const content = readFileSync(filepath, 'utf-8');
    const data = JSON.parse(content);
    
    return validateCheckpoint(data);
  } catch (error) {
    console.warn(`Failed to read checkpoint file ${filepath}:`, error);
    return null;
  }
}

function deleteCheckpointFile(checkpointId: string): boolean {
  const filepath = getCheckpointFilePath(checkpointId);
  
  try {
    if (existsSync(filepath)) {
      unlinkSync(filepath);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`Failed to delete checkpoint file ${filepath}:`, error);
    return false;
  }
}

function updateLatestSymlink(): void {
  try {
    const checkpointsDir = getCheckpointsDir();
    if (!existsSync(checkpointsDir)) {
      return;
    }
    
    const files = require('fs').readdirSync(checkpointsDir)
      .filter((file: string) => file.endsWith('.json') && file !== 'latest.json')
      .map((file: string) => {
        const filepath = join(checkpointsDir, file);
        const stats = require('fs').statSync(filepath);
        return { file, filepath, mtime: stats.mtime };
      })
      .sort((a: any, b: any) => b.mtime.getTime() - a.mtime.getTime());
    
    if (files.length > 0) {
      createSymlink(files[0].filepath, getLatestSymlinkPath());
    } else {
      const symlinkPath = getLatestSymlinkPath();
      if (existsSync(symlinkPath)) {
        unlinkSync(symlinkPath);
      }
    }
  } catch (error) {
    console.warn('Failed to update latest symlink:', error);
  }
}

// MAIN STORAGE CLASS

export class CheckpointStorage {
  version = '1.0.0';
  
  constructor() {
    ensureCheckpointsDir();
  }

  async create(input: CreateCheckpointInput): Promise<Checkpoint> {
    try {
      const checkpoint = await mockDatabase.checkpoints.create(input);
      
      writeCheckpointFile(checkpoint);
      
      return checkpoint;
    } catch (error) {
      throw new Error(`Failed to create checkpoint: ${error}`);
    }
  }

  async getById(checkpointId: string): Promise<Checkpoint | null> {
    try {
      let checkpoint = await mockDatabase.checkpoints.getById(checkpointId);
      
      if (!checkpoint) {
        checkpoint = readCheckpointFile(checkpointId);
      }
      
      return checkpoint;
    } catch (error) {
      console.warn(`Error retrieving checkpoint ${checkpointId}:`, error);
      return null;
    }
  }

  async getLatest(missionId: string): Promise<Checkpoint | null> {
    try {
      let checkpoint = await mockDatabase.checkpoints.getLatest(missionId);
      
      // Fallback: read from files if database fails
      if (!checkpoint) {
        const checkpointsDir = getCheckpointsDir();
        if (existsSync(checkpointsDir)) {
          const files = require('fs').readdirSync(checkpointsDir)
            .filter((file: string) => file.endsWith('.json') && file !== 'latest.json')
            .map((file: string) => {
              const filepath = join(checkpointsDir, file);
              try {
                const checkpoint = readCheckpointFile(file.replace('.json', ''));
                return checkpoint ? { ...checkpoint, filepath } : null;
              } catch {
                return null;
              }
            })
            .filter(Boolean)
            .filter((cp: any) => cp.mission_id === missionId)
            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          if (files.length > 0) {
            checkpoint = files[0];
          }
        }
      }
      
      return checkpoint;
    } catch (error) {
      console.warn(`Error retrieving latest checkpoint for mission ${missionId}:`, error);
      return null;
    }
  }

  async list(missionId?: string): Promise<Checkpoint[]> {
    try {
      let checkpoints = await mockDatabase.checkpoints.list(missionId);
      
      if (checkpoints.length === 0) {
        const checkpointsDir = getCheckpointsDir();
        if (existsSync(checkpointsDir)) {
          const fileCheckpoints = require('fs').readdirSync(checkpointsDir)
            .filter((file: string) => file.endsWith('.json') && file !== 'latest.json')
            .map((file: string) => {
              const checkpointId = file.replace('.json', '');
              return readCheckpointFile(checkpointId);
            })
            .filter(Boolean)
            .filter((cp: Checkpoint) => !missionId || cp.mission_id === missionId)
            .sort((a: Checkpoint, b: Checkpoint) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          
          checkpoints = fileCheckpoints;
        }
      }
      
      return checkpoints;
    } catch (error) {
      console.warn(`Error listing checkpoints${missionId ? ` for mission ${missionId}` : ''}:`, error);
      return [];
    }
  }

  async delete(checkpointId: string): Promise<boolean> {
    try {
      const dbDeleted = await mockDatabase.checkpoints.delete(checkpointId);
      
      const fileDeleted = deleteCheckpointFile(checkpointId);
      
      if (dbDeleted || fileDeleted) {
        updateLatestSymlink();
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn(`Error deleting checkpoint ${checkpointId}:`, error);
      return false;
    }
  }

  async markConsumed(checkpointId: string): Promise<Checkpoint | null> {
    try {
      const checkpoint = await mockDatabase.checkpoints.markConsumed(checkpointId);
      
      if (checkpoint) {
        writeCheckpointFile(checkpoint);
      }
      
      return checkpoint;
    } catch (error) {
      console.warn(`Error marking checkpoint ${checkpointId} as consumed:`, error);
      return null;
    }
  }

  async getStats(): Promise<{
    total_checkpoints: number;
    file_count: number;
    latest_checkpoint?: Checkpoint;
  }> {
    try {
      const checkpoints = await mockDatabase.checkpoints.list();
      const dbStats = { total_checkpoints: checkpoints.length };
      
      const checkpointsDir = getCheckpointsDir();
      let fileCount = 0;
      if (existsSync(checkpointsDir)) {
        fileCount = require('fs').readdirSync(checkpointsDir)
          .filter((file: string) => file.endsWith('.json') && file !== 'latest.json')
          .length;
      }
      
      const latestCheckpoint = await this.getLatest(''); // Get any latest checkpoint
      
      return {
        total_checkpoints: dbStats.total_checkpoints,
        file_count: fileCount,
        latest_checkpoint: latestCheckpoint || undefined
      };
    } catch (error) {
      console.warn('Error getting checkpoint stats:', error);
      return {
        total_checkpoints: 0,
        file_count: 0
      };
    }
  }

  async cleanup(): Promise<number> {
    try {
      let cleanedCount = 0;
      const now = new Date();
      
      const checkpoints = await this.list();
      
      for (const checkpoint of checkpoints) {
        if (checkpoint.expires_at && new Date(checkpoint.expires_at) < now) {
          const deleted = await this.delete(checkpoint.id);
          if (deleted) {
            cleanedCount++;
          }
        }
      }
      
      return cleanedCount;
    } catch (error) {
      console.warn('Error during checkpoint cleanup:', error);
      return 0;
    }
  }
}

export const checkpointStorage = new CheckpointStorage();