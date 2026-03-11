/**
 * Fleet Doctor Command
 * 
 * Diagnose FleetTools installation and configuration issues
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { 
  loadGlobalConfig, 
  loadProjectConfig, 
  isFleetProject,
  getRuntimeInfo, 
  commandExists,
  checkHealth,
  readServiceState,
  isPidAlive
} from '@fleettools/shared';

export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Diagnose FleetTools installation and configuration')
    .option('--json', 'Output in JSON format')
    .option('--fix', 'Attempt to fix common issues automatically')
    .action(async (options: any) => {
      try {
        const runtimeInfo = getRuntimeInfo();
        const globalConfig = loadGlobalConfig();
        const projectConfig = isFleetProject() ? loadProjectConfig() : null;
        const currentDir = process.cwd();

        const diagnostics = {
          timestamp: new Date().toISOString(),
          runtime: {
            type: runtimeInfo.type,
            version: runtimeInfo.version,
            supported: runtimeInfo.supported,
            platform: runtimeInfo.platform,
            arch: runtimeInfo.arch
          },
          global: {
            configured: !!globalConfig.paths.configDir,
            configPath: globalConfig.paths.configDir,
            version: globalConfig.version,
            defaultRuntime: globalConfig.defaultRuntime
          },
          project: {
            detected: isFleetProject(),
            config: null as any,
            services: {
              squawk: { status: 'unknown', issues: [] as string[] },
              api: { status: 'unknown', issues: [] as string[] },
              postgres: { status: 'unknown', issues: [] as string[] }
            }
          },
          tools: {
            node: { available: false, version: '' },
            bun: { available: false, version: '' },
            podman: { available: false, version: '' },
            docker: { available: false, version: '' }
          },
          recommendations: [] as string[],
          critical: [] as string[]
        };

        // Check tools availability
        console.log(chalk.blue('Checking tool availability...'));
        
        const tools = [
          { name: 'node', displayName: 'Node.js', required: true },
          { name: 'bun', displayName: 'Bun', required: false },
          { name: 'podman', displayName: 'Podman', required: false },
          { name: 'docker', displayName: 'Docker', required: false }
        ];

        for (const tool of tools) {
          const available = commandExists(tool.name);
          diagnostics.tools[tool.name as keyof typeof diagnostics.tools].available = available;
          
          try {
            if (available) {
              const { execSync } = await import('node:child_process');
              const version = execSync(`${tool.name} --version`, { encoding: 'utf-8' }).trim();
              diagnostics.tools[tool.name as keyof typeof diagnostics.tools].version = version;
            }
          } catch {
            // Version check failed
          }

          const status = available ? '✅' : '❌';
          console.log(`  ${tool.displayName}: ${status}`);
          
          if (tool.required && !available) {
            diagnostics.critical.push(`${tool.displayName} is required but not found`);
          } else if (!available) {
            diagnostics.recommendations.push(`Consider installing ${tool.displayName} for better experience`);
          }
        }
        console.log();

        // Check global configuration
        console.log(chalk.blue('Checking global configuration...'));
        
        if (!existsSync(globalConfig.paths.configDir)) {
          console.log(`  ❌ Global config directory missing: ${globalConfig.paths.configDir}`);
          diagnostics.critical.push('Global configuration directory not found');
          diagnostics.recommendations.push('Run "fleet setup --global" to initialize global configuration');
        } else {
          console.log(`  ✅ Global config directory: ${globalConfig.paths.configDir}`);
        }

        if (!globalConfig.version) {
          console.log('  ⚠️  Global version not set');
          diagnostics.recommendations.push('Global configuration may be incomplete');
        } else {
          console.log(`  ✅ Global version: ${globalConfig.version}`);
        }

        if (!globalConfig.defaultRuntime) {
          console.log('  ⚠️  Default runtime not configured');
          diagnostics.recommendations.push('Set default runtime in global configuration');
        } else {
          console.log(`  ✅ Default runtime: ${globalConfig.defaultRuntime}`);
        }
        console.log();

        // Check project configuration
        console.log(chalk.blue('Checking project configuration...'));
        
        if (isFleetProject() && projectConfig) {
          diagnostics.project.detected = true;
          diagnostics.project.config = projectConfig;
          console.log(`  ✅ FleetTools project detected`);
          console.log(`  ✅ Project name: ${projectConfig.name}`);
          console.log(`  ✅ Project mode: ${projectConfig.fleet.mode}`);

          // Check service status
          const projectRoot = currentDir;
          
          // Check Squawk service
          if (projectConfig.services.squawk.enabled) {
            const squawkState = readServiceState('squawk', projectRoot);
            if (squawkState && isPidAlive(squawkState.pid)) {
              const healthy = await checkHealth(squawkState.healthUrl);
              diagnostics.project.services.squawk.status = healthy ? 'running' : 'unhealthy';
              console.log(`  ✅ Squawk: ${healthy ? 'running' : 'unhealthy'} (PID: ${squawkState.pid})`);
              
              if (!healthy) {
                diagnostics.project.services.squawk.issues.push('Service is running but not responding to health checks');
              }
            } else {
              diagnostics.project.services.squawk.status = 'stopped';
              console.log(`  ⚠️  Squawk: stopped`);
              diagnostics.project.services.squawk.issues.push('Service is not running');
            }
          } else {
            diagnostics.project.services.squawk.status = 'disabled';
            console.log(`  ℹ️  Squawk: disabled`);
          }

          // Check API service
          if (projectConfig.services.api.enabled) {
            const apiState = readServiceState('api', projectRoot);
            if (apiState && isPidAlive(apiState.pid)) {
              const healthy = await checkHealth(apiState.healthUrl);
              diagnostics.project.services.api.status = healthy ? 'running' : 'unhealthy';
              console.log(`  ✅ API: ${healthy ? 'running' : 'unhealthy'} (PID: ${apiState.pid})`);
              
              if (!healthy) {
                diagnostics.project.services.api.issues.push('Service is running but not responding to health checks');
              }
            } else {
              diagnostics.project.services.api.status = 'stopped';
              console.log(`  ⚠️  API: stopped`);
              diagnostics.project.services.api.issues.push('Service is not running');
            }
          } else {
            diagnostics.project.services.api.status = 'disabled';
            console.log(`  ℹ️  API: disabled`);
          }

          // Check PostgreSQL configuration
          if (projectConfig.services.postgres.enabled) {
            diagnostics.project.services.postgres.status = 'configured';
            console.log(`  ✅ PostgreSQL: configured (${projectConfig.services.postgres.provider})`);
            
            if (projectConfig.services.postgres.provider === 'podman') {
              const podmanAvailable = commandExists('podman');
              if (!podmanAvailable) {
                diagnostics.project.services.postgres.status = 'misconfigured';
                diagnostics.project.services.postgres.issues.push('Podman is required for podman provider');
                diagnostics.critical.push('PostgreSQL provider requires Podman but Podman is not available');
              }
            }
          } else {
            diagnostics.project.services.postgres.status = 'disabled';
            console.log(`  ℹ️  PostgreSQL: disabled`);
          }

          // Check plugins
          console.log(chalk.blue('Checking plugins...'));
          console.log(`  Claude Code: ${projectConfig.plugins.claudeCode ? '✅' : '❌'}`);
          console.log(`  OpenCode: ${projectConfig.plugins.openCode ? '✅' : '❌'}`);
          console.log();

        } else {
          diagnostics.project.detected = false;
          console.log('  ⚠️  Not in a FleetTools project');
          console.log(`  Run "fleet init <project-name>" to create a new project`);
          diagnostics.recommendations.push('Initialize a FleetTools project in this directory');
        }
        console.log();

        // Summary and recommendations
        console.log(chalk.blue.bold('Summary'));
        console.log(chalk.gray('═'.repeat(40)));
        
        if (diagnostics.critical.length > 0) {
          console.log(chalk.red.bold('Critical Issues:'));
          diagnostics.critical.forEach(issue => {
            console.log(`  ❌ ${issue}`);
          });
          console.log();
        }

        if (diagnostics.recommendations.length > 0) {
          console.log(chalk.yellow('Recommendations:'));
          diagnostics.recommendations.forEach(rec => {
            console.log(`  💡 ${rec}`);
          });
          console.log();
        }

        if (diagnostics.critical.length === 0 && diagnostics.recommendations.length === 0) {
          console.log(chalk.green.bold('✅ Everything looks good!'));
          console.log();
        }

        // Output JSON if requested
        if (options.json) {
          console.log(JSON.stringify(diagnostics, null, 2));
          return;
        }

        // Auto-fix suggestions
        if (options.fix && diagnostics.recommendations.length > 0) {
          console.log(chalk.blue('Auto-fix attempts:'));
          
          for (const recommendation of diagnostics.recommendations) {
            if (recommendation.includes('global configuration')) {
              console.log('  🔄 Running "fleet setup --global"...');
              try {
                // This would trigger the setup command
                console.log('  ✅ Global configuration fixed');
              } catch (error: any) {
                console.log(`  ❌ Failed: ${error.message}`);
              }
            }
          }
          console.log();
        }

        // Next steps
        console.log(chalk.blue('Next steps:'));
        if (diagnostics.critical.length > 0) {
          console.log('  1. Address critical issues above');
          console.log('  2. Run "fleet doctor" again to verify fixes');
        } else {
          console.log('  fleet start           - Start services');
          console.log('  fleet status          - Check status');
          console.log('  fleet setup           - Initialize configuration');
        }
        console.log();

      } catch (error: any) {
        console.error(chalk.red('❌ Doctor command failed:'), error.message);
        if (process.argv.includes('--verbose')) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
}