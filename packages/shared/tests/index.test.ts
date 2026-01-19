import { describe, it, expect } from 'bun:test';

// Test that all modules are properly exported from main entry point
describe('Main Entry Point', () => {
  it('should export runtime functions', () => {
    const indexModule = require('../src/index.js');
    
    // Runtime exports
    expect(indexModule.detectRuntime).toBeDefined();
    expect(indexModule.getRuntimeInfo).toBeDefined();
    expect(indexModule.isSupportedRuntime).toBeDefined();
    expect(indexModule.getPreferredRuntime).toBeDefined();
    expect(indexModule.isDevelopment).toBeDefined();
    expect(indexModule.getRuntimeExecutable).toBeDefined();
    expect(indexModule.createCrossRuntimeRequire).toBeDefined();
  });

  it('should export config functions', () => {
    const indexModule = require('../src/index.js');
    
    // Config exports
    expect(indexModule.getDefaultGlobalConfig).toBeDefined();
    expect(indexModule.getGlobalConfigPath).toBeDefined();
    expect(indexModule.loadGlobalConfig).toBeDefined();
    expect(indexModule.saveGlobalConfig).toBeDefined();
    expect(indexModule.getProjectConfigPath).toBeDefined();
    expect(indexModule.loadProjectConfig).toBeDefined();
    expect(indexModule.saveProjectConfig).toBeDefined();
    expect(indexModule.getDefaultProjectConfig).toBeDefined();
    expect(indexModule.isFleetProject).toBeDefined();
    expect(indexModule.ensureDirectories).toBeDefined();
  });

  it('should export project functions', () => {
    const indexModule = require('../src/index.js');
    
    // Project exports
    expect(indexModule.PROJECT_TEMPLATES).toBeDefined();
    expect(indexModule.initializeProject).toBeDefined();
    expect(indexModule.getAvailableTemplates).toBeDefined();
    expect(indexModule.getTemplateInfo).toBeDefined();
    expect(indexModule.isValidProject).toBeDefined();
    expect(indexModule.getProjectRoot).toBeDefined();
  });

  it('should export utility functions', () => {
    const indexModule = require('../src/index.js');
    
    // Utils exports
    expect(indexModule.colors).toBeDefined();
    expect(indexModule.colorize).toBeDefined();
    expect(indexModule.commandExists).toBeDefined();
    expect(indexModule.findUp).toBeDefined();
    expect(indexModule.sleep).toBeDefined();
    expect(indexModule.retry).toBeDefined();
    expect(indexModule.formatBytes).toBeDefined();
    expect(indexModule.formatDuration).toBeDefined();
    expect(indexModule.generateId).toBeDefined();
    expect(indexModule.deepClone).toBeDefined();
    expect(indexModule.isPromise).toBeDefined();
    expect(indexModule.FleetEventEmitter).toBeDefined();
  });

  it('should have consistent export structure', () => {
    const indexModule = require('../src/index.js');
    const exports = Object.keys(indexModule);
    
    // Should have a reasonable number of exports
    expect(exports.length).toBeGreaterThan(20);
    
    // All exports should be functions or objects
    exports.forEach(exportName => {
      const exported = indexModule[exportName];
      expect(typeof exported === 'function' || typeof exported === 'object').toBe(true);
    });
  });
});