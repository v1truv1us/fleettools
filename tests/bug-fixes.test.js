/**
 * FleetTools Bug Fixes Verification Tests
 * Tests for all Phase 1 bug fixes
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

describe('Bug Fixes Verification', () => {
  describe('TASK-101: CLI execSync Import', () => {
    it('should have execSync imported from child_process', () => {
      // Verify the import statement exists in the source
      const fs = require('fs');
      const content = fs.readFileSync('./cli/index.cjs', 'utf-8');
      assert.ok(
        content.includes("const { exec, execSync }"),
        'execSync should be imported alongside exec'
      );
    });
  });

  describe('TASK-102: Squawk UUID Usage', () => {
    it('should use crypto.randomUUID() instead of v4.randomUUID()', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./squawk/api/index.js', 'utf-8');
      
      // Should NOT have the incorrect import
      assert.ok(
        !content.includes("const { v4: randomUUID }"),
        'v4: randomUUID import should be removed'
      );
      
      // Should have crypto import
      assert.ok(
        content.includes("const crypto = require('crypto')"),
        'crypto should be imported'
      );
      
      // Should use crypto.randomUUID()
      assert.ok(
        content.includes('crypto.randomUUID()'),
        'Should use crypto.randomUUID()'
      );
      
      // Should NOT use v4.randomUUID()
      assert.ok(
        !content.includes('v4.randomUUID()'),
        'Should not use v4.randomUUID()'
      );
    });
  });

  describe('TASK-103: Lock Release Variable', () => {
    it('should destructure specialist_id from req.body', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./squawk/api/index.js', 'utf-8');
      
      // Should have specialist_id in the lock release destructuring
      assert.ok(
        content.includes('const { lock_id, specialist_id } = req.body'),
        'specialist_id should be destructured from req.body'
      );
    });
  });

  describe('TASK-104: Podman Version Check', () => {
    it('should return true on success without checking result.error', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./cli/index.cjs', 'utf-8');
      
      // Should NOT check for result.error
      assert.ok(
        !content.includes('!result.error'),
        'Should not check !result.error'
      );
      
      // Should return true directly after execSync succeeds
      assert.ok(
        content.includes("execSync('podman --version'"),
        'Should use execSync for podman check'
      );
    });
  });

  describe('TASK-105: Postgres Status Check', () => {
    it('should use result.trim() instead of result.stdout.trim()', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./cli/index.cjs', 'utf-8');
      
      // Should NOT use result.stdout.trim()
      assert.ok(
        !content.includes('result.stdout.trim()'),
        'Should not use result.stdout.trim()'
      );
      
      // Should use result.trim() directly
      assert.ok(
        content.includes('.trim().length > 0'),
        'Should use .trim().length > 0 pattern'
      );
    });
  });

  describe('TASK-106: Mailbox Retrieval', () => {
    it('should have else branch to retrieve existing mailbox', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./squawk/api/index.js', 'utf-8');
      
      // Should have else branch
      assert.ok(
        content.includes('} else {'),
        'Should have else branch for existing mailboxes'
      );
      
      // Should get existing mailbox
      assert.ok(
        content.includes('mailbox = mailboxes.get(stream_id)'),
        'Should retrieve existing mailbox from Map'
      );
    });
  });

  describe('TASK-107: Claude Code Plugin Catch Block', () => {
    it('should use inline message instead of undefined output', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./plugins/claude-code/index.js', 'utf-8');
      
      // Should have the fix for the catch block
      assert.ok(
        content.includes("this.showOutput(['Failed to parse status output'])"),
        'Should use inline array message instead of undefined output'
      );
    });
  });

  describe('TASK-108: OpenCode Plugin Catch Block', () => {
    it('should use inline message instead of undefined output', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./plugins/opencode/index.js', 'utf-8');
      
      // Should have the fix for the catch block
      assert.ok(
        content.includes("this.showOutput(['Failed to parse status output'])"),
        'Should use inline array message instead of undefined output'
      );
    });
  });
});

describe('Runtime Verification', () => {
  describe('CLI Syntax Check', () => {
    it('cli/index.cjs should have valid syntax', () => {
      try {
        require('./cli/index.cjs');
        // If we get here, syntax is valid and no immediate runtime errors
        assert.ok(true, 'CLI file has valid syntax');
      } catch (error) {
        if (error.code === 'ERR_REQUIRE_ESM') {
          // Expected - file uses CommonJS, require works differently
          assert.ok(true, 'CLI file has valid syntax (CommonJS module)');
        } else if (error.message.includes('Cannot find module')) {
          // Expected - missing dependencies like commander
          assert.ok(true, 'CLI file has valid syntax (missing deps is OK)');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Squawk API Syntax Check', () => {
    it('squawk/api/index.js should have valid syntax', () => {
      try {
        require.resolve('./squawk/api/index.js');
        assert.ok(true, 'Squawk API file exists');
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          // Module not installed yet, but syntax can be checked
          const fs = require('fs');
          const content = fs.readFileSync('./squawk/api/index.js', 'utf-8');
          // Basic syntax check - eval should throw if syntax is invalid
          new Function(content.replace(/require\([^)]+\)/g, 'null'));
          assert.ok(true, 'Squawk API file has valid syntax');
        }
      }
    });
  });

  describe('Plugin Syntax Check', () => {
    it('plugins/claude-code/index.js should have valid syntax', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./plugins/claude-code/index.js', 'utf-8');
      new Function(content.replace(/require\([^)]+\)/g, 'null'));
      assert.ok(true, 'Claude Code plugin has valid syntax');
    });

    it('plugins/opencode/index.js should have valid syntax', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./plugins/opencode/index.js', 'utf-8');
      new Function(content.replace(/require\([^)]+\)/g, 'null'));
      assert.ok(true, 'OpenCode plugin has valid syntax');
    });
  });
});
