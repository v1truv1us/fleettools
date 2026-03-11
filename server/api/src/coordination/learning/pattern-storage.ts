/**
 * Pattern Storage Layer for Learning System
 */

import Database from 'bun:sqlite';
import { randomUUID } from 'node:crypto';

export interface LearnedPattern {
  id: string;
  pattern_type: string;
  description?: string;
  task_sequence: any[];
  success_rate: number;
  usage_count: number;
  effectiveness_score: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export class PatternStorage {
  private db: Database;

  constructor(dbPath: string = '.flightline/learning.db') {
    this.db = new Database(dbPath);
  }

  async storePattern(pattern: any): Promise<string> {
    const id = `pat_` + randomUUID();
    const now = new Date().toISOString();

    try {
      const stmt = this.db.prepare(`
        INSERT INTO learned_patterns (
          id, pattern_type, description, task_sequence, success_rate,
          usage_count, effectiveness_score, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        pattern.pattern_type,
        pattern.description || null,
        JSON.stringify(pattern.task_sequence),
        pattern.success_rate || 0,
        pattern.usage_count || 0,
        pattern.effectiveness_score || 0,
        pattern.version || 1,
        now,
        now
      );

      return id;
    } catch (error: any) {
      throw new Error(`Failed to store pattern: ${error.message}`);
    }
  }

  async getPattern(patternId: string): Promise<LearnedPattern | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM learned_patterns WHERE id = ?');
      const row = stmt.get(patternId) as any;
      return row ? this.rowToPattern(row) : null;
    } catch (error: any) {
      throw new Error(`Failed to get pattern: ${error.message}`);
    }
  }

  async listPatterns(filter?: any): Promise<LearnedPattern[]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM learned_patterns ORDER BY effectiveness_score DESC LIMIT 100');
      const rows = stmt.all() as any[];
      return rows.map(row => this.rowToPattern(row));
    } catch (error: any) {
      throw new Error(`Failed to list patterns: ${error.message}`);
    }
  }

  private rowToPattern(row: any): LearnedPattern {
    return {
      id: row.id,
      pattern_type: row.pattern_type,
      description: row.description,
      task_sequence: JSON.parse(row.task_sequence || '[]'),
      success_rate: row.success_rate || 0,
      usage_count: row.usage_count || 0,
      effectiveness_score: row.effectiveness_score || 0,
      version: row.version || 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export default PatternStorage;