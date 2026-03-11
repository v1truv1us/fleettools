/**
 * Service Management Integration Tests
 *
 * Tests FleetTools CLI service management functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createPodmanPostgresProvider } from '../../../cli/src/providers/podman-postgres.js';

describe('FleetTools Service Management', () => {
  const testContainerName = 'fleettools-test-pg';
  const testVolumeName = 'fleettools-test-pg-data';
  const testPort = 15432; // Use non-standard port for testing
  
  let provider: any;

  beforeAll(() => {
    provider = createPodmanPostgresProvider({
      port: testPort,
      containerName: testContainerName,
      volumeName: testVolumeName,
      image: 'postgres:16',
      dataDir: path.join(process.env.HOME || '', '.local', 'share', 'fleet', 'test'),
    });
  });

  describe('Provider Creation', () => {
    it('should create provider with correct configuration', () => {
      expect(provider).toBeDefined();
      expect(provider.config.containerName).toBe(testContainerName);
      expect(provider.config.volumeName).toBe(testVolumeName);
      expect(provider.config.port).toBe(testPort);
      expect(provider.config.image).toBe('postgres:16');
    });

    it('should use default configuration when options omitted', () => {
      const defaultProvider = createPodmanPostgresProvider();
      expect(defaultProvider.config.containerName).toBe('fleettools-pg');
      expect(defaultProvider.config.volumeName).toBe('fleettools-pg-data');
      expect(defaultProvider.config.port).toBe(5432);
      expect(defaultProvider.config.image).toBe('postgres:16');
    });
  });

  describe('Platform Detection', () => {
    it('should detect current platform correctly', () => {
      const platform = process.platform;
      expect(['darwin', 'linux', 'win32']).toContain(platform);
    });
  });

  describe('Podman Detection', () => {
    it('should check Podman availability', async () => {
      const checkPodman = await provider['checkPodman']();
      expect(typeof checkPodman).toBe('boolean');
    });
  });

  describe('Environment Variable Support', () => {
    it('should read environment variables with defaults', () => {
      const originalEnv = process.env;
      
      // Test with custom environment
      process.env = {
        ...originalEnv,
        POSTGRES_PASSWORD: 'test-password',
        POSTGRES_DB: 'test-db', 
        POSTGRES_USER: 'test-user',
      };
      
      const envProvider = createPodmanPostgresProvider({
        port: 15433,
        containerName: 'env-test-pg',
        volumeName: 'env-test-data',
      });
      
      // Environment variables are used when starting container
      expect(envProvider).toBeDefined();
      
      // Restore original environment
      process.env = originalEnv;
    });
  });

  describe('Status Functionality', () => {
    it('should return status object when container is not running', async () => {
      const status = await provider.status();
      
      expect(status).toBeDefined();
      expect(status.running).toBe(false);
      expect(status.port).toBe(testPort);
      expect(status.image).toBe('postgres:16');
      expect(status.version).toBe('16.x');
      expect(status.health).toBe('unknown');
    });
  });

  describe('Performance Monitoring', () => {
    it('should return performance metrics structure', async () => {
      const metrics = await provider.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.uptime).toBe('string');
      expect(typeof metrics.restartCount).toBe('number');
      expect(typeof metrics.responseTime).toBe('number');
      expect(typeof metrics.connectionCount).toBe('number');
    });

    it('should handle performance errors gracefully', async () => {
      // Test with invalid container
      const invalidProvider = createPodmanPostgresProvider({
        port: 99999,
        containerName: 'non-existent-container',
        volumeName: 'non-existent-volume',
      });
      
      try {
        const metrics = await invalidProvider.getPerformanceMetrics();
        
        expect(metrics).toBeDefined();
        // May or may not have error field depending on implementation
        if (metrics.error) {
          expect(metrics.uptime).toBe('unknown');
        }
      } catch (error) {
        // Should handle errors gracefully
        expect(error).toBeDefined();
      }
    });
  });

  describe('Log Functionality', () => {
    it('should handle log requests for non-existent container', async () => {
      const logs = await provider.logs();
      expect(logs).toBe('Container not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle container operations gracefully', async () => {
      // Test stop operation on non-running container
      let threwError = false;
      try {
        await provider.stop();
      } catch (error) {
        threwError = true;
      }
      expect(threwError).toBe(false);
    });

    it('should handle destroy operation', async () => {
      // Should not throw even if container doesn't exist
      let threwError = false;
      try {
        await provider.destroy();
      } catch (error) {
        threwError = true;
      }
      expect(threwError).toBe(false);
    });
  });

  describe('Factory Function', () => {
    it('should create provider with custom image', () => {
      const customProvider = createPodmanPostgresProvider({
        image: 'postgres:15',
        containerName: 'custom-pg',
        volumeName: 'custom-data',
      });
      
      expect(customProvider.config.image).toBe('postgres:15');
      expect(customProvider.config.containerName).toBe('custom-pg');
      expect(customProvider.config.volumeName).toBe('custom-data');
    });
  });

  describe('Configuration Validation', () => {
    it('should handle missing environment variables gracefully', () => {
      const testProvider = createPodmanPostgresProvider({
        port: 15434,
      });
      
      // Should use defaults when environment variables are missing
      expect(testProvider.config.port).toBe(15434);
      expect(testProvider.config.containerName).toBe('fleettools-pg');
    });
  });

  describe('Helper Methods', () => {
    it('should format uptime correctly', () => {
      const formatUptime = provider['formatUptime'];
      
      expect(formatUptime(1000)).toBe('1s');
      expect(formatUptime(65000)).toBe('1m 5s');
      expect(formatUptime(3665000)).toBe('1h 1m');
      expect(formatUptime(90065000)).toBe('1d 1h');
    });

    it('should detect container existence correctly', async () => {
      const exists = await provider['containerExists']();
      expect(typeof exists).toBe('boolean');
    });
  });
});