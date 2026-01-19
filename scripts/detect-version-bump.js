#!/usr/bin/env bun

/**
 * Detect version bump type based on conventional commits
 * Automatically bumps package versions based on commit history since last tag
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

// Get the current version from root package.json
const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
const currentVersion = rootPackage.version;

console.log(`🔍 Current version: ${currentVersion}`);

try {
  // Get commits since last tag
  const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
  const commitRange = lastTag ? `${lastTag}..HEAD` : '';
  
  // Get commits that would trigger a version bump
  const commits = execSync(
    `git log ${commitRange} --oneline --no-merges -E "(feat|fix|perf|BREAKING CHANGE):" 2>/dev/null || echo ""`,
    { encoding: 'utf8' }
  ).trim();

  if (!commits) {
    console.log('ℹ️  No version-changing commits found');
    process.exit(0);
  }

  console.log('📝 Version-changing commits found:');
  console.log(commits);

  // Determine bump type
  let bumpType = 'patch';
  
  // Check for breaking changes or features
  if (commits.includes('BREAKING CHANGE') || commits.includes('feat!:')) {
    bumpType = 'major';
  } else if (commits.includes('feat') || commits.includes('feature')) {
    bumpType = 'minor';
  } else if (commits.includes('perf')) {
    bumpType = 'patch'; // performance improvements are patch level
  }

  console.log(`📦 Recommended bump: ${bumpType}`);

  // Execute the version bump
  console.log(`🚀 Bumping version with: npm version ${bumpType} --workspaces --include-workspace-root`);
  execSync(`npm version ${bumpType} --workspaces --include-workspace-root`, { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  // Get new version
  const newRootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
  const newVersion = newRootPackage.version;
  
  console.log(`✅ Version bumped to: ${newVersion}`);
  
} catch (error) {
  console.error('❌ Error detecting version bump:', error.message);
  process.exit(1);
}