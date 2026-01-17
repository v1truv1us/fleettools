
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const FLIGHTLINE_DIR = path.join(process.cwd(), '.flightline');
const TECH_ORDERS_DIR = path.join(FLIGHTLINE_DIR, 'tech-orders');

function ensureDirectory() {
  if (!fs.existsSync(TECH_ORDERS_DIR)) {
    fs.mkdirSync(TECH_ORDERS_DIR, { recursive: true });
  }
}

export function registerTechOrdersRoutes(router: any, headers: Record<string, string>) {
  ensureDirectory();

  
  router.get('/api/v1/tech-orders', async (req: Request) => {
    try {
      const files = fs.readdirSync(TECH_ORDERS_DIR);
      const techOrders: any[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = fs.readFileSync(path.join(TECH_ORDERS_DIR, file), 'utf-8');
          const techOrder = JSON.parse(content);
          techOrders.push(techOrder);
        }
      }

      return new Response(JSON.stringify({ tech_orders: techOrders }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error listing tech orders:', error);
      return new Response(JSON.stringify({ error: 'Failed to list tech orders' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  
  router.post('/api/v1/tech-orders', async (req: Request) => {
    try {
      const body = await req.json() as { name?: string; pattern?: string; context?: any; usage_count?: number };
      const { name, pattern, context, usage_count = 0 } = body;

      if (!name || !pattern) {
        return new Response(JSON.stringify({ error: 'name and pattern are required' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const techOrder = {
        id: 'to_' + crypto.randomUUID(),
        name,
        pattern,
        context,
        usage_count,
        success_rate: 0,
        anti_pattern: false,
        created_at: new Date().toISOString(),
        last_used: null,
      };

      const techOrderPath = path.join(TECH_ORDERS_DIR, `${techOrder.id}.json`);
      fs.writeFileSync(techOrderPath, JSON.stringify(techOrder, null, 2));

      console.log(`Created tech order: ${name}`);
      return new Response(JSON.stringify({ tech_order: techOrder }), {
        status: 201,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error creating tech order:', error);
      return new Response(JSON.stringify({ error: 'Failed to create tech order' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });
}
