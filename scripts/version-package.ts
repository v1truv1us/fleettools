#!/usr/bin/env bun

/**
 * Version a single package
 * Usage: bun run version:package <package-path> <version>
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface PackageInfo {
  name: string;
  version: string;
  private?: boolean;
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

function updateVersion(packagePath: string, version: string): boolean {
  const packageInfo = getPackageInfo(packagePath);
  
  if (!packageInfo) {
    return false;
  }
  
  console.log(`Updating ${packageInfo.name} from ${packageInfo.version} to ${version}`);
  
  try {
    execSync(`npm version ${version} --no-git-tag-version`, { 
      cwd: packagePath, 
      stdio: 'inherit' 
    });
    
    // Get updated version
    const updatedInfo = getPackageInfo(packagePath);
    console.log(`✅ Updated ${packageInfo.name} to ${updatedInfo?.version}`);
    
    return true;
  } catch (error) {
    console.error(`Failed to update version: ${error}`);
    return false;
  }
}

// Main execution
const packagePath = process.argv[2];
const version = process.argv[3];

if (!packagePath || !version) {
  console.error('Usage: bun run version:package <package-path> <version>');
  process.exit(1);
}

if (!existsSync(packagePath)) {
  console.error(`Package path ${packagePath} does not exist`);
  process.exit(1);
}

const success = updateVersion(packagePath, version);
process.exit(success ? 0 : 1);