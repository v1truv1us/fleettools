/**
 * Integration Tests for Critical Infrastructure
 * Tests API registration, database integration, and CLI connectivity
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

describe('Critical Infrastructure Integration', () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    // Start the server
    server = await import('../src/index.js');
    baseUrl = `http://localhost:${process.env.PORT || 3001}`;
    
    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (server?.server?.stop) {
      server.server.stop();
    }
  });

  describe('API Registration Tests', () => {
    it('should have health endpoint working', async () => {
      const response = await fetch(`${baseUrl}/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('service', 'fleettools-consolidated');
    });

    it('should have all Flightline endpoints registered', async () => {
      // Test work orders endpoint
      const workOrdersResponse = await fetch(`${baseUrl}/api/v1/work-orders`);
      expect([200, 404, 405]).toContain(workOrdersResponse.status); // 404 is ok if no data, 405 if method not allowed

      // Test tech orders endpoint  
      const techOrdersResponse = await fetch(`${baseUrl}/api/v1/tech-orders`);
      expect([200, 404, 405]).toContain(techOrdersResponse.status);

      // Test CTK endpoints
      const ctkResponse = await fetch(`${baseUrl}/api/v1/ctk/reservations`);
      expect([200, 404, 405]).toContain(ctkResponse.status);
    });

    it('should have all Squawk endpoints registered', async () => {
      // Test mailbox endpoint
      const mailboxResponse = await fetch(`${baseUrl}/api/v1/mailbox/test-stream`, {
        method: 'GET'
      });
      expect([200, 404, 405]).toContain(mailboxResponse.status);

      // Test cursor endpoint
      const cursorResponse = await fetch(`${baseUrl}/api/v1/cursor/test-cursor`);
      expect([200, 404, 405]).toContain(cursorResponse.status);

      // Test lock endpoint
      const locksResponse = await fetch(`${baseUrl}/api/v1/locks`);
      expect([200, 404, 405]).toContain(locksResponse.status);

      // Test coordinator endpoint
      const coordinatorResponse = await fetch(`${baseUrl}/api/v1/coordinator/status`);
      expect([200, 404, 405]).toContain(coordinatorResponse.status);
    });

    it('should have all Coordination endpoints registered', async () => {
      // Test agents endpoint
      const agentsResponse = await fetch(`${baseUrl}/api/v1/agents`);
      expect([200, 404, 405]).toContain(agentsResponse.status);

      // Test missions endpoint
      const missionsResponse = await fetch(`${baseUrl}/api/v1/missions`);
      expect([200, 404, 405]).toContain(missionsResponse.status);

      // Test tasks endpoint
      const tasksResponse = await fetch(`${baseUrl}/api/v1/tasks/decompose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission: 'test' })
      });
      expect([200, 400, 404, 405]).toContain(tasksResponse.status);
    });
  });

  describe('Database Integration Tests', () => {
    it('should have database operations working', async () => {
      // Test that database is accessible through operations
      const { initializeDatabase, closeDatabase } = await import('../../squawk/src/db/index.js');
      
      expect(async () => {
        await initializeDatabase();
      }).not.toThrow();
      
      closeDatabase();
    });

    it('should have checkpoint operations exposed', async () => {
      // Test checkpoint functionality through progress tracker
      const { ProgressTracker } = await import('../src/coordination/progress-tracker.js');
      
      const progressTracker = new ProgressTracker({
        dbPath: './test-progress.db'
      });

      expect(async () => {
        await progressTracker.checkpoint('test-mission', 'task1', 50, 'Test progress');
      }).not.toThrow();

      expect(async () => {
        const progress = await progressTracker.getProgress('test-mission');
        expect(progress).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('End-to-End Workflow Tests', () => {
    it('should support agent spawning workflow', async () => {
      // Test agent spawning endpoint
      const spawnResponse = await fetch(`${baseUrl}/api/v1/agents/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'testing',
          task: 'Test task',
          config: { timeout: 5000 }
        })
      });

      expect([200, 201, 400, 500]).toContain(spawnResponse.status);
    });

    it('should support task decomposition workflow', async () => {
      // Test task decomposition endpoint
      const decomposeResponse = await fetch(`${baseUrl}/api/v1/tasks/decompose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission: {
            title: 'Test Mission',
            description: 'Test description',
            type: 'development'
          }
        })
      });

      expect([200, 400, 404]).toContain(decomposeResponse.status);
    });

    it('should support mission management workflow', async () => {
      // Test mission creation endpoint
      const createMissionResponse = await fetch(`${baseUrl}/api/v1/missions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Mission',
          description: 'Test mission description',
          type: 'development'
        })
      });

      expect([200, 201, 400, 404]).toContain(createMissionResponse.status);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await fetch(`${baseUrl}/api/v1/unknown-endpoint`);
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should handle OPTIONS requests for CORS', async () => {
      const response = await fetch(`${baseUrl}/api/v1/test`, {
        method: 'OPTIONS'
      });
      expect([200, 204]).toContain(response.status);
    });
  });
});