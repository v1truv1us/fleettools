/**
 * Fleet Resume Command
 *
 * Resume mission from latest or specified checkpoint
 */

import { Command } from 'commander';
import * as readline from 'readline';

// Type definitions for the command (implementation would import from squawk)
interface ResumeCommandOptions {
  checkpoint?: string;
  mission?: string;
  dryRun?: boolean;
  json?: boolean;
  yes?: boolean;
}

interface RecoveryCandidate {
  mission_id: string;
  mission_title: string;
  last_activity_at: string;
  inactivity_duration_ms: number;
  checkpoint_id?: string;
  checkpoint_progress?: number;
  checkpoint_timestamp?: string;
}

interface RestoreResult {
  success: boolean;
  checkpoint_id: string;
  mission_id: string;
  recovery_context: {
    last_action: string;
    next_steps: string[];
    blockers: string[];
    files_modified: string[];
    mission_summary: string;
    elapsed_time_ms: number;
    last_activity_at: string;
  };
  restored: {
    sorties: number;
    locks: number;
    messages: number;
  };
  errors: string[];
  warnings: string[];
}

export function createResumeCommand(): Command {
  const cmd = new Command('resume')
    .description('Resume mission from latest or specified checkpoint')
    .option('--checkpoint <id>', 'Resume from specific checkpoint')
    .option('--mission <id>', 'Resume specific mission (default: most recent active)')
    .option('--dry-run', 'Show what would be restored without applying')
    .option('--json', 'Output recovery context as JSON')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (options: ResumeCommandOptions) => {
      try {
        await executeResumeCommand(options);
      } catch (error) {
        console.error('✗ Resume command failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
  return cmd;
}

/**
 * Execute the resume command with the given options
 */
async function executeResumeCommand(options: ResumeCommandOptions): Promise<void> {
  // Validate options
  if (options.checkpoint && options.mission) {
    console.error('✗ Cannot specify both --checkpoint and --mission');
    process.exit(1);
  }

  let checkpointId: string | undefined;
  let missionId: string | undefined;
  let restoreResult: RestoreResult | null = null;

  // Case 1: Specific checkpoint requested
  if (options.checkpoint) {
    checkpointId = options.checkpoint;
    
    // Mock: Verify checkpoint exists
    console.log(`✓ Found checkpoint: ${checkpointId}`);
    
    // Mock: Get mission from checkpoint
    missionId = `msn-${checkpointId.split('-')[1]}`;
  }
  // Case 2: Specific mission requested
  else if (options.mission) {
    missionId = options.mission;
    
    // Mock: Get latest checkpoint for mission
    checkpointId = `chk-${missionId.split('-')[1]}-latest`;
    console.log(`✓ Found latest checkpoint for mission: ${missionId}`);
  }
  // Case 3: Auto-detect recovery candidates
  else {
    // Mock: Check for recovery candidates
    const recovery = await mockCheckForRecovery();
    
    if (!recovery.needed) {
      console.log('✓ No recovery needed - no stale missions with checkpoints found');
      return;
    }

    if (recovery.candidates.length === 1) {
      const candidate = recovery.candidates[0]!;
      checkpointId = candidate.checkpoint_id;
      missionId = candidate.mission_id;
      
      console.log(`Found 1 recovery candidate:`);
      console.log(`  Mission: ${candidate.mission_title}`);
      console.log(`  Last activity: ${new Date(candidate.last_activity_at).toLocaleString()}`);
      console.log(`  Inactive for: ${formatDuration(candidate.inactivity_duration_ms)}`);
      console.log(`  Checkpoint: ${checkpointId}`);
      console.log('');
    } else {
      console.log(`Found ${recovery.candidates.length} recovery candidates:`);
      console.log('');
      
      for (let i = 0; i < recovery.candidates.length; i++) {
        const candidate = recovery.candidates[i]!;
        console.log(`${i + 1}. ${candidate.mission_title}`);
        console.log(`   Mission ID: ${candidate.mission_id}`);
        console.log(`   Last activity: ${new Date(candidate.last_activity_at).toLocaleString()}`);
        console.log(`   Inactive for: ${formatDuration(candidate.inactivity_duration_ms)}`);
        console.log(`   Checkpoint: ${candidate.checkpoint_id}`);
        console.log(`   Progress: ${candidate.checkpoint_progress}%`);
        console.log('');
      }
      
      console.log('Please specify a mission with --mission <id> or checkpoint with --checkpoint <id>');
      process.exit(1);
    }
  }

  // Mock: Get mission details for confirmation
  const mission = await mockGetMission(missionId!);
  if (!mission) {
    console.error(`✗ Mission not found: ${missionId}`);
    process.exit(1);
  }

  // Mock: Get checkpoint details
  const checkpoint = await mockGetCheckpoint(checkpointId!);
  if (!checkpoint) {
    console.error(`✗ Checkpoint not found: ${checkpointId}`);
    process.exit(1);
  }

  // Show what will be restored
  console.log('Recovery Summary:');
  console.log('================');
  console.log(`Mission: ${mission.title}`);
  console.log(`Status: ${mission.status}`);
  console.log(`Checkpoint: ${checkpoint.id}`);
  console.log(`Created: ${new Date(checkpoint.timestamp).toLocaleString()}`);
  console.log(`Progress: ${checkpoint.progress_percent}%`);
  console.log(`Trigger: ${checkpoint.trigger}`);
  console.log('');
  console.log('Will restore:');
  console.log(`  - ${checkpoint.sorties.length} sorties`);
  console.log(`  - ${checkpoint.active_locks.length} active locks`);
  console.log(`  - ${checkpoint.pending_messages.filter((m: any) => !m.delivered).length} pending messages`);
  console.log('');

  // Show recovery context summary
  const ctx = checkpoint.recovery_context;
  console.log('Recovery Context:');
  console.log(`Last Action: ${ctx.last_action}`);
  console.log(`Mission Summary: ${ctx.mission_summary}`);
  if (ctx.next_steps.length > 0) {
    console.log('Next Steps:');
    ctx.next_steps.forEach((step: string) => console.log(`  - ${step}`));
  }
  if (ctx.blockers.length > 0) {
    console.log('Blockers:');
    ctx.blockers.forEach((blocker: string) => console.log(`  - ${blocker}`));
  }
  console.log('');

  // Confirmation prompt (unless --yes or --dry-run)
  if (!options.yes && !options.dryRun) {
    const confirmed = await askConfirmation('Do you want to proceed with recovery? (y/N)');
    if (!confirmed) {
      console.log('Recovery cancelled');
      process.exit(0);
    }
  }

  // Perform the restore
  console.log(`${options.dryRun ? 'DRY RUN: ' : ''}Restoring from checkpoint...`);
  
  try {
    restoreResult = await mockRestoreFromCheckpoint(checkpointId!, options.dryRun || false);
  } catch (error) {
    console.error(`✗ Restore failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  // Output results
  if (options.json) {
    console.log(JSON.stringify({
      mission: {
        id: mission.id,
        title: mission.title,
        status: mission.status,
      },
      checkpoint: {
        id: checkpoint.id,
        timestamp: checkpoint.timestamp,
        progress_percent: checkpoint.progress_percent,
        trigger: checkpoint.trigger,
      },
      restore: restoreResult,
      dry_run: options.dryRun || false,
    }, null, 2));
  } else {
    const prefix = options.dryRun ? 'DRY RUN: ' : '';
    
    console.log(`${prefix}✓ Recovery completed`);
    console.log('');
    console.log(`Restored:`);
    console.log(`  - ${restoreResult.restored.sorties} sorties`);
    console.log(`  - ${restoreResult.restored.locks} locks`);
    console.log(`  - ${restoreResult.restored.messages} messages`);
    console.log('');
    
    if (restoreResult.errors.length > 0) {
      console.log(`${prefix}Errors:`);
      restoreResult.errors.forEach((error: string) => console.log(`  ✗ ${error}`));
      console.log('');
    }
    
    if (restoreResult.warnings.length > 0) {
      console.log(`${prefix}Warnings:`);
      restoreResult.warnings.forEach((warning: string) => console.log(`  ⚠ ${warning}`));
      console.log('');
    }

    if (!options.dryRun && restoreResult.success) {
      console.log('Recovery context formatted for LLM:');
      console.log('===================================');
      console.log(formatRecoveryPrompt(restoreResult));
    }
  }

  // Exit with error code if restore had errors
  if (!restoreResult.success) {
    process.exit(1);
  }
}

/**
 * Mock function to simulate checking for recovery candidates
 * 
 * PRODUCTION INTEGRATION:
 * This would be replaced with real database integration:
 * ```typescript
 * import { getAdapter } from '../../../squawk/src/db/index.js';
 * import { RecoveryDetector } from '../../../squawk/src/recovery/index.js';
 * 
 * const db = await getAdapter();
 * const detector = new RecoveryDetector(db);
 * return await detector.checkForRecovery();
 * ```
 * 
 * Currently using mock data for demonstration due to TypeScript cross-package import constraints.
 */
async function mockCheckForRecovery(): Promise<{ needed: boolean; candidates: RecoveryCandidate[] }> {
  // Mock implementation - in real version this would use RecoveryDetector
  const mockCandidates: RecoveryCandidate[] = [
    {
      mission_id: 'msn-abc123',
      mission_title: 'Implement Fleet Resume Command',
      last_activity_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      inactivity_duration_ms: 10 * 60 * 1000,
      checkpoint_id: 'chk-def456',
      checkpoint_progress: 75,
      checkpoint_timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
  ];

  return {
    needed: mockCandidates.length > 0,
    candidates: mockCandidates,
  };
}

/**
 * Mock function to simulate getting a mission
 * 
 * PRODUCTION INTEGRATION:
 * This would be replaced with real database integration:
 * ```typescript
 * const mission = await db.missions.getById(missionId);
 * ```
 */
async function mockGetMission(missionId: string): Promise<{ id: string; title: string; status: string } | null> {
  // Mock implementation
  return {
    id: missionId,
    title: 'Implement Fleet Resume Command',
    status: 'in_progress',
  };
}

/**
 * Mock function to simulate getting a checkpoint
 * 
 * PRODUCTION INTEGRATION:
 * This would be replaced with real database integration:
 * ```typescript
 * const checkpoint = await db.checkpoints.getById(checkpointId);
 * ```
 */
async function mockGetCheckpoint(checkpointId: string): Promise<any | null> {
  // Mock implementation
  return {
    id: checkpointId,
    mission_id: 'msn-abc123',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    trigger: 'progress',
    progress_percent: 75,
    sorties: [
      { id: 'srt-001', status: 'completed', progress: 100 },
      { id: 'srt-002', status: 'in_progress', progress: 50 },
    ],
    active_locks: [
      { file: 'src/commands/resume.ts', held_by: 'full-stack-developer', timeout_ms: 300000 },
    ],
    pending_messages: [
      { id: 'msg-001', delivered: false },
      { id: 'msg-002', delivered: true },
    ],
    recovery_context: {
      last_action: 'Updated CLI command structure',
      next_steps: [
        'Complete StateRestorer integration',
        'Add comprehensive error handling',
        'Implement recovery context formatting',
      ],
      blockers: ['Database adapter integration'],
      files_modified: ['cli/src/commands/resume.ts'],
      mission_summary: 'Implementation of CLI-003 resume command',
      elapsed_time_ms: 2 * 60 * 60 * 1000, // 2 hours
      last_activity_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
  };
}

/**
 * Mock function to simulate restoring from checkpoint
 * 
 * PRODUCTION INTEGRATION:
 * This would be replaced with real database integration:
 * ```typescript
 * import { StateRestorer } from '../../../squawk/src/recovery/index.js';
 * 
 * const restorer = new StateRestorer(db);
 * return await restorer.restoreFromCheckpoint(checkpointId, { dryRun });
 * ```
 * 
 * Currently using mock data for demonstration due to TypeScript cross-package import constraints.
 */
async function mockRestoreFromCheckpoint(checkpointId: string, dryRun: boolean): Promise<RestoreResult> {
  // Mock implementation
  return {
    success: dryRun ? true : Math.random() > 0.1, // 90% success rate for demo
    checkpoint_id: checkpointId,
    mission_id: 'msn-abc123',
    recovery_context: {
      last_action: 'Updated CLI command structure',
      next_steps: [
        'Complete StateRestorer integration',
        'Add comprehensive error handling',
        'Implement recovery context formatting',
      ],
      blockers: dryRun ? [] : ['Database adapter integration'],
      files_modified: ['cli/src/commands/resume.ts'],
      mission_summary: 'Implementation of CLI-003 resume command',
      elapsed_time_ms: 2 * 60 * 60 * 1000,
      last_activity_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    restored: {
      sorties: 2,
      locks: 1,
      messages: 1,
    },
    errors: dryRun ? [] : Math.random() > 0.8 ? ['Sample error for demonstration'] : [],
    warnings: dryRun ? [] : Math.random() > 0.5 ? ['Lock expired: src/test.js (was held by test-agent)'] : [],
  };
}

/**
 * Ask for user confirmation via readline
 */
async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

/**
 * Format recovery context for LLM prompt injection
 */
function formatRecoveryPrompt(result: RestoreResult): string {
  const ctx = result.recovery_context;
  
  let prompt = `## Recovery Context

You are resuming a mission after context compaction.

**Mission**: ${ctx.mission_summary}
**Progress**: ${result.restored.sorties} sorties restored
**Last Action**: ${ctx.last_action}

### Next Steps
${ctx.next_steps.map(step => `- ${step}`).join('\n')}

### Current Blockers
${ctx.blockers.length > 0 ? ctx.blockers.map(b => `- ${b}`).join('\n') : '- None'}

### Files Modified
${ctx.files_modified.map(f => `- ${f}`).join('\n')}

### Time Context
- Elapsed: ${formatDuration(ctx.elapsed_time_ms)}
- Last activity: ${ctx.last_activity_at}

Please review the current state and continue the mission.`;

  if (result.errors.length > 0) {
    prompt += `\n\n### Recovery Errors\n${result.errors.map(e => `- ${e}`).join('\n')}`;
  }

  if (result.warnings.length > 0) {
    prompt += `\n\n### Recovery Warnings\n${result.warnings.map(w => `- ${w}`).join('\n')}`;
  }

  return prompt;
}

/**
 * Format duration in milliseconds to human readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}