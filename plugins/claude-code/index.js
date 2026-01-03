/**
 * FleetTools Plugin for Claude Code
 *
 * Provides /fleet commands in Claude Code
 */

const { Command } = require('@anthropic-ai/sdk'); // This is the right package name

class FleetToolsClaudePlugin {
  constructor() {
    this.name = 'FleetTools';
    this.version = '0.1.0';
  }

  /**
   * Register commands
   */
  async registerCommands(commands) {
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
   * Handle /fleet status
   */
  async handleStatus() {
    this.showMessage('Fetching FleetTools status...');

    // Execute fleet CLI
    const { exec } = require('child_process');
    exec('fleet status --json', (error, stdout, stderr) => {
      if (error) {
        this.showError('Failed to get FleetTools status', error);
        return;
      }

      try {
        const status = JSON.parse(stdout);

        // Format output for Claude Code
        const output = [
          'FleetTools Status',
          '================',
          '',
          `Mode: ${status.mode?.toUpperCase() || 'LOCAL'}`,
          '',
          `User: ${status.config?.fleet?.user_id || 'Not enrolled'}`,
          '',
          `Workspace: ${status.config?.fleet?.workspace_id || 'None'}`,
          '',
        ];

        if (status.mode === 'synced') {
          output.push('Sync Status:');
          output.push(`  Zero: ${status.podman?.zero?.url ? 'Connected' : 'Not connected'}`);
          output.push(`  API: ${status.podman?.api?.url || 'Not configured'}`);
        }

        if (status.podman) {
          output.push('');
          output.push('Podman:');
          output.push(`  Available: ${status.podman.available ? '✓' : '✗'}`);
        }

        this.showOutput(output);

        // Show details in assistant message
        const details = JSON.stringify(status, null, 2);
        this.showInAssistantMessage('Status Details', details);
      } catch (parseError) {
        this.showOutput(output);
        this.showInAssistantMessage('Status Details', stdout);
      }
    });
  }

  /**
   * Handle /fleet setup
   */
  async handleSetup() {
    this.showMessage('Running FleetTools setup...');

    const { exec } = require('child_process');
    exec('fleet setup', (error, stdout, stderr) => {
      if (error) {
        this.showError('Failed to run FleetTools setup', error);
        return;
      }

      this.showOutput(stdout);
      this.showInAssistantMessage('Setup Output', stdout);
    });
  }

  /**
   * Handle /fleet doctor
   */
  async handleDoctor() {
    this.showMessage('Running FleetTools diagnostics...');

    const { exec } = require('child_process');
    exec('fleet doctor', (error, stdout, stderr) => {
      if (error) {
        this.showError('Failed to run FleetTools doctor', error);
        return;
      }

      this.showOutput(stdout);
      this.showInAssistantMessage('Diagnostics Output', stdout);
    });
  }

  /**
   * Handle /fleet services
   */
  async handleServices() {
    this.showMessage('Opening FleetTools services menu...');

    const { exec } = require('child_process');
    exec('fleet services', (error, stdout, stderr) => {
      if (error) {
        this.showError('Failed to open services menu', error);
        return;
      }

      this.showOutput(stdout);
      this.showInAssistantMessage('Services Menu', stdout);
    });
  }

  /**
   * Handle /fleet help
   */
  async handleHelp() {
    const output = [
      'FleetTools Plugin for Claude Code',
      '=============================',
      '',
      'Commands:',
      ' /fleet status  - Show FleetTools status and configuration',
      ' /fleet setup   - Initialize FleetTools configuration',
      ' /fleet doctor  - Diagnose FleetTools installation and configuration',
      ' /fleet services - Manage local services (up/down/status/logs)',
      ' /fleet help     - Show this help',
      '',
      'For more information, see: https://github.com/v1truv1us/fleettools',
    ];

    this.showOutput(output);
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  showMessage(message) {
    this.showOutput(`\n${message}\n`);
  }

  showError(message, error) {
    this.showOutput(`\n❌ Error: ${message}\n`);
    if (error) {
      this.showOutput(`   ${error.message || error}\n`);
    }
  }

  showOutput(message) {
    // Claude Code will display this in chat
    console.log(message);
  }

  showInAssistantMessage(title, content) {
    // For Claude Code, show in assistant message
    console.log(`\n--- ${title} ---\n${content}\n`);
  }
}

// ==========================================================================
// Plugin Registration
// ==========================================================================

const plugin = new FleetToolsClaudePlugin();

module.exports = {
  name: plugin.name,
  version: plugin.version,
  register: async (commands) => {
    await plugin.registerCommands(commands);
  },
};
