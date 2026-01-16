import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import {
  getDefaultGlobalConfig,
  getGlobalConfigPath,
  loadGlobalConfig,
  saveGlobalConfig,
  getProjectConfigPath,
  loadProjectConfig,
  saveProjectConfig,
  isFleetProject,
  ensureDirectories
} from '../src/config.js';

describe('Configuration Management', () => {
  let tempDir: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    tempDir = tmpdir();
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
  });

  describe('getDefaultGlobalConfig', () => {
    it('should return default global configuration', () => {
      const config = getDefaultGlobalConfig();
      
      expect(config.version).toBe('1.0.0');
      expect(config.defaultRuntime).toBe('bun');
      expect(config.telemetry.enabled).toBe(false);
      expect(config.services.autoStart).toBe(false);
      expect(config.services.squawkPort).toBe(3000);
      expect(config.services.apiPort).toBe(3001);
      expect(config.paths.configDir).toContain('.config/fleet');
      expect(config.paths.dataDir).toContain('.local/share/fleet');
      expect(config.paths.logDir).toContain('.local/state/fleet/logs');
    });
  });

  describe('getGlobalConfigPath', () => {
    it('should return correct global config path', () => {
      const path = getGlobalConfigPath();
      expect(path).toContain('.config/fleet/config.yaml');
    });
  });

  describe('loadGlobalConfig', () => {
    it('should return default config when file does not exist', () => {
      const config = loadGlobalConfig();
      expect(config).toEqual(getDefaultGlobalConfig());
    });

    it('should load and merge existing config with defaults', () => {
      const configPath = getGlobalConfigPath();
      
      writeFileSync(configPath, `defaultRuntime: node\ntelemetry:\n  enabled: true\n  endpoint: https://example.com`);
      
      const config = loadGlobalConfig();
      expect(config.defaultRuntime).toBe('node');
      expect(config.telemetry.enabled).toBe(true);
      expect(config.telemetry.endpoint).toBe('https://example.com');
      expect(config.version).toBe('1.0.0'); // Should keep default
      
      unlinkSync(configPath);
    });
  });

  describe('saveGlobalConfig', () => {
    it('should save global configuration to file', () => {
      const config = getDefaultGlobalConfig();
      config.defaultRuntime = 'node';
      config.telemetry.enabled = true;
      
      saveGlobalConfig(config);
      
      const configPath = getGlobalConfigPath();
      expect(existsSync(configPath)).toBe(true);
      
      const loadedConfig = loadGlobalConfig();
      expect(loadedConfig.defaultRuntime).toBe('node');
      expect(loadedConfig.telemetry.enabled).toBe(true);
      
      unlinkSync(configPath);
    });
  });

  describe('getProjectConfigPath', () => {
    it('should return correct project config path', () => {
      const path = getProjectConfigPath();
      expect(path).toContain('fleet.yaml');
    });
  });

  describe('loadProjectConfig', () => {
    it('should return null when project config does not exist', () => {
      const config = loadProjectConfig();
      expect(config).toBeNull();
    });

    it('should load and merge project config with defaults', () => {
      const configPath = getProjectConfigPath();
      
      writeFileSync(configPath, `name: test-project\nfleet:\n  mode: synced\n  workspaceId: ws-123\nservices:\n  squawk:\n    port: 4000\n  postgres:\n    enabled: true`);
      
      const config = loadProjectConfig();
      expect(config).not.toBeNull();
      expect(config!.name).toBe('test-project');
      expect(config!.fleet.mode).toBe('synced');
      expect(config!.fleet.workspaceId).toBe('ws-123');
      expect(config!.services.squawk.port).toBe(4000);
      expect(config!.services.postgres.enabled).toBe(true);
      
      unlinkSync(configPath);
    });
  });

  describe('saveProjectConfig', () => {
    it('should save project configuration to file', () => {
      const config = {
        name: 'test-project',
        version: '1.0.0',
        fleet: { version: '0.1.0', mode: 'local' as const },
        services: {
          squawk: { enabled: true, port: 3000, dataDir: './.fleet/squawk' },
          api: { enabled: true, port: 3001 },
          postgres: { enabled: false, provider: 'podman' as const, port: 5432, dataDir: './.fleet/postgres' }
        },
        plugins: { claudeCode: true, openCode: true }
      };
      
      saveProjectConfig(config);
      
      const configPath = getProjectConfigPath();
      expect(existsSync(configPath)).toBe(true);
      
      const loadedConfig = loadProjectConfig();
      expect(loadedConfig!.name).toBe('test-project');
      
      unlinkSync(configPath);
    });
  });

  describe('isFleetProject', () => {
    it('should return false when fleet.yaml does not exist', () => {
      expect(isFleetProject()).toBe(false);
    });

    it('should return true when fleet.yaml exists', () => {
      const configPath = getProjectConfigPath();
      writeFileSync(configPath, 'name: test');
      
      expect(isFleetProject()).toBe(true);
      
      unlinkSync(configPath);
    });
  });

  describe('ensureDirectories', () => {
    it('should create all required directories', () => {
      const config = getDefaultGlobalConfig();
      
      ensureDirectories(config);
      
      expect(existsSync(config.paths.configDir)).toBe(true);
      expect(existsSync(config.paths.dataDir)).toBe(true);
      expect(existsSync(config.paths.logDir)).toBe(true);
    });
  });
});