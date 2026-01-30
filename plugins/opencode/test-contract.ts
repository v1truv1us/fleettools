#!/usr/bin/env bun

/**
 * Plugin contract test
 * Verifies that FleetToolsPlugin exports correctly and implements OpenCode hooks
 */

const pluginPath = '../dist/index.js';

async function testPluginContract() {
  console.log('🧪 Testing FleetTools Plugin Contract...');
  
  try {
    // Import the built plugin
    const pluginModule = await import(pluginPath);
    
    // Test 1: Plugin should export a function
    if (typeof pluginModule !== 'object') {
      console.error('❌ FAIL: Plugin does not export an object');
      process.exit(1);
    }
    
    // Find the named export
    const exportNames = Object.keys(pluginModule);
    const pluginExport = pluginModule.default || pluginModule.FleetToolsPlugin || exportNames[0];
    
    if (!pluginExport || typeof pluginExport !== 'function') {
      console.error('❌ FAIL: No FleetToolsPlugin export found');
      process.exit(1);
    }
    
    console.log('✅ PASS: Plugin exports FleetToolsPlugin function');
    
    // Test 2: Calling plugin should return hooks object
    const mockContext = {
      client: {
        app: { log: async () => {} }
      },
      $: { (_cmd: any) => ({ nothrow: () => ({ text: '' })) },
      directory: '/test',
      worktree: '/test'
    };
    
    const hooks = await pluginExport(mockContext);
    
    if (typeof hooks !== 'object' || !hooks.tool || !hooks.config) {
      console.error('❌ FAIL: Plugin does not return required hooks');
      process.exit(1);
    }
    
    if (Object.keys(hooks.tool).length !== 3) {
      console.error('❌ FAIL: Expected 3 tools, got', Object.keys(hooks.tool).length);
      process.exit(1);
    }
    
    const expectedTools = ['fleet-status', 'fleet-start', 'fleet-stop'];
    const actualTools = Object.keys(hooks.tool);
    
    for (const tool of expectedTools) {
      if (!actualTools.includes(tool)) {
        console.error(`❌ FAIL: Missing tool: ${tool}`);
        process.exit(1);
      }
    }
    
    console.log('✅ PASS: All expected tools present');
    
    // Test 3: Config hook should register commands
    const mockConfig = {};
    await hooks.config?.(mockConfig);
    
    if (!mockConfig.command || Object.keys(mockConfig.command).length < 4) {
      console.error('❌ FAIL: Expected 4 slash commands');
      process.exit(1);
    }
    
    const expectedCommands = ['fleet-status', 'fleet-start', 'fleet-stop', 'fleet-help'];
    const actualCommands = Object.keys(mockConfig.command);
    
    for (const cmd of expectedCommands) {
      if (!actualCommands.includes(cmd)) {
        console.error(`❌ FAIL: Missing command: ${cmd}`);
        process.exit(1);
      }
    }
    
    console.log('✅ PASS: All expected commands registered');
    console.log('✅ Plugin contract test PASSED');
    
  } catch (error) {
    console.error('❌ FAIL: Contract test failed:', error);
    process.exit(1);
  }
}

testPluginContract();