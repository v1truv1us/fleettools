/**
 * Fleet Start Command
 *
 * Start FleetTools services
 */
import chalk from 'chalk';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { loadProjectConfig, isFleetProject, detectRuntime, getRuntimeInfo, sleep } from '@fleettools/fleet-shared';
export function registerStartCommand(program) {
    program
        .command('start')
        .description('Start FleetTools services')
        .option('-s, --services <services>', 'Specific services to start (comma-separated)')
        .option('-w, --watch', 'Watch for changes and restart')
        .option('-d, --daemon', 'Run in background')
        .action(async (options) => {
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
            const runtime = detectRuntime();
            const runtimeInfo = getRuntimeInfo();
            console.log(chalk.blue(`Runtime: ${runtimeInfo.type} ${runtimeInfo.version}`));
            console.log();
            // Parse services to start
            let servicesToStart = ['squawk', 'api'];
            if (options.services) {
                servicesToStart = options.services.split(',').map((s) => s.trim());
            }
            // Determine services based on config and request
            const enabledServices = [];
            const processes = [];
            if (servicesToStart.includes('squawk') && config.services.squawk.enabled) {
                enabledServices.push('squawk');
                console.log(chalk.blue('Starting Squawk coordination service...'));
                const squawkProcess = spawn(runtime, [
                    join(process.cwd(), 'node_modules', '@fleettools', 'squawk', 'dist', 'index.js')
                ], {
                    stdio: options.daemon ? 'ignore' : 'inherit',
                    detached: options.daemon
                });
                if (options.daemon) {
                    squawkProcess.unref();
                }
                processes.push({ name: 'squawk', process: squawkProcess });
                if (!options.daemon) {
                    await sleep(1000); // Give it time to start
                }
            }
            if (servicesToStart.includes('api') && config.services.api.enabled) {
                enabledServices.push('api');
                console.log(chalk.blue('Starting API server...'));
                const apiProcess = spawn(runtime, [
                    join(process.cwd(), 'node_modules', '@fleettools', 'server-api', 'dist', 'index.js')
                ], {
                    stdio: options.daemon ? 'ignore' : 'inherit',
                    detached: options.daemon,
                    env: {
                        ...process.env,
                        PORT: config.services.api.port.toString()
                    }
                });
                if (options.daemon) {
                    apiProcess.unref();
                }
                processes.push({ name: 'api', process: apiProcess });
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
                    const handleShutdown = (signal) => {
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
                }
                else {
                    console.log(chalk.gray('Services are running in the background.'));
                    console.log(chalk.yellow('Use: fleet status to check service status'));
                    console.log(chalk.yellow('Use: fleet stop to stop services'));
                }
            }
            else {
                console.log(chalk.yellow('⚠️  No services enabled in configuration.'));
            }
        }
        catch (error) {
            console.error(chalk.red('❌ Failed to start services:'), error.message);
            if (process.argv.includes('--verbose')) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    });
}
//# sourceMappingURL=start.js.map