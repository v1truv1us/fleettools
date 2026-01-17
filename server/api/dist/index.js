import { closeDatabase, initializeDatabase } from '../../../squawk/src/db/index.js';
import path from 'node:path';
import { registerWorkOrdersRoutes } from './flightline/work-orders.js';
import { registerCtkRoutes } from './flightline/ctk.js';
import { registerTechOrdersRoutes } from './flightline/tech-orders.js';
import { registerMailboxRoutes } from './squawk/mailbox.js';
import { registerCursorRoutes } from './squawk/cursor.js';
import { registerLockRoutes } from './squawk/lock.js';
import { registerCoordinatorRoutes } from './squawk/coordinator.js';
import { registerMissionRoutes } from './coordination/missions.js';
import { registerAgentRoutes } from './coordination/agents.js';
import { registerTaskDecompositionRoutes } from './coordination/tasks.js';
import { registerAgentSpawnerRoutes } from './coordination/agent-spawner-routes.js';
import { registerTaskQueueRoutes } from './coordination/task-queue-routes.js';
import { registerCheckpointRoutes } from './coordination/checkpoint-routes.js';
// Configure CORS based on environment
const getAllowedOrigins = () => {
    const envOrigins = process.env.ALLOWED_ORIGINS;
    if (envOrigins) {
        return envOrigins.split(',').map(origin => origin.trim());
    }
    // Default origins for development
    const nodeEnv = process.env.NODE_ENV || 'development';
    return nodeEnv === 'production'
        ? [] // No default origins in production
        : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'];
};
const getHeaders = (origin) => {
    const allowedOrigins = getAllowedOrigins();
    const isAllowed = !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin);
    return {
        'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : 'false',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400', // 24 hours
    };
};
const routes = [];
function parsePathPattern(pathPattern) {
    const paramNames = [];
    const regexPattern = pathPattern.replace(/:([^/]+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return '([^/]+)';
    });
    return {
        regex: new RegExp(`^${regexPattern}$`),
        paramNames,
    };
}
function createRouter() {
    const addRoute = (method, path, handler, paramNames, regex) => {
        routes.push({ method, pathPattern: path, regex, paramNames, handler });
    };
    return {
        get: (path, handler) => {
            const { regex, paramNames } = parsePathPattern(path);
            if (path.includes(':')) {
                addRoute('GET', path, handler, paramNames, regex);
            }
            else {
                addRoute('GET', path, handler, [], regex);
            }
        },
        post: (path, handler) => {
            const { regex, paramNames } = parsePathPattern(path);
            if (path.includes(':')) {
                addRoute('POST', path, handler, paramNames, regex);
            }
            else {
                addRoute('POST', path, handler, [], regex);
            }
        },
        patch: (path, handler) => {
            const { regex, paramNames } = parsePathPattern(path);
            if (path.includes(':')) {
                addRoute('PATCH', path, handler, paramNames, regex);
            }
            else {
                addRoute('PATCH', path, handler, [], regex);
            }
        },
        delete: (path, handler) => {
            const { regex, paramNames } = parsePathPattern(path);
            if (path.includes(':')) {
                addRoute('DELETE', path, handler, paramNames, regex);
            }
            else {
                addRoute('DELETE', path, handler, [], regex);
            }
        },
    };
}
async function registerRoutes() {
    const headers = getHeaders();
    registerWorkOrdersRoutes(createRouter(), headers);
    registerCtkRoutes(createRouter(), headers);
    registerTechOrdersRoutes(createRouter(), headers);
    registerMailboxRoutes(createRouter(), headers);
    registerCursorRoutes(createRouter(), headers);
    registerLockRoutes(createRouter(), headers);
    registerCoordinatorRoutes(createRouter(), headers);
    // Initialize coordination components
    const { ProgressTracker } = await import('./coordination/progress-tracker.js');
    const progressTracker = new ProgressTracker({
        dbPath: path.join(process.cwd(), '.flightline', 'progress.db')
    });
    registerMissionRoutes(createRouter(), progressTracker);
    registerAgentRoutes(createRouter(), headers);
    registerTaskDecompositionRoutes(createRouter(), headers);
    registerAgentSpawnerRoutes(createRouter(), headers);
    registerTaskQueueRoutes(createRouter(), headers);
    registerCheckpointRoutes(createRouter(), headers);
}
async function startServer() {
    try {
        await initializeDatabase();
        console.log('Squawk database initialized');
    }
    catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
    await registerRoutes();
    const server = Bun.serve({
        port: parseInt(process.env.PORT || '3001', 10),
        async fetch(request) {
            const url = new URL(request.url);
            const path = url.pathname;
            const method = request.method;
            const origin = request.headers.get('origin');
            const headers = getHeaders(origin || undefined);
            if (method === 'OPTIONS') {
                return new Response(null, { headers });
            }
            if (path === '/health') {
                return new Response(JSON.stringify({
                    status: 'healthy',
                    service: 'fleettools-consolidated',
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                }), {
                    headers: { ...headers, 'Content-Type': 'application/json' },
                });
            }
            for (const route of routes) {
                if (route.method !== method)
                    continue;
                const match = path.match(route.regex);
                if (match) {
                    try {
                        const params = {};
                        route.paramNames.forEach((name, i) => {
                            params[name] = match[i + 1];
                        });
                        return await route.handler(request, params);
                    }
                    catch (error) {
                        console.error('Route handler error:', error);
                        return new Response(JSON.stringify({
                            error: 'Internal server error',
                            message: error instanceof Error ? error.message : 'Unknown error',
                        }), {
                            status: 500,
                            headers: { ...headers, 'Content-Type': 'application/json' },
                        });
                    }
                }
            }
            // 404
            return new Response(JSON.stringify({
                error: 'Not found',
                path,
                method,
            }), {
                status: 404,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        },
    });
    setInterval(async () => {
        try {
            const { lockOps } = await import('../../../squawk/src/db/index.js');
            const released = await lockOps.releaseExpired();
            if (released > 0) {
                console.log(`Released ${released} expired locks`);
            }
        }
        catch (error) {
            console.error('Error releasing expired locks:', error);
        }
    }, 30000); // Check every 30 seconds
    console.log(`FleetTools Consolidated API server listening on port ${server.port}`);
    console.log(`Health check: http://localhost:${server.port}/health`);
    console.log('\nFlightline Endpoints:');
    console.log('  GET    /api/v1/work-orders         - List work orders');
    console.log('  POST   /api/v1/work-orders         - Create work order');
    console.log('  GET    /api/v1/work-orders/:id     - Get work order');
    console.log('  PATCH  /api/v1/work-orders/:id     - Update work order');
    console.log('  DELETE /api/v1/work-orders/:id     - Delete work order');
    console.log('  GET    /api/v1/ctk/reservations    - List CTK reservations');
    console.log('  POST   /api/v1/ctk/reserve         - Reserve file');
    console.log('  POST   /api/v1/ctk/release         - Release reservation');
    console.log('  GET    /api/v1/tech-orders         - List tech orders');
    console.log('  POST   /api/v1/tech-orders         - Create tech order');
    console.log('\nSquawk Endpoints:');
    console.log('  POST   /api/v1/mailbox/append      - Append events to mailbox');
    console.log('  GET    /api/v1/mailbox/:streamId   - Get mailbox contents');
    console.log('  POST   /api/v1/cursor/advance      - Advance cursor position');
    console.log('  GET    /api/v1/cursor/:cursorId    - Get cursor position');
    console.log('  POST   /api/v1/lock/acquire        - Acquire file lock');
    console.log('  POST   /api/v1/lock/release        - Release file lock');
    console.log('  GET    /api/v1/locks               - List all active locks');
    console.log('  GET    /api/v1/coordinator/status  - Get coordinator status');
    console.log('\nCoordination Endpoints:');
    console.log('  POST   /api/v1/agents/spawn       - Spawn new agent');
    console.log('  GET    /api/v1/agents            - List all agents');
    console.log('  GET    /api/v1/agents/:id        - Get agent details');
    console.log('  DELETE /api/v1/agents/:id        - Terminate agent');
    console.log('  POST   /api/v1/agents/:id/progress - Report agent progress');
    console.log('  POST   /api/v1/agents/:id/heartbeat - Agent heartbeat');
    console.log('  GET    /api/v1/agents/:id/health  - Get agent health');
    console.log('  GET    /api/v1/agents/system/health - Get system health');
    console.log('  POST   /api/v1/tasks/decompose     - Decompose mission into tasks');
    console.log('  POST   /api/v1/tasks              - Create new task');
    console.log('  GET    /api/v1/tasks              - List tasks');
    console.log('  GET    /api/v1/tasks/:id          - Get task details');
    console.log('  PATCH  /api/v1/tasks/:id/start    - Start task');
    console.log('  PATCH  /api/v1/tasks/:id/complete - Complete task');
    console.log('  PATCH  /api/v1/tasks/:id/fail     - Fail task');
    console.log('  GET    /api/v1/tasks/next/:agentType - Get next tasks');
    console.log('  GET    /api/v1/tasks/stats        - Get task statistics');
    console.log('  POST   /api/v1/tasks/retry-failed - Retry failed tasks');
    console.log('  POST   /api/v1/checkpoints       - Create checkpoint');
    console.log('  GET    /api/v1/checkpoints       - List checkpoints');
    console.log('  GET    /api/v1/checkpoints/:id  - Get checkpoint');
    console.log('  GET    /api/v1/checkpoints/latest/:missionId - Get latest checkpoint');
    console.log('  DELETE /api/v1/checkpoints/:id  - Delete checkpoint');
    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        closeDatabase();
        server.stop();
        process.exit(0);
    });
    process.on('SIGTERM', () => {
        console.log('\nShutting down...');
        closeDatabase();
        server.stop();
        process.exit(0);
    });
    return server;
}
const server = await startServer();
export { server };
//# sourceMappingURL=index.js.map