/**
 * Simple Integration Test Summary for FleetTools Critical Fixes
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { testServer } from '../helpers/test-server.js';

// Helper function to directly test API endpoints
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

describe('FleetTools Critical Integration - Working Features', () => {
  beforeEach(async () => {
    await testServer.setup();
  });

  afterEach(async () => {
    await testServer.teardown();
  });

  it('should have working health endpoint', async () => {
    const response = await fetch('http://localhost:3001/health');
    expect(response.status).toBe(200);
    
    const data = await response.json() as any;
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('fleettools-consolidated');
    expect(data.timestamp).toBeDefined();
    expect(data.version).toBeDefined();
  });

  it('should spawn agents successfully', async () => {
    const spawnData = {
      type: 'frontend',
      task: 'Integration test task',
      config: { timeout: 60000 }
    };

    const response = await directAPICall('POST', '/api/v1/agents/spawn', spawnData);
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.agent.id).toMatch(/^agt_[a-f0-9-]+$/);
    expect(response.data.data.agent.type).toBe('frontend');
    expect(response.data.data.agent.status).toBe('running');
  });

  it('should decompose missions into tasks', async () => {
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

  it('should create and manage checkpoints', async () => {
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
  });

  it('should list agents', async () => {
    const response = await directAPICall('GET', '/api/v1/agents');
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data.agents)).toBe(true);
  });

  it('should reject invalid agent types', async () => {
    const response = await directAPICall('POST', '/api/v1/agents/spawn', {
      type: 'invalid-type',
      task: 'Test task'
    });

    expect(response.status).toBe(400);
    expect(response.data.error).toContain('Invalid agent type');
  });

  it('should handle missing mission title', async () => {
    const response = await directAPICall('POST', '/api/v1/tasks/decompose', {
      description: 'Missing title test'
    });

    expect(response.status).toBe(400);
    expect(response.data.error).toContain('Mission title is required');
  });
});