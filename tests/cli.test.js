#!/usr/bin/env node
/**
 * CLI Integration Tests
 * 
 * Verify that all fleet commands run without errors
 */

const { execSync } = require('child_process');
const path = require('path');

const CLI_PATH = path.join(__dirname, '..', 'cli', 'dist', 'index.js');

function runCommand(cmd) {
  try {
    const output = execSync(`node ${CLI_PATH} ${cmd}`, { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    return false;
  }
}

// Run tests
console.log('FleetTools CLI Tests');
console.log('===================\n');

let passed = 0;
let failed = 0;

// Test: fleet status
if (test('fleet status runs without errors', () => {
  const result = runCommand('status');
  if (!result.success) throw new Error(result.error);
  if (!result.output.includes('FleetTools Status')) throw new Error('Missing status output');
})) {
  passed++;
} else {
  failed++;
}

// Test: fleet setup
if (test('fleet setup runs without errors', () => {
  const result = runCommand('setup');
  if (!result.success) throw new Error(result.error);
  if (!result.output.includes('Setup complete')) throw new Error('Missing setup output');
})) {
  passed++;
} else {
  failed++;
}

// Test: fleet doctor
if (test('fleet doctor runs without errors', () => {
  const result = runCommand('doctor');
  if (!result.success) throw new Error(result.error);
  if (!result.output.includes('FleetTools Diagnostics')) throw new Error('Missing doctor output');
})) {
  passed++;
} else {
  failed++;
}

// Test: fleet services status
if (test('fleet services status runs without errors', () => {
  const result = runCommand('services status');
  if (!result.success) throw new Error(result.error);
  if (!result.output.includes('FleetTools Services Status')) throw new Error('Missing services output');
})) {
  passed++;
} else {
  failed++;
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
