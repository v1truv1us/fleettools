import { initializeDatabase, closeDatabase, mailboxOps, eventOps, cursorOps, lockOps } from './db/index.js';
// Re-export operations and database functions for external consumers
export { mailboxOps, eventOps, cursorOps, lockOps, initializeDatabase, closeDatabase };
async function startServer() {
    // Initialize database on startup
    await initializeDatabase();
    console.log('Squawk API database initialized');
    const server = Bun.serve({
        port: parseInt(process.env.SQUAWK_PORT || '3000', 10),
        async fetch(request) {
            const url = new URL(request.url);
            const path = url.pathname;
            // CORS headers
            const headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            };
            if (request.method === 'OPTIONS') {
                return new Response(null, { headers });
            }
            if (path === '/health') {
                return new Response(JSON.stringify({
                    status: 'healthy',
                    service: 'squawk',
                    timestamp: new Date().toISOString(),
                }), {
                    headers: { ...headers, 'Content-Type': 'application/json' },
                });
            }
            // === MAILBOX ENDPOINTS ===
            if (path === '/api/v1/mailbox/append' && request.method === 'POST') {
                try {
                    const body = await request.json();
                    const { stream_id, events } = body;
                    if (!stream_id || !Array.isArray(events)) {
                        return new Response(JSON.stringify({ error: 'stream_id and events array are required' }), {
                            status: 400,
                            headers: { ...headers, 'Content-Type': 'application/json' },
                        });
                    }
                    if (!(await mailboxOps.exists(stream_id))) {
                        await mailboxOps.create(stream_id);
                    }
                    const formattedEvents = events.map((e) => ({
                        type: e.type,
                        stream_id,
                        data: JSON.stringify(e.data),
                        occurred_at: new Date().toISOString(),
                        causation_id: e.causation_id || null,
                        metadata: e.metadata ? JSON.stringify(e.metadata) : null,
                    }));
                    const inserted = await eventOps.append(stream_id, formattedEvents);
                    const mailbox = await mailboxOps.getById(stream_id);
                    const mailboxEvents = await eventOps.getByMailbox(stream_id);
                    return new Response(JSON.stringify({
                        mailbox: { ...mailbox, events: mailboxEvents },
                        inserted: inserted.length
                    }), {
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
                catch (error) {
                    console.error('Error appending to mailbox:', error);
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    return new Response(JSON.stringify({
                        error: 'Failed to append to mailbox',
                        details: errorMessage
                    }), {
                        status: 500,
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
            }
            if (path.startsWith('/api/v1/mailbox/') && request.method === 'GET') {
                const streamId = path.split('/').pop();
                if (!streamId) {
                    return new Response(JSON.stringify({ error: 'Invalid stream ID' }), {
                        status: 400,
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
                try {
                    const mailbox = await mailboxOps.getById(streamId);
                    if (!mailbox) {
                        return new Response(JSON.stringify({ error: 'Mailbox not found' }), {
                            status: 404,
                            headers: { ...headers, 'Content-Type': 'application/json' },
                        });
                    }
                    const events = await eventOps.getByMailbox(streamId);
                    return new Response(JSON.stringify({ mailbox: { ...mailbox, events } }), {
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
                catch (error) {
                    console.error('Error getting mailbox:', error);
                    return new Response(JSON.stringify({ error: 'Failed to get mailbox' }), {
                        status: 500,
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
            }
            // === CURSOR ENDPOINTS ===
            if (path === '/api/v1/cursor/advance' && request.method === 'POST') {
                try {
                    const body = await request.json();
                    const { stream_id, position } = body;
                    if (!stream_id || typeof position !== 'number') {
                        return new Response(JSON.stringify({ error: 'stream_id and position are required' }), {
                            status: 400,
                            headers: { ...headers, 'Content-Type': 'application/json' },
                        });
                    }
                    if (!(await mailboxOps.exists(stream_id))) {
                        await mailboxOps.create(stream_id);
                    }
                    const cursor = await cursorOps.upsert({ stream_id, position: position, updated_at: new Date().toISOString() });
                    return new Response(JSON.stringify({ cursor }), {
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
                catch (error) {
                    console.error('Error advancing cursor:', error);
                    return new Response(JSON.stringify({ error: 'Failed to advance cursor' }), {
                        status: 500,
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
            }
            if (path.startsWith('/api/v1/cursor/') && request.method === 'GET') {
                const cursorId = path.split('/').pop();
                if (!cursorId) {
                    return new Response(JSON.stringify({ error: 'Invalid cursor ID' }), {
                        status: 400,
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
                try {
                    const cursor = await cursorOps.getById(cursorId);
                    if (!cursor) {
                        return new Response(JSON.stringify({ error: 'Cursor not found' }), {
                            status: 404,
                            headers: { ...headers, 'Content-Type': 'application/json' },
                        });
                    }
                    return new Response(JSON.stringify({ cursor }), {
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
                catch (error) {
                    console.error('Error getting cursor:', error);
                    return new Response(JSON.stringify({ error: 'Failed to get cursor' }), {
                        status: 500,
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
            }
            // === LOCK ENDPOINTS ===
            if (path === '/api/v1/lock/acquire' && request.method === 'POST') {
                try {
                    const body = await request.json();
                    const { file, specialist_id, timeout_ms = 30000 } = body;
                    if (!file || !specialist_id) {
                        return new Response(JSON.stringify({ error: 'file and specialist_id are required' }), {
                            status: 400,
                            headers: { ...headers, 'Content-Type': 'application/json' },
                        });
                    }
                    const lock = await lockOps.acquire({
                        file: file,
                        reserved_by: specialist_id,
                        reserved_at: new Date().toISOString(),
                        released_at: null,
                        purpose: 'edit',
                        checksum: null,
                        timeout_ms,
                        metadata: null,
                    });
                    return new Response(JSON.stringify({ lock }), {
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
                catch (error) {
                    console.error('Error acquiring lock:', error);
                    return new Response(JSON.stringify({ error: 'Failed to acquire lock' }), {
                        status: 500,
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
            }
            if (path === '/api/v1/lock/release' && request.method === 'POST') {
                try {
                    const body = await request.json();
                    const { lock_id, specialist_id } = body;
                    if (!lock_id) {
                        return new Response(JSON.stringify({ error: 'lock_id is required' }), {
                            status: 400,
                            headers: { ...headers, 'Content-Type': 'application/json' },
                        });
                    }
                    const lock = await lockOps.getById(lock_id);
                    if (!lock) {
                        return new Response(JSON.stringify({ error: 'Lock not found' }), {
                            status: 404,
                            headers: { ...headers, 'Content-Type': 'application/json' },
                        });
                    }
                    if (lock.reserved_by !== specialist_id) {
                        return new Response(JSON.stringify({ error: 'Cannot release lock: wrong specialist' }), {
                            status: 403,
                            headers: { ...headers, 'Content-Type': 'application/json' },
                        });
                    }
                    const updatedLock = await lockOps.release(lock_id);
                    return new Response(JSON.stringify({ lock: updatedLock }), {
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
                catch (error) {
                    console.error('Error releasing lock:', error);
                    return new Response(JSON.stringify({ error: 'Failed to release lock' }), {
                        status: 500,
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
            }
            if (path === '/api/v1/locks' && request.method === 'GET') {
                try {
                    const locks = await lockOps.getAll();
                    return new Response(JSON.stringify({ locks }), {
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
                catch (error) {
                    console.error('Error listing locks:', error);
                    return new Response(JSON.stringify({ error: 'Failed to list locks' }), {
                        status: 500,
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
            }
            // === COORDINATOR ENDPOINTS ===
            if (path === '/api/v1/coordinator/status' && request.method === 'GET') {
                try {
                    const mailboxes = await mailboxOps.getAll();
                    const locks = await lockOps.getAll();
                    return new Response(JSON.stringify({
                        active_mailboxes: mailboxes.length,
                        active_locks: locks.length,
                        timestamp: new Date().toISOString(),
                    }), {
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
                catch (error) {
                    console.error('Error getting coordinator status:', error);
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    return new Response(JSON.stringify({
                        error: 'Failed to get status',
                        details: errorMessage
                    }), {
                        status: 500,
                        headers: { ...headers, 'Content-Type': 'application/json' },
                    });
                }
            }
            // 404
            return new Response(JSON.stringify({ error: 'Not found' }), {
                status: 404,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        },
    });
    setInterval(async () => {
        const released = await lockOps.releaseExpired();
        if (released > 0) {
            console.log(`Released ${released} expired locks`);
        }
    }, 30000); // Check every 30 seconds
    console.log(`Squawk API server listening on port ${server.port}`);
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
    process.on('SIGINT', () => {
        console.log('Shutting down...');
        closeDatabase();
        server.stop();
        process.exit(0);
    });
}
// Start the server with error handling
startServer().catch((error) => {
    console.error('Failed to start Squawk server:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map