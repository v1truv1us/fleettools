#!/usr/bin/env node

/**
 * Plugin Packaging Script
 * 
 * Creates a distributable plugin package
 */

import { readFileSync, writeFileSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createPluginPackage() {
  console.log('📦 Creating FleetTools OpenCode plugin package...');
  
  try {
    // Ensure the build is up to date
    execSync('npm run build', { stdio: 'inherit' });
    
    // Create a zip file
    const output = createWriteStream(join(__dirname, '../fleettools-opencode-plugin.zip'));
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log(`✅ Plugin package created: ${archive.pointer()} bytes`);
    });
    
    archive.on('error', (err) => {
      throw err;
    });
    
    archive.pipe(output);
    
    // Add essential files
    archive.file(join(__dirname, '../dist/plugin.js'), { name: 'plugin.js' });
    archive.file(join(__dirname, '../dist/plugin.d.ts'), { name: 'plugin.d.ts' });
    archive.file(join(__dirname, '../package.json'), { name: 'package.json' });
    archive.file(join(__dirname, '../manifest.json'), { name: 'manifest.json' });
    archive.file(join(__dirname, '../README.md'), { name: 'README.md' });
    
    await archive.finalize();
    
  } catch (error) {
    console.error('❌ Failed to create plugin package:', error);
    process.exit(1);
  }
}

createPluginPackage();