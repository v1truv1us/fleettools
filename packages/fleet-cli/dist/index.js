#!/usr/bin/env node
/**
 * FleetTools Global CLI
 *
 * Fleet management and project bootstrapping for FleetTools
 * Supports both Bun and Node.js runtimes
 *
 * Run: fleet <command> [options]
 */
import { program } from 'commander';
import { detectRuntime, getRuntimeInfo } from '@fleettools/fleet-shared';
import chalk from 'chalk';
import { registerInitCommand } from './commands/init.js';
import { registerStartCommand } from './commands/start.js';
import { registerConfigCommand } from './commands/config.js';
import { registerProjectCommands } from './commands/project.js';
import { registerServiceCommands } from './commands/services.js';
import { registerStatusCommand } from './commands/status.js';
// CLI Bootstrap
const runtime = detectRuntime();
const runtimeInfo = getRuntimeInfo();
// Display runtime information in debug mode
if (process.argv.includes('--debug-runtime')) {
    console.log(chalk.blue('FleetTools Runtime Information:'));
    console.log(`  Runtime: ${runtimeInfo.type} ${runtimeInfo.version}`);
    console.log(`  Platform: ${runtimeInfo.platform}`);
    console.log(`  Architecture: ${runtimeInfo.arch}`);
    console.log(`  Supported: ${runtimeInfo.supported ? '✅' : '❌'}`);
    process.exit(0);
}
// Global Options
program
    .name('fleet')
    .description('FleetTools - AI Agent Coordination System CLI')
    .version('0.1.0')
    .option('--config <path>', 'Path to global config file')
    .option('--verbose', 'Enable verbose output')
    .option('--debug-runtime', 'Show runtime information and exit')
    .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    if (options.verbose) {
        console.log(chalk.blue(`Running: ${thisCommand.name()}`));
        console.log(chalk.blue(`Runtime: ${runtime} (${runtimeInfo.version})`));
    }
});
// Error Handling
process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Uncaught Exception:'), error.message);
    if (process.argv.includes('--verbose')) {
        console.error(error.stack);
    }
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('❌ Unhandled Rejection:'), reason);
    if (process.argv.includes('--verbose')) {
        console.error(promise);
    }
    process.exit(1);
});
// Graceful Shutdown
let shuttingDown = false;
const gracefulShutdown = (signal) => {
    if (shuttingDown)
        return;
    shuttingDown = true;
    console.log(chalk.yellow(`\n🛑 Received ${signal}, shutting down gracefully...`));
    process.exit(0);
};
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
// ============================================================================
// Register Commands
// ============================================================================
// Project Management Commands
registerInitCommand(program);
registerStartCommand(program);
registerConfigCommand(program);
// Project-specific Commands (require initialized project)
registerProjectCommands(program);
// Service Management Commands
registerServiceCommands(program);
// Status and Information
registerStatusCommand(program);
// ============================================================================
// Parse and Execute
// ============================================================================
// Display welcome message for help
program.on('command:*', () => {
    if (program.args.length === 0) {
        console.log(chalk.blue.bold('FleetTools CLI'));
        console.log(chalk.gray('AI Agent Coordination System'));
        console.log('');
        console.log('Quick start:');
        console.log('  fleet init                    Initialize a new FleetTools project');
        console.log('  fleet start                   Start FleetTools services');
        console.log('  fleet status                  Show fleet status');
        console.log('');
        console.log('Use --help for detailed command information.');
    }
});
// Parse command line arguments
program.parse(process.argv);
// If no command provided, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
//# sourceMappingURL=index.js.map