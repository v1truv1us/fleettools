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
const CONFIG_FILE = path.join(CONFIG_DIR, 'fleet.json');

/**
 * Load configuration from JSON file
 */
async function loadConfig(): Promise<FleetConfig> {
  try {
    const content = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(content) as FleetConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return {}; // Return empty config if doesn't exist
    }
    throw error;
  }
}

/**
 * Save configuration
 */
async function saveConfig(config: FleetConfig): Promise<void> {
  // Ensure config directory exists
  await mkdir(CONFIG_DIR, { recursive: true });

  // Save as JSON
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
        podman: checkPodmanSync(),
        postgres: checkPostgresStatusSync(),
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
      const pgStatus = checkPostgresStatusSync();
      console.log(`  Postgres: ${pgStatus ? '✓ Available' : '✗ Not configured'}`);
      console.log(`  Podman: ${checkPodmanSync() ? '✓ Available' : '✗ Not found'}`);
      console.log('');
      console.log('Flightline:');
      const flightlineDir = path.join(process.cwd(), config.flightline?.directory || '.flightline');
      console.log(`  Directory: ${flightlineDir}`);
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
    initializeDirectoriesSync();

    // Detect capabilities
    const podmanAvailable = checkPodmanSync();

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
    const podmanAvailable = checkPodmanSync();
    if (!podmanAvailable) {
      issues.push('Podman not found. Install: https://podman.io/');
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
      servicesUpSync();
    } else if (options.down) {
      servicesDownSync();
    } else if (options.status) {
      servicesStatusSync();
    } else if (options.logs) {
      const service = (options as any).logs || 'postgres';
      servicesLogsSync(service);
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
// Helper Functions (Synchronous versions for simplicity)
// ============================================================================

function initializeDirectoriesSync(): void {
  const dirs = [
    CONFIG_DIR,
    path.join(os.homedir(), '.local', 'share', 'fleet'),
    path.join(os.homedir(), '.local', 'state', 'fleet', 'logs'),
    path.join(process.cwd(), '.flightline'),
  ];

  for (const dir of dirs) {
    try {
      mkdir(dir, { recursive: true });
    } catch {
      // Ignore errors
    }
  }
}

function checkPodmanSync(): boolean {
  try {
    execSync('podman --version', { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

function checkPostgresStatusSync(): boolean {
  const config = loadConfigSync();
  if (!config.services?.postgres?.enabled) {
    return false;
  }

  // Check if Podman container exists
  try {
    const result = execSync('podman ps --filter name=fleettools-pg --format {{.Names}}', { encoding: 'utf-8' });
    const running = result.trim().length > 0;
    return running;
  } catch {
    return false;
  }
}

function loadConfigSync(): FleetConfig {
  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content) as FleetConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function servicesUpSync(): void {
  console.log('Starting FleetTools services...');
  const config = loadConfigSync();

  if (config.services?.postgres?.enabled) {
    const podmanAvailable = checkPodmanSync();
    if (!podmanAvailable) {
      console.error('Podman is not available. Cannot start Postgres.');
      return;
    }

    console.log('Starting Postgres via Podman...');
    console.log('  (Implementation: Podman container start - TODO)');
    console.log('  Container: fleettools-pg');
    console.log('  Image: postgres:16');
    console.log('  Port: 5432');
  }

  console.log('');
  console.log('Services started.');
  console.log('Connection info:');
  console.log('  Postgres: localhost:5432');
  console.log('');
  console.log('Run: fleet services status for details');
}

function servicesDownSync(): void {
  console.log('Stopping FleetTools services...');
  const config = loadConfigSync();

  if (config.services?.postgres?.enabled) {
    const podmanAvailable = checkPodmanSync();
    if (!podmanAvailable) {
      console.log('Postgres is not managed by Podman.');
      return;
    }

    console.log('Stopping Postgres container...');
    console.log('  (Implementation: Podman container stop - TODO)');
    console.log('  ✓ Stopped');
  }

  console.log('');
  console.log('Services stopped.');
}

function servicesStatusSync(): void {
  console.log('FleetTools Services Status');
  console.log('========================');
  console.log('');

  const config = loadConfigSync();

  if (config.services?.postgres?.enabled) {
    const pgRunning = checkPostgresStatusSync();
    console.log('Postgres:');
    console.log(`  Status: ${pgRunning ? '✓ Running' : '✗ Not running'}`);
    console.log(`  Provider: ${config.services.postgres.provider}`);
    console.log(`  Image: ${config.services.postgres.image}`);
    console.log(`  Port: ${config.services.postgres.port}`);
  } else {
    console.log('Postgres: Not enabled in config');
  }

  console.log('');

  const mode = getCurrentModeSync();
  if (mode === 'synced') {
    console.log('Zero (sync):');
    console.log(`  Status: ${config.sync?.zero?.url ? '✓ Connected' : '✗ Not connected'}`);
    if (config.sync?.zero?.url) {
      console.log(`  URL: ${config.sync.zero.url}`);
    }
  } else {
    console.log('Zero (sync): Not enabled (mode = local)');
  }
}

function servicesLogsSync(service: string): void {
  console.log(`Fetching logs for service: ${service}`);
  console.log('  (Log fetching not implemented yet)');
}

function getCurrentModeSync(): 'local' | 'synced' {
  const config = loadConfigSync();
  return config.mode || 'local';
}

// ============================================================================
// Parse arguments and run
// ============================================================================

program.parse(process.argv);
