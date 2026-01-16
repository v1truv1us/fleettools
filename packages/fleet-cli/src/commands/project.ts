/**
 * Fleet Project Commands
 * 
 * Project-specific commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { 
  loadProjectConfig, 
  isFleetProject
} from '@fleettools/fleet-shared';

export function registerProjectCommands(program: Command): void {
  program
    .command('stop')
    .description('Stop all FleetTools services')
    .action(async () => {
      try {
        if (!isFleetProject()) {
          console.error(chalk.red('❌ Not in a FleetTools project.'));
          console.log(chalk.yellow('Use fleet services stop to manage services globally.'));
          return;
        }

        console.log(chalk.blue('🛑 Stopping FleetTools services...'));
        console.log(chalk.yellow('⚠️  Service stopping not implemented yet.'));
        console.log(chalk.gray('Use Ctrl+C to stop running services.'));
        
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to stop services:'), error.message);
      }
    });

  program
    .command('restart')
    .description('Restart all FleetTools services')
    .action(async () => {
      try {
        if (!isFleetProject()) {
          console.error(chalk.red('❌ Not in a FleetTools project.'));
          return;
        }

        console.log(chalk.blue('🔄 Restarting FleetTools services...'));
        console.log(chalk.yellow('⚠️  Service restart not implemented yet.'));
        console.log(chalk.gray('Use fleet stop && fleet start to restart services.'));
        
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to restart services:'), error.message);
      }
    });

  program
    .command('logs')
    .description('Show FleetTools logs')
    .option('-f, --follow', 'Follow log output')
    .option('-s, --service <service>', 'Show logs for specific service')
    .action(async (options: any) => {
      try {
        if (!isFleetProject()) {
          console.error(chalk.red('❌ Not in a FleetTools project.'));
          return;
        }

        console.log(chalk.blue('📋 FleetTools Logs'));
        console.log(chalk.yellow('⚠️  Service logs not implemented yet.'));
        console.log(chalk.gray('Check .fleet/logs/ directory for log files.'));
        
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to show logs:'), error.message);
      }
    });

  program
    .command('clean')
    .description('Clean FleetTools data and caches')
    .option('--services', 'Clean service data only')
    .option('--logs', 'Clean logs only')
    .option('--all', 'Clean all data (including configuration)')
    .action(async (options: any) => {
      try {
        if (!isFleetProject()) {
          console.error(chalk.red('❌ Not in a FleetTools project.'));
          return;
        }

        console.log(chalk.blue('🧹 Cleaning FleetTools data...'));
        console.log(chalk.yellow('⚠️  Data cleaning not implemented yet.'));
        console.log(chalk.gray('Manual cleanup: Remove .fleet/ directory if needed.'));
        
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to clean data:'), error.message);
      }
    });
}