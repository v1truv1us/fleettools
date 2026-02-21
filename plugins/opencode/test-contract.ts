#!/usr/bin/env bun

/**
 * Plugin contract test
 * Verifies that FleetToolsPlugin exports correctly and implements OpenCode hooks
 */

const pluginPath = './dist/index.js';

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
        app: { 
          log: async () => {},
          readProjectFile: async () => '{}',
          writeProjectFile: async () => {},
          ensureDir: async () => {}
        }
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
    
    const expectedTools = ['fleet_status', 'fleet_start', 'fleet_stop', 'fleet_setup', 'fleet_context'];
    const actualTools = Object.keys(hooks.tool);
    
    // Check for at least the core tools
    const coreTools = ['fleet_status', 'fleet_start', 'fleet_stop'];
    const missingCore = coreTools.filter(tool => !actualTools.includes(tool));
    
    if (missingCore.length > 0) {
      console.error('❌ FAIL: Missing core tools:', missingCore);
      console.error('Available tools:', actualTools);
      process.exit(1);
    }
    
    console.log(`✅ PASS: Found ${actualTools.length} tools (${actualTools.join(', ')})`);
    
    // Test 3: Config hook should register commands
    const mockConfig: any = {};
    await hooks.config?.(mockConfig);
    
    if (!mockConfig.command || Object.keys(mockConfig.command).length < 1) {
      console.error('❌ FAIL: Expected at least 1 slash command');
      process.exit(1);
    }
    
    const actualCommands = Object.keys(mockConfig.command);
    console.log(`✅ PASS: Registered ${actualCommands.length} commands (${actualCommands.join(', ')})`);
    console.log('✅ Plugin contract test PASSED');
    
  } catch (error) {
    console.error('❌ FAIL: Contract test failed:', error);
    process.exit(1);
  }
}

testPluginContract();