/**
 * Fleet Status Command
 * 
 * Show FleetTools status and information
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { 
  loadGlobalConfig, 
  loadProjectConfig, 
  isFleetProject,
  getRuntimeInfo, 
  detectRuntime,
  commandExists
} from '@fleettools/shared';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show FleetTools status and configuration')
    .option('--json', 'Output in JSON format')
    .action(async (options: any) => {
      try {
        const runtimeInfo = getRuntimeInfo();
        const globalConfig = loadGlobalConfig();
        
        // Create status data in OpenCode plugin format
        const statusData: any = {
          mode: 'local' as 'local' | 'synced',
          config: {
            fleet: {
              user_id: undefined,
              workspace_id: undefined
            }
          },
          podman: {
            available: commandExists('podman'),
            zero: {
              url: undefined
            },
            api: {
              url: undefined
            }
          },
          sync: {
            zero: {
              url: undefined
            },
            api: {
              url: undefined
            }
          },
          // Also include internal FleetTools data for detailed status
          runtime: {
            type: runtimeInfo.type,
            version: runtimeInfo.version,
            supported: runtimeInfo.supported,
            platform: runtimeInfo.platform,
            arch: runtimeInfo.arch
          },
          global: {
            configPath: globalConfig.paths.configDir,
            version: globalConfig.version,
            defaultRuntime: globalConfig.defaultRuntime
          },
          project: null as any,
          services: {
            squawk: 'unknown',
            api: 'unknown'
          }
        };

        if (isFleetProject()) {
          const projectConfig = loadProjectConfig();
          if (projectConfig) {
            // Update mode based on project config
            statusData.mode = projectConfig.fleet.mode;
            
            statusData.project = {
              name: projectConfig.name,
              version: projectConfig.version,
              mode: projectConfig.fleet.mode,
              services: {
                squawk: {
                  enabled: projectConfig.services.squawk.enabled,
                  port: projectConfig.services.squawk.port
                },
                api: {
                  enabled: projectConfig.services.api.enabled,
                  port: projectConfig.services.api.port
                },
                postgres: {
                  enabled: projectConfig.services.postgres.enabled,
                  provider: projectConfig.services.postgres.provider,
                  port: projectConfig.services.postgres.port
                }
              },
              plugins: {
                claudeCode: projectConfig.plugins.claudeCode,
                openCode: projectConfig.plugins.openCode
              }
            };
            
            // Set sync URLs if in synced mode
            if (projectConfig.fleet.mode === 'synced') {
              statusData.config.fleet.user_id = projectConfig.fleet.workspaceId || undefined;
              statusData.sync.zero.url = 'https://zero.fleettools.example.com';
              statusData.sync.api.url = 'https://api.fleettools.example.com';
            }
            
            // Check service status (basic check)
            if (projectConfig.services.squawk.enabled) {
              try {
                const response = await fetch(`http://localhost:${projectConfig.services.squawk.port}/health`);
                statusData.services.squawk = response.ok ? 'running' : 'stopped';
              } catch {
                statusData.services.squawk = 'stopped';
              }
            }
            
            if (projectConfig.services.api.enabled) {
              try {
                const response = await fetch(`http://localhost:${projectConfig.services.api.port}/health`);
                statusData.services.api = response.ok ? 'running' : 'stopped';
              } catch {
                statusData.services.api = 'stopped';
              }
            }
          }
        }

        if (options.json) {
          console.log(JSON.stringify(statusData, null, 2));
        } else {
          console.log(chalk.blue.bold('FleetTools Status'));
          console.log(chalk.gray('═'.repeat(40)));
          console.log();

          // Runtime Information
          console.log(chalk.blue('Runtime:'));
          console.log(`  Type: ${runtimeInfo.type} ${runtimeInfo.version}`);
          console.log(`  Platform: ${runtimeInfo.platform} (${runtimeInfo.arch})`);
          console.log(`  Supported: ${runtimeInfo.supported ? '✅' : '❌'}`);
          console.log();

          // Global Configuration
          console.log(chalk.blue('Global Configuration:'));
          console.log(`  Config Dir: ${globalConfig.paths.configDir}`);
          console.log(`  Default Runtime: ${globalConfig.defaultRuntime}`);
          console.log(`  Auto-start Services: ${globalConfig.services.autoStart ? '✅' : '❌'}`);
          console.log();

          // Project Information
          if (statusData.project) {
            console.log(chalk.blue('Project:'));
            console.log(`  Name: ${statusData.project.name}`);
            console.log(`  Mode: ${statusData.project.mode}`);
            console.log();

            console.log(chalk.blue('Services:'));
            console.log(`  Squawk: ${statusData.services.squawk === 'running' ? '✅ Running' : '❌ Stopped'} ${statusData.project.services.squawk.enabled ? `(${statusData.project.services.squawk.port})` : '(disabled)'}`);
            console.log(`  API: ${statusData.services.api === 'running' ? '✅ Running' : '❌ Stopped'} ${statusData.project.services.api.enabled ? `(${statusData.project.services.api.port})` : '(disabled)'}`);
            console.log(`  PostgreSQL: ${statusData.project.services.postgres.enabled ? '✅ Enabled' : '❌ Disabled'} ${statusData.project.services.postgres.provider} (${statusData.project.services.postgres.port})`);
            console.log();

            console.log(chalk.blue('Plugins:'));
            console.log(`  Claude Code: ${statusData.project.plugins.claudeCode ? '✅' : '❌'}`);
            console.log(`  OpenCode: ${statusData.project.plugins.openCode ? '✅' : '❌'}`);
            console.log();
          } else {
            console.log(chalk.yellow('⚠️  Not in a FleetTools project'));
            console.log(chalk.gray('Run: fleet init <project-name> to create a new project'));
            console.log();
          }

          // Environment Check
          console.log(chalk.blue('Environment:'));
          console.log(`  Node.js: ${commandExists('node') ? '✅' : '❌'}`);
          console.log(`  Bun: ${commandExists('bun') ? '✅' : '❌'}`);
          console.log(`  Podman: ${commandExists('podman') ? '✅' : '❌'}`);
          console.log(`  Docker: ${commandExists('docker') ? '✅' : '❌'}`);
          console.log();

          // Quick Actions
          if (statusData.project) {
            console.log(chalk.blue('Quick Actions:'));
            if (statusData.services.squawk === 'stopped' && statusData.project.services.squawk.enabled) {
              console.log('  fleet start squawk    - Start Squawk service');
            }
            if (statusData.services.api === 'stopped' && statusData.project.services.api.enabled) {
              console.log('  fleet start api       - Start API service');
            }
            if (statusData.services.squawk === 'stopped' && statusData.services.api === 'stopped') {
              console.log('  fleet start            - Start all services');
            }
            if (statusData.services.squawk === 'running' || statusData.services.api === 'running') {
              console.log('  fleet stop             - Stop all services');
            }
            console.log('  fleet config           - Manage configuration');
            console.log();
          } else {
            console.log(chalk.blue('Quick Actions:'));
            console.log('  fleet init             - Create new project');
            console.log('  fleet config --global  - Manage global config');
            console.log();
          }
        }

      } catch (error: any) {
        console.error(chalk.red('❌ Failed to get status:'), error.message);
        if (process.argv.includes('--verbose')) {
          console.error(error.stack);
        }
      }
    });
}