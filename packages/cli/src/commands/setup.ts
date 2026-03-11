/**
 * Fleet Setup Command
 * 
 * Initialize FleetTools configuration and environment
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, mkdirSync, promises as fs } from 'node:fs';
import { join } from 'node:path';
import { 
  loadGlobalConfig, 
  saveGlobalConfig, 
  isFleetProject,
  getRuntimeInfo, 
  commandExists,
  findUp
} from '@fleettools/shared';

export function registerSetupCommand(program: Command): void {
  program
    .command('setup')
    .description('Initialize FleetTools configuration and environment')
    .option('--global', 'Setup global configuration only')
    .option('--force', 'Force re-initialization')
    .action(async (options: any) => {
      try {
        console.log(chalk.blue.bold('FleetTools Setup'));
        console.log(chalk.gray('═'.repeat(40)));
        console.log();

        const runtimeInfo = getRuntimeInfo();
        
        // Check runtime compatibility
        console.log(chalk.blue('Checking runtime compatibility...'));
        console.log(`  Runtime: ${runtimeInfo.type} ${runtimeInfo.version}`);
        console.log(`  Platform: ${runtimeInfo.platform} (${runtimeInfo.arch})`);
        console.log(`  Supported: ${runtimeInfo.supported ? '✅' : '❌'}`);
        
        if (!runtimeInfo.supported) {
          console.log(chalk.yellow('⚠️  Runtime may not be fully supported. Consider using Bun for best experience.'));
        }
        console.log();

        // Check required tools
        console.log(chalk.blue('Checking required tools...'));
        const tools = [
          { name: 'Node.js', command: 'node', required: true },
          { name: 'Bun', command: 'bun', required: false, recommended: true },
          { name: 'Podman', command: 'podman', required: false, recommended: true },
          { name: 'Docker', command: 'docker', required: false, recommended: false }
        ];

        let allRequiredPresent = true;
        tools.forEach(tool => {
          const present = commandExists(tool.command);
          const status = present ? '✅' : '❌';
          const note = tool.recommended && !present ? ' (recommended)' : '';
          console.log(`  ${tool.name}: ${status}${note}`);
          
          if (tool.required && !present) {
            allRequiredPresent = false;
          }
        });
        console.log();

        if (!allRequiredPresent) {
          console.log(chalk.red('❌ Some required tools are missing. Please install them and run setup again.'));
          process.exit(1);
        }

        // Setup global configuration
        console.log(chalk.blue('Setting up global configuration...'));
        const globalConfig = loadGlobalConfig();
        
        if (!globalConfig.paths.configDir) {
          console.log(chalk.yellow('⚠️  Global config directory not found. Creating default...'));
        }

        try {
          // Ensure global directories exist
          const dirsToCreate = [
            globalConfig.paths.configDir,
            join(globalConfig.paths.configDir, 'projects'),
            join(globalConfig.paths.configDir, 'cache'),
            join(globalConfig.paths.configDir, 'logs')
          ];

          dirsToCreate.forEach(dir => {
            if (!existsSync(dir)) {
              mkdirSync(dir, { recursive: true });
              console.log(`  Created: ${dir}`);
            }
          });

          // Update global config with defaults if needed
          if (!globalConfig.defaultRuntime && (runtimeInfo.type === 'bun' || runtimeInfo.type === 'node')) {
            globalConfig.defaultRuntime = runtimeInfo.type;
          }
          
          if (!globalConfig.version) {
            globalConfig.version = '0.1.0';
          }

          saveGlobalConfig(globalConfig);
          console.log('  ✅ Global configuration updated');
        } catch (error: any) {
          console.log(chalk.red(`  ❌ Failed to setup global config: ${error.message}`));
        }
        console.log();

        // Setup project configuration (unless --global only)
        if (!options.global) {
          const projectRoot = process.cwd();
          const fleetConfig = findUp('fleet.yaml', projectRoot);
          
          if (fleetConfig && !options.force) {
            console.log(chalk.yellow('⚠️  FleetTools project already detected in this directory.'));
            console.log(chalk.gray('Use --force to re-initialize or --global for global setup only.'));
            console.log();
            return;
          }

          if (fleetConfig && options.force) {
            console.log(chalk.yellow('Force re-initializing project...'));
          }

          console.log(chalk.blue('Setting up project configuration...'));
          
          try {
            // Create .fleet directory structure
            const fleetDir = join(projectRoot, '.fleet');
            const subdirs = ['run', 'logs', 'cache', 'config'];
            
            if (!existsSync(fleetDir)) {
              mkdirSync(fleetDir, { recursive: true });
              console.log(`  Created: ${fleetDir}`);
            }

            subdirs.forEach(subdir => {
              const fullPath = join(fleetDir, subdir);
              if (!existsSync(fullPath)) {
                mkdirSync(fullPath, { recursive: true });
                console.log(`  Created: ${fullPath}`);
              }
            });

            // Create basic fleet.yaml if it doesn't exist
            if (!fleetConfig || options.force) {
              const projectConfig = {
                name: projectRoot.split('/').pop() || 'fleet-project',
                version: '0.1.0',
                fleet: {
                  mode: 'local'
                },
                services: {
                  squawk: {
                    enabled: true,
                    port: 3002
                  },
                  api: {
                    enabled: true,
                    port: 3001
                  },
                  postgres: {
                    enabled: true,
                    provider: 'podman-postgres',
                    port: 5432
                  }
                },
                plugins: {
                  claudeCode: true,
                  openCode: true
                }
              };

              const configPath = join(projectRoot, 'fleet.yaml');
              const yamlContent = `# FleetTools Project Configuration
name: ${projectConfig.name}
version: ${projectConfig.version}

fleet:
  mode: ${projectConfig.fleet.mode}

services:
  squawk:
    enabled: ${projectConfig.services.squawk.enabled}
    port: ${projectConfig.services.squawk.port}
  
  api:
    enabled: ${projectConfig.services.api.enabled}
    port: ${projectConfig.services.api.port}
  
  postgres:
    enabled: ${projectConfig.services.postgres.enabled}
    provider: ${projectConfig.services.postgres.provider}
    port: ${projectConfig.services.postgres.port}

plugins:
  claudeCode: ${projectConfig.plugins.claudeCode}
  openCode: ${projectConfig.plugins.openCode}
`;

              await fs.writeFile(configPath, yamlContent, 'utf-8');
              console.log(`  Created: ${configPath}`);
            }

            console.log('  ✅ Project configuration completed');
          } catch (error: any) {
            console.log(chalk.red(`  ❌ Failed to setup project: ${error.message}`));
          }
          console.log();
        }

        // Success message
        console.log(chalk.green.bold('✅ FleetTools setup completed successfully!'));
        console.log();
        
        if (!options.global) {
          console.log(chalk.blue('Next steps:'));
          console.log('  fleet start           - Start all services');
          console.log('  fleet status          - Check service status');
          console.log('  fleet doctor         - Run diagnostics');
          console.log();
        } else {
          console.log(chalk.blue('Next steps:'));
          console.log('  cd <project-dir>      - Navigate to project directory');
          console.log('  fleet setup           - Setup project configuration');
          console.log();
        }

        console.log(chalk.blue('Useful commands:'));
        console.log('  fleet --help          - Show all available commands');
        console.log('  fleet config          - Manage configuration');
        console.log('  fleet services        - Manage services');

      } catch (error: any) {
        console.error(chalk.red('❌ Setup failed:'), error.message);
        if (process.argv.includes('--verbose')) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
}