
import { lockOps } from '@fleettools/squawk';

export function registerLockRoutes(router: any, headers: Record<string, string>) {
  
  router.post('/api/v1/lock/acquire', async (req: Request) => {
    try {
      const body = await req.json() as { file?: string; specialist_id?: string; timeout_ms?: number };
      const { file, specialist_id, timeout_ms = 30000 } = body;

      if (!file || !specialist_id) {
        return new Response(JSON.stringify({ error: 'file and specialist_id are required' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const lock = await lockOps.acquire({
        file,
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
    } catch (error) {
      console.error('Error acquiring lock:', error);
      return new Response(JSON.stringify({ error: 'Failed to acquire lock' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  
  router.post('/api/v1/lock/release', async (req: Request) => {
    try {
      const body = await req.json() as { lock_id?: string; specialist_id?: string };
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
    } catch (error) {
      console.error('Error releasing lock:', error);
      return new Response(JSON.stringify({ error: 'Failed to release lock' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  
  router.get('/api/v1/locks', async (req: Request) => {
    try {
      const locks = lockOps.getAll();
      return new Response(JSON.stringify({ locks }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error listing locks:', error);
      return new Response(JSON.stringify({ error: 'Failed to list locks' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });
}
