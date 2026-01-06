#!/usr/bin/env node
/**
 * Plugin Tests
 * 
 * Verify that both OpenCode and Claude Code plugins:
 * 1. Load without errors
 * 2. Export required interfaces
 * 3. Can register commands
 * 4. Handle /fleet commands properly
 * 5. Gracefully degrade when SDK unavailable
 */

const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// Test Utilities
// ============================================================================

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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function runCommand(cmd) {
  try {
    const output = execSync(cmd, { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.join(__dirname, '..')
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || '' };
  }
}

// ============================================================================
// Plugin Loading Tests
// ============================================================================

console.log('FleetTools Plugin Tests');
console.log('======================\n');

let passed = 0;
let failed = 0;

// Test: OpenCode plugin loads
if (test('OpenCode plugin loads without errors', () => {
  const result = runCommand('node -e "const p = require(\'./plugins/opencode/dist/index.js\'); console.log(p.fleetToolsPlugin.name)"');
  assert(result.success, `Failed to load OpenCode plugin: ${result.error}`);
  assert(result.output.includes('FleetTools'), 'Plugin name not found in output');
})) {
  passed++;
} else {
  failed++;
}

// Test: Claude Code plugin loads
if (test('Claude Code plugin loads without errors', () => {
  const result = runCommand('node -e "const p = require(\'./plugins/claude-code/dist/index.js\'); console.log(p.fleetToolsPlugin.name)"');
  assert(result.success, `Failed to load Claude Code plugin: ${result.error}`);
  assert(result.output.includes('FleetTools'), 'Plugin name not found in output');
})) {
  passed++;
} else {
  failed++;
}

// ============================================================================
// Plugin Interface Tests
// ============================================================================

// Test: OpenCode plugin exports required interfaces
if (test('OpenCode plugin exports required interfaces', () => {
  const result = runCommand(`node -e "
    const p = require('./plugins/opencode/dist/index.js');
    if (!p.fleetToolsPlugin) throw new Error('Missing fleetToolsPlugin export');
    if (!p.fleetToolsPlugin.name) throw new Error('Missing plugin name');
    if (!p.fleetToolsPlugin.version) throw new Error('Missing plugin version');
    if (!p.fleetToolsPlugin.register) throw new Error('Missing register function');
    if (!p.createPlugin) throw new Error('Missing createPlugin export');
    if (!p.fallbackRegister) throw new Error('Missing fallbackRegister export');
    console.log('All exports present');
  "`);
  assert(result.success, `Plugin interface check failed: ${result.error}`);
  assert(result.output.includes('All exports present'), 'Export verification failed');
})) {
  passed++;
} else {
  failed++;
}

// Test: Claude Code plugin exports required interfaces
if (test('Claude Code plugin exports required interfaces', () => {
  const result = runCommand(`node -e "
    const p = require('./plugins/claude-code/dist/index.js');
    if (!p.fleetToolsPlugin) throw new Error('Missing fleetToolsPlugin export');
    if (!p.fleetToolsPlugin.name) throw new Error('Missing plugin name');
    if (!p.fleetToolsPlugin.version) throw new Error('Missing plugin version');
    if (!p.fleetToolsPlugin.register) throw new Error('Missing register function');
    if (!p.createPlugin) throw new Error('Missing createPlugin export');
    if (!p.fallbackRegister) throw new Error('Missing fallbackRegister export');
    console.log('All exports present');
  "`);
  assert(result.success, `Plugin interface check failed: ${result.error}`);
  assert(result.output.includes('All exports present'), 'Export verification failed');
})) {
  passed++;
} else {
  failed++;
}

// ============================================================================
// Plugin Version Tests
// ============================================================================

// Test: OpenCode plugin has correct version
if (test('OpenCode plugin has correct version', () => {
  const result = runCommand('node -e "const p = require(\'./plugins/opencode/dist/index.js\'); console.log(p.fleetToolsPlugin.version)"');
  assert(result.success, `Failed to get version: ${result.error}`);
  assert(result.output.includes('0.1.0'), 'Version mismatch');
})) {
  passed++;
} else {
  failed++;
}

// Test: Claude Code plugin has correct version
if (test('Claude Code plugin has correct version', () => {
  const result = runCommand('node -e "const p = require(\'./plugins/claude-code/dist/index.js\'); console.log(p.fleetToolsPlugin.version)"');
  assert(result.success, `Failed to get version: ${result.error}`);
  assert(result.output.includes('0.1.0'), 'Version mismatch');
})) {
  passed++;
} else {
  failed++;
}

// ============================================================================
// Plugin Command Registration Tests
// ============================================================================

// Test: OpenCode plugin can create instance
if (test('OpenCode plugin can create instance', () => {
  const result = runCommand(`node -e "
    const p = require('./plugins/opencode/dist/index.js');
    const plugin = p.createPlugin();
    if (!plugin) throw new Error('Failed to create plugin instance');
    if (!plugin.name) throw new Error('Plugin instance missing name');
    if (!plugin.version) throw new Error('Plugin instance missing version');
    if (!plugin.registerCommands) throw new Error('Plugin instance missing registerCommands');
    console.log('Plugin instance created successfully');
  "`);
  assert(result.success, `Plugin instantiation failed: ${result.error}`);
  assert(result.output.includes('successfully'), 'Instantiation verification failed');
})) {
  passed++;
} else {
  failed++;
}

// Test: Claude Code plugin can create instance
if (test('Claude Code plugin can create instance', () => {
  const result = runCommand(`node -e "
    const p = require('./plugins/claude-code/dist/index.js');
    const plugin = p.createPlugin();
    if (!plugin) throw new Error('Failed to create plugin instance');
    if (!plugin.name) throw new Error('Plugin instance missing name');
    if (!plugin.version) throw new Error('Plugin instance missing version');
    if (!plugin.registerCommands) throw new Error('Plugin instance missing registerCommands');
    console.log('Plugin instance created successfully');
  "`);
  assert(result.success, `Plugin instantiation failed: ${result.error}`);
  assert(result.output.includes('successfully'), 'Instantiation verification failed');
})) {
  passed++;
} else {
  failed++;
}

// ============================================================================
// Graceful Degradation Tests
// ============================================================================

// Test: OpenCode plugin fallback function exists
if (test('OpenCode plugin has fallback registration', () => {
  const result = runCommand(`node -e "
    const p = require('./plugins/opencode/dist/index.js');
    if (!p.fallbackRegister) throw new Error('Missing fallbackRegister');
    if (typeof p.fallbackRegister !== 'function') throw new Error('fallbackRegister is not a function');
    console.log('Fallback function available');
  "`);
  assert(result.success, `Fallback check failed: ${result.error}`);
  assert(result.output.includes('available'), 'Fallback verification failed');
})) {
  passed++;
} else {
  failed++;
}

// Test: Claude Code plugin fallback function exists
if (test('Claude Code plugin has fallback registration', () => {
  const result = runCommand(`node -e "
    const p = require('./plugins/claude-code/dist/index.js');
    if (!p.fallbackRegister) throw new Error('Missing fallbackRegister');
    if (typeof p.fallbackRegister !== 'function') throw new Error('fallbackRegister is not a function');
    console.log('Fallback function available');
  "`);
  assert(result.success, `Fallback check failed: ${result.error}`);
  assert(result.output.includes('available'), 'Fallback verification failed');
})) {
  passed++;
} else {
  failed++;
}

// ============================================================================
// CLI Integration Tests
// ============================================================================

// Test: fleet status works
if (test('fleet status command works', () => {
  const result = runCommand('node cli/dist/index.js status');
  assert(result.success, `fleet status failed: ${result.error}`);
  assert(result.output.includes('FleetTools Status'), 'Missing status output');
})) {
  passed++;
} else {
  failed++;
}

// Test: fleet setup works
if (test('fleet setup command works', () => {
  const result = runCommand('node cli/dist/index.js setup');
  assert(result.success, `fleet setup failed: ${result.error}`);
  assert(result.output.includes('Setup complete'), 'Missing setup output');
})) {
  passed++;
} else {
  failed++;
}

// Test: fleet doctor works
if (test('fleet doctor command works', () => {
  const result = runCommand('node cli/dist/index.js doctor');
  assert(result.success, `fleet doctor failed: ${result.error}`);
  assert(result.output.includes('FleetTools Diagnostics'), 'Missing doctor output');
})) {
  passed++;
} else {
  failed++;
}

// ============================================================================
// TypeScript Definition Tests
// ============================================================================

// Test: OpenCode plugin has TypeScript definitions
if (test('OpenCode plugin has TypeScript definitions', () => {
  const result = runCommand('test -f plugins/opencode/dist/index.d.ts && echo "Found"');
  assert(result.success, 'TypeScript definitions not found');
  assert(result.output.includes('Found'), 'Definition file missing');
})) {
  passed++;
} else {
  failed++;
}

// Test: Claude Code plugin has TypeScript definitions
if (test('Claude Code plugin has TypeScript definitions', () => {
  const result = runCommand('test -f plugins/claude-code/dist/index.d.ts && echo "Found"');
  assert(result.success, 'TypeScript definitions not found');
  assert(result.output.includes('Found'), 'Definition file missing');
})) {
  passed++;
} else {
  failed++;
}

// ============================================================================
// Summary
// ============================================================================

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('\nFailed tests indicate plugin issues that need to be addressed.');
  process.exit(1);
} else {
  console.log('\nAll plugin tests passed! Plugins are ready for use.');
  process.exit(0);
}
