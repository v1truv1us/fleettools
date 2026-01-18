import { mailboxOps, lockOps } from '@fleettools/squawk';
export function registerCoordinatorRoutes(router, headers) {
    router.get('/api/v1/coordinator/status', async (req) => {
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
            return new Response(JSON.stringify({ error: 'Failed to get status' }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }
    });
}
//# sourceMappingURL=coordinator.js.map