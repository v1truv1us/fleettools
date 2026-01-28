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
  findProjectRoot,
  getRuntimeInfo,
  sleep
} from '@fleettools/shared';
import {
  ensureRuntimeDirectories,
  writeServiceState,
  readServiceState,
  removeServiceState,
  isPidAlive,
  checkHealth,
  createServiceState,
  getLogFilePath,
  acquireRunLock,
  releaseRunLock,
  type ServiceState
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
    if (service === 'squawk') {
      return join(cwd, 'squawk', 'dist', 'bin.js');
    }
    return join(cwd, 'server/api', 'dist', 'index.js');
  }
  if (service === 'squawk') {
    return join(cwd, 'node_modules', '@fleettools/squawk', 'dist', 'bin.js');
  }
  return join(cwd, 'node_modules', '@fleettools/server', 'dist', 'index.js');
}

export function registerStartCommand(program: Command): void {
  program
    .command('start')
    .description('Start FleetTools services')
    .option('-s, --services <services>', 'Specific services to start (comma-separated)')
    .option('-w, --watch', 'Watch for changes and restart (implies --foreground)')
    .option('-f, --foreground', 'Run in foreground (default: background)')
    .option('-d, --daemon', 'Run in background (deprecated: use default behavior)')
    .action(async (options: any) => {
      // Make watch imply foreground
      if (options.watch) {
        options.foreground = true;
      }
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

        const projectRoot = findProjectRoot();
        const config = loadProjectConfig();
        if (!config) {
          console.error(chalk.red('❌ Failed to load project configuration.'));
          process.exit(1);
        }

        const runtimeInfo = getRuntimeInfo();
        const mode = config.fleet?.mode || 'local';
        
        // Ensure runtime directories exist
        ensureRuntimeDirectories(projectRoot);
        
        // Acquire operation lock
        const lockResult = acquireRunLock(projectRoot);
        if (lockResult.locked) {
          console.log(chalk.yellow(`⚠️  Fleet operation already in progress (PID ${lockResult.pid}).`));
          process.exit(1);
        }
        
        console.log();

        // Determine runtime mode
        const runtime = (config.fleet as any)?.runtime || 'consolidated';
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
          const squawkPath = getServicePath('squawk', mode, projectRoot);

          const squawkStdioArray: any = options.foreground ? 'inherit' : ['ignore', 'ignore', 'ignore'];

          const squawkProcess = spawn('bun', [squawkPath], {
            stdio: squawkStdioArray,
            detached: !options.foreground,
            env: {
              ...process.env,
              SQUAWK_PORT: squawkPort.toString()
            }
          });

          // Handle spawn errors
          squawkProcess.on('error', (err: any) => {
            console.error(chalk.red('❌ Failed to spawn Squawk service:'), err.message);
            process.exit(1);
          });

          // In background mode, check if process is alive and then immediately unreference it
          if (!options.foreground) {
            if (!squawkProcess.pid) {
              console.error(chalk.red('❌ Squawk service failed to spawn (no PID)'));
              process.exit(1);
            }

            // Brief wait for immediate failures
            await sleep(200);
            if (!isPidAlive(squawkProcess.pid)) {
              console.error(chalk.red('❌ Squawk service exited immediately after spawn'));
              process.exit(1);
            }
            // Unreference to allow parent to exit
            squawkProcess.unref();
          }

          processes.push({ name: 'squawk', process: squawkProcess, servicePath: squawkPath });
          
          // Write service state for background processes
          if (!options.foreground && squawkProcess.pid) {
            const serviceState = createServiceState(
              'squawk',
              runtime,
              squawkProcess.pid,
              squawkPort,
              projectRoot,
              'bun',
              [squawkPath]
            );
            writeServiceState(serviceState);
            console.log(chalk.gray(`✓ Squawk state written to .fleet/run/squawk.json`));
          }
          
          console.log(chalk.gray(`Squawk listening on port ${squawkPort}`));

          if (options.foreground) {
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

          const apiPath = getServicePath('api', mode, projectRoot);

          const apiStdioArray: any = options.foreground ? 'inherit' : ['ignore', 'ignore', 'ignore'];

          const apiProcess = spawn('bun', [apiPath], {
            stdio: apiStdioArray,
            detached: !options.foreground,
            env: {
              ...process.env,
              PORT: apiPort.toString(),
              SQUAWK_URL: squawkUrl
            }
          });

          // Handle spawn errors
          apiProcess.on('error', (err: any) => {
            console.error(chalk.red('❌ Failed to spawn API server:'), err.message);
            process.exit(1);
          });

          // In background mode, check if process is alive and then immediately unreference it
          if (!options.foreground) {
            if (!apiProcess.pid) {
              console.error(chalk.red('❌ API server failed to spawn (no PID)'));
              process.exit(1);
            }

            // Brief wait for immediate failures
            await sleep(200);
            if (!isPidAlive(apiProcess.pid)) {
              console.error(chalk.red('❌ API server exited immediately after spawn'));
              process.exit(1);
            }
            // Unreference to allow parent to exit
            apiProcess.unref();
          }

          processes.push({ name: 'api', process: apiProcess, servicePath: apiPath });
          
          // Write service state for background processes
          if (!options.foreground && apiProcess.pid) {
            const serviceState = createServiceState(
              'api',
              runtime,
              apiProcess.pid,
              apiPort,
              projectRoot,
              'bun',
              [apiPath]
            );
            writeServiceState(serviceState);
            console.log(chalk.gray(`✓ API state written to .fleet/run/api.json`));
          }
          
          console.log(chalk.gray(`API listening on port ${apiPort}`));

          if (options.foreground) {
            await sleep(1000); // Give it time to start
          }
        }

        console.log();
        if (enabledServices.length > 0) {
          console.log(chalk.green.bold(`✅ Started services: ${enabledServices.join(', ')}`));
          
          if (options.foreground) {
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

        // Release operation lock
        releaseRunLock(projectRoot);

      } catch (error: any) {
        // Release lock on error
        try {
          releaseRunLock(process.cwd());
        } catch {}
        
        console.error(chalk.red('❌ Failed to start services:'), error.message);
        if (process.argv.includes('--verbose')) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
}