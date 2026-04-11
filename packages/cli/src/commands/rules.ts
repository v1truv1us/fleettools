import { Command } from 'commander';
import chalk from 'chalk';
import { findRoutingConfigPath, loadRoutingConfig } from '@fleettools/shared';

export function registerRuleCommands(program: Command): void {
  const rules = program.command('rules').description('Manage orchestration routing rules');

  rules
    .command('validate')
    .description('Validate fleet.routing.yaml')
    .option('--json', 'Output in JSON format')
    .action((options: { json?: boolean }) => {
      const filePath = findRoutingConfigPath();
      const config = loadRoutingConfig();

      if (options.json) {
        console.log(JSON.stringify({ valid: true, filePath, config }, null, 2));
        return;
      }

      console.log(chalk.green('Routing config is valid.'));
      console.log(`Source: ${filePath ?? 'defaults'}`);
      console.log(`Default harness: ${config.defaults.harness}`);
      console.log(`Rules: ${config.rules.length}`);
    });
}
