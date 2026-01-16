# Configuration Guide

Complete guide to FleetTools configuration at global and project levels.

## Configuration Overview

FleetTools uses a hierarchical configuration system:

```
1. Global Config (~/.fleet/config.json)
2. Project Config (.fleet/config.json)
3. Environment Variables
4. Command-Line Options
```

Lower levels override higher levels.

---

## Global Configuration

Location: `~/.fleet/config.json`

### Structure

```json
{
  "version": "1.0.0",
  "squawk": {
    "port": 3002,
    "host": "localhost",
    "url": "http://localhost:3002"
  },
  "api": {
    "port": 3001,
    "host": "localhost",
    "url": "http://localhost:3001"
  },
  "logging": {
    "level": "info",
    "file": "~/.fleet/logs/fleet.log",
    "maxSize": "10MB",
    "maxFiles": 5
  },
  "agents": {
    "timeout": 300000,
    "max_concurrent": 5,
    "heartbeat_interval": 5000,
    "retry_attempts": 3,
    "retry_delay": 1000
  },
  "database": {
    "path": "~/.fleet/state.db",
    "backup": {
      "enabled": true,
      "interval": 3600000,
      "keep_count": 10
    }
  },
  "plugins": {
    "default_editor": "claude-code",
    "enabled": ["claude-code", "opencode"],
    "auto_connect": true
  },
  "network": {
    "timeout": 30000,
    "keep_alive": true,
    "max_retries": 3
  },
  "ui": {
    "theme": "dark",
    "status_bar": {
      "show_mission": true,
      "show_work_order": true,
      "show_agent": true
    }
  }
}
```

### Global Configuration Options

#### Squawk Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `squawk.port` | number | `3002` | Squawk service port |
| `squawk.host` | string | `"localhost"` | Squawk service host |
| `squawk.url` | string | `"http://localhost:3002"` | Squawk service URL |

#### API Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `api.port` | number | `3001` | API server port |
| `api.host` | string | `"localhost"` | API server host |
| `api.url` | string | `"http://localhost:3001"` | API server URL |

#### Logging Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `logging.level` | string | `"info"` | Log level (`debug`, `info`, `warn`, `error`) |
| `logging.file` | string | `"~/.fleet/logs/fleet.log"` | Log file path |
| `logging.maxSize` | string | `"10MB"` | Maximum log file size |
| `logging.maxFiles` | number | `5` | Maximum number of log files to keep |

#### Agent Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `agents.timeout` | number | `300000` | Agent timeout in milliseconds |
| `agents.max_concurrent` | number | `5` | Maximum concurrent agents |
| `agents.heartbeat_interval` | number | `5000` | Heartbeat interval in milliseconds |
| `agents.retry_attempts` | number | `3` | Number of retry attempts |
| `agents.retry_delay` | number | `1000` | Retry delay in milliseconds |

#### Database Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `database.path` | string | `"~/.fleet/state.db"` | Database file path |
| `database.backup.enabled` | boolean | `true` | Enable automatic backups |
| `database.backup.interval` | number | `3600000` | Backup interval in milliseconds |
| `database.backup.keep_count` | number | `10` | Number of backups to keep |

#### Plugin Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `plugins.default_editor` | string | `"claude-code"` | Default editor plugin |
| `plugins.enabled` | array | `["claude-code", "opencode"]` | Enabled plugins |
| `plugins.auto_connect` | boolean | `true` | Auto-connect plugins |

---

## Project Configuration

Location: `.fleet/config.json`

### Structure

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "agent_types": [
    "full-stack-developer",
    "code-reviewer",
    "security-scanner"
  ],
  "coordination": {
    "squawk_url": "http://localhost:3002",
    "heartbeat_interval": 5000
  },
  "workflow": {
    "auto_assign": true,
    "checkpoint_required": true,
    "auto_checkpoint": true
  },
  "rules": {
    "max_work_orders_per_mission": 10,
    "max_checkpoints_per_work_order": 5,
    "require_code_review": true,
    "security_scan_required": true
  },
  "notification": {
    "enabled": true,
    "channels": ["email", "slack"],
    "on": {
      "mission_completed": true,
      "work_order_assigned": true,
      "checkpoint_failed": true
    }
  },
  "environment": "development",
  "metadata": {
    "team": "engineering",
    "priority": "high",
    "tags": ["authentication", "security"]
  }
}
```

### Project Configuration Options

#### Basic Settings

| Setting | Type | Required | Description |
|---------|------|----------|-------------|
| `name` | string | Yes | Project name |
| `version` | string | Yes | Project version |
| `environment` | string | No | Environment (`development`, `staging`, `production`) |

#### Agent Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `agent_types` | array | `["full-stack-developer"]` | Available agent types |

#### Coordination Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `coordination.squawk_url` | string | `"http://localhost:3002"` | Squawk URL |
| `coordination.heartbeat_interval` | number | `5000` | Heartbeat interval (ms) |

#### Workflow Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `workflow.auto_assign` | boolean | `true` | Auto-assign work orders |
| `workflow.checkpoint_required` | boolean | `true` | Require checkpoints |
| `workflow.auto_checkpoint` | boolean | `true` | Auto-create checkpoints |

#### Rules Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `rules.max_work_orders_per_mission` | number | `10` | Max work orders |
| `rules.max_checkpoints_per_work_order` | number | `5` | Max checkpoints |
| `rules.require_code_review` | boolean | `true` | Require code review |
| `rules.security_scan_required` | boolean | `true` | Require security scan |

#### Notification Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `notification.enabled` | boolean | `true` | Enable notifications |
| `notification.channels` | array | `["email"]` | Notification channels |
| `notification.on.mission_completed` | boolean | `true` | Notify on mission complete |
| `notification.on.work_order_assigned` | boolean | `true` | Notify on assignment |
| `notification.on.checkpoint_failed` | boolean | `true` | Notify on checkpoint failure |

---

## Environment Variables

### Global Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLEET_SQUAWK_PORT` | Squawk service port | `3002` |
| `FLEET_SQUAWK_HOST` | Squawk service host | `localhost` |
| `FLEET_API_PORT` | API server port | `3001` |
| `FLEET_API_HOST` | API server host | `localhost` |
| `FLEET_LOG_LEVEL` | Logging level | `info` |
| `FLEET_CONFIG_PATH` | Global config path | `~/.fleet/config.json` |
| `FLEET_DB_PATH` | Global database path | `~/.fleet/state.db` |
| `FLEET_PLUGIN_DIR` | Plugin directory | `~/.fleet/plugins` |
| `FLEET_LOG_PATH` | Log file path | `~/.fleet/logs/fleet.log` |

### Project Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLEET_PROJECT_NAME` | Project name | From `.fleet/config.json` |
| `FLEET_ENVIRONMENT` | Environment | `development` |
| `FLEET_SQUAWK_URL` | Squawk URL | `http://localhost:3002` |
| `FLEET_API_URL` | API URL | `http://localhost:3001` |

### Agent Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLEET_AGENT_TIMEOUT` | Agent timeout (ms) | `300000` |
| `FLEET_MAX_CONCURRENT_AGENTS` | Max concurrent agents | `5` |
| `FLEET_HEARTBEAT_INTERVAL` | Heartbeat interval (ms) | `5000` |

---

## Configuration Commands

### View Configuration

```bash
# View global config
fleet config list

# View global config value
fleet config get squawk.port

# View project config
fleet config get --project workflow.auto_assign
```

### Set Configuration

```bash
# Set global config value
fleet config set logging.level debug
fleet config set agents.max_concurrent 10

# Set project config value
fleet config set --project workflow.auto_assign false
```

### Reset Configuration

```bash
# Reset global config to defaults
fleet config reset

# Reset specific setting
fleet config reset squawk.port
```

### Validate Configuration

```bash
# Validate global config
fleet config validate

# Validate project config
fleet config validate --project
```

---

## Configuration Best Practices

### 1. Use Environment-Specific Files

```
.fleet/
├── config.json          # Default configuration
├── config.development.json
├── config.staging.json
└── config.production.json
```

```bash
# Use specific environment config
FLEET_ENVIRONMENT=production fleet start
```

### 2. Sensitive Data

Never store sensitive data in config files. Use environment variables:

```json
{
  "api": {
    "url": "${FLEET_API_URL}"
  },
  "database": {
    "path": "${FLEET_DB_PATH}"
  }
}
```

### 3. Version Control

Exclude sensitive files from version control:

```gitignore
# .gitignore
.fleet/config.secrets.json
.fleet/state.db
.fleet/state.db-wal
.fleet/state.db-shm
```

### 4. Configuration Validation

```typescript
import { configSchema } from '@fleettools/shared';

function validateConfig(config: any): boolean {
  const result = configSchema.safeParse(config);
  if (!result.success) {
    console.error('Invalid configuration:', result.error);
    return false;
  }
  return true;
}
```

---

## Configuration Migrations

### Migrate from v0.x to v1.0

```bash
# Backup current config
cp ~/.fleet/config.json ~/.fleet/config.json.backup

# Run migration
fleet config migrate --from 0.9.0 --to 1.0.0

# Review changes
fleet config diff --backup ~/.fleet/config.json.backup
```

### Custom Migration Scripts

```typescript
// scripts/migrate-config.ts
import fs from 'node:fs';

const oldConfig = JSON.parse(fs.readFileSync('~/.fleet/config.json', 'utf-8'));

const newConfig = {
  ...oldConfig,
  version: '1.0.0',
  // Add new settings
  plugins: {
    enabled: oldConfig.plugins || ['claude-code'],
    auto_connect: oldConfig.autoConnect || true
  }
};

fs.writeFileSync('~/.fleet/config.json', JSON.stringify(newConfig, null, 2));
```

---

## Configuration Templates

### Minimal Project

```json
{
  "name": "my-project",
  "version": "1.0.0"
}
```

### Development Project

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "agent_types": ["full-stack-developer"],
  "environment": "development",
  "workflow": {
    "auto_assign": true,
    "checkpoint_required": false
  }
}
```

### Production Project

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "agent_types": [
    "full-stack-developer",
    "code-reviewer",
    "security-scanner",
    "deployment-engineer"
  ],
  "environment": "production",
  "coordination": {
    "heartbeat_interval": 10000
  },
  "workflow": {
    "auto_assign": false,
    "checkpoint_required": true,
    "auto_checkpoint": true
  },
  "rules": {
    "require_code_review": true,
    "security_scan_required": true
  },
  "notification": {
    "enabled": true,
    "channels": ["email", "slack"],
    "on": {
      "mission_completed": true,
      "work_order_assigned": true,
      "checkpoint_failed": true
    }
  }
}
```

---

## Troubleshooting

### Configuration Not Loading

```bash
# Check config file exists
ls -la ~/.fleet/config.json

# Check config file permissions
chmod 644 ~/.fleet/config.json

# Validate JSON syntax
cat ~/.fleet/config.json | jq empty
```

### Port Conflicts

```bash
# Check port usage
lsof -i :3001
lsof -i :3002

# Kill process
lsof -ti :3001 | xargs kill -9

# Change port
fleet config set squawk.port 3003
```

### Database Issues

```bash
# Remove lock files
rm ~/.fleet/state.db-wal
rm ~/.fleet/state.db-shm

# Rebuild database
fleet db rebuild
```

---

## Additional Resources

- [CLI Reference](./cli-reference.md#fleet-config)
- [Getting Started](./getting-started.md#configuration-options)
- [FAQ](./faq.md#configuration)

---

**Version**: [Current Version]
**Last Updated**: 2026-01-14
