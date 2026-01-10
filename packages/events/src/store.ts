/**
 * FleetTools Event Store
 * 
 * Simplified append-only event store using raw SQL for compatibility.
 */

import Database from 'bun:sqlite';
import type { DrizzleDB } from '@fleettools/db';
import { FleetEventSchema, type FleetEvent } from './types/index.js';
import { validateEvent } from './helpers.js';

/**
 * Options for querying events
 */
export interface QueryEventsOptions {
  project_key: string;
  type?: string | string[];
  from_sequence?: number;
  to_sequence?: number;
  from_timestamp?: string;
  to_timestamp?: string;
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
}

/**
 * Event store class for append-only storage and retrieval
 */
export class EventStore {
  constructor(private db: DrizzleDB) {}

  /**
   * Get the underlying SQLite database for raw SQL access
   */
  private getSQLiteDb(): Database {
    // Access the underlying SQLite database from Drizzle client
    return (this.db as any).$client;
  }

  /**
   * Append an event to store
   */
  async append(event: FleetEvent, projectKey: string): Promise<FleetEvent> {
    // Validate the event before storing
    const validatedEvent = validateEvent(event);
    
    // Get the raw SQLite database and ensure table exists
    const sqlite = this.getSQLiteDb();
    this.ensureTablesExist(sqlite);
    
    // Get the next sequence number
    const lastSequence = await this.getLatestSequence(projectKey);
    const nextSequence = lastSequence + 1;
    
    // Create the event with sequence
    const eventWithSequence = {
      ...validatedEvent,
      sequence: nextSequence,
    };

    // Insert using raw SQL
    const stmt = sqlite.prepare(`
      INSERT INTO events (id, aggregate_id, aggregate_type, event_type, event_data, version, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      eventWithSequence.id,
      projectKey,
      'project',
      eventWithSequence.type,
      JSON.stringify(eventWithSequence.data),
      nextSequence,
      eventWithSequence.timestamp || new Date().toISOString()
    );
    
    return eventWithSequence;
  }

  /**
   * Ensure events table exists
   */
  private ensureTablesExist(sqlite: Database): void {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        aggregate_id TEXT NOT NULL,
        aggregate_type TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_data TEXT NOT NULL,
        version INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    
    // Create indexes for performance
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_events_aggregate ON events(aggregate_id);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
      CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
      CREATE INDEX IF NOT EXISTS idx_events_version ON events(aggregate_id, version);
    `);
  }

  /**
   * Query events with filtering options
   */
  async query(options: QueryEventsOptions): Promise<FleetEvent[]> {
    const {
      project_key,
      type,
      from_sequence,
      to_sequence,
      from_timestamp,
      to_timestamp,
      limit = 100,
      offset = 0,
      order = 'asc',
    } = options;

    // Build the SQL query
    let sql = `
      SELECT id, event_type as type, aggregate_id as project_key, created_at as timestamp, version as sequence, event_data as data
      FROM events 
      WHERE aggregate_id = ?
    `;
    const params: any[] = [project_key];
    
    if (type) {
      if (Array.isArray(type)) {
        sql += ` AND event_type IN (${type.map(() => '?').join(', ')})`;
        params.push(...type);
      } else {
        sql += ' AND event_type = ?';
        params.push(type);
      }
    }
    
    if (from_sequence !== undefined) {
      sql += ' AND version >= ?';
      params.push(from_sequence);
    }
    
    if (to_sequence !== undefined) {
      sql += ' AND version <= ?';
      params.push(to_sequence);
    }
    
    if (from_timestamp) {
      sql += ' AND created_at >= ?';
      params.push(from_timestamp);
    }
    
    if (to_timestamp) {
      sql += ' AND created_at <= ?';
      params.push(to_timestamp);
    }

    sql += ` ORDER BY version ${order === 'desc' ? 'DESC' : 'ASC'}`;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Get raw SQLite database
    const sqlite = this.getSQLiteDb();
    
    // Execute query
    const stmt = sqlite.prepare(sql);
    const rows = stmt.all(...params) as any[];

    // Parse and return events
    return rows.map((row: any) => {
      try {
        const data = JSON.parse(row.data);
        const event = {
          id: row.id,
          type: row.type,
          project_key: row.project_key,
          timestamp: row.timestamp,
          sequence: row.sequence,
          data,
        } as FleetEvent;
        
        // Validate the parsed event
        return validateEvent(event);
      } catch (error) {
        console.error(`Failed to parse event data for event ${row.id}:`, error);
        throw new Error(`Invalid event data in database: ${row.id}`);
      }
    });
  }

  /**
   * Get the latest event for a project
   */
  async getLatest(projectKey: string): Promise<FleetEvent | null> {
    const sql = `
      SELECT id, event_type as type, aggregate_id as project_key, created_at as timestamp, version as sequence, event_data as data
      FROM events 
      WHERE aggregate_id = ?
      ORDER BY version DESC
      LIMIT 1
    `;

    // Get raw SQLite database
    const sqlite = this.getSQLiteDb();
    const stmt = sqlite.prepare(sql);
    const rows = stmt.all(projectKey) as any[];

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    try {
      const data = JSON.parse(row.data);
      const event = {
        id: row.id,
        type: row.type,
        project_key: row.project_key,
        timestamp: row.timestamp,
        sequence: row.sequence,
        data,
      } as FleetEvent;
      
      return validateEvent(event);
    } catch (error) {
      console.error(`Failed to parse latest event data:`, error);
      throw new Error(`Invalid event data in database: ${row.id}`);
    }
  }

  /**
   * Get the latest sequence number for a project
   */
  async getLatestSequence(projectKey: string): Promise<number> {
    const sql = `
      SELECT version as sequence
      FROM events 
      WHERE aggregate_id = ?
      ORDER BY version DESC
      LIMIT 1
    `;

    // Get raw SQLite database
    const sqlite = this.getSQLiteDb();
    const stmt = sqlite.prepare(sql);
    const result = stmt.get(projectKey) as any;

    return result?.sequence || 0;
  }

  /**
   * Count events matching the criteria
   */
  async count(projectKey: string, options: Partial<QueryEventsOptions> = {}): Promise<number> {
    const { type, from_timestamp, to_timestamp } = options;

    let sql = 'SELECT COUNT(*) as count FROM events WHERE aggregate_id = ?';
    const params: any[] = [projectKey];
    
    if (type) {
      if (Array.isArray(type)) {
        sql += ` AND event_type IN (${type.map(() => '?').join(', ')})`;
        params.push(...type);
      } else {
        sql += ' AND event_type = ?';
        params.push(type);
      }
    }
    
    if (from_timestamp) {
      sql += ' AND created_at >= ?';
      params.push(from_timestamp);
    }
    
    if (to_timestamp) {
      sql += ' AND created_at <= ?';
      params.push(to_timestamp);
    }

    // Get raw SQLite database
    const sqlite = this.getSQLiteDb();
    const stmt = sqlite.prepare(sql);
    const result = stmt.get(...params) as any;

    return result?.count || 0;
  }

  /**
   * Create an EventStore instance from a database connection
   */
  static fromDb(db: DrizzleDB): EventStore {
    return new EventStore(db);
  }
}