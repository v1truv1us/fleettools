#!/usr/bin/env bun

/**
 * Simple existence test
 */

async function testPluginExists() {
  console.log('🧪 Testing FleetTools Plugin Exists...');
  
  try {
    // Import the built plugin
    const pluginPath = './dist/index.js';
    const pluginModule = await import(pluginPath);
    
    if (typeof pluginModule === 'object' && Object.keys(pluginModule).length > 0) {
      console.log('✅ PASS: Plugin exports exist');
      console.log('Exports:', Object.keys(pluginModule));
    } else {
      console.error('❌ FAIL: Plugin exports not found');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ FAIL: Could not load plugin:', error);
    process.exit(1);
  }
}

testPluginExists();