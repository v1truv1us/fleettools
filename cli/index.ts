#!/usr/bin/env node
/**
 * FleetTools CLI
 *
 * Main entry point for FleetTools operations
 *
 * Run: fleet <command> [options]
 */

import { program } from 'commander';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { createPodmanPostgresProvider } from '../providers/dist/podman-postgres.js';

// Import checkpoint commands using dynamic imports
try {
  const { createCheckpointCommand } = require('./dist/src/commands/checkpoint.js');
  const { createResumeCommand } = require('./dist/src/commands/resume.js');
  const { createCheckpointsCommand } = require('./dist/src/commands/checkpoints.js');

  // Register checkpoint commands
  program.addCommand(createCheckpointCommand());
  program.addCommand(createResumeCommand());
  program.addCommand(createCheckpointsCommand());
} catch (error) {
  console.error('Failed to load checkpoint commands:', error);
}

// Parse arguments and run
// ============================================================================

program.parse(process.argv);
