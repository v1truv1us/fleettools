#!/usr/bin/env bun

/**
 * Detects changed packages in the monorepo
 * Usage: bun run detect-changes [base-commit]
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface PackageInfo {
  name: string;
  path: string;
  private?: boolean;
  version?: string;
}

// Get workspaces from root package.json
const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
const workspaces: string[] = rootPackage.workspaces || [];

function expandWorkspaces(patterns: string[]): string[] {
  const result: string[] = [];
  
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      // Simple glob expansion for our known patterns
      if (pattern === 'plugins/*') {
        result.push('plugins/claude-code', 'plugins/opencode');
      } else if (pattern === 'packages/*') {
        result.push('packages/fleet-shared', 'packages/fleet-cli', 'packages/core', 'packages/db', 'packages/events');
      }
    } else {
      result.push(pattern);
    }
  }
  
  return result;
}

function getPackageInfo(path: string): PackageInfo | null {
  const packageJsonPath = join(path, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    return null;
  }
  
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return {
      name: packageJson.name,
      path,
      private: packageJson.private,
      version: packageJson.version
    };
  } catch {
    return null;
  }
}

function getChangedFiles(baseCommit: string): string[] {
  try {
    const output = execSync(`git diff --name-only ${baseCommit} HEAD`, { encoding: 'utf8' });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    console.error(`Failed to get diff from commit ${baseCommit}`);
    return [];
  }
}

function detectChangedPackages(baseCommit?: string): string[] {
  if (!baseCommit) {
    // Default to comparing with last commit
    try {
      baseCommit = execSync('git rev-parse HEAD~1', { encoding: 'utf8' }).trim();
    } catch {
      console.error('Could not determine base commit');
      return [];
    }
  }

  const changedFiles = getChangedFiles(baseCommit);
  const workspacePaths = expandWorkspaces(workspaces);
  const allPackages = workspacePaths
    .map(getPackageInfo)
    .filter((pkg): pkg is PackageInfo => pkg !== null);

  const changedPackages = new Set<string>();

  for (const file of changedFiles) {
    // Find which workspace this file belongs to
    for (const pkg of allPackages) {
      if (file.startsWith(pkg.path + '/') || file === pkg.path + '/package.json') {
        changedPackages.add(pkg.path);
        break;
      }
    }
  }

  // Also check for dependency changes
  const publishablePackages = Array.from(changedPackages).filter(path => {
    const pkg = getPackageInfo(path);
    return pkg && !pkg.private;
  });

  return publishablePackages;
}

// Main execution
const baseCommit = process.argv[2];
const changedPackages = detectChangedPackages(baseCommit);

console.log(JSON.stringify(changedPackages));

if (changedPackages.length > 0) {
  console.error(`Detected changes in packages: ${changedPackages.join(', ')}`);
} else {
  console.error('No publishable packages changed');
}