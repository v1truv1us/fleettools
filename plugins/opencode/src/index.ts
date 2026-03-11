import type { Plugin } from "@opencode-ai/plugin";
import { tool, z } from "@opencode-ai/plugin";

/**
 * Run FleetTools CLI with proper argument handling
 */
async function runFleet(args: string[], cwd: string): Promise<string> {
  try {
    // Use Bun shell API from global context when available
    const shellApi = (globalThis as any).$ || (globalThis as any).bun?.shell;
    if (!shellApi) {
      throw new Error('Shell API not available');
    }
    
    const result = await shellApi`fleet ${args.join(' ')}`.cwd(cwd).nothrow().text();
    return result;
  } catch (error: any) {
    throw new Error(`FleetTools CLI error: ${error.message || String(error)}`);
  }
}

const FleetToolsPlugin: Plugin = async ({ client, directory, worktree }) => {
  const effectiveCwd = worktree ?? directory;

  // Tools (snake_case, OpenCode-compliant)
  return {
    tool: {
      fleet_status: tool({
        description: 'Get FleetTools service status and configuration',
        args: {
          format: z.string().optional().describe('Output format: text or json')
        },
        async execute(args, context) {
          const cwd = context.worktree ?? context.directory;
          const fleetArgs = ['status'];
          if (args.format === 'json') {
            fleetArgs.push('--json');
          }
          return await runFleet(fleetArgs, cwd);
        }
      }),

      fleet_start: tool({
        description: 'Start FleetTools services',
        args: {
          services: z.string().optional().describe('Services to start (comma-separated): api,squawk')
        },
        async execute(args, context) {
          const cwd = context.worktree ?? context.directory;
          const fleetArgs = ['start'];
          if (args.services) {
            fleetArgs.push('--services', args.services);
          }
          return await runFleet(fleetArgs, cwd);
        }
      }),

      fleet_stop: tool({
        description: 'Stop FleetTools services',
        args: {
          services: z.string().optional().describe('Services to stop (comma-separated: api,squawk'),
          force: z.boolean().optional().describe('Force stop without graceful shutdown'),
          timeout_ms: z.number().optional().describe('Timeout for graceful shutdown in milliseconds'),
          format: z.string().optional().describe('Output format: text or json')
        },
        async execute(args, context) {
          const cwd = context.worktree ?? context.directory;
          const fleetArgs = ['stop'];
          if (args.services) {
            fleetArgs.push('--services', args.services);
          }
          if (args.force) {
            fleetArgs.push('--force');
          }
          if (args.timeout_ms) {
            fleetArgs.push('--timeout', args.timeout_ms.toString());
          }
          if (args.format === 'json') {
            fleetArgs.push('--json');
          }
          return await runFleet(fleetArgs, cwd);
        }
      }),

      fleet_setup: tool({
        description: 'Initialize FleetTools configuration and environment',
        args: {
          global: z.boolean().optional().describe('Setup global configuration only'),
          force: z.boolean().optional().describe('Force re-initialization')
        },
        async execute(args, context) {
          const cwd = context.worktree ?? context.directory;
          const fleetArgs = ['setup'];
          if (args.global) {
            fleetArgs.push('--global');
          }
          if (args.force) {
            fleetArgs.push('--force');
          }
          return await runFleet(fleetArgs, cwd);
        }
      }),

      fleet_doctor: tool({
        description: 'Diagnose FleetTools installation and configuration',
        args: {
          json: z.boolean().optional().describe('Output in JSON format'),
          fix: z.boolean().optional().describe('Attempt to fix common issues automatically')
        },
        async execute(args, context) {
          const cwd = context.worktree ?? context.directory;
          const fleetArgs = ['doctor'];
          if (args.json) {
            fleetArgs.push('--json');
          }
          if (args.fix) {
            fleetArgs.push('--fix');
          }
          return await runFleet(fleetArgs, cwd);
        }
      }),

      fleet_services: tool({
        description: 'Manage FleetTools services (pass-through to fleet services CLI)',
        args: {
          args: z.string().optional().describe('Arguments to pass to fleet services command')
        },
        async execute(args, context) {
          const cwd = context.worktree ?? context.directory;
          const fleetArgs = ['services'];
          if (args.args) {
            // Basic security: only allow alphanumeric, spaces, hyphens, and commas
            const sanitized = args.args.replace(/[^a-zA-Z0-9\s,-]/g, '');
            if (sanitized !== args.args) {
              throw new Error('Invalid characters in services args');
            }
            fleetArgs.push(...sanitized.split(/\s+/));
          }
          return await runFleet(fleetArgs, cwd);
        }
      }),

      fleet_context: tool({
        description: 'Get compact FleetTools context for memory across sessions',
        args: {
          verbose: z.boolean().optional().describe('Include detailed information')
        },
        async execute(args, context) {
          const cwd = context.worktree ?? context.directory;
          try {
            const result = await runFleet(['status', '--json'], cwd);
            const status = JSON.parse(result);
            
            // Build compact, LLM-friendly context block
            const contextLines = [
              `# FleetTools Context`,
              '',
              `## Mode: ${status.mode || 'unknown'}`,
              `## Services: ${status.services?.squawk === 'running' || status.services?.api === 'running' ? 'running' : 'stopped'}`,
              status.project?.name ? `## Project: ${status.project.name}` : '',
              ''
            ];
            
            if (args.verbose) {
              contextLines.push('## Details:');
              contextLines.push('```json');
              contextLines.push(JSON.stringify(status, null, 2));
              contextLines.push('```');
            }
            
            return contextLines.join('\n');
          } catch (error: any) {
            return `# FleetTools Context\n\nError: ${error.message || String(error)}`;
          }
        }
      }),

      fleet_opencode_setup: {
        description: 'Set up OpenCode command files for FleetTools (like SwarmTools setup)',
        args: {
          project_path: z.string().optional().describe('Project path (defaults to current directory)'),
          overwrite: z.boolean().optional().describe('Overwrite existing command files')
        },
        async execute(args, context) {
          const cwd = context.worktree ?? context.directory;
          const projectPath = args.project_path || cwd;
          const commandsDir = `${projectPath}/.opencode/commands`;
          
          // Ensure commands directory exists
          const fs = await import('node:fs');
          const path = await import('node:path');
          await fs.promises.mkdir(commandsDir, { recursive: true });
          
          // Command template
          const commandTemplate = `---description: $1 - FleetTools $2
---
Use the fleet_${commands} tool with these flags: $ARGUMENTS

Available subcommands:
status    - Show FleetTools status
start     - Start FleetTools services  
stop      - Stop FleetTools services
setup     - Initialize FleetTools configuration
doctor     - Diagnose FleetTools installation
services   - Manage FleetTools services
help      - Show FleetTools help

Examples:
/fleet status --json
/fleet start --services api,squawk
/fleet stop --services api,squawk --force --timeout 5000
/fleet setup --global
/fleet doctor --fix
/fleet services list
/fleet help`;
          
          // Create individual command files
          const commands: Array<{name: string; commands: string; desc: string; extra: string}> = [
            { name: 'fleet', commands: 'status', desc: 'Show FleetTools status', extra: '--json' },
            { name: 'fleet', commands: 'start', desc: 'Start FleetTools services', extra: '--services api,squawk' },
            { name: 'fleet', commands: 'stop', desc: 'Stop FleetTools services', extra: '--services api,squawk --force --timeout 5000' },
            { name: 'fleet', commands: 'setup', desc: 'Initialize FleetTools configuration', extra: '--global --force' },
            { name: 'fleet', commands: 'doctor', desc: 'Diagnose FleetTools installation', extra: '--json --fix' },
            { name: 'fleet', commands: 'services', desc: 'Manage FleetTools services', extra: 'list' },
            { name: 'fleet', commands: 'help', desc: 'Show FleetTools help' }
          ];
          
          for (const cmd of commands) {
            const fileName = `${cmd.name}-${cmd.commands}.md`;
            const filePath = `${commandsDir}/${fileName}`;
            
            if (!args.overwrite && await fs.promises.access(filePath).then(() => false).catch(() => false)) {
              console.log(`Skipping existing ${fileName} (use overwrite: true to replace)`);
              continue;
            }
            
            const content = commandTemplate
              .replace(/\$1/g, `${cmd.name}-${cmd.commands}`)
              .replace(/\$2/g, cmd.desc)
              .replace(/\$commands/g, cmd.commands)
              .replace(/\$ARGUMENTS/g, cmd.extra);
              
            await fs.promises.writeFile(filePath, content, 'utf-8');
            console.log(`Created: ${filePath}`);
          }
          
          return `FleetTools OpenCode commands set up in ${projectPath}. Restart OpenCode to use /fleet commands.`;
        }
      }
    },

    // Memory/Context hooks
    session: {
      created: async ({ context }) => {
        try {
          const fleetContext = await context.tool.fleet_context({ verbose: false });
          if (typeof context.prompt === 'string') {
            context.prompt += `\n\n${fleetContext}`;
          } else {
            context.prompt.push(fleetContext);
          }
        } catch (error: any) {
          await client.app.log({
            service: 'fleettools',
            level: 'warn',
            message: 'Failed to add FleetTools context to session',
            extra: { error: error.message || String(error) }
          });
        }
      }
    },

    experimental: {
      'session.compacting': async ({ context }) => {
        try {
          const fleetContext = await context.tool.fleet_context({ verbose: true });
          const guidance = `
## How to use FleetTools in OpenCode

### Primary Interface
Use /fleet commands (after running fleet_opencode_setup once):
- /fleet status [--json]    - Show FleetTools status
- /fleet start --services api,squawk    - Start services
- /fleet stop --services api,squawk --force    - Stop services
- /fleet setup [--global]    - Initialize configuration
- /fleet doctor [--fix]    - Diagnose issues
- /fleet services list    - Manage services
- /fleet help    - Show help

### Direct Tool Calls
You can also call tools directly:
- fleet_status() for status
- fleet_start() to start services
- fleet_stop() to stop services
- fleet_context() to refresh context
- fleet_opencode_setup() to regenerate command files

### Memory
The fleet_context() tool provides a compact snapshot of FleetTools state. Use it to:
- Quick status checks without running CLI
- Include current state in prompts
- Survive session compactions
`;
          
          if (typeof context.prompt === 'string') {
            context.prompt += `\n\n${fleetContext}`;
          } else {
            context.prompt.push(fleetContext);
          }
        } catch (error: any) {
          await client.app.log({
            service: 'fleettools',
            level: 'warn',
            message: 'Failed to preserve FleetTools context in compaction',
            extra: { error: error.message || String(error) }
          });
        }
      }
    }
  };
};

export default FleetToolsPlugin;