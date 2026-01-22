

import { closeDatabase, initializeDatabase, lockOps } from '@fleettools/squawk';
import { registerWorkOrdersRoutes } from './flightline/work-orders.js';
import { registerCtkRoutes } from './flightline/ctk.js';
import { registerTechOrdersRoutes } from './flightline/tech-orders.js';
import { registerMailboxRoutes } from './squawk/mailbox.js';
import { registerCursorRoutes } from './squawk/cursor.js';
import { registerLockRoutes } from './squawk/lock.js';
import { registerCoordinatorRoutes } from './squawk/coordinator.js';
import { registerAgentRoutes } from './agents/routes.js';
import { registerCheckpointRoutes } from './coordination/checkpoint-routes.js';
import { registerTaskQueueRoutes } from './coordination/task-queue-routes.js';
import { registerLearningRoutes } from './coordination/learning/routes.js';

// CORS Configuration - use environment variables for security
const corsEnabled = process.env.CORS_ENABLED !== 'false';
const corsAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

function getCorsHeaders(origin?: string): Record<string, string> {
  const baseHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (!corsEnabled) {
    return baseHeaders;
  }

  if (origin && corsAllowedOrigins.includes(origin)) {
    baseHeaders['Access-Control-Allow-Origin'] = origin;
  } else if (corsAllowedOrigins.length === 1) {
    baseHeaders['Access-Control-Allow-Origin'] = corsAllowedOrigins[0];
  }

  return baseHeaders;
}

// Default headers for responses without CORS
const headers: Record<string, string> = getCorsHeaders();

const routes: Array<{
  method: string;
  pathPattern: string;
  regex: RegExp;
  paramNames: string[];
  handler: (req: Request, params?: any) => Promise<Response>;
}> = [];

function parsePathPattern(pathPattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
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
  const addRoute = (method: string, path: string, handler: any, paramNames: string[], regex: RegExp) => {
    routes.push({ method, pathPattern: path, regex, paramNames, handler });
  };
  
  return {
    get: (path: string, handler: any) => {
      const { regex, paramNames } = parsePathPattern(path);
      if (path.includes(':')) {
        addRoute('GET', path, handler, paramNames, regex);
      } else {
        addRoute('GET', path, handler, [], regex);
      }
    },
    post: (path: string, handler: any) => {
      const { regex, paramNames } = parsePathPattern(path);
      if (path.includes(':')) {
        addRoute('POST', path, handler, paramNames, regex);
      } else {
        addRoute('POST', path, handler, [], regex);
      }
    },
    patch: (path: string, handler: any) => {
      const { regex, paramNames } = parsePathPattern(path);
      if (path.includes(':')) {
        addRoute('PATCH', path, handler, paramNames, regex);
      } else {
        addRoute('PATCH', path, handler, [], regex);
      }
    },
    delete: (path: string, handler: any) => {
      const { regex, paramNames } = parsePathPattern(path);
      if (path.includes(':')) {
        addRoute('DELETE', path, handler, paramNames, regex);
      } else {
        addRoute('DELETE', path, handler, [], regex);
      }
    },
  };
}

function registerRoutes() {
  registerWorkOrdersRoutes(createRouter(), headers);
  registerCtkRoutes(createRouter(), headers);
  registerTechOrdersRoutes(createRouter(), headers);
  registerMailboxRoutes(createRouter(), headers);
  registerCursorRoutes(createRouter(), headers);
  registerLockRoutes(createRouter(), headers);
  registerCoordinatorRoutes(createRouter(), headers);
  registerAgentRoutes(createRouter(), headers);
  registerCheckpointRoutes(createRouter(), headers);
  registerTaskQueueRoutes(createRouter(), headers);
  registerLearningRoutes(createRouter(), headers);
}

async function startServer() {
  try {
    await initializeDatabase();
    console.log('Squawk database initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }

  registerRoutes();

  const server = Bun.serve({
    port: parseInt(process.env.PORT || '3001', 10),
    async fetch(request) {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;
      const origin = request.headers.get('origin');

      // Get appropriate CORS headers for this request
      const requestHeaders = getCorsHeaders(origin || undefined);

      if (method === 'OPTIONS') {
        return new Response(null, { headers: requestHeaders });
      }

      if (path === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          service: 'fleettools-consolidated',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        }), {
          headers: { ...requestHeaders, 'Content-Type': 'application/json' },
        });
      }

      for (const route of routes) {
        if (route.method !== method) continue;
        const match = path.match(route.regex);
        if (match) {
          try {
            const params: any = {};
            route.paramNames.forEach((name, i) => {
              params[name] = match[i + 1];
            });
            return await route.handler(request, params);
          } catch (error) {
            console.error('Route handler error:', error);
            return new Response(JSON.stringify({
              error: 'Internal server error',
              message: error instanceof Error ? error.message : 'Unknown error',
            }), {
              status: 500,
              headers: { ...requestHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...requestHeaders, 'Content-Type': 'application/json' },
      });
    },
  });

  setInterval(async () => {
    try {
      const released = await lockOps.releaseExpired();
      if (released > 0) {
        console.log(`Released ${released} expired locks`);
      }
      if (released > 0) {
        console.log(`Released ${released} expired locks`);
      }
    } catch (error) {
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
  console.log('\nAgent Coordination Endpoints:');
  console.log('  GET    /api/v1/agents                 - List all agents');
  console.log('  GET    /api/v1/agents/:callsign      - Get agent by callsign');
  console.log('  POST   /api/v1/agents/register      - Register new agent');
  console.log('  PATCH  /api/v1/agents/:callsign/status - Update agent status');
  console.log('  GET    /api/v1/agents/:callsign/assignments - Get agent assignments');
  console.log('  POST   /api/v1/assignments           - Create work assignment');
  console.log('  GET    /api/v1/assignments           - List all assignments');
  console.log('  PATCH  /api/v1/assignments/:id/status - Update assignment status');
  console.log('  POST   /api/v1/agents/coordinate    - Start agent coordination');
  console.log('  GET    /api/v1/agents/stats          - Get agent statistics');
  console.log('\nCheckpoint & Recovery Endpoints:');
  console.log('  POST   /api/v1/checkpoints            - Create checkpoint');
  console.log('  GET    /api/v1/checkpoints            - List checkpoints by mission');
  console.log('  GET    /api/v1/checkpoints/:id       - Get checkpoint details');
  console.log('  GET    /api/v1/checkpoints/latest/:missionId - Get latest checkpoint');
  console.log('  POST   /api/v1/checkpoints/:id/resume - Resume from checkpoint');
  console.log('  DELETE /api/v1/checkpoints/:id       - Delete checkpoint');
  console.log('\nTask Queue Endpoints:');
  console.log('  POST   /api/v1/tasks                 - Create task');
  console.log('  GET    /api/v1/tasks                 - List all tasks');
  console.log('  GET    /api/v1/tasks/:id             - Get task details');
  console.log('  PATCH  /api/v1/tasks/:id/status      - Update task status');
  console.log('\nLearning System Endpoints:');
  console.log('  GET    /api/v1/patterns               - List learned patterns');
  console.log('  POST   /api/v1/patterns               - Create new pattern');
  console.log('  GET    /api/v1/patterns/:id          - Get pattern details');
  console.log('  DELETE /api/v1/patterns/:id          - Delete pattern');
  console.log('  GET    /api/v1/learning/metrics      - Get learning system metrics');

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
