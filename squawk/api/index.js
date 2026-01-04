const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3001;
const SQUAWK_DIR = path.join(process.cwd(), '.squawk');

// Ensure squawk directory exists
if (!fs.existsSync(SQUAWK_DIR)) {
  fs.mkdirSync(SQUAWK_DIR, { recursive: true });
}

// ============================================================================
// In-Memory Storage (for MVP - can be persisted later)
// ============================================================================

const mailboxes = new Map(); // Durable mailboxes
const cursors = new Map(); // Cursor positions
const locks = new Map(); // CTK locks
const deferreds = new Map(); // Durable deferreds

// ============================================================================
// API Endpoints
// ============================================================================

const app = express();
app.use(express.json());

// ============================================================================
// Helper Functions
// ============================================================================

function createEvent(type, data, streamId) {
  return {
    id: crypto.randomUUID(),
    type,
    stream_id: streamId,
    data,
    occurred_at: new Date().toISOString(),
    causation_id: null,
  };
}

// ============================================================================
// Mailbox API
// ============================================================================

// POST /api/v1/mailbox/append - Append event(s) to a mailbox
app.post('/api/v1/mailbox/append', (req, res) => {
  try {
    const { stream_id, events } = req.body;

    if (!stream_id || !Array.isArray(events)) {
      return res.status(400).json({ error: 'stream_id and events array are required' });
    }

    let mailbox;
    if (!mailboxes.has(stream_id)) {
      mailbox = {
        id: stream_id,
        events: [],
        created_at: new Date().toISOString(),
      };
      mailboxes.set(stream_id, mailbox);
    } else {
      mailbox = mailboxes.get(stream_id);
    }

    mailbox.events.push(...events);
    res.json({ mailbox });
    console.log(`Appended ${events.length} events to mailbox ${stream_id}`);
  } catch (error) {
    console.error('Error appending to mailbox:', error);
    res.status(500).json({ error: 'Failed to append to mailbox' });
  }
});

// GET /api/v1/mailbox/:streamId - Get mailbox contents
app.get('/api/v1/mailbox/:streamId', (req, res) => {
  try {
    const { streamId } = req.params;

    if (!mailboxes.has(streamId)) {
      return res.status(404).json({ error: 'Mailbox not found' });
    }

    const mailbox = mailboxes.get(streamId);
    res.json({ mailbox });
  } catch (error) {
    console.error('Error getting mailbox:', error);
    res.status(500).json({ error: 'Failed to get mailbox' });
  }
});

// ============================================================================
// Cursor API
// ============================================================================

// POST /api/v1/cursor/advance - Advance cursor position
app.post('/api/v1/cursor/advance', (req, res) => {
  try {
    const { stream_id, position } = req.body;

    if (!stream_id || typeof position !== 'number') {
      return res.status(400).json({ error: 'stream_id and position are required' });
    }

    if (!mailboxes.has(stream_id)) {
      return res.status(404).json({ error: 'Mailbox not found' });
    }

    const cursor = {
      id: `${stream_id}_cursor`,
      stream_id,
      position,
      updated_at: new Date().toISOString(),
    };

    cursors.set(cursor.id, cursor);
    res.json({ cursor });
    console.log(`Advanced cursor for ${stream_id} to position ${position}`);
  } catch (error) {
    console.error('Error advancing cursor:', error);
    res.status(500).json({ error: 'Failed to advance cursor' });
  }
});

// GET /api/v1/cursor/:cursorId - Get cursor position
app.get('/api/v1/cursor/:cursorId', (req, res) => {
  try {
    const { cursorId } = req.params;

    if (!cursors.has(cursorId)) {
      return res.status(404).json({ error: 'Cursor not found' });
    }

    const cursor = cursors.get(cursorId);
    res.json({ cursor });
  } catch (error) {
    console.error('Error getting cursor:', error);
    res.status(500).json({ error: 'Failed to get cursor' });
  }
});

// ============================================================================
// Lock (CTK) API
// ============================================================================

// POST /api/v1/lock/acquire - Acquire a file lock
app.post('/api/v1/lock/acquire', (req, res) => {
  try {
    const { file, specialist_id, timeout_ms = 30000 } = req.body;

    if (!file || !specialist_id) {
      return res.status(400).json({ error: 'file and specialist_id are required' });
    }

    const lock = {
      id: crypto.randomUUID(),
      file,
      reserved_by: specialist_id,
      reserved_at: new Date().toISOString(),
      released_at: null,
      purpose: 'edit', // Default: edit
      checksum: null, // TODO: calculate checksum
      timeout_ms,
    };

    locks.set(lock.id, lock);
    res.json({ lock });
    console.log(`Locked file ${file} for specialist ${specialist_id}`);
  } catch (error) {
    console.error('Error acquiring lock:', error);
    res.status(500).json({ error: 'Failed to acquire lock' });
  }
});

// POST /api/v1/lock/release - Release a file lock
app.post('/api/v1/lock/release', (req, res) => {
  try {
    const { lock_id, specialist_id } = req.body;

    if (!lock_id) {
      return res.status(400).json({ error: 'lock_id is required' });
    }

    if (!locks.has(lock_id)) {
      return res.status(404).json({ error: 'Lock not found' });
    }

    const lock = locks.get(lock_id);
    if (lock.reserved_by !== specialist_id) {
      return res.status(403).json({ error: 'Cannot release lock: wrong specialist' });
    }

    lock.released_at = new Date().toISOString();
    locks.set(lock_id, lock);
    res.json({ lock });
    console.log(`Released lock ${lock_id}`);
  } catch (error) {
    console.error('Error releasing lock:', error);
    res.status(500).json({ error: 'Failed to release lock' });
  }
});

// GET /api/v1/locks - List all active locks
app.get('/api/v1/locks', (req, res) => {
  try {
    const activeLocks = Array.from(locks.values()).filter(lock => !lock.released_at);
    res.json({ locks: activeLocks });
  } catch (error) {
    console.error('Error listing locks:', error);
    res.status(500).json({ error: 'Failed to list locks' });
  }
});

// ============================================================================
// Coordinator API
// ============================================================================

// GET /api/v1/coordinator/status - Get coordinator status
app.get('/api/v1/coordinator/status', (req, res) => {
  try {
    const status = {
      active_mailboxes: mailboxes.size,
      active_cursors: cursors.size,
      active_locks: Array.from(locks.values()).filter(l => !l.released_at).length,
      active_deferreds: deferreds.size,
      active_specialists: [], // TODO: track active specialists
    };

    res.json(status);
  } catch (error) {
    console.error('Error getting coordinator status:', error);
    res.status(500).json({ error: 'Failed to get coordinator status' });
  }
});

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'squawk',
    timestamp: new Date().toISOString(),
    mailboxes: mailboxes.size,
    cursors: cursors.size,
    locks: locks.size,
    deferreds: deferreds.size,
  });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`Squawk API server listening on port ${PORT}`);
  console.log(`Squawk directory: ${SQUAWK_DIR}`);
  console.log('Endpoints:');
  console.log('  POST   /api/v1/mailbox/append   - Append events to mailbox');
  console.log('  GET    /api/v1/mailbox/:streamId - Get mailbox contents');
  console.log('  POST   /api/v1/cursor/advance   - Advance cursor position');
  console.log('  GET    /api/v1/cursor/:cursorId - Get cursor position');
  console.log('  POST   /api/v1/lock/acquire     - Acquire file lock (CTK)');
  console.log('  POST   /api/v1/lock/release    - Release file lock (CTK)');
  console.log('  GET    /api/v1/locks               - List all active locks');
  console.log('  GET    /api/v1/coordinator/status - Get coordinator status');
  console.log('  GET    /health                     - Health check');
});
