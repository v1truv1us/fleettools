/**
 * Mission Management API Routes for FleetTools
 *
 * REST endpoints for mission lifecycle management
 * Integrates with ProgressTracker for real-time tracking
 */
export function registerMissionRoutes(app, progressTracker) {
    // POST /api/v1/missions - Create new mission
    app.post('/api/v1/missions', async (request) => {
        try {
            const body = await request.json();
            const { title, description, tasks, metadata } = body;
            // Validate required fields
            if (!title || typeof title !== 'string' || title.trim().length === 0) {
                return new Response(JSON.stringify({ error: 'Title is required and must be a non-empty string' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            if (title.length > 200) {
                return new Response(JSON.stringify({ error: 'Title must be 200 characters or less' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            // Create mission
            const missionId = await progressTracker.startMission({
                title: title.trim(),
                description: description?.trim() || '',
                tasks: tasks || [],
                metadata: metadata || {},
                status: 'planned'
            });
            return new Response(JSON.stringify({
                success: true,
                data: { missionId, message: 'Mission created successfully' }
            }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('Mission creation error:', error);
            return new Response(JSON.stringify({ error: 'Failed to create mission' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    });
    // GET /api/v1/missions - List all missions
    app.get('/api/v1/missions', async (request) => {
        try {
            const url = new URL(request.url);
            const status = url.searchParams.get('status');
            const missions = await progressTracker.getMissions(status);
            const metrics = await progressTracker.getProgressMetrics();
            return new Response(JSON.stringify({
                success: true,
                data: { missions, metrics }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('Mission list error:', error);
            return new Response(JSON.stringify({ error: 'Failed to retrieve missions' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    });
    // GET /api/v1/missions/:id - Get specific mission
    app.get('/api/v1/missions/:id', async (request, params) => {
        try {
            const { id } = params;
            if (!id || id.trim() === '') {
                return new Response(JSON.stringify({ error: 'Mission ID is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            const mission = await progressTracker.getMission(id.trim());
            if (!mission) {
                return new Response(JSON.stringify({ error: 'Mission not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
            }
            // Get progress history for this mission
            const progressHistory = await progressTracker.getProgressHistory(id.trim(), 50);
            return new Response(JSON.stringify({
                success: true,
                data: { mission, progressHistory }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('Mission get error:', error);
            return new Response(JSON.stringify({ error: 'Failed to retrieve mission' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    });
    // PATCH /api/v1/missions/:id/progress - Update mission progress
    app.patch('/api/v1/missions/:id/progress', async (request, params) => {
        try {
            const { id } = params;
            const body = await request.json();
            const { agentId, progress, message } = body;
            // Validate required fields
            if (!id || id.trim() === '') {
                return new Response(JSON.stringify({ error: 'Mission ID is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            if (!agentId || typeof agentId !== 'string' || agentId.trim().length === 0) {
                return new Response(JSON.stringify({ error: 'Agent ID is required and must be a non-empty string' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            if (typeof progress !== 'number' || progress < 0 || progress > 100) {
                return new Response(JSON.stringify({ error: 'Progress must be a number between 0 and 100' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            // Update progress
            await progressTracker.updateProgress({
                missionId: id.trim(),
                agentId: agentId.trim(),
                progress: Math.round(progress * 100) / 100, // Round to 2 decimal places
                message: message?.trim() || undefined,
                timestamp: new Date().toISOString()
            });
            // Get updated mission
            const updatedMission = await progressTracker.getMission(id.trim());
            return new Response(JSON.stringify({
                success: true,
                data: {
                    mission: updatedMission,
                    message: 'Progress updated successfully'
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('Progress update error:', error);
            return new Response(JSON.stringify({ error: 'Failed to update progress' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    });
    // GET /api/v1/metrics - Get system metrics
    app.get('/api/v1/metrics', async (request) => {
        try {
            const metrics = await progressTracker.getProgressMetrics();
            return new Response(JSON.stringify({
                success: true,
                data: { metrics }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        catch (error) {
            console.error('Metrics error:', error);
            return new Response(JSON.stringify({ error: 'Failed to retrieve metrics' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    });
    console.log('✓ Mission management routes registered');
}
//# sourceMappingURL=missions.js.map