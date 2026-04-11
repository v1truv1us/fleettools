import { HarnessRegistry, Orchestrator, SoloAdapter, resolveHarnessRoute } from '@fleettools/core';
import { findProjectRoot, loadRoutingConfig } from '@fleettools/shared';

function jsonResponse(data: unknown, headers: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function readTaskRef(task: Record<string, unknown>, taskId: string) {
  return {
    taskId,
    title: String(task.title ?? ''),
    description: typeof task.description === 'string' ? task.description : undefined,
    type: typeof task.type === 'string' ? task.type : undefined,
    priority: typeof task.priority === 'string' ? task.priority : undefined,
    priorityValue: typeof task.priority_value === 'number' ? task.priority_value : undefined,
    labels: Array.isArray(task.labels) ? task.labels.map(value => String(value)) : [],
    status: typeof task.status === 'string' ? task.status : undefined,
    affectedFiles: Array.isArray(task.affected_files) ? task.affected_files.map(value => String(value)) : [],
  };
}

export function registerOrchestrationRoutes(router: any, headers: Record<string, string>): void {
  const projectRoot = findProjectRoot(process.cwd());

  router.get('/api/v1/orchestration/tasks', async (req: Request) => {
    try {
      const url = new URL(req.url);
      const limit = Number(url.searchParams.get('limit') ?? '20');
      const solo = new SoloAdapter({ cwd: projectRoot });
      const tasks = await solo.listAvailableTasks(limit);
      return jsonResponse({ tasks }, headers);
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, headers, 500);
    }
  });

  router.get('/api/v1/orchestration/tasks/:id/route', async (_req: Request, params: { id: string }) => {
    try {
      const solo = new SoloAdapter({ cwd: projectRoot });
      const task = await solo.showTask(params.id);
      const routingConfig = loadRoutingConfig(projectRoot);
      const decision = resolveHarnessRoute(readTaskRef(task, params.id), routingConfig);
      return jsonResponse({ task: readTaskRef(task, params.id), decision }, headers);
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, headers, 500);
    }
  });

  router.get('/api/v1/orchestration/harnesses', async () => {
    try {
      const registry = new HarnessRegistry();
      const harnesses = await registry.getAvailability();
      return jsonResponse({ harnesses }, headers);
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, headers, 500);
    }
  });

  router.get('/api/v1/orchestration/runs', async () => {
    try {
      const orchestrator = new Orchestrator({
        solo: new SoloAdapter({ cwd: projectRoot }),
        routingConfig: loadRoutingConfig(projectRoot),
        projectRoot,
      });
      return jsonResponse({ runs: orchestrator.listRuns() }, headers);
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, headers, 500);
    }
  });

  router.post('/api/v1/orchestration/runs', async (req: Request) => {
    try {
      const body = await req.json() as { taskId?: string; harness?: 'claude-code' | 'opencode' | 'codex' };
      if (!body.taskId) {
        return jsonResponse({ error: 'taskId is required' }, headers, 400);
      }

      const orchestrator = new Orchestrator({
        solo: new SoloAdapter({ cwd: projectRoot }),
        routingConfig: loadRoutingConfig(projectRoot),
        projectRoot,
      });
      const run = await orchestrator.runTask(body.taskId, { harnessOverride: body.harness });
      return jsonResponse({ run }, headers, 201);
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, headers, 500);
    }
  });
}
