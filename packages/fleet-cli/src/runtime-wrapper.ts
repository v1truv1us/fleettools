#!/usr/bin/env node

/**
 * Runtime-compatible entry point for FleetTools CLI
 * 
 * This wrapper detects the runtime and executes the appropriate
 * optimized version of the CLI, falling back to a universal version.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Detect current runtime
 */
function detectRuntime() {
  if (typeof globalThis.Bun !== 'undefined') {
    return 'bun';
  }
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    return 'node';
  }
  return 'unknown';
}

/**
 * Get the appropriate CLI binary for the current runtime
 */
function getCliPath() {
  const runtime = detectRuntime();
  
  // For Bun, try the optimized version first
  if (runtime === 'bun') {
    const bunPath = join(__dirname, 'index-bun.js');
    try {
      // Check if Bun-optimized version exists
      const fs = require('node:fs');
      if (fs.existsSync(bunPath)) {
        return bunPath;
      }
    } catch {
      // Fall back to universal version
    }
  }
  
  // Default to Node.js-compatible version
  return join(__dirname, 'index.js');
}

/**
 * Execute the CLI with the current process arguments
 */
function executeCli() {
  const cliPath = getCliPath();
  const runtime = detectRuntime();
  
  // For Bun, use Bun directly if available
  if (runtime === 'bun') {
    const bunProcess = spawn('bun', [cliPath, ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: process.env,
      cwd: process.cwd()
    });
    
    bunProcess.on('exit', (code) => {
      process.exit(code || 0);
    });
    
    bunProcess.on('error', (error) => {
      console.error('Failed to execute CLI with Bun:', error.message);
      process.exit(1);
    });
  } else {
    // For Node.js, use Node directly
    const nodeProcess = spawn('node', [cliPath, ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: process.env,
      cwd: process.cwd()
    });
    
    nodeProcess.on('exit', (code) => {
      process.exit(code || 0);
    });
    
    nodeProcess.on('error', (error) => {
      console.error('Failed to execute CLI with Node.js:', error.message);
      process.exit(1);
    });
  }
}

// Execute the CLI
executeCli();