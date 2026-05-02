/**
 * Fleet Init Command
 * 
 * Initialize a new FleetTools project
 */

import { Command } from 'commander';
import prompt from 'inquirer';
import chalk from 'chalk';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { 
  initializeProject, 
  getAvailableTemplates, 
  getTemplateInfo,
  saveProjectConfig,
  loadGlobalConfig,
  ensureDirectories,
  colorize,
  detectRuntime
} from '@fleettools/shared';


export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a new FleetTools project')
    .option('-t, --template <template>', 'Project template to use', 'basic')
    .option('-n, --name <name>', 'Project name')
    .option('-y, --yes', 'Accept all defaults')
    .argument('[path]', 'Directory to initialize (default: current directory)', '.')
    .action(async (projectPath: string, options: any) => {
      try {
        console.log(chalk.blue.bold('🚀 FleetTools Project Initialization'));
        console.log(chalk.gray('═'.repeat(50)));
        console.log();

        // Ensure global config exists
        const globalConfig = loadGlobalConfig();
        ensureDirectories(globalConfig);

        // Validate template
        const availableTemplates = getAvailableTemplates();
        if (!availableTemplates.includes(options.template)) {
          console.error(chalk.red(`❌ Unknown template: ${options.template}`));
          console.log(chalk.yellow('Available templates:'));
          availableTemplates.forEach(template => {
            const info = getTemplateInfo(template);
            console.log(`  ${template}: ${info?.description}`);
          });
          process.exit(1);
        }

        // For now, use defaults only - interactive prompts will be fixed later
        let projectConfig: any = {
          name: options.name || join(process.cwd(), projectPath).split('/').pop() || 'fleet-project',
          template: options.template
        };

        // Initialize project
        console.log(chalk.blue(`📁 Initializing project in: ${projectPath}`));
        
        const project = initializeProject(
          join(process.cwd(), projectPath),
          projectConfig.template || options.template,
          projectConfig
        );

        // Save configuration
        try {
          saveProjectConfig(project);
        } catch (error: any) {
          console.error(chalk.red('❌ Failed to save project configuration:'), error.message);
          if (process.argv.includes('--verbose')) {
            console.error(error.stack);
          }
          process.exit(1);
        }

        // Install FleetTools server dependencies
        const projectDir = join(process.cwd(), projectPath);
        console.log(chalk.blue('📦 Installing FleetTools dependencies...'));
        try {
          // Create package.json if it doesn't exist
          const pkgJsonPath = join(projectDir, 'package.json');
          if (!existsSync(pkgJsonPath)) {
            const pkgName = options.name || projectPath.split('/').pop() || 'fleet-project';
            writeFileSync(pkgJsonPath, JSON.stringify({
              name: pkgName,
              version: '1.0.0',
              private: true
            }, null, 2));
          }
          
          const runtime = detectRuntime();
          const pkgManager = runtime === 'bun' ? 'bun' : 'npm';
          const installCmd = pkgManager === 'bun' 
            ? 'bun add @fleettools/server @fleettools/squawk'
            : 'npm install @fleettools/server @fleettools/squawk';
          
          execSync(installCmd, { 
            cwd: projectDir, 
            stdio: 'inherit' 
          });
          console.log(chalk.green('✓ Dependencies installed'));
        } catch (error: any) {
          console.error(chalk.yellow('⚠️  Failed to auto-install dependencies.'));
          console.log(chalk.yellow('Run manually: bun add @fleettools/server @fleettools/squawk'));
        }

        // Display success message
        console.log();
        console.log(chalk.green.bold('✅ Project initialized successfully!'));
        console.log();
        console.log(chalk.blue('Next steps:'));
        console.log(`  1. ${colorize('cd', 'cyan')} ${projectPath}`);
        console.log(`  2. ${colorize('fleet start', 'cyan')} - Start FleetTools services`);
        console.log(`  3. ${colorize('fleet status', 'cyan')} - Check fleet status`);
        console.log();
        console.log(chalk.blue('Available commands:'));
        console.log('  fleet start     - Start all services');
        console.log('  fleet stop      - Stop all services');
        console.log('  fleet status     - Show status');
        console.log('  fleet config     - Manage configuration');
        console.log('  fleet --help     - Show all commands');
        console.log();

      } catch (error: any) {
        console.error(chalk.red('❌ Initialization failed:'), error.message);
        if (process.argv.includes('--verbose')) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
}