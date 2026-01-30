/**
 * FleetTools OpenCode Plugin
 * 
 * Integrates FleetTools CLI functionality into OpenCode via tools and commands
 */
export const FleetToolsPlugin = async ({ client, $, directory, worktree }: any) => {
  // Register custom tools for LLM to call
  return {
    tool: {
      'fleet-status': {
        description: 'Get FleetTools service status and configuration',
        parameters: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              enum: ['text', 'json'],
              description: 'Output format (default: text)'
            }
          }
        },
        execute: async ({ format = 'text' }) => {
          try {
            const effectiveCwd = worktree ?? directory;
            const result = await $`fleet status${format === 'json' ? ' --json' : ''}`.cwd(effectiveCwd).nothrow().text();
            
            if (format === 'json') {
              try {
                return JSON.parse(result);
              } catch {
                return { success: false, error: 'Failed to parse status JSON' };
              }
            }
            return result;
          } catch (error: any) {
            await client.app.log({
              service: 'fleettools',
              level: 'error',
              message: 'Failed to get FleetTools status',
              extra: { error: error.message || String(error) }
            });
            return { success: false, error: error.message || String(error) };
          }
        }
      },

      'fleet-start': {
        description: 'Start FleetTools services',
        parameters: {
          type: 'object',
          properties: {
            services: {
              type: 'array',
              items: { type: 'string', enum: ['api', 'squawk'] },
              description: 'Services to start (api, squawk)'
            }
          }
        },
        execute: async ({ services = [] }) => {
          try {
            const effectiveCwd = worktree ?? directory;
            const servicesArg = services.length > 0 ? `--services ${services.join(',')}` : '';
            const result = await $`fleet start ${servicesArg}`.cwd(effectiveCwd).nothrow().text();
            
            await client.app.log({
              service: 'fleettools',
              level: 'info',
              message: 'FleetTools services started',
              extra: { services: services.length > 0 ? services : ['all'], result }
            });
            
            return result || 'FleetTools services started successfully';
          } catch (error: any) {
            await client.app.log({
              service: 'fleettools',
              level: 'error',
              message: 'Failed to start FleetTools services',
              extra: { error: error.message || String(error) }
            });
            return { success: false, error: error.message || String(error) };
          }
        }
      },

      'fleet-stop': {
        description: 'Stop FleetTools services',
        parameters: {
          type: 'object',
          properties: {
            services: {
              type: 'array',
              items: { type: 'string', enum: ['api', 'squawk'] },
              description: 'Services to stop (api, squawk)'
            },
            force: {
              type: 'boolean',
              description: 'Force stop without waiting for graceful shutdown'
            },
            timeoutMs: {
              type: 'number',
              description: 'Timeout for graceful shutdown in milliseconds'
            },
            format: {
              type: 'string',
              enum: ['text', 'json'],
              description: 'Output format (default: text)'
            }
          }
        },
        execute: async ({ services = [], force = false, timeoutMs = undefined, format = 'text' }) => {
          try {
            const effectiveCwd = worktree ?? directory;
            const flags = [
              services.length > 0 ? `--services ${services.join(',')}` : '',
              force ? '--force' : '',
              timeoutMs ? `--timeout ${timeoutMs}` : '',
              format === 'json' ? '--json' : ''
            ].filter(Boolean).join(' ');
            
            const result = await $`fleet stop ${flags}`.cwd(effectiveCwd).nothrow().text();
            
            if (format === 'json') {
              try {
                return JSON.parse(result);
              } catch {
                return { success: false, error: 'Failed to parse stop JSON' };
              }
            }
            return result;
          } catch (error: any) {
            await client.app.log({
              service: 'fleettools',
              level: 'error',
              message: 'Failed to stop FleetTools services',
              extra: { error: error.message || String(error) }
            });
            return { success: false, error: error.message || String(error) };
          }
        }
      }
    },

    // Register custom slash commands via config hook
    async config(config: any) {
      // Initialize command registry if it doesn't exist
      config.command = config.command ?? {};

      // /fleet-status [format] - Show FleetTools status
      config.command['fleet-status'] = {
        template: `Use the fleet-status tool to get FleetTools status and configuration$ARGUMENTS ? \` with format: $ARGUMENTS\` : ''.`,
        description: 'Show FleetTools status and configuration',
        agent: 'build'
      };

      // /fleet-start [services] - Start FleetTools services  
      config.command['fleet-start'] = {
        template: `Use the fleet-start tool to start FleetTools services$ARGUMENTS ? \` with services: $ARGUMENTS\` : ''.\n\nThis runs services in the background. For foreground execution or other options, use the fleet-start tool directly.`,
        description: 'Start FleetTools services',
        agent: 'build'
      };

      // /fleet-stop [services] [force] [timeout] [format] - Stop FleetTools services
      config.command['fleet-stop'] = {
        template: `Use the fleet-stop tool to stop FleetTools services$ARGUMENTS ? \` with: $ARGUMENTS\` : ''.\n\nThis supports selective service stopping and graceful shutdown options. Use the fleet-stop tool directly for advanced options.`,
        description: 'Stop FleetTools services',
        agent: 'build'
      };

      // /fleet-help - Show FleetTools help
      config.command['fleet-help'] = {
        template: `# FleetTools Plugin for OpenCode

## Available Tools
- **fleet-status** - Get FleetTools service status and configuration
- **fleet-start** - Start FleetTools services  
- **fleet-stop** - Stop FleetTools services

## Slash Commands
- **/fleet-status [format]** - Show status (format: text|json)
- **/fleet-start [services]** - Start services (services: api,squawk)
- **/fleet-stop [services]** - Stop services (services: api,squawk)
- **/fleet-help** - Show this help

## Examples
\`\`\`bash
# Check FleetTools status
/fleet-status

# Start specific services
/fleet-start api,squawk

# Stop services with force
/fleet-stop --force api,squawk --timeout 3000
\`\`\`

## Installation
Add this plugin to your OpenCode config:
\`\`\`json
{
  "plugin": ["@fleettools/opencode-plugin"]
}
\`\`\`

After restarting OpenCode, the tools and commands will be available in your session.

For more information, see: https://github.com/v1truv1us/fleettools`,
        description: 'Show FleetTools help and usage',
        agent: 'build'
      };
    }
  };
};// Test selective versioning
