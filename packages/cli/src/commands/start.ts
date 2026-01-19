/**
 * Fleet Start Command
 * 
 * Start FleetTools services
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import {
  loadProjectConfig,
  isFleetProject,
  getRuntimeInfo,
  sleep
} from '@fleettools/shared';
import { createServer } from 'node:net';
import { promisify } from 'node:util';

/**
 * Find an available port starting from the given port
 */
async function findAvailablePort(startPort: number, maxAttempts = 100): Promise<number> {
  const server = createServer();
  
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => {
          server.close(() => resolve());
        });
      });
      return port;
    } catch (error: any) {
      if (error.code !== 'EADDRINUSE') {
        throw error;
      }
      // Port in use, try next
    }
  }
  
  throw new Error(`No available ports found starting from ${startPort} after ${maxAttempts} attempts`);
}

/**
 * Get service entry point path based on deployment mode
 */
function getServicePath(service: 'squawk' | 'api', mode: string, cwd: string): string {
  if (mode === 'local') {
    return join(cwd, service === 'squawk' ? 'squawk' : 'server/api', 'dist', 'index.js');
  }
  return join(cwd, 'node_modules', `@fleettools/${service === 'squawk' ? 'squawk' : 'server'}`, 'dist', 'index.js');
}

export function registerStartCommand(program: Command): void {
  program
    .command('start')
    .description('Start FleetTools services')
    .option('-s, --services <services>', 'Specific services to start (comma-separated)')
    .option('-w, --watch', 'Watch for changes and restart')
    .option('-d, --daemon', 'Run in background')
    .action(async (options: any) => {
      try {
        console.log(chalk.blue.bold('🚀 Starting FleetTools Services'));
        console.log(chalk.gray('═'.repeat(40)));
        console.log();

        // Check if we're in a FleetTools project
        if (!isFleetProject()) {
          console.error(chalk.red('❌ Not a FleetTools project.'));
          console.log(chalk.yellow('Run: fleet init to initialize a new project.'));
          process.exit(1);
        }

        const config = loadProjectConfig();
        if (!config) {
          console.error(chalk.red('❌ Failed to load project configuration.'));
          process.exit(1);
        }

        const runtimeInfo = getRuntimeInfo();
        const mode = config.fleet?.mode || 'local';
        console.log();

        // Determine runtime mode
        const runtime = config.fleet?.runtime || 'consolidated';
        console.log(chalk.blue(`Runtime mode: ${runtime}`));

        // Parse services to start
        let servicesToStart = runtime === 'consolidated' ? ['api'] : ['squawk', 'api'];
        if (options.services) {
          servicesToStart = options.services.split(',').map((s: string) => s.trim());
        }

        // Determine services based on config, request, and runtime mode
        const enabledServices: string[] = [];
        const processes: any[] = [];

        // In consolidated mode, ignore standalone squawk start requests
        if (runtime === 'consolidated' && servicesToStart.includes('squawk')) {
          console.log(chalk.yellow('Consolidated runtime: Squawk is embedded in API; ignoring standalone squawk start request.'));
        }

        if (runtime === 'split' && servicesToStart.includes('squawk') && config.services.squawk.enabled) {
          enabledServices.push('squawk');

          console.log(chalk.blue('Starting Squawk coordination service...'));
          const squawkPort = await findAvailablePort(config.services.squawk.port);
          const squawkPath = getServicePath('squawk', mode, process.cwd());
          const squawkProcess = spawn('bun', [squawkPath], {
            stdio: options.daemon ? 'ignore' : 'inherit',
            detached: options.daemon,
            env: {
              ...process.env,
              SQUAWK_PORT: squawkPort.toString()
            }
          });

          if (options.daemon) {
            squawkProcess.unref();
          }

          processes.push({ name: 'squawk', process: squawkProcess, servicePath: squawkPath });
          console.log(chalk.gray(`Squawk listening on port ${squawkPort}`));

          if (!options.daemon) {
            await sleep(1000); // Give it time to start
          }
        }

        if (servicesToStart.includes('api') && config.services.api.enabled) {
          enabledServices.push('api');

          let apiPort: number;
          let squawkUrl: string;
          let squawkPort: number;

          if (runtime === 'consolidated') {
            apiPort = await findAvailablePort(config.services.api.port);
            squawkUrl = `http://localhost:${apiPort}`;
            console.log(chalk.blue('Starting FleetTools Consolidated API server...'));
          console.log(chalk.gray('Consolidated runtime: Squawk runs inside API'));
          } else {
            // Split mode
            squawkPort = await findAvailablePort(config.services.squawk.port);
            apiPort = await findAvailablePort(config.services.api.port);
            squawkUrl = `http://localhost:${squawkPort}`;
            console.log(chalk.blue('Starting API server...'));
          }

          const apiPath = getServicePath('api', mode, process.cwd());
          const apiProcess = spawn('bun', [apiPath], {
            stdio: options.daemon ? 'ignore' : 'inherit',
            detached: options.daemon,
            env: {
              ...process.env,
              PORT: apiPort.toString(),
              SQUAWK_URL: squawkUrl
            }
          });

          if (options.daemon) {
            apiProcess.unref();
          }

          processes.push({ name: 'api', process: apiProcess, servicePath: apiPath });
          console.log(chalk.gray(`API listening on port ${apiPort}`));

          if (!options.daemon) {
            await sleep(1000); // Give it time to start
          }
        }

        console.log();
        if (enabledServices.length > 0) {
          console.log(chalk.green.bold(`✅ Started services: ${enabledServices.join(', ')}`));
          
          if (!options.daemon) {
            console.log(chalk.gray('Services are running. Press Ctrl+C to stop.'));
            
            // Handle graceful shutdown
            const handleShutdown = (signal: string) => {
              console.log(chalk.yellow(`\n🛑 Received ${signal}, stopping services...`));
              
              processes.forEach(({ process, name }) => {
                if (process && !process.killed) {
                  console.log(chalk.blue(`Stopping ${name}...`));
                  process.kill('SIGTERM');
                }
              });
              
              setTimeout(() => {
                process.exit(0);
              }, 2000);
            };
            
            process.on('SIGINT', () => handleShutdown('SIGINT'));
            process.on('SIGTERM', () => handleShutdown('SIGTERM'));
            
            // Keep the process alive
            if (options.watch) {
              console.log(chalk.blue('👀 Watching for changes...'));
            }
          } else {
            console.log(chalk.gray('Services are running in the background.'));
            console.log(chalk.yellow('Use: fleet status to check service status'));
            console.log(chalk.yellow('Use: fleet stop to stop services'));
          }
        } else {
          console.log(chalk.yellow('⚠️  No services enabled in configuration.'));
        }

      } catch (error: any) {
        console.error(chalk.red('❌ Failed to start services:'), error.message);
        if (process.argv.includes('--verbose')) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
}