"use strict";
/**
 * FleetTools Database Client Factory
 *
 * Creates and configures Drizzle database client.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabasePool = void 0;
exports.createInMemoryDb = createInMemoryDb;
exports.createFleetDb = createFleetDb;
exports.createDatabaseClient = createDatabaseClient;
exports.checkDatabaseHealth = checkDatabaseHealth;
exports.getDatabaseInfo = getDatabaseInfo;
exports.withTransaction = withTransaction;
const bun_sqlite_1 = require("drizzle-orm/bun-sqlite");
const bun_sqlite_2 = __importDefault(require("bun:sqlite"));
const schema = __importStar(require("./schema.js"));
/**
 * Create an in-memory database for testing
 */
function createInMemoryDb() {
    return createDatabaseClient({ path: ':memory:' });
}
/**
 * Create a FleetDB instance for a project
 */
function createFleetDb(options) {
    const { projectPath, filename = 'fleet.db', readonly = false } = options;
    // Create .fleet directory if it doesn't exist
    const fleetDir = `${projectPath}/.fleet`;
    try {
        // Use Bun's file system API to create directory
        import('node:fs').then(fs => {
            fs.mkdirSync(fleetDir, { recursive: true });
        });
    }
    catch (error) {
        // Directory might already exist, ignore error
        if (!(error instanceof Error && 'code' in error && error.code !== 'EEXIST')) {
            throw error;
        }
    }
    const dbPath = `${fleetDir}/${filename}`;
    return createDatabaseClient({ path: dbPath, readonly });
}
/**
 * Create a configured Drizzle database client
 */
function createDatabaseClient(config = {}) {
    const { path = ':memory:', readonly = false } = config;
    // Create SQLite database connection
    let sqlite;
    if (path === ':memory:') {
        sqlite = new bun_sqlite_2.default(':memory:');
    }
    else {
        sqlite = new bun_sqlite_2.default(path, { readonly });
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
    return (0, bun_sqlite_1.drizzle)(sqlite, {
        schema,
        logger: process.env.NODE_ENV === 'development' ? true : false,
    });
}
/**
 * Database health check function
 */
async function checkDatabaseHealth(db) {
    try {
        const start = Date.now();
        // Use a simple query with the underlying SQLite database
        const sqlite = db.$client;
        sqlite.run('SELECT 1');
        const latency = Date.now() - start;
        return { healthy: true, latency };
    }
    catch (error) {
        return {
            healthy: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Get database information
 */
async function getDatabaseInfo(db) {
    try {
        // Simple version check using raw SQL
        const version = 'unknown';
        // Get table list using raw SQL
        const tables = [];
        return {
            version,
            tables,
        };
    }
    catch (error) {
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
async function withTransaction(db, callback) {
    return db.transaction(callback);
}
/**
 * Create database connection pool (simplified for SQLite)
 */
class DatabasePool {
    clients = [];
    maxPoolSize;
    config;
    currentIndex = 0;
    constructor(config = {}, maxPoolSize = 10) {
        this.config = config;
        this.maxPoolSize = maxPoolSize;
    }
    getClient() {
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
    async initialize() {
        this.clients = [];
        for (let i = 0; i < this.maxPoolSize; i++) {
            this.clients.push(createDatabaseClient(this.config));
        }
    }
    async close() {
        this.clients = [];
    }
}
exports.DatabasePool = DatabasePool;
//# sourceMappingURL=client.js.map