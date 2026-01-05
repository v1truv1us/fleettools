-- FleetTools Squawk Database Schema
-- Uses SQLite with WAL mode for better concurrency

-- Missions table
CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    total_sorties INTEGER NOT NULL DEFAULT 0,
    completed_sorties INTEGER NOT NULL DEFAULT 0,
    result TEXT,
    metadata TEXT
);

-- Sorties table
CREATE TABLE IF NOT EXISTS sorties (
    id TEXT PRIMARY KEY,
    mission_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    assigned_to TEXT,
    files TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    progress_notes TEXT,
    started_at TEXT,
    completed_at TEXT,
    blocked_by TEXT,
    blocked_reason TEXT,
    result TEXT,
    metadata TEXT,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

-- Mailboxes table
CREATE TABLE IF NOT EXISTS mailboxes (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Events table - stores mailbox events
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    mailbox_id TEXT NOT NULL,
    type TEXT NOT NULL,
    stream_type TEXT NOT NULL,
    stream_id TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    data TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    causation_id TEXT,
    correlation_id TEXT,
    metadata TEXT,
    FOREIGN KEY (mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE
);

-- Cursors table - tracks read positions
CREATE TABLE IF NOT EXISTS cursors (
    id TEXT PRIMARY KEY,
    stream_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(stream_id)
);

-- Locks table - CTK file locks
CREATE TABLE IF NOT EXISTS locks (
    id TEXT PRIMARY KEY,
    file TEXT NOT NULL,
    reserved_by TEXT NOT NULL,
    reserved_at TEXT NOT NULL,
    released_at TEXT,
    purpose TEXT DEFAULT 'edit',
    checksum TEXT,
    timeout_ms INTEGER DEFAULT 30000,
    expires_at TEXT,
    status TEXT DEFAULT 'active',
    metadata TEXT
);

-- Specialists table - tracks active specialists
CREATE TABLE IF NOT EXISTS specialists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    last_seen TEXT NOT NULL,
    metadata TEXT
);

-- Indexes for performance (created AFTER all tables)
CREATE INDEX IF NOT EXISTS idx_events_mailbox ON events(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_events_stream ON events(stream_type, stream_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_sequence ON events(stream_type, stream_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_locks_file ON locks(file);
CREATE INDEX IF NOT EXISTS idx_locks_reserved_by ON locks(reserved_by);
CREATE INDEX IF NOT EXISTS idx_specialists_status ON specialists(status);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_mailbox_timestamp
    AFTER UPDATE ON mailboxes
    BEGIN
        UPDATE mailboxes SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
