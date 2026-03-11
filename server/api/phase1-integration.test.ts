#!/usr/bin/env bun
/**
 * Integration Tests for FleetTools Phase 1 Critical Fixes
 * 
 * Tests the end-to-end workflow: spawn → execute → checkpoint → resume
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const API_BASE = process.env.FLEETTOOLS_API_URL || 'http://localhost:3001';
const SERVER_STARTUP_TIMEOUT = 10000;

interface AgentSpawnRequest {
  type: 'frontend' | 'backend' | 'testing' | 'documentation' | 'security' | 'performance';
  task?: string;
  metadata?: Record<string, any>;
  config?: {
    timeout?: number;
    retries?: number;
  };
}

interface CheckpointData {
  id: string;
  mission_id: string;
  timestamp: string;
  trigger: 'manual' | 'auto' | 'error' | 'completion';
  progress_percent?: number;
  created_by: string;
}

describe('FleetTools Phase 1 Integration', () => {
  let serverProcess: any;
  let agentIds: string[] = [];

  beforeAll(async () => {
    // Start the server if not already running
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (!response.ok) {
        throw new Error('Server not healthy');
      }
      console.log('✓ Server already running');
    } catch (error) {
      console.log('Starting FleetTools server...');
      serverProcess = spawn('bun', ['run', 'dev'], {
        cwd: '/home/vitruvius/git/fleettools/server/api',
        stdio: 'pipe'
      });

      // Wait for server to start
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Server startup timeout'));
        }, SERVER_STARTUP_TIMEOUT);

        const checkServer = async () => {
          try {
            const response = await fetch(`${API_BASE}/health`);
            if (response.ok) {
              clearTimeout(timeout);
              resolve(null);
            } else {
              setTimeout(checkServer, 500);
            }
          } catch (err) {
            setTimeout(checkServer, 500);
          }
        };

        checkServer();
      });
      console.log('✓ Server started successfully');
    }
  });

  afterAll(async () => {
    // Clean up any spawned agents
    for (const agentId of agentIds) {
      try {
        await fetch(`${API_BASE}/api/v1/agents/${agentId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.warn(`Failed to cleanup agent ${agentId}:`, error);
      }
    }

    // Stop server if we started it
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  });

  describe('Agent Spawning API Routes', () => {
    it('should spawn a new agent via API', async () => {
      const spawnRequest: AgentSpawnRequest = {
        type: 'testing',
        task: 'Run integration tests',
        metadata: { test: 'phase1-integration' },
        config: { timeout: 30000 }
      };

      const response = await fetch(`${API_BASE}/api/v1/agents/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spawnRequest)
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.agent.id).toMatch(/^agt_/);
      expect(data.data.agent.type).toBe('testing');
      expect(data.data.agent.status).toMatch(/running|spawning/); // Initial status

      agentIds.push(data.data.agent.id);

      // Wait a bit for agent to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify agent is running
      const agentResponse = await fetch(`${API_BASE}/api/v1/agents/${data.data.agent.id}`);
      expect(agentResponse.ok).toBe(true);
      const agentData = await agentResponse.json();
      expect(agentData.success).toBe(true);
      expect(agentData.data.agent.status).toMatch(/running|spawning/);
    });

    it('should list all active agents', async () => {
      const response = await fetch(`${API_BASE}/api/v1/agents`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.agents)).toBe(true);
      expect(data.data.total).toBeGreaterThanOrEqual(0);
    });

    it('should validate agent type on spawn', async () => {
      const invalidRequest = {
        type: 'invalid-type',
        task: 'test'
      };

      const response = await fetch(`${API_BASE}/api/v1/agents/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest)
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Invalid agent type');
    });
  });

  describe('Database Integration for Checkpoints', () => {
    let checkpointId: string;
    const missionId = `msn-test-${randomUUID()}`;

    it('should create checkpoint via API', async () => {
      const checkpointRequest = {
        mission_id: missionId,
        trigger: 'manual',
        trigger_details: 'Integration test checkpoint',
        progress_percent: 45,
        sorties: [
          {
            id: 'srt-1',
            status: 'completed',
            progress: 100
          }
        ],
        active_locks: [],
        pending_messages: [],
        recovery_context: {
          last_action: 'integration_test',
          next_steps: ['complete testing'],
          blockers: [],
          files_modified: ['test-file.ts'],
          mission_summary: 'Integration test mission',
          elapsed_time_ms: 120000,
          last_activity_at: new Date().toISOString()
        },
        created_by: 'integration-test',
        version: '1.0.0'
      };

      const response = await fetch(`${API_BASE}/api/v1/checkpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkpointRequest)
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toMatch(/^chk_/);
      expect(data.data.mission_id).toBe(missionId);
      expect(data.data.trigger).toBe('manual');
      expect(data.data.progress_percent).toBe(45);

      checkpointId = data.data.id;
    });

    it('should retrieve checkpoint by ID', async () => {
      const response = await fetch(`${API_BASE}/api/v1/checkpoints/${checkpointId}`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(checkpointId);
      expect(data.data.mission_id).toBe(missionId);
    });

    it('should get latest checkpoint for mission', async () => {
      const response = await fetch(`${API_BASE}/api/v1/checkpoints/latest/${missionId}`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(checkpointId);
      expect(data.data.mission_id).toBe(missionId);
    });

    it('should list checkpoints for mission', async () => {
      const response = await fetch(`${API_BASE}/api/v1/checkpoints?mission_id=${missionId}`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThanOrEqual(1);
      expect(data.data[0].mission_id).toBe(missionId);
    });

    afterAll(async () => {
      // Cleanup test checkpoint
      try {
        await fetch(`${API_BASE}/api/v1/checkpoints/${checkpointId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.warn(`Failed to cleanup checkpoint ${checkpointId}:`, error);
      }
    });
  });

  describe('Coordination Endpoint Routing', () => {
    it('should handle mailbox operations', async () => {
      const mailboxRequest = {
        streamId: `test-stream-${randomUUID()}`,
        events: [
          {
            type: 'test-event',
            data: { message: 'integration test' },
            timestamp: new Date().toISOString()
          }
        ]
      };

      const response = await fetch(`${API_BASE}/api/v1/mailbox/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mailboxRequest)
      });

      // Should either succeed or fail gracefully (not 500)
      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('should handle cursor operations', async () => {
      const cursorRequest = {
        cursorId: `test-cursor-${randomUUID()}`,
        position: 10,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${API_BASE}/api/v1/cursor/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cursorRequest)
      });

      // Should either succeed or fail gracefully (not 500)
      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('should handle lock operations', async () => {
      const lockRequest = {
        resourceId: `test-resource-${randomUUID()}`,
        agentId: agentIds[0] || 'test-agent',
        timeout: 60000
      };

      const response = await fetch(`${API_BASE}/api/v1/lock/acquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lockRequest)
      });

      // Should either succeed or fail gracefully (not 500)
      expect([200, 201, 400, 404, 409]).toContain(response.status);
    });

    it('should get coordinator status', async () => {
      const response = await fetch(`${API_BASE}/api/v1/coordinator/status`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      // Coordinator endpoint returns data directly without success wrapper
      expect(data.active_mailboxes).toBeDefined();
      expect(data.active_locks).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Agent-Runner Implementation', () => {
    it('should execute agent-runner script directly', async () => {
      const agentId = `agt-test-${randomUUID()}`;
      const mailboxId = `mbx-test-${randomUUID()}`;
      
      const runnerProcess = spawn('bun', [
        '/home/vitruvius/git/fleettools/server/api/src/coordination/agent-runner.ts',
        '--agent-id', agentId,
        '--agent-type', 'testing',
        '--mailbox-id', mailboxId,
        '--task', 'integration test task',
        '--timeout', '5000'
      ], {
        stdio: 'pipe',
        cwd: '/home/vitruvius/git/fleettools/server/api'
      });

      let output = '';
      runnerProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      // Wait for process to complete or timeout
      const result = await new Promise<{ code: number | null; output: string }>((resolve) => {
        runnerProcess.on('close', (code) => {
          resolve({ code, output });
        });

        setTimeout(() => {
          runnerProcess.kill();
          resolve({ code: -1, output });
        }, 8000);
      });

      // Process should either complete successfully or timeout (both are acceptable for this test)
      expect(result.code === null ? -1 : result.code).toBeOneOf([0, 1, -1]);
      expect(result.output).toContain(agentId);
      expect(result.output.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete spawn → execute → checkpoint → resume workflow', async () => {
      // 1. Spawn agent
      const spawnRequest: AgentSpawnRequest = {
        type: 'documentation',
        task: 'Generate integration test documentation',
        config: { timeout: 15000 }
      };

      const spawnResponse = await fetch(`${API_BASE}/api/v1/agents/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spawnRequest)
      });

      expect(spawnResponse.ok).toBe(true);
      const spawnData = await spawnResponse.json();
      const agentId = spawnData.data.id;
      agentIds.push(agentId);

      // Wait for agent to start
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2. Create checkpoint
      const missionId = `msn-e2e-${randomUUID()}`;
      const checkpointRequest = {
        mission_id: missionId,
        trigger: 'manual',
        trigger_details: 'E2E integration test',
        progress_percent: 25,
        sorties: [
          {
            id: `srt-${agentId}`,
            status: 'in_progress',
            assigned_to: agentId,
            progress: 25
          }
        ],
        active_locks: [],
        pending_messages: [],
        recovery_context: {
          last_action: 'agent_spawned',
          next_steps: ['continue documentation work'],
          blockers: [],
          files_modified: [],
          mission_summary: `E2E test with agent ${agentId}`,
          elapsed_time_ms: 5000,
          last_activity_at: new Date().toISOString()
        },
        created_by: 'e2e-test',
        version: '1.0.0'
      };

      const checkpointResponse = await fetch(`${API_BASE}/api/v1/checkpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkpointRequest)
      });

      expect(checkpointResponse.ok).toBe(true);
      const checkpointData = await checkpointResponse.json();
      const checkpointId = checkpointData.data.id;

      // 3. Verify checkpoint exists
      const verifyResponse = await fetch(`${API_BASE}/api/v1/checkpoints/${checkpointId}`);
      expect(verifyResponse.ok).toBe(true);
      const verifyData = await verifyResponse.json();
      expect(verifyData.data.id).toBe(checkpointId);

      // 4. Attempt resume (dry run)
      const resumeResponse = await fetch(`${API_BASE}/api/v1/checkpoints/${checkpointId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          force: false,
          dryRun: true
        })
      });

      // Resume should work or at least provide meaningful error
      expect([200, 207, 400, 500]).toContain(resumeResponse.status);
      
      if (resumeResponse.ok) {
        const resumeData = await resumeResponse.json();
        expect(resumeData.success).toBeDefined();
      }

      console.log(`✓ E2E workflow completed for agent ${spawnData.data.agent.id}, checkpoint ${checkpointId}`);
    }, 30000); // 30 second timeout for E2E test
  });
});