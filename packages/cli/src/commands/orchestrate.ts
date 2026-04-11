import { Command } from 'commander';
import chalk from 'chalk';
import { Orchestrator, resolveHarnessRoute, SoloAdapter } from '@fleettools/core';
import { findProjectRoot, loadRoutingConfig } from '@fleettools/shared';

export function registerOrchestrationCommands(program: Command): void {
  program
    .command('route <taskId>')
    .description('Preview which harness FleetTools would select for a Solo task')
    .option('--json', 'Output in JSON format')
    .action(async (taskId: string, options: { json?: boolean }) => {
      const projectRoot = findProjectRoot(process.cwd());
      const adapter = new SoloAdapter({ cwd: projectRoot });
      const task = await adapter.showTask(taskId);
      const config = loadRoutingConfig(projectRoot);
      const normalizedTask = {
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
      const decision = resolveHarnessRoute(normalizedTask, config);

      if (options.json) {
        console.log(JSON.stringify({ task: normalizedTask, decision }, null, 2));
        return;
      }

      console.log(chalk.blue.bold(`Route Preview for ${taskId}`));
      console.log(`Harness: ${decision.selection.harness}`);
      console.log(`Rule: ${decision.selection.ruleId}`);
      console.log(`Reason: ${decision.selection.reason}`);
      console.log(`Timeout: ${decision.timeoutMs}ms`);
    });

  program
    .command('run <taskId>')
    .description('Run a Solo task through the FleetTools orchestrator')
    .option('--harness <harness>', 'Override routing and force a specific harness')
    .option('--json', 'Output in JSON format')
    .action(async (taskId: string, options: { harness?: 'claude-code' | 'opencode' | 'codex'; json?: boolean }) => {
      const projectRoot = findProjectRoot(process.cwd());
      const orchestrator = new Orchestrator({
        solo: new SoloAdapter({ cwd: projectRoot }),
        routingConfig: loadRoutingConfig(projectRoot),
        projectRoot,
      });
      const result = await orchestrator.runTask(taskId, { harnessOverride: options.harness });

      if (options.json) {
        console.log(JSON.stringify({ run: result }, null, 2));
        return;
      }

      console.log(chalk.blue.bold(`Run ${result.runId}`));
      console.log(`Task: ${result.taskId}`);
      console.log(`Harness: ${result.harness}`);
      console.log(`Status: ${result.status}`);
      if (result.sessionId) {
        console.log(`Session: ${result.sessionId}`);
      }
      if (result.worktreePath) {
        console.log(`Worktree: ${result.worktreePath}`);
      }
      if (result.summary) {
        console.log(`Summary: ${result.summary}`);
      }
    });

  program
    .command('runs')
    .description('List local orchestration run projections')
    .option('--json', 'Output in JSON format')
    .action((options: { json?: boolean }) => {
      const projectRoot = findProjectRoot(process.cwd());
      const orchestrator = new Orchestrator({
        solo: new SoloAdapter({ cwd: projectRoot }),
        routingConfig: loadRoutingConfig(projectRoot),
        projectRoot,
      });
      const runs = orchestrator.listRuns();

      if (options.json) {
        console.log(JSON.stringify({ runs }, null, 2));
        return;
      }

      if (runs.length === 0) {
        console.log(chalk.yellow('No orchestration runs recorded yet.'));
        return;
      }

      console.log(chalk.blue.bold('Orchestration Runs'));
      for (const run of runs) {
        console.log(`- ${run.runId} ${chalk.gray(run.taskId)} ${run.harness} ${run.status}`);
      }
    });
}
