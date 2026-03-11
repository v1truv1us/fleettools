import { mailboxOps, eventOps } from '@fleettools/squawk';
export function registerMailboxRoutes(router, headers) {
    router.post('/api/v1/mailbox/append', async (req) => {
        try {
            const body = await req.json();
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
            return new Response(JSON.stringify({ error: 'Failed to append to mailbox' }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
    });
    router.get('/api/v1/mailbox/:streamId', async (req, params) => {
        try {
            const streamId = params.streamId;
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
    });
}
//# sourceMappingURL=mailbox.js.map