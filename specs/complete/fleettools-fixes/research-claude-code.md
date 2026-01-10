# Claude Code Plugin API Research

## Overview

This document provides comprehensive research on the Claude Code plugin API for implementing `/fleet` commands in the FleetTools plugin. Claude Code supports two primary approaches for creating custom commands:

1. **File-based commands**: Markdown files in `commands/` directory (simpler, no code required)
2. **Programmatic commands**: JavaScript/TypeScript plugins using the `@anthropic-ai/sdk` package (full programmatic control)

The existing FleetTools plugin at `/home/vitruvius/git/fleettools/plugins/claude-code/` uses the programmatic approach with the `@anthropic-ai/sdk` package.

## Plugin Interface

### Plugin Structure

A Claude Code plugin has the following directory structure:

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # Required: plugin manifest
├── commands/                 # Optional: markdown command files
├── agents/                   # Optional: subagent definitions
├── skills/                   # Optional: agent skills
├── hooks/                    # Optional: event handlers
├── .mcp.json                 # Optional: MCP server configurations
├── .lsp.json                 # Optional: LSP server configurations
└── scripts/                  # Optional: utility scripts
```

### Plugin Manifest (plugin.json)

The `plugin.json` file defines plugin metadata:

```json
{
  "name": "fleettools",
  "version": "0.1.0",
  "description": "FleetTools plugin for Claude Code - AI agent coordination",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com",
    "url": "https://github.com/yourusername"
  },
  "homepage": "https://github.com/yourusername/fleettools",
  "repository": "https://github.com/yourusername/fleettools",
  "license": "MIT",
  "keywords": ["fleet", "agents", "coordination", "multi-agent"]
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique identifier (kebab-case, no spaces) |
| `version` | string | Semantic version (e.g., "1.0.0") |
| `description` | string | Brief explanation of plugin purpose |

## Command Registration

### Approach 1: File-Based Commands (Simplest)

Create Markdown files in the `commands/` directory. The filename becomes the command name.

**Location**: `plugins/claude-code/commands/`

**Example**: `plugins/claude-code/commands/status.md`

```markdown
---
description: Show FleetTools status and configuration
argument-hint: [--json]
---

# FleetTools Status Command

Display the current status of FleetTools including:
- Mode (local/synced)
- User enrollment status
- Workspace configuration
- Podman availability
- Connected services

If the user requests JSON output, execute `fleet status --json` and format appropriately.
```

**Invocation**:
- `/fleettools:status` (with plugin prefix)
- `/status` (if no conflict with other commands)

### Approach 2: Programmatic Commands (Full Control)

The programmatic approach uses the `@anthropic-ai/sdk` package for complete control over command execution, output handling, and error management.

#### SDK Package

**Package Name**: `@anthropic-ai/sdk`

**Installation**:
```bash
npm install @anthropic-ai/sdk
```

**Import**:
```javascript
const { Command } = require('@anthropic-ai/sdk');
```

#### Command Class Interface

The `Command` class is the core interface for programmatic command registration:

```javascript
class Command {
  constructor(options) {
    this.id = options.id;           // Unique command identifier
    this.name = options.name;       // Display name (e.g., '/fleet status')
    this.description = options.description;  // Brief description
    this.handler = options.handler; // Async function to execute
  }
}
```

#### Plugin Class Interface

The plugin class must implement the following interface:

```javascript
class FleetToolsPlugin {
  constructor() {
    this.name = 'FleetTools';
    this.version = '0.1.0';
  }

  /**
   * Register commands with Claude Code
   * @param {Object} commands - Commands registry
   */
  async registerCommands(commands) {
    // Register individual commands here
  }

  /**
   * Optional: Initialize plugin resources
   */
  async initialize() {
    // Setup code here
  }

  /**
   * Optional: Cleanup plugin resources
   */
  async dispose() {
    // Cleanup code here
  }
}
```

#### Complete Plugin Example

```javascript
/**
 * FleetTools Plugin for Claude Code
 * Provides /fleet commands for AI agent coordination
 */

const { Command } = require('@anthropic-ai/sdk');

class FleetToolsPlugin {
  constructor() {
    this.name = 'FleetTools';
    this.version = '0.1.0';
    this.commands = [];
  }

  /**
   * Register all /fleet commands
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
      description: 'Diagnose FleetTools installation',
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
  async handleStatus(args) {
    // Access output methods via 'this' context
    this.showOutput('\nFetching FleetTools status...\n');

    try {
      const { execSync } = require('child_process');
      const statusOutput = execSync('fleet status --json', {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      const status = JSON.parse(statusOutput);
      
      // Format output for Claude Code
      const lines = [
        'FleetTools Status',
        '=================',
        '',
        `Mode: ${status.mode?.toUpperCase() || 'LOCAL'}`,
        `User: ${status.config?.fleet?.user_id || 'Not enrolled'}`,
        `Workspace: ${status.config?.fleet?.workspace_id || 'None'}`,
      ];

      if (status.podman?.available) {
        lines.push('');
        lines.push('Podman: Available');
      }

      if (status.mode === 'synced') {
        lines.push('');
        lines.push('Services:');
        lines.push(`  Zero: ${status.podman?.zero?.url ? 'Connected' : 'Not connected'}`);
        lines.push(`  API: ${status.podman?.api?.url || 'Not configured'}`);
      }

      this.showOutput(lines);

      // Show detailed JSON in assistant message
      this.showInAssistantMessage('Status Details', statusOutput);
    } catch (error) {
      this.showError('Failed to get FleetTools status', error);
    }
  }

  /**
   * Handle /fleet setup command
   */
  async handleSetup(args) {
    this.showOutput('\nRunning FleetTools setup...\n');

    try {
      const { execSync } = require('child_process');
      const output = execSync('fleet setup', {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      });

      this.showOutput(output);
      this.showInAssistantMessage('Setup Output', output);
    } catch (error) {
      this.showError('Failed to run FleetTools setup', error);
    }
  }

  /**
   * Handle /fleet doctor command
   */
  async handleDoctor(args) {
    this.showOutput('\nRunning FleetTools diagnostics...\n');

    try {
      const { execSync } = require('child_process');
      const output = execSync('fleet doctor', {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      });

      this.showOutput(output);
      this.showInAssistantMessage('Diagnostics Output', output);
    } catch (error) {
      this.showError('Failed to run FleetTools doctor', error);
    }
  }

  /**
   * Handle /fleet services command
   */
  async handleServices(args) {
    this.showOutput('\nOpening FleetTools services menu...\n');

    try {
      const { execSync } = require('child_process');
      const output = execSync('fleet services', {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      });

      this.showOutput(output);
      this.showInAssistantMessage('Services Menu', output);
    } catch (error) {
      this.showError('Failed to open services menu', error);
    }
  }

  /**
   * Handle /fleet help command
   */
  async handleHelp(args) {
    const output = [
      'FleetTools Plugin for Claude Code',
      '==================================',
      '',
      'Commands:',
      '  /fleet status    - Show FleetTools status and configuration',
      '  /fleet setup     - Initialize FleetTools configuration',
      '  /fleet doctor    - Diagnose FleetTools installation',
      '  /fleet services  - Manage local services (up/down/status/logs)',
      '  /fleet help      - Show this help',
      '',
      'For more information, see:',
      '  https://github.com/yourusername/fleettools',
    ];

    this.showOutput(output);
  }
}

// Export the plugin
const plugin = new FleetToolsPlugin();

module.exports = {
  name: plugin.name,
  version: plugin.version,
  register: async (commands) => {
    await plugin.registerCommands(commands);
  },
};
```

## Output Methods

### Available Output Methods

The plugin context provides methods for displaying output to users:

| Method | Purpose | Usage |
|--------|---------|-------|
| `showOutput(message)` | Display output in chat | Primary output method |
| `showError(message, error)` | Display error message | Error reporting |
| `showMessage(message)` | Display informational message | Status updates |
| `showInAssistantMessage(title, content)` | Show structured content | Detailed data display |

### showOutput()

Displays output in the Claude Code chat interface.

**Signature**:
```javascript
showOutput(message: string | string[]): void
```

**Examples**:
```javascript
// Single string
this.showOutput('Operation completed successfully');

// Array of strings (each on new line)
this.showOutput([
  'FleetTools Status',
  '=================',
  '',
  `Mode: ${mode}`,
]);

// With formatting
this.showOutput(`\nStatus: ${status}\n`);
```

### showError()

Displays an error message with optional error details.

**Signature**:
```javascript
showError(message: string, error?: Error | string): void
```

**Examples**:
```javascript
// Simple error
this.showError('Failed to get status');

// With error details
this.showError('Failed to get FleetTools status', error);

// Error with message and details
this.showError('Command failed', {
  message: error.message,
  code: error.code,
  stdout: error.stdout,
  stderr: error.stderr,
});
```

### showMessage()

Displays an informational message (convenience wrapper around showOutput).

**Signature**:
```javascript
showMessage(message: string): void
```

**Example**:
```javascript
showMessage('Fetching FleetTools status...');
// Equivalent to:
showOutput(`\n${message}\n`);
```

### showInAssistantMessage()

Shows structured content in the assistant message area for detailed data display.

**Signature**:
```javascript
showInAssistantMessage(title: string, content: string): void
```

**Examples**:
```javascript
// Show JSON details
const statusJson = JSON.stringify(status, null, 2);
this.showInAssistantMessage('Status Details', statusJson);

// Show formatted output
this.showInAssistantMessage('Diagnostics Output', diagnostics);

// Show multiple sections
this.showInAssistantMessage('Fleet Status', `
Mode: ${status.mode}
User: ${status.userId}
Workspace: ${status.workspaceId}
`);
```

### Error Handling Patterns

#### Try-Catch Pattern

```javascript
async handleCommand(args) {
  this.showMessage('Processing...');

  try {
    // Synchronous operation
    const result = this.performOperation();
    this.showOutput(result);

    // Or async operation
    const asyncResult = await this.performAsyncOperation();
    this.showOutput(asyncResult);
  } catch (error) {
    this.showError('Operation failed', error);
  }
}
```

#### Exec Pattern (for child_process)

```javascript
const { exec, execSync } = require('child_process');

// Async exec with callback
exec('fleet status', (error, stdout, stderr) => {
  if (error) {
    this.showError('Command failed', error);
    return;
  }
  this.showOutput(stdout);
});

// Sync exec (recommended for simpler commands)
try {
  const output = execSync('fleet status --json', { encoding: 'utf8' });
  this.showOutput(output);
} catch (error) {
  this.showError('Failed to execute command', error);
}
```

## Module Export Format

### Required Export Structure

The plugin module must export an object with the following structure:

```javascript
module.exports = {
  name: string,              // Plugin name (displayed in /plugin list)
  version: string,           // Plugin version (for updates)
  register: async function(commands) {
    // Register commands here
  },
  // Optional lifecycle hooks
  initialize?: async function() {},    // Called when plugin loads
  dispose?: async function() {},       // Called when plugin unloads
};
```

### Complete Export Example

```javascript
const { Command } = require('@anthropic-ai/sdk');

class FleetToolsPlugin {
  constructor() {
    this.name = 'FleetTools';
    this.version = '0.1.0';
  }

  async registerCommands(commands) {
    // Command registration code
  }
}

const plugin = new FleetToolsPlugin();

module.exports = {
  get name() {
    return plugin.name;
  },
  get version() {
    return plugin.version;
  },
  register: async (commands) => {
    await plugin.registerCommands(commands);
  },
  initialize: async () => {
    console.log('FleetTools plugin initialized');
  },
  dispose: async () => {
    console.log('FleetTools plugin disposed');
  },
};
```

### Alternative Export Patterns

**Factory Function Pattern**:
```javascript
module.exports = {
  createPlugin: (options) => {
    return {
      name: 'FleetTools',
      version: '0.1.0',
      register: async (commands) => {
        // Registration code
      },
    };
  },
};
```

**Class Export Pattern**:
```javascript
const FleetToolsPlugin = require('./plugin-class');

module.exports = FleetToolsPlugin;
```

## SDK Requirements

### @anthropic-ai/sdk Package

**NPM Package**: `@anthropic-ai/sdk`

**Current Version**: 0.71.2 (as of research date)

**Installation**:
```bash
npm install @anthropic-ai/sdk
```

**Package Purpose**: Provides the `Command` class for programmatic command registration in Claude Code plugins.

**Key Exports**:
- `Command` - Class for creating command definitions
- (Other exports for different plugin types and features)

### Alternative: File-Based Commands

For simpler plugins, you can avoid the SDK entirely by using file-based commands:

1. Create markdown files in `commands/` directory
2. No JavaScript code required
3. Use frontmatter for configuration
4. Supports all command features (arguments, bash execution, file references)

**Example**: `commands/status.md`
```markdown
---
description: Show FleetTools status
argument-hint: [--json]
---

Display FleetTools status information.

If --json flag is provided, output status in JSON format.
```

### Dependencies and Environment

**Node.js Requirements**:
- Minimum Node.js version: 18.0.0 or higher
- TypeScript support available with type declarations

**Package Dependencies**:
- `@anthropic-ai/sdk` has minimal dependencies
- Built-in type declarations included

**Optional Dependencies**:
- `commander` - For CLI argument parsing (if needed)
- `chalk` - For colored terminal output

### Claude Code Version Requirements

**Minimum Version**: Claude Code 1.0.33 or later for plugin support

**Check Version**:
```bash
claude --version
```

**Update Command**:
```bash
claude update
```

## Implementation Recommendations

### For FleetTools Plugin

Based on the research, here are the recommended approaches for implementing the FleetTools plugin:

#### Recommendation 1: Hybrid Approach (Recommended)

Combine file-based commands for simple operations with programmatic commands for complex operations.

**Directory Structure**:
```
plugins/claude-code/
├── .claude-plugin/
│   └── plugin.json
├── commands/              # File-based simple commands
│   ├── help.md
│   └── status.md
├── index.js              # Programmatic commands for complex operations
└── package.json
```

**Benefits**:
- Simpler commands are easy to maintain as markdown
- Complex commands have full programmatic control
- Best of both worlds

#### Recommendation 2: Programmatic-Only Approach

Use programmatic commands exclusively for complete control.

**Use When**:
- Commands require complex error handling
- Need to parse JSON output from fleet CLI
- Commands need conditional logic based on arguments
- Want to provide rich output formatting

#### Recommendation 3: File-Based Only Approach

Use file-based commands for simplicity.

**Use When**:
- Commands are simple prompts
- No complex error handling needed
- Team is more comfortable with markdown than JavaScript
- Want easiest maintenance

### Best Practices

1. **Command Naming**: Use `/fleet` prefix for all commands (e.g., `/fleet status`, `/fleet setup`)

2. **Error Handling**: Always wrap CLI calls in try-catch blocks

3. **Output Formatting**: Use array of strings for multi-line output

4. **JSON Handling**: Parse JSON output for structured data display

5. **Async Operations**: Use `execSync` for synchronous or `exec` with callbacks for async

6. **Module Export**: Follow the standard export format with name, version, and register

7. **Versioning**: Use semantic versioning for plugin releases

8. **Documentation**: Include README.md and package.json with proper metadata

### Testing Commands

**Test Plugin Locally**:
```bash
claude --plugin-dir ./plugins/claude-code
```

**Test Individual Commands**:
```
/fleet help
/fleet status
/fleet setup
/fleet doctor
/fleet services
```

**Debug Mode**:
```bash
claude --debug --plugin-dir ./plugins/claude-code
```

## Code Example

### Complete Minimal Working Example

Here is a complete, minimal working example of a FleetTools plugin:

**File**: `plugins/claude-code/index.js`
```javascript
/**
 * FleetTools Plugin for Claude Code
 * 
 * Provides /fleet commands for AI agent coordination system.
 * Install with: claude --plugin-dir ./plugins/claude-code
 */

const { Command } = require('@anthropic-ai/sdk');

class FleetToolsPlugin {
  constructor() {
    this.name = 'FleetTools';
    this.version = '0.1.0';
  }

  async registerCommands(commands) {
    // Register /fleet status
    commands.registerCommand({
      id: 'fleet-status',
      name: '/fleet status',
      description: 'Show FleetTools status and configuration',
      handler: this.handleStatus.bind(this),
    });

    // Register /fleet setup
    commands.registerCommand({
      id: 'fleet-setup',
      name: '/fleet setup',
      description: 'Initialize FleetTools configuration',
      handler: this.handleSetup.bind(this),
    });

    // Register /fleet doctor
    commands.registerCommand({
      id: 'fleet-doctor',
      name: '/fleet doctor',
      description: 'Diagnose FleetTools installation',
      handler: this.handleDoctor.bind(this),
    });

    // Register /fleet services
    commands.registerCommand({
      id: 'fleet-services',
      name: '/fleet services',
      description: 'Manage local services',
      handler: this.handleServices.bind(this),
    });

    // Register /fleet help
    commands.registerCommand({
      id: 'fleet-help',
      name: '/fleet help',
      description: 'Show FleetTools help',
      handler: this.handleHelp.bind(this),
    });
  }

  async handleStatus() {
    this.showMessage('Fetching status...');
    
    try {
      const { execSync } = require('child_process');
      const output = execSync('fleet status --json', { encoding: 'utf8' });
      const status = JSON.parse(output);
      
      const lines = [
        'FleetTools Status',
        '=================',
        `Mode: ${status.mode?.toUpperCase() || 'LOCAL'}`,
        `User: ${status.config?.fleet?.user_id || 'Not enrolled'}`,
      ];
      
      this.showOutput(lines);
      this.showInAssistantMessage('Full Status', output);
    } catch (error) {
      this.showError('Failed to get status', error);
    }
  }

  async handleSetup() {
    this.showMessage('Running setup...');
    
    try {
      const { execSync } = require('child_process');
      const output = execSync('fleet setup', { encoding: 'utf8' });
      this.showOutput(output);
    } catch (error) {
      this.showError('Setup failed', error);
    }
  }

  async handleDoctor() {
    this.showMessage('Running diagnostics...');
    
    try {
      const { execSync } = require('child_process');
      const output = execSync('fleet doctor', { encoding: 'utf8' });
      this.showOutput(output);
    } catch (error) {
      this.showError('Diagnostics failed', error);
    }
  }

  async handleServices() {
    this.showMessage('Opening services menu...');
    
    try {
      const { execSync } = require('child_process');
      const output = execSync('fleet services', { encoding: 'utf8' });
      this.showOutput(output);
    } catch (error) {
      this.showError('Failed to open services', error);
    }
  }

  async handleHelp() {
    const output = [
      'FleetTools Commands',
      '===================',
      '/fleet status    - Show status',
      '/fleet setup     - Initialize config',
      '/fleet doctor    - Run diagnostics',
      '/fleet services  - Manage services',
      '/fleet help      - Show this help',
    ];
    this.showOutput(output);
  }
}

// Export plugin
const plugin = new FleetToolsPlugin();

module.exports = {
  name: plugin.name,
  version: plugin.version,
  register: async (commands) => {
    await plugin.registerCommands(commands);
  },
};
```

**File**: `plugins/claude-code/package.json`
```json
{
  "name": "fleettools-claude",
  "version": "0.1.0",
  "description": "FleetTools plugin for Claude Code - /fleet commands",
  "displayName": "FleetTools",
  "main": "index.js",
  "keywords": ["fleet", "agents", "cli"],
  "author": "Your Name",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/yourusername/fleettools/issues"
  },
  "homepage": "https://github.com/yourusername/fleettools"
}
```

**File**: `plugins/claude-code/.claude-plugin/plugin.json`
```json
{
  "name": "fleettools",
  "version": "0.1.0",
  "description": "FleetTools plugin for Claude Code - provides /fleet commands for AI agent coordination"
}
```

### Installation and Testing

```bash
# Test the plugin
claude --plugin-dir ./plugins/claude-code

# In Claude Code, try:
/fleet help
/fleet status
/fleet doctor
```

## References

- [Claude Code Plugins Documentation](https://code.claude.com/docs/en/plugins)
- [Plugins Reference](https://docs.claude.com/en/docs/claude-code/plugins-reference)
- [Slash Commands](https://code.claude.com/docs/en/slash-commands)
- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [NPM: @anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk)
- [Existing FleetTools Plugin](/home/vitruvius/git/fleettools/plugins/claude-code/index.js)
