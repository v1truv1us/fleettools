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
    consumer_id TEXT,
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

-- Learned Patterns table - stores patterns extracted from completed missions
CREATE TABLE IF NOT EXISTS learned_patterns (
    id TEXT PRIMARY KEY,
    pattern_type TEXT NOT NULL,  -- 'frontend', 'backend', 'testing', etc.
    description TEXT,
    task_sequence TEXT NOT NULL,  -- JSON array of task definitions
    success_rate REAL DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    effectiveness_score REAL DEFAULT 0.0,
    version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT  -- JSON object for extensibility
);

-- Pattern Outcomes table - tracks usage and outcomes of learned patterns
CREATE TABLE IF NOT EXISTS pattern_outcomes (
    id TEXT PRIMARY KEY,
    pattern_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    duration_seconds INTEGER,
    completion_rate REAL,  -- percentage of tasks completed
    outcome_data TEXT,  -- JSON with detailed metrics
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pattern_id) REFERENCES learned_patterns(id) ON DELETE CASCADE,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_mailbox_timestamp
    AFTER UPDATE ON mailboxes
    BEGIN
        UPDATE mailboxes SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_learned_patterns_timestamp
    AFTER UPDATE ON learned_patterns
    BEGIN
        UPDATE learned_patterns SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

-- Indexes for learning system
CREATE INDEX IF NOT EXISTS idx_pattern_outcomes_pattern ON pattern_outcomes(pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_outcomes_mission ON pattern_outcomes(mission_id);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_type ON learned_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_created ON learned_patterns(created_at);
