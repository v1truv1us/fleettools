/**
 * Task Decomposition API Routes
 *
 * POST /api/v1/tasks/decompose - Decompose mission into assignable tasks
 */

import { TaskDecomposer } from './task-decomposer.js';

const decomposer = new TaskDecomposer();

export function registerTaskDecompositionRoutes(
  router: any,
  headers: Record<string, string>
): void {
  router.post('/api/v1/tasks/decompose', async (req: Request) => {
    try {
      const body = await req.json() as {
        title?: string;
        description?: string;
        type?: string;
        metadata?: Record<string, any>;
      };
      const { title, description, type, metadata } = body;

      if (!title) {
        return new Response(JSON.stringify({
          error: 'Mission title is required'
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }

      const tasks = decomposer.decomposeMission({
        title,
        description: description || '',
        type,
        metadata
      });

       const tasksWithDuration = tasks.map(task => {
         const complexity = decomposer.calculateComplexity(task);
         const estimatedDuration = decomposer.estimateTaskDuration(complexity);
         return {
           ...task,
           estimatedDurationMinutes: estimatedDuration
         };
       });

      return new Response(JSON.stringify({
        success: true,
        data: {
          mission: { title, description, type },
          tasks: tasksWithDuration,
          totalTasks: tasksWithDuration.length,
          totalEstimatedMinutes: tasksWithDuration.reduce((sum, task) => sum + (task.estimatedDurationMinutes || 0), 0)
        }
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      console.error('Task decomposition error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to decompose task',
        message: error?.message || 'Unknown error'
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  });
}
