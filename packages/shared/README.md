# @fleettools/fleet-shared

Shared utilities and configuration for FleetTools

## Installation

```bash
npm install @fleettools/fleet-shared
# or
bun install @fleettools/fleet-shared
```

## Features

### Runtime Detection
```typescript
import { detectRuntime, getRuntimeInfo } from '@fleettools/fleet-shared/runtime';

const runtime = detectRuntime(); // 'bun' | 'node' | 'unknown'
const info = getRuntimeInfo();
// {
//   type: 'bun',
//   version: '1.0.0',
//   platform: 'linux',
//   arch: 'x64',
//   supported: true,
//   isBun: true,
//   isNode: false
// }
```

### Configuration Management
```typescript
import { 
  loadGlobalConfig, 
  saveGlobalConfig,
  loadProjectConfig,
  isFleetProject 
} from '@fleettools/fleet-shared/config';

const globalConfig = loadGlobalConfig();
const projectConfig = loadProjectConfig();
const isProject = isFleetProject();
```

### Project Initialization
```typescript
import { 
  initializeProject, 
  getAvailableTemplates 
} from '@fleettools/fleet-shared/project';

const templates = getAvailableTemplates(); // ['basic', 'agent']
const config = initializeProject('./my-project', 'basic', {
  name: 'My Project',
  services: { squawk: { enabled: true } }
});
```

### Utilities
```typescript
import { 
  commandExists, 
  sleep, 
  retry,
  formatBytes,
  formatDuration,
  generateId 
} from '@fleettools/fleet-shared/utils';

const hasNode = commandExists('node');
await sleep(1000);
const result = await retry(() => riskyOperation(), 3);
```

## API Reference

### Runtime Detection

- `detectRuntime(): RuntimeType` - Detect current JavaScript runtime
- `getRuntimeInfo(): RuntimeInfo` - Get detailed runtime information
- `isSupportedRuntime(): boolean` - Check if runtime is supported
- `getPreferredRuntime(): 'bun' | 'node'` - Get preferred runtime

### Configuration

- `loadGlobalConfig(): FleetGlobalConfig` - Load global configuration
- `saveGlobalConfig(config: FleetGlobalConfig): void` - Save global configuration
- `loadProjectConfig(): FleetProjectConfig | null` - Load project configuration
- `saveProjectConfig(config: FleetProjectConfig): void` - Save project configuration
- `isFleetProject(): boolean` - Check if directory is a FleetTools project

### Project Management

- `initializeProject(path, template, config): FleetProjectConfig` - Initialize new project
- `getAvailableTemplates(): string[]` - Get available project templates
- `getTemplateInfo(name): ProjectTemplate | null` - Get template information
- `isValidProject(path): boolean` - Validate project structure
- `getProjectRoot(): string | null` - Find project root directory

### Utilities

- `commandExists(command): boolean` - Check if command exists in PATH
- `sleep(ms): Promise<void>` - Sleep for specified milliseconds
- `retry(fn, maxAttempts, baseDelay): Promise<T>` - Retry with exponential backoff
- `formatBytes(bytes): string` - Format bytes to human readable string
- `formatDuration(ms): string` - Format duration to human readable string
- `generateId(length): string` - Generate random ID
- `deepClone(obj): T` - Deep clone object
- `isPromise(value): boolean` - Check if value is a promise
- `EventEmitter` - Simple event emitter class

## Types

### RuntimeInfo
```typescript
interface RuntimeInfo {
  type: RuntimeType;
  version: string;
  platform: string;
  arch: string;
  supported: boolean;
  isBun: boolean;
  isNode: boolean;
}
```

### FleetGlobalConfig
```typescript
interface FleetGlobalConfig {
  version: string;
  defaultRuntime: 'bun' | 'node';
  telemetry: {
    enabled: boolean;
    endpoint?: string;
  };
  services: {
    autoStart: boolean;
    squawkPort: number;
    apiPort: number;
  };
  paths: {
    configDir: string;
    dataDir: string;
    logDir: string;
  };
}
```

### FleetProjectConfig
```typescript
interface FleetProjectConfig {
  name: string;
  version: string;
  fleet: {
    version: string;
    mode: 'local' | 'synced';
    workspaceId?: string;
  };
  services: {
    squawk: {
      enabled: boolean;
      port: number;
      dataDir: string;
    };
    api: {
      enabled: boolean;
      port: number;
    };
    postgres: {
      enabled: boolean;
      provider: 'podman' | 'docker' | 'local';
      port: number;
      container?: string;
      dataDir: string;
    };
  };
  plugins: {
    claudeCode: boolean;
    openCode: boolean;
  };
}
```

## Development

```bash
git clone https://github.com/v1truvius/fleettools.git
cd fleettools/packages/fleet-shared
bun install
bun run dev  # Development mode with watch
```

## Testing

```bash
bun test
bun run test:coverage
```

## License

MIT License - see LICENSE file for details.