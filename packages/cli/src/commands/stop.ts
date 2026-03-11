/**
 * Fleet Stop Command
 * 
 * Stop FleetTools services gracefully
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { 
  loadProjectConfig, 
  isFleetProject
} from '@fleettools/shared';
import { 
  ensureRuntimeDirectories,
  readServiceState,
  removeServiceState,
  isPidAlive,
  checkHealth,
  acquireRunLock,
  releaseRunLock,
  stopService,
  type ServiceState
} from '@fleettools/shared';

export function registerStopCommand(program: Command): void {
  program
    .command('stop')
    .description('Stop FleetTools services')
    .option('--services <services>', 'Specific services to stop (comma-separated)')
    .option('--force', 'Force stop without waiting for graceful shutdown')
    .option('--timeout <ms>', 'Timeout for graceful shutdown in milliseconds', '5000')
    .option('--json', 'Output in JSON format')
    .action(async (options: any) => {
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

        const projectRoot = process.cwd();
        const runtime = (config.fleet as any)?.runtime || 'consolidated';
        
        // Ensure runtime directories exist
        ensureRuntimeDirectories(projectRoot);
        
        // Acquire operation lock
        const lockResult = acquireRunLock(projectRoot);
        if (lockResult.locked) {
          console.log(chalk.yellow(`⚠️  Fleet operation already in progress (PID ${lockResult.pid}).`));
          process.exit(1);
        }

        // Determine services to stop
        let servicesToStop: Array<'api' | 'squawk'> = [];
        if (options.services) {
          servicesToStop = options.services.split(',').map((s: string) => s.trim() as 'api' | 'squawk');
        } else {
          if (runtime === 'consolidated') {
            servicesToStop = ['api'];
          } else {
            servicesToStop = ['api', 'squawk'];
          }
        }

        const stoppedServices: any[] = [];
        const errors: any[] = [];

        // Stop each service
        for (const serviceName of servicesToStop) {
          try {
            const result = await stopService(serviceName, projectRoot, parseInt(options.timeout), options.force);
            if (result.success) {
              stoppedServices.push(result.service);
            } else {
              errors.push({ service: serviceName, error: result.error });
            }
          } catch (error) {
            errors.push({ service: serviceName, error: error instanceof Error ? error.message : String(error) });
          }
        }

        // Release operation lock
        releaseRunLock(projectRoot);

        if (options.json) {
          console.log(JSON.stringify({
            stopped: stoppedServices,
            errors: errors,
            timestamp: new Date().toISOString()
          }, null, 2));
        } else {
          // Human-readable output
          if (stoppedServices.length > 0) {
            console.log(chalk.green(`✅ Stopped services: ${stoppedServices.map(s => s).join(', ')}`));
          }
          
          if (errors.length > 0) {
            console.log(chalk.red('❌ Failed to stop services:'));
            errors.forEach(err => {
              console.log(chalk.red(`  ${err.service}: ${err.error}`));
            });
          }
          
          if (stoppedServices.length === 0 && errors.length === 0) {
            console.log(chalk.yellow('⚠️  No services were running.'));
          }
        }

      } catch (error: any) {
        // Release lock on error
        try {
          releaseRunLock(process.cwd());
        } catch {}
        
        console.error(chalk.red('❌ Failed to stop services:'), error.message);
        if (process.argv.includes('--verbose')) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
}