
import { cursorOps, mailboxOps } from '@fleettools/squawk';

export function registerCursorRoutes(router: any, headers: Record<string, string>) {
  
  router.post('/api/v1/cursor/advance', async (req: Request) => {
    try {
      const body = await req.json() as { stream_id?: string; position?: number };
      const { stream_id, position } = body;

      if (!stream_id || typeof position !== 'number') {
        return new Response(JSON.stringify({ error: 'stream_id and position are required' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      if (!(await mailboxOps.exists(stream_id))) {
        return new Response(JSON.stringify({ error: 'Mailbox not found' }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const cursor = await cursorOps.upsert({ stream_id, position, updated_at: new Date().toISOString() });
      return new Response(JSON.stringify({ cursor }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error advancing cursor:', error);
      return new Response(JSON.stringify({ error: 'Failed to advance cursor' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  
  router.get('/api/v1/cursor/:cursorId', async (req: Request, params: { cursorId: string }) => {
    try {
      const cursorId = params.cursorId;
      const cursor = cursorOps.getById(cursorId);

      if (!cursor) {
        return new Response(JSON.stringify({ error: 'Cursor not found' }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ cursor }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error getting cursor:', error);
      return new Response(JSON.stringify({ error: 'Failed to get cursor' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });
}
