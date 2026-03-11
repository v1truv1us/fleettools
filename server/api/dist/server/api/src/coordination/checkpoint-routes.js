/**
 * Checkpoint Routes for FleetTools Coordination System
 *
 * Provides REST API endpoints for checkpoint management
 */
import Database from 'bun:sqlite';
import { randomUUID } from 'node:crypto';
class CheckpointManager {
    db;
    constructor(dbPath = '.flightline/checkpoints.db') {
        this.db = new Database(dbPath);
        this.initializeDatabase();
    }
    initializeDatabase() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        trigger TEXT NOT NULL,
        trigger_details TEXT,
        progress_percent INTEGER,
        sorties TEXT, -- JSON array
        active_locks TEXT, -- JSON array
        pending_messages TEXT, -- JSON array
        recovery_context TEXT, -- JSON object
        created_by TEXT NOT NULL,
        version TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_checkpoints_mission_id ON checkpoints(mission_id);
      CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON checkpoints(timestamp);
    `);
    }
    async createCheckpoint(checkpoint) {
        const id = `chk_${randomUUID()}`;
        const now = new Date().toISOString();
        try {
            const stmt = this.db.prepare(`
        INSERT INTO checkpoints (
          id, mission_id, timestamp, trigger, trigger_details,
          progress_percent, sorties, active_locks, pending_messages,
          recovery_context, created_by, version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(id, checkpoint.mission_id, checkpoint.timestamp, checkpoint.trigger, checkpoint.trigger_details || null, checkpoint.progress_percent || null, JSON.stringify(checkpoint.sorties || []), JSON.stringify(checkpoint.active_locks || []), JSON.stringify(checkpoint.pending_messages || []), JSON.stringify(checkpoint.recovery_context || {}), checkpoint.created_by, checkpoint.version, now);
            console.log(`✓ Checkpoint created: ${id}`);
            return {
                id,
                ...checkpoint
            };
        }
        catch (error) {
            console.error(`✗ Failed to create checkpoint:`, error.message);
            throw new Error(`Checkpoint creation failed: ${error.message}`);
        }
    }
    async getCheckpoint(checkpointId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM checkpoints WHERE id = ?');
            const row = stmt.get(checkpointId);
            if (!row)
                return null;
            return this.rowToCheckpoint(row);
        }
        catch (error) {
            console.error(`✗ Failed to get checkpoint:`, error.message);
            throw new Error(`Get checkpoint failed: ${error.message}`);
        }
    }
    async getCheckpointsByMission(missionId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM checkpoints WHERE mission_id = ? ORDER BY timestamp DESC');
            const rows = stmt.all(missionId);
            return rows.map(row => this.rowToCheckpoint(row));
        }
        catch (error) {
            console.error(`✗ Failed to get checkpoints:`, error.message);
            throw new Error(`Get checkpoints failed: ${error.message}`);
        }
    }
    async getLatestCheckpoint(missionId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM checkpoints WHERE mission_id = ? ORDER BY timestamp DESC LIMIT 1');
            const row = stmt.get(missionId);
            if (!row)
                return null;
            return this.rowToCheckpoint(row);
        }
        catch (error) {
            console.error(`✗ Failed to get latest checkpoint:`, error.message);
            throw new Error(`Get latest checkpoint failed: ${error.message}`);
        }
    }
    async deleteCheckpoint(checkpointId) {
        try {
            const stmt = this.db.prepare('DELETE FROM checkpoints WHERE id = ?');
            const result = stmt.run(checkpointId);
            return result.changes > 0;
        }
        catch (error) {
            console.error(`✗ Failed to delete checkpoint:`, error.message);
            throw new Error(`Delete checkpoint failed: ${error.message}`);
        }
    }
    rowToCheckpoint(row) {
        return {
            id: row.id,
            mission_id: row.mission_id,
            timestamp: row.timestamp,
            trigger: row.trigger,
            trigger_details: row.trigger_details,
            progress_percent: row.progress_percent,
            sorties: JSON.parse(row.sorties || '[]'),
            active_locks: JSON.parse(row.active_locks || '[]'),
            pending_messages: JSON.parse(row.pending_messages || '[]'),
            recovery_context: JSON.parse(row.recovery_context || '{}'),
            created_by: row.created_by,
            version: row.version
        };
    }
}
const checkpointManager = new CheckpointManager();
export { CheckpointManager };
export function registerCheckpointRoutes(router, headers) {
    // Create checkpoint
    router.post('/api/v1/checkpoints', async (request) => {
        try {
            const body = await request.json();
            const checkpoint = await checkpointManager.createCheckpoint({
                mission_id: body.mission_id,
                timestamp: new Date().toISOString(),
                trigger: body.trigger || 'manual',
                trigger_details: body.trigger_details,
                progress_percent: body.progress_percent,
                sorties: body.sorties || [],
                active_locks: body.active_locks || [],
                pending_messages: body.pending_messages || [],
                recovery_context: body.recovery_context || {},
                created_by: body.created_by || 'unknown',
                version: body.version || '1.0.0'
            });
            return new Response(JSON.stringify({
                success: true,
                data: checkpoint
            }), {
                status: 201,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
        catch (error) {
            return new Response(JSON.stringify({
                error: 'Failed to create checkpoint',
                message: error.message
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
    });
    // Get specific checkpoint
    router.get('/api/v1/checkpoints/:id', async (request, params) => {
        try {
            const checkpoint = await checkpointManager.getCheckpoint(params.id);
            if (!checkpoint) {
                return new Response(JSON.stringify({
                    error: 'Checkpoint not found'
                }), {
                    status: 404,
                    headers: { ...headers, 'Content-Type': 'application/json' },
                });
            }
            return new Response(JSON.stringify({
                success: true,
                data: checkpoint
            }), {
                status: 200,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
        catch (error) {
            return new Response(JSON.stringify({
                error: 'Failed to get checkpoint',
                message: error.message
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
    });
    // Get checkpoints by mission
    router.get('/api/v1/checkpoints', async (request) => {
        try {
            const url = new URL(request.url);
            const missionId = url.searchParams.get('mission_id');
            if (!missionId) {
                return new Response(JSON.stringify({
                    error: 'mission_id parameter is required'
                }), {
                    status: 400,
                    headers: { ...headers, 'Content-Type': 'application/json' },
                });
            }
            const checkpoints = await checkpointManager.getCheckpointsByMission(missionId);
            return new Response(JSON.stringify({
                success: true,
                data: checkpoints,
                count: checkpoints.length
            }), {
                status: 200,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
        catch (error) {
            return new Response(JSON.stringify({
                error: 'Failed to get checkpoints',
                message: error.message
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
    });
    // Get latest checkpoint for mission
    router.get('/api/v1/checkpoints/latest/:missionId', async (request, params) => {
        try {
            const checkpoint = await checkpointManager.getLatestCheckpoint(params.missionId);
            if (!checkpoint) {
                return new Response(JSON.stringify({
                    error: 'No checkpoints found for mission'
                }), {
                    status: 404,
                    headers: { ...headers, 'Content-Type': 'application/json' },
                });
            }
            return new Response(JSON.stringify({
                success: true,
                data: checkpoint
            }), {
                status: 200,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
        catch (error) {
            return new Response(JSON.stringify({
                error: 'Failed to get latest checkpoint',
                message: error.message
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
    });
    // Delete checkpoint
    router.delete('/api/v1/checkpoints/:id', async (request, params) => {
        try {
            const success = await checkpointManager.deleteCheckpoint(params.id);
            if (!success) {
                return new Response(JSON.stringify({
                    error: 'Checkpoint not found'
                }), {
                    status: 404,
                    headers: { ...headers, 'Content-Type': 'application/json' },
                });
            }
            return new Response(JSON.stringify({
                success: true,
                message: 'Checkpoint deleted successfully'
            }), {
                status: 200,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
        catch (error) {
            return new Response(JSON.stringify({
                error: 'Failed to delete checkpoint',
                message: error.message
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
    });
    // Resume from checkpoint
    router.post('/api/v1/checkpoints/:id/resume', async (request, params) => {
        try {
            const body = await request.json();
            const { force = false, dryRun = false } = body;
            // Import RecoveryManager dynamically to avoid circular dependencies
            const { RecoveryManager } = await import('./recovery-manager.js');
            const recoveryManager = new RecoveryManager();
            const result = await recoveryManager.executeRecovery(params.id, { force, dryRun });
            return new Response(JSON.stringify({
                success: result.success,
                data: {
                    checkpointId: params.id,
                    restoredAgents: result.restoredAgents,
                    restoredTasks: result.restoredTasks,
                    restoredLocks: result.restoredLocks,
                    errors: result.errors,
                    summary: result.success
                        ? 'Recovery completed successfully'
                        : 'Recovery completed with errors'
                }
            }), {
                status: result.success ? 200 : 207, // 207 Multi-Status for partial success
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
        catch (error) {
            return new Response(JSON.stringify({
                error: 'Failed to resume from checkpoint',
                message: error.message
            }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
    });
}
//# sourceMappingURL=checkpoint-routes.js.map