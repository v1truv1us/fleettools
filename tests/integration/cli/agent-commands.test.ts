/**
 * Integration Tests for CLI Agent Commands
 * Tests the full CLI -> API -> Agent workflow
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { testServer } from '../../helpers/test-server.js';
import { createApiClient } from '../../helpers/api-client.js';

describe('CLI Agent Commands Integration', () => {
  let client: any;
  let originalEnv: any;

  beforeEach(async () => {
    // Setup test environment
    originalEnv = process.env;
    process.env.NODE_ENV = 'test';
    
    // Start test server
    await testServer.setup();
    client = createApiClient();
  });

  afterEach(async () => {
    // Cleanup
    process.env = originalEnv;
    await testServer.teardown();
  });

  describe('Agent Spawn Workflow', () => {
    it('should spawn agent via API', async () => {
      const spawnRequest = {
        type: 'frontend',
        task: 'Test task for agent',
        config: {
          timeout: 60000,
          retries: 2
        }
      };

      const response = await client.post('/api/v1/agents/spawn', spawnRequest);

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.agent).toBeDefined();
      expect(response.data.agent.type).toBe('frontend');
      expect(response.data.agent.task).toBe('Test task for agent');
      expect(response.data.agent.id).toMatch(/^agent_[a-f0-9-]+$/);
    });

    it('should list active agents', async () => {
      // First spawn an agent
      await client.post('/api/v1/agents/spawn', {
        type: 'backend',
        task: 'Test backend task'
      });

      // Then list agents
      const response = await client.get('/api/v1/agents');

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      
      const backendAgent = response.data.find((agent: any) => agent.type === 'backend');
      expect(backendAgent).toBeDefined();
      expect(backendAgent.task).toBe('Test backend task');
    });

    it('should get specific agent details', async () => {
      // Spawn an agent
      const spawnResponse = await client.post('/api/v1/agents/spawn', {
        type: 'testing',
        task: 'Test testing task'
      });
      const agentId = spawnResponse.data.agent.id;

      // Get agent details
      const response = await client.get(`/api/v1/agents/${agentId}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.id).toBe(agentId);
      expect(response.data.type).toBe('testing');
      expect(response.data.task).toBe('Test testing task');
    });

    it('should terminate agent', async () => {
      // Spawn an agent
      const spawnResponse = await client.post('/api/v1/agents/spawn', {
        type: 'documentation',
        task: 'Test documentation task'
      });
      const agentId = spawnResponse.data.agent.id;

      // Terminate the agent
      const response = await client.delete(`/api/v1/agents/${agentId}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.agent.status).toBe('terminated');
    });
  });

  describe('Agent Health and Monitoring', () => {
    it('should get agent health', async () => {
      // Spawn an agent
      const spawnResponse = await client.post('/api/v1/agents/spawn', {
        type: 'security',
        task: 'Test security task'
      });
      const agentId = spawnResponse.data.agent.id;

      // Get agent health
      const response = await client.get(`/api/v1/agents/${agentId}/health`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.status).toBeDefined();
      expect(response.data.isHealthy).toBeDefined();
      expect(response.data.uptime).toBeDefined();
    });

    it('should get system health', async () => {
      // Spawn multiple agents
      await client.post('/api/v1/agents/spawn', { type: 'performance' });
      await client.post('/api/v1/agents/spawn', { type: 'frontend' });

      // Get system health
      const response = await client.get('/api/v1/agents/system/health');

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.totalAgents).toBeGreaterThan(0);
      expect(response.data.healthyAgents).toBeDefined();
      expect(response.data.overallHealth).toBeDefined();
    });
  });

  describe('Agent Progress and Heartbeat', () => {
    it('should update agent progress', async () => {
      // Spawn an agent
      const spawnResponse = await client.post('/api/v1/agents/spawn', {
        type: 'backend',
        task: 'Test progress task'
      });
      const agentId = spawnResponse.data.agent.id;

      // Update progress
      const progressUpdate = {
        progress: 50,
        message: 'Halfway through task',
        data: { currentStep: 'database-migration' }
      };

      const response = await client.post(`/api/v1/agents/${agentId}/progress`, progressUpdate);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should process agent heartbeat', async () => {
      // Spawn an agent
      const spawnResponse = await client.post('/api/v1/agents/spawn', {
        type: 'frontend',
        task: 'Test heartbeat task'
      });
      const agentId = spawnResponse.data.agent.id;

      // Send heartbeat
      const response = await client.post(`/api/v1/agents/${agentId}/heartbeat`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid agent type', async () => {
      const response = await client.post('/api/v1/agents/spawn', {
        type: 'invalid-type',
        task: 'Test task'
      });

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('Invalid agent type');
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await client.get('/api/v1/agents/non-existent-agent');

      expect(response.status).toBe(404);
      expect(response.data.error).toContain('Agent not found');
    });

    it('should handle missing required fields', async () => {
      const response = await client.post('/api/v1/agents/spawn', {
        // Missing type field
        task: 'Test task'
      });

      expect(response.status).toBe(400);
      expect(response.data.error).toBeDefined();
    });
  });
});