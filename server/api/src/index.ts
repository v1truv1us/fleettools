// @ts-nocheck
// FleetTools API Server using Bun.serve
const server = Bun.serve({
  port: parseInt(process.env.PORT || '3001', 10),
  fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // Health check
    if (path === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'fleettools-server',
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Placeholder routes
    if (path === '/api/v1/work-orders' && request.method === 'GET') {
      return new Response(JSON.stringify({ message: 'Work orders API - TODO' }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    if (path === '/api/v1/ctk' && request.method === 'GET') {
      return new Response(JSON.stringify({ message: 'CTK API - TODO' }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    if (path === '/api/v1/tech-orders' && request.method === 'GET') {
      return new Response(JSON.stringify({ message: 'Tech orders API - TODO' }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Mailbox routes
    if (path.startsWith('/api/v1/mailbox/') && request.method === 'GET') {
      const streamId = path.split('/').pop();
      return new Response(JSON.stringify({ message: `Mailbox ${streamId} - TODO` }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    if (path === '/api/v1/mailbox/append' && request.method === 'POST') {
      return new Response(JSON.stringify({ message: 'Mailbox append - TODO' }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // 404
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  },
});

console.log(`FleetTools API server listening on http://localhost:${server.port}`);
