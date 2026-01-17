/**
 * Integration Tests for FleetTools Critical Fix Implementation
 * Tests the complete CLI -> API -> Agent workflow
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { testServer } from '../helpers/test-server.js';
import { createApiClient } from '../helpers/api-client.js';

// Helper function to directly test API endpoints (bypassing wrapper for validation)
async function directAPICall(method: string, path: string, body?: any): Promise<any> {
  const baseUrl = 'http://localhost:3001';
  const url = `${baseUrl}${path}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json() as any;

  return {
    status: response.status,
    data: data
  };
}

describe('FleetTools Critical Integration Tests', () => {
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

  describe('Agent Spawning Pipeline', () => {
    it('should spawn agent and track lifecycle', async () => {
      // Spawn agent
      const spawnResponse = await directAPICall('POST', '/api/v1/agents/spawn', {
        type: 'frontend',
        task: 'Integration test task',
        config: { timeout: 60000 }
      });

      expect(spawnResponse.status).toBe(201);
      expect(spawnResponse.data.success).toBe(true);
      expect(spawnResponse.data.data.agent.id).toMatch(/^agt_[a-f0-9-]+$/);
      expect(spawnResponse.data.data.agent.type).toBe('frontend');
      expect(spawnResponse.data.data.agent.status).toBe('running');

      const agentId = spawnResponse.data.data.agent.id;

      // List agents should show the new agent
      const listResponse = await directAPICall('GET', '/api/v1/agents');
      expect(listResponse.status).toBe(200);
      expect(listResponse.data.success).toBe(true);
      expect(listResponse.data.data.length).toBeGreaterThan(0);
      
      const foundAgent = listResponse.data.data.find((agent: any) => agent.id === agentId);
      expect(foundAgent).toBeDefined();
      expect(foundAgent.type).toBe('frontend');

      // Get specific agent details
      const detailsResponse = await directAPICall('GET', `/api/v1/agents/${agentId}`);
      expect(detailsResponse.status).toBe(200);
      expect(detailsResponse.data.success).toBe(true);
      expect(detailsResponse.data.data.id).toBe(agentId);

      // Terminate agent
      const terminateResponse = await directAPICall('DELETE', `/api/v1/agents/${agentId}`);
      expect(terminateResponse.status).toBe(200);
      expect(terminateResponse.data.success).toBe(true);
    });

    it('should handle agent health monitoring', async () => {
      const spawnResponse = await directAPICall('POST', '/api/v1/agents/spawn', {
        type: 'backend',
        task: 'Health test task'
      });
      
      const agentId = spawnResponse.data.data.agent.id;

      // Get agent health
      const healthResponse = await directAPICall('GET', `/api/v1/agents/${agentId}/health`);
      expect(healthResponse.status).toBe(200);
      expect(healthResponse.data.success).toBe(true);
      expect(healthResponse.data.data.status).toBeDefined();
      expect(healthResponse.data.data.isHealthy).toBeDefined();

      // Get system health
      const systemHealthResponse = await directAPICall('GET', '/api/v1/agents/system/health');
      expect(systemHealthResponse.status).toBe(200);
      expect(systemHealthResponse.data.success).toBe(true);
      expect(systemHealthResponse.data.data.totalAgents).toBeGreaterThan(0);
      expect(systemHealthResponse.data.data.overallHealth).toBeDefined();
    });

    it('should reject invalid agent types', async () => {
      const response = await directAPICall('POST', '/api/v1/agents/spawn', {
        type: 'invalid-type',
        task: 'Test task'
      });

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('Invalid agent type');
    });
  });

  describe('Task Decomposition System', () => {
    it('should decompose mission into tasks', async () => {
      const missionData = {
        title: 'Build user management system',
        description: 'Create CRUD operations for user accounts',
        type: 'feature'
      };

      const response = await directAPICall('POST', '/api/v1/tasks/decompose', missionData);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.mission.title).toBe('Build user management system');
      expect(response.data.data.tasks).toBeDefined();
      expect(Array.isArray(response.data.data.tasks)).toBe(true);
      expect(response.data.data.tasks.length).toBeGreaterThan(0);
      expect(response.data.data.totalTasks).toBe(response.data.data.tasks.length);
      expect(response.data.data.totalEstimatedMinutes).toBeGreaterThan(0);

      // Verify task structure
      const firstTask = response.data.data.tasks[0];
      expect(firstTask.id).toBeDefined();
      expect(firstTask.type).toBeDefined();
      expect(firstTask.title).toBeDefined();
      expect(firstTask.description).toBeDefined();
      expect(firstTask.status).toBe('pending');
      expect(firstTask.priority).toBeDefined();
      expect(firstTask.estimatedDurationMinutes).toBeDefined();
    });

    it('should require mission title for decomposition', async () => {
      const response = await directAPICall('POST', '/api/v1/tasks/decompose', {
        description: 'Missing title test'
      });

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('Mission title is required');
    });
  });

  describe('Checkpoint/Resume System', () => {
    it('should create and retrieve checkpoints', async () => {
      const checkpointData = {
        mission_id: 'test-mission-checkpoint',
        trigger: 'manual',
        trigger_details: 'Integration test checkpoint',
        progress_percent: 50,
        created_by: 'test-user',
        version: '1.0.0'
      };

      // Create checkpoint
      const createResponse = await directAPICall('POST', '/api/v1/checkpoints', checkpointData);
      expect(createResponse.status).toBe(201);
      expect(createResponse.data.success).toBe(true);
      expect(createResponse.data.data.id).toMatch(/^chk_[a-f0-9-]+$/);
      expect(createResponse.data.data.mission_id).toBe('test-mission-checkpoint');
      expect(createResponse.data.data.progress_percent).toBe(50);

      const checkpointId = createResponse.data.data.id;

      // Get specific checkpoint
      const getResponse = await directAPICall('GET', `/api/v1/checkpoints/${checkpointId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.success).toBe(true);
      expect(getResponse.data.data.id).toBe(checkpointId);

      // List checkpoints by mission
      const listResponse = await directAPICall('GET', `/api/v1/checkpoints?mission_id=test-mission-checkpoint');
      expect(listResponse.status).toBe(200);
      expect(listResponse.data.success).toBe(true);
      expect(listResponse.data.data.count).toBe(1);
      expect(listResponse.data.data[0].id).toBe(checkpointId);

      // Get latest checkpoint
      const latestPath = '/api/v1/checkpoints/latest/test-mission-checkpoint';
      const latestResponse = await directAPICall('GET', latestPath);
      expect(latestResponse.status).toBe(200);
      expect(latestResponse.data.success).toBe(true);
      expect(latestResponse.data.data.id).toBe(checkpointId);
    });

    it('should handle checkpoint deletion', async () => {
      // First create a checkpoint
      const createPath = '/api/v1/checkpoints';
      const createBody = {
        mission_id: 'test-mission-delete',
        trigger: 'auto',
        created_by: 'test-user'
      };
      const createResponse = await directAPICall('POST', createPath, createBody);
      
      const checkpointId = createResponse.data.data.id;

      // Delete checkpoint
      const deletePath = `/api/v1/checkpoints/${checkpointId}`;
      const deleteResponse = await directAPICall('DELETE', deletePath);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.data.success).toBe(true);

      // Verify deletion
      const verifyPath = `/api/v1/checkpoints/${checkpointId}`;
      const verifyResponse = await directAPICall('GET', verifyPath);
      expect(verifyResponse.status).toBe(404);
    });

    it('should return 404 for non-existent checkpoints', async () => {
      const response = await client.request('GET', '/api/v1/checkpoints/non-existent-checkpoint');
      expect(response.status).toBe(404);
      expect(response.data.error).toContain('Checkpoint not found');
    });
  });

  describe('API Error Handling', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      const response = await fetch('http://localhost:3001/api/v1/agents/spawn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json{'
      });

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.error).toBeDefined();
    });

    it('should handle missing endpoints', async () => {
      const response = await fetch('http://localhost:3001/api/v1/non-existent-endpoint');
      expect(response.status).toBe(404);
      
      const data = await response.json() as any;
      expect(data.error).toBeDefined();
      expect(data.path).toBe('/api/v1/non-existent-endpoint');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await fetch('http://localhost:3001/api/v1/agents', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        }
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return healthy status', async () => {
      const response = await fetch('http://localhost:3001/health');
      expect(response.status).toBe(200);
      
      const data = await response.json() as any;
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('fleettools-consolidated');
      expect(data.timestamp).toBeDefined();
      expect(data.version).toBeDefined();
    });
  });
});