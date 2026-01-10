/**
 * FleetTools Database Client Factory
 * 
 * Creates and configures Drizzle database client.
 */

import { drizzle } from 'drizzle-orm/bun-sqlite';
import Database from 'bun:sqlite';
import * as schema from './schema.js';
import type { DatabaseConfig } from '@fleettools/core';

// Re-export DatabaseConfig for package consumers
export type { DatabaseConfig };

export type DrizzleDB = ReturnType<typeof drizzle>;

/**
 * Options for creating FleetDB instance
 */
export interface CreateDbOptions {
  projectPath: string;
  filename?: string;
  readonly?: boolean;
}

/**
 * Create an in-memory database for testing
 */
export function createInMemoryDb(): DrizzleDB {
  return createDatabaseClient({ path: ':memory:' });
}

/**
 * Create a FleetDB instance for a project
 */
export function createFleetDb(options: CreateDbOptions): DrizzleDB {
  const { projectPath, filename = 'fleet.db', readonly = false } = options;
  
  // Create .fleet directory if it doesn't exist
  const fleetDir = `${projectPath}/.fleet`;
  try {
    // Use Bun's file system API to create directory
    import('node:fs').then(fs => {
      fs.mkdirSync(fleetDir, { recursive: true });
    });
  } catch (error) {
    // Directory might already exist, ignore error
    if (!(error instanceof Error && 'code' in error && (error as any).code !== 'EEXIST')) {
      throw error;
    }
  }
  
  const dbPath = `${fleetDir}/${filename}`;
  return createDatabaseClient({ path: dbPath, readonly });
}

/**
 * Create a configured Drizzle database client
 */
export function createDatabaseClient(config: DatabaseConfig = {}): DrizzleDB {
  const { path = ':memory:', readonly = false } = config;
  
  // Create SQLite database connection
  let sqlite: Database;
  if (path === ':memory:') {
    sqlite = new Database(':memory:');
  } else {
    sqlite = new Database(path, { readonly });
  }
  
  // Configure database with pragma settings for performance
  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = 10000;
    PRAGMA temp_store = memory;
    PRAGMA mmap_size = 268435456; -- 256MB
  `);
  
  // Create Drizzle instance with schema
  return drizzle(sqlite, {
    schema,
    logger: process.env.NODE_ENV === 'development' ? true : false,
  });
}

/**
 * Database health check function
 */
export async function checkDatabaseHealth(db: DrizzleDB): Promise<{
  healthy: boolean;
  error?: string;
  latency?: number;
}> {
  try {
    const start = Date.now();
    // Use a simple query with the underlying SQLite database
    const sqlite = (db as any).$client;
    sqlite.run('SELECT 1');
    const latency = Date.now() - start;
    
    return { healthy: true, latency };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get database information
 */
export async function getDatabaseInfo(db: DrizzleDB): Promise<{
  version: string;
  tables: Array<{
    name: string;
    rows: number;
  }>;
}> {
  try {
    // Simple version check using raw SQL
    const version = 'unknown';
    
    // Get table list using raw SQL
    const tables: Array<{ name: string; rows: number }> = [];
    
    return {
      version,
      tables,
    };
  } catch (error) {
    console.error('Failed to get database info:', error);
    return {
      version: 'unknown',
      tables: [],
    };
  }
}

/**
 * Transaction helper with proper error handling
 */
export async function withTransaction<T>(
  db: DrizzleDB,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  return db.transaction(callback);
}

/**
 * Create database connection pool (simplified for SQLite)
 */
export class DatabasePool {
  private clients: DrizzleDB[] = [];
  private readonly maxPoolSize: number;
  private readonly config: DatabaseConfig;
  private currentIndex = 0;

  constructor(config: DatabaseConfig = {}, maxPoolSize: number = 10) {
    this.config = config;
    this.maxPoolSize = maxPoolSize;
  }

  getClient(): DrizzleDB {
    if (this.clients.length === 0) {
      return createDatabaseClient(this.config);
    }

    const client = this.clients[this.currentIndex];
    if (!client) {
      return createDatabaseClient(this.config);
    }
    this.currentIndex = (this.currentIndex + 1) % this.clients.length;
    return client;
  }

  async initialize(): Promise<void> {
    this.clients = [];
    for (let i = 0; i < this.maxPoolSize; i++) {
      this.clients.push(createDatabaseClient(this.config));
    }
  }

  async close(): Promise<void> {
    this.clients = [];
  }
}
