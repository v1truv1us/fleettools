/**
 * Learning System API Routes
 *
 * Endpoints for managing learned patterns and extracting patterns from missions
 */

import PatternStorage from './pattern-storage.js';

const patternStorage = new PatternStorage();

export function registerLearningRoutes(router: any, headers: Record<string, string>): void {
  // List all patterns
  router.get('/api/v1/patterns', async (request: Request) => {
    try {
      const url = new URL(request.url);
      const patternType = url.searchParams.get('type');

      const patterns = await patternStorage.listPatterns({
        pattern_type: patternType || undefined
      });

      return new Response(JSON.stringify({
        success: true,
        data: patterns,
        count: patterns.length
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to list patterns',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  });

  // Get specific pattern
  router.get('/api/v1/patterns/:id', async (request: Request, params: { id: string }) => {
    try {
      const pattern = await patternStorage.getPattern(params.id);

      if (!pattern) {
        return new Response(JSON.stringify({
          error: 'Pattern not found'
        }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: pattern
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to get pattern',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  });

  // Create new pattern
  router.post('/api/v1/patterns', async (request: Request) => {
    try {
      const body = await request.json() as any;

      const patternId = await patternStorage.storePattern({
        pattern_type: body.pattern_type || 'general',
        description: body.description,
        task_sequence: body.task_sequence || [],
        success_rate: body.success_rate || 0,
        usage_count: body.usage_count || 0,
        effectiveness_score: body.effectiveness_score || 0,
        version: body.version || 1
      });

      const pattern = await patternStorage.getPattern(patternId);

      return new Response(JSON.stringify({
        success: true,
        data: pattern,
        message: 'Pattern created successfully'
      }), {
        status: 201,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to create pattern',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  });

  // Delete pattern
  router.delete('/api/v1/patterns/:id', async (request: Request, params: { id: string }) => {
    try {
      const success = await patternStorage.getPattern(params.id);

      if (!success) {
        return new Response(JSON.stringify({
          error: 'Pattern not found'
        }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }

      await patternStorage.updatePattern(params.id, { usage_count: -1 });

      return new Response(JSON.stringify({
        success: true,
        message: 'Pattern deleted successfully'
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to delete pattern',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  });

  // Get learning system metrics
  router.get('/api/v1/learning/metrics', async (request: Request) => {
    try {
      const patterns = await patternStorage.listPatterns();

      const metrics = {
        total_patterns: patterns.length,
        patterns_by_type: {} as Record<string, number>,
        average_effectiveness: patterns.length > 0
          ? patterns.reduce((sum, p) => sum + p.effectiveness_score, 0) / patterns.length
          : 0,
        total_usage: patterns.reduce((sum, p) => sum + p.usage_count, 0)
      };

      for (const pattern of patterns) {
        metrics.patterns_by_type[pattern.pattern_type] = (metrics.patterns_by_type[pattern.pattern_type] || 0) + 1;
      }

      return new Response(JSON.stringify({
        success: true,
        data: metrics
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to get metrics',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  });
}
