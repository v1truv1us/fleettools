import { describe, it, expect } from 'bun:test';
import { getRuntimeInfo, isSupportedRuntime, getPreferredRuntime, isDevelopment, getRuntimeExecutable, createCrossRuntimeRequire } from '../src/runtime.js';

describe('Runtime Detection', () => {
  describe('getRuntimeInfo', () => {
    it('should return runtime info for current environment', () => {
      const info = getRuntimeInfo();
      
      expect(info.type).toMatch(/^(bun|node|unknown)$/);
      expect(info.version).toBeDefined();
      expect(typeof info.supported).toBe('boolean');
      expect(typeof info.isBun).toBe('boolean');
      expect(typeof info.isNode).toBe('boolean');
      expect(info.platform).toBeDefined();
      expect(info.arch).toBeDefined();
    });
  });

  describe('isSupportedRuntime', () => {
    it('should return true for current runtime', () => {
      expect(isSupportedRuntime()).toBe(true);
    });
  });

  describe('getPreferredRuntime', () => {
    it('should return a valid runtime name', () => {
      const preferred = getPreferredRuntime();
      expect(preferred).toMatch(/^(bun|node)$/);
    });
  });

  describe('isDevelopment', () => {
    it('should handle NODE_ENV environment variable', () => {
      const originalEnv = process.env.NODE_ENV;
      
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
      
      process.env.NODE_ENV = 'production';
      expect(isDevelopment()).toBe(false);
      
      delete process.env.NODE_ENV;
      expect(isDevelopment()).toBe(true);
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('getRuntimeExecutable', () => {
    it('should return runtime executable name', () => {
      const executable = getRuntimeExecutable();
      expect(executable).toMatch(/^(bun|node)$/);
    });
  });

  describe('createCrossRuntimeRequire', () => {
    it('should create a working require function', () => {
      const req = createCrossRuntimeRequire();
      expect(typeof req).toBe('function');
    });

    it('should throw error when trying to require non-existent module', () => {
      const req = createCrossRuntimeRequire();
      expect(() => req('./non-existent-module')).toThrow();
    });
  });
});