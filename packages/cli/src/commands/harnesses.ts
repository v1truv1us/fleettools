import { Command } from 'commander';
import chalk from 'chalk';
import { HarnessRegistry } from '@fleettools/core';

export function registerHarnessCommands(program: Command): void {
  const harnesses = program.command('harnesses').description('Inspect configured orchestration harnesses');

  harnesses
    .command('status')
    .description('Show harness availability')
    .option('--json', 'Output in JSON format')
    .action(async (options: { json?: boolean }) => {
      const registry = new HarnessRegistry();
      const availability = await registry.getAvailability();

      if (options.json) {
        console.log(JSON.stringify({ harnesses: availability }, null, 2));
        return;
      }

      console.log(chalk.blue.bold('Harness Availability'));
      for (const entry of availability) {
        const status = entry.status === 'available' ? chalk.green('available') : chalk.red('unavailable');
        console.log(`- ${entry.harness}: ${status}${entry.reason ? ` (${entry.reason})` : ''}`);
      }
    });
}
