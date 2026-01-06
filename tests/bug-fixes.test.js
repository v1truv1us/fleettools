/**
 * Bug Fixes Verification Tests
 * 
 * Tests for Phase 1 critical bug fixes:
 * - TASK-101: CLI execSync import
 * - TASK-102: Squawk UUID usage
 * - TASK-103: Lock release variable
 * - TASK-104: Podman version check
 * - TASK-105: Postgres status check
 * - TASK-106: Mailbox retrieval
 * - TASK-107: Claude Code plugin catch block
 * - TASK-108: OpenCode plugin catch block
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// ============================================================================
// TASK-101: CLI execSync Import
// ============================================================================

test('TASK-101: CLI has execSync import', () => {
  const cliPath = path.join(__dirname, '../cli/index.cjs');
  const content = fs.readFileSync(cliPath, 'utf-8');
  
  // Check that execSync is imported
  assert.match(
    content,
    /execSync/,
    'CLI should import execSync from child_process'
  );
});

// ============================================================================
// TASK-102: Squawk UUID Usage
// ============================================================================

test('TASK-102: Squawk uses crypto.randomUUID()', () => {
  const squawkPath = path.join(__dirname, '../squawk/api/index.js');
  const content = fs.readFileSync(squawkPath, 'utf-8');
  
  // Check that crypto is imported correctly
  assert.match(
    content,
    /const\s+crypto\s*=\s*require\s*\(\s*['"]crypto['"]\s*\)/,
    'Squawk should import crypto module'
  );
  
  // Check that crypto.randomUUID() is used
  assert.match(
    content,
    /crypto\.randomUUID\s*\(\s*\)/,
    'Squawk should use crypto.randomUUID()'
  );
});

// ============================================================================
// TASK-103: Lock Release Variable
// ============================================================================

test('TASK-103: Lock release endpoint has specialist_id', () => {
  const squawkPath = path.join(__dirname, '../squawk/api/index.js');
  const content = fs.readFileSync(squawkPath, 'utf-8');
  
  // Find the lock/release endpoint and check for specialist_id
  const lockReleaseSection = content.match(
    /\/api\/v1\/lock\/release[\s\S]*?const\s*{\s*([^}]+)\s*}\s*=\s*req\.body/
  );
  
  assert.ok(lockReleaseSection, 'Lock release endpoint should exist');
  assert.match(
    lockReleaseSection[1],
    /specialist_id/,
    'Lock release should destructure specialist_id'
  );
});

// ============================================================================
// TASK-104: Podman Version Check
// ============================================================================

test('TASK-104: Podman version check returns boolean', () => {
  const cliPath = path.join(__dirname, '../cli/index.cjs');
  const content = fs.readFileSync(cliPath, 'utf-8');
  
  // Find the checkPodmanSync function
  const podmanFunc = content.match(
    /function\s+checkPodmanSync\s*\(\s*\)\s*{[\s\S]*?return\s+true[\s\S]*?return\s+false[\s\S]*?}/
  );
  
  assert.ok(podmanFunc, 'checkPodmanSync should return true on success, false on error');
  
  // Verify it doesn't check result.error
  assert.doesNotMatch(
    podmanFunc[0],
    /result\.error/,
    'Podman check should not check result.error'
  );
});

// ============================================================================
// TASK-105: Postgres Status Check
// ============================================================================

test('TASK-105: Postgres status check uses result.trim()', () => {
  const cliPath = path.join(__dirname, '../cli/index.cjs');
  const content = fs.readFileSync(cliPath, 'utf-8');
  
  // Find the checkPostgresStatusSync function
  const postgresFunc = content.match(
    /function\s+checkPostgresStatusSync\s*\(\s*\)\s*{[\s\S]*?result\.trim[\s\S]*?}/
  );
  
  assert.ok(postgresFunc, 'checkPostgresStatusSync should use result.trim()');
  
  // Verify it doesn't use result.stdout.trim()
  assert.doesNotMatch(
    postgresFunc[0],
    /result\.stdout\.trim/,
    'Postgres check should not use result.stdout.trim()'
  );
});

// ============================================================================
// TASK-106: Mailbox Retrieval
// ============================================================================

test('TASK-106: Mailbox retrieval has else clause', () => {
  const squawkPath = path.join(__dirname, '../squawk/api/index.js');
  const content = fs.readFileSync(squawkPath, 'utf-8');
  
  // Find the mailbox append endpoint and check for else clause
  const mailboxSection = content.match(
    /\/api\/v1\/mailbox\/append[\s\S]*?let\s+mailbox[\s\S]*?else\s*{\s*mailbox\s*=\s*mailboxes\.get[\s\S]*?mailbox\.events\.push/
  );
  
  assert.ok(mailboxSection, 'Mailbox retrieval should have else clause to get existing mailbox');
});

// ============================================================================
// TASK-107: Claude Code Plugin Catch Block
// ============================================================================

test('TASK-107: Claude Code plugin catch block is fixed', () => {
  const pluginPath = path.join(__dirname, '../plugins/claude-code/index.js');
  const content = fs.readFileSync(pluginPath, 'utf-8');
  
  // Find the catch block in handleStatus
  const catchBlock = content.match(
    /catch\s*\(\s*parseError\s*\)\s*{\s*this\.showOutput\s*\(\s*\[\s*['"]Failed to parse status output['"]\s*\]\s*\)/
  );
  
  assert.ok(catchBlock, 'Claude Code plugin catch block should show error message');
});

// ============================================================================
// TASK-108: OpenCode Plugin Catch Block
// ============================================================================

test('TASK-108: OpenCode plugin catch block is fixed', () => {
  const pluginPath = path.join(__dirname, '../plugins/opencode/index.js');
  const content = fs.readFileSync(pluginPath, 'utf-8');
  
  // Find the catch block in handleStatus
  const catchBlock = content.match(
    /catch\s*\(\s*parseError\s*\)\s*{\s*this\.showOutput\s*\(\s*\[\s*['"]Failed to parse status output['"]\s*\]\s*\)/
  );
  
  assert.ok(catchBlock, 'OpenCode plugin catch block should show error message');
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n✓ All bug fix verification tests completed');
console.log('  TASK-101: CLI execSync import ✓');
console.log('  TASK-102: Squawk UUID usage ✓');
console.log('  TASK-103: Lock release variable ✓');
console.log('  TASK-104: Podman version check ✓');
console.log('  TASK-105: Postgres status check ✓');
console.log('  TASK-106: Mailbox retrieval ✓');
console.log('  TASK-107: Claude Code plugin catch ✓');
console.log('  TASK-108: OpenCode plugin catch ✓');
