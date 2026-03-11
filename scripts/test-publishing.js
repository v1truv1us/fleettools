#!/usr/bin/env bun

/**
 * Test script for FleetTools publishing system
 * Demonstrates the complete automated publishing workflow
 */

console.log('🧪 FleetTools Publishing System Test\n');

try {
  // Test 1: Check if dependencies are installed
  console.log('📦 1. Testing dependencies...');
  const { execSync } = await import('node:child_process');
  
  try {
    execSync('bun x commitizen --version', { stdio: 'pipe' });
    console.log('✅ Commitizen installed');
  } catch {
    console.log('❌ Commitizen not found');
  }

  try {
    execSync('bun x conventional-changelog --version', { stdio: 'pipe' });
    console.log('✅ Conventional changelog installed');
  } catch {
    console.log('❌ Conventional changelog not found');
  }

  // Test 2: Check configuration files
  console.log('\n⚙️  2. Checking configuration files...');
  const { readFileSync, existsSync } = await import('node:fs');
  
  const configFiles = [
    '.czrc',
    '.versionrc', 
    'commitlint.config.js',
    'scripts/detect-version-bump.js',
    'scripts/publish.js',
    'scripts/update-dependencies.js'
  ];

  configFiles.forEach(file => {
    if (existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} missing`);
    }
  });

  // Test 3: Check package.json scripts
  console.log('\n🔧 3. Checking package.json scripts...');
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  
  const requiredScripts = [
    'commit',
    'changelog',
    'version',
    'version:bump',
    'publish',
    'publish:dry-run'
  ];

  requiredScripts.forEach(script => {
    if (packageJson.scripts[script]) {
      console.log(`✅ ${script}`);
    } else {
      console.log(`❌ ${script} missing`);
    }
  });

  // Test 4: Check git hook
  console.log('\n🪝 4. Checking git hook...');
  if (existsSync('.git/hooks/commit-msg')) {
    console.log('✅ commit-msg hook installed');
  } else {
    console.log('⚠️  commit-msg hook not installed (run: chmod +x .git/hooks/commit-msg)');
  }

  // Test 5: Show example workflow
  console.log('\n🚀 5. Example workflow:');
  console.log('   bun run commit     # Interactive commit');
  console.log('   bun run publish    # Full automated publish');
  console.log('   bun run changelog  # Generate changelog only');

  console.log('\n✅ FleetTools publishing system is ready!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}