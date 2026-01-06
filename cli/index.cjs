#!/usr/bin/env node
/**
 * FleetTools CLI (JavaScript version)
 * Quick start for implementation
 */

const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, execSync } = require('child_process');

const CONFIG_DIR = path.join(os.homedir(), '.config', 'fleet');
const CONFIG_FILE = path.join(CONFIG_DIR, 'fleet.json');

// ============================================================================
// Load/Save Config
// ============================================================================

function loadConfig() {
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        mode: 'local',
        services: {
          postgres: {
            enabled: true,
            provider: 'podman',
            image: 'postgres:16',
            port: 5432,
            container_name: 'fleettools-pg',
            volume_name: 'fleettools-pg-data'
          }
        },
        flightline: {
          directory: '.flightline'
        }
      };
    }
    throw error;
  }
}

function saveConfig(config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getCurrentMode() {
  const config = loadConfig();
  return config.mode || 'local';
}

// ============================================================================
// Command: status
// ============================================================================

program
  .command('status')
  .description('Show FleetTools status and configuration')
  .option('--json', 'Output in JSON format')
  .action((options) => {
    const config = loadConfig();
    const mode = getCurrentMode();

    if (options.json) {
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
      console.log(`  Git-tracked: ${fs.existsSync(path.join(flightlineDir, '.git')) ? 'Yes' : 'No'}`);
    }
  });

// ============================================================================
// Command: setup
// ============================================================================

program
  .command('setup')
  .description('Initialize FleetTools configuration')
  .action(() => {
    const config = loadConfig();

    console.log('FleetTools Setup');
    console.log('===============');
    console.log('');

    // Initialize directories
    initializeDirectories();

    // Detect capabilities
    const podmanAvailable = checkPodmanSync();
    console.log('Environment Check:');
    console.log(`  Podman: ${podmanAvailable ? '✓ Detected' : '✗ Not found'}`);
    console.log('');

    // Initialize config with defaults if missing
    if (!config.mode) {
      config.mode = 'local';
      console.log('✓ Set default mode: local');
    }

    if (!config.flightline) {
      config.flightline = { directory: '.flightline' };
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
        volume_name: 'fleettools-pg-data'
      };
      console.log('✓ Set default Postgres provider: podman');
    }

    saveConfig(config);

    console.log('');
    console.log('Setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run: fleet doctor      (to verify setup)');
    console.log('  2. Run: fleet services up (to start local services)');
  });

// ============================================================================
// Command: doctor
// ============================================================================

program
  .command('doctor')
  .description('Diagnose FleetTools installation and configuration')
  .action(() => {
    console.log('FleetTools Diagnostics');
    console.log('======================');
    console.log('');

    const issues = [];

    // Check config
    const configExists = fs.existsSync(CONFIG_FILE);
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
      console.log('Run: fleet setup to fix configuration issues');
      console.log('Run: fleet services up to start services');
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
  .action((options) => {
    if (options.up) {
      servicesUpSync();
    } else if (options.down) {
      servicesDownSync();
    } else if (options.status) {
      servicesStatusSync();
    } else if (options.logs) {
      servicesLogsSync(options.logs || 'postgres');
    } else {
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

function initializeDirectories() {
  const dirs = [
    CONFIG_DIR,
    path.join(os.homedir(), '.local', 'share', 'fleet'),
    path.join(os.homedir(), '.local', 'state', 'fleet', 'logs'),
    path.join(process.cwd(), '.flightline'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function checkPodmanSync() {
  try {
    execSync('podman --version', { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

function checkPostgresStatusSync() {
  const config = loadConfig();
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

function servicesUpSync() {
  console.log('Starting FleetTools services...');
  const config = loadConfig();

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

function servicesDownSync() {
  console.log('Stopping FleetTools services...');
  const config = loadConfig();

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

function servicesStatusSync() {
  console.log('FleetTools Services Status');
  console.log('========================');
  console.log('');

  const config = loadConfig();

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
  const mode = getCurrentMode();
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

function servicesLogsSync(service) {
  console.log(`Fetching logs for service: ${service}`);
  console.log('  (Log fetching not implemented yet)');
}

// ============================================================================
// Parse and run
// ============================================================================

program.parse(process.argv);
