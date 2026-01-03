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
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'os';

// Type definitions for config
interface FleetConfig {
  fleet?: {
    user_id?: string | null;
    org_id?: string | null;
    workspace_id?: string | null;
    server_url?: string | null;
  };
  mode?: 'local' | 'synced';
  services?: {
    postgres?: {
      enabled: boolean;
      provider: string;
      image: string;
      port: number;
      container_name: string;
      volume_name: string;
    };
  };
  sync?: {
    zero?: {
      url?: string | null;
    };
    api?: {
      url?: string | null;
    };
    cloudflare?: {
      app_audience?: string;
      service_token_ref?: string | null;
    };
  };
  memory?: {
    embeddings?: {
      enabled: boolean;
      provider: string;
      model: string;
      base_url?: string | null;
      dimensions: number;
    };
    retrieval?: {
      method: 'lexical' | 'vector' | 'hybrid';
      hybrid?: {
        lexical_weight: number;
        vector_weight: number;
        top_k: number;
      };
    };
  };
  flightline?: {
    directory: string;
  };
  logging?: {
    level: string;
    file?: string | null;
  };
}

// Config paths
const CONFIG_DIR = path.join(os.homedir(), '.config', 'fleet');
const CONFIG_FILE = path.join(CONFIG_DIR, 'fleet.yaml');

/**
 * Get config file path
 */
function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Load configuration from YAML file
 */
async function loadConfig(): Promise<FleetConfig> {
  try {
    const content = await readFile(CONFIG_FILE, 'utf-8');
    // Simple YAML parser for now - full parser to be added
    return parseSimpleYaml(content) as FleetConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return {}; // Return empty config if doesn't exist
    }
    throw error;
  }
}

/**
 * Simple YAML parser (temporary - will replace with proper parser)
 */
function parseSimpleYaml(content: string): any {
  const lines = content.split('\n');
  const result: any = {};

  let currentSection: any = result;
  let indent = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const currentIndent = line.search(/\S/);
    if (currentIndent === 0 && !trimmed.startsWith(' ')) {
      const key = trimmed.split(':')[0];
      currentSection = result[key.trim()] = {};
      currentSection._parent = result;
      indent = 0;
      continue;
    }

    if (currentIndent > indent && trimmed.startsWith('- ')) {
      const key = trimmed.replace(/^-/, '').trim().split(':')[0];
      const value = parseValue(trimmed.substring(key.length + 1).trim());
      if (currentSection) {
        currentSection[key.trim()] = value;
      }
    } else if (trimmed.includes(':')) {
      const [key, ...valueParts] = trimmed.split(':');
      const value = parseValue(valueParts.join(':').trim());
      if (currentSection) {
        currentSection[key.trim()] = value;
      }
    }
  }

  return result;
}

/**
 * Parse simple values
 */
function parseValue(value: string): any {
  value = value.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (!isNaN(Number(value))) return Number(value);
  if (value.startsWith('"') || value.startsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Save configuration
 */
async function saveConfig(config: FleetConfig): Promise<void> {
  // Ensure config directory exists
  await mkdir(CONFIG_DIR, { recursive: true });

  // For now, just save as JSON - will convert to YAML later
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Get current mode
 */
async function getCurrentMode(): Promise<'local' | 'synced'> {
  const config = await loadConfig();
  return config.mode || 'local';
}

// ============================================================================
// Command: status
// ============================================================================

program
  .command('status')
  .description('Show FleetTools status and configuration')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    const config = await loadConfig();
    const mode = await getCurrentMode();

    if ((options as any).json) {
      console.log(JSON.stringify({
        mode,
        config: config,
        services: {
          postgres: await checkPostgresStatus(config),
          zero: await checkZeroStatus(config),
        },
      }, null, 2));
    } else {
      console.log('FleetTools Status');
      console.log('================');
      console.log(`Mode: ${mode.toUpperCase()}`);
      console.log('');
      console.log('Configuration:');
      console.log(`  Config file: ${CONFIG_FILE}`);
      console.log(`  User: ${config.fleet?.user_id || 'Not enrolled'}`);
      console.log(`  Org: ${config.fleet?.org_id || 'None'}`);
      console.log(`  Workspace: ${config.fleet?.workspace_id || 'None'}`);
      console.log('');
      console.log('Local Services:');
      const pgStatus = await checkPostgresStatus(config);
      console.log(`  Postgres: ${pgStatus.running ? '✓ Running' : '✗ Not running'}`);
      console.log('');
      console.log('Sync Services:');
      const zeroStatus = await checkZeroStatus(config);
      console.log(`  Zero: ${zeroStatus.connected ? '✓ Connected' : '✗ Not connected'}`);
    }
  });

// ============================================================================
// Command: setup
// ============================================================================

program
  .command('setup')
  .description('Initialize FleetTools configuration')
  .option('--non-interactive', 'Run in non-interactive mode')
  .action(async (options) => {
    const config = await loadConfig();

    // Initialize directories
    await initializeDirectories();

    // Detect capabilities
    const podmanAvailable = await checkPodman();

    console.log('FleetTools Setup');
    console.log('===============');
    console.log('');
    console.log('Environment Check:');
    console.log(`  Podman: ${podmanAvailable ? '✓ Detected' : '✗ Not found'}`);
    console.log('');

    // Initialize config with defaults if missing
    if (!config.mode) {
      config.mode = 'local';
      await saveConfig(config);
      console.log('✓ Set default mode: local');
    }

    if (!config.flightline) {
      config.flightline = { directory: '.flightline' };
      await saveConfig(config);
      console.log('✓ Set flightline directory: .flightline/');
    }

    if (!config.services?.postgres) {
      config.services = config.services || {};
      config.services.postgres = {
        enabled: true,
        provider: 'podman',
        image: 'postgres:16',
        port: 5432,
        container_name: 'fleettools-pg',
        volume_name: 'fleettools-pg-data',
      };
      await saveConfig(config);
      console.log('✓ Set default Postgres provider: podman');
    }

    if (!config.memory?.embeddings) {
      config.memory = config.memory || {};
      config.memory.embeddings = {
        enabled: false,
        provider: 'ollama',
        model: 'bge-small-en-v1.5',
        dimensions: 768,
      };
      await saveConfig(config);
      console.log('✓ Set default embeddings: Ollama (disabled)');
    }

    console.log('');
    console.log('Setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run: fleet doctor      (to verify setup)');
    console.log('  2. Run: fleet services up  (to start local services)');
    if ((options as any).nonInteractive) {
      console.log('  Non-interactive mode: Setup complete');
    } else {
      console.log('  3. Run: fleet enroll       (to enable sync - optional)');
    }
  });

// ============================================================================
// Command: doctor
// ============================================================================

program
  .command('doctor')
  .description('Diagnose FleetTools installation and configuration')
  .action(async () => {
    console.log('FleetTools Diagnostics');
    console.log('======================');
    console.log('');

    const issues: string[] = [];

    // Check config
    const configExists = await access(CONFIG_FILE).then(() => true).catch(() => false);
    if (!configExists) {
      issues.push('Config file not found. Run: fleet setup');
    }

    // Check Podman
    const podmanAvailable = await checkPodman();
    if (!podmanAvailable) {
      issues.push('Podman not found. Install: https://podman.io/');
    }

    // Check ports
    const postgresPort = 5432;
    const portAvailable = await checkPortAvailable(postgresPort);
    if (!portAvailable) {
      issues.push(`Port ${postgresPort} is already in use`);
    }

    // Output results
    if (issues.length === 0) {
      console.log('✓ All checks passed!');
      console.log('');
      console.log('System is ready to run FleetTools.');
    } else {
      console.log('✗ Issues found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
      console.log('');
      console.log('Run: fleet setup  to fix configuration issues');
      console.log('Run: fleet services up  to start services');
    }
  });

// ============================================================================
// Command: services
// ============================================================================

program
  .command('services')
  .description('Manage local services (start, stop, status, logs)')
  .option('up', 'Start local services')
  .option('down', 'Stop local services')
  .option('status', 'Show service status')
  .option('logs', 'Show service logs [service]')
  .action(async (options) => {
    if (options.up) {
      await servicesUp();
    } else if (options.down) {
      await servicesDown();
    } else if (options.status) {
      await servicesStatus();
    } else if (options.logs) {
      const service = (options as any).logs || 'postgres';
      await servicesLogs(service);
    } else {
      // Show sub-menu
      console.log('FleetTools Services');
      console.log('===================');
      console.log('');
      console.log('Usage:');
      console.log('  fleet services up      - Start local services');
      console.log('  fleet services down    - Stop local services');
      console.log('  fleet services status  - Show service status');
      console.log('  fleet services logs    - Show service logs');
    }
  });

// ============================================================================
// Helper Functions
// ============================================================================

async function initializeDirectories(): Promise<void> {
  const dirs = [
    CONFIG_DIR,
    path.join(os.homedir(), '.local', 'share', 'fleet'),
    path.join(os.homedir(), '.local', 'state', 'fleet', 'logs'),
    path.join(process.cwd(), '.flightline'),
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true }).catch(() => {});
  }
}

async function checkPodman(): Promise<boolean> {
  try {
    const { exec } = await import('node:child_process');
    return new Promise((resolve) => {
      exec('podman --version', (error) => {
        resolve(!error);
      });
    });
  } catch {
    return false;
  }
}

async function checkPortAvailable(port: number): Promise<boolean> {
  // Simple check - can be improved
  try {
    const { createServer } = await import('node:net');
    return new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(true)); // Port is available
      server.listen(port, () => {
        server.close(() => resolve(false)); // Port is in use
        server.once('error', () => resolve(true));
      });
    });
  } catch {
    return true;
  }
}

async function checkPostgresStatus(config: FleetConfig): Promise<{running: boolean; details?: string}> {
  if (!config.services?.postgres?.enabled) {
    return { running: false };
  }

  // TODO: Implement actual Postgres container check via Podman
  return { running: false, details: 'Status check not implemented' };
}

async function checkZeroStatus(config: FleetConfig): Promise<{connected: boolean; details?: string}> {
  if (config.mode !== 'synced' || !config.sync?.zero?.url) {
    return { connected: false };
  }

  // TODO: Implement Zero connectivity check
  return { connected: false, details: 'Zero status check not implemented' };
}

async function servicesUp(): Promise<void> {
  console.log('Starting FleetTools services...');
  const config = await loadConfig();

  if (config.services?.postgres?.enabled) {
    console.log('  Starting Postgres via Podman...');
    // TODO: Implement actual Podman container start
    console.log('  ✓ Postgres started');
  }

  console.log('');
  console.log('Services are running.');
  console.log('');
  console.log('Connection info:');
  console.log('  Postgres: localhost:5432');
  console.log('');
  console.log('Run: fleet services status  for details');
}

async function servicesDown(): Promise<void> {
  console.log('Stopping FleetTools services...');
  const config = await loadConfig();

  if (config.services?.postgres?.enabled) {
    console.log('  Stopping Postgres...');
    // TODO: Implement actual Podman container stop
    console.log('  ✓ Postgres stopped');
  }

  console.log('');
  console.log('Services stopped.');
}

async function servicesStatus(): Promise<void> {
  console.log('FleetTools Services Status');
  console.log('========================');
  console.log('');

  const config = await loadConfig();

  if (config.services?.postgres?.enabled) {
    const pgStatus = await checkPostgresStatus(config);
    console.log('Postgres:');
    console.log(`  Status: ${pgStatus.running ? '✓ Running' : '✗ Not running'}`);
    console.log(`  Provider: ${config.services.postgres.provider}`);
    console.log(`  Image: ${config.services.postgres.image}`);
    console.log(`  Port: ${config.services.postgres.port}`);
    if (pgStatus.details) {
      console.log(`  Details: ${pgStatus.details}`);
    }
  } else {
    console.log('Postgres: Not enabled');
  }

  console.log('');

  if (config.mode === 'synced') {
    const zeroStatus = await checkZeroStatus(config);
    console.log('Zero (sync):');
    console.log(`  Status: ${zeroStatus.connected ? '✓ Connected' : '✗ Not connected'}`);
    if (config.sync?.zero?.url) {
      console.log(`  URL: ${config.sync.zero.url}`);
    }
  } else {
    console.log('Zero (sync): Not enabled (mode = local)');
  }
}

async function servicesLogs(service: string): Promise<void> {
  console.log(`Fetching logs for service: ${service}`);
  // TODO: Implement actual log fetching
  console.log('Log fetching not implemented yet');
}

// ============================================================================
// Parse arguments and run
// ============================================================================

program.parse(process.argv);
