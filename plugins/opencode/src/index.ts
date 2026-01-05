/**
 * FleetTools Plugin for OpenCode
 *
 * Provides /fleet commands in OpenCode editor
 * Falls back to CLI-only mode if SDK is unavailable
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Command registration interface
 */
export interface OpenCodeCommand {
  id: string;
  name: string;
  description: string;
  handler: () => Promise<void>;
}

/**
 * Command registry interface
 */
export interface OpenCodeCommandRegistry {
  registerCommand: (command: OpenCodeCommand) => void;
}

/**
 * Plugin interface for OpenCode
 */
export interface FleetToolsOpenCodePlugin {
  name: string;
  version: string;
  registerCommands: (commands: OpenCodeCommandRegistry) => Promise<void>;
}

/**
 * FleetTools status response from CLI
 */
export interface FleetToolsStatus {
  mode?: 'local' | 'synced';
  config?: {
    fleet?: {
      user_id?: string;
      workspace_id?: string;
    };
  };
  podman?: {
    available?: boolean;
    zero?: {
      url?: string;
    };
    api?: {
      url?: string;
    };
  };
  sync?: {
    zero?: {
      url?: string;
    };
    api?: {
      url?: string;
    };
  };
}

// ============================================================================
// Plugin Implementation
// ============================================================================

/**
 * FleetTools Plugin for OpenCode
 */
export class FleetToolsOpenCodePluginImpl implements FleetToolsOpenCodePlugin {
  /** Plugin name */
  name = 'FleetTools';

  /** Plugin version */
  version = '0.1.0';

  /**
   * Register all /fleet commands
   */
  async registerCommands(commands: OpenCodeCommandRegistry): Promise<void> {
    // Status command
    commands.registerCommand({
      id: 'fleet-status',
      name: '/fleet status',
      description: 'Show FleetTools status and configuration',
      handler: this.handleStatus.bind(this),
    });

    // Setup command
    commands.registerCommand({
      id: 'fleet-setup',
      name: '/fleet setup',
      description: 'Initialize FleetTools configuration',
      handler: this.handleSetup.bind(this),
    });

    // Doctor command
    commands.registerCommand({
      id: 'fleet-doctor',
      name: '/fleet doctor',
      description: 'Diagnose FleetTools installation and configuration',
      handler: this.handleDoctor.bind(this),
    });

    // Services command
    commands.registerCommand({
      id: 'fleet-services',
      name: '/fleet services',
      description: 'Manage local services (up/down/status/logs)',
      handler: this.handleServices.bind(this),
    });

    // Help command
    commands.registerCommand({
      id: 'fleet-help',
      name: '/fleet help',
      description: 'Show FleetTools help information',
      handler: this.handleHelp.bind(this),
    });
  }

  /**
   * Handle /fleet status command
   */
  private async handleStatus(): Promise<void> {
    this.showMessage('Fetching FleetTools status...');

    try {
      const { stdout } = await execAsync('fleet status --json');

      try {
        const status: FleetToolsStatus = JSON.parse(stdout);

        // Format output for OpenCode
        const output: string[] = [
          'FleetTools Status',
          '================',
          '',
          `Mode: ${status.mode?.toUpperCase() || 'LOCAL'}`,
          '',
          `User: ${status.config?.fleet?.user_id || 'Not enrolled'}`,
          '',
        ];

        if (status.mode === 'synced') {
          output.push('Sync Status:');
          output.push(`  Zero: ${status.sync?.zero?.url ? 'Connected' : 'Not configured'}`);
          output.push(`  API: ${status.sync?.api?.url || 'Not configured'}`);
        }

        if (status.podman) {
          output.push('');
          output.push('Podman:');
          output.push(`  Available: ${status.podman.available ? '✓' : '✗'}`);
        }

        this.showOutput(output);

        // Show details in output pane
        const details = JSON.stringify(status, null, 2);
        this.showInOutputPane('Status Details', details);
      } catch {
        this.showOutput(['Failed to parse status output']);
        this.showInOutputPane('Status Details', stdout);
      }
    } catch (error) {
      this.showError('Failed to get FleetTools status', error as Error);
    }
  }

  /**
   * Handle /fleet setup command
   */
  private async handleSetup(): Promise<void> {
    this.showMessage('Running FleetTools setup...');

    try {
      const { stdout } = await execAsync('fleet setup');
      this.showOutput(stdout);
      this.showInOutputPane('Setup Output', stdout);
    } catch (error) {
      this.showError('Failed to run FleetTools setup', error as Error);
    }
  }

  /**
   * Handle /fleet doctor command
   */
  private async handleDoctor(): Promise<void> {
    this.showMessage('Running FleetTools diagnostics...');

    try {
      const { stdout } = await execAsync('fleet doctor');
      this.showOutput(stdout);
      this.showInOutputPane('Diagnostics Output', stdout);
    } catch (error) {
      this.showError('Failed to run FleetTools doctor', error as Error);
    }
  }

  /**
   * Handle /fleet services command
   */
  private async handleServices(): Promise<void> {
    this.showMessage('Opening FleetTools services menu...');

    try {
      const { stdout } = await execAsync('fleet services');
      this.showOutput(stdout);
      this.showInOutputPane('Services Menu', stdout);
    } catch (error) {
      this.showError('Failed to open services menu', error as Error);
    }
  }

  /**
   * Handle /fleet help command
   */
  private async handleHelp(): Promise<void> {
    const output = [
      'FleetTools Plugin for OpenCode',
      '=============================',
      '',
      'Commands:',
      '  /fleet status  - Show FleetTools status',
      '  /fleet setup   - Initialize FleetTools configuration',
      '  /fleet doctor  - Diagnose installation and configuration',
      '  /fleet services - Manage local services',
      '  /fleet help     - Show this help',
      '',
      'For more information, see: https://github.com/v1truv1us/fleettools',
    ];

    this.showOutput(output);
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Display a message to the user
   */
  private showMessage(message: string): void {
    this.showOutput(`\n${message}\n`);
  }

  /**
   * Display an error message
   */
  private showError(message: string, error: Error): void {
    this.showOutput(`\n❌ Error: ${message}\n`);
    this.showOutput(`   ${error.message}\n`);
  }

  /**
   * Display output to the user (chat or terminal)
   */
  private showOutput(message: string | string[]): void {
    if (Array.isArray(message)) {
      message.forEach((line) => console.log(line));
    } else {
      console.log(message);
    }
  }

  /**
   * Display content in the output pane
   */
  private showInOutputPane(title: string, content: string): void {
    console.log(`\n--- ${title} ---\n${content}\n`);
  }
}

// ============================================================================
// Plugin Registration (Graceful Degradation)
// ============================================================================

let plugin: FleetToolsOpenCodePluginImpl | null = null;

/**
 * Create and return the plugin instance
 */
export function createPlugin(): FleetToolsOpenCodePluginImpl {
  if (!plugin) {
    plugin = new FleetToolsOpenCodePluginImpl();
  }
  return plugin;
}

/**
 * Plugin module exports for OpenCode
 */
export const fleetToolsPlugin = {
  name: 'FleetTools',
  version: '0.1.0',
  register: async (commands: OpenCodeCommandRegistry): Promise<void> => {
    const fleetPlugin = createPlugin();
    await fleetPlugin.registerCommands(commands);
  },
};

/**
 * Graceful fallback for when SDK is unavailable
 * Provides basic CLI-based functionality
 */
export async function fallbackRegister(): Promise<void> {
  console.warn(
    '[FleetTools] OpenCode SDK not available. Running in CLI fallback mode.',
  );
  console.warn('[FleetTools] The following commands are available via fleet CLI:');
  console.warn('  - fleet status');
  console.warn('  - fleet setup');
  console.warn('  - fleet doctor');
  console.warn('  - fleet services');
  console.warn('  - fleet help');
}

// Default export for module systems
export default fleetToolsPlugin;
