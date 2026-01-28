/**
 * Fleet Agents Command
 *
 * Manage AI agents within FleetTools
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadProjectConfig, isFleetProject } from '@fleettools/shared';

interface Agent {
  id: string;
  agent_type: string;
  callsign: string;
  status: 'idle' | 'busy' | 'offline' | 'error';
  current_workload: number;
  max_workload: number;
  last_heartbeat: string;
  created_at: string;
  updated_at: string;
}

interface AgentStats {
  total_agents: number;
  active_agents: number;
  idle_agents: number;
  offline_agents: number;
  average_workload: number;
}

/**
 * Get API URL from environment or project config
 */
function getApiUrl(): string {
  // Check for environment variable first
  const envUrl = process.env.FLEETTOOLS_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // Fall back to project config
  if (!isFleetProject()) {
    return 'http://localhost:3001'; // Default to localhost
  }

  const config = loadProjectConfig();
  if (!config) {
    return 'http://localhost:3001';
  }

  const port = config.services.api.port || 3001;
  return `http://localhost:${port}`;
}

export function registerAgentCommands(program: Command): void {
  const agentsCmd = program
    .command('agents')
    .description('Manage FleetTools agents');

  // List agents
  agentsCmd
    .command('list')
    .alias('ls')
    .description('List all agents')
    .option('--json', 'Output in JSON format')
    .action(async (options: any) => {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/v1/agents`);

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

const data: any = await response.json();
          const agents = data.data?.agents || [];

        if (options.json) {
          console.log(JSON.stringify(agents, null, 2));
        } else {
          if (agents.length === 0) {
            console.log(chalk.yellow('No agents found'));
            return;
          }

          console.log(chalk.blue.bold('FleetTools Agents'));
          console.log(chalk.gray('═'.repeat(80)));
          console.log();

          for (const agent of agents) {
            const statusColor = agent.status === 'idle' ? chalk.green :
                               agent.status === 'busy' ? chalk.yellow :
                               agent.status === 'offline' ? chalk.red : chalk.gray;

            console.log(`${chalk.bold(agent.callsign)}`);
            console.log(`  ID: ${agent.id}`);
            console.log(`  Type: ${agent.agent_type}`);
            console.log(`  Status: ${statusColor(agent.status)}`);
            console.log(`  Workload: ${agent.current_workload}/${agent.max_workload}`);
            console.log(`  Last Heartbeat: ${new Date(agent.last_heartbeat).toLocaleString()}`);
            console.log();
          }
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to list agents:'), error.message);
        process.exit(1);
      }
    });

  // Spawn a new agent
  agentsCmd
    .command('spawn <type> [task]')
    .description('Spawn a new agent')
    .option('--callsign <name>', 'Custom callsign for the agent')
    .action(async (type: string, task: string, options: any) => {
      try {
        const apiUrl = getApiUrl();
        const callsign = options.callsign || `Agent-${Date.now()}`;

        const response = await fetch(`${apiUrl}/api/v1/agents/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_type: type,
            callsign: callsign,
            capabilities: task ? [
              {
                id: `cap_${Date.now()}`,
                name: task,
                trigger_words: [task.toLowerCase()]
              }
            ] : []
          })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`API error: ${error}`);
        }

        const data: any = await response.json();
        const agent = data.data || data;

        console.log(chalk.green('✅ Agent spawned successfully'));
        console.log(`  Callsign: ${agent.callsign}`);
        console.log(`  Agent ID: ${agent.id}`);
        console.log(`  Type: ${agent.agent_type}`);
        if (task) {
          console.log(`  Task: ${task}`);
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to spawn agent:'), error.message);
        process.exit(1);
      }
    });

  // Get agent status
  agentsCmd
    .command('status [callsign]')
    .description('Show agent status')
    .option('--json', 'Output in JSON format')
    .action(async (callsign: string | undefined, options: any) => {
      try {
        const apiUrl = getApiUrl();

        if (!callsign) {
          // Show all agents
          const response = await fetch(`${apiUrl}/api/v1/agents`);
          if (!response.ok) throw new Error(`API error: ${response.statusText}`);

          const data: any = await response.json();
          const agents = data.data?.agents || [];

          if (options.json) {
            console.log(JSON.stringify(agents, null, 2));
          } else {
            const stats: AgentStats = {
              total_agents: agents.length,
              active_agents: agents.filter((a: Agent) => a.status === 'idle' || a.status === 'busy').length,
              idle_agents: agents.filter((a: Agent) => a.status === 'idle').length,
              offline_agents: agents.filter((a: Agent) => a.status === 'offline').length,
              average_workload: agents.length > 0
                ? agents.reduce((sum: number, a: Agent) => sum + a.current_workload, 0) / agents.length
                : 0
            };

            console.log(chalk.green(`Found ${agents.length} agent${agents.length !== 1 ? 's' : ''}`));
            console.log(chalk.gray('─'.repeat(30)));
            console.log(`  Total: ${stats.total_agents}`);
            console.log(`  Active: ${chalk.green(stats.active_agents)}`);
            console.log(`  Idle: ${chalk.cyan(stats.idle_agents)}`);
            console.log(`  Offline: ${chalk.red(stats.offline_agents)}`);
            console.log(`  Avg Workload: ${stats.average_workload.toFixed(2)}`);
          }
        } else {
          // Show specific agent
          const response = await fetch(`http://localhost:${port}/api/v1/agents/${callsign}`);
          if (!response.ok) throw new Error('Agent not found');

          const data: any = await response.json();
          const agent = data.data || data;

          if (options.json) {
            console.log(JSON.stringify(agent, null, 2));
          } else {
            console.log(chalk.blue.bold(`Agent: ${agent.callsign}`));
            console.log(chalk.gray('═'.repeat(40)));
            console.log(`  ID: ${agent.id}`);
            console.log(`  Type: ${agent.agent_type}`);
            console.log(`  Status: ${agent.status}`);
            console.log(`  Workload: ${agent.current_workload}/${agent.max_workload}`);
            console.log(`  Last Heartbeat: ${new Date(agent.last_heartbeat).toLocaleString()}`);
            console.log(`  Created: ${new Date(agent.created_at).toLocaleString()}`);
            console.log(`  Updated: ${new Date(agent.updated_at).toLocaleString()}`);
          }
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to get agent status:'), error.message);
        process.exit(1);
      }
    });

  // Terminate agent
  agentsCmd
    .command('terminate <callsign>')
    .description('Terminate an agent')
    .action(async (callsign: string) => {
      try {
        const apiUrl = getApiUrl();

        const response = await fetch(`${apiUrl}/api/v1/agents/${callsign}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'offline' })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        console.log(chalk.green(`✅ Agent ${callsign} terminated`));
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to terminate agent:'), error.message);
        process.exit(1);
      }
    });

  // Check agent health
  agentsCmd
    .command('health [callsign]')
    .description('Check agent health status')
    .option('--json', 'Output in JSON format')
    .action(async (callsign: string | undefined, options: any) => {
      try {
        const apiUrl = getApiUrl();

        if (!callsign) {
          // Check all agents
          const response = await fetch(`${apiUrl}/api/v1/agents`);
          if (!response.ok) throw new Error(`API error: ${response.statusText}`);

          const data: any = await response.json();
          const agents = data.data?.agents || [];

          const health = agents.map((agent: Agent) => ({
            callsign: agent.callsign,
            status: agent.status,
            healthy: agent.status !== 'offline' && agent.status !== 'error'
          }));

          if (options.json) {
            console.log(JSON.stringify(health, null, 2));
          } else {
            console.log(chalk.blue.bold('Agent Health'));
            console.log(chalk.gray('═'.repeat(40)));
            for (const h of health) {
              const icon = h.healthy ? chalk.green('✓') : chalk.red('✗');
              console.log(`  ${icon} ${h.callsign}: ${h.status}`);
            }
          }
        } else {
          // Check specific agent
          const response = await fetch(`http://localhost:${port}/api/v1/agents/${callsign}`);
          if (!response.ok) throw new Error('Agent not found');

          const data: any = await response.json();
          const agent = data.data || data;

          const health = {
            callsign: agent.callsign,
            status: agent.status,
            healthy: agent.status !== 'offline' && agent.status !== 'error',
            last_heartbeat: agent.last_heartbeat,
            workload: `${agent.current_workload}/${agent.max_workload}`
          };

          if (options.json) {
            console.log(JSON.stringify(health, null, 2));
          } else {
            const icon = health.healthy ? chalk.green('✓') : chalk.red('✗');
            console.log(`${icon} Agent ${health.callsign}`);
            console.log(`  Status: ${agent.status}`);
            console.log(`  Healthy: ${health.healthy}`);
            console.log(`  Last Heartbeat: ${new Date(health.last_heartbeat).toLocaleString()}`);
            console.log(`  Workload: ${health.workload}`);
          }
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to check health:'), error.message);
        process.exit(1);
      }
    });

  // Monitor agent resources
  agentsCmd
    .command('resources [callsign]')
    .description('Monitor agent resource usage')
    .option('--json', 'Output in JSON format')
    .action(async (callsign: string | undefined, options: any) => {
      try {
        const apiUrl = getApiUrl();

        if (!callsign) {
          // Show resources for all agents
          const response = await fetch(`${apiUrl}/api/v1/agents`);
          if (!response.ok) throw new Error(`API error: ${response.statusText}`);

          const data: any = await response.json();
          const agents = data.data?.agents || [];

          const resources = agents.map((agent: Agent) => ({
            callsign: agent.callsign,
            workload: agent.current_workload,
            capacity: agent.max_workload,
            utilization: `${Math.round((agent.current_workload / agent.max_workload) * 100)}%`
          }));

          if (options.json) {
            console.log(JSON.stringify(resources, null, 2));
          } else {
            console.log(chalk.blue.bold('Agent Resources'));
            console.log(chalk.gray('═'.repeat(60)));
            for (const r of resources) {
              console.log(`  ${r.callsign}: ${r.workload}/${r.capacity} (${r.utilization})`);
            }
          }
        } else {
          // Show resources for specific agent
          const response = await fetch(`http://localhost:${port}/api/v1/agents/${callsign}`);
          if (!response.ok) throw new Error('Agent not found');

          const data: any = await response.json();
          const agent = data.data || data;

          const utilization = Math.round((agent.current_workload / agent.max_workload) * 100);

          if (options.json) {
            console.log(JSON.stringify({
              callsign: agent.callsign,
              workload: agent.current_workload,
              capacity: agent.max_workload,
              utilization: `${utilization}%`
            }, null, 2));
          } else {
            console.log(chalk.blue.bold(`Resources: ${agent.callsign}`));
            console.log(chalk.gray('═'.repeat(40)));
            console.log(`  Workload: ${agent.current_workload}/${agent.max_workload}`);
            console.log(`  Utilization: ${utilization}%`);
            const barLength = 20;
            const filledLength = Math.round((utilization / 100) * barLength);
            const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
            console.log(`  [${bar}]`);
          }
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to get resources:'), error.message);
        process.exit(1);
      }
    });
}
