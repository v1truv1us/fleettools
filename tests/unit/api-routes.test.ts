/**
 * API Routes Unit Tests
 *
 * Verify new API routes are properly registered
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('API Routes', () => {
  describe('Route Registration', () => {
    it('should register checkpoint routes in main API', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/index.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('registerCheckpointRoutes');
      expect(content).toContain('from \'./coordination/checkpoint-routes.js\'');
    });

    it('should register task queue routes in main API', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/index.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('registerTaskQueueRoutes');
      expect(content).toContain('from \'./coordination/task-queue-routes.js\'');
    });

    it('should register learning routes in main API', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/index.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('registerLearningRoutes');
      expect(content).toContain('from \'./coordination/learning/routes.js\'');
    });

    it('should call all route registration in registerRoutes function', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/index.ts');
      const content = readFileSync(filePath, 'utf-8');

      const routesSection = content.substring(
        content.indexOf('function registerRoutes'),
        content.indexOf('async function startServer')
      );

      expect(routesSection).toContain('registerCheckpointRoutes(createRouter(), headers)');
      expect(routesSection).toContain('registerTaskQueueRoutes(createRouter(), headers)');
      expect(routesSection).toContain('registerLearningRoutes(createRouter(), headers)');
    });
  });

  describe('Checkpoint Routes', () => {
    it('should have checkpoint routes file', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/checkpoint-routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
    });

    it('should export registerCheckpointRoutes function', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/checkpoint-routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('export function registerCheckpointRoutes');
    });

    it('should have POST /api/v1/checkpoints route', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/checkpoint-routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('/api/v1/checkpoints');
      expect(content).toContain('.post(');
    });

    it('should have GET /api/v1/checkpoints route', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/checkpoint-routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('/api/v1/checkpoints');
      expect(content).toContain('.get(');
    });

    it('should have checkpoint routes with proper HTTP methods', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/checkpoint-routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('checkpointManager.getCheckpoint');
      expect(content).toContain('checkpointManager.createCheckpoint');
      expect(content).toContain('checkpointManager.deleteCheckpoint');
    });

    it('should handle checkpoint resume endpoint', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/checkpoint-routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('resume');
      expect(content).toContain('RecoveryManager');
    });
  });

  describe('Learning Routes', () => {
    it('should have learning routes file', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
    });

    it('should export registerLearningRoutes function', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('export function registerLearningRoutes');
    });

    it('should have pattern endpoints', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('/api/v1/patterns');
      expect(content).toContain('patternStorage');
    });

    it('should have metrics endpoint', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('/api/v1/learning/metrics');
    });

    it('should handle pattern CRUD operations', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('storePattern');
      expect(content).toContain('getPattern');
      expect(content).toContain('listPatterns');
    });
  });

  describe('CORS Configuration', () => {
    it('should support CORS_ENABLED environment variable', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/index.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('CORS_ENABLED');
      expect(content).toContain('process.env.CORS_ENABLED');
    });

    it('should support CORS_ALLOWED_ORIGINS environment variable', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/index.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('CORS_ALLOWED_ORIGINS');
      expect(content).toContain('process.env.CORS_ALLOWED_ORIGINS');
    });

    it('should have getCorsHeaders function', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/index.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('function getCorsHeaders');
    });

    it('should validate CORS origins', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/index.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('corsAllowedOrigins.includes(origin)');
    });
  });
});
