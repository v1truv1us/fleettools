# OpenCode Plugin API Research

## Overview

OpenCode is an open-source AI coding agent that provides a comprehensive plugin system for extending its functionality. This research documents the OpenCode plugin API based on official documentation and existing implementations, specifically for implementing the FleetTools plugin with `/fleet` commands.

Key findings:
- OpenCode plugins are JavaScript/TypeScript modules that export plugin functions
- Plugins hook into events like `tool.execute.before`, `session.compacted`, etc.
- Custom tools can be created using the `tool()` helper from `@opencode-ai/plugin`
- Commands are registered via the OpenCode configuration system
- No explicit UI output methods (`showOutput`, `showError`, `showInOutputPane`) exist in the official API

## Plugin Interface

### Plugin Function Signature

A plugin is a JavaScript/TypeScript module that exports an async function receiving a context object:

```typescript
import type { Plugin } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async (ctx) => {
  return {
    // Hook implementations
  }
}
```

### Context Object Properties

The plugin function receives a context object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `project` | object | Current project information |
| `directory` | string | Current working directory |
| `worktree` | string | Git worktree path |
| `client` | object | OpenCode SDK client for AI interaction |
| `$` | function | Bun shell API for executing commands |

### Plugin Return Value (Hooks Object)

The plugin returns an object containing event handlers (hooks):

```typescript
export const MyPlugin: Plugin = async (ctx) => {
  return {
    "tool.execute.before": async (input, output) => {
      // Modify tool execution before it runs
    },
    "session.compacted": async (input, output) => {
      // Handle session compaction events
    }
  }
}
```

## Command Registration

### JSON Configuration Method

Commands are registered through the OpenCode configuration file (`opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "command": {
    "fleet-status": {
      "template": "Show FleetTools status and configuration",
      "description": "Show FleetTools status",
      "agent": "build",
      "model": "anthropic/claude-3-5-sonnet-20241022"
    }
  }
}
```

### Markdown File Method

Alternatively, create markdown files in the `command/` directory:

**Location**: `.opencode/command/fleet-status.md`

```markdown
---
description: Show FleetTools status
agent: build
model: anthropic/claude-3-5-sonnet-20241022
---

Show the current FleetTools status including:
- Mode (local/synced)
- User enrollment status
- Podman availability
- Sync status for Zero and API endpoints
```

### Command Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `template` | string | Yes | Prompt sent to LLM when command executes |
| `description` | string | No | Short description shown in TUI |
| `agent` | string | No | Agent to execute command |
| `subtask` | boolean | No | Force subagent invocation |
| `model` | string | No | Override default model |

### Command File Arguments

Commands can accept arguments using placeholders:

```markdown
---
description: Create component
---

Create a new React component named $ARGUMENTS
```

Usage: `/create-component Button`

Positional parameters: `$1`, `$2`, `$3`, etc.

## Custom Tools

For FleetTools functionality that the LLM should call directly, create custom tools:

### Tool Definition Structure

```typescript
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Get FleetTools status",
  args: {},
  async execute(args, context) {
    const { agent, sessionID, messageID } = context
    // Implement tool logic
    return JSON.stringify({ mode: "local", status: "ready" })
  }
})
```

### Tool Arguments Schema

Tools use Zod for argument validation:

```typescript
import { tool, z } from "@opencode-ai/plugin"

export default tool({
  description: "Query database",
  args: {
    query: tool.schema.string().describe("SQL query to execute"),
    limit: tool.schema.number().optional().describe("Max results")
  },
  async execute(args) {
    // Tool implementation
    return "result"
  }
})
```

### Multiple Tools Per File

```typescript
import { tool } from "@opencode-ai/plugin"

export const add = tool({
  description: "Add two numbers",
  args: {
    a: tool.schema.number().describe("First number"),
    b: tool.schema.number().describe("Second number")
  },
  async execute(args) {
    return args.a + args.b
  }
})

export const multiply = tool({
  description: "Multiply two numbers",
  args: {
    a: tool.schema.number().describe("First number"),
    b: tool.schema.number().describe("Second number")
  },
  async execute(args) {
    return args.a * args.b
  }
})
```

This creates tools named `<filename>_<exportname>`: `math_add`, `math_multiply`.

## Output Methods

### Standard Output Methods (Console)

The existing FleetTools plugin implements wrapper methods for output:

```javascript
showOutput(message) {
  // Display message in chat/output
  console.log(message)
}

showError(message, error) {
  // Display error with optional error details
  console.log(`\n❌ Error: ${message}\n`)
  if (error) {
    console.log(`   ${error.message || error}\n`)
  }
}

showInOutputPane(title, content) {
  // Display detailed content in output pane
  console.log(`\n--- ${title} ---\n${content}\n`)
}
```

### TUI Control Methods (via SDK)

The OpenCode SDK provides TUI control methods:

```typescript
import { createOpencode } from "@opencode-ai/sdk"

const { client } = await createOpencode()

// Append to prompt
await client.tui.appendPrompt({ body: { text: "text" } })

// Show toast notification
await client.tui.showToast({
  body: { message: "Task completed", variant: "success" }
})

// Execute command
await client.tui.executeCommand({ body: { command: "ls" } })
```

### Toast Notification Variants

| Variant | Description |
|---------|-------------|
| `"success"` | Success message |
| `"error"` | Error message |
| `"info"` | Information |
| `"warning"` | Warning |

## Module Export Format

### Standard Plugin Export

```javascript
// .opencode/plugin/fleettools.js
const FleetToolsPlugin = async ({ project, client, $, directory, worktree }) => {
  return {
    "tool.execute.before": async (input, output) => {
      // Modify tool execution
    }
  }
}

module.exports = {
  FleetToolsPlugin
}
```

### TypeScript Plugin Export

```typescript
// .opencode/plugin/fleettools.ts
import type { Plugin } from "@opencode-ai/plugin"

export const FleetToolsPlugin: Plugin = async (ctx) => {
  return {
    // Hooks
  }
}
```

### Custom Tool Export

```typescript
// .opencode/tool/fleet-status.ts
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Get FleetTools status",
  args: {},
  async execute(args) {
    return JSON.stringify({ status: "ready" })
  }
})
```

### package.json for Local Plugins

For local plugins using external npm packages:

```json
// .opencode/package.json
{
  "dependencies": {
    "shescape": "^2.1.0",
    "zod": "^3.22.0"
  }
}
```

OpenCode runs `bun install` at startup to install these dependencies.

## SDK Requirements

### Required Packages

| Package | Purpose | Install Command |
|---------|---------|-----------------|
| `@opencode-ai/plugin` | Plugin types and `tool()` helper | `bun i -D @opencode-ai/plugin` |
| `@opencode-ai/sdk` | Type-safe client for OpenCode server | `npm install @opencode-ai/sdk` |

### Installing Dependencies

**For npm plugins:**
```bash
npm install @opencode-ai/plugin @opencode-ai/sdk
```

**For local plugins (in .opencode directory):**
```bash
cd .opencode && bun install
```

### TypeScript Support

For TypeScript support, add type reference:

```typescript
/// <reference types="@opencode-ai/plugin" />
```

## Available Events

### Command Events
- `command.executed`

### File Events
- `file.edited`
- `file.watcher.updated`

### Installation Events
- `installation.updated`

### LSP Events
- `lsp.client.diagnostics`
- `lsp.updated`

### Message Events
- `message.part.removed`
- `message.part.updated`
- `message.removed`
- `message.updated`

### Permission Events
- `permission.replied`
- `permission.updated`

### Server Events
- `server.connected`

### Session Events
- `session.created`
- `session.compacted`
- `session.deleted`
- `session.diff`
- `session.error`
- `session.idle`
- `session.status`
- `session.updated`

### Todo Events
- `todo.updated`

### Tool Events
- `tool.execute.after`
- `tool.execute.before`

### TUI Events
- `tui.prompt.append`
- `tui.command.execute`
- `tui.toast.show`

### Experimental Events
- `experimental.session.compacting` - Customize session compaction

## Plugin Locations

### Global Plugins
- Path: `~/.config/opencode/plugin/`
- Installation: Via npm packages in config

### Project Plugins
- Path: `.opencode/plugin/`
- Installation: Direct JavaScript/TypeScript files

### Global Commands
- Path: `~/.config/opencode/command/`

### Project Commands
- Path: `.opencode/command/`

### Global Tools
- Path: `~/.config/opencode/tool/`

### Project Tools
- Path: `.opencode/tool/`

## Implementation Recommendations

### For FleetTools Plugin

1. **Use Custom Tools for LLM-Executable Commands**
   - Create tools that the LLM can call directly during conversations
   - Use `tool()` helper for type-safe definitions
   - Example: `fleet_status`, `fleet_setup`, `fleet_doctor`

2. **Use Hooks for Behavior Modification**
   - `tool.execute.before` to modify commands before execution
   - `tool.execute.after` to process results

3. **Use SDK for TUI Integration**
   - `client.tui.showToast()` for notifications
   - `client.tui.appendPrompt()` for injecting context

4. **Package Distribution**
   - Publish to npm for easy installation
   - Include `opencode` config in package.json
   - Specify engine version requirement

### Plugin Structure

```
fleettools-opencode/
  package.json
  README.md
  src/
    index.ts          # Main plugin
    tools/
      status.ts       # fleet_status tool
      setup.ts        # fleet_setup tool
      doctor.ts       # fleet_doctor tool
  opencode.json       # Command definitions
```

### Error Handling Pattern

```typescript
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Safe command execution",
  args: {
    command: tool.schema.string().describe("Command to execute")
  },
  async execute(args) {
    try {
      const { $ } = context
      const result = await $`${args.command}`.text()
      return { success: true, output: result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
})
```

## Code Examples

### Minimal Plugin Example

```javascript
// .opencode/plugin/example.js
export const ExamplePlugin = async ({ project, client, $, directory, worktree }) => {
  console.log("Plugin initialized!")

  return {
    "tool.execute.before": async (input, output) => {
      console.log(`Executing tool: ${input.tool}`)
    },
    "session.idle": async (input) => {
      console.log("Session completed!")
    }
  }
}

module.exports = { ExamplePlugin }
```

### FleetTools Plugin Implementation

```javascript
// .opencode/plugin/fleettools.js
const { exec } = require('child_process')

class FleetToolsPlugin {
  constructor() {
    this.name = 'FleetTools'
    this.version = '0.1.0'
  }

  async registerCommands(commands) {
    commands.registerCommand({
      id: 'fleet-status',
      name: '/fleet status',
      description: 'Show FleetTools status',
      handler: this.handleStatus.bind(this),
    })
  }

  async handleStatus() {
    const result = await this.execCommand('fleet status --json')
    return result
  }

  async execCommand(cmd) {
    return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) reject(error)
        else resolve(stdout)
      })
    })
  }

  showOutput(message) {
    console.log(message)
  }

  showError(message, error) {
    console.error(`Error: ${message}`, error)
  }
}

const plugin = new FleetToolsPlugin()

module.exports = {
  name: plugin.name,
  version: plugin.version,
  register: async (commands) => {
    await plugin.registerCommands(commands)
  },
}
```

### Custom Tool with Full Context

```typescript
// .opencode/tool/fleet-status.ts
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Get FleetTools system status",
  args: {
    verbose: tool.schema.boolean()
      .optional()
      .describe("Include detailed information")
  },
  async execute(args, context) {
    const { $ } = context

    // Execute fleet CLI
    const result = await $`fleet status --json`.text()

    try {
      const status = JSON.parse(result)

      if (args.verbose) {
        return {
          mode: status.mode,
          user: status.config?.fleet?.user_id,
          podman: status.podman,
          sync: status.sync,
          details: status
        }
      }

      return {
        mode: status.mode,
        user: status.config?.fleet?.user_id,
        podman: status.podman?.available
      }
    } catch (error) {
      return { error: "Failed to parse status", raw: result }
    }
  }
})
```

### Plugin with Hook Composition

```typescript
// .opencode/plugin/composed.ts
import { compose } from "opencode-plugin-compose"
import type { Plugin } from "@opencode-ai/plugin"

const envProtectionPlugin: Plugin = async (ctx) => {
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "read" && output.args?.filePath?.includes(".env")) {
        throw new Error("Access to .env files blocked")
      }
    }
  }
}

const notifyPlugin: Plugin = async ({ client }) => {
  return {
    "session.idle": async () => {
      await client.tui.showToast({
        body: { message: "Session completed", variant: "success" }
      })
    }
  }
}

const fleetToolsPlugin: Plugin = async ({ $ }) => {
  return {
    "tool.execute.before": async (input, output) => {
      // FleetTools-specific modifications
    }
  }
}

export const ComposedPlugin = compose([
  envProtectionPlugin,
  notifyPlugin,
  fleetToolsPlugin
])
```

## References

- [OpenCode Plugins Documentation](https://opencode.ai/docs/plugins)
- [OpenCode SDK Documentation](https://opencode.ai/docs/sdk)
- [OpenCode Commands Documentation](https://opencode.ai/docs/commands)
- [OpenCode Custom Tools Documentation](https://opencode.ai/docs/custom-tools)
- [@opencode-ai/plugin npm package](https://www.npmjs.com/package/@opencode-ai/plugin)
- [@opencode-ai/sdk npm package](https://www.npmjs.com/package/@opencode-ai/sdk)
- [Swarm Tools OpenCode Plugin](https://swarmtools.ai/docs/packages/opencode-plugin)
- [OpenCode GitHub Repository](https://github.com/anomalyco/opencode)

---

**Research Date**: January 3, 2026  
**OpenCode Version**: 1.0+  
**API Stability**: Stable (documented in official docs)
