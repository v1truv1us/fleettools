// @ts-nocheck
// Flightline Work Orders routes
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const FLIGHTLINE_DIR = path.join(process.cwd(), '.flightline');
const WORK_ORDERS_DIR = path.join(FLIGHTLINE_DIR, 'work-orders');

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(FLIGHTLINE_DIR)) {
    fs.mkdirSync(FLIGHTLINE_DIR, { recursive: true });
  }
  if (!fs.existsSync(WORK_ORDERS_DIR)) {
    fs.mkdirSync(WORK_ORDERS_DIR, { recursive: true });
  }
}

// Helper functions
function generateId() {
  return 'wo_' + crypto.randomUUID();
}

function getWorkOrderPath(orderId: string) {
  return path.join(WORK_ORDERS_DIR, orderId, 'manifest.json');
}

export function registerWorkOrdersRoutes(router: any, headers: Record<string, string>) {
  ensureDirectories();

  // GET /api/v1/work-orders - List all work orders
  router.get('/api/v1/work-orders', async (req: Request) => {
    try {
      if (!fs.existsSync(WORK_ORDERS_DIR)) {
        return new Response(JSON.stringify({ work_orders: [] }), {
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const directories = fs.readdirSync(WORK_ORDERS_DIR);
      const workOrders = [];

      for (const dirName of directories) {
        const manifestPath = path.join(WORK_ORDERS_DIR, dirName, 'manifest.json');
        if (!fs.existsSync(manifestPath)) continue;

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        workOrders.push(manifest);
      }

      return new Response(JSON.stringify({ work_orders: workOrders }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error listing work orders:', error);
      return new Response(JSON.stringify({ error: 'Failed to list work orders' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // POST /api/v1/work-orders - Create new work order
  router.post('/api/v1/work-orders', async (req: Request) => {
    try {
      const body = await req.json();
      const { title, description, priority = 'medium', assigned_to = [] } = body;

      if (!title) {
        return new Response(JSON.stringify({ error: 'title is required' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const orderId = generateId();
      const now = new Date().toISOString();

      const manifest = {
        id: orderId,
        title,
        description: description || '',
        status: 'pending',
        priority,
        created_at: now,
        updated_at: now,
        assigned_to: assigned_to,
        cells: [],
        tech_orders: [],
      };

      const orderDir = path.join(WORK_ORDERS_DIR, orderId);
      const manifestPath = path.join(orderDir, 'manifest.json');

      fs.mkdirSync(orderDir, { recursive: true });
      fs.mkdirSync(path.join(orderDir, 'cells'), { recursive: true });
      fs.mkdirSync(path.join(orderDir, 'events'), { recursive: true });
      fs.mkdirSync(path.join(orderDir, 'artifacts'), { recursive: true });

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      console.log(`Created work order: ${orderId} - ${title}`);

      return new Response(JSON.stringify({ work_order: manifest }), {
        status: 201,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error creating work order:', error);
      return new Response(JSON.stringify({ error: 'Failed to create work order' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // GET /api/v1/work-orders/:id - Get specific work order
  router.get('/api/v1/work-orders/:id', async (req: Request, params: { id: string }) => {
    try {
      const manifestPath = getWorkOrderPath(params.id);
      if (!fs.existsSync(manifestPath)) {
        return new Response(JSON.stringify({ error: 'Work order not found' }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      return new Response(JSON.stringify({ work_order: manifest }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error getting work order:', error);
      return new Response(JSON.stringify({ error: 'Failed to get work order' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // PATCH /api/v1/work-orders/:id - Update work order
  router.patch('/api/v1/work-orders/:id', async (req: Request, params: { id: string }) => {
    try {
      const body = await req.json();
      const manifestPath = getWorkOrderPath(params.id);
      if (!fs.existsSync(manifestPath)) {
        return new Response(JSON.stringify({ error: 'Work order not found' }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      // Update fields
      if (body.title) manifest.title = body.title;
      if (body.description !== undefined) manifest.description = body.description;
      if (body.status) manifest.status = body.status;
      if (body.priority) manifest.priority = body.priority;
      if (body.assigned_to) manifest.assigned_to = body.assigned_to;

      manifest.updated_at = new Date().toISOString();

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      console.log(`Updated work order: ${params.id}`);
      return new Response(JSON.stringify({ work_order: manifest }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error updating work order:', error);
      return new Response(JSON.stringify({ error: 'Failed to update work order' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // DELETE /api/v1/work-orders/:id - Delete work order
  router.delete('/api/v1/work-orders/:id', async (req: Request, params: { id: string }) => {
    try {
      const orderDir = path.join(WORK_ORDERS_DIR, params.id);
      if (!fs.existsSync(orderDir)) {
        return new Response(JSON.stringify({ error: 'Work order not found' }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      // Recursive delete
      fs.rmSync(orderDir, { recursive: true, force: true });

      console.log(`Deleted work order: ${params.id}`);
      return new Response(null, {
        status: 204,
        headers: { ...headers },
      });
    } catch (error) {
      console.error('Error deleting work order:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete work order' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });
}
