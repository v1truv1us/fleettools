#!/usr/bin/env bun

/**
 * Publish all changed packages to npmjs.com
 * Usage: bun run publish:all [base-commit] [version]
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

interface PackageInfo {
  name: string;
  path: string;
  private?: boolean;
}

function getChangedPackages(baseCommit?: string): string[] {
  try {
    const cmd = baseCommit 
      ? `bun run detect-changes ${baseCommit}`
      : `bun run detect-changes`;
    
    const output = execSync(cmd, { encoding: 'utf8' });
    const packages = JSON.parse(output);
    return Array.isArray(packages) ? packages : [];
  } catch (error) {
    console.error(`Failed to detect changes: ${error}`);
    return [];
  }
}

function publishPackage(packagePath: string, version?: string): boolean {
  try {
    const cmd = version 
      ? `bun run publish:package ${packagePath} ${version}`
      : `bun run publish:package ${packagePath}`;
    
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Failed to publish ${packagePath}: ${error}`);
    return false;
  }
}

function commitVersionChanges(changedPackages: string[]): void {
  try {
    // Add all package.json files that were changed
    const packageFiles = changedPackages
      .map(pkg => `${pkg}/package.json`)
      .join(' ');
    
    execSync(`git add ${packageFiles}`, { stdio: 'inherit' });
    
    // Create commit message
    const timestamp = new Date().toISOString().split('T')[0];
    execSync(`git commit -m "chore: publish packages (${timestamp})"`, { 
      stdio: 'inherit' 
    });
    
    console.log('✅ Committed version changes');
  } catch (error) {
    console.error(`Failed to commit changes: ${error}`);
  }
}

// Main execution
const baseCommit = process.argv[2];
const version = process.argv[3];

console.log('🚀 Starting FleetTools package publishing to npmjs.com...');

// Check npm authentication
try {
  if (!process.env.NPM_TOKEN) {
    console.error('❌ NPM_TOKEN environment variable not set');
    process.exit(1);
  }
  execSync('npm whoami', { 
    env: { ...process.env, NPM_TOKEN: process.env.NPM_TOKEN },
    stdio: 'pipe' 
  });
} catch {
  console.error('❌ Not authenticated with npm. Set NPM_TOKEN environment variable');
  process.exit(1);
}

const changedPackages = getChangedPackages(baseCommit);

if (changedPackages.length === 0) {
  console.log('✅ No packages need publishing');
  process.exit(0);
}

console.log(`📦 Found ${changedPackages.length} changed packages:`);
changedPackages.forEach(pkg => console.log(`  - ${pkg}`));

console.log('\n🔄 Building and publishing packages to npmjs.com...');

const results: { package: string; success: boolean }[] = [];

for (const packagePath of changedPackages) {
  console.log(`\n📤 Publishing ${packagePath}...`);
  const success = publishPackage(packagePath, version);
  results.push({ package: packagePath, success });
}

// Summary
console.log('\n📊 Publishing Summary:');
const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

successful.forEach(r => console.log(`  ✅ ${r.package}`));
failed.forEach(r => console.log(`  ❌ ${r.package}`));

if (successful.length > 0) {
  console.log('\n📝 Committing version changes...');
  commitVersionChanges(successful.map(r => r.package));
}

console.log(`\n🎉 Publishing complete: ${successful.length} success, ${failed.length} failed`);

if (failed.length > 0) {
  console.log('\n❌ Some packages failed to publish. Check the logs above for details.');
  process.exit(1);
}