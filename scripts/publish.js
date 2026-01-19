#!/usr/bin/env bun

/**
 * Automated publishing script for FleetTools monorepo
 * Handles version bumping, changelog generation, and workspace publishing
 * Only publishes packages that have unpublished versions
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

// Define all packages to check and publish
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

/**
 * Get the published version of a package from npm registry
 * @param {string} packageName - The npm package name
 * @returns {string|null} The published version or null if not found
 */
function getPublishedVersion(packageName) {
  try {
    const version = execSync(`npm view ${packageName} version`, { 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'pipe'] 
    }).trim();
    return version;
  } catch (error) {
    // Package doesn't exist on npm or other error
    return null;
  }
}

/**
 * Get the local version from package.json
 * @param {string} packagePath - Path to package.json
 * @returns {string} The local version
 */
function getLocalVersion(packagePath) {
  try {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.error(`❌ Failed to read package.json from ${packagePath}: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Check if a package needs to be published
 * @param {Object} pkg - Package info object
 * @returns {boolean} Whether the package needs publishing
 */
function needsPublishing(pkg) {
  const localVersion = getLocalVersion(pkg.path);
  const publishedVersion = getPublishedVersion(pkg.name);
  
  console.log(`📦 ${pkg.name}: local=${localVersion}, published=${publishedVersion || 'not-published'}`);
  
  // If package doesn't exist on npm, it needs publishing
  if (!publishedVersion) {
    return true;
  }
  
  // Compare versions - only publish if local version is newer
  try {
    // Simple string comparison for now (semver would be better but requires more parsing)
    return localVersion !== publishedVersion;
  } catch (error) {
    console.warn(`⚠️  Could not compare versions for ${pkg.name}, assuming needs publishing`);
    return true;
  }
}

/**
 * Publish a specific package if needed
 * @param {Object} pkg - Package info object
 * @returns {boolean} Whether the package was published
 */
function publishPackage(pkg) {
  if (!needsPublishing(pkg)) {
    console.log(`⏭️  Skipping ${pkg.name} (up to date)`);
    return false;
  }
  
  console.log(`📤 Publishing ${pkg.name}...`);
  
  try {
    // Extract directory from package.json path
    const packageDir = pkg.path.replace('/package.json', '');
    
    // Run npm publish from the package directory
    execSync(`cd ${packageDir} && npm publish --access public --ignore-scripts`, { 
      stdio: 'inherit' 
    });
    
    console.log(`✅ Successfully published ${pkg.name}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to publish ${pkg.name}: ${error.message}`);
    
    // Check if it's a version conflict error
    if (error.message.includes('403') || error.message.includes('forbidden')) {
      console.error(`   This might be a version conflict. Check if ${pkg.name} v${getLocalVersion(pkg.path)} already exists on npm.`);
    }
    
    // Don't exit immediately, try other packages
    return false;
  }
}

try {
  // Step 1: Check if there are any changes to publish
  console.log('\n🔍 Checking for unpublished changes...');
  
  const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
  const commitRange = lastTag ? `${lastTag}..HEAD` : 'HEAD~10..HEAD'; // Fall back to last 10 commits if no tag
  const changedFiles = execSync(
    `git diff --name-only ${commitRange} 2>/dev/null || echo ""`,
    { encoding: 'utf8' }
  ).trim();

  if (!changedFiles) {
    console.log('ℹ️  No changes detected since last publish');
    
    // Still check if any packages need publishing (maybe manual version bump)
    console.log('\n🔍 Checking package versions against npm registry...');
    const packagesNeedingPublish = packages.filter(needsPublishing);
    
    if (packagesNeedingPublish.length === 0) {
      console.log('✅ All packages are up to date on npm');
      process.exit(0);
    }
    
    console.log(`📋 Found ${packagesNeedingPublish.length} package(s) needing publication`);
  } else {
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
  }

  // Step 2: Build all packages
  console.log('\n🔨 Building all workspaces...');
  execSync('bun run build:workspaces', { stdio: 'inherit' });

  // Step 3: Detect and apply version bump
  console.log('\n🔍 Detecting version bump type...');
  try {
    execSync('bun run version:bump', { stdio: 'inherit' });
  } catch (error) {
    console.log('ℹ️  No version bump needed');
  }

  // Step 4: Generate changelog
  console.log('\n📝 Generating changelog...');
  execSync('bun run changelog', { stdio: 'inherit' });

  // Step 5: Check which packages need publishing
  console.log('\n🔍 Checking package versions against npm registry...');
  const packagesNeedingPublish = packages.filter(needsPublishing);
  
  if (packagesNeedingPublish.length === 0) {
    console.log('✅ All packages are up to date on npm');
    process.exit(0);
  }
  
  console.log(`\n📋 Publishing ${packagesNeedingPublish.length} package(s):`);
  packagesNeedingPublish.forEach(pkg => {
    const localVersion = getLocalVersion(pkg.path);
    console.log(`  • ${pkg.name} v${localVersion}`);
  });

  // Step 6: Publish packages in dependency order
  console.log('\n📤 Publishing packages...');

  // Define publishing tiers to respect dependencies
  const publishTiers = [
    ['@fleettools/core'], // Tier 1: Core
    ['@fleettools/shared', '@fleettools/db', '@fleettools/events'], // Tier 2: Shared packages
    ['@fleettools/squawk', '@fleettools/server-api'], // Tier 3: Services
    ['@fleettools/cli'], // Tier 4: CLI
    ['@fleettools/claude-code-plugin', '@fleettools/opencode-plugin'] // Tier 5: Plugins
  ];

  let publishedCount = 0;
  let failedPackages = [];

  for (const tier of publishTiers) {
    console.log(`\n  📦 Publishing tier: ${tier.join(', ')}...`);
    
    for (const packageName of tier) {
      const pkg = packages.find(p => p.name === packageName);
      if (!pkg || !packagesNeedingPublish.includes(pkg)) continue;
      
      const wasPublished = publishPackage(pkg);
      if (wasPublished) {
        publishedCount++;
      } else {
        failedPackages.push(pkg.name);
      }
    }
  }

  // Step 8: Update internal dependencies after successful publishing
  if (publishedCount > 0) {
    console.log('\n📋 Updating internal dependencies after publishing...');
    try {
      execSync('bun run update:dependencies', { stdio: 'inherit' });
    } catch (error) {
      console.log('⚠️  Could not update dependencies (may need manual intervention)');
    }
  }

  // Step 9: Push changes and tags if anything was published
  if (publishedCount > 0) {
    console.log('\n🔄 Pushing changes and tags...');
    try {
      const newRootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
      const newVersion = newRootPackage.version;
      
      execSync('git add .', { stdio: 'inherit' });
      execSync(`git commit -m "chore(release): publish v${newVersion}"`, { stdio: 'inherit' });
      execSync('git push origin main', { stdio: 'inherit' });
      execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
      execSync('git push origin --tags', { stdio: 'inherit' });
      
      console.log(`\n🎉 Successfully published ${publishedCount} package(s) for FleetTools v${newVersion}!`);
    } catch (error) {
      console.log('⚠️  Could not push changes (may need manual intervention)');
    }
  } else {
    console.log('\n📋 No packages were published');
  }

  // Step 9: Report failures
  if (failedPackages.length > 0) {
    console.log('\n❌ Failed to publish the following packages:');
    failedPackages.forEach(name => console.log(`  • ${name}`));
    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Check if you\'re logged in to npm: npm whoami');
    console.log('  2. Ensure you have publish permissions: npm access ls @fleettools');
    console.log('  3. Verify all tests pass: bun test');
    console.log('  4. Check build artifacts: bun run build');
    process.exit(1);
  }

} catch (error) {
  console.error('\n❌ Publishing failed:', error.message);
  console.error('\n🔧 Troubleshooting:');
  console.error('  1. Check if you\'re logged in to npm: npm whoami');
  console.error('  2. Ensure you have publish permissions: npm access ls @fleettools');
  console.error('  3. Verify all tests pass: bun test');
  console.error('  4. Check build artifacts: bun run build');
  process.exit(1);
}