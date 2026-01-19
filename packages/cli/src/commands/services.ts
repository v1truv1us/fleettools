/**
 * Fleet Services Command
 * 
 * Manage individual FleetTools services
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { 
  loadProjectConfig, 
  isFleetProject
} from '@fleettools/shared';

/**
 * Get service entry point path based on deployment mode
 */
function getServicePath(service: 'squawk' | 'api', mode: string, cwd: string): string {
  if (mode === 'local') {
    return join(cwd, service === 'squawk' ? 'squawk' : 'server/api', 'dist', 'index.js');
  }
  return join(cwd, 'node_modules', `@fleettools/${service === 'squawk' ? 'squawk' : 'server'}`, 'dist', 'index.js');
}

export function registerServiceCommands(program: Command): void {
  const servicesCmd = program
    .command('services')
    .description('Manage FleetTools services');

  servicesCmd
    .command('start [service]')
    .description('Start a specific service (squawk, api, postgres) or all')
    .action(async (serviceName: string) => {
      try {
        if (!isFleetProject()) {
          console.error(chalk.red('❌ Not in a FleetTools project.'));
          process.exit(1);
        }

        const config = loadProjectConfig();
        if (!config) {
          console.error(chalk.red('❌ Failed to load project configuration.'));
          process.exit(1);
        }

        const mode = config.fleet?.mode || 'local';
        const runtime = config.fleet?.runtime || 'consolidated';
        const services = serviceName ? [serviceName] : 
          config.services.squawk.enabled ? ['squawk'] : [];

        if (services.length === 0) {
          console.log(chalk.yellow('⚠️  No services enabled in configuration.'));
          return;
        }

        for (const service of services) {
          switch (service) {
            case 'squawk':
              if (!config.services.squawk.enabled) {
                console.log(chalk.yellow(`⚠️  Squawk service is disabled in configuration.`));
                continue;
              }
              if (runtime === 'consolidated') {
                console.log(chalk.yellow(`⚠️  Standalone Squawk is not used in consolidated runtime.`));
                console.log(chalk.gray(`Tip: Use 'fleet start' (consolidated mode) to run Squawk embedded in API.`));
                continue;
              }
              console.log(chalk.blue('Starting Squawk service...'));
              const squawkPath = getServicePath('squawk', mode, process.cwd());
              spawn('bun', [squawkPath], { 
                stdio: 'inherit',
                env: { ...process.env, SQUAWK_PORT: config.services.squawk.port.toString() }
              });
              break;

            case 'api':
              if (!config.services.api.enabled) {
                console.log(chalk.yellow(`⚠️  API service is disabled in configuration.`));
                continue;
              }
              console.log(chalk.blue('Starting API service...'));
              const apiPath = getServicePath('api', mode, process.cwd());
              spawn('bun', [apiPath], { 
                stdio: 'inherit',
                env: { ...process.env, PORT: config.services.api.port.toString() }
              });
              break;

            default:
              console.error(chalk.red(`❌ Unknown service: ${service}`));
              console.log(chalk.yellow('Available services: squawk, api, postgres'));
          }
        }

      } catch (error: any) {
        console.error(chalk.red('❌ Failed to start service:'), error.message);
      }
    });

  servicesCmd
    .command('stop [service]')
    .description('Stop a specific service or all')
    .action(async (serviceName: string) => {
      try {
        console.log(chalk.yellow('⚠️  Service stopping not implemented yet.'));
        console.log(chalk.gray('Use Ctrl+C to stop running services, or use fleet stop command.'));
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to stop service:'), error.message);
      }
    });

  servicesCmd
    .command('restart [service]')
    .description('Restart a specific service or all')
    .action(async (serviceName: string) => {
      try {
        console.log(chalk.yellow('⚠️  Service restart not implemented yet.'));
        console.log(chalk.gray('Use fleet stop && fleet start to restart services.'));
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to restart service:'), error.message);
      }
    });

  servicesCmd
    .command('logs [service]')
    .description('Show logs for a specific service')
    .option('-f, --follow', 'Follow log output')
    .action(async (serviceName: string, options: any) => {
      try {
        console.log(chalk.yellow('⚠️  Service logs not implemented yet.'));
        console.log(chalk.gray('Check individual service logs in .fleet/logs/ directory.'));
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to show logs:'), error.message);
      }
    });
}
