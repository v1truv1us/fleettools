
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);


export interface OpenCodeCommand {
  id: string;
  name: string;
  description: string;
  handler: () => Promise<void>;
}

export interface OpenCodeCommandRegistry {
  registerCommand: (command: OpenCodeCommand) => void;
}

export interface FleetToolsOpenCodePlugin {
  name: string;
  version: string;
  registerCommands: (commands: OpenCodeCommandRegistry) => Promise<void>;
}

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


export class FleetToolsOpenCodePluginImpl implements FleetToolsOpenCodePlugin {
  /** Plugin name */
  name = 'FleetTools';

  /** Plugin version */
  version = '0.1.0';

  async registerCommands(commands: OpenCodeCommandRegistry): Promise<void> {
    commands.registerCommand({
      id: 'fleet-status',
      name: '/fleet status',
      description: 'Show FleetTools status and configuration',
      handler: this.handleStatus.bind(this),
    });

    commands.registerCommand({
      id: 'fleet-setup',
      name: '/fleet setup',
      description: 'Initialize FleetTools configuration',
      handler: this.handleSetup.bind(this),
    });

    commands.registerCommand({
      id: 'fleet-doctor',
      name: '/fleet doctor',
      description: 'Diagnose FleetTools installation and configuration',
      handler: this.handleDoctor.bind(this),
    });

    commands.registerCommand({
      id: 'fleet-services',
      name: '/fleet services',
      description: 'Manage local services (up/down/status/logs)',
      handler: this.handleServices.bind(this),
    });

    commands.registerCommand({
      id: 'fleet-help',
      name: '/fleet help',
      description: 'Show FleetTools help information',
      handler: this.handleHelp.bind(this),
    });
  }

  private async handleStatus(): Promise<void> {
    this.showMessage('Fetching FleetTools status...');

    try {
      const { stdout } = await execAsync('fleet status --json');

      try {
        const status: FleetToolsStatus = JSON.parse(stdout);

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
  // ==========================================================================

  private showMessage(message: string): void {
    this.showOutput(`\n${message}\n`);
  }

  private showError(message: string, error: Error): void {
    this.showOutput(`\n❌ Error: ${message}\n`);
    this.showOutput(`   ${error.message}\n`);
  }

  private showOutput(message: string | string[]): void {
    if (Array.isArray(message)) {
      message.forEach((line) => console.log(line));
    } else {
      console.log(message);
    }
  }

  private showInOutputPane(title: string, content: string): void {
    console.log(`\n--- ${title} ---\n${content}\n`);
  }
}


let plugin: FleetToolsOpenCodePluginImpl | null = null;

export function createPlugin(): FleetToolsOpenCodePluginImpl {
  if (!plugin) {
    plugin = new FleetToolsOpenCodePluginImpl();
  }
  return plugin;
}

export const fleetToolsPlugin = {
  name: 'FleetTools',
  version: '0.1.0',
  register: async (commands: OpenCodeCommandRegistry): Promise<void> => {
    const fleetPlugin = createPlugin();
    await fleetPlugin.registerCommands(commands);
  },
};

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

export default fleetToolsPlugin;
