/**
 * Fleet Init Command
 * 
 * Initialize a new FleetTools project
 */

import { Command } from 'commander';
import prompt from 'inquirer';
import chalk from 'chalk';
import { join } from 'node:path';
import { 
  initializeProject, 
  getAvailableTemplates, 
  getTemplateInfo,
  saveProjectConfig,
  loadGlobalConfig,
  ensureDirectories,
  colorize
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
        saveProjectConfig(project);

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