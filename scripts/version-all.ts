#!/usr/bin/env bun

/**
 * Version all changed packages
 * Usage: bun run version:all [base-commit] <version>
 */

import { execSync } from 'node:child_process';

interface PackageInfo {
  name: string;
  path: string;
  private?: boolean;
  currentVersion?: string;
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

function getPackageInfo(packagePath: string): PackageInfo | null {
  try {
    const output = execSync(`node -p "require('./${packagePath}/package.json')"`, { 
      encoding: 'utf8' 
    });
    const packageInfo = JSON.parse(output);
    
    return {
      name: packageInfo.name,
      path: packagePath,
      private: packageInfo.private,
      currentVersion: packageInfo.version
    };
  } catch (error) {
    console.error(`Failed to get package info for ${packagePath}: ${error}`);
    return null;
  }
}

function updatePackageVersion(packagePath: string, version: string): boolean {
  try {
    const cmd = `bun run version:package ${packagePath} ${version}`;
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Failed to update ${packagePath}: ${error}`);
    return false;
  }
}

function commitVersionChanges(packages: string[]): void {
  try {
    // Add all package.json files that were changed
    const packageFiles = packages
      .map(pkg => `${pkg}/package.json`)
      .join(' ');
    
    execSync(`git add ${packageFiles}`, { stdio: 'inherit' });
    
    // Create commit message
    const packageList = packages.map(pkg => {
      const info = getPackageInfo(pkg);
      return info ? `${info.name}@${info.currentVersion}` : pkg;
    }).join(', ');
    
    execSync(`git commit -m "chore: version bump - ${packageList}"`, { 
      stdio: 'inherit' 
    });
    
    console.log('✅ Committed version changes');
  } catch (error) {
    console.error(`Failed to commit changes: ${error}`);
  }
}

// Auto-detect version bump based on commit messages
function detectVersionBump(baseCommit?: string): string {
  try {
    if (!baseCommit) {
      baseCommit = execSync('git rev-parse HEAD~1', { encoding: 'utf8' }).trim();
    }
    
    const commitMessages = execSync(
      `git log --oneline ${baseCommit}..HEAD`, 
      { encoding: 'utf8' }
    ).split('\n');
    
    // Check for major/minor version indicators
    const hasBreaking = commitMessages.some(msg => 
      msg.toLowerCase().includes('break') || 
      msg.toLowerCase().includes('major') ||
      msg.includes('!') // Conventional commits breaking change
    );
    
    const hasFeature = commitMessages.some(msg => 
      msg.toLowerCase().includes('feat') || 
      msg.toLowerCase().includes('feature') ||
      msg.toLowerCase().includes('minor')
    );
    
    if (hasBreaking) return 'major';
    if (hasFeature) return 'minor';
    return 'patch';
  } catch (error) {
    console.error(`Failed to detect version bump: ${error}`);
    return 'patch';
  }
}

// Main execution
const baseCommit = process.argv[2];
let version = process.argv[3];

console.log('🏷️  FleetTools Version Management...');

const changedPackages = getChangedPackages(baseCommit);

if (changedPackages.length === 0) {
  console.log('✅ No packages need versioning');
  process.exit(0);
}

console.log(`📦 Found ${changedPackages.length} changed packages:`);
changedPackages.forEach(pkg => {
  const info = getPackageInfo(pkg);
  if (info) {
    console.log(`  - ${info.name} (${info.currentVersion})`);
  }
});

// Auto-detect version if not provided
if (!version) {
  version = detectVersionBump(baseCommit);
  console.log(`🤖 Auto-detected version bump: ${version}`);
} else {
  console.log(`📝 Using version bump: ${version}`);
}

console.log('\n🔄 Updating package versions...');

const results: { package: string; success: boolean; info?: PackageInfo }[] = [];

for (const packagePath of changedPackages) {
  const info = getPackageInfo(packagePath);
  if (!info) continue;
  
  console.log(`\n📤 Updating ${info.name}...`);
  const success = updatePackageVersion(packagePath, version);
  results.push({ package: packagePath, success, info });
}

// Summary
console.log('\n📊 Version Update Summary:');
const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

successful.forEach(r => {
  const newInfo = getPackageInfo(r.package);
  console.log(`  ✅ ${r.info?.name}: ${r.info?.currentVersion} → ${newInfo?.currentVersion}`);
});
failed.forEach(r => console.log(`  ❌ ${r.info?.name}`));

if (successful.length > 0) {
  console.log('\n📝 Committing version changes...');
  commitVersionChanges(successful.map(r => r.package));
  
  // Optionally create git tag
  const tag = `v${successful.length}-packages-${Date.now()}`;
  console.log(`\n🏷️  Consider creating tag: ${tag}`);
}

console.log(`\n🎉 Version update complete: ${successful.length} success, ${failed.length} failed`);

if (failed.length > 0) {
  console.log('\n❌ Some packages failed to update. Check logs above for details.');
  process.exit(1);
}