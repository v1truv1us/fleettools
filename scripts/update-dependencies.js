#!/usr/bin/env bun

/**
 * Update internal dependencies across all FleetTools packages
 * This script updates @fleettools/* package dependencies to use the latest versions
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Define all package.json files to update
const packagePaths = [
  'packages/shared/package.json',
  'packages/db/package.json',
  'packages/events/package.json',
  'packages/cli/package.json',
  'packages/core/package.json',
  'squawk/package.json',
  'server/api/package.json',
  'plugins/claude-code/package.json',
  'plugins/opencode/package.json'
];

const packageVersions = new Map();

packagePaths.forEach(packagePath => {
  const fullPath = join(process.cwd(), packagePath);
  const packageJson = JSON.parse(readFileSync(fullPath, 'utf8'));
  packageVersions.set(packageJson.name, packageJson.version);
});

console.log('🔄 Updating internal dependencies to the current package versions...');

let updatedCount = 0;

packagePaths.forEach(packagePath => {
  try {
    const fullPath = join(process.cwd(), packagePath);
    const packageJson = JSON.parse(readFileSync(fullPath, 'utf8'));
    
    let hasChanges = false;
    
    // Update dependencies
    if (packageJson.dependencies) {
      Object.keys(packageJson.dependencies).forEach(dep => {
        if (dep.startsWith('@fleettools/') && dep !== '@fleettools/monorepo' && packageVersions.has(dep)) {
          packageJson.dependencies[dep] = `^${packageVersions.get(dep)}`;
          hasChanges = true;
          console.log(`  ✅ Updated ${packagePath}: dependencies.${dep} -> ^${packageVersions.get(dep)}`);
        }
      });
    }
    
    // Update devDependencies
    if (packageJson.devDependencies) {
      Object.keys(packageJson.devDependencies).forEach(dep => {
        if (dep.startsWith('@fleettools/') && dep !== '@fleettools/monorepo' && packageVersions.has(dep)) {
          packageJson.devDependencies[dep] = `^${packageVersions.get(dep)}`;
          hasChanges = true;
          console.log(`  ✅ Updated ${packagePath}: devDependencies.${dep} -> ^${packageVersions.get(dep)}`);
        }
      });
    }
    
    if (hasChanges) {
      writeFileSync(fullPath, JSON.stringify(packageJson, null, 2) + '\n');
      updatedCount++;
    }
  } catch (error) {
    console.error(`❌ Error updating ${packagePath}:`, error.message);
  }
});

console.log(`\n🎉 Updated dependencies in ${updatedCount} packages`);
console.log('📦 All @fleettools/* dependencies now point to the current package versions');
