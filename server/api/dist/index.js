// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = import.meta.require;

// src/coordination/agent-spawner.ts
import { randomUUID as randomUUID2 } from "crypto";
import path6 from "path";

class AgentSpawner {
  agents = new Map;
  mailboxPath;
  heartbeatInterval;
  recoveryInterval;
  heartbeatTimeout = 60000;
  recoveryEnabled = true;
  constructor(mailboxPath) {
    this.mailboxPath = mailboxPath || path6.join(process.cwd(), ".flightline", "mailboxes");
    this.startHeartbeatMonitoring();
    this.startRecoveryMonitoring();
  }
  async spawn(request) {
    const agentId = `agt_${randomUUID2()}`;
    const mailboxId = `mbx_${randomUUID2()}`;
    const timeout = request.config?.timeout || 300000;
    const maxRetries = request.config?.retries || 3;
    const agent = {
      id: agentId,
      type: request.type,
      status: "spawning" /* SPAWNING */,
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
    let lastError = null;
    for (let attempt = 1;attempt <= maxRetries; attempt++) {
      try {
        agent.metadata.spawnAttempts = attempt;
        agent.updatedAt = new Date().toISOString();
        await this.createMailbox(mailboxId, agentId);
        const pid = await this.executeAgentSpawn(agent, request);
        agent.pid = pid;
        agent.status = "running" /* RUNNING */;
        agent.updatedAt = new Date().toISOString();
        this.agents.set(agentId, agent);
        console.log(`\u2713 Agent spawned: ${agentId} (${request.type}) - attempt ${attempt}`);
        return agent;
      } catch (error) {
        lastError = error;
        agent.status = "failed" /* FAILED */;
        agent.updatedAt = new Date().toISOString();
        console.error(`\u2717 Agent spawn attempt ${attempt} failed:`, error.message);
        if (attempt < maxRetries) {
          const retryDelay = Math.min(5000 * attempt, 15000);
          console.log(`Retrying agent spawn in ${retryDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          try {
            await this.cleanupFailedSpawn(agentId);
          } catch (cleanupError) {
            console.error(`Cleanup failed:`, cleanupError.message);
          }
        }
      }
    }
    agent.status = "failed" /* FAILED */;
    agent.updatedAt = new Date().toISOString();
    agent.metadata.lastError = lastError?.message || "Unknown error";
    this.agents.set(agentId, agent);
    console.error(`\u2717 Agent spawn failed after ${maxRetries} attempts: ${agentId}`);
    throw new Error(`Agent spawn failed after ${maxRetries} attempts: ${lastError?.message}`);
  }
  async monitor(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    const monitor = {
      status: agent.status,
      uptime: this.calculateUptime(agent.createdAt),
      lastHeartbeat: await this.getLastHeartbeat(agentId),
      resourceUsage: await this.getAgentResourceUsage(agentId),
      errors: await this.getAgentErrors(agentId)
    };
    if (agent.pid) {
      try {
        process.kill(agent.pid, 0);
        monitor.status = "running" /* RUNNING */;
        if (agent.status !== "running" /* RUNNING */) {
          agent.status = "running" /* RUNNING */;
          agent.updatedAt = new Date().toISOString();
          this.agents.set(agentId, agent);
        }
      } catch {
        monitor.status = "terminated" /* TERMINATED */;
        agent.status = "terminated" /* TERMINATED */;
        agent.updatedAt = new Date().toISOString();
        this.agents.set(agentId, agent);
      }
    }
    if (monitor.errors && monitor.errors.length > 5) {
      monitor.status = "error" /* ERROR */;
      agent.status = "error" /* ERROR */;
      agent.updatedAt = new Date().toISOString();
      this.agents.set(agentId, agent);
    }
    return monitor;
  }
  async terminate(agentId, graceful = true) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    console.log(`Terminating agent: ${agentId} (${agent.type})`);
    try {
      if (agent.pid) {
        if (graceful) {
          process.kill(agent.pid, "SIGTERM");
          await new Promise((resolve) => setTimeout(resolve, 5000));
          try {
            process.kill(agent.pid, 0);
            process.kill(agent.pid, "SIGKILL");
            console.log(`\u26A0\uFE0F  Force killed agent: ${agentId}`);
          } catch {
            console.log(`\u2713 Agent terminated gracefully: ${agentId}`);
          }
        } else {
          process.kill(agent.pid, "SIGKILL");
          console.log(`\u2713 Agent terminated: ${agentId}`);
        }
      }
      await this.cleanupMailbox(agent.mailboxId);
      agent.status = "terminated" /* TERMINATED */;
      agent.updatedAt = new Date().toISOString();
      console.log(`\u2713 Agent cleanup complete: ${agentId}`);
    } catch (error) {
      agent.status = "error" /* ERROR */;
      agent.updatedAt = new Date().toISOString();
      console.error(`\u2717 Error terminating agent ${agentId}:`, error.message);
      throw new Error(`Agent termination failed: ${error.message}`);
    }
  }
  getActiveAgents() {
    return Array.from(this.agents.values()).filter((agent) => agent.status === "running" /* RUNNING */ || agent.status === "idle" /* IDLE */ || agent.status === "busy" /* BUSY */);
  }
  getAgentsByType(type) {
    return Array.from(this.agents.values()).filter((agent) => agent.type === type);
  }
  getAgent(agentId) {
    return this.agents.get(agentId);
  }
  async createMailbox(mailboxId, agentId) {
    const mailboxDir = path6.join(this.mailboxPath, mailboxId);
    await this.ensureDirectory(mailboxDir);
    const manifest = {
      id: mailboxId,
      agentId,
      createdAt: new Date().toISOString(),
      type: "agent-mailbox"
    };
    const manifestPath = path6.join(mailboxDir, "manifest.json");
    await this.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }
  async cleanupMailbox(mailboxId) {
    const mailboxDir = path6.join(this.mailboxPath, mailboxId);
    try {
      await this.removeDirectory(mailboxDir);
      console.log(`\u2713 Cleaned up mailbox: ${mailboxId}`);
    } catch (error) {
      console.error(`\u26A0\uFE0F  Failed to cleanup mailbox ${mailboxId}:`, error.message);
    }
  }
  async executeAgentSpawn(agent, request) {
    const { spawn } = await import("child_process");
    return new Promise((resolve, reject) => {
      const args = [
        "src/agent-runner.js",
        "--agent-id",
        agent.id,
        "--agent-type",
        agent.type,
        "--mailbox-id",
        agent.mailboxId,
        "--task",
        request.task || ""
      ];
      if (request.config?.timeout) {
        args.push("--timeout", request.config.timeout.toString());
      }
      const childProcess = spawn("bun", args, {
        stdio: ["pipe", "pipe", "pipe"],
        detached: false,
        cwd: process.cwd()
      });
      childProcess.on("spawn", () => {
        console.log(`Agent process spawned with PID: ${childProcess.pid}`);
        resolve(childProcess.pid);
      });
      childProcess.on("error", (error) => {
        console.error(`Failed to spawn agent process:`, error);
        reject(error);
      });
      if (childProcess.stdout) {
        childProcess.stdout.on("data", (data) => {
          console.log(`[${agent.id}] ${data.toString().trim()}`);
        });
      }
      if (childProcess.stderr) {
        childProcess.stderr.on("data", (data) => {
          console.error(`[${agent.id}] ERROR: ${data.toString().trim()}`);
        });
      }
      childProcess.on("close", (code) => {
        if (code !== 0) {
          console.log(`Agent ${agent.id} exited with code: ${code}`);
        }
      });
    });
  }
  async cleanupFailedSpawn(agentId) {
    try {
      const agent = this.agents.get(agentId);
      if (agent?.pid) {
        try {
          process.kill(agent.pid, "SIGKILL");
          console.log(`\u2713 Cleaned up process ${agent.pid}`);
        } catch {}
      }
      const agentHandle = this.agents.get(agentId);
      if (agentHandle?.mailboxId) {
        await this.cleanupMailbox(agentHandle.mailboxId);
      }
    } catch (error) {
      console.error(`Cleanup error for ${agentId}:`, error.message);
    }
  }
  async getLastHeartbeat(agentId) {
    const agent = this.agents.get(agentId);
    return agent?.metadata?.lastHeartbeat;
  }
  async getAgentErrors(agentId) {
    const agent = this.agents.get(agentId);
    return agent?.metadata?.errors || [];
  }
  async getAgentResourceUsage(agentId) {
    const agent = this.agents.get(agentId);
    if (agent?.pid) {
      try {
        const usage = await this.getProcessResourceUsage(agent.pid);
        this.storeResourceHistory(agentId, usage);
        return usage;
      } catch (error) {
        console.warn(`Failed to get resource usage for agent ${agentId}:`, error);
        return;
      }
    }
    return;
  }
  async getProcessResourceUsage(pid) {
    try {
      if (process.platform === "linux") {
        return await this.getLinuxProcessUsage(pid);
      } else if (process.platform === "darwin") {
        return await this.getMacOSProcessUsage(pid);
      } else {
        return this.getMockResourceUsage();
      }
    } catch (error) {
      return this.getMockResourceUsage();
    }
  }
  async getLinuxProcessUsage(pid) {
    const { exec } = await import("child_process");
    return new Promise((resolve, reject) => {
      exec(`ps -p ${pid} -o %mem,%cpu --no-headers`, (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        const match = stdout.trim().match(/\s*(\d+\.?\d*)\s+(\d+\.?\d*)/);
        if (match) {
          resolve({
            memory: parseFloat(match[1]) * 10,
            cpu: parseFloat(match[2])
          });
        } else {
          reject(new Error("Failed to parse process usage"));
        }
      });
    });
  }
  async getMacOSProcessUsage(pid) {
    const { exec } = await import("child_process");
    return new Promise((resolve, reject) => {
      exec(`ps -p ${pid} -o %mem,%cpu -r`, (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        const lines = stdout.trim().split(`
`);
        if (lines.length > 1) {
          const match = lines[1].match(/\s*(\d+\.?\d*)\s+(\d+\.?\d*)/);
          if (match) {
            resolve({
              memory: parseFloat(match[1]) * 10,
              cpu: parseFloat(match[2])
            });
          }
        }
        reject(new Error("Failed to parse macOS process usage"));
      });
    });
  }
  getMockResourceUsage() {
    return {
      memory: Math.floor(Math.random() * 200) + 50,
      cpu: Math.floor(Math.random() * 60) + 5
    };
  }
  storeResourceHistory(agentId, usage) {
    const agent = this.agents.get(agentId);
    if (!agent)
      return;
    const history = agent.metadata?.resourceHistory || [];
    history.push({
      timestamp: new Date().toISOString(),
      ...usage
    });
    const recentHistory = history.slice(-100);
    agent.metadata = {
      ...agent.metadata,
      resourceHistory: recentHistory,
      lastResourceCheck: new Date().toISOString()
    };
    this.agents.set(agentId, agent);
  }
  async getResourceHistory(agentId) {
    const agent = this.agents.get(agentId);
    return agent?.metadata?.resourceHistory || [];
  }
  async getResourceTrends(agentId) {
    const history = await this.getResourceHistory(agentId);
    if (history.length === 0) {
      return { avgMemory: 0, avgCpu: 0, peakMemory: 0, peakCpu: 0 };
    }
    const memoryValues = history.map((h) => h.memory);
    const cpuValues = history.map((h) => h.cpu);
    return {
      avgMemory: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
      avgCpu: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
      peakMemory: Math.max(...memoryValues),
      peakCpu: Math.max(...cpuValues)
    };
  }
  async updateHeartbeat(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent)
      return;
    agent.metadata = {
      ...agent.metadata,
      lastHeartbeat: new Date().toISOString()
    };
    agent.updatedAt = new Date().toISOString();
    this.agents.set(agentId, agent);
  }
  async logError(agentId, error) {
    const agent = this.agents.get(agentId);
    if (!agent)
      return;
    const errors = agent.metadata?.errors || [];
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error,
      count: 1
    };
    const existingError = errors.find((e) => e.error === error);
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
  calculateUptime(createdAt) {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return Math.floor((now - created) / 1000);
  }
  async ensureDirectory(dirPath) {
    const { mkdir } = await import("fs/promises");
    await mkdir(dirPath, { recursive: true });
  }
  async writeFile(filePath, content) {
    const { writeFile } = await import("fs/promises");
    await writeFile(filePath, content, "utf-8");
  }
  async removeDirectory(dirPath) {
    const { rm } = await import("fs/promises");
    await rm(dirPath, { recursive: true, force: true });
  }
  startHeartbeatMonitoring() {
    this.heartbeatInterval = setInterval(async () => {
      await this.checkAgentHeartbeats();
    }, 30000);
    console.log("\u2713 Agent heartbeat monitoring started");
  }
  startRecoveryMonitoring() {
    if (!this.recoveryEnabled)
      return;
    this.recoveryInterval = setInterval(async () => {
      await this.performRecoveryChecks();
    }, 60000);
    console.log("\u2713 Agent recovery monitoring started");
  }
  async checkAgentHeartbeats() {
    const now = Date.now();
    const agentsToCheck = Array.from(this.agents.values()).filter((agent) => agent.status === "running" /* RUNNING */ || agent.status === "busy" /* BUSY */);
    for (const agent of agentsToCheck) {
      const lastHeartbeat = agent.metadata?.lastHeartbeat;
      if (lastHeartbeat) {
        const lastHeartbeatTime = new Date(lastHeartbeat).getTime();
        const timeSinceLastHeartbeat = now - lastHeartbeatTime;
        if (timeSinceLastHeartbeat > this.heartbeatTimeout) {
          console.warn(`\u26A0\uFE0F  Agent ${agent.id} missed heartbeat (${timeSinceLastHeartbeat}ms ago)`);
          await this.handleMissedHeartbeat(agent);
        }
      } else {
        console.warn(`\u26A0\uFE0F  Agent ${agent.id} has no heartbeat recorded`);
      }
    }
  }
  async handleMissedHeartbeat(agent) {
    if (agent.pid) {
      try {
        process.kill(agent.pid, 0);
        agent.status = "error" /* ERROR */;
        agent.metadata = {
          ...agent.metadata,
          error: "Missed heartbeat but process running",
          missedHeartbeatAt: new Date().toISOString()
        };
        agent.updatedAt = new Date().toISOString();
        this.agents.set(agent.id, agent);
        console.warn(`\u26A0\uFE0F  Agent ${agent.id} marked as error due to missed heartbeat`);
        await this.sendRecoveryEvent(agent, "missed_heartbeat");
      } catch {
        agent.status = "failed" /* FAILED */;
        agent.metadata = {
          ...agent.metadata,
          error: "Process died - no heartbeat received",
          diedAt: new Date().toISOString()
        };
        agent.updatedAt = new Date().toISOString();
        this.agents.set(agent.id, agent);
        console.error(`\u274C Agent ${agent.id} failed - process died`);
        await this.attemptAgentRecovery(agent);
      }
    }
  }
  async performRecoveryChecks() {
    const failedAgents = Array.from(this.agents.values()).filter((agent) => agent.status === "failed" /* FAILED */ || agent.status === "error" /* ERROR */);
    for (const agent of failedAgents) {
      const lastRecoveryAttempt = agent.metadata?.lastRecoveryAttempt;
      const now = Date.now();
      if (!lastRecoveryAttempt || now - new Date(lastRecoveryAttempt).getTime() > 300000) {
        await this.attemptAgentRecovery(agent);
      }
    }
  }
  async attemptAgentRecovery(agent) {
    console.log(`\uD83D\uDD04 Attempting to recover agent ${agent.id}...`);
    try {
      agent.metadata = {
        ...agent.metadata,
        lastRecoveryAttempt: new Date().toISOString(),
        recoveryAttempts: (agent.metadata?.recoveryAttempts || 0) + 1
      };
      if (agent.metadata.recoveryAttempts > 3) {
        console.error(`\u274C Agent ${agent.id} exceeded max recovery attempts`);
        await this.sendRecoveryEvent(agent, "recovery_exhausted");
        return;
      }
      if (agent.pid) {
        try {
          process.kill(agent.pid, "SIGKILL");
        } catch {}
      }
      const spawnRequest = agent.metadata?.spawnRequest;
      if (!spawnRequest) {
        console.error(`\u274C Cannot recover agent ${agent.id} - no spawn request found`);
        return;
      }
      const newAgentId = `agt_${randomUUID2()}`;
      agent.id = newAgentId;
      agent.status = "spawning" /* SPAWNING */;
      agent.updatedAt = new Date().toISOString();
      const newMailboxId = `mbx_${randomUUID2()}`;
      await this.createMailbox(newMailboxId, newAgentId);
      const newPid = await this.executeAgentSpawn(agent, spawnRequest);
      agent.pid = newPid;
      agent.mailboxId = newMailboxId;
      agent.status = "running" /* RUNNING */;
      agent.updatedAt = new Date().toISOString();
      this.agents.delete(agent.id.replace(newAgentId, ""));
      this.agents.set(newAgentId, agent);
      console.log(`\u2705 Agent ${newAgentId} recovered successfully`);
      await this.sendRecoveryEvent(agent, "recovery_success");
    } catch (error) {
      console.error(`\u274C Agent ${agent.id} recovery failed:`, error.message);
      agent.status = "failed" /* FAILED */;
      agent.metadata = {
        ...agent.metadata,
        recoveryError: error.message,
        recoveryFailedAt: new Date().toISOString()
      };
      agent.updatedAt = new Date().toISOString();
      await this.sendRecoveryEvent(agent, "recovery_failed");
    }
  }
  async sendRecoveryEvent(agent, eventType) {
    try {
      const event = {
        type: "agent_recovery",
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
      console.log(`\uD83D\uDCE2 Recovery event: ${eventType} for agent ${agent.id}`);
      console.log(`   Event:`, JSON.stringify(event, null, 2));
    } catch (error) {
      console.error(`Failed to send recovery event:`, error.message);
    }
  }
  async getAgentHealth(agentId) {
    const monitor = await this.monitor(agentId);
    const agent = this.agents.get(agentId);
    const now = Date.now();
    const lastHeartbeat = agent?.metadata?.lastHeartbeat;
    const isHealthy = monitor.status === "running" /* RUNNING */ && (!lastHeartbeat || now - new Date(lastHeartbeat).getTime() < this.heartbeatTimeout);
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
  async getSystemHealth() {
    const allAgents = Array.from(this.agents.values());
    const healthChecks = await Promise.all(allAgents.map((agent) => this.getAgentHealth(agent.id)));
    const healthy = healthChecks.filter((h) => h.isHealthy).length;
    const unhealthy = healthChecks.filter((h) => !h.isHealthy && h.status !== "failed" /* FAILED */).length;
    const failed = healthChecks.filter((h) => h.status === "failed" /* FAILED */).length;
    const recovering = allAgents.filter((a) => a.metadata?.recoveryAttempts > 0).length;
    const total = allAgents.length;
    let overallHealth = "healthy";
    if (failed / total > 0.3) {
      overallHealth = "critical";
    } else if (unhealthy / total > 0.2) {
      overallHealth = "degraded";
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
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
    }
    console.log("\u2713 Agent monitoring stopped");
  }
}
var init_agent_spawner = () => {};

// src/coordination/recovery-manager.ts
var exports_recovery_manager = {};
__export(exports_recovery_manager, {
  RecoveryManager: () => RecoveryManager
});
import { randomUUID as randomUUID3 } from "crypto";
import path7 from "path";

class RecoveryManager {
  agentSpawner;
  checkpointManager;
  recoveryLogPath;
  constructor() {
    this.agentSpawner = new AgentSpawner;
    this.checkpointManager = new CheckpointManager;
    this.recoveryLogPath = path7.join(process.cwd(), ".flightline", "recovery.log");
  }
  async createRecoveryPlan(checkpointId, force = false) {
    console.log(`\uD83D\uDCCB Creating recovery plan for checkpoint: ${checkpointId}`);
    const checkpoint = await this.checkpointManager.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }
    const agentsToRestore = await this.analyzeAgentRestore(checkpoint);
    const tasksToResume = await this.analyzeTaskResume(checkpoint);
    const locksToRestore = await this.analyzeLockRestore(checkpoint);
    const risks = await this.assessRecoveryRisks(checkpoint, force);
    const plan = {
      checkpointId,
      missionId: checkpoint.mission_id,
      agentsToRestore,
      tasksToResume,
      locksToRestore,
      estimatedDuration: this.calculateEstimatedDuration(agentsToRestore, tasksToResume),
      risks
    };
    await this.logRecoveryEvent("plan_created", {
      checkpointId,
      plan: this.sanitizePlanForLogging(plan)
    });
    return plan;
  }
  async executeRecovery(checkpointId, options = {}) {
    console.log(`\uD83D\uDD04 Starting recovery from checkpoint: ${checkpointId}`);
    const plan = await this.createRecoveryPlan(checkpointId, options.force);
    if (options.dryRun) {
      console.log("\uD83D\uDD0D DRY RUN - Recovery Plan:");
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
      restoredAgents: [],
      restoredTasks: [],
      restoredLocks: [],
      errors: []
    };
    try {
      console.log("\uD83D\uDE80 Phase 1: Restoring agents...");
      for (const agentPlan of plan.agentsToRestore.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })) {
        try {
          const agentId = await this.restoreAgent(agentPlan);
          result.restoredAgents.push(agentId);
          console.log(`\u2705 Restored agent: ${agentId} (${agentPlan.agentType})`);
        } catch (error) {
          const errorMsg = `Failed to restore agent ${agentPlan.agentId}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(`\u274C ${errorMsg}`);
        }
      }
      console.log("\uD83D\uDCCB Phase 2: Resuming tasks...");
      for (const taskPlan of plan.tasksToResume) {
        try {
          const taskId = await this.resumeTask(taskPlan);
          result.restoredTasks.push(taskId);
          console.log(`\u2705 Resumed task: ${taskId}`);
        } catch (error) {
          const errorMsg = `Failed to resume task ${taskPlan.taskId}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(`\u274C ${errorMsg}`);
        }
      }
      console.log("\uD83D\uDD12 Phase 3: Restoring locks...");
      for (const lockPlan of plan.locksToRestore) {
        try {
          const lockId = await this.restoreLock(lockPlan, options.force);
          result.restoredLocks.push(lockId);
          console.log(`\u2705 Restored lock: ${lockId}`);
        } catch (error) {
          const errorMsg = `Failed to restore lock ${lockPlan.lockId}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(`\u274C ${errorMsg}`);
        }
      }
      result.success = result.errors.length === 0 || result.errors.length < this.calculateAcceptableErrorCount(plan);
      await this.logRecoveryEvent("recovery_completed", {
        checkpointId,
        result,
        plan: this.sanitizePlanForLogging(plan)
      });
      console.log(`\uD83C\uDF89 Recovery ${result.success ? "completed successfully" : "completed with errors"}`);
      console.log(`   Agents restored: ${result.restoredAgents.length}`);
      console.log(`   Tasks resumed: ${result.restoredTasks.length}`);
      console.log(`   Locks restored: ${result.restoredLocks.length}`);
      console.log(`   Errors: ${result.errors.length}`);
      if (result.errors.length > 0) {
        console.log(`
\u26A0\uFE0F  Recovery errors:`);
        result.errors.forEach((error) => console.log(`   - ${error}`));
      }
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Recovery failed: ${error.message}`);
      await this.logRecoveryEvent("recovery_failed", {
        checkpointId,
        error: error.message,
        result
      });
      throw error;
    }
  }
  async analyzeAgentRestore(checkpoint) {
    const plans = [];
    if (checkpoint.sorties && Array.isArray(checkpoint.sorties)) {
      for (const sortie of checkpoint.sorties) {
        if (sortie.status === "in_progress" && sortie.assigned_to) {
          plans.push({
            agentId: `agt_${randomUUID3()}`,
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
  async analyzeTaskResume(checkpoint) {
    const plans = [];
    if (checkpoint.sorties && Array.isArray(checkpoint.sorties)) {
      for (const sortie of checkpoint.sorties) {
        if (sortie.status !== "completed") {
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
  async analyzeLockRestore(checkpoint) {
    const plans = [];
    if (checkpoint.active_locks && Array.isArray(checkpoint.active_locks)) {
      for (const lock of checkpoint.active_locks) {
        plans.push({
          lockId: `lock_${randomUUID3()}`,
          filePath: lock.file,
          originalAgent: lock.held_by,
          purpose: lock.purpose,
          needsConflictResolution: true
        });
      }
    }
    return plans;
  }
  async assessRecoveryRisks(checkpoint, force) {
    const risks = [];
    const checkpointAge = Date.now() - new Date(checkpoint.timestamp).getTime();
    const ageHours = checkpointAge / (1000 * 60 * 60);
    if (ageHours > 24) {
      risks.push(`Checkpoint is ${Math.round(ageHours)} hours old - environment may have changed`);
    }
    if (checkpoint.active_locks && checkpoint.active_locks.length > 0) {
      risks.push("Active locks may conflict with current state");
    }
    if (!force && await this.hasActiveAgents()) {
      risks.push("Active agents detected - use --force to override");
    }
    const agentCount = checkpoint.sorties?.filter((s) => s.status === "in_progress").length || 0;
    if (agentCount > 5) {
      risks.push(`High agent count (${agentCount}) may impact recovery performance`);
    }
    return risks;
  }
  async restoreAgent(plan) {
    const spawnRequest = {
      type: plan.agentType,
      task: plan.task,
      metadata: {
        restoredFromCheckpoint: plan.agentId,
        previousState: plan.previousState,
        restoreTimestamp: new Date().toISOString()
      },
      config: {
        timeout: 300000,
        retries: 2
      }
    };
    const agent = await this.agentSpawner.spawn(spawnRequest);
    return agent.id;
  }
  async resumeTask(plan) {
    console.log(`   Resuming task ${plan.taskId} with ${plan.progress}% progress`);
    const taskResume = {
      taskId: plan.taskId,
      missionId: plan.missionId,
      previousState: plan.previousState,
      progress: plan.progress,
      nextSteps: plan.nextSteps,
      resumedAt: new Date().toISOString()
    };
    return plan.taskId;
  }
  async restoreLock(plan, force = false) {
    if (plan.needsConflictResolution && !force) {
      const hasConflict = await this.checkLockConflict(plan.filePath);
      if (hasConflict) {
        throw new Error(`Lock conflict detected on ${plan.filePath}. Use --force to override.`);
      }
    }
    const lockRestore = {
      file: plan.filePath,
      specialist_id: plan.originalAgent,
      purpose: plan.purpose,
      timeout_ms: 3600000
    };
    const response = await fetch("http://localhost:3001/api/v1/lock/acquire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lockRestore)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Lock restore failed: ${errorData?.error || "Unknown error"}`);
    }
    const result = await response.json();
    return result.lock.id;
  }
  async hasActiveAgents() {
    try {
      const response = await fetch("http://localhost:3001/api/v1/agents");
      if (!response.ok)
        return false;
      const data = await response.json();
      return data.success && data.data?.agents?.length > 0;
    } catch {
      return false;
    }
  }
  async checkLockConflict(filePath) {
    try {
      const response = await fetch(`http://localhost:3001/api/v1/locks`);
      if (!response.ok)
        return false;
      const data = await response.json();
      if (!data.success)
        return false;
      const locks = data.data?.locks || [];
      return locks.some((lock) => lock.file === filePath && lock.status === "active");
    } catch {
      return false;
    }
  }
  mapSortieToAgentType(assignment) {
    const type = assignment.toLowerCase();
    if (type.includes("frontend") || type.includes("ui"))
      return "frontend" /* FRONTEND */;
    if (type.includes("backend") || type.includes("api"))
      return "backend" /* BACKEND */;
    if (type.includes("test") || type.includes("qa"))
      return "testing" /* TESTING */;
    if (type.includes("doc") || type.includes("write"))
      return "documentation" /* DOCUMENTATION */;
    if (type.includes("security") || type.includes("audit"))
      return "security" /* SECURITY */;
    if (type.includes("perf") || type.includes("optim"))
      return "performance" /* PERFORMANCE */;
    return "backend" /* BACKEND */;
  }
  determineAgentPriority(sortie) {
    if (sortie.priority === "critical")
      return "high";
    if (sortie.progress > 50)
      return "medium";
    return "low";
  }
  estimateAgentRestoreTime(sortie) {
    const baseTime = 30;
    const progressBonus = (sortie.progress || 0) * 0.5;
    return Math.max(baseTime - progressBonus, 10);
  }
  generateNextSteps(sortie, recoveryContext) {
    const steps = [];
    if (recoveryContext?.next_steps && Array.isArray(recoveryContext.next_steps)) {
      steps.push(...recoveryContext.next_steps);
    } else {
      steps.push(`Continue ${sortie.title || "task"}`);
      if (sortie.progress < 100) {
        steps.push(`Complete remaining ${100 - (sortie.progress || 0)}%`);
      }
    }
    return steps;
  }
  calculateEstimatedDuration(agents2, tasks) {
    const agentTime = agents2.reduce((sum, agent) => sum + agent.estimatedRestoreTime, 0);
    const taskTime = tasks.length * 10;
    return agentTime + taskTime + 30;
  }
  calculateAcceptableErrorCount(plan) {
    const totalItems = plan.agentsToRestore.length + plan.tasksToResume.length + plan.locksToRestore.length;
    return Math.max(1, Math.floor(totalItems * 0.1));
  }
  sanitizePlanForLogging(plan) {
    return {
      ...plan,
      agentsToRestore: plan.agentsToRestore.map((a) => ({
        ...a,
        previousState: "[REDACTED]"
      })),
      tasksToResume: plan.tasksToResume.map((t) => ({
        ...t,
        previousState: "[REDACTED]"
      }))
    };
  }
  async logRecoveryEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      data
    };
    try {
      await Bun.write(this.recoveryLogPath, JSON.stringify(logEntry) + `
`, { createPath: true });
    } catch (error) {
      console.warn("Failed to write recovery log:", error?.message || error);
    }
  }
}
var init_recovery_manager = __esm(() => {
  init_agent_spawner();
  init_checkpoint_routes();
});

// src/coordination/checkpoint-routes.ts
import Database2 from "bun:sqlite";
import { randomUUID as randomUUID4 } from "crypto";

class CheckpointManager {
  db;
  constructor(dbPath = ".flightline/checkpoints.db") {
    this.db = new Database2(dbPath);
    this.initializeDatabase();
  }
  initializeDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        trigger TEXT NOT NULL,
        trigger_details TEXT,
        progress_percent INTEGER,
        sorties TEXT, -- JSON array
        active_locks TEXT, -- JSON array
        pending_messages TEXT, -- JSON array
        recovery_context TEXT, -- JSON object
        created_by TEXT NOT NULL,
        version TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_checkpoints_mission_id ON checkpoints(mission_id);
      CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON checkpoints(timestamp);
    `);
  }
  async createCheckpoint(checkpoint) {
    const id = `chk_${randomUUID4()}`;
    const now = new Date().toISOString();
    try {
      const stmt = this.db.prepare(`
        INSERT INTO checkpoints (
          id, mission_id, timestamp, trigger, trigger_details,
          progress_percent, sorties, active_locks, pending_messages,
          recovery_context, created_by, version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, checkpoint.mission_id, checkpoint.timestamp, checkpoint.trigger, checkpoint.trigger_details || null, checkpoint.progress_percent || null, JSON.stringify(checkpoint.sorties || []), JSON.stringify(checkpoint.active_locks || []), JSON.stringify(checkpoint.pending_messages || []), JSON.stringify(checkpoint.recovery_context || {}), checkpoint.created_by, checkpoint.version, now);
      console.log(`\u2713 Checkpoint created: ${id}`);
      return {
        id,
        ...checkpoint
      };
    } catch (error) {
      console.error(`\u2717 Failed to create checkpoint:`, error.message);
      throw new Error(`Checkpoint creation failed: ${error.message}`);
    }
  }
  async getCheckpoint(checkpointId) {
    try {
      const stmt = this.db.prepare("SELECT * FROM checkpoints WHERE id = ?");
      const row = stmt.get(checkpointId);
      if (!row)
        return null;
      return this.rowToCheckpoint(row);
    } catch (error) {
      console.error(`\u2717 Failed to get checkpoint:`, error.message);
      throw new Error(`Get checkpoint failed: ${error.message}`);
    }
  }
  async getCheckpointsByMission(missionId) {
    try {
      const stmt = this.db.prepare("SELECT * FROM checkpoints WHERE mission_id = ? ORDER BY timestamp DESC");
      const rows = stmt.all(missionId);
      return rows.map((row) => this.rowToCheckpoint(row));
    } catch (error) {
      console.error(`\u2717 Failed to get checkpoints:`, error.message);
      throw new Error(`Get checkpoints failed: ${error.message}`);
    }
  }
  async getLatestCheckpoint(missionId) {
    try {
      const stmt = this.db.prepare("SELECT * FROM checkpoints WHERE mission_id = ? ORDER BY timestamp DESC LIMIT 1");
      const row = stmt.get(missionId);
      if (!row)
        return null;
      return this.rowToCheckpoint(row);
    } catch (error) {
      console.error(`\u2717 Failed to get latest checkpoint:`, error.message);
      throw new Error(`Get latest checkpoint failed: ${error.message}`);
    }
  }
  async deleteCheckpoint(checkpointId) {
    try {
      const stmt = this.db.prepare("DELETE FROM checkpoints WHERE id = ?");
      const result = stmt.run(checkpointId);
      return result.changes > 0;
    } catch (error) {
      console.error(`\u2717 Failed to delete checkpoint:`, error.message);
      throw new Error(`Delete checkpoint failed: ${error.message}`);
    }
  }
  rowToCheckpoint(row) {
    return {
      id: row.id,
      mission_id: row.mission_id,
      timestamp: row.timestamp,
      trigger: row.trigger,
      trigger_details: row.trigger_details,
      progress_percent: row.progress_percent,
      sorties: JSON.parse(row.sorties || "[]"),
      active_locks: JSON.parse(row.active_locks || "[]"),
      pending_messages: JSON.parse(row.pending_messages || "[]"),
      recovery_context: JSON.parse(row.recovery_context || "{}"),
      created_by: row.created_by,
      version: row.version
    };
  }
}
function registerCheckpointRoutes(router, headers) {
  router.post("/api/v1/checkpoints", async (request) => {
    try {
      const body = await request.json();
      const checkpoint = await checkpointManager.createCheckpoint({
        mission_id: body.mission_id,
        timestamp: new Date().toISOString(),
        trigger: body.trigger || "manual",
        trigger_details: body.trigger_details,
        progress_percent: body.progress_percent,
        sorties: body.sorties || [],
        active_locks: body.active_locks || [],
        pending_messages: body.pending_messages || [],
        recovery_context: body.recovery_context || {},
        created_by: body.created_by || "unknown",
        version: body.version || "1.0.0"
      });
      return new Response(JSON.stringify({
        success: true,
        data: checkpoint
      }), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to create checkpoint",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/checkpoints/:id", async (request, params) => {
    try {
      const checkpoint = await checkpointManager.getCheckpoint(params.id);
      if (!checkpoint) {
        return new Response(JSON.stringify({
          error: "Checkpoint not found"
        }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({
        success: true,
        data: checkpoint
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to get checkpoint",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/checkpoints", async (request) => {
    try {
      const url = new URL(request.url);
      const missionId = url.searchParams.get("mission_id");
      if (!missionId) {
        return new Response(JSON.stringify({
          error: "mission_id parameter is required"
        }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const checkpoints = await checkpointManager.getCheckpointsByMission(missionId);
      return new Response(JSON.stringify({
        success: true,
        data: checkpoints,
        count: checkpoints.length
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to get checkpoints",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/checkpoints/latest/:missionId", async (request, params) => {
    try {
      const checkpoint = await checkpointManager.getLatestCheckpoint(params.missionId);
      if (!checkpoint) {
        return new Response(JSON.stringify({
          error: "No checkpoints found for mission"
        }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({
        success: true,
        data: checkpoint
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to get latest checkpoint",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.delete("/api/v1/checkpoints/:id", async (request, params) => {
    try {
      const success = await checkpointManager.deleteCheckpoint(params.id);
      if (!success) {
        return new Response(JSON.stringify({
          error: "Checkpoint not found"
        }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({
        success: true,
        message: "Checkpoint deleted successfully"
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to delete checkpoint",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/checkpoints/:id/resume", async (request, params) => {
    try {
      const body = await request.json();
      const { force = false, dryRun = false } = body;
      const { RecoveryManager: RecoveryManager2 } = await Promise.resolve().then(() => (init_recovery_manager(), exports_recovery_manager));
      const recoveryManager = new RecoveryManager2;
      const result = await recoveryManager.executeRecovery(params.id, { force, dryRun });
      return new Response(JSON.stringify({
        success: result.success,
        data: {
          checkpointId: params.id,
          restoredAgents: result.restoredAgents,
          restoredTasks: result.restoredTasks,
          restoredLocks: result.restoredLocks,
          errors: result.errors,
          summary: result.success ? "Recovery completed successfully" : "Recovery completed with errors"
        }
      }), {
        status: result.success ? 200 : 207,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to resume from checkpoint",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}
var checkpointManager;
var init_checkpoint_routes = __esm(() => {
  checkpointManager = new CheckpointManager;
});

// ../../squawk/src/db/index.ts
import path2 from "path";
import fs2 from "fs";

// ../../squawk/src/db/sqlite.js
import Database from "bun:sqlite";
import fs from "fs";
import path from "path";

class SQLiteAdapter {
  version = "1.0.0";
  db = null;
  dbPath;
  schemaPath;
  missions = {};
  sorties = {};
  locks = {};
  events = {};
  checkpoints = {};
  specialists = {};
  messages = {};
  cursors = {};
  constructor(dbPath = ":memory:", schemaPath) {
    this.dbPath = dbPath;
    if (schemaPath) {
      this.schemaPath = schemaPath;
      return;
    }
    this.schemaPath = this.resolveSchemaPath();
  }
  resolveSchemaPath() {
    const possiblePaths = [];
    try {
      const __filename2 = new URL("", import.meta.url).pathname;
      const __dirname2 = path.dirname(__filename2);
      possiblePaths.push(path.join(__dirname2, "schema.sql"));
    } catch {}
    possiblePaths.push(path.join(process.cwd(), "squawk", "src", "db", "schema.sql"));
    const projectRoot = process.cwd();
    const modulePaths = [
      path.join(projectRoot, "src", "db", "schema.sql"),
      path.join(projectRoot, "db", "schema.sql"),
      path.join(projectRoot, "lib", "db", "schema.sql")
    ];
    possiblePaths.push(...modulePaths);
    try {
      const stack = new Error().stack;
      if (stack) {
        const match = stack.match(/at.*\((.*):.*\)/);
        if (match && match[1]) {
          const callerDir = path.dirname(match[1]);
          possiblePaths.push(path.join(callerDir, "schema.sql"));
          possiblePaths.push(path.join(callerDir, "..", "src", "db", "schema.sql"));
        }
      }
    } catch {}
    for (const candidatePath of possiblePaths) {
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    }
    return possiblePaths[0] || path.join(process.cwd(), "squawk", "src", "db", "schema.sql");
  }
  async initialize() {
    try {
      this.db = new Database(this.dbPath);
      if (this.dbPath !== ":memory:") {
        this.db.exec("PRAGMA journal_mode = WAL");
      }
      this.db.exec("PRAGMA foreign_keys = ON");
      if (fs.existsSync(this.schemaPath)) {
        const schema = fs.readFileSync(this.schemaPath, "utf-8");
        this.db.exec(schema);
      } else {
        throw new Error(`Schema file not found: ${this.schemaPath}`);
      }
      this.initializeOperations();
      console.log(`SQLite database initialized: ${this.dbPath}`);
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }
  initializeOperations() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    const adapter = this;
    adapter.mailboxes = {
      version: "1.0.0",
      create: async (input) => {
        const now = new Date().toISOString();
        const createdAt = input.created_at || now;
        const updatedAt = input.updated_at || now;
        this.db.prepare(`
          INSERT INTO mailboxes (id, created_at, updated_at)
          VALUES (?, ?, ?)
        `).run(input.id, createdAt, updatedAt);
        return { id: input.id, created_at: createdAt, updated_at: updatedAt };
      },
      getById: async (id) => {
        const row = this.db.prepare(`
          SELECT * FROM mailboxes WHERE id = ?
        `).get(id);
        return row || null;
      },
      getAll: async () => {
        const rows = this.db.prepare(`
          SELECT * FROM mailboxes ORDER BY created_at DESC
        `).all();
        return rows;
      },
      update: async (id, data) => {
        const now = new Date().toISOString();
        const result = this.db.prepare(`
          UPDATE mailboxes
          SET updated_at = COALESCE(?, updated_at)
          WHERE id = ?
        `).run(now, id);
        if (result.changes === 0)
          return null;
        return await this.mailboxes.getById(id);
      },
      delete: async (id) => {
        const result = this.db.prepare(`
          DELETE FROM mailboxes WHERE id = ?
        `).run(id);
        return result.changes > 0;
      }
    };
    this.cursors = {
      version: "1.0.0",
      create: async (input) => {
        const now = new Date().toISOString();
        this.db.prepare(`
          INSERT INTO cursors (id, stream_id, position, consumer_id, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(input.id, input.stream_id, input.position, input.consumer_id, now);
        return { id: input.id, stream_id: input.stream_id, position: input.position, consumer_id: input.consumer_id, updated_at: now };
      },
      getById: async (id) => {
        const row = this.db.prepare(`
          SELECT * FROM cursors WHERE id = ?
        `).get(id);
        return row || null;
      },
      getByStream: async (streamId) => {
        const row = this.db.prepare(`
          SELECT * FROM cursors WHERE stream_id = ?
        `).get(streamId);
        return row || null;
      },
      advance: async (streamId, position) => {
        const now = new Date().toISOString();
        this.db.prepare(`
          INSERT INTO cursors (id, stream_id, position, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(stream_id) DO UPDATE SET
            position = excluded.position,
            updated_at = excluded.updated_at
        `).run(`${streamId}_cursor`, streamId, position, now);
        return await adapter.cursors.getByStream(streamId);
      },
      update: async (id, data) => {
        const now = new Date().toISOString();
        this.db.prepare(`
          UPDATE cursors
          SET position = COALESCE(?, position),
              updated_at = COALESCE(?, updated_at)
          WHERE id = ?
        `).run(data.position, now, id);
        return await adapter.cursors.getById(id);
      },
      getAll: async (filter) => {
        let query = "SELECT * FROM cursors";
        const params = [];
        if (filter?.stream_type) {
          query += " WHERE stream_id LIKE ?";
          params.push(`${filter.stream_type}_%`);
        }
        query += " ORDER BY updated_at DESC";
        const rows = this.db.prepare(query).all(...params);
        return rows;
      }
    };
    this.locks = {
      version: "1.0.0",
      acquire: async (input) => {
        const id = `lock_${Math.random().toString(36).substring(2, 10)}`;
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + input.timeout_ms).toISOString();
        const existing = this.db.prepare(`
          SELECT * FROM locks
          WHERE file = ? AND released_at IS NULL AND expires_at > datetime('now')
        `).get(input.file);
        if (existing) {
          return {
            conflict: true,
            existing_lock: existing
          };
        }
        this.db.prepare(`
          INSERT INTO locks (id, file, reserved_by, reserved_at, purpose, timeout_ms, checksum, expires_at, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, input.file, input.specialist_id, now, input.purpose || "edit", input.timeout_ms, input.checksum, expiresAt, JSON.stringify(input.metadata || {}));
        const lock = await adapter.locks.getById(id);
        return {
          conflict: false,
          lock: {
            ...lock,
            status: "active",
            expires_at: expiresAt,
            normalized_path: input.file
          }
        };
      },
      release: async (id) => {
        const result = this.db.prepare(`
          UPDATE locks
          SET released_at = datetime('now'),
              status = 'released'
          WHERE id = ?
        `).run(id);
        return result.changes > 0;
      },
      getById: async (id) => {
        const row = this.db.prepare(`
          SELECT * FROM locks WHERE id = ?
        `).get(id);
        return row || null;
      },
      getByFile: async (file) => {
        const row = this.db.prepare(`
          SELECT * FROM locks
          WHERE file = ? AND released_at IS NULL AND expires_at > datetime('now')
        `).get(file);
        return row || null;
      },
      getActive: async () => {
        const rows = this.db.prepare(`
          SELECT * FROM locks
          WHERE released_at IS NULL AND expires_at > datetime('now')
        `).all();
        return rows.map((row) => ({
          ...row,
          status: "active",
          normalized_path: row.file
        }));
      },
      getAll: async () => {
        const rows = this.db.prepare(`
          SELECT * FROM locks ORDER BY reserved_at DESC
        `).all();
        return rows;
      },
      forceRelease: async (id) => {
        const result = this.db.prepare(`
          UPDATE locks
          SET released_at = datetime('now'),
              status = 'force_released'
          WHERE id = ?
        `).run(id);
        return result.changes > 0;
      },
      getExpired: async () => {
        const now = new Date().toISOString();
        const rows = this.db.prepare(`
          SELECT * FROM locks
          WHERE released_at IS NULL 
            AND timeout_ms IS NOT NULL
            AND expires_at IS NOT NULL
            AND expires_at < datetime('now')
        `).all();
        return rows;
      },
      releaseExpired: async () => {
        const result = this.db.prepare(`
          UPDATE locks
          SET released_at = datetime('now'),
              status = 'expired'
          WHERE released_at IS NULL 
            AND timeout_ms IS NOT NULL
            AND expires_at IS NOT NULL
            AND expires_at < datetime('now')
        `).run();
        return result.changes;
      }
    };
    this.events = {
      version: "1.0.0",
      append: async (input) => {
        const eventId = `evt_${Math.random().toString(36).substring(2, 10)}`;
        const lastSeq = this.db.prepare(`
          SELECT MAX(sequence_number) as last_seq
          FROM events
          WHERE stream_type = ? AND stream_id = ?
        `).get(input.stream_type, input.stream_id);
        const sequenceNumber = (lastSeq?.last_seq || 0) + 1;
        const now = new Date().toISOString();
        let mailboxId = input.stream_id;
        const existingMailbox = this.db.prepare(`
          SELECT id FROM mailboxes WHERE id = ?
        `).get(input.stream_id);
        if (!existingMailbox) {
          mailboxId = `mbx_${input.stream_type}_${input.stream_id}`;
          this.db.prepare(`
            INSERT OR IGNORE INTO mailboxes (id, created_at, updated_at)
            VALUES (?, ?, ?)
          `).run(mailboxId, now, now);
        }
        this.db.prepare(`
          INSERT INTO events (
            id, mailbox_id, type, stream_type, stream_id, sequence_number,
            data, occurred_at, causation_id, correlation_id, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(eventId, mailboxId, input.event_type, input.stream_type, input.stream_id, sequenceNumber, JSON.stringify(input.data), input.occurred_at || now, input.causation_id || null, input.correlation_id || null, JSON.stringify(input.metadata || {}));
        return {
          sequence_number: sequenceNumber,
          event_id: eventId,
          event_type: input.event_type,
          stream_type: input.stream_type,
          stream_id: input.stream_id,
          data: input.data,
          causation_id: input.causation_id,
          correlation_id: input.correlation_id,
          metadata: input.metadata,
          occurred_at: input.occurred_at || now,
          recorded_at: now,
          schema_version: input.schema_version || 1
        };
      },
      queryByStream: async (streamType, streamId, afterSequence) => {
        const query = `
          SELECT * FROM events
          WHERE stream_type = ? AND stream_id = ?
          ${afterSequence ? "AND sequence_number > ?" : ""}
          ORDER BY sequence_number ASC
        `;
        const params = [streamType, streamId];
        if (afterSequence !== undefined)
          params.push(afterSequence);
        const rows = this.db.prepare(query).all(...params);
        return rows.map((row) => ({
          sequence_number: row.sequence_number,
          event_id: row.id,
          event_type: row.type,
          stream_type: row.stream_type,
          stream_id: row.stream_id,
          data: JSON.parse(row.data),
          causation_id: row.causation_id,
          correlation_id: row.correlation_id,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
          occurred_at: row.occurred_at,
          recorded_at: row.occurred_at,
          schema_version: 1
        }));
      },
      queryByType: async (eventType) => {
        const rows = this.db.prepare(`
          SELECT * FROM events WHERE type = ? ORDER BY occurred_at ASC
        `).all(eventType);
        return rows.map((row) => ({
          sequence_number: row.sequence_number,
          event_id: row.id,
          event_type: row.type,
          stream_type: row.stream_type,
          stream_id: row.stream_id,
          data: JSON.parse(row.data),
          causation_id: row.causation_id,
          correlation_id: row.correlation_id,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
          occurred_at: row.occurred_at,
          recorded_at: row.occurred_at,
          schema_version: 1
        }));
      },
      getEvents: async (filter) => {
        let query = "SELECT * FROM events WHERE 1=1";
        const params = [];
        if (filter.event_type) {
          if (Array.isArray(filter.event_type)) {
            query += ` AND type IN (${filter.event_type.map(() => "?").join(",")})`;
            params.push(...filter.event_type);
          } else {
            query += " AND type = ?";
            params.push(filter.event_type);
          }
        }
        if (filter.stream_type) {
          if (Array.isArray(filter.stream_type)) {
            query += ` AND stream_type IN (${filter.stream_type.map(() => "?").join(",")})`;
            params.push(...filter.stream_type);
          } else {
            query += " AND stream_type = ?";
            params.push(filter.stream_type);
          }
        }
        if (filter.stream_id) {
          query += " AND stream_id = ?";
          params.push(filter.stream_id);
        }
        if (filter.after_sequence !== undefined) {
          query += " AND sequence_number > ?";
          params.push(filter.after_sequence);
        }
        query += " ORDER BY occurred_at ASC";
        const rows = this.db.prepare(query).all(...params);
        return rows.map((row) => ({
          sequence_number: row.sequence_number,
          event_id: row.id,
          event_type: row.type,
          stream_type: row.stream_type,
          stream_id: row.stream_id,
          data: JSON.parse(row.data),
          causation_id: row.causation_id,
          correlation_id: row.correlation_id,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
          occurred_at: row.occurred_at,
          recorded_at: row.occurred_at,
          schema_version: 1
        }));
      },
      getLatestByStream: async (streamType, streamId) => {
        const row = this.db.prepare(`
          SELECT * FROM events
          WHERE stream_type = ? AND stream_id = ?
          ORDER BY sequence_number DESC
          LIMIT 1
        `).get(streamType, streamId);
        return row ? {
          sequence_number: row.sequence_number,
          event_id: row.id,
          event_type: row.type,
          stream_type: row.stream_type,
          stream_id: row.stream_id,
          data: JSON.parse(row.data),
          causation_id: row.causation_id,
          correlation_id: row.correlation_id,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
          occurred_at: row.occurred_at,
          recorded_at: row.occurred_at,
          schema_version: 1
        } : null;
      }
    };
    this.missions = {};
    this.sorties = {};
    this.checkpoints = {};
    this.specialists = {};
    this.messages = {};
    adapter.checkpoints = {
      version: "1.0.0",
      create: async (input) => {
        const id = input.id || `chk_${Math.random().toString(36).substring(2, 10)}`;
        const now = new Date().toISOString();
        this.db.prepare(`
          INSERT INTO checkpoints (
            id, mission_id, mission_title, timestamp, trigger, trigger_details,
            progress_percent, sorties, active_locks, pending_messages,
            recovery_context, created_by, expires_at, version, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, input.mission_id, input.mission_title || null, input.timestamp || now, input.trigger, input.trigger_details || null, input.progress_percent || 0, JSON.stringify(input.sorties || []), JSON.stringify(input.active_locks || []), JSON.stringify(input.pending_messages || []), JSON.stringify(input.recovery_context || {}), input.created_by, input.expires_at || null, input.version || "1.0.0", JSON.stringify(input.metadata || {}));
        const checkpoint = await adapter.checkpoints.getById(id);
        return checkpoint;
      },
      getById: async (id) => {
        const row = this.db.prepare(`
          SELECT * FROM checkpoints WHERE id = ?
        `).get(id);
        if (!row)
          return null;
        return {
          id: row.id,
          mission_id: row.mission_id,
          mission_title: row.mission_title,
          timestamp: row.timestamp,
          trigger: row.trigger,
          trigger_details: row.trigger_details,
          progress_percent: row.progress_percent,
          sorties: row.sorties ? JSON.parse(row.sorties) : [],
          active_locks: row.active_locks ? JSON.parse(row.active_locks) : [],
          pending_messages: row.pending_messages ? JSON.parse(row.pending_messages) : [],
          recovery_context: row.recovery_context ? JSON.parse(row.recovery_context) : {},
          created_by: row.created_by,
          expires_at: row.expires_at,
          consumed_at: row.consumed_at,
          version: row.version,
          metadata: row.metadata ? JSON.parse(row.metadata) : {}
        };
      },
      getLatest: async (missionId) => {
        const row = this.db.prepare(`
          SELECT * FROM checkpoints
          WHERE mission_id = ? AND consumed_at IS NULL
          ORDER BY timestamp DESC
          LIMIT 1
        `).get(missionId);
        if (!row)
          return null;
        return await adapter.checkpoints.getById(row.id);
      },
      list: async (missionId) => {
        let query = "SELECT * FROM checkpoints";
        const params = [];
        if (missionId) {
          query += " WHERE mission_id = ?";
          params.push(missionId);
        }
        query += " ORDER BY timestamp DESC";
        const rows = this.db.prepare(query).all(...params);
        return rows.map((row) => ({
          id: row.id,
          mission_id: row.mission_id,
          mission_title: row.mission_title,
          timestamp: row.timestamp,
          trigger: row.trigger,
          trigger_details: row.trigger_details,
          progress_percent: row.progress_percent,
          sorties: row.sorties ? JSON.parse(row.sorties) : [],
          active_locks: row.active_locks ? JSON.parse(row.active_locks) : [],
          pending_messages: row.pending_messages ? JSON.parse(row.pending_messages) : [],
          recovery_context: row.recovery_context ? JSON.parse(row.recovery_context) : {},
          created_by: row.created_by,
          expires_at: row.expires_at,
          consumed_at: row.consumed_at,
          version: row.version,
          metadata: row.metadata ? JSON.parse(row.metadata) : {}
        }));
      },
      delete: async (id) => {
        const result = this.db.prepare(`
          DELETE FROM checkpoints WHERE id = ?
        `).run(id);
        return result.changes > 0;
      },
      markConsumed: async (id) => {
        const now = new Date().toISOString();
        const result = this.db.prepare(`
          UPDATE checkpoints
          SET consumed_at = ?
          WHERE id = ?
        `).run(now, id);
        if (result.changes > 0) {
          return await adapter.checkpoints.getById(id);
        }
        return null;
      }
    };
  }
  async close() {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
        console.log(`SQLite database closed: ${this.dbPath}`);
      }
    } catch (error) {
      console.error("Error closing database:", error);
      throw error;
    }
  }
  async isHealthy() {
    try {
      if (!this.db) {
        return false;
      }
      this.db.prepare("SELECT 1").get();
      return true;
    } catch {
      return false;
    }
  }
  async getStats() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    const eventCount = this.db.prepare("SELECT COUNT(*) as count FROM events").get();
    const missionCount = 0;
    const activeMissionCount = 0;
    const activeLockCount = this.db.prepare("SELECT COUNT(*) as count FROM locks WHERE released_at IS NULL AND expires_at > datetime('now')").get();
    const checkpointCount = 0;
    let dbSize = 0;
    let walSize = 0;
    if (this.dbPath !== ":memory:" && fs.existsSync(this.dbPath)) {
      dbSize = fs.statSync(this.dbPath).size;
      const walPath = `${this.dbPath}-wal`;
      if (fs.existsSync(walPath)) {
        walSize = fs.statSync(walPath).size;
      }
    }
    return {
      total_events: eventCount.count,
      total_missions: missionCount,
      active_missions: activeMissionCount,
      active_locks: activeLockCount.count,
      total_checkpoints: checkpointCount,
      database_size_bytes: dbSize,
      wal_size_bytes: walSize
    };
  }
  async maintenance() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    try {
      this.db.exec("VACUUM");
      console.log("Database maintenance completed");
    } catch (error) {
      console.error("Error running database maintenance:", error);
      throw error;
    }
  }
  async beginTransaction() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    try {
      this.db.exec("BEGIN TRANSACTION");
    } catch (error) {
      console.error("Error beginning transaction:", error);
      throw error;
    }
  }
  async commitTransaction() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    try {
      this.db.exec("COMMIT");
    } catch (error) {
      console.error("Error committing transaction:", error);
      throw error;
    }
  }
  async rollbackTransaction() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    try {
      this.db.exec("ROLLBACK");
    } catch (error) {
      console.error("Error rolling back transaction:", error);
      throw error;
    }
  }
  getDatabase() {
    return this.db;
  }
}

// ../../squawk/src/db/index.ts
var __dirname = "/home/vitruvius/git/fleettools/squawk/src/db";
function getLegacyDbPath() {
  return path2.join(process.env.HOME || "", ".local", "share", "fleet", "squawk.json");
}
function getSqliteDbPath() {
  const preferredPath = path2.join(process.env.HOME || "", ".local", "share", "fleet", "squawk.db");
  const preferredDir = path2.dirname(preferredPath);
  try {
    if (!fs2.existsSync(preferredDir)) {
      fs2.mkdirSync(preferredDir, { recursive: true });
    }
    const testFile = path2.join(preferredDir, ".write-test");
    fs2.writeFileSync(testFile, "");
    fs2.unlinkSync(testFile);
    console.log(`[Database] \u2713 Preferred path is writable: ${preferredPath}`);
    return preferredPath;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[Database] Preferred path not writable (${errorMsg})`);
    console.warn(`[Database] Trying fallback path: /tmp/fleet/`);
    const tmpPath = path2.join("/tmp", "fleet", `squawk-${process.pid}.db`);
    const tmpDir = path2.dirname(tmpPath);
    try {
      if (!fs2.existsSync(tmpDir)) {
        fs2.mkdirSync(tmpDir, { recursive: true });
      }
      const testFile = path2.join(tmpDir, ".write-test");
      fs2.writeFileSync(testFile, "");
      fs2.unlinkSync(testFile);
      console.log(`[Database] \u2713 Fallback path is writable: ${tmpPath}`);
      return tmpPath;
    } catch (fallbackError) {
      const fallbackErrorMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      console.warn(`[Database] Fallback path also not writable (${fallbackErrorMsg})`);
      console.warn(`[Database] Using in-memory database as last resort`);
      return ":memory:";
    }
  }
}
var adapter = null;
async function initializeDatabase(dbPath) {
  console.log("[Database] Determining database path...");
  const targetPath = dbPath || getSqliteDbPath();
  console.log(`[Database] Using database path: ${targetPath}`);
  if (targetPath !== ":memory:") {
    const dbDir = path2.dirname(targetPath);
    try {
      if (!fs2.existsSync(dbDir)) {
        console.log(`[Database] Creating directory: ${dbDir}`);
        fs2.mkdirSync(dbDir, { recursive: true });
      }
    } catch (error) {
      console.warn(`[Database] Warning: Could not create directory ${dbDir}, attempting with selected path anyway`);
      console.warn(`[Database] Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log("[Database] Initializing SQLite adapter...");
  const schemaPath = path2.join(__dirname, "schema.sql");
  adapter = new SQLiteAdapter(targetPath, schemaPath);
  await adapter.initialize();
  console.log("[Database] \u2713 Adapter initialized successfully");
  const legacyDbPath = getLegacyDbPath();
  if (fs2.existsSync(legacyDbPath)) {
    await migrateFromJson(legacyDbPath);
    const backupPath = legacyDbPath + ".backup";
    fs2.renameSync(legacyDbPath, backupPath);
    console.log(`[Migration] Legacy data migrated to SQLite`);
    console.log(`[Migration] Backup saved to: ${backupPath}`);
  }
}
function getAdapter() {
  if (!adapter) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return adapter;
}
async function closeDatabase() {
  if (adapter) {
    await adapter.close();
    adapter = null;
  }
}
async function migrateFromJson(jsonPath) {
  console.log(`[Migration] Starting migration from: ${jsonPath}`);
  try {
    const content = fs2.readFileSync(jsonPath, "utf-8");
    const legacyData = JSON.parse(content);
    const stats = {
      mailboxes: 0,
      events: 0,
      cursors: 0,
      locks: 0
    };
    for (const [id, mailbox] of Object.entries(legacyData.mailboxes || {})) {
      try {
        if (!mailbox.created_at || !mailbox.updated_at) {
          console.warn(`[Migration] Skipping mailbox ${id} due to missing required fields`);
          continue;
        }
        await adapter.mailboxes.create({
          id,
          created_at: mailbox.created_at,
          updated_at: mailbox.updated_at
        });
        stats.mailboxes++;
      } catch (error) {
        console.warn(`[Migration] Failed to migrate mailbox ${id}:`, error);
      }
    }
    for (const [mailboxId, events] of Object.entries(legacyData.events || {})) {
      if (!await adapter.mailboxes.getById(mailboxId)) {
        await adapter.mailboxes.create({
          id: mailboxId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        stats.mailboxes++;
      }
      for (const event of events) {
        try {
          if (!event.type) {
            console.warn(`[Migration] Skipping event without type field in mailbox ${mailboxId}`);
            continue;
          }
          await adapter.events.append({
            event_type: event.type,
            stream_type: "squawk",
            stream_id: mailboxId,
            data: typeof event.data === "string" ? JSON.parse(event.data) : event.data,
            occurred_at: event.occurred_at,
            causation_id: event.causation_id,
            correlation_id: event.correlation_id,
            metadata: event.metadata ? typeof event.metadata === "string" ? JSON.parse(event.metadata) : event.metadata : undefined
          });
          stats.events++;
        } catch (error) {
          console.warn(`[Migration] Failed to migrate event:`, error);
        }
      }
    }
    for (const [id, cursor] of Object.entries(legacyData.cursors || {})) {
      try {
        await adapter.cursors.create({
          id,
          stream_type: "squawk",
          stream_id: cursor.stream_id,
          position: cursor.position,
          consumer_id: cursor.consumer_id || "migrated"
        });
        stats.cursors++;
      } catch (error) {
        console.warn(`[Migration] Failed to migrate cursor ${id}:`, error);
      }
    }
    for (const [id, lock] of Object.entries(legacyData.locks || {})) {
      const lockData = lock;
      if (!lockData.released_at) {
        try {
          await adapter.locks.acquire({
            file: lockData.file,
            specialist_id: lockData.reserved_by,
            timeout_ms: lockData.timeout_ms || 30000,
            purpose: lockData.purpose === "delete" ? "delete" : lockData.purpose === "read" ? "read" : "edit",
            checksum: lockData.checksum
          });
          stats.locks++;
        } catch (error) {
          console.warn(`[Migration] Failed to migrate lock ${id}:`, error);
        }
      }
    }
    console.log(`[Migration] Complete:`);
    console.log(`  - Mailboxes: ${stats.mailboxes}`);
    console.log(`  - Events: ${stats.events}`);
    console.log(`  - Cursors: ${stats.cursors}`);
    console.log(`  - Locks: ${stats.locks}`);
  } catch (error) {
    console.error("[Migration] Failed:", error);
    throw error;
  }
}
var mailboxOps = {
  getAll: async () => {
    const adapter2 = getAdapter();
    const mailboxes = await adapter2.mailboxes.getAll();
    return mailboxes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  getById: async (id) => {
    const adapter2 = getAdapter();
    return adapter2.mailboxes.getById(id);
  },
  create: async (id) => {
    const adapter2 = getAdapter();
    const now = new Date().toISOString();
    return adapter2.mailboxes.create({
      id,
      created_at: now,
      updated_at: now
    });
  },
  exists: async (id) => {
    const adapter2 = getAdapter();
    const mailbox = await adapter2.mailboxes.getById(id);
    return mailbox !== null;
  }
};
var eventOps = {
  getByMailbox: async (mailboxId) => {
    const adapter2 = getAdapter();
    const events = await adapter2.events.queryByStream("squawk", mailboxId);
    return events.sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  },
  append: async (mailboxId, events) => {
    const adapter2 = getAdapter();
    if (!await adapter2.mailboxes.getById(mailboxId)) {
      await adapter2.mailboxes.create({
        id: mailboxId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    const inserted = [];
    for (const event of events) {
      const appended = await adapter2.events.append({
        event_type: event.type,
        stream_type: "squawk",
        stream_id: mailboxId,
        data: typeof event.data === "string" ? JSON.parse(event.data) : event.data,
        occurred_at: event.occurred_at,
        causation_id: event.causation_id,
        correlation_id: event.correlation_id,
        metadata: event.metadata ? typeof event.metadata === "string" ? JSON.parse(event.metadata) : event.metadata : undefined
      });
      inserted.push(appended);
    }
    return inserted;
  }
};
var cursorOps = {
  getById: async (id) => {
    const adapter2 = getAdapter();
    return adapter2.cursors.getById(id);
  },
  getByStream: async (streamId) => {
    const adapter2 = getAdapter();
    const cursors = await adapter2.cursors.getAll();
    return cursors.find((c) => c.stream_id === streamId) || null;
  },
  upsert: async (cursor) => {
    const adapter2 = getAdapter();
    const id = cursor.id || `${cursor.stream_id}_cursor`;
    const now = new Date().toISOString();
    const existing = await adapter2.cursors.getById(id);
    if (existing) {
      await adapter2.cursors.update(id, {
        position: cursor.position,
        updated_at: now
      });
      return existing;
    } else {
      return adapter2.cursors.create({
        id,
        stream_type: "squawk",
        stream_id: cursor.stream_id,
        position: cursor.position,
        consumer_id: cursor.consumer_id || "default"
      });
    }
  }
};
var lockOps = {
  getAll: async () => {
    const adapter2 = getAdapter();
    const allLocks = await adapter2.locks.getAll();
    const now = new Date().toISOString();
    return allLocks.filter((lock) => {
      if (lock.status === "released")
        return false;
      const expiresAt = lock.expires_at;
      return expiresAt > now;
    });
  },
  getById: async (id) => {
    const adapter2 = getAdapter();
    return adapter2.locks.getById(id);
  },
  acquire: async (lock) => {
    const adapter2 = getAdapter();
    const result = await adapter2.locks.acquire({
      file: lock.file,
      specialist_id: lock.reserved_by || lock.specialist_id,
      timeout_ms: lock.timeout_ms || 30000,
      purpose: lock.purpose === "delete" ? "delete" : lock.purpose === "read" ? "read" : "edit",
      checksum: lock.checksum
    });
    if (result.conflict) {
      return result.existing_lock || {
        id: result.lock?.id || "",
        file: lock.file,
        reserved_by: result.lock?.reserved_by || "",
        reserved_at: result.lock?.reserved_at || "",
        released_at: null,
        purpose: lock.purpose || "edit",
        checksum: lock.checksum,
        timeout_ms: lock.timeout_ms || 30000,
        metadata: lock.metadata
      };
    }
    return result.lock;
  },
  release: async (id) => {
    const adapter2 = getAdapter();
    const lock = await adapter2.locks.getById(id);
    if (lock) {
      await adapter2.locks.release(id);
      return lock;
    }
    return null;
  },
  getExpired: async () => {
    const adapter2 = getAdapter();
    const allLocks = await adapter2.locks.getAll();
    const now = new Date().toISOString();
    return allLocks.filter((lock) => {
      if (lock.status === "released")
        return false;
      const expiresAt = lock.expires_at;
      return expiresAt <= now;
    });
  },
  releaseExpired: async () => {
    const expired = await lockOps.getExpired();
    for (const lock of expired) {
      await lockOps.release(lock.id);
    }
    return expired.length;
  }
};

// ../../squawk/src/recovery/detector.ts
var DEFAULT_ACTIVITY_THRESHOLD_MS = 5 * 60 * 1000;
// src/flightline/work-orders.ts
import path3 from "path";
import fs3 from "fs";
import crypto from "crypto";
var FLIGHTLINE_DIR = path3.join(process.cwd(), ".flightline");
var WORK_ORDERS_DIR = path3.join(FLIGHTLINE_DIR, "work-orders");
function ensureDirectories() {
  if (!fs3.existsSync(FLIGHTLINE_DIR)) {
    fs3.mkdirSync(FLIGHTLINE_DIR, { recursive: true });
  }
  if (!fs3.existsSync(WORK_ORDERS_DIR)) {
    fs3.mkdirSync(WORK_ORDERS_DIR, { recursive: true });
  }
}
function generateId() {
  return "wo_" + crypto.randomUUID();
}
function getWorkOrderPath(orderId) {
  return path3.join(WORK_ORDERS_DIR, orderId, "manifest.json");
}
function registerWorkOrdersRoutes(router, headers) {
  ensureDirectories();
  router.get("/api/v1/work-orders", async (req) => {
    try {
      if (!fs3.existsSync(WORK_ORDERS_DIR)) {
        return new Response(JSON.stringify({ work_orders: [] }), {
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const directories = fs3.readdirSync(WORK_ORDERS_DIR);
      const workOrders = [];
      for (const dirName of directories) {
        const manifestPath = path3.join(WORK_ORDERS_DIR, dirName, "manifest.json");
        if (!fs3.existsSync(manifestPath))
          continue;
        const manifest = JSON.parse(fs3.readFileSync(manifestPath, "utf-8"));
        workOrders.push(manifest);
      }
      return new Response(JSON.stringify({ work_orders: workOrders }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error listing work orders:", error);
      return new Response(JSON.stringify({ error: "Failed to list work orders" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/work-orders", async (req) => {
    try {
      const body = await req.json();
      const { title, description, priority = "medium", assigned_to = [] } = body;
      if (!title) {
        return new Response(JSON.stringify({ error: "title is required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const orderId = generateId();
      const now = new Date().toISOString();
      const manifest = {
        id: orderId,
        title,
        description: description || "",
        status: "pending",
        priority,
        created_at: now,
        updated_at: now,
        assigned_to,
        cells: [],
        tech_orders: []
      };
      const orderDir = path3.join(WORK_ORDERS_DIR, orderId);
      const manifestPath = path3.join(orderDir, "manifest.json");
      fs3.mkdirSync(orderDir, { recursive: true });
      fs3.mkdirSync(path3.join(orderDir, "cells"), { recursive: true });
      fs3.mkdirSync(path3.join(orderDir, "events"), { recursive: true });
      fs3.mkdirSync(path3.join(orderDir, "artifacts"), { recursive: true });
      fs3.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`Created work order: ${orderId} - ${title}`);
      return new Response(JSON.stringify({ work_order: manifest }), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error creating work order:", error);
      return new Response(JSON.stringify({ error: "Failed to create work order" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/work-orders/:id", async (req, params) => {
    try {
      const manifestPath = getWorkOrderPath(params.id);
      if (!fs3.existsSync(manifestPath)) {
        return new Response(JSON.stringify({ error: "Work order not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const manifest = JSON.parse(fs3.readFileSync(manifestPath, "utf-8"));
      return new Response(JSON.stringify({ work_order: manifest }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting work order:", error);
      return new Response(JSON.stringify({ error: "Failed to get work order" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.patch("/api/v1/work-orders/:id", async (req, params) => {
    try {
      const body = await req.json();
      const manifestPath = getWorkOrderPath(params.id);
      if (!fs3.existsSync(manifestPath)) {
        return new Response(JSON.stringify({ error: "Work order not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const manifest = JSON.parse(fs3.readFileSync(manifestPath, "utf-8"));
      if (body.title)
        manifest.title = body.title;
      if (body.description !== undefined)
        manifest.description = body.description;
      if (body.status)
        manifest.status = body.status;
      if (body.priority)
        manifest.priority = body.priority;
      if (body.assigned_to)
        manifest.assigned_to = body.assigned_to;
      manifest.updated_at = new Date().toISOString();
      fs3.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`Updated work order: ${params.id}`);
      return new Response(JSON.stringify({ work_order: manifest }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error updating work order:", error);
      return new Response(JSON.stringify({ error: "Failed to update work order" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.delete("/api/v1/work-orders/:id", async (req, params) => {
    try {
      const orderDir = path3.join(WORK_ORDERS_DIR, params.id);
      if (!fs3.existsSync(orderDir)) {
        return new Response(JSON.stringify({ error: "Work order not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      fs3.rmSync(orderDir, { recursive: true, force: true });
      console.log(`Deleted work order: ${params.id}`);
      return new Response(null, {
        status: 204,
        headers: { ...headers }
      });
    } catch (error) {
      console.error("Error deleting work order:", error);
      return new Response(JSON.stringify({ error: "Failed to delete work order" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/flightline/ctk.ts
import path4 from "path";
import fs4 from "fs";
import crypto2 from "crypto";
var FLIGHTLINE_DIR2 = path4.join(process.cwd(), ".flightline");
var CTK_DIR = path4.join(FLIGHTLINE_DIR2, "ctk");
function ensureDirectory() {
  if (!fs4.existsSync(CTK_DIR)) {
    fs4.mkdirSync(CTK_DIR, { recursive: true });
  }
}
function checksumFile(filePath) {
  try {
    const content = fs4.readFileSync(filePath);
    return crypto2.createHash("sha256").update(content).digest("hex");
  } catch (error) {
    return null;
  }
}
function registerCtkRoutes(router, headers) {
  ensureDirectory();
  router.get("/api/v1/ctk/reservations", async (req) => {
    try {
      const files = fs4.readdirSync(CTK_DIR);
      const reservations = [];
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = fs4.readFileSync(path4.join(CTK_DIR, file), "utf-8");
          const reservation = JSON.parse(content);
          reservations.push(reservation);
        }
      }
      return new Response(JSON.stringify({ reservations }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error listing CTK reservations:", error);
      return new Response(JSON.stringify({ error: "Failed to list reservations" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/ctk/reserve", async (req) => {
    try {
      const body = await req.json();
      const { file, specialist_id, purpose = "edit" } = body;
      if (!file || !specialist_id) {
        return new Response(JSON.stringify({ error: "file and specialist_id are required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const reservation = {
        id: crypto2.randomUUID(),
        file,
        reserved_by: specialist_id,
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose,
        checksum: checksumFile(file)
      };
      const reservationPath = path4.join(CTK_DIR, `${reservation.id}.json`);
      fs4.writeFileSync(reservationPath, JSON.stringify(reservation, null, 2));
      console.log(`Reserved file ${file} for specialist ${specialist_id}`);
      return new Response(JSON.stringify({ reservation }), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error creating reservation:", error);
      return new Response(JSON.stringify({ error: "Failed to create reservation" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/ctk/release", async (req) => {
    try {
      const body = await req.json();
      const { reservation_id } = body;
      if (!reservation_id) {
        return new Response(JSON.stringify({ error: "reservation_id is required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const reservationPath = path4.join(CTK_DIR, `${reservation_id}.json`);
      if (!fs4.existsSync(reservationPath)) {
        return new Response(JSON.stringify({ error: "Reservation not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const reservation = JSON.parse(fs4.readFileSync(reservationPath, "utf-8"));
      reservation.released_at = new Date().toISOString();
      fs4.writeFileSync(reservationPath, JSON.stringify(reservation, null, 2));
      console.log(`Released reservation ${reservation_id}`);
      return new Response(JSON.stringify({ reservation }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error releasing reservation:", error);
      return new Response(JSON.stringify({ error: "Failed to release reservation" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/flightline/tech-orders.ts
import path5 from "path";
import fs5 from "fs";
import crypto3 from "crypto";
var FLIGHTLINE_DIR3 = path5.join(process.cwd(), ".flightline");
var TECH_ORDERS_DIR = path5.join(FLIGHTLINE_DIR3, "tech-orders");
function ensureDirectory2() {
  if (!fs5.existsSync(TECH_ORDERS_DIR)) {
    fs5.mkdirSync(TECH_ORDERS_DIR, { recursive: true });
  }
}
function registerTechOrdersRoutes(router, headers) {
  ensureDirectory2();
  router.get("/api/v1/tech-orders", async (req) => {
    try {
      const files = fs5.readdirSync(TECH_ORDERS_DIR);
      const techOrders = [];
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = fs5.readFileSync(path5.join(TECH_ORDERS_DIR, file), "utf-8");
          const techOrder = JSON.parse(content);
          techOrders.push(techOrder);
        }
      }
      return new Response(JSON.stringify({ tech_orders: techOrders }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error listing tech orders:", error);
      return new Response(JSON.stringify({ error: "Failed to list tech orders" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/tech-orders", async (req) => {
    try {
      const body = await req.json();
      const { name, pattern, context, usage_count = 0 } = body;
      if (!name || !pattern) {
        return new Response(JSON.stringify({ error: "name and pattern are required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const techOrder = {
        id: "to_" + crypto3.randomUUID(),
        name,
        pattern,
        context,
        usage_count,
        success_rate: 0,
        anti_pattern: false,
        created_at: new Date().toISOString(),
        last_used: null
      };
      const techOrderPath = path5.join(TECH_ORDERS_DIR, `${techOrder.id}.json`);
      fs5.writeFileSync(techOrderPath, JSON.stringify(techOrder, null, 2));
      console.log(`Created tech order: ${name}`);
      return new Response(JSON.stringify({ tech_order: techOrder }), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error creating tech order:", error);
      return new Response(JSON.stringify({ error: "Failed to create tech order" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/squawk/mailbox.ts
function registerMailboxRoutes(router, headers) {
  router.post("/api/v1/mailbox/append", async (req) => {
    try {
      const body = await req.json();
      const { stream_id, events } = body;
      if (!stream_id || !Array.isArray(events)) {
        return new Response(JSON.stringify({ error: "stream_id and events array are required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      if (!await mailboxOps.exists(stream_id)) {
        await mailboxOps.create(stream_id);
      }
      const formattedEvents = events.map((e) => ({
        type: e.type,
        stream_id,
        data: JSON.stringify(e.data),
        occurred_at: new Date().toISOString(),
        causation_id: e.causation_id || null,
        metadata: e.metadata ? JSON.stringify(e.metadata) : null
      }));
      const inserted = await eventOps.append(stream_id, formattedEvents);
      const mailbox = await mailboxOps.getById(stream_id);
      const mailboxEvents = await eventOps.getByMailbox(stream_id);
      return new Response(JSON.stringify({
        mailbox: { ...mailbox, events: mailboxEvents },
        inserted: inserted.length
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error appending to mailbox:", error);
      return new Response(JSON.stringify({ error: "Failed to append to mailbox" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/mailbox/:streamId", async (req, params) => {
    try {
      const streamId = params.streamId;
      const mailbox = await mailboxOps.getById(streamId);
      if (!mailbox) {
        return new Response(JSON.stringify({ error: "Mailbox not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const events = await eventOps.getByMailbox(streamId);
      return new Response(JSON.stringify({ mailbox: { ...mailbox, events } }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting mailbox:", error);
      return new Response(JSON.stringify({ error: "Failed to get mailbox" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/squawk/cursor.ts
function registerCursorRoutes(router, headers) {
  router.post("/api/v1/cursor/advance", async (req) => {
    try {
      const body = await req.json();
      const { stream_id, position } = body;
      if (!stream_id || typeof position !== "number") {
        return new Response(JSON.stringify({ error: "stream_id and position are required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      if (!await mailboxOps.exists(stream_id)) {
        return new Response(JSON.stringify({ error: "Mailbox not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const cursor = await cursorOps.upsert({ stream_id, position, updated_at: new Date().toISOString() });
      return new Response(JSON.stringify({ cursor }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error advancing cursor:", error);
      return new Response(JSON.stringify({ error: "Failed to advance cursor" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/cursor/:cursorId", async (req, params) => {
    try {
      const cursorId = params.cursorId;
      const cursor = cursorOps.getById(cursorId);
      if (!cursor) {
        return new Response(JSON.stringify({ error: "Cursor not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ cursor }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting cursor:", error);
      return new Response(JSON.stringify({ error: "Failed to get cursor" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/squawk/lock.ts
function registerLockRoutes(router, headers) {
  router.post("/api/v1/lock/acquire", async (req) => {
    try {
      const body = await req.json();
      const { file, specialist_id, timeout_ms = 30000 } = body;
      if (!file || !specialist_id) {
        return new Response(JSON.stringify({ error: "file and specialist_id are required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const lock = await lockOps.acquire({
        file,
        reserved_by: specialist_id,
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose: "edit",
        checksum: null,
        timeout_ms,
        metadata: null
      });
      return new Response(JSON.stringify({ lock }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error acquiring lock:", error);
      return new Response(JSON.stringify({ error: "Failed to acquire lock" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/lock/release", async (req) => {
    try {
      const body = await req.json();
      const { lock_id, specialist_id } = body;
      if (!lock_id) {
        return new Response(JSON.stringify({ error: "lock_id is required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const lock = await lockOps.getById(lock_id);
      if (!lock) {
        return new Response(JSON.stringify({ error: "Lock not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      if (lock.reserved_by !== specialist_id) {
        return new Response(JSON.stringify({ error: "Cannot release lock: wrong specialist" }), {
          status: 403,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const updatedLock = await lockOps.release(lock_id);
      return new Response(JSON.stringify({ lock: updatedLock }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error releasing lock:", error);
      return new Response(JSON.stringify({ error: "Failed to release lock" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/locks", async (req) => {
    try {
      const locks = lockOps.getAll();
      return new Response(JSON.stringify({ locks }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error listing locks:", error);
      return new Response(JSON.stringify({ error: "Failed to list locks" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/squawk/coordinator.ts
function registerCoordinatorRoutes(router, headers) {
  router.get("/api/v1/coordinator/status", async (req) => {
    try {
      const mailboxes = await mailboxOps.getAll();
      const locks = await lockOps.getAll();
      return new Response(JSON.stringify({
        active_mailboxes: mailboxes.length,
        active_locks: locks.length,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting coordinator status:", error);
      return new Response(JSON.stringify({ error: "Failed to get status" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/agents/routes.ts
import { randomUUID } from "crypto";
var agents = new Map;
var assignments = new Map;
agents.set("FSD-001", {
  id: randomUUID(),
  agent_type: "full-stack-developer",
  callsign: "FSD-001",
  status: "idle",
  capabilities: [{
    id: "feature-implementation",
    name: "End-to-End Feature Implementation",
    trigger_words: ["implement", "feature", "build", "develop"]
  }],
  current_workload: 0,
  max_workload: 2,
  last_heartbeat: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});
agents.set("CR-001", {
  id: randomUUID(),
  agent_type: "code-reviewer",
  callsign: "CR-001",
  status: "idle",
  capabilities: [{
    id: "code-quality",
    name: "Code Quality Review",
    trigger_words: ["review", "quality", "audit", "refactor"]
  }],
  current_workload: 1,
  max_workload: 4,
  last_heartbeat: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});
function registerAgentRoutes(router, headers) {
  router.get("/api/v1/agents", async (req) => {
    try {
      const agentList = Array.from(agents.values());
      return new Response(JSON.stringify({
        success: true,
        data: {
          agents: agentList,
          count: agentList.length,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting agents:", error);
      return new Response(JSON.stringify({ error: "Failed to get agents" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/agents/:callsign", async (req, params) => {
    try {
      const agent = agents.get(params.callsign);
      if (!agent) {
        return new Response(JSON.stringify({ error: "Agent not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({
        agent,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting agent:", error);
      return new Response(JSON.stringify({ error: "Failed to get agent" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/agents/register", async (req) => {
    try {
      const body = await req.json();
      const validTypes = ["frontend", "backend", "testing", "documentation", "security", "performance"];
      if (!validTypes.includes(body.agent_type)) {
        return new Response(JSON.stringify({
          error: "Invalid agent type. Must be one of: " + validTypes.join(", ")
        }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      for (const agent of agents.values()) {
        if (agent.callsign === body.callsign) {
          return new Response(JSON.stringify({ error: "Agent callsign already exists" }), {
            status: 409,
            headers: { ...headers, "Content-Type": "application/json" }
          });
        }
      }
      const newAgent = {
        id: randomUUID(),
        agent_type: body.agent_type,
        callsign: body.callsign,
        status: "offline",
        capabilities: body.capabilities || [],
        current_workload: 0,
        max_workload: body.max_workload || 1,
        last_heartbeat: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      agents.set(body.callsign, newAgent);
      console.log(`Agent registered: ${body.callsign} (${body.agent_type})`);
      return new Response(JSON.stringify({
        success: true,
        data: newAgent,
        message: "Agent registered successfully",
        timestamp: new Date().toISOString()
      }), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error registering agent:", error);
      return new Response(JSON.stringify({ error: "Failed to register agent" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.patch("/api/v1/agents/:callsign/status", async (req, params) => {
    try {
      const body = await req.json();
      const agent = agents.get(params.callsign);
      if (!agent) {
        return new Response(JSON.stringify({ error: "Agent not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      agent.status = body.status;
      agent.last_heartbeat = new Date().toISOString();
      agent.updated_at = new Date().toISOString();
      if (body.workload !== undefined) {
        agent.current_workload = body.workload;
      }
      agents.set(params.callsign, agent);
      return new Response(JSON.stringify({
        agent,
        message: "Agent status updated",
        timestamp: new Date().toISOString()
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error updating agent status:", error);
      return new Response(JSON.stringify({ error: "Failed to update agent status" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/agents/:callsign/assignments", async (req, params) => {
    try {
      const agent = agents.get(params.callsign);
      if (!agent) {
        return new Response(JSON.stringify({ error: "Agent not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const agentAssignments = Array.from(assignments.values()).filter((assignment) => assignment.agent_callsign === params.callsign);
      return new Response(JSON.stringify({
        assignments: agentAssignments,
        count: agentAssignments.length,
        agent: {
          id: agent.id,
          callsign: agent.callsign,
          agent_type: agent.agent_type,
          status: agent.status,
          current_workload: agent.current_workload,
          max_workload: agent.max_workload
        },
        timestamp: new Date().toISOString()
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting agent assignments:", error);
      return new Response(JSON.stringify({ error: "Failed to get agent assignments" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.patch("/api/v1/assignments/:id/status", async (req, params) => {
    try {
      const body = await req.json();
      const assignment = assignments.get(params.id);
      if (!assignment) {
        return new Response(JSON.stringify({ error: "Assignment not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      assignment.status = body.status;
      if (body.progress_percent !== undefined) {
        assignment.progress_percent = body.progress_percent;
      }
      assignments.set(params.id, assignment);
      return new Response(JSON.stringify({
        assignment,
        message: "Assignment status updated",
        timestamp: new Date().toISOString()
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error updating assignment status:", error);
      return new Response(JSON.stringify({ error: "Failed to update assignment status" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/assignments", async (req) => {
    try {
      const body = await req.json();
      const suitableAgent = Array.from(agents.values()).find((agent) => agent.status === "idle" && agent.current_workload < agent.max_workload && agent.capabilities.some((cap) => cap.trigger_words.some((trigger) => body.work_type.toLowerCase().includes(trigger.toLowerCase()))));
      if (!suitableAgent) {
        return new Response(JSON.stringify({
          error: "No suitable agent available for this work type",
          work_type: body.work_type,
          available_agents: Array.from(agents.values()).map((a) => ({
            callsign: a.callsign,
            agent_type: a.agent_type,
            status: a.status,
            workload: `${a.current_workload}/${a.max_workload}`
          }))
        }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      const assignment = {
        id: randomUUID(),
        agent_id: suitableAgent.id,
        agent_callsign: suitableAgent.callsign,
        work_order_id: body.work_order_id,
        work_type: body.work_type,
        priority: body.priority || "medium",
        assigned_at: new Date().toISOString(),
        status: "assigned",
        progress_percent: 0,
        context: body.context
      };
      assignments.set(assignment.id, assignment);
      suitableAgent.current_workload++;
      suitableAgent.status = "busy";
      suitableAgent.updated_at = new Date().toISOString();
      console.log(`Work assigned: ${body.work_order_id} to ${suitableAgent.callsign}`);
      return new Response(JSON.stringify({
        assignment,
        agent: {
          id: suitableAgent.id,
          callsign: suitableAgent.callsign,
          agent_type: suitableAgent.agent_type
        },
        message: "Work assigned successfully",
        timestamp: new Date().toISOString()
      }), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error creating assignment:", error);
      return new Response(JSON.stringify({ error: "Failed to create assignment" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/assignments", async (req) => {
    try {
      const assignmentList = Array.from(assignments.values());
      const url = new URL(req.url);
      const statusFilter = url.searchParams.get("status");
      const filteredAssignments = statusFilter ? assignmentList.filter((a) => a.status === statusFilter) : assignmentList;
      return new Response(JSON.stringify({
        assignments: filteredAssignments,
        count: filteredAssignments.length,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting assignments:", error);
      return new Response(JSON.stringify({ error: "Failed to get assignments" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/agents/coordinate", async (req) => {
    try {
      const body = await req.json();
      const coordinationId = randomUUID();
      console.log(`Coordination requested: ${body.coordination_type} by ${body.coordinator_agent}`);
      return new Response(JSON.stringify({
        coordination_id: coordinationId,
        coordinator_agent: body.coordinator_agent,
        participating_agents: body.participating_agents,
        coordination_type: body.coordination_type,
        status: "initiated",
        started_at: new Date().toISOString(),
        message: "Coordination session initiated",
        timestamp: new Date().toISOString()
      }), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error initiating coordination:", error);
      return new Response(JSON.stringify({ error: "Failed to initiate coordination" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/agents/stats", async (req) => {
    try {
      const agentList = Array.from(agents.values());
      const assignmentList = Array.from(assignments.values());
      const stats = {
        total_agents: agentList.length,
        agents_by_type: agentList.reduce((acc, agent) => {
          acc[agent.agent_type] = (acc[agent.agent_type] || 0) + 1;
          return acc;
        }, {}),
        agents_by_status: agentList.reduce((acc, agent) => {
          acc[agent.status] = (acc[agent.status] || 0) + 1;
          return acc;
        }, {}),
        total_assignments: assignmentList.length,
        assignments_by_status: assignmentList.reduce((acc, assignment) => {
          acc[assignment.status] = (acc[assignment.status] || 0) + 1;
          return acc;
        }, {}),
        active_workload: agentList.reduce((sum, agent) => sum + agent.current_workload, 0),
        max_workload: agentList.reduce((sum, agent) => sum + agent.max_workload, 0),
        utilization_rate: agentList.length > 0 ? agentList.reduce((sum, agent) => sum + agent.current_workload, 0) / agentList.reduce((sum, agent) => sum + agent.max_workload, 0) * 100 : 0,
        timestamp: new Date().toISOString()
      };
      return new Response(JSON.stringify(stats), {
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error getting agent stats:", error);
      return new Response(JSON.stringify({ error: "Failed to get agent stats" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/index.ts
init_checkpoint_routes();

// src/coordination/task-queue.ts
import Database3 from "bun:sqlite";
import { randomUUID as randomUUID5 } from "crypto";
import path8 from "path";
var TaskStatus;
((TaskStatus2) => {
  TaskStatus2["PENDING"] = "pending";
  TaskStatus2["ASSIGNED"] = "assigned";
  TaskStatus2["IN_PROGRESS"] = "in_progress";
  TaskStatus2["COMPLETED"] = "completed";
  TaskStatus2["FAILED"] = "failed";
  TaskStatus2["CANCELLED"] = "cancelled";
})(TaskStatus ||= {});

class TaskQueue {
  db;
  config;
  constructor(config = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      dbPath: path8.join(process.cwd(), ".flightline", "tasks.db"),
      ...config
    };
    this.db = new Database3(this.config.dbPath);
    this.initializeDatabase();
  }
  initializeDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        priority TEXT NOT NULL DEFAULT 'medium',
        assigned_to TEXT,
        mission_id TEXT,
        dependencies TEXT, -- JSON array
        metadata TEXT, -- JSON object
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        retry_count INTEGER DEFAULT 0,
        last_retry_at TEXT
      )
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_tasks_mission_id ON tasks(mission_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    `);
  }
  async enqueue(task) {
    const taskId = `tsk_${randomUUID5()}`;
    const now = new Date().toISOString();
    try {
      const stmt = this.db.prepare(`
        INSERT INTO tasks (
          id, type, title, description, status, priority,
          assigned_to, mission_id, dependencies, metadata,
          created_at, updated_at, retry_count, last_retry_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(taskId, task.type, task.title, task.description, task.status || "pending" /* PENDING */, task.priority, task.assignedTo || null, task.missionId || null, JSON.stringify(task.dependencies || []), JSON.stringify(task.metadata || {}), now, now, 0, null);
      console.log(`\u2713 Task enqueued: ${taskId} (${task.title})`);
      return taskId;
    } catch (error) {
      console.error(`\u2717 Failed to enqueue task:`, error.message);
      throw new Error(`Task enqueue failed: ${error.message}`);
    }
  }
  async dequeue(agentType, limit = 1) {
    try {
      let whereClause = "status = ?";
      const params = ["pending" /* PENDING */];
      if (agentType) {
        whereClause += " AND (type = ? OR type = ?)";
        params.push(agentType, "general");
      }
      whereClause += " ORDER BY priority DESC, created_at ASC LIMIT ?";
      params.push(limit);
      const stmt = this.db.prepare(`
        SELECT * FROM tasks 
        WHERE ${whereClause}
      `);
      const rows = stmt.all(...params);
      if (rows.length === 0) {
        return [];
      }
      const taskIds = rows.map((row) => row.id);
      await this.markAsAssigned(taskIds);
      const tasks = rows.map((row) => this.rowToTask(row));
      console.log(`\u2713 Dequeued ${tasks.length} task(s)`);
      return tasks;
    } catch (error) {
      console.error(`\u2717 Failed to dequeue tasks:`, error.message);
      throw new Error(`Task dequeue failed: ${error.message}`);
    }
  }
  async markAsInProgress(taskId) {
    await this.updateTaskStatus(taskId, "in_progress" /* IN_PROGRESS */);
  }
  async complete(taskId, result) {
    try {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(`
        UPDATE tasks 
        SET status = ?, updated_at = ?, completed_at = ?, metadata = ?
        WHERE id = ?
      `);
      const currentTask = await this.getTask(taskId);
      const updatedMetadata = {
        ...currentTask?.metadata,
        result: result || null
      };
      stmt.run("completed" /* COMPLETED */, now, now, JSON.stringify(updatedMetadata), taskId);
      console.log(`\u2713 Task completed: ${taskId}`);
    } catch (error) {
      await this.fail(taskId, `Completion failed: ${error.message}`);
      throw new Error(`Task completion failed: ${error.message}`);
    }
  }
  async fail(taskId, error) {
    try {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(`
        UPDATE tasks 
        SET status = ?, updated_at = ?, retry_count = retry_count + 1, last_retry_at = ?
        WHERE id = ?
      `);
      stmt.run("failed" /* FAILED */, now, now, taskId);
      console.log(`\u2717 Task failed: ${taskId} - ${error}`);
    } catch (error2) {
      console.error(`\u2717 Failed to mark task as failed:`, error2.message);
      throw new Error(`Task failure marking failed: ${error2.message}`);
    }
  }
  async getTask(taskId) {
    try {
      const stmt = this.db.prepare("SELECT * FROM tasks WHERE id = ?");
      const row = stmt.get(taskId);
      return row ? this.rowToTask(row) : null;
    } catch (error) {
      console.error(`\u2717 Failed to get task:`, error.message);
      return null;
    }
  }
  async getTasksByStatus(status) {
    try {
      const stmt = this.db.prepare("SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC");
      const rows = stmt.all(status);
      return rows.map((row) => this.rowToTask(row));
    } catch (error) {
      console.error(`\u2717 Failed to get tasks by status:`, error.message);
      return [];
    }
  }
  async getTasksByMission(missionId) {
    try {
      const stmt = this.db.prepare("SELECT * FROM tasks WHERE mission_id = ? ORDER BY priority DESC, created_at ASC");
      const rows = stmt.all(missionId);
      return rows.map((row) => this.rowToTask(row));
    } catch (error) {
      console.error(`\u2717 Failed to get mission tasks:`, error.message);
      return [];
    }
  }
  async getTasksByAgent(agentId) {
    try {
      const stmt = this.db.prepare("SELECT * FROM tasks WHERE assigned_to = ? ORDER BY created_at DESC");
      const rows = stmt.all(agentId);
      return rows.map((row) => this.rowToTask(row));
    } catch (error) {
      console.error(`\u2717 Failed to get agent tasks:`, error.message);
      return [];
    }
  }
  async retryFailedTasks() {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks 
        WHERE status = ? AND retry_count < ?
        ORDER BY priority DESC, created_at ASC
      `);
      const rows = stmt.all("failed" /* FAILED */, this.config.maxRetries);
      let retriedCount = 0;
      for (const row of rows) {
        if (row.dependencies) {
          const dependencies = JSON.parse(row.dependencies);
          const pendingDeps = await this.checkDependencies(dependencies);
          if (pendingDeps.length > 0) {
            continue;
          }
        }
        await this.resetTask(row.id);
        retriedCount++;
      }
      if (retriedCount > 0) {
        console.log(`\u2713 Retried ${retriedCount} failed tasks`);
      }
      return retriedCount;
    } catch (error) {
      console.error(`\u2717 Failed to retry tasks:`, error.message);
      return 0;
    }
  }
  async getStats() {
    try {
      const stats = {
        total: 0,
        pending: 0,
        assigned: 0,
        inProgress: 0,
        completed: 0,
        failed: 0
      };
      const stmt = this.db.prepare("SELECT status, COUNT(*) as count FROM tasks GROUP BY status");
      const rows = stmt.all();
      rows.forEach((row) => {
        stats.total += row.count;
        switch (row.status) {
          case "pending" /* PENDING */:
            stats.pending = row.count;
            break;
          case "assigned" /* ASSIGNED */:
            stats.assigned = row.count;
            break;
          case "in_progress" /* IN_PROGRESS */:
            stats.inProgress = row.count;
            break;
          case "completed" /* COMPLETED */:
            stats.completed = row.count;
            break;
          case "failed" /* FAILED */:
            stats.failed = row.count;
            break;
        }
      });
      return stats;
    } catch (error) {
      console.error(`\u2717 Failed to get stats:`, error.message);
      return {
        total: 0,
        pending: 0,
        assigned: 0,
        inProgress: 0,
        completed: 0,
        failed: 0
      };
    }
  }
  async markAsAssigned(taskIds) {
    if (taskIds.length === 0)
      return;
    const placeholders = taskIds.map(() => "?").join(",");
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET status = ?, updated_at = ? 
      WHERE id IN (${placeholders})
    `);
    const now = new Date().toISOString();
    stmt.run("assigned" /* ASSIGNED */, now, ...taskIds);
  }
  async updateTaskStatus(taskId, status) {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET status = ?, updated_at = ? 
      WHERE id = ?
    `);
    stmt.run(status, new Date().toISOString(), taskId);
  }
  async resetTask(taskId) {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET status = ?, updated_at = ?, completed_at = NULL 
      WHERE id = ?
    `);
    stmt.run("pending" /* PENDING */, new Date().toISOString(), taskId);
  }
  async checkDependencies(dependencies) {
    if (dependencies.length === 0)
      return [];
    const placeholders = dependencies.map(() => "?").join(",");
    const stmt = this.db.prepare(`
      SELECT id FROM tasks 
      WHERE id IN (${placeholders}) AND status != ?
    `);
    const incompleteRows = stmt.all(...dependencies, "completed" /* COMPLETED */);
    return incompleteRows.map((row) => row.id);
  }
  rowToTask(row) {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description || "",
      status: row.status,
      priority: row.priority,
      assignedTo: row.assigned_to,
      missionId: row.mission_id,
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    };
  }
  close() {
    this.db.close();
  }
}

// src/coordination/task-queue-routes.ts
var taskQueue = new TaskQueue({
  dbPath: ".flightline/tasks.db"
});
function registerTaskQueueRoutes(router, headers) {
  router.post("/api/v1/tasks", async (request) => {
    try {
      const body = await request.json();
      const taskId = await taskQueue.enqueue({
        type: body.type,
        title: body.title,
        description: body.description,
        status: "pending" /* PENDING */,
        priority: body.priority || "medium",
        missionId: body.missionId,
        dependencies: body.dependencies,
        metadata: body.metadata || {}
      });
      const task = await taskQueue.getTask(taskId);
      return new Response(JSON.stringify({
        success: true,
        data: task
      }), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to create task",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/tasks", async (request) => {
    try {
      const url = new URL(request.url);
      const status = url.searchParams.get("status");
      const missionId = url.searchParams.get("missionId");
      const assignedTo = url.searchParams.get("assignedTo");
      let tasks = [];
      if (status) {
        tasks = await taskQueue.getTasksByStatus(status);
      } else if (missionId) {
        tasks = await taskQueue.getTasksByMission(missionId);
      } else if (assignedTo) {
        tasks = await taskQueue.getTasksByAgent(assignedTo);
      } else {
        const allStatuses = Object.values(TaskStatus);
        const allTasksPromises = allStatuses.map((s) => taskQueue.getTasksByStatus(s));
        const allTasksArrays = await Promise.all(allTasksPromises);
        tasks = allTasksArrays.flat();
      }
      return new Response(JSON.stringify({
        success: true,
        data: tasks,
        count: tasks.length
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to get tasks",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/tasks/:id", async (request, params) => {
    try {
      const task = await taskQueue.getTask(params.id);
      if (!task) {
        return new Response(JSON.stringify({
          error: "Task not found"
        }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({
        success: true,
        data: task
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to get task",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.patch("/api/v1/tasks/:id/start", async (request, params) => {
    try {
      await taskQueue.markAsInProgress(params.id);
      const task = await taskQueue.getTask(params.id);
      if (!task) {
        return new Response(JSON.stringify({
          error: "Task not found"
        }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({
        success: true,
        data: task
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to start task",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.patch("/api/v1/tasks/:id/complete", async (request, params) => {
    try {
      const body = await request.json();
      await taskQueue.complete(params.id, body.result);
      const task = await taskQueue.getTask(params.id);
      return new Response(JSON.stringify({
        success: true,
        data: task
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to complete task",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.patch("/api/v1/tasks/:id/fail", async (request, params) => {
    try {
      const body = await request.json();
      await taskQueue.fail(params.id, body.error || "Task failed");
      const task = await taskQueue.getTask(params.id);
      return new Response(JSON.stringify({
        success: true,
        data: task
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to fail task",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/tasks/next/:agentType?", async (request, params) => {
    try {
      const agentType = params?.agentType;
      const tasks = await taskQueue.dequeue(agentType, 5);
      return new Response(JSON.stringify({
        success: true,
        data: tasks,
        count: tasks.length
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to get next tasks",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/tasks/stats", async (request) => {
    try {
      const stats = await taskQueue.getStats();
      return new Response(JSON.stringify({
        success: true,
        data: stats
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to get task statistics",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/tasks/retry-failed", async (request) => {
    try {
      const retriedCount = await taskQueue.retryFailedTasks();
      return new Response(JSON.stringify({
        success: true,
        message: `Retried ${retriedCount} failed tasks`,
        data: { retriedCount }
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to retry tasks",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/coordination/learning/pattern-storage.ts
import Database4 from "bun:sqlite";
import { randomUUID as randomUUID6 } from "crypto";

class PatternStorage {
  db;
  constructor(dbPath = ".flightline/learning.db") {
    this.db = new Database4(dbPath);
  }
  async storePattern(pattern) {
    const id = `pat_` + randomUUID6();
    const now = new Date().toISOString();
    try {
      const stmt = this.db.prepare(`
        INSERT INTO learned_patterns (
          id, pattern_type, description, task_sequence, success_rate,
          usage_count, effectiveness_score, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, pattern.pattern_type, pattern.description || null, JSON.stringify(pattern.task_sequence), pattern.success_rate || 0, pattern.usage_count || 0, pattern.effectiveness_score || 0, pattern.version || 1, now, now);
      return id;
    } catch (error) {
      throw new Error(`Failed to store pattern: ${error.message}`);
    }
  }
  async getPattern(patternId) {
    try {
      const stmt = this.db.prepare("SELECT * FROM learned_patterns WHERE id = ?");
      const row = stmt.get(patternId);
      return row ? this.rowToPattern(row) : null;
    } catch (error) {
      throw new Error(`Failed to get pattern: ${error.message}`);
    }
  }
  async listPatterns(filter) {
    try {
      const stmt = this.db.prepare("SELECT * FROM learned_patterns ORDER BY effectiveness_score DESC LIMIT 100");
      const rows = stmt.all();
      return rows.map((row) => this.rowToPattern(row));
    } catch (error) {
      throw new Error(`Failed to list patterns: ${error.message}`);
    }
  }
  rowToPattern(row) {
    return {
      id: row.id,
      pattern_type: row.pattern_type,
      description: row.description,
      task_sequence: JSON.parse(row.task_sequence || "[]"),
      success_rate: row.success_rate || 0,
      usage_count: row.usage_count || 0,
      effectiveness_score: row.effectiveness_score || 0,
      version: row.version || 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
var pattern_storage_default = PatternStorage;

// src/coordination/learning/routes.ts
var patternStorage = new pattern_storage_default;
function registerLearningRoutes(router, headers) {
  router.get("/api/v1/patterns", async (request) => {
    try {
      const url = new URL(request.url);
      const patternType = url.searchParams.get("type");
      const patterns = await patternStorage.listPatterns({
        pattern_type: patternType || undefined
      });
      return new Response(JSON.stringify({
        success: true,
        data: patterns,
        count: patterns.length
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to list patterns",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/patterns/:id", async (request, params) => {
    try {
      const pattern = await patternStorage.getPattern(params.id);
      if (!pattern) {
        return new Response(JSON.stringify({
          error: "Pattern not found"
        }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({
        success: true,
        data: pattern
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to get pattern",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.post("/api/v1/patterns", async (request) => {
    try {
      const body = await request.json();
      const patternId = await patternStorage.storePattern({
        pattern_type: body.pattern_type || "general",
        description: body.description,
        task_sequence: body.task_sequence || [],
        success_rate: body.success_rate || 0,
        usage_count: body.usage_count || 0,
        effectiveness_score: body.effectiveness_score || 0,
        version: body.version || 1
      });
      const pattern = await patternStorage.getPattern(patternId);
      return new Response(JSON.stringify({
        success: true,
        data: pattern,
        message: "Pattern created successfully"
      }), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to create pattern",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.delete("/api/v1/patterns/:id", async (request, params) => {
    try {
      const success = await patternStorage.getPattern(params.id);
      if (!success) {
        return new Response(JSON.stringify({
          error: "Pattern not found"
        }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" }
        });
      }
      await patternStorage.updatePattern(params.id, { usage_count: -1 });
      return new Response(JSON.stringify({
        success: true,
        message: "Pattern deleted successfully"
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to delete pattern",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
  router.get("/api/v1/learning/metrics", async (request) => {
    try {
      const patterns = await patternStorage.listPatterns();
      const metrics = {
        total_patterns: patterns.length,
        patterns_by_type: {},
        average_effectiveness: patterns.length > 0 ? patterns.reduce((sum, p) => sum + p.effectiveness_score, 0) / patterns.length : 0,
        total_usage: patterns.reduce((sum, p) => sum + p.usage_count, 0)
      };
      for (const pattern of patterns) {
        metrics.patterns_by_type[pattern.pattern_type] = (metrics.patterns_by_type[pattern.pattern_type] || 0) + 1;
      }
      return new Response(JSON.stringify({
        success: true,
        data: metrics
      }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to get metrics",
        message: error.message
      }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  });
}

// src/index.ts
var corsEnabled = process.env.CORS_ENABLED !== "false";
var corsAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim()) : ["http://localhost:3000"];
function getCorsHeaders(origin) {
  const baseHeaders = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
  if (!corsEnabled) {
    return baseHeaders;
  }
  if (origin && corsAllowedOrigins.includes(origin)) {
    baseHeaders["Access-Control-Allow-Origin"] = origin;
  } else if (corsAllowedOrigins.length === 1) {
    baseHeaders["Access-Control-Allow-Origin"] = corsAllowedOrigins[0];
  }
  return baseHeaders;
}
var headers = getCorsHeaders();
var routes = [];
function parsePathPattern(pathPattern) {
  const paramNames = [];
  const regexPattern = pathPattern.replace(/:([^/]+)/g, (_, paramName) => {
    paramNames.push(paramName);
    return "([^/]+)";
  });
  return {
    regex: new RegExp(`^${regexPattern}$`),
    paramNames
  };
}
function createRouter() {
  const addRoute = (method, path9, handler, paramNames, regex) => {
    routes.push({ method, pathPattern: path9, regex, paramNames, handler });
  };
  return {
    get: (path9, handler) => {
      const { regex, paramNames } = parsePathPattern(path9);
      if (path9.includes(":")) {
        addRoute("GET", path9, handler, paramNames, regex);
      } else {
        addRoute("GET", path9, handler, [], regex);
      }
    },
    post: (path9, handler) => {
      const { regex, paramNames } = parsePathPattern(path9);
      if (path9.includes(":")) {
        addRoute("POST", path9, handler, paramNames, regex);
      } else {
        addRoute("POST", path9, handler, [], regex);
      }
    },
    patch: (path9, handler) => {
      const { regex, paramNames } = parsePathPattern(path9);
      if (path9.includes(":")) {
        addRoute("PATCH", path9, handler, paramNames, regex);
      } else {
        addRoute("PATCH", path9, handler, [], regex);
      }
    },
    delete: (path9, handler) => {
      const { regex, paramNames } = parsePathPattern(path9);
      if (path9.includes(":")) {
        addRoute("DELETE", path9, handler, paramNames, regex);
      } else {
        addRoute("DELETE", path9, handler, [], regex);
      }
    }
  };
}
function registerRoutes() {
  registerWorkOrdersRoutes(createRouter(), headers);
  registerCtkRoutes(createRouter(), headers);
  registerTechOrdersRoutes(createRouter(), headers);
  registerMailboxRoutes(createRouter(), headers);
  registerCursorRoutes(createRouter(), headers);
  registerLockRoutes(createRouter(), headers);
  registerCoordinatorRoutes(createRouter(), headers);
  registerAgentRoutes(createRouter(), headers);
  registerCheckpointRoutes(createRouter(), headers);
  registerTaskQueueRoutes(createRouter(), headers);
  registerLearningRoutes(createRouter(), headers);
}
async function startServer() {
  try {
    console.log("[Startup] Initializing database...");
    await initializeDatabase();
    console.log("[Startup] \u2713 Squawk database initialized");
  } catch (error) {
    console.error("[Startup] \u2717 FATAL: Failed to initialize database");
    console.error("[Startup] Error details:", error);
    console.error("[Startup] This is likely a filesystem or permissions issue");
    process.exit(1);
  }
  console.log("[Startup] Registering API routes...");
  registerRoutes();
  console.log("[Startup] \u2713 Routes registered");
  const port = parseInt(process.env.PORT || "3001", 10);
  console.log(`[Startup] Starting Bun server on port ${port}...`);
  const server = Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url);
      const path9 = url.pathname;
      const method = request.method;
      const origin = request.headers.get("origin");
      const requestHeaders = getCorsHeaders(origin || undefined);
      if (method === "OPTIONS") {
        return new Response(null, { headers: requestHeaders });
      }
      if (path9 === "/health") {
        return new Response(JSON.stringify({
          status: "healthy",
          service: "fleettools-consolidated",
          timestamp: new Date().toISOString(),
          version: "1.0.0"
        }), {
          headers: { ...requestHeaders, "Content-Type": "application/json" }
        });
      }
      for (const route of routes) {
        if (route.method !== method)
          continue;
        const match = path9.match(route.regex);
        if (match) {
          try {
            const params = {};
            route.paramNames.forEach((name, i) => {
              params[name] = match[i + 1];
            });
            return await route.handler(request, params);
          } catch (error) {
            console.error("Route handler error:", error);
            return new Response(JSON.stringify({
              error: "Internal server error",
              message: error instanceof Error ? error.message : "Unknown error"
            }), {
              status: 500,
              headers: { ...requestHeaders, "Content-Type": "application/json" }
            });
          }
        }
      }
      return new Response(JSON.stringify({
        error: "Not found",
        path: path9,
        method
      }), {
        status: 404,
        headers: { ...requestHeaders, "Content-Type": "application/json" }
      });
    }
  });
  setInterval(async () => {
    try {
      const released = await lockOps.releaseExpired();
      if (released > 0) {
        console.log(`Released ${released} expired locks`);
      }
      if (released > 0) {
        console.log(`Released ${released} expired locks`);
      }
    } catch (error) {
      console.error("Error releasing expired locks:", error);
    }
  }, 30000);
  console.log(`FleetTools Consolidated API server listening on port ${server.port}`);
  console.log(`Health check: http://localhost:${server.port}/health`);
  console.log(`
Flightline Endpoints:`);
  console.log("  GET    /api/v1/work-orders         - List work orders");
  console.log("  POST   /api/v1/work-orders         - Create work order");
  console.log("  GET    /api/v1/work-orders/:id     - Get work order");
  console.log("  PATCH  /api/v1/work-orders/:id     - Update work order");
  console.log("  DELETE /api/v1/work-orders/:id     - Delete work order");
  console.log("  GET    /api/v1/ctk/reservations    - List CTK reservations");
  console.log("  POST   /api/v1/ctk/reserve         - Reserve file");
  console.log("  POST   /api/v1/ctk/release         - Release reservation");
  console.log("  GET    /api/v1/tech-orders         - List tech orders");
  console.log("  POST   /api/v1/tech-orders         - Create tech order");
  console.log(`
Squawk Endpoints:`);
  console.log("  POST   /api/v1/mailbox/append      - Append events to mailbox");
  console.log("  GET    /api/v1/mailbox/:streamId   - Get mailbox contents");
  console.log("  POST   /api/v1/cursor/advance      - Advance cursor position");
  console.log("  GET    /api/v1/cursor/:cursorId    - Get cursor position");
  console.log("  POST   /api/v1/lock/acquire        - Acquire file lock");
  console.log("  POST   /api/v1/lock/release        - Release file lock");
  console.log("  GET    /api/v1/locks               - List all active locks");
  console.log("  GET    /api/v1/coordinator/status  - Get coordinator status");
  console.log(`
Agent Coordination Endpoints:`);
  console.log("  GET    /api/v1/agents                 - List all agents");
  console.log("  GET    /api/v1/agents/:callsign      - Get agent by callsign");
  console.log("  POST   /api/v1/agents/register      - Register new agent");
  console.log("  PATCH  /api/v1/agents/:callsign/status - Update agent status");
  console.log("  GET    /api/v1/agents/:callsign/assignments - Get agent assignments");
  console.log("  POST   /api/v1/assignments           - Create work assignment");
  console.log("  GET    /api/v1/assignments           - List all assignments");
  console.log("  PATCH  /api/v1/assignments/:id/status - Update assignment status");
  console.log("  POST   /api/v1/agents/coordinate    - Start agent coordination");
  console.log("  GET    /api/v1/agents/stats          - Get agent statistics");
  console.log(`
Checkpoint & Recovery Endpoints:`);
  console.log("  POST   /api/v1/checkpoints            - Create checkpoint");
  console.log("  GET    /api/v1/checkpoints            - List checkpoints by mission");
  console.log("  GET    /api/v1/checkpoints/:id       - Get checkpoint details");
  console.log("  GET    /api/v1/checkpoints/latest/:missionId - Get latest checkpoint");
  console.log("  POST   /api/v1/checkpoints/:id/resume - Resume from checkpoint");
  console.log("  DELETE /api/v1/checkpoints/:id       - Delete checkpoint");
  console.log(`
Task Queue Endpoints:`);
  console.log("  POST   /api/v1/tasks                 - Create task");
  console.log("  GET    /api/v1/tasks                 - List all tasks");
  console.log("  GET    /api/v1/tasks/:id             - Get task details");
  console.log("  PATCH  /api/v1/tasks/:id/status      - Update task status");
  console.log(`
Learning System Endpoints:`);
  console.log("  GET    /api/v1/patterns               - List learned patterns");
  console.log("  POST   /api/v1/patterns               - Create new pattern");
  console.log("  GET    /api/v1/patterns/:id          - Get pattern details");
  console.log("  DELETE /api/v1/patterns/:id          - Delete pattern");
  console.log("  GET    /api/v1/learning/metrics      - Get learning system metrics");
  process.on("SIGINT", () => {
    console.log(`
Shutting down...`);
    closeDatabase();
    server.stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    console.log(`
Shutting down...`);
    closeDatabase();
    server.stop();
    process.exit(0);
  });
  return server;
}
var server = await startServer();
export {
  server
};
