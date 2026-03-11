#!/usr/bin/env bun

/**
 * Simple existence test
 */

async function testPluginExists() {
  console.log('🧪 Testing FleetTools Plugin Exists...');
  try {
    const { existsSync } = await import('fs');
    const pluginPath = './dist/index.js';
    
    if (existsSync(pluginPath)) {
      console.log('✅ PASS: Plugin build exists');
      process.exit(0);
    } else {
      console.error('❌ FAIL: Plugin build not found');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ FAIL: Existence test failed:', error);
    process.exit(1);
  }
}

testPluginExists();