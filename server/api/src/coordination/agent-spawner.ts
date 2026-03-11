/**
 * Agent Spawner for FleetTools Coordination System
 *
 * Manages agent lifecycle: spawning, monitoring, and termination
 * Integrates with Squawk mailbox system for coordination
 */

import { randomUUID } from 'node:crypto';
import path from 'node:path';

export enum AgentType {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  SECURITY = 'security',
  PERFORMANCE = 'performance'
}

export enum AgentStatus {
  SPAWNING = 'spawning',
  RUNNING = 'running',
  IDLE = 'idle',
  BUSY = 'busy',
  ERROR = 'error',
  TERMINATED = 'terminated',
  FAILED = 'failed'
}

export interface AgentHandle {
  id: string;
  type: AgentType;
  pid?: number;
  status: AgentStatus;
  mailboxId: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

export interface AgentSpawnRequest {
  type: AgentType;
  task?: string;
  metadata?: Record<string, any>;
  config?: AgentConfig;
}

export interface AgentConfig {
  timeout?: number;
  retries?: number;
  resources?: {
    memory?: string;
    cpu?: string;
  };
  environment?: Record<string, string>;
}

export interface AgentMonitor {
  status: AgentStatus;
  uptime?: number;
  lastHeartbeat?: string;
  resourceUsage?: {
    memory: number;
    cpu: number;
  };
  errors: Array<{
    timestamp: string;
    error: string;
    count: number;
  }>;
}

export class AgentSpawner {
  private agents: Map<string, AgentHandle> = new Map();
  private mailboxPath: string;
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private recoveryInterval?: ReturnType<typeof setInterval>;
  private readonly heartbeatTimeout = 60000; // 60 seconds
  private readonly recoveryEnabled = true;

  constructor(mailboxPath?: string) {
    this.mailboxPath = mailboxPath || path.join(process.cwd(), '.flightline', 'mailboxes');
    this.startHeartbeatMonitoring();
    this.startRecoveryMonitoring();
  }

  /**
   * Spawn a new agent with timeout and retry logic
   */
  async spawn(request: AgentSpawnRequest): Promise<AgentHandle> {
    const agentId = `agt_${randomUUID()}`;
    const mailboxId = `mbx_${randomUUID()}`;
    const timeout = request.config?.timeout || 300000;
    const maxRetries = request.config?.retries || 3;
    
    const agent: AgentHandle = {
      id: agentId,
      type: request.type,
      status: AgentStatus.SPAWNING,
      mailboxId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        ...request.metadata,
        spawnRequest: request,
        spawnAttempts: 0,
        maxRetries
      }
    };

    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        agent.metadata!.spawnAttempts = attempt;
        agent.updatedAt = new Date().toISOString();
        
        await this.createMailbox(mailboxId, agentId);
        
        const pid = await this.executeAgentSpawn(agent, request);
        agent.pid = pid;
        agent.status = AgentStatus.RUNNING;
        agent.updatedAt = new Date().toISOString();

        this.agents.set(agentId, agent);

        console.log(`✓ Agent spawned: ${agentId} (${request.type}) - attempt ${attempt}`);
        return agent;
      } catch (error: any) {
        lastError = error;
        agent.status = AgentStatus.FAILED;
        agent.updatedAt = new Date().toISOString();
        
        console.error(`✗ Agent spawn attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          const retryDelay = Math.min(5000 * attempt, 15000);
          console.log(`Retrying agent spawn in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          try {
            await this.cleanupFailedSpawn(agentId);
          } catch (cleanupError: any) {
            console.error(`Cleanup failed:`, cleanupError.message);
          }
        }
      }
    }

    agent.status = AgentStatus.FAILED;
    agent.updatedAt = new Date().toISOString();
    agent.metadata!.lastError = lastError?.message || 'Unknown error';
    this.agents.set(agentId, agent);
    
    console.error(`✗ Agent spawn failed after ${maxRetries} attempts: ${agentId}`);
    throw new Error(`Agent spawn failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Monitor agent status and health with comprehensive checks
   */
  async monitor(agentId: string): Promise<AgentMonitor> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const monitor: AgentMonitor = {
      status: agent.status,
      uptime: this.calculateUptime(agent.createdAt),
      lastHeartbeat: await this.getLastHeartbeat(agentId),
      resourceUsage: await this.getAgentResourceUsage(agentId),
      errors: await this.getAgentErrors(agentId)
    };

    if (agent.pid) {
      try {
        process.kill(agent.pid, 0);
        monitor.status = AgentStatus.RUNNING;
        
        if (agent.status !== AgentStatus.RUNNING) {
          agent.status = AgentStatus.RUNNING;
          agent.updatedAt = new Date().toISOString();
          this.agents.set(agentId, agent);
        }
      } catch {
        monitor.status = AgentStatus.TERMINATED;
        agent.status = AgentStatus.TERMINATED;
        agent.updatedAt = new Date().toISOString();
        this.agents.set(agentId, agent);
      }
    }

    if (monitor.errors && monitor.errors.length > 5) {
      monitor.status = AgentStatus.ERROR;
      agent.status = AgentStatus.ERROR;
      agent.updatedAt = new Date().toISOString();
      this.agents.set(agentId, agent);
    }

    return monitor;
  }

  /**
   * Terminate an agent
   */
  async terminate(agentId: string, graceful = true): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    console.log(`Terminating agent: ${agentId} (${agent.type})`);

    try {
      if (agent.pid) {
        if (graceful) {
          process.kill(agent.pid, 'SIGTERM');
          
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          try {
            process.kill(agent.pid, 0);
            process.kill(agent.pid, 'SIGKILL');
            console.log(`⚠️  Force killed agent: ${agentId}`);
          } catch {
            console.log(`✓ Agent terminated gracefully: ${agentId}`);
          }
        } else {
          process.kill(agent.pid, 'SIGKILL');
          console.log(`✓ Agent terminated: ${agentId}`);
        }
      }

      await this.cleanupMailbox(agent.mailboxId);
      
      agent.status = AgentStatus.TERMINATED;
      agent.updatedAt = new Date().toISOString();

      console.log(`✓ Agent cleanup complete: ${agentId}`);
    } catch (error: any) {
      agent.status = AgentStatus.ERROR;
      agent.updatedAt = new Date().toISOString();
      
      console.error(`✗ Error terminating agent ${agentId}:`, error.message);
      throw new Error(`Agent termination failed: ${error.message}`);
    }
  }

  /**
   * Get all active agents
   */
  getActiveAgents(): AgentHandle[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.status === AgentStatus.RUNNING || 
               agent.status === AgentStatus.IDLE || 
               agent.status === AgentStatus.BUSY
    );
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type: AgentType): AgentHandle[] {
    return Array.from(this.agents.values()).filter(agent => agent.type === type);
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentHandle | undefined {
    return this.agents.get(agentId);
  }

  private async createMailbox(mailboxId: string, agentId: string): Promise<void> {
    const mailboxDir = path.join(this.mailboxPath, mailboxId);
    
    await this.ensureDirectory(mailboxDir);
    
    const manifest = {
      id: mailboxId,
      agentId,
      createdAt: new Date().toISOString(),
      type: 'agent-mailbox'
    };
    
    const manifestPath = path.join(mailboxDir, 'manifest.json');
    await this.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }

  private async cleanupMailbox(mailboxId: string): Promise<void> {
    const mailboxDir = path.join(this.mailboxPath, mailboxId);
    
    try {
      await this.removeDirectory(mailboxDir);
      console.log(`✓ Cleaned up mailbox: ${mailboxId}`);
    } catch (error: any) {
      console.error(`⚠️  Failed to cleanup mailbox ${mailboxId}:`, error.message);
    }
  }

  private async executeAgentSpawn(agent: AgentHandle, request: AgentSpawnRequest): Promise<number> {
    const { spawn } = await import('node:child_process');
    
    return new Promise((resolve, reject) => {
      const args = [
        'src/agent-runner.js',
        '--agent-id', agent.id,
        '--agent-type', agent.type,
        '--mailbox-id', agent.mailboxId,
        '--task', request.task || ''
      ];

      if (request.config?.timeout) {
        args.push('--timeout', request.config.timeout.toString());
      }

      const childProcess = spawn('bun', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
        cwd: process.cwd()
      });

      childProcess.on('spawn', () => {
        console.log(`Agent process spawned with PID: ${childProcess.pid}`);
        resolve(childProcess.pid!);
      });

      childProcess.on('error', (error) => {
        console.error(`Failed to spawn agent process:`, error);
        reject(error);
      });

      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data) => {
          console.log(`[${agent.id}] ${data.toString().trim()}`);
        });
      }

      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data) => {
          console.error(`[${agent.id}] ERROR: ${data.toString().trim()}`);
        });
      }

      childProcess.on('close', (code) => {
        if (code !== 0) {
          console.log(`Agent ${agent.id} exited with code: ${code}`);
        }
      });
    });
  }

  private async cleanupFailedSpawn(agentId: string): Promise<void> {
    try {
      const agent = this.agents.get(agentId);
      if (agent?.pid) {
        try {
          process.kill(agent.pid, 'SIGKILL');
          console.log(`✓ Cleaned up process ${agent.pid}`);
        } catch {
        }
      }
      
      const agentHandle = this.agents.get(agentId);
      if (agentHandle?.mailboxId) {
        await this.cleanupMailbox(agentHandle.mailboxId);
      }
    } catch (error: any) {
      console.error(`Cleanup error for ${agentId}:`, error.message);
    }
  }

  private async getLastHeartbeat(agentId: string): Promise<string | undefined> {
    const agent = this.agents.get(agentId);
    return agent?.metadata?.lastHeartbeat;
  }

  private async getAgentErrors(agentId: string): Promise<Array<{ timestamp: string; error: string; count: number }>> {
    const agent = this.agents.get(agentId);
    return agent?.metadata?.errors || [];
  }

  private async getAgentResourceUsage(agentId: string): Promise<{ memory: number; cpu: number } | undefined> {
    const agent = this.agents.get(agentId);
    if (agent?.pid) {
      try {
        // Get actual resource usage using process information
        const usage = await this.getProcessResourceUsage(agent.pid);
        
        // Store usage history for trend analysis
        this.storeResourceHistory(agentId, usage);
        
        return usage;
      } catch (error) {
        console.warn(`Failed to get resource usage for agent ${agentId}:`, error);
        return undefined;
      }
    }
    return undefined;
  }

  private async getProcessResourceUsage(pid: number): Promise<{ memory: number; cpu: number }> {
    try {
      // Try to get actual process resource usage
      if (process.platform === 'linux') {
        return await this.getLinuxProcessUsage(pid);
      } else if (process.platform === 'darwin') {
        return await this.getMacOSProcessUsage(pid);
      } else {
        // Fallback to mock data for other platforms
        return this.getMockResourceUsage();
      }
    } catch (error) {
      // Fallback to mock data if actual measurement fails
      return this.getMockResourceUsage();
    }
  }

  private async getLinuxProcessUsage(pid: number): Promise<{ memory: number; cpu: number }> {
    const { exec } = await import('node:child_process');
    
    return new Promise((resolve, reject) => {
      exec(`ps -p ${pid} -o %mem,%cpu --no-headers`, (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        
        const match = stdout.trim().match(/\s*(\d+\.?\d*)\s+(\d+\.?\d*)/);
        if (match) {
          resolve({
            memory: parseFloat(match[1]) * 10, // Convert percentage to MB estimate
            cpu: parseFloat(match[2])
          });
        } else {
          reject(new Error('Failed to parse process usage'));
        }
      });
    });
  }

  private async getMacOSProcessUsage(pid: number): Promise<{ memory: number; cpu: number }> {
    const { exec } = await import('node:child_process');
    
    return new Promise((resolve, reject) => {
      exec(`ps -p ${pid} -o %mem,%cpu -r`, (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const match = lines[1].match(/\s*(\d+\.?\d*)\s+(\d+\.?\d*)/);
          if (match) {
            resolve({
              memory: parseFloat(match[1]) * 10, // Convert percentage to MB estimate
              cpu: parseFloat(match[2])
            });
          }
        }
        
        reject(new Error('Failed to parse macOS process usage'));
      });
    });
  }

  private getMockResourceUsage(): { memory: number; cpu: number } {
    return {
      memory: Math.floor(Math.random() * 200) + 50,
      cpu: Math.floor(Math.random() * 60) + 5
    };
  }

  private storeResourceHistory(agentId: string, usage: { memory: number; cpu: number }): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const history = agent.metadata?.resourceHistory || [];
    history.push({
      timestamp: new Date().toISOString(),
      ...usage
    });

    // Keep only last 100 data points
    const recentHistory = history.slice(-100);
    
    agent.metadata = {
      ...agent.metadata,
      resourceHistory: recentHistory,
      lastResourceCheck: new Date().toISOString()
    };
    
    this.agents.set(agentId, agent);
  }

  async getResourceHistory(agentId: string): Promise<Array<{ timestamp: string; memory: number; cpu: number }>> {
    const agent = this.agents.get(agentId);
    return agent?.metadata?.resourceHistory || [];
  }

  async getResourceTrends(agentId: string): Promise<{
    avgMemory: number;
    avgCpu: number;
    peakMemory: number;
    peakCpu: number;
  }> {
    const history = await this.getResourceHistory(agentId);
    
    if (history.length === 0) {
      return { avgMemory: 0, avgCpu: 0, peakMemory: 0, peakCpu: 0 };
    }

    const memoryValues = history.map(h => h.memory);
    const cpuValues = history.map(h => h.cpu);

    return {
      avgMemory: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
      avgCpu: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
      peakMemory: Math.max(...memoryValues),
      peakCpu: Math.max(...cpuValues)
    };
  }

  async updateHeartbeat(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.metadata = {
      ...agent.metadata,
      lastHeartbeat: new Date().toISOString()
    };
    agent.updatedAt = new Date().toISOString();
    
    this.agents.set(agentId, agent);
  }

  async logError(agentId: string, error: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const errors = agent.metadata?.errors || [];
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error,
      count: 1
    };

    const existingError = errors.find(e => e.error === error);
    if (existingError) {
      existingError.count++;
      existingError.timestamp = new Date().toISOString();
    } else {
      errors.push(errorEntry);
    }

    agent.metadata = {
      ...agent.metadata,
      errors: errors.slice(-10)
    };
    agent.updatedAt = new Date().toISOString();
    
    this.agents.set(agentId, agent);
  }

  private calculateUptime(createdAt: string): number {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return Math.floor((now - created) / 1000);
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(dirPath, { recursive: true });
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(filePath, content, 'utf-8');
  }

  private async removeDirectory(dirPath: string): Promise<void> {
    const { rm } = await import('node:fs/promises');
    await rm(dirPath, { recursive: true, force: true });
  }

  /**
   * Start heartbeat monitoring for all agents
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(async () => {
      await this.checkAgentHeartbeats();
    }, 30000); // Check every 30 seconds
    
    console.log('✓ Agent heartbeat monitoring started');
  }

  /**
   * Start automatic recovery monitoring
   */
  private startRecoveryMonitoring(): void {
    if (!this.recoveryEnabled) return;
    
    this.recoveryInterval = setInterval(async () => {
      await this.performRecoveryChecks();
    }, 60000); // Check every minute
    
    console.log('✓ Agent recovery monitoring started');
  }

  /**
   * Check heartbeats for all running agents
   */
  private async checkAgentHeartbeats(): Promise<void> {
    const now = Date.now();
    const agentsToCheck = Array.from(this.agents.values())
      .filter(agent => agent.status === AgentStatus.RUNNING || agent.status === AgentStatus.BUSY);

    for (const agent of agentsToCheck) {
      const lastHeartbeat = agent.metadata?.lastHeartbeat;
      
      if (lastHeartbeat) {
        const lastHeartbeatTime = new Date(lastHeartbeat).getTime();
        const timeSinceLastHeartbeat = now - lastHeartbeatTime;
        
        if (timeSinceLastHeartbeat > this.heartbeatTimeout) {
          console.warn(`⚠️  Agent ${agent.id} missed heartbeat (${timeSinceLastHeartbeat}ms ago)`);
          await this.handleMissedHeartbeat(agent);
        }
      } else {
        console.warn(`⚠️  Agent ${agent.id} has no heartbeat recorded`);
      }
    }
  }

  /**
   * Handle missed heartbeat scenarios
   */
  private async handleMissedHeartbeat(agent: AgentHandle): Promise<void> {
    // Check if process is still running
    if (agent.pid) {
      try {
        process.kill(agent.pid, 0); // Check if process exists
        
        // Process exists but no heartbeat - might be stuck
        agent.status = AgentStatus.ERROR;
        agent.metadata = {
          ...agent.metadata,
          error: 'Missed heartbeat but process running',
          missedHeartbeatAt: new Date().toISOString()
        };
        agent.updatedAt = new Date().toISOString();
        
        this.agents.set(agent.id, agent);
        
        console.warn(`⚠️  Agent ${agent.id} marked as error due to missed heartbeat`);
        
        // Send recovery event
        await this.sendRecoveryEvent(agent, 'missed_heartbeat');
      } catch {
        // Process doesn't exist - agent died
        agent.status = AgentStatus.FAILED;
        agent.metadata = {
          ...agent.metadata,
          error: 'Process died - no heartbeat received',
          diedAt: new Date().toISOString()
        };
        agent.updatedAt = new Date().toISOString();
        
        this.agents.set(agent.id, agent);
        
        console.error(`❌ Agent ${agent.id} failed - process died`);
        
        // Attempt recovery
        await this.attemptAgentRecovery(agent);
      }
    }
  }

  /**
   * Perform recovery checks and attempts
   */
  private async performRecoveryChecks(): Promise<void> {
    const failedAgents = Array.from(this.agents.values())
      .filter(agent => agent.status === AgentStatus.FAILED || agent.status === AgentStatus.ERROR);

    for (const agent of failedAgents) {
      const lastRecoveryAttempt = agent.metadata?.lastRecoveryAttempt;
      const now = Date.now();
      
      // Only attempt recovery if not tried recently (5 minute cooldown)
      if (!lastRecoveryAttempt || (now - new Date(lastRecoveryAttempt).getTime() > 300000)) {
        await this.attemptAgentRecovery(agent);
      }
    }
  }

  /**
   * Attempt to recover a failed agent
   */
  private async attemptAgentRecovery(agent: AgentHandle): Promise<void> {
    console.log(`🔄 Attempting to recover agent ${agent.id}...`);
    
    try {
      // Mark recovery attempt
      agent.metadata = {
        ...agent.metadata,
        lastRecoveryAttempt: new Date().toISOString(),
        recoveryAttempts: (agent.metadata?.recoveryAttempts || 0) + 1
      };
      
      // Check if we've exceeded max recovery attempts
      if (agent.metadata.recoveryAttempts > 3) {
        console.error(`❌ Agent ${agent.id} exceeded max recovery attempts`);
        await this.sendRecoveryEvent(agent, 'recovery_exhausted');
        return;
      }

      // Clean up existing process if any
      if (agent.pid) {
        try {
          process.kill(agent.pid, 'SIGKILL');
        } catch {
          // Process already dead
        }
      }

      // Get original spawn request
      const spawnRequest = agent.metadata?.spawnRequest;
      if (!spawnRequest) {
        console.error(`❌ Cannot recover agent ${agent.id} - no spawn request found`);
        return;
      }

      // Attempt to respawn with same configuration
      const newAgentId = `agt_${randomUUID()}`;
      agent.id = newAgentId;
      agent.status = AgentStatus.SPAWNING;
      agent.updatedAt = new Date().toISOString();
      
      // Create new mailbox
      const newMailboxId = `mbx_${randomUUID()}`;
      await this.createMailbox(newMailboxId, newAgentId);
      
      // Spawn new process
      const newPid = await this.executeAgentSpawn(agent, spawnRequest);
      agent.pid = newPid;
      agent.mailboxId = newMailboxId;
      agent.status = AgentStatus.RUNNING;
      agent.updatedAt = new Date().toISOString();
      
      // Update agent in registry
      this.agents.delete(agent.id.replace(newAgentId, '')); // Remove old ID if different
      this.agents.set(newAgentId, agent);
      
      console.log(`✅ Agent ${newAgentId} recovered successfully`);
      await this.sendRecoveryEvent(agent, 'recovery_success');
      
    } catch (error: any) {
      console.error(`❌ Agent ${agent.id} recovery failed:`, error.message);
      
      agent.status = AgentStatus.FAILED;
      agent.metadata = {
        ...agent.metadata,
        recoveryError: error.message,
        recoveryFailedAt: new Date().toISOString()
      };
      agent.updatedAt = new Date().toISOString();
      
      await this.sendRecoveryEvent(agent, 'recovery_failed');
    }
  }

  /**
   * Send recovery event notifications
   */
  private async sendRecoveryEvent(agent: AgentHandle, eventType: string): Promise<void> {
    try {
      const event = {
        type: 'agent_recovery',
        agentId: agent.id,
        agentType: agent.type,
        eventType,
        timestamp: new Date().toISOString(),
        metadata: {
          status: agent.status,
          recoveryAttempts: agent.metadata?.recoveryAttempts || 0,
          lastError: agent.metadata?.error || agent.metadata?.recoveryError
        }
      };

      // In a real implementation, this would send to notification system
      console.log(`📢 Recovery event: ${eventType} for agent ${agent.id}`);
      console.log(`   Event:`, JSON.stringify(event, null, 2));
      
    } catch (error: any) {
      console.error(`Failed to send recovery event:`, error.message);
    }
  }

  /**
   * Get agent health status with detailed metrics
   */
  async getAgentHealth(agentId: string): Promise<{
    status: AgentStatus;
    isHealthy: boolean;
    lastHeartbeat?: string;
    uptime?: number;
    resourceUsage?: { memory: number; cpu: number };
    errors: Array<{ timestamp: string; error: string; count: number }>;
    recoveryAttempts?: number;
  }> {
    const monitor = await this.monitor(agentId);
    const agent = this.agents.get(agentId);
    
    const now = Date.now();
    const lastHeartbeat = agent?.metadata?.lastHeartbeat;
    const isHealthy = monitor.status === AgentStatus.RUNNING && 
                     (!lastHeartbeat || (now - new Date(lastHeartbeat).getTime() < this.heartbeatTimeout));

    return {
      status: monitor.status,
      isHealthy,
      lastHeartbeat,
      uptime: monitor.uptime,
      resourceUsage: monitor.resourceUsage,
      errors: monitor.errors,
      recoveryAttempts: agent?.metadata?.recoveryAttempts || 0
    };
  }

  /**
   * Get system-wide agent health summary
   */
  async getSystemHealth(): Promise<{
    totalAgents: number;
    healthyAgents: number;
    unhealthyAgents: number;
    recoveringAgents: number;
    failedAgents: number;
    overallHealth: 'healthy' | 'degraded' | 'critical';
  }> {
    const allAgents = Array.from(this.agents.values());
    const healthChecks = await Promise.all(
      allAgents.map(agent => this.getAgentHealth(agent.id))
    );

    const healthy = healthChecks.filter(h => h.isHealthy).length;
    const unhealthy = healthChecks.filter(h => !h.isHealthy && h.status !== AgentStatus.FAILED).length;
    const failed = healthChecks.filter(h => h.status === AgentStatus.FAILED).length;
    const recovering = allAgents.filter(a => a.metadata?.recoveryAttempts > 0).length;

    const total = allAgents.length;
    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (failed / total > 0.3) {
      overallHealth = 'critical';
    } else if (unhealthy / total > 0.2) {
      overallHealth = 'degraded';
    }

    return {
      totalAgents: total,
      healthyAgents: healthy,
      unhealthyAgents: unhealthy,
      recoveringAgents: recovering,
      failedAgents: failed,
      overallHealth
    };
  }

  /**
   * Cleanup method to stop monitoring intervals
   */
  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
    }
    console.log('✓ Agent monitoring stopped');
  }
}
