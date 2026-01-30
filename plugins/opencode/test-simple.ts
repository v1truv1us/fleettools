#!/usr/bin/env bun

/**
 * Basic plugin contract test
 */

async function testPluginContract() {
  console.log('🧪 Testing FleetTools Plugin Contract...');
  
  try {
    const pluginModule = await import('./dist/index.js');
    
    if (typeof pluginModule !== 'object') {
      console.error('❌ FAIL: Plugin does not export an object');
      process.exit(1);
    }
    
    const exportNames = Object.keys(pluginModule);
    const pluginExport = pluginModule.default || pluginModule.FleetToolsPlugin || exportNames[0];
    
    if (!pluginExport || typeof pluginExport !== 'function') {
      console.error('❌ FAIL: No FleetToolsPlugin export found');
      process.exit(1);
    }
    
    console.log('✅ PASS: Plugin exports FleetToolsPlugin function');
    
    const mockContext = {} as any;
    const hooks = await pluginExport(mockContext);
    
    if (typeof hooks !== 'object' || !hooks.tool || !hooks.config) {
      console.error('❌ FAIL: Plugin does not return required hooks');
      process.exit(1);
    }
    
    console.log('✅ PASS: Plugin returns hooks object');
    console.log('✅ Plugin contract test PASSED');
    
  } catch (error) {
    console.error('❌ FAIL: Contract test failed:', error);
    process.exit(1);
  }
}

testPluginContract();