// @ts-nocheck
// FleetTools Squawk Database Module - JSON file-based persistence
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', '..', '..', '.local', 'share', 'fleet', 'squawk.json');

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// In-memory store with file persistence
let data = {
  mailboxes: {},
  events: {},
  cursors: {},
  locks: {}
};

// Load from file
function loadData() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      const loaded = JSON.parse(content);
      data = {
        mailboxes: loaded.mailboxes || {},
        events: loaded.events || {},
        cursors: loaded.cursors || {},
        locks: loaded.locks || {}
      };
    }
  } catch (error) {
    console.error('Error loading database:', error);
  }
}

// Save to file
function saveData() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Load data on module initialization
loadData();

// Save data periodically (every 5 seconds)
setInterval(saveData, 5000);

export function closeDatabase() {
  saveData();
}

// Type definitions
export interface Mailbox {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  mailbox_id: string;
  type: string;
  stream_id: string;
  data: string;
  occurred_at: string;
  causation_id: string | null;
  metadata: string | null;
}

export interface Cursor {
  id: string;
  stream_id: string;
  position: number;
  updated_at: string;
}

export interface Lock {
  id: string;
  file: string;
  reserved_by: string;
  reserved_at: string;
  released_at: string | null;
  purpose: string;
  checksum: string | null;
  timeout_ms: number;
  metadata: string | null;
}

// Database operations
export const mailboxOps = {
  getAll: () => Object.values(data.mailboxes).sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ),
  
  getById: (id: string) => data.mailboxes[id] || null,
  
  create: (id: string) => {
    const mailbox = {
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.mailboxes[id] = mailbox;
    saveData();
    return mailbox;
  },
  
  exists: (id: string) => !!data.mailboxes[id],
};

export const eventOps = {
  getByMailbox: (mailboxId: string) => {
    return (data.events[mailboxId] || []).sort((a: any, b: any) => 
      new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
    );
  },
  
  append: (mailboxId: string, events: any[]) => {
    if (!data.events[mailboxId]) {
      data.events[mailboxId] = [];
    }
    
    const inserted = [];
    for (const event of events) {
      const newEvent = {
        id: crypto.randomUUID(),
        mailbox_id: mailboxId,
        ...event
      };
      data.events[mailboxId].push(newEvent);
      inserted.push(newEvent);
    }
    saveData();
    return inserted;
  },
};

export const cursorOps = {
  getById: (id: string) => data.cursors[id] || null,
  
  getByStream: (streamId: string) => data.cursors[`${streamId}_cursor`] || null,
  
  upsert: (cursor: any) => {
    const id = `${cursor.stream_id}_cursor`;
    const newCursor = {
      id,
      stream_id: cursor.stream_id,
      position: cursor.position,
      updated_at: new Date().toISOString()
    };
    data.cursors[id] = newCursor;
    saveData();
    return newCursor;
  },
};

export const lockOps = {
  getAll: () => {
    const now = Date.now();
    return Object.values(data.locks).filter((lock: any) => {
      if (lock.released_at) return false;
      const reservedAt = new Date(lock.reserved_at).getTime();
      const expiresAt = reservedAt + lock.timeout_ms;
      return now < expiresAt;
    });
  },
  
  getById: (id: string) => data.locks[id] || null,
  
  acquire: (lock: any) => {
    const id = crypto.randomUUID();
    const newLock = {
      id,
      ...lock,
      released_at: null
    };
    data.locks[id] = newLock;
    saveData();
    return newLock;
  },
  
  release: (id: string) => {
    if (data.locks[id]) {
      data.locks[id].released_at = new Date().toISOString();
      saveData();
    }
    return data.locks[id] || null;
  },
  
  getExpired: () => {
    const now = Date.now();
    return Object.values(data.locks).filter((lock: any) => {
      if (lock.released_at) return false;
      const reservedAt = new Date(lock.reserved_at).getTime();
      const expiresAt = reservedAt + lock.timeout_ms;
      return now >= expiresAt;
    });
  },
  
  releaseExpired: () => {
    const expired = lockOps.getExpired();
    for (const lock of expired) {
      lockOps.release(lock.id);
    }
    return expired.length;
  },
};
