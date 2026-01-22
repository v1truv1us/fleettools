/**
 * Fleet Checkpoints Command
 *
 * Manage checkpoint/recovery points for FleetTools missions
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadProjectConfig, isFleetProject } from '@fleettools/shared';

interface Checkpoint {
  id: string;
  mission_id: string;
  timestamp: string;
  trigger: 'manual' | 'auto' | 'error' | 'completion';
  trigger_details?: string;
  progress_percent?: number;
  sorties?: any[];
  active_locks?: any[];
  pending_messages?: any[];
  recovery_context?: Record<string, any>;
  created_by: string;
  version: string;
}

/**
 * Get API port from project config
 */
function getApiPort(): number {
  if (!isFleetProject()) {
    throw new Error('Not in a FleetTools project');
  }

  const config = loadProjectConfig();
  if (!config) {
    throw new Error('Failed to load project configuration');
  }

  return config.services.api.port || 3001;
}

export function registerCheckpointCommands(program: Command): void {
  const checkpointsCmd = program
    .command('checkpoints')
    .description('Manage mission checkpoints and recovery points');

  // List checkpoints
  checkpointsCmd
    .command('list [mission]')
    .alias('ls')
    .description('List checkpoints for a mission')
    .option('--json', 'Output in JSON format')
    .action(async (missionId: string | undefined, options: any) => {
      try {
        if (!missionId) {
          console.error(chalk.red('❌ Mission ID is required'));
          console.log('Usage: fleet checkpoints list <mission-id>');
          process.exit(1);
        }

        const port = getApiPort();
        const response = await fetch(`http://localhost:${port}/api/v1/checkpoints?mission_id=${missionId}`);

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data: any = await response.json();
        const checkpoints = data.data || [];

        if (options.json) {
          console.log(JSON.stringify(checkpoints, null, 2));
        } else {
          if (checkpoints.length === 0) {
            console.log(chalk.yellow('No checkpoints found for this mission'));
            return;
          }

          console.log(chalk.blue.bold(`Checkpoints for Mission: ${missionId}`));
          console.log(chalk.gray('═'.repeat(80)));
          console.log();

          for (const checkpoint of checkpoints) {
            const triggerColor = checkpoint.trigger === 'error' ? chalk.red :
                                checkpoint.trigger === 'completion' ? chalk.green :
                                checkpoint.trigger === 'auto' ? chalk.cyan : chalk.yellow;

            console.log(`${chalk.bold(checkpoint.id)}`);
            console.log(`  Trigger: ${triggerColor(checkpoint.trigger)}`);
            console.log(`  Timestamp: ${new Date(checkpoint.timestamp).toLocaleString()}`);
            console.log(`  Progress: ${checkpoint.progress_percent || 0}%`);
            console.log(`  Version: ${checkpoint.version}`);
            console.log(`  Created By: ${checkpoint.created_by}`);
            if (checkpoint.trigger_details) {
              console.log(`  Details: ${checkpoint.trigger_details}`);
            }
            console.log();
          }
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to list checkpoints:'), error.message);
        process.exit(1);
      }
    });

  // Show checkpoint details
  checkpointsCmd
    .command('show <checkpointId>')
    .description('Show detailed checkpoint information')
    .option('--json', 'Output in JSON format')
    .action(async (checkpointId: string, options: any) => {
      try {
        const port = getApiPort();
        const response = await fetch(`http://localhost:${port}/api/v1/checkpoints/${checkpointId}`);

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data: any = await response.json();
        const checkpoint = data.data || data;

        if (options.json) {
          console.log(JSON.stringify(checkpoint, null, 2));
        } else {
          console.log(chalk.blue.bold(`Checkpoint: ${checkpoint.id}`));
          console.log(chalk.gray('═'.repeat(60)));
          console.log();

          console.log(chalk.cyan('Basic Information:'));
          console.log(`  Mission ID: ${checkpoint.mission_id}`);
          console.log(`  Trigger: ${checkpoint.trigger}`);
          console.log(`  Timestamp: ${new Date(checkpoint.timestamp).toLocaleString()}`);
          console.log(`  Progress: ${checkpoint.progress_percent || 0}%`);
          console.log(`  Version: ${checkpoint.version}`);
          console.log(`  Created By: ${checkpoint.created_by}`);
          console.log();

          if (checkpoint.sorties && checkpoint.sorties.length > 0) {
            console.log(chalk.cyan(`Sorties (${checkpoint.sorties.length}):`));
            for (const sortie of checkpoint.sorties) {
              console.log(`  - ${sortie.id || sortie}`);
            }
            console.log();
          }

          if (checkpoint.active_locks && checkpoint.active_locks.length > 0) {
            console.log(chalk.cyan(`Active Locks (${checkpoint.active_locks.length}):`));
            for (const lock of checkpoint.active_locks) {
              console.log(`  - ${lock.id || lock}`);
            }
            console.log();
          }

          if (checkpoint.pending_messages && checkpoint.pending_messages.length > 0) {
            console.log(chalk.cyan(`Pending Messages (${checkpoint.pending_messages.length}):`));
            for (const msg of checkpoint.pending_messages.slice(0, 3)) {
              console.log(`  - ${msg.type || msg}`);
            }
            if (checkpoint.pending_messages.length > 3) {
              console.log(`  ... and ${checkpoint.pending_messages.length - 3} more`);
            }
            console.log();
          }

          if (checkpoint.recovery_context && Object.keys(checkpoint.recovery_context).length > 0) {
            console.log(chalk.cyan('Recovery Context:'));
            console.log(JSON.stringify(checkpoint.recovery_context, null, 2));
          }
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to show checkpoint:'), error.message);
        process.exit(1);
      }
    });

  // Prune old checkpoints
  checkpointsCmd
    .command('prune <mission>')
    .description('Delete old checkpoints (keeps last 5)')
    .option('--older-than <days>', 'Delete checkpoints older than N days (default: 30)', '30')
    .option('--keep <count>', 'Keep last N checkpoints (default: 5)', '5')
    .option('--force', 'Skip confirmation prompt')
    .action(async (missionId: string, options: any) => {
      try {
        const port = getApiPort();
        const olderThanDays = parseInt(options.olderThan, 10) || 30;
        const keepCount = parseInt(options.keep, 10) || 5;

        // Get all checkpoints
        const response = await fetch(`http://localhost:${port}/api/v1/checkpoints?mission_id=${missionId}`);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);

        const data: any = await response.json();
        const checkpoints = data.data || [];

        if (checkpoints.length === 0) {
          console.log(chalk.yellow('No checkpoints found'));
          return;
        }

        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        // Find checkpoints to delete
        const sortedByDate = [...checkpoints].sort((a: Checkpoint, b: Checkpoint) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        const toDelete = sortedByDate
          .slice(keepCount) // Keep first N
          .filter((c: Checkpoint) => new Date(c.timestamp) < cutoffDate);

        if (toDelete.length === 0) {
          console.log(chalk.green('✓ No checkpoints to prune'));
          return;
        }

        console.log(chalk.yellow(`Found ${toDelete.length} checkpoints to delete`));
        for (const checkpoint of toDelete.slice(0, 5)) {
          console.log(`  - ${checkpoint.id} (${new Date(checkpoint.timestamp).toLocaleDateString()})`);
        }
        if (toDelete.length > 5) {
          console.log(`  ... and ${toDelete.length - 5} more`);
        }

        if (!options.force) {
          console.log(chalk.yellow('\nUse --force to confirm deletion'));
          return;
        }

        // Delete checkpoints
        let deleted = 0;
        for (const checkpoint of toDelete) {
          try {
            const deleteResponse = await fetch(`http://localhost:${port}/api/v1/checkpoints/${checkpoint.id}`, {
              method: 'DELETE'
            });
            if (deleteResponse.ok) {
              deleted++;
            }
          } catch (err) {
            console.error(`Failed to delete ${checkpoint.id}:`, err);
          }
        }

        console.log(chalk.green(`✓ Deleted ${deleted} checkpoint(s)`));
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to prune checkpoints:'), error.message);
        process.exit(1);
      }
    });

  // Get latest checkpoint
  checkpointsCmd
    .command('latest <mission>')
    .description('Show the latest checkpoint for a mission')
    .option('--json', 'Output in JSON format')
    .action(async (missionId: string, options: any) => {
      try {
        const port = getApiPort();
        const response = await fetch(`http://localhost:${port}/api/v1/checkpoints/latest/${missionId}`);

        if (!response.ok) {
          throw new Error('No checkpoints found for mission');
        }

        const data: any = await response.json();
        const checkpoint = data.data || data;

        if (options.json) {
          console.log(JSON.stringify(checkpoint, null, 2));
        } else {
          console.log(chalk.blue.bold(`Latest Checkpoint: ${checkpoint.id}`));
          console.log(chalk.gray('═'.repeat(60)));
          console.log(`  Mission: ${checkpoint.mission_id}`);
          console.log(`  Trigger: ${checkpoint.trigger}`);
          console.log(`  Timestamp: ${new Date(checkpoint.timestamp).toLocaleString()}`);
          console.log(`  Progress: ${checkpoint.progress_percent || 0}%`);
          console.log();
          console.log(chalk.cyan('Quick Actions:'));
          console.log(`  fleet resume --checkpoint ${checkpoint.id}          Resume from this checkpoint`);
          console.log(`  fleet resume --checkpoint ${checkpoint.id} --dry-run  Preview recovery plan`);
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to get latest checkpoint:'), error.message);
        process.exit(1);
      }
    });
}
