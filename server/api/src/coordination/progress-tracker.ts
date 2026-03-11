/**
 * Progress Tracker for FleetTools Mission Management
 *
 * Tracks mission progress, agent status updates, and provides real-time metrics
 * Integrates with Squawk event system for coordination
 */

import Database from 'bun:sqlite';
import { randomUUID } from 'node:crypto';
// Using local types to avoid import issues
export enum MissionStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface ProgressUpdate {
  missionId: string;
  agentId: string;
  progress: number;
  message?: string;
  timestamp: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  status: MissionStatus;
  progress: number;
  tasks: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  metadata: Record<string, any>;
}

export interface ProgressTrackerConfig {
  dbPath?: string;
  updateInterval?: number;
  eventRetention?: number; // days
}

export class ProgressTracker {
  private db: Database;
  private config: ProgressTrackerConfig;
  private updateInterval?: ReturnType<typeof setInterval>;

  constructor(config: ProgressTrackerConfig = {}) {
    this.config = {
      updateInterval: 5000, // 5 seconds
      eventRetention: 30, // 30 days
      ...config
    };

    // Initialize database
    this.db = new Database(this.config.dbPath || ':memory:');
    this.initializeDatabase();
    
    // Start periodic updates
    this.startPeriodicUpdates();
  }

  /**
   * Initialize database tables for progress tracking
   */
  private initializeDatabase(): void {
    // Missions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS missions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        progress REAL DEFAULT 0.0,
        tasks TEXT, -- JSON array
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        metadata TEXT -- JSON object
      )
    `);

    // Progress updates table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS progress_updates (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        progress REAL NOT NULL,
        message TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (mission_id) REFERENCES missions (id)
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_missions_status ON missions (status);
      CREATE INDEX IF NOT EXISTS idx_progress_mission ON progress_updates (mission_id);
      CREATE INDEX IF NOT EXISTS idx_progress_timestamp ON progress_updates (timestamp);
    `);

    console.log('✓ ProgressTracker database initialized');
  }

  /**
   * Start a new mission
   */
  async startMission(mission: Omit<Mission, 'id' | 'createdAt' | 'updatedAt' | 'progress'>): Promise<string> {
    const missionId = `mission-${randomUUID()}`;
    const now = new Date().toISOString();

    try {
      const stmt = this.db.prepare(`
        INSERT INTO missions (
          id, title, description, status, progress, tasks,
          created_at, updated_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        missionId,
        mission.title,
        mission.description,
        MissionStatus.PLANNED,
        0.0,
        JSON.stringify(mission.tasks || []),
        now,
        now,
        JSON.stringify(mission.metadata || {})
      );

      console.log(`✓ Mission started: ${missionId} (${mission.title})`);
      return missionId;
    } catch (error: any) {
      console.error(`✗ Failed to start mission:`, error.message);
      throw new Error(`Mission start failed: ${error.message}`);
    }
  }

  /**
   * Update mission progress
   */
  async updateProgress(update: ProgressUpdate): Promise<void> {
    const updateId = `pup-${randomUUID()}`;
    const now = new Date().toISOString();

    try {
      // Insert progress update
      const updateStmt = this.db.prepare(`
        INSERT INTO progress_updates (
          id, mission_id, agent_id, progress, message, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      updateStmt.run(
        updateId,
        update.missionId,
        update.agentId,
        update.progress,
        update.message || null,
        now
      );

      // Update mission progress if this is the latest
      await this.recalculateMissionProgress(update.missionId);

      console.log(`✓ Progress updated: ${update.missionId} -> ${update.progress}% by ${update.agentId}`);
    } catch (error: any) {
      console.error(`✗ Failed to update progress:`, error.message);
      throw new Error(`Progress update failed: ${error.message}`);
    }
  }

  /**
   * Recalculate mission progress based on latest updates
   */
  private async recalculateMissionProgress(missionId: string): Promise<void> {
    try {
      // Get latest progress from all agents
      const stmt = this.db.prepare(`
        SELECT MAX(progress) as max_progress 
        FROM progress_updates 
        WHERE mission_id = ?
      `);

      const result = stmt.get(missionId) as { max_progress: number };
      const newProgress = result?.max_progress || 0;

      // Update mission with new progress
      const updateStmt = this.db.prepare(`
        UPDATE missions 
        SET progress = ?, updated_at = ?
        WHERE id = ?
      `);

      updateStmt.run(newProgress, new Date().toISOString(), missionId);

      // Check if mission is complete
      if (newProgress >= 100) {
        await this.completeMission(missionId);
      }
    } catch (error: any) {
      console.error(`✗ Failed to recalculate progress:`, error.message);
    }
  }

  /**
   * Complete a mission
   */
  async completeMission(missionId: string): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE missions 
        SET status = ?, progress = 100.0, completed_at = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        MissionStatus.COMPLETED,
        new Date().toISOString(),
        new Date().toISOString(),
        missionId
      );

      console.log(`✓ Mission completed: ${missionId}`);
    } catch (error: any) {
      console.error(`✗ Failed to complete mission:`, error.message);
      throw new Error(`Mission completion failed: ${error.message}`);
    }
  }

  /**
   * Get mission details
   */
  async getMission(missionId: string): Promise<Mission | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM missions WHERE id = ?');
      const row = stmt.get(missionId) as any;

      if (!row) return null;

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status as MissionStatus,
        progress: row.progress,
        tasks: JSON.parse(row.tasks || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
        metadata: JSON.parse(row.metadata || '{}')
      };
    } catch (error: any) {
      console.error(`✗ Failed to get mission:`, error.message);
      return null;
    }
  }

  /**
   * Get all missions with optional status filter
   */
  async getMissions(status?: MissionStatus): Promise<Mission[]> {
    try {
      let whereClause = '';
      const params: any[] = [];

      if (status) {
        whereClause = 'WHERE status = ?';
        params.push(status);
      }

      const stmt = this.db.prepare(`SELECT * FROM missions ${whereClause} ORDER BY created_at DESC`);
      const rows = stmt.all(...params) as any[];

      return rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status as MissionStatus,
        progress: row.progress,
        tasks: JSON.parse(row.tasks || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
        metadata: JSON.parse(row.metadata || '{}')
      }));
    } catch (error: any) {
      console.error(`✗ Failed to get missions:`, error.message);
      return [];
    }
  }

  /**
   * Get progress history for a mission
   */
  async getProgressHistory(missionId: string, limit = 100): Promise<ProgressUpdate[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM progress_updates 
        WHERE mission_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);
      
      const rows = stmt.all(missionId, limit) as any[];

      return rows.map(row => ({
        missionId: row.mission_id,
        agentId: row.agent_id,
        progress: row.progress,
        message: row.message,
        timestamp: row.timestamp
      }));
    } catch (error: any) {
      console.error(`✗ Failed to get progress history:`, error.message);
      return [];
    }
  }

  /**
   * Get real-time progress metrics
   */
  async getProgressMetrics(): Promise<{
    totalMissions: number;
    activeMissions: number;
    completedMissions: number;
    averageProgress: number;
  }> {
    try {
      const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM missions');
      const activeStmt = this.db.prepare('SELECT COUNT(*) as count FROM missions WHERE status IN (?, ?)');
      const completedStmt = this.db.prepare('SELECT COUNT(*) as count FROM missions WHERE status = ?');
      const avgProgressStmt = this.db.prepare('SELECT AVG(progress) as avg FROM missions WHERE status != ?');

      const total = (totalStmt.get() as any).count;
      const active = (activeStmt.get(MissionStatus.ACTIVE, MissionStatus.PLANNED) as any).count;
      const completed = (completedStmt.get(MissionStatus.COMPLETED) as any).count;
      const averageProgress = (avgProgressStmt.get(MissionStatus.COMPLETED) as any).avg || 0;

      return {
        totalMissions: total,
        activeMissions: active,
        completedMissions: completed,
        averageProgress: Math.round(averageProgress * 100) / 100
      };
    } catch (error: any) {
      console.error(`✗ Failed to get progress metrics:`, error.message);
      return {
        totalMissions: 0,
        activeMissions: 0,
        completedMissions: 0,
        averageProgress: 0
      };
    }
  }

  /**
   * Start periodic updates for real-time tracking
   */
  private startPeriodicUpdates(): void {
    if (this.config.updateInterval && this.config.updateInterval > 0) {
      this.updateInterval = setInterval(() => {
        this.performPeriodicUpdate();
      }, this.config.updateInterval);
    }
  }

  /**
   * Perform periodic maintenance tasks
   */
  private async performPeriodicUpdate(): Promise<void> {
    try {
      // Clean up old progress updates based on retention policy
      if (this.config.eventRetention) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.eventRetention);
        
        const deleteStmt = this.db.prepare(`
          DELETE FROM progress_updates 
          WHERE timestamp < ?
        `);
        
        const result = deleteStmt.run(cutoffDate.toISOString());
        if (result.changes && result.changes > 0) {
          console.log(`🧹 Cleaned up ${result.changes} old progress updates`);
        }
      }
    } catch (error: any) {
      console.error(`✗ Periodic update failed:`, error.message);
    }
  }

  /**
   * Close the progress tracker and cleanup resources
   */
  async close(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.db.close();
    console.log('✓ ProgressTracker closed');
  }
}