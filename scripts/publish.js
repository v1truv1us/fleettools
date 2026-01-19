#!/usr/bin/env bun

/**
 * Automated publishing script for FleetTools monorepo
 * Handles version bumping, changelog generation, and workspace publishing
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** @typedef {Object} PackageInfo
 * @property {string} name
 * @property {string} version
 * @property {string} path
 * @property {boolean} hasChanges
 */

console.log('🚀 FleetTools Automated Publishing\n');

// Get current version from root package.json
const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
const currentVersion = rootPackage.version;

console.log(`📦 Current version: ${currentVersion}`);

try {
  // Step 1: Check if there are any changes to publish
  console.log('\n🔍 Checking for unpublished changes...');
  
  const changedFiles = execSync(
    'git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only origin/main 2>/dev/null || echo ""',
    { encoding: 'utf8' }
  ).trim();

  if (!changedFiles) {
    console.log('ℹ️  No changes detected since last publish');
    process.exit(0);
  }

  const hasSourceChanges = changedFiles.split('\n').some(file => 
    file.includes('packages/') || 
    file.includes('squawk/') || 
    file.includes('server/') || 
    file.includes('plugins/')
  );

  if (!hasSourceChanges) {
    console.log('ℹ️  No package source changes detected');
    process.exit(0);
  }

  console.log('✅ Source changes detected, proceeding with publish');

  // Step 2: Build all packages
  console.log('\n🔨 Building all workspaces...');
  execSync('bun run build:workspaces', { stdio: 'inherit' });

  // Step 3: Update internal dependencies
  console.log('\n📋 Updating internal dependencies...');
  execSync('bun run update:dependencies', { stdio: 'inherit' });

  // Step 4: Detect and apply version bump
  console.log('\n🔍 Detecting version bump type...');
  try {
    execSync('bun run version:bump', { stdio: 'inherit' });
  } catch (error) {
    console.log('ℹ️  No version bump needed');
  }

  // Step 5: Generate changelog
  console.log('\n📝 Generating changelog...');
  execSync('bun run changelog', { stdio: 'inherit' });

  // Step 6: Get new version
  const newRootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
  const newVersion = newRootPackage.version;
  
  if (newVersion === currentVersion) {
    console.log('ℹ️  Version unchanged, skipping publish');
    process.exit(0);
  }

  console.log(`\n🎯 Publishing version: ${newVersion}`);

  // Step 7: Publish packages in dependency order
  console.log('\n📤 Publishing packages...');

  const publishSteps = [
    { name: 'Core packages', command: 'bun run publish:tier1' },
    { name: 'Shared packages', command: 'bun run publish:tier2' },
    { name: 'Service packages', command: 'bun run publish:tier3' },
    { name: 'CLI package', command: 'bun run publish:tier4' },
    { name: 'Plugins', command: 'bun run publish:plugins' }
  ];

  for (const step of publishSteps) {
    console.log(`\n  📦 Publishing ${step.name}...`);
    try {
      execSync(step.command, { stdio: 'inherit' });
      console.log(`  ✅ ${step.name} published successfully`);
    } catch (error) {
      console.error(`  ❌ Failed to publish ${step.name}:`, error.message);
      process.exit(1);
    }
  }

  // Step 8: Push changes and tags
  console.log('\n🔄 Pushing changes and tags...');
  try {
    execSync('git add .', { stdio: 'inherit' });
    execSync(`git commit -m "chore(release): publish v${newVersion}"`, { stdio: 'inherit' });
    execSync('git push origin main', { stdio: 'inherit' });
    execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
    execSync('git push origin --tags', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  Could not push changes (may need manual intervention)');
  }

  console.log(`\n🎉 Successfully published FleetTools v${newVersion}!`);
  console.log('\n📋 Published packages:');
  console.log('  • @fleettools/core');
  console.log('  • @fleettools/shared');
  console.log('  • @fleettools/db');
  console.log('  • @fleettools/events');
  console.log('  • @fleettools/cli');
  console.log('  • @fleettools/squawk');
  console.log('  • @fleettools/server-api');
  console.log('  • @fleettools/claude-code-plugin');
  console.log('  • @fleettools/opencode-plugin');

} catch (error) {
  console.error('\n❌ Publishing failed:', error.message);
  console.error('\n🔧 Troubleshooting:');
  console.error('  1. Check if you\'re logged in to npm: npm whoami');
  console.error('  2. Ensure you have publish permissions: npm access ls @fleettools');
  console.error('  3. Verify all tests pass: bun test');
  console.error('  4. Check build artifacts: bun run build');
  process.exit(1);
}