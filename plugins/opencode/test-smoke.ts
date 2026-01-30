#!/usr/bin/env bun

/**
 * OpenCode smoke test
 * Tests that FleetTools plugin loads correctly in OpenCode
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

function setupTestConfig() {
  const configDir = '.opencode-test';
  const configPath = join(configDir, 'opencode.json');
  
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  
  const config = {
    $schema: 'https://opencode.ai/config.json',
    plugin: ['@fleettools/opencode-plugin']
  };
  
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  return configDir;
}

function cleanupTestConfig() {
  const configDir = '.opencode-test';
  try {
    const { existsSync } = require('fs');
    if (existsSync(configDir)) {
      const { rmSync } = require('fs');
      rmSync(configDir, { recursive: true, force: true });
    }
  } catch {}
}

async function runOpenCodeTest() {
  console.log('🧪 Running OpenCode smoke test...');
  
  try {
    // Setup test config
    const configDir = setupTestConfig();
    
    // Run OpenCode with the test config
    const { spawn } = await import('child_process');
    const opencode = spawn('opencode', [], {
      stdio: ['inherit'],
      env: {
        ...process.env,
        OPENCODE_CONFIG: join(configDir, 'opencode.json'),
        OPENCODE_CONFIG_DIR: configDir
      }
    });
    
    return new Promise((resolve, reject) => {
      let output = '';
      let hasPlugin = false;
      let hasTools = false;
      
      opencode.stdout?.on('data', (data) => {
        output += data.toString();
        
        if (output.includes('FleetTools')) {
          hasPlugin = true;
        }
        
        if (output.includes('fleet-status') || output.includes('fleet-start') || output.includes('fleet-stop')) {
          hasTools = true;
        }
      });
      
      opencode.on('close', (code) => {
        cleanupTestConfig();
        
        if (code === 0 && hasPlugin && hasTools) {
          console.log('✅ PASS: FleetTools plugin loaded with tools and commands');
          resolve(true);
        } else {
          console.log('❌ FAIL: Plugin did not load correctly');
          console.log('Output:', output);
          resolve(false);
        }
      });
      
      opencode.on('error', (error) => {
        cleanupTestConfig();
        console.error('❌ FAIL: OpenCode test failed:', error);
        reject(error);
      });
    });
  } catch (error) {
    cleanupTestConfig();
    console.error('❌ FAIL: Test setup failed:', error);
    process.exit(1);
  }
}

if (process.argv.includes('smoke')) {
  runOpenCodeTest();
} else {
  console.log('Usage: bun test-smoke.ts smoke');
  process.exit(1);
}