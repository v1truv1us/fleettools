/**
 * Fleet Config Command
 * 
 * Manage FleetTools configuration
 */

import { Command } from 'commander';
import prompt from 'inquirer';
import chalk from 'chalk';
import { 
  loadGlobalConfig, 
  saveGlobalConfig, 
  loadProjectConfig, 
  saveProjectConfig,
  isFleetProject 
} from '@fleettools/fleet-shared';

export function registerConfigCommand(program: Command): void {
  const configCmd = program
    .command('config')
    .description('Manage FleetTools configuration');

  // List configuration
  configCmd
    .command('list')
    .description('Show current configuration')
    .option('--global', 'Show global configuration')
    .option('--project', 'Show project configuration (default)')
    .action((options: any) => {
      try {
        if (options.global) {
          const config = loadGlobalConfig();
          console.log(chalk.blue.bold('Global Configuration'));
          console.log(chalk.gray('═'.repeat(30)));
          console.log(JSON.stringify(config, null, 2));
        } else {
          if (!isFleetProject()) {
            console.error(chalk.red('❌ Not in a FleetTools project.'));
            console.log(chalk.yellow('Use --global to view global configuration.'));
            return;
          }
          
          const config = loadProjectConfig();
          if (!config) {
            console.error(chalk.red('❌ Failed to load project configuration.'));
            return;
          }
          
          console.log(chalk.blue.bold('Project Configuration'));
          console.log(chalk.gray('═'.repeat(30)));
          console.log(JSON.stringify(config, null, 2));
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to load configuration:'), error.message);
      }
    });

  // Set configuration values
  configCmd
    .command('set')
    .description('Set configuration values')
    .option('--global', 'Set global configuration')
    .argument('<key>', 'Configuration key (e.g., services.squawk.port)')
    .argument('<value>', 'Configuration value')
    .action(async (key: string, value: string, options: any) => {
      try {
        if (options.global) {
          const config = loadGlobalConfig();
          
          // Parse nested key and set value
          const keys = key.split('.');
          let current: any = config;
          
          for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
              current[keys[i]] = {};
            }
            current = current[keys[i]];
          }
          
          // Type conversion
          if (value === 'true') current[keys[keys.length - 1]] = true;
          else if (value === 'false') current[keys[keys.length - 1]] = false;
          else if (!isNaN(Number(value))) current[keys[keys.length - 1]] = Number(value);
          else current[keys[keys.length - 1]] = value;
          
          saveGlobalConfig(config);
          console.log(chalk.green(`✅ Set global config: ${key} = ${value}`));
        } else {
          if (!isFleetProject()) {
            console.error(chalk.red('❌ Not in a FleetTools project.'));
            console.log(chalk.yellow('Use --global to set global configuration.'));
            return;
          }
          
          const config = loadProjectConfig();
          if (!config) {
            console.error(chalk.red('❌ Failed to load project configuration.'));
            return;
          }
          
          // Parse nested key and set value
          const keys = key.split('.');
          let current: any = config;
          
          for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
              current[keys[i]] = {};
            }
            current = current[keys[i]];
          }
          
          // Type conversion
          if (value === 'true') current[keys[keys.length - 1]] = true;
          else if (value === 'false') current[keys[keys.length - 1]] = false;
          else if (!isNaN(Number(value))) current[keys[keys.length - 1]] = Number(value);
          else current[keys[keys.length - 1]] = value;
          
          saveProjectConfig(config);
          console.log(chalk.green(`✅ Set project config: ${key} = ${value}`));
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to set configuration:'), error.message);
      }
    });

  // Interactive configuration
  configCmd
      .command('edit')
      .description('Interactive configuration editor (simplified for now)')
      .option('--global', 'Edit global configuration')
      .action(async (options: any) => {
        try {
          console.log(chalk.yellow('⚠️  Interactive configuration editing not implemented yet.'));
          console.log(chalk.gray('Use fleet config set <key> <value> for now.'));
        } catch (error: any) {
          console.error(chalk.red('❌ Failed to edit configuration:'), error.message);
        }
      });
}