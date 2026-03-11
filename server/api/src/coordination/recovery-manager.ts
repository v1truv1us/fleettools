/**
 * Recovery Manager for FleetTools Checkpoint/Resume System
 *
 * Handles restoring system state from checkpoints including:
 * - Agent state restoration
 * - Task recovery
 * - Lock restoration
 * - Message queue recovery
 */

import { AgentSpawner, AgentType, AgentStatus } from './agent-spawner.js';
import { CheckpointManager } from './checkpoint-routes.js';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

interface RecoveryPlan {
  checkpointId: string;
  missionId: string;
  agentsToRestore: AgentRestorePlan[];
  tasksToResume: TaskRestorePlan[];
  locksToRestore: LockRestorePlan[];
  estimatedDuration: number;
  risks: string[];
}

interface AgentRestorePlan {
  agentId: string;
  agentType: AgentType;
  previousState: any;
  task?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedRestoreTime: number;
}

interface TaskRestorePlan {
  taskId: string;
  missionId: string;
  previousState: any;
  assignedAgent?: string;
  progress: number;
  nextSteps: string[];
}

interface LockRestorePlan {
  lockId: string;
  filePath: string;
  originalAgent: string;
  purpose: string;
  needsConflictResolution: boolean;
}

export class RecoveryManager {
  private agentSpawner: AgentSpawner;
  private checkpointManager: CheckpointManager;
  private recoveryLogPath: string;

  constructor() {
    this.agentSpawner = new AgentSpawner();
    this.checkpointManager = new CheckpointManager();
    this.recoveryLogPath = path.join(process.cwd(), '.flightline', 'recovery.log');
  }

  /**
   * Create a recovery plan from a checkpoint
   */
  async createRecoveryPlan(checkpointId: string, force = false): Promise<RecoveryPlan> {
    console.log(`📋 Creating recovery plan for checkpoint: ${checkpointId}`);
    
    const checkpoint = await this.checkpointManager.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    // Analyze checkpoint and create restore plans
    const agentsToRestore = await this.analyzeAgentRestore(checkpoint);
    const tasksToResume = await this.analyzeTaskResume(checkpoint);
    const locksToRestore = await this.analyzeLockRestore(checkpoint);
    const risks = await this.assessRecoveryRisks(checkpoint, force);

    const plan: RecoveryPlan = {
      checkpointId,
      missionId: checkpoint.mission_id,
      agentsToRestore,
      tasksToResume,
      locksToRestore,
      estimatedDuration: this.calculateEstimatedDuration(agentsToRestore, tasksToResume),
      risks
    };

    await this.logRecoveryEvent('plan_created', {
      checkpointId,
      plan: this.sanitizePlanForLogging(plan)
    });

    return plan;
  }

  /**
   * Execute recovery from a checkpoint
   */
  async executeRecovery(checkpointId: string, options: {
    force?: boolean;
    dryRun?: boolean;
  } = {}): Promise<{
    success: boolean;
    restoredAgents: string[];
    restoredTasks: string[];
    restoredLocks: string[];
    errors: string[];
  }> {
    console.log(`🔄 Starting recovery from checkpoint: ${checkpointId}`);
    
    const plan = await this.createRecoveryPlan(checkpointId, options.force);
    
    if (options.dryRun) {
      console.log('🔍 DRY RUN - Recovery Plan:');
      console.log(JSON.stringify(plan, null, 2));
      return {
        success: true,
        restoredAgents: [],
        restoredTasks: [],
        restoredLocks: [],
        errors: []
      };
    }

    const result = {
      success: true,
      restoredAgents: [] as string[],
      restoredTasks: [] as string[],
      restoredLocks: [] as string[],
      errors: [] as string[]
    };

    try {
      // Phase 1: Restore agents in priority order
      console.log('🚀 Phase 1: Restoring agents...');
      for (const agentPlan of plan.agentsToRestore.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })) {
        try {
          const agentId = await this.restoreAgent(agentPlan);
          result.restoredAgents.push(agentId);
          console.log(`✅ Restored agent: ${agentId} (${agentPlan.agentType})`);
        } catch (error: any) {
          const errorMsg = `Failed to restore agent ${agentPlan.agentId}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      // Phase 2: Resume tasks
      console.log('📋 Phase 2: Resuming tasks...');
      for (const taskPlan of plan.tasksToResume) {
        try {
          const taskId = await this.resumeTask(taskPlan);
          result.restoredTasks.push(taskId);
          console.log(`✅ Resumed task: ${taskId}`);
        } catch (error: any) {
          const errorMsg = `Failed to resume task ${taskPlan.taskId}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      // Phase 3: Restore locks (if needed)
      console.log('🔒 Phase 3: Restoring locks...');
      for (const lockPlan of plan.locksToRestore) {
        try {
          const lockId = await this.restoreLock(lockPlan, options.force);
          result.restoredLocks.push(lockId);
          console.log(`✅ Restored lock: ${lockId}`);
        } catch (error: any) {
          const errorMsg = `Failed to restore lock ${lockPlan.lockId}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      result.success = result.errors.length === 0 || result.errors.length < this.calculateAcceptableErrorCount(plan);

      await this.logRecoveryEvent('recovery_completed', {
        checkpointId,
        result,
        plan: this.sanitizePlanForLogging(plan)
      });

      console.log(`🎉 Recovery ${result.success ? 'completed successfully' : 'completed with errors'}`);
      console.log(`   Agents restored: ${result.restoredAgents.length}`);
      console.log(`   Tasks resumed: ${result.restoredTasks.length}`);
      console.log(`   Locks restored: ${result.restoredLocks.length}`);
      console.log(`   Errors: ${result.errors.length}`);

      if (result.errors.length > 0) {
        console.log('\n⚠️  Recovery errors:');
        result.errors.forEach(error => console.log(`   - ${error}`));
      }

      return result;
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Recovery failed: ${error.message}`);
      
      await this.logRecoveryEvent('recovery_failed', {
        checkpointId,
        error: error.message,
        result
      });

      throw error;
    }
  }

  /**
   * Analyze what agents need to be restored
   */
  private async analyzeAgentRestore(checkpoint: any): Promise<AgentRestorePlan[]> {
    const plans: AgentRestorePlan[] = [];
    
    if (checkpoint.sorties && Array.isArray(checkpoint.sorties)) {
      for (const sortie of checkpoint.sorties) {
        if (sortie.status === 'in_progress' && sortie.assigned_to) {
          plans.push({
            agentId: `agt_${randomUUID()}`,
            agentType: this.mapSortieToAgentType(sortie.assigned_to),
            previousState: sortie,
            task: sortie.description || sortie.title,
            priority: this.determineAgentPriority(sortie),
            estimatedRestoreTime: this.estimateAgentRestoreTime(sortie)
          });
        }
      }
    }

    return plans;
  }

  /**
   * Analyze what tasks need to be resumed
   */
  private async analyzeTaskResume(checkpoint: any): Promise<TaskRestorePlan[]> {
    const plans: TaskRestorePlan[] = [];
    
    if (checkpoint.sorties && Array.isArray(checkpoint.sorties)) {
      for (const sortie of checkpoint.sorties) {
        if (sortie.status !== 'completed') {
          plans.push({
            taskId: sortie.id,
            missionId: checkpoint.mission_id,
            previousState: sortie,
            assignedAgent: sortie.assigned_to,
            progress: sortie.progress || 0,
            nextSteps: this.generateNextSteps(sortie, checkpoint.recovery_context)
          });
        }
      }
    }

    return plans;
  }

  /**
   * Analyze what locks need to be restored
   */
  private async analyzeLockRestore(checkpoint: any): Promise<LockRestorePlan[]> {
    const plans: LockRestorePlan[] = [];
    
    if (checkpoint.active_locks && Array.isArray(checkpoint.active_locks)) {
      for (const lock of checkpoint.active_locks) {
        plans.push({
          lockId: `lock_${randomUUID()}`,
          filePath: lock.file,
          originalAgent: lock.held_by,
          purpose: lock.purpose,
          needsConflictResolution: true // Always check for conflicts on resume
        });
      }
    }

    return plans;
  }

  /**
   * Assess potential recovery risks
   */
  private async assessRecoveryRisks(checkpoint: any, force: boolean): Promise<string[]> {
    const risks: string[] = [];
    const checkpointAge = Date.now() - new Date(checkpoint.timestamp).getTime();
    const ageHours = checkpointAge / (1000 * 60 * 60);

    if (ageHours > 24) {
      risks.push(`Checkpoint is ${Math.round(ageHours)} hours old - environment may have changed`);
    }

    if (checkpoint.active_locks && checkpoint.active_locks.length > 0) {
      risks.push('Active locks may conflict with current state');
    }

    if (!force && await this.hasActiveAgents()) {
      risks.push('Active agents detected - use --force to override');
    }

    const agentCount = checkpoint.sorties?.filter((s: any) => s.status === 'in_progress').length || 0;
    if (agentCount > 5) {
      risks.push(`High agent count (${agentCount}) may impact recovery performance`);
    }

    return risks;
  }

  /**
   * Restore an individual agent
   */
  private async restoreAgent(plan: AgentRestorePlan): Promise<string> {
    const spawnRequest = {
      type: plan.agentType,
      task: plan.task,
      metadata: {
        restoredFromCheckpoint: plan.agentId,
        previousState: plan.previousState,
        restoreTimestamp: new Date().toISOString()
      },
      config: {
        timeout: 300000, // 5 minutes
        retries: 2
      }
    };

    const agent = await this.agentSpawner.spawn(spawnRequest);
    return agent.id;
  }

  /**
   * Resume an individual task
   */
  private async resumeTask(plan: TaskRestorePlan): Promise<string> {
    // In a real implementation, this would integrate with the task queue
    // For now, simulate task resumption
    console.log(`   Resuming task ${plan.taskId} with ${plan.progress}% progress`);
    
    // Send task resumption to task queue system
    const taskResume = {
      taskId: plan.taskId,
      missionId: plan.missionId,
      previousState: plan.previousState,
      progress: plan.progress,
      nextSteps: plan.nextSteps,
      resumedAt: new Date().toISOString()
    };

    // This would integrate with the actual task system
    return plan.taskId;
  }

  /**
   * Restore an individual lock
   */
  private async restoreLock(plan: LockRestorePlan, force = false): Promise<string> {
    if (plan.needsConflictResolution && !force) {
      // Check for existing conflicts
      const hasConflict = await this.checkLockConflict(plan.filePath);
      if (hasConflict) {
        throw new Error(`Lock conflict detected on ${plan.filePath}. Use --force to override.`);
      }
    }

    // Restore lock via lock API
    const lockRestore = {
      file: plan.filePath,
      specialist_id: plan.originalAgent,
      purpose: plan.purpose,
      timeout_ms: 3600000 // 1 hour
    };

    const response = await fetch('http://localhost:3001/api/v1/lock/acquire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lockRestore)
    });

    if (!response.ok) {
      const errorData = await response.json() as any;
      throw new Error(`Lock restore failed: ${errorData?.error || 'Unknown error'}`);
    }

    const result = await response.json() as any;
    return result.lock.id;
  }

  /**
   * Check if there are active agents
   */
  private async hasActiveAgents(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:3001/api/v1/agents');
      if (!response.ok) return false;
      
      const data = await response.json() as any;
      return data.success && data.data?.agents?.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check for lock conflicts
   */
  private async checkLockConflict(filePath: string): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:3001/api/v1/locks`);
      if (!response.ok) return false;
      
      const data = await response.json() as any;
      if (!data.success) return false;
      
      const locks = data.data?.locks || [];
      return locks.some((lock: any) => lock.file === filePath && lock.status === 'active');
    } catch {
      return false;
    }
  }

  /**
   * Map sortie assignment to agent type
   */
  private mapSortieToAgentType(assignment: string): AgentType {
    const type = assignment.toLowerCase();
    
    if (type.includes('frontend') || type.includes('ui')) return AgentType.FRONTEND;
    if (type.includes('backend') || type.includes('api')) return AgentType.BACKEND;
    if (type.includes('test') || type.includes('qa')) return AgentType.TESTING;
    if (type.includes('doc') || type.includes('write')) return AgentType.DOCUMENTATION;
    if (type.includes('security') || type.includes('audit')) return AgentType.SECURITY;
    if (type.includes('perf') || type.includes('optim')) return AgentType.PERFORMANCE;
    
    return AgentType.BACKEND; // Default
  }

  /**
   * Determine agent priority based on state
   */
  private determineAgentPriority(sortie: any): 'high' | 'medium' | 'low' {
    if (sortie.priority === 'critical') return 'high';
    if (sortie.progress > 50) return 'medium';
    return 'low';
  }

  /**
   * Estimate agent restore time in seconds
   */
  private estimateAgentRestoreTime(sortie: any): number {
    const baseTime = 30; // 30 seconds base
    const progressBonus = (sortie.progress || 0) * 0.5; // Faster if already progress
    return Math.max(baseTime - progressBonus, 10);
  }

  /**
   * Generate next steps for task resumption
   */
  private generateNextSteps(sortie: any, recoveryContext: any): string[] {
    const steps: string[] = [];
    
    if (recoveryContext?.next_steps && Array.isArray(recoveryContext.next_steps)) {
      steps.push(...recoveryContext.next_steps);
    } else {
      steps.push(`Continue ${sortie.title || 'task'}`);
      
      if (sortie.progress < 100) {
        steps.push(`Complete remaining ${100 - (sortie.progress || 0)}%`);
      }
    }
    
    return steps;
  }

  /**
   * Calculate estimated total duration
   */
  private calculateEstimatedDuration(agents: AgentRestorePlan[], tasks: TaskRestorePlan[]): number {
    const agentTime = agents.reduce((sum, agent) => sum + agent.estimatedRestoreTime, 0);
    const taskTime = tasks.length * 10; // 10 seconds per task
    return agentTime + taskTime + 30; // 30 seconds overhead
  }

  /**
   * Calculate acceptable error count
   */
  private calculateAcceptableErrorCount(plan: RecoveryPlan): number {
    const totalItems = plan.agentsToRestore.length + plan.tasksToResume.length + plan.locksToRestore.length;
    return Math.max(1, Math.floor(totalItems * 0.1)); // 10% failure rate acceptable
  }

  /**
   * Sanitize plan for logging
   */
  private sanitizePlanForLogging(plan: RecoveryPlan): any {
    return {
      ...plan,
      agentsToRestore: plan.agentsToRestore.map(a => ({
        ...a,
        previousState: '[REDACTED]'
      })),
      tasksToResume: plan.tasksToResume.map(t => ({
        ...t,
        previousState: '[REDACTED]'
      }))
    };
  }

  /**
   * Log recovery events
   */
  private async logRecoveryEvent(eventType: string, data: any): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      data
    };

    try {
      await Bun.write(
        this.recoveryLogPath,
        JSON.stringify(logEntry) + '\n',
        { createPath: true }
      );
    } catch (error: any) {
      console.warn('Failed to write recovery log:', error?.message || error);
    }
  }
}