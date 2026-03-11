/**
 * Task Queue for FleetTools Coordination System
 *
 * Manages task queuing, assignment, and completion tracking
 * Uses SQLite for persistence with tsk_ prefixed IDs
 */

import Database from 'bun:sqlite';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
// Using local types to avoid import issues
export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface Task {
  id: string;
  type: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  missionId?: string;
  dependencies?: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TaskQueueConfig {
  dbPath?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export class TaskQueue {
  private db: Database;
  private config: TaskQueueConfig;

  constructor(config: TaskQueueConfig = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      dbPath: path.join(process.cwd(), '.flightline', 'tasks.db'),
      ...config
    };

    this.db = new Database(this.config.dbPath!);
    this.initializeDatabase();
  }

  /**
   * Initialize database schema
   */
  private initializeDatabase(): void {
    // Create tasks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        priority TEXT NOT NULL DEFAULT 'medium',
        assigned_to TEXT,
        mission_id TEXT,
        dependencies TEXT, -- JSON array
        metadata TEXT, -- JSON object
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        retry_count INTEGER DEFAULT 0,
        last_retry_at TEXT
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_tasks_mission_id ON tasks(mission_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    `);
  }

  /**
   * Enqueue a new task
   */
  async enqueue(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const taskId = `tsk_${randomUUID()}`;
    const now = new Date().toISOString();
    
    try {
      const stmt = this.db.prepare(`
        INSERT INTO tasks (
          id, type, title, description, status, priority,
          assigned_to, mission_id, dependencies, metadata,
          created_at, updated_at, retry_count, last_retry_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        taskId,
        task.type,
        task.title,
        task.description,
        task.status || TaskStatus.PENDING,
        task.priority,
        task.assignedTo || null,
        task.missionId || null,
        JSON.stringify(task.dependencies || []),
        JSON.stringify(task.metadata || {}),
        now,
        now,
        0, // retry_count
        null // last_retry_at
      );

      console.log(`✓ Task enqueued: ${taskId} (${task.title})`);
      return taskId;
    } catch (error: any) {
      console.error(`✗ Failed to enqueue task:`, error.message);
      throw new Error(`Task enqueue failed: ${error.message}`);
    }
  }

  /**
   * Dequeue next available task for agent type
   */
  async dequeue(agentType?: string, limit = 1): Promise<Task[]> {
    try {
      let whereClause = 'status = ?';
      const params: any[] = [TaskStatus.PENDING];

      if (agentType) {
        whereClause += ' AND (type = ? OR type = ?)';
        params.push(agentType, 'general'); // Allow general tasks
      }

      whereClause += ' ORDER BY priority DESC, created_at ASC LIMIT ?';
      params.push(limit);

      const stmt = this.db.prepare(`
        SELECT * FROM tasks 
        WHERE ${whereClause}
      `);

      const rows = stmt.all(...params) as any[];
      
      if (rows.length === 0) {
        return [];
      }

      // Mark tasks as assigned
      const taskIds = rows.map(row => row.id);
      await this.markAsAssigned(taskIds);

      // Convert rows to Task objects
      const tasks: Task[] = rows.map(row => this.rowToTask(row));
      
      console.log(`✓ Dequeued ${tasks.length} task(s)`);
      return tasks;
    } catch (error: any) {
      console.error(`✗ Failed to dequeue tasks:`, error.message);
      throw new Error(`Task dequeue failed: ${error.message}`);
    }
  }

  /**
   * Mark task as in progress
   */
  async markAsInProgress(taskId: string): Promise<void> {
    await this.updateTaskStatus(taskId, TaskStatus.IN_PROGRESS);
  }

  /**
   * Complete a task
   */
  async complete(taskId: string, result?: any): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        UPDATE tasks 
        SET status = ?, updated_at = ?, completed_at = ?, metadata = ?
        WHERE id = ?
      `);

      // Add result to metadata
      const currentTask = await this.getTask(taskId);
      const updatedMetadata = {
        ...currentTask?.metadata,
        result: result || null
      };

      stmt.run(
        TaskStatus.COMPLETED,
        now,
        now,
        JSON.stringify(updatedMetadata),
        taskId
      );

      console.log(`✓ Task completed: ${taskId}`);
    } catch (error: any) {
      await this.fail(taskId, `Completion failed: ${error.message}`);
      throw new Error(`Task completion failed: ${error.message}`);
    }
  }

  /**
   * Mark task as failed
   */
  async fail(taskId: string, error: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        UPDATE tasks 
        SET status = ?, updated_at = ?, retry_count = retry_count + 1, last_retry_at = ?
        WHERE id = ?
      `);

      stmt.run(
        TaskStatus.FAILED,
        now,
        now,
        taskId
      );

      console.log(`✗ Task failed: ${taskId} - ${error}`);
    } catch (error: any) {
      console.error(`✗ Failed to mark task as failed:`, error.message);
      throw new Error(`Task failure marking failed: ${error.message}`);
    }
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<Task | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
      const row = stmt.get(taskId) as any;
      
      return row ? this.rowToTask(row) : null;
    } catch (error: any) {
      console.error(`✗ Failed to get task:`, error.message);
      return null;
    }
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC');
      const rows = stmt.all(status) as any[];
      
      return rows.map(row => this.rowToTask(row));
    } catch (error: any) {
      console.error(`✗ Failed to get tasks by status:`, error.message);
      return [];
    }
  }

  /**
   * Get tasks for mission
   */
  async getTasksByMission(missionId: string): Promise<Task[]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM tasks WHERE mission_id = ? ORDER BY priority DESC, created_at ASC');
      const rows = stmt.all(missionId) as any[];
      
      return rows.map(row => this.rowToTask(row));
    } catch (error: any) {
      console.error(`✗ Failed to get mission tasks:`, error.message);
      return [];
    }
  }

  /**
   * Get tasks assigned to agent
   */
  async getTasksByAgent(agentId: string): Promise<Task[]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM tasks WHERE assigned_to = ? ORDER BY created_at DESC');
      const rows = stmt.all(agentId) as any[];
      
      return rows.map(row => this.rowToTask(row));
    } catch (error: any) {
      console.error(`✗ Failed to get agent tasks:`, error.message);
      return [];
    }
  }

  /**
   * Retry failed tasks
   */
  async retryFailedTasks(): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks 
        WHERE status = ? AND retry_count < ?
        ORDER BY priority DESC, created_at ASC
      `);

      const rows = stmt.all(TaskStatus.FAILED, this.config.maxRetries!) as any[];
      
      let retriedCount = 0;
      
      for (const row of rows) {
        // Check dependencies
        if (row.dependencies) {
          const dependencies = JSON.parse(row.dependencies);
          const pendingDeps = await this.checkDependencies(dependencies);
          
          if (pendingDeps.length > 0) {
            continue; // Skip if dependencies not met
          }
        }

        await this.resetTask(row.id);
        retriedCount++;
      }

      if (retriedCount > 0) {
        console.log(`✓ Retried ${retriedCount} failed tasks`);
      }

      return retriedCount;
    } catch (error: any) {
      console.error(`✗ Failed to retry tasks:`, error.message);
      return 0;
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    assigned: number;
    inProgress: number;
    completed: number;
    failed: number;
  }> {
    try {
      const stats = {
        total: 0,
        pending: 0,
        assigned: 0,
        inProgress: 0,
        completed: 0,
        failed: 0
      };

      const stmt = this.db.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status');
      const rows = stmt.all() as any[];

      rows.forEach(row => {
        stats.total += row.count;
        
        switch (row.status) {
          case TaskStatus.PENDING:
            stats.pending = row.count;
            break;
          case TaskStatus.ASSIGNED:
            stats.assigned = row.count;
            break;
          case TaskStatus.IN_PROGRESS:
            stats.inProgress = row.count;
            break;
          case TaskStatus.COMPLETED:
            stats.completed = row.count;
            break;
          case TaskStatus.FAILED:
            stats.failed = row.count;
            break;
        }
      });

      return stats;
    } catch (error: any) {
      console.error(`✗ Failed to get stats:`, error.message);
      return {
        total: 0,
        pending: 0,
        assigned: 0,
        inProgress: 0,
        completed: 0,
        failed: 0
      };
    }
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  private async markAsAssigned(taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) return;

    const placeholders = taskIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET status = ?, updated_at = ? 
      WHERE id IN (${placeholders})
    `);

    const now = new Date().toISOString();
    stmt.run(TaskStatus.ASSIGNED, now, ...taskIds);
  }

  private async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET status = ?, updated_at = ? 
      WHERE id = ?
    `);

    stmt.run(status, new Date().toISOString(), taskId);
  }

  private async resetTask(taskId: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET status = ?, updated_at = ?, completed_at = NULL 
      WHERE id = ?
    `);

    stmt.run(TaskStatus.PENDING, new Date().toISOString(), taskId);
  }

  private async checkDependencies(dependencies: string[]): Promise<string[]> {
    if (dependencies.length === 0) return [];

    const placeholders = dependencies.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      SELECT id FROM tasks 
      WHERE id IN (${placeholders}) AND status != ?
    `);

    const incompleteRows = stmt.all(...dependencies, TaskStatus.COMPLETED) as any[];
    return incompleteRows.map((row: any) => row.id);
  }

  private rowToTask(row: any): Task {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description || '',
      status: row.status,
      priority: row.priority,
      assignedTo: row.assigned_to,
      missionId: row.mission_id,
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}