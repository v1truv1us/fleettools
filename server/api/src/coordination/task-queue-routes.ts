/**
 * Task Queue Routes for FleetTools Coordination System
 * 
 * Provides REST API endpoints for task queue management
 */

import { TaskQueue, TaskStatus } from './task-queue.js';

const taskQueue = new TaskQueue({
  dbPath: '.flightline/tasks.db'
});

export function registerTaskQueueRoutes(router: any, headers: Record<string, string>): void {
  // Create a new task
  router.post('/api/v1/tasks', async (request: Request) => {
    try {
      const body = await request.json() as any;
      
      const taskId = await taskQueue.enqueue({
        type: body.type,
        title: body.title,
        description: body.description,
        status: TaskStatus.PENDING,
        priority: body.priority || 'medium',
        missionId: body.missionId,
        dependencies: body.dependencies,
        metadata: body.metadata || {}
      });

      const task = await taskQueue.getTask(taskId);

      return new Response(JSON.stringify({
        success: true,
        data: task
      }), {
        status: 201,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to create task',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Get all tasks
  router.get('/api/v1/tasks', async (request: Request) => {
    try {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') as TaskStatus;
      const missionId = url.searchParams.get('missionId');
      const assignedTo = url.searchParams.get('assignedTo');
      
      let tasks: any[] = [];
      
      if (status) {
        tasks = await taskQueue.getTasksByStatus(status);
      } else if (missionId) {
        tasks = await taskQueue.getTasksByMission(missionId);
      } else if (assignedTo) {
        tasks = await taskQueue.getTasksByAgent(assignedTo);
      } else {
        // Get all tasks by checking all statuses
        const allStatuses = Object.values(TaskStatus);
        const allTasksPromises = allStatuses.map(s => taskQueue.getTasksByStatus(s));
        const allTasksArrays = await Promise.all(allTasksPromises);
        tasks = allTasksArrays.flat();
      }

      return new Response(JSON.stringify({
        success: true,
        data: tasks,
        count: tasks.length
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to get tasks',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Get specific task
  router.get('/api/v1/tasks/:id', async (request: Request, params: { id: string }) => {
    try {
      const task = await taskQueue.getTask(params.id);
      
      if (!task) {
        return new Response(JSON.stringify({
          error: 'Task not found'
        }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: task
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to get task',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Mark task as in progress
  router.patch('/api/v1/tasks/:id/start', async (request: Request, params: { id: string }) => {
    try {
      await taskQueue.markAsInProgress(params.id);
      
      const task = await taskQueue.getTask(params.id);
      
      if (!task) {
        return new Response(JSON.stringify({
          error: 'Task not found'
        }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: task
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to start task',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Complete a task
  router.patch('/api/v1/tasks/:id/complete', async (request: Request, params: { id: string }) => {
    try {
      const body = await request.json() as any;
      
      await taskQueue.complete(params.id, body.result);
      
      const task = await taskQueue.getTask(params.id);
      
      return new Response(JSON.stringify({
        success: true,
        data: task
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to complete task',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Fail a task
  router.patch('/api/v1/tasks/:id/fail', async (request: Request, params: { id: string }) => {
    try {
      const body = await request.json() as any;
      
      await taskQueue.fail(params.id, body.error || 'Task failed');
      
      const task = await taskQueue.getTask(params.id);
      
      return new Response(JSON.stringify({
        success: true,
        data: task
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to fail task',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Get next available tasks for agent
  router.get('/api/v1/tasks/next/:agentType?', async (request: Request, params?: { agentType?: string }) => {
    try {
      const agentType = params?.agentType;
      const tasks = await taskQueue.dequeue(agentType, 5);

      return new Response(JSON.stringify({
        success: true,
        data: tasks,
        count: tasks.length
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to get next tasks',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Get task statistics
  router.get('/api/v1/tasks/stats', async (request: Request) => {
    try {
      const stats = await taskQueue.getStats();

      return new Response(JSON.stringify({
        success: true,
        data: stats
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to get task statistics',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  // Retry failed tasks
  router.post('/api/v1/tasks/retry-failed', async (request: Request) => {
    try {
      const retriedCount = await taskQueue.retryFailedTasks();

      return new Response(JSON.stringify({
        success: true,
        message: `Retried ${retriedCount} failed tasks`,
        data: { retriedCount }
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Failed to retry tasks',
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });
}