#!/usr/bin/env bun

/**
 * Publish a single package to npmjs.com
 * Usage: bun run publish:package <package-path> [version]
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface PackageInfo {
  name: string;
  version: string;
  private?: boolean;
  publishConfig?: {
    access?: 'public' | 'restricted';
  };
}

function getPackageInfo(packagePath: string): PackageInfo | null {
  const packageJsonPath = join(packagePath, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    console.error(`package.json not found in ${packagePath}`);
    return null;
  }
  
  try {
    return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  } catch (error) {
    console.error(`Failed to read package.json: ${error}`);
    return null;
  }
}

function buildPackage(packagePath: string): boolean {
  try {
    console.log(`Building package in ${packagePath}...`);
    execSync('bun run build', { cwd: packagePath, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Build failed for ${packagePath}: ${error}`);
    return false;
  }
}

function authenticateWithNPM(): boolean {
  try {
    // Check if npm token is available
    if (!process.env.NPM_TOKEN) {
      console.error('NPM_TOKEN environment variable not set');
      return false;
    }
    
    // Test authentication
    execSync('npm whoami', { 
      env: { ...process.env, NPM_TOKEN: process.env.NPM_TOKEN },
      stdio: 'pipe' 
    });
    return true;
  } catch {
    console.error('Not authenticated with npm. Set NPM_TOKEN environment variable');
    return false;
  }
}

function publishPackage(packagePath: string, version?: string): boolean {
  const packageInfo = getPackageInfo(packagePath);
  
  if (!packageInfo) {
    return false;
  }
  
  if (packageInfo.private) {
    console.log(`Skipping private package ${packageInfo.name}`);
    return true;
  }
  
  console.log(`Publishing ${packageInfo.name} from ${packagePath}`);
  
  // Build package
  if (!buildPackage(packagePath)) {
    return false;
  }
  
  // Update version if provided
  if (version) {
    try {
      execSync(`npm version ${version} --no-git-tag-version`, { 
        cwd: packagePath, 
        stdio: 'inherit' 
      });
      console.log(`Updated version to ${version}`);
    } catch (error) {
      console.error(`Failed to update version: ${error}`);
      return false;
    }
  }
  
  // Get updated package info
  const updatedPackageInfo = getPackageInfo(packagePath);
  
  // Publish to npm
  try {
    const publishCmd = updatedPackageInfo?.publishConfig?.access === 'public' 
      ? 'npm publish --access public'
      : 'npm publish';
    
    console.log(`Publishing to npmjs.com...`);
    execSync(publishCmd, { 
      cwd: packagePath, 
      stdio: 'inherit',
      env: { ...process.env, NPM_TOKEN: process.env.NPM_TOKEN }
    });
    
    console.log(`✅ Successfully published ${updatedPackageInfo?.name}@${updatedPackageInfo?.version}`);
    return true;
  } catch (error) {
    console.error(`Failed to publish: ${error}`);
    return false;
  }
}

// Main execution
const packagePath = process.argv[2];
const version = process.argv[3];

if (!packagePath) {
  console.error('Usage: bun run publish:package <package-path> [version]');
  process.exit(1);
}

if (!existsSync(packagePath)) {
  console.error(`Package path ${packagePath} does not exist`);
  process.exit(1);
}

if (!authenticateWithNPM()) {
  process.exit(1);
}

const success = publishPackage(packagePath, version);
process.exit(success ? 0 : 1);