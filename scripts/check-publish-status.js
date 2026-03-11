#!/usr/bin/env bun

/**
 * Check publish status for all FleetTools packages
 * Shows local vs published versions without actually publishing
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

console.log('📊 FleetTools Package Status Check\n');

const packages = [
  { name: '@fleettools/core', path: 'packages/core/package.json' },
  { name: '@fleettools/shared', path: 'packages/shared/package.json' },
  { name: '@fleettools/db', path: 'packages/db/package.json' },
  { name: '@fleettools/events', path: 'packages/events/package.json' },
  { name: '@fleettools/cli', path: 'packages/cli/package.json' },
  { name: '@fleettools/squawk', path: 'squawk/package.json' },
  { name: '@fleettools/server', path: 'server/api/package.json' },
  { name: '@fleettools/claude-code-plugin', path: 'plugins/claude-code/package.json' },
  { name: '@fleettools/opencode-plugin', path: 'plugins/opencode/package.json' }
];

function getPublishedVersion(packageName) {
  try {
    const version = execSync(`npm view ${packageName} version`, { 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'pipe'] 
    }).trim();
    return version;
  } catch (error) {
    return null;
  }
}

function getLocalVersion(packagePath) {
  try {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    return null;
  }
}

console.log('Package Status:');
console.log('┌─────────────────────────────────┬──────────────┬──────────────┬──────────────┐');
console.log('│ Package Name                   │ Local        │ Published    │ Status       │');
console.log('├─────────────────────────────────┼──────────────┼──────────────┼──────────────┤');

let needsPublishCount = 0;

for (const pkg of packages) {
  const localVersion = getLocalVersion(pkg.path);
  const publishedVersion = getPublishedVersion(pkg.name);
  
  let status = '✓ Up to date';
  if (!localVersion) {
    status = '❌ Not found';
  } else if (!publishedVersion) {
    status = '📤 Needs publish';
    needsPublishCount++;
  } else if (localVersion !== publishedVersion) {
    status = '📤 Needs publish';
    needsPublishCount++;
  }
  
  const local = localVersion || 'N/A';
  const published = publishedVersion || 'Not published';
  
  console.log(`│ ${pkg.name.padEnd(31)} │ ${local.padEnd(12)} │ ${published.padEnd(12)} │ ${status.padEnd(12)} │`);
}

console.log('└─────────────────────────────────┴──────────────┴──────────────┴──────────────┘');
console.log(`\n📊 Summary: ${needsPublishCount} package(s) need publishing`);

if (needsPublishCount > 0) {
  console.log('\n📋 Packages that need publishing:');
  for (const pkg of packages) {
    const localVersion = getLocalVersion(pkg.path);
    const publishedVersion = getPublishedVersion(pkg.name);
    
    if (localVersion && (!publishedVersion || localVersion !== publishedVersion)) {
      console.log(`  • ${pkg.name}: ${localVersion} (published: ${publishedVersion || 'none'})`);
    }
  }
  
  console.log('\n💡 Run "bun run publish" to publish these packages');
} else {
  console.log('\n✅ All packages are up to date!');
}