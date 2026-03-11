/**
 * Fleet Resume Command
 *
 * Resume missions from checkpoints
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadProjectConfig, isFleetProject } from '@fleettools/shared';

interface RecoveryResult {
  success: boolean;
  checkpointId: string;
  restoredAgents: number;
  restoredTasks: number;
  restoredLocks: number;
  errors: string[];
  summary: string;
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

export function registerResumeCommand(program: Command): void {
  program
    .command('resume')
    .description('Resume a mission from a checkpoint')
    .option('--checkpoint <id>', 'Resume from specific checkpoint ID')
    .option('--mission <id>', 'Resume mission from its latest checkpoint')
    .option('--dry-run', 'Show what would be restored without executing')
    .option('--force', 'Skip confirmation prompts')
    .option('--json', 'Output in JSON format')
    .action(async (options: any) => {
      try {
        const apiUrl = getApiUrl();
        let checkpointId: string | undefined;

        // Determine checkpoint to resume from
        if (options.checkpoint) {
          checkpointId = options.checkpoint;
        } else if (options.mission) {
          // Get latest checkpoint for mission
          const response = await fetch(`${apiUrl}/api/v1/checkpoints/latest/${options.mission}`);
          if (!response.ok) {
            throw new Error('No checkpoints found for mission');
          }
          const data: any = await response.json();
          checkpointId = data.data?.id || data.id;
        } else {
          console.error(chalk.red('❌ Must specify --checkpoint or --mission'));
          console.log('\nUsage:');
          console.log('  fleet resume --checkpoint <id>         Resume from specific checkpoint');
          console.log('  fleet resume --mission <id>            Resume from latest mission checkpoint');
          console.log('  fleet resume --checkpoint <id> --dry-run  Preview recovery plan');
          process.exit(1);
        }

        if (!checkpointId) {
          throw new Error('Could not determine checkpoint ID');
        }

        // Get checkpoint details
        const checkpointResponse = await fetch(`${apiUrl}/api/v1/checkpoints/${checkpointId}`);
        if (!checkpointResponse.ok) {
          throw new Error(`Checkpoint not found: ${checkpointId}`);
        }

        const checkpointData: any = await checkpointResponse.json();
        const checkpoint = checkpointData.data || checkpointData;

        if (!options.json && !options.dryRun) {
          console.log(chalk.blue.bold('Recovery Plan'));
          console.log(chalk.gray('═'.repeat(60)));
          console.log(`  Checkpoint ID: ${checkpoint.id}`);
          console.log(`  Mission: ${checkpoint.mission_id}`);
          console.log(`  Created: ${new Date(checkpoint.timestamp).toLocaleString()}`);
          console.log(`  Progress: ${checkpoint.progress_percent || 0}%`);
          console.log();

          if (checkpoint.sorties && checkpoint.sorties.length > 0) {
            console.log(`  Will restore ${checkpoint.sorties.length} sortie(s)`);
          }
          if (checkpoint.active_locks && checkpoint.active_locks.length > 0) {
            console.log(`  Will restore ${checkpoint.active_locks.length} lock(s)`);
          }
          if (checkpoint.pending_messages && checkpoint.pending_messages.length > 0) {
            console.log(`  Will restore ${checkpoint.pending_messages.length} message(s)`);
          }
          console.log();

          if (!options.force) {
            console.log(chalk.yellow('Ready to resume. Use --force to proceed, or --dry-run to preview.'));
            process.exit(0);
          }
        }

        if (options.dryRun) {
          // Show what would be recovered
          const recovery = {
            checkpointId: checkpoint.id,
            mission: checkpoint.mission_id,
            timestamp: checkpoint.timestamp,
            progress: checkpoint.progress_percent || 0,
            recovery_plan: {
              sorties: checkpoint.sorties?.length || 0,
              locks: checkpoint.active_locks?.length || 0,
              messages: checkpoint.pending_messages?.length || 0
            },
            recovery_context: checkpoint.recovery_context || {}
          };

          if (options.json) {
            console.log(JSON.stringify(recovery, null, 2));
          } else {
            console.log(chalk.blue.bold('Recovery Plan (Dry Run)'));
            console.log(chalk.gray('═'.repeat(60)));
            console.log(JSON.stringify(recovery, null, 2));
          }
          return;
        }

        // Execute recovery
        console.log(chalk.cyan('Executing recovery...'));

        const recoveryResponse = await fetch(`${apiUrl}/api/v1/checkpoints/${checkpointId}/resume`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            force: options.force,
            dryRun: false
          })
        });

        if (!recoveryResponse.ok) {
          throw new Error(`Recovery failed: ${recoveryResponse.statusText}`);
        }

        const result: any = await recoveryResponse.json();
        const recovery: RecoveryResult = result.data || result;

        if (options.json) {
          console.log(JSON.stringify(recovery, null, 2));
        } else {
          if (recovery.success) {
            console.log(chalk.green('✓ Recovery successful'));
          } else {
            console.log(chalk.yellow('⚠ Recovery completed with warnings'));
          }

          console.log();
          console.log(chalk.blue.bold('Recovery Results'));
          console.log(chalk.gray('═'.repeat(60)));
          console.log(`  Checkpoint: ${recovery.checkpointId}`);
          console.log(`  Restored Agents: ${recovery.restoredAgents}`);
          console.log(`  Restored Tasks: ${recovery.restoredTasks}`);
          console.log(`  Restored Locks: ${recovery.restoredLocks}`);

          if (recovery.errors && recovery.errors.length > 0) {
            console.log();
            console.log(chalk.yellow('Errors:'));
            for (const error of recovery.errors) {
              console.log(`  - ${error}`);
            }
          }

          console.log();
          console.log(chalk.green('✓ Mission resumed successfully'));
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Resume failed:'), error.message);
        if (process.argv.includes('--verbose')) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
}
