// @ts-nocheck
// Squawk Mailbox routes
import { mailboxOps, eventOps } from '../../../../squawk/src/db/index.js';

export function registerMailboxRoutes(router: any, headers: Record<string, string>) {
  // POST /api/v1/mailbox/append - Append events to mailbox
  router.post('/api/v1/mailbox/append', async (req: Request) => {
    try {
      const body = await req.json();
      const { stream_id, events } = body;

      if (!stream_id || !Array.isArray(events)) {
        return new Response(JSON.stringify({ error: 'stream_id and events array are required' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      // Ensure mailbox exists
      if (!mailboxOps.exists(stream_id)) {
        mailboxOps.create(stream_id);
      }

      // Append events
      const formattedEvents = events.map((e: any) => ({
        type: e.type,
        stream_id,
        data: JSON.stringify(e.data),
        occurred_at: new Date().toISOString(),
        causation_id: e.causation_id || null,
        metadata: e.metadata ? JSON.stringify(e.metadata) : null,
      }));

      const inserted = eventOps.append(stream_id, formattedEvents);
      const mailbox = mailboxOps.getById(stream_id);
      const mailboxEvents = eventOps.getByMailbox(stream_id);

      return new Response(JSON.stringify({
        mailbox: { ...mailbox, events: mailboxEvents },
        inserted: inserted.length
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error appending to mailbox:', error);
      return new Response(JSON.stringify({ error: 'Failed to append to mailbox' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // GET /api/v1/mailbox/:streamId - Get mailbox contents
  router.get('/api/v1/mailbox/:streamId', async (req: Request, params: { streamId: string }) => {
    try {
      const streamId = params.streamId;
      const mailbox = mailboxOps.getById(streamId);

      if (!mailbox) {
        return new Response(JSON.stringify({ error: 'Mailbox not found' }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const events = eventOps.getByMailbox(streamId);
      return new Response(JSON.stringify({ mailbox: { ...mailbox, events } }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error getting mailbox:', error);
      return new Response(JSON.stringify({ error: 'Failed to get mailbox' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });
}
