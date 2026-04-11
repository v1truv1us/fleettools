import { Command } from 'commander';
import chalk from 'chalk';
import { SoloAdapter } from '@fleettools/core';
import { findProjectRoot } from '@fleettools/shared';

export function registerTaskCommands(program: Command): void {
  const tasks = program.command('tasks').description('Inspect Solo-backed orchestration tasks');

  tasks
    .command('list')
    .description('List available Solo tasks')
    .option('--limit <number>', 'Maximum number of tasks to return', '20')
    .option('--json', 'Output in JSON format')
    .action(async (options: { limit: string; json?: boolean }) => {
      const adapter = new SoloAdapter({ cwd: findProjectRoot(process.cwd()) });
      const tasks = await adapter.listAvailableTasks(Number(options.limit));

      if (options.json) {
        console.log(JSON.stringify({ tasks }, null, 2));
        return;
      }

      if (tasks.length === 0) {
        console.log(chalk.yellow('No available Solo tasks found.'));
        return;
      }

      console.log(chalk.blue.bold('Available Solo Tasks'));
      for (const task of tasks) {
        console.log(`- ${task.taskId}: ${task.title} ${chalk.gray(`(${task.priority ?? 'medium'})`)}`);
      }
    });

  tasks
    .command('show <taskId>')
    .description('Show details for a Solo task')
    .option('--json', 'Output in JSON format')
    .action(async (taskId: string, options: { json?: boolean }) => {
      const adapter = new SoloAdapter({ cwd: findProjectRoot(process.cwd()) });
      const task = await adapter.showTask(taskId);

      if (options.json) {
        console.log(JSON.stringify({ task }, null, 2));
        return;
      }

      console.log(chalk.blue.bold(`Task ${taskId}`));
      console.log(`Title: ${String(task.title ?? '')}`);
      console.log(`Status: ${String(task.status ?? 'unknown')}`);
      if (typeof task.priority === 'string') {
        console.log(`Priority: ${task.priority}`);
      }
      if (typeof task.description === 'string' && task.description.length > 0) {
        console.log(`Description: ${task.description}`);
      }
    });
}
