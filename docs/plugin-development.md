# Plugin Development Guide

This guide explains how to create custom FleetTools plugins for integrating with editors and development environments.

## Overview

FleetTools plugins bridge the gap between FleetTools coordination system and your development environment. They handle:

- **Connection Management**: Connect to Squawk service
- **Command Forwarding**: Forward editor commands to coordination system
- **Status Display**: Show agent status and progress
- **Real-time Updates**: Receive updates via Squawk

## Architecture

```
┌──────────────┐
│   Editor     │
│              │
│  (Your IDE)  │
└──────┬───────┘
       │
       │ Plugin API
       v
┌──────────────┐
│   Plugin     │
│   Layer      │
│              │
│  (Your Code) │
└──────┬───────┘
       │
       │ Squawk Protocol
       v
┌──────────────┐
│   Squawk     │
│   Service    │
└──────────────┘
```

## Getting Started

### Project Structure

```
my-editor-plugin/
├── src/
│   ├── index.ts          # Plugin entry point
│   ├── connection.ts     # Squawk connection management
│   ├── commands.ts       # Editor command handling
│   └── ui.ts            # UI updates and display
├── package.json
└── tsconfig.json
```

### Basic Template

```typescript
// src/index.ts
import { FleetPlugin, PluginConfig } from '@fleettools/plugin-api';

export default class MyEditorPlugin extends FleetPlugin {
  constructor(config: PluginConfig) {
    super(config);
  }

  async activate() {
    console.log('MyEditorPlugin activated');
    await this.connectToSquawk();
    this.registerCommands();
    this.setupStatusDisplay();
  }

  async deactivate() {
    await this.disconnectFromSquawk();
  }
}
```

## Plugin API

### Core Methods

```typescript
abstract class FleetPlugin {
  // Lifecycle
  abstract activate(): Promise<void>;
  abstract deactivate(): Promise<void>;

  // Connection Management
  connectToSquawk(config?: ConnectionConfig): Promise<void>;
  disconnectFromSquawk(): Promise<void>;
  isConnected(): boolean;

  // Command Handling
  registerCommand(name: string, handler: CommandHandler): void;
  executeCommand(name: string, args: any[]): Promise<any>;

  // Squawk Integration
  sendMailboxMessage(agentId: string, message: Message): Promise<void>;
  getCursor(resourceId: string): Promise<Cursor>;
  updateCursor(resourceId: string, value: any): Promise<void>;
  acquireLock(resourceId: string, holderId: string): Promise<void>;
  releaseLock(resourceId: string, holderId: string): Promise<void>;

  // UI Updates
  showStatus(status: PluginStatus): void;
  showError(error: Error): void;
  log(message: string, level: 'info' | 'warn' | 'error'): void;
}
```

### Configuration

```typescript
interface PluginConfig {
  name: string;
  version: string;
  squawkUrl: string;
  editor: {
    name: string;
    version: string;
  };
  options?: {
    autoConnect?: boolean;
    heartbeatInterval?: number;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };
}
```

## Connection Management

### Connecting to Squawk

```typescript
// src/connection.ts
export class ConnectionManager {
  private squawkUrl: string;
  private connected: boolean = false;

  constructor(squawkUrl: string) {
    this.squawkUrl = squawkUrl;
  }

  async connect(): Promise<void> {
    try {
      const response = await fetch(`${this.squawkUrl}/health`);
      if (response.ok) {
        this.connected = true;
        console.log('Connected to Squawk');
      } else {
        throw new Error('Squawk health check failed');
      }
    } catch (error) {
      console.error('Failed to connect to Squawk:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('Disconnected from Squawk');
  }

  isConnected(): boolean {
    return this.connected;
  }
}
```

### Heartbeat Mechanism

```typescript
export class HeartbeatManager {
  private interval: number;
  private timer: Timer | null = null;

  constructor(interval: number = 5000) {
    this.interval = interval;
  }

  start(callback: () => Promise<void>): void {
    this.timer = setInterval(callback, this.interval);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
```

## Command Handling

### Registering Commands

```typescript
// src/commands.ts
import type { CommandHandler } from '@fleettools/plugin-api';

export class CommandRegistry {
  private commands: Map<string, CommandHandler> = new Map();

  register(name: string, handler: CommandHandler): void {
    this.commands.set(name, handler);
  }

  async execute(name: string, args: any[]): Promise<any> {
    const handler = this.commands.get(name);
    if (!handler) {
      throw new Error(`Command not found: ${name}`);
    }
    return await handler(...args);
  }
}
```

### Example Commands

```typescript
// List missions
const listMissions: CommandHandler = async () => {
  const response = await fetch('http://localhost:3001/api/v1/flightline/missions');
  const data = await response.json();
  return data.data.missions;
};

// Create mission
const createMission: CommandHandler = async (title: string) => {
  const response = await fetch('http://localhost:3001/api/v1/flightline/missions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  const data = await response.json();
  return data.data;
};

// Assign work order
const assignWorkOrder: CommandHandler = async (workOrderId: string, agentType: string) => {
  const response = await fetch(
    `http://localhost:3001/api/v1/flightline/work-orders/${workOrderId}/assign`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_type: agentType })
    }
  );
  const data = await response.json();
  return data.data;
};
```

## Squawk Integration

### Sending Mailbox Messages

```typescript
async function sendWorkAssignment(agentId: string, workOrderId: string) {
  const message = {
    type: 'work_assignment',
    from: 'my-editor',
    payload: {
      work_order_id: workOrderId,
      priority: 'high'
    }
  };

  const response = await fetch(`http://localhost:3002/squawk/v1/mailbox/${agentId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });

  return await response.json();
}
```

### Reading Mailbox

```typescript
async function getMessages(agentId: string, unreadOnly: boolean = true) {
  const response = await fetch(
    `http://localhost:3002/squawk/v1/mailbox/${agentId}/messages?unread=${unreadOnly}`
  );
  const data = await response.json();
  return data.data.messages;
}
```

### Cursor Management

```typescript
async function updateWorkOrderProgress(workOrderId: string, progress: number) {
  const cursorValue = {
    progress: progress,
    updated_at: new Date().toISOString()
  };

  const response = await fetch(`http://localhost:3002/squawk/v1/cursor/${workOrderId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cursor_value: JSON.stringify(cursorValue) })
  });

  return await response.json();
}
```

### Lock Management

```typescript
async function acquireResourceLock(resourceId: string, holderId: string) {
  const response = await fetch(`http://localhost:3002/squawk/v1/locks/${resourceId}/acquire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      holder_id: holderId,
      ttl: 60000  // 1 minute TTL
    })
  });

  return await response.json();
}
```

## UI Integration

### Status Display

```typescript
// src/ui.ts
export class StatusDisplay {
  private statusBar: any; // Editor-specific status bar
  private outputChannel: any; // Editor-specific output channel

  showStatus(status: {
    mission?: string;
    workOrder?: string;
    agent?: string;
    progress?: number;
  }): void {
    const message = [
      status.mission ? `Mission: ${status.mission}` : null,
      status.workOrder ? `Task: ${status.workOrder}` : null,
      status.agent ? `Agent: ${status.agent}` : null,
      status.progress !== undefined ? `Progress: ${status.progress}%` : null
    ].filter(Boolean).join(' | ');

    this.updateStatusBar(message);
  }

  showError(error: Error): void {
    this.outputChannel.appendLine(`ERROR: ${error.message}`);
    this.outputChannel.show();
  }

  log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }
}
```

### Real-time Updates

```typescript
class UpdateManager {
  private subscription: any;
  private onMessage: (message: any) => void;

  async subscribe(agentId: string, onMessage: (message: any) => void) {
    this.onMessage = onMessage;
    // Poll for new messages (or use WebSocket when available)
    this.poll(agentId);
  }

  private async poll(agentId: string) {
    while (true) {
      const messages = await getMessages(agentId, true);
      messages.forEach(msg => this.onMessage(msg));
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}
```

## Example: VS Code Plugin

```typescript
// src/vscode-plugin.ts
import * as vscode from 'vscode';
import { FleetPlugin } from '@fleettools/plugin-api';

export class VSCodeFleetPlugin extends FleetPlugin {
  private statusBarItem: vscode.StatusBarItem;
  private outputChannel: vscode.OutputChannel;

  constructor(config: PluginConfig) {
    super(config);
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    this.outputChannel = vscode.window.createOutputChannel('FleetTools');
  }

  async activate() {
    super.activate();
    this.registerCommands();
    this.statusBarItem.show();
  }

  registerCommands() {
    vscode.commands.registerCommand('fleet.listMissions', async () => {
      const missions = await this.executeCommand('listMissions');
      vscode.window.showQuickPick(missions.map((m: any) => ({
        label: m.title,
        description: m.status
      })));
    });

    vscode.commands.registerCommand('fleet.createMission', async () => {
      const title = await vscode.window.showInputBox({
        prompt: 'Enter mission title'
      });
      if (title) {
        const mission = await this.executeCommand('createMission', [title]);
        vscode.window.showInformationMessage(`Created: ${mission.id}`);
      }
    });
  }

  showStatus(status: any) {
    this.statusBarItem.text = `$(rocket) Fleet: ${status.mission || 'Idle'}`;
    this.outputChannel.appendLine(JSON.stringify(status));
  }
}
```

## Example: Sublime Text Plugin

```python
# src/sublime_plugin.py
import sublime
import sublime_plugin
import json
import http.client

class FleetToolsCommand(sublime_plugin.ApplicationCommand):
    def __init__(self):
        self.squawk_url = "localhost:3002"
        self.api_url = "localhost:3001"

    def run(self, edit, action="list"):
        if action == "list":
            self.list_missions()
        elif action == "create":
            self.create_mission()

    def list_missions(self):
        conn = http.client.HTTPConnection(self.api_url)
        conn.request("GET", "/api/v1/flightline/missions")
        response = conn.getresponse()
        data = json.loads(response.read().decode())

        missions = [m["title"] for m in data["data"]["missions"]]
        sublime.active_window().show_quick_panel(missions, lambda i: None)

    def create_mission(self):
        window = sublime.active_window()
        window.show_input_panel("Mission title:", "", self.on_mission_title, None, None)

    def on_mission_title(self, title):
        if not title:
            return
        # Create mission logic here
        sublime.message_dialog(f"Created mission: {title}")
```

## Testing

### Unit Tests

```typescript
// tests/connection.test.ts
import { ConnectionManager } from '../src/connection';

describe('ConnectionManager', () => {
  it('should connect to Squawk', async () => {
    const manager = new ConnectionManager('http://localhost:3002');
    await manager.connect();
    expect(manager.isConnected()).toBe(true);
  });

  it('should disconnect from Squawk', async () => {
    const manager = new ConnectionManager('http://localhost:3002');
    await manager.connect();
    await manager.disconnect();
    expect(manager.isConnected()).toBe(false);
  });
});
```

### Integration Tests

```typescript
// tests/integration.test.ts
import { MyEditorPlugin } from '../src/index';

describe('MyEditorPlugin Integration', () => {
  it('should activate and connect', async () => {
    const plugin = new MyEditorPlugin({
      name: 'test-plugin',
      version: '1.0.0',
      squawkUrl: 'http://localhost:3002',
      editor: { name: 'test', version: '1.0.0' }
    });

    await plugin.activate();
    expect(plugin.isConnected()).toBe(true);

    await plugin.deactivate();
    expect(plugin.isConnected()).toBe(false);
  });
});
```

## Publishing

### Package.json

```json
{
  "name": "my-editor-fleet-plugin",
  "version": "1.0.0",
  "description": "FleetTools plugin for My Editor",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "bun test"
  },
  "dependencies": {
    "@fleettools/plugin-api": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  },
  "peerDependencies": {
    "my-editor": "^1.0.0"
  }
}
```

### Publishing Steps

```bash
# Build
bun run build

# Publish
npm publish

# Or if using registry
npm publish --registry https://registry.example.com
```

## Best Practices

### 1. Error Handling

```typescript
async safeExecute<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    this.log(`Error: ${error}`, 'error');
    return fallback;
  }
}
```

### 2. Debounce Commands

```typescript
import { debounce } from 'lodash';

const debouncedUpdate = debounce((value: any) => {
  updateWorkOrderProgress('wo-123', value);
}, 500);
```

### 3. Cache Responses

```typescript
class CacheManager {
  private cache: Map<string, { data: any, timestamp: number }> = new Map();
  private ttl = 5000;

  async getOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }
}
```

### 4. Graceful Degradation

```typescript
async connectWithRetry(retries: number = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await this.connectToSquawk();
      return true;
    } catch (error) {
      if (i === retries - 1) {
        this.showError(new Error('Failed to connect after retries'));
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return false;
}
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to Squawk
```typescript
// Check if Squawk is running
const response = await fetch('http://localhost:3002/health');
if (!response.ok) {
  console.error('Squawk is not running');
}
```

### Command Not Found

**Problem**: Command not registered
```typescript
// Verify command is registered before executing
if (!this.commands.has(name)) {
  throw new Error(`Command ${name} is not registered`);
}
```

### Performance Issues

**Problem**: Slow updates
```typescript
// Use debouncing or throttling
import { throttle } from 'lodash';

const throttledUpdate = throttle((value: any) => {
  updateCursor('resource-123', value);
}, 1000);
```

## Resources

- [Plugin API Reference](https://github.com/v1truvius/fleettools/tree/main/packages/plugin-api)
- [Example Plugins](https://github.com/v1truvius/fleettools/tree/main/plugins)
- [Squawk API Documentation](./api-reference.md#squawk-api)

---

**Version**: [Current Version]
**Last Updated**: 2026-01-14
