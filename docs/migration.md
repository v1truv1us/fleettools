# Migration Guide

Guide for migrating from legacy FleetTools setup to the current version.

## Overview

This guide helps you migrate from the previous FleetTools architecture to the new monorepo structure with Bun runtime and consolidated API server.

## Migration Checklist

- [ ] Backup existing data
- [ ] Install new dependencies
- [ ] Migrate configuration
- [ ] Update project structure
- [ ] Migrate database
- [ ] Update API calls
- [ ] Update CLI commands
- [ ] Test migration
- [ ] Update plugins

---

## Step 1: Backup Existing Data

Before migrating, backup all critical data:

```bash
# Backup configuration
cp ~/.fleet/config.json ~/.fleet/config.json.backup
cp .fleet/config.json .fleet/config.json.backup

# Backup database
cp ~/.fleet/state.db ~/.fleet/state.db.backup
cp .fleet/state.db .fleet/state.db.backup

# Backup projects
tar -czf fleet-backup-$(date +%Y%m%d).tar.gz ~/.fleet .fleet

# Verify backup
ls -lh ~/.fleet/config.json.backup
ls -lh .fleet/state.db.backup
```

---

## Step 2: Install New Dependencies

### Install Bun (if not already installed)

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
# Should be >=1.0.0
```

### Install FleetTools

```bash
# Clone new repository
git clone https://github.com/yourusername/fleettools.git
cd fleettools

# Install dependencies
bun install

# Build all workspaces
bun run build
```

---

## Step 3: Migrate Configuration

### Old Configuration Structure

```json
// ~/.fleet/config.json (old)
{
  "squawk": {
    "port": 3002
  },
  "flightline": {
    "port": 3000
  },
  "api": {
    "port": 3001
  }
}
```

### New Configuration Structure

```json
// ~/.fleet/config.json (new)
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
    "file": "~/.fleet/logs/fleet.log"
  },
  "agents": {
    "timeout": 300000,
    "max_concurrent": 5,
    "heartbeat_interval": 5000
  }
}
```

### Automatic Migration

```bash
# Run migration tool
bun run fleet migrate --from 0.9.0 --to 1.0.0

# Review changes
fleet config diff
```

### Manual Migration

If automatic migration fails, update config manually:

```bash
# Edit global config
vim ~/.fleet/config.json

# Edit project config
vim .fleet/config.json

# Validate config
fleet config validate
```

---

## Step 4: Update Project Structure

### Old Structure

```
fleettools/
├── cli/                  # Legacy CLI
├── squawk/               # Squawk service
├── flightline/            # Flightline service (separate)
└── plugins/              # Plugins
```

### New Structure

```
fleettools/
├── cli/                  # Legacy CLI (backup)
├── squawk/               # Squawk service
├── server/api/           # Consolidated API (Flightline + Squawk)
├── plugins/             # Plugins
└── packages/            # Shared packages
    ├── fleet-cli/       # Global CLI
    └── fleet-shared/    # Shared utilities
```

### Update Project Files

```bash
# If using old project structure
# Update package.json scripts

# Old scripts
{
  "scripts": {
    "start:squawk": "cd squawk && node src/index.js",
    "start:flightline": "cd flightline && node src/index.js",
    "start:api": "cd api && node src/index.js"
  }
}

# New scripts
{
  "scripts": {
    "start": "bun run fleet start",
    "dev": "bun run build && cd server/api && bun run dev",
    "build": "bun run build"
  }
}
```

---

## Step 5: Migrate Database

### Old Database Schema

```sql
-- Old schema might have different structure
CREATE TABLE missions (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at TEXT
);
```

### New Database Schema

```sql
-- New schema with additional fields
CREATE TABLE missions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,  -- pending|in_progress|completed
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE work_orders (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_agent TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE checkpoints (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL,
  description TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
);
```

### Database Migration Script

```typescript
// scripts/migrate-db.ts
import Database from 'bun:sqlite';

function migrateDatabase(oldPath: string, newPath: string) {
  const oldDb = new Database(oldPath);
  const newDb = new Database(newPath);

  // Create new schema
  newDb.exec(`
    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      mission_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      assigned_agent TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (mission_id) REFERENCES missions(id)
    );

    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY,
      work_order_id TEXT NOT NULL,
      description TEXT NOT NULL,
      passed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TEXT NOT NULL,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
    );
  `);

  // Migrate missions
  const missions = oldDb.query('SELECT * FROM missions').all();
  const insertMission = newDb.prepare(`
    INSERT INTO missions (id, title, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const mission of missions) {
    insertMission.run(
      mission.id,
      mission.title,
      mission.description || null,
      mission.status || 'pending',
      mission.created_at,
      mission.created_at
    );
  }

  console.log(`Migrated ${missions.length} missions`);
  oldDb.close();
  newDb.close();
}

// Usage
migrateDatabase(
  '~/.fleet/state.db.backup',
  '~/.fleet/state.db'
);
```

### Run Migration

```bash
# Run migration script
bun run scripts/migrate-db.ts

# Verify migration
sqlite3 ~/.fleet/state.db
sqlite> .schema
sqlite> SELECT COUNT(*) FROM missions;
```

---

## Step 6: Update API Calls

### Old API Endpoints

```bash
# Flightline (separate)
http://localhost:3000/api/v1/missions
http://localhost:3000/api/v1/work-orders

# API server
http://localhost:3001/api/v1/resource

# Squawk
http://localhost:3002/api/v1/mailbox
```

### New API Endpoints

```bash
# Consolidated API (Flightline + Squawk)
http://localhost:3001/api/v1/flightline/missions
http://localhost:3001/api/v1/flightline/work-orders
http://localhost:3001/api/v1/squawk/mailbox
http://localhost:3001/api/v1/squawk/cursor
http://localhost:3001/api/v1/squawk/locks

# Squawk (still available separately)
http://localhost:3002/squawk/v1/mailbox
http://localhost:3002/squawk/v1/cursor
```

### Update API Calls in Code

```typescript
// Old code
const response = await fetch('http://localhost:3000/api/v1/missions');

// New code
const response = await fetch('http://localhost:3001/api/v1/flightline/missions');

// Or using Squawk
const response = await fetch('http://localhost:3001/api/v1/squawk/mailbox/agent-id/messages');
```

### Update Configuration in Applications

```json
// Old config
{
  "flightline_url": "http://localhost:3000/api/v1",
  "squawk_url": "http://localhost:3002/api/v1"
}

// New config
{
  "api_url": "http://localhost:3001/api/v1",
  "squawk_url": "http://localhost:3002/squawk/v1"
}
```

---

## Step 7: Update CLI Commands

### Old CLI Commands

```bash
# Old CLI structure
fleet init <project>
fleet-squawk start
fleet-flightline start
fleet-api start
```

### New CLI Commands

```bash
# New unified CLI
fleet init <project>
fleet start                    # Start all services
fleet status                   # Check status
fleet mission create <title>    # Create mission
fleet work-order list           # List work orders
```

### Update Shell Aliases

```bash
# Old aliases
alias fs='fleet-squawk'
alias ff='fleet-flightline'

# New aliases
alias f='fleet'
alias fs='fleet status'
alias fm='fleet mission'
alias fwo='fleet work-order'
```

---

## Step 8: Update Plugins

### Plugin API Changes

```typescript
// Old plugin API
import { FleetPlugin } from 'fleet-tools-plugin';

class MyPlugin extends FleetPlugin {
  async connect() {
    // Old connection logic
  }
}
```

```typescript
// New plugin API
import { FleetPlugin, PluginConfig } from '@fleettools/plugin-api';

class MyPlugin extends FleetPlugin {
  constructor(config: PluginConfig) {
    super(config);
  }

  async activate() {
    // New activation logic
    await this.connectToSquawk();
    this.registerCommands();
  }

  async deactivate() {
    await this.disconnectFromSquawk();
  }
}
```

### Update Plugin Dependencies

```json
// Old package.json
{
  "dependencies": {
    "fleet-tools-plugin": "^0.9.0"
  }
}

// New package.json
{
  "dependencies": {
    "@fleettools/plugin-api": "^1.0.0"
  }
}
```

### Rebuild Plugins

```bash
cd plugins/claude-code
bun install
bun run build

cd ../../plugins/opencode
bun install
bun run build
```

---

## Step 9: Test Migration

### Functional Testing

```bash
# Start services
fleet start

# Test CLI
fleet init test-project
cd test-project
fleet mission create "Test Mission"
fleet status

# Test API
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3001/api/v1/flightline/missions

# Test plugins
# Verify editor plugins connect correctly
```

### Data Verification

```bash
# Verify data migrated correctly
sqlite3 ~/.fleet/state.db

sqlite> SELECT COUNT(*) FROM missions;
sqlite> SELECT COUNT(*) FROM work_orders;
sqlite> SELECT * FROM missions LIMIT 5;
sqlite> .quit

# Compare with backup
sqlite3 ~/.fleet/state.db.backup
sqlite> SELECT COUNT(*) FROM missions;
sqlite> .quit
```

### Performance Testing

```bash
# Test API response times
time curl http://localhost:3001/api/v1/flightline/missions

# Test database queries
time fleet mission list
```

---

## Step 10: Rollback (if needed)

If migration fails, rollback using backup:

```bash
# Stop new services
fleet stop

# Restore configuration
cp ~/.fleet/config.json.backup ~/.fleet/config.json
cp .fleet/config.json.backup .fleet/config.json

# Restore database
cp ~/.fleet/state.db.backup ~/.fleet/state.db
cp .fleet/state.db.backup .fleet/state.db

# Restore old installation
cd ..
git checkout old-version
cd fleettools
npm install

# Start old services
fleet-squawk start
fleet-flightline start
```

---

## Common Migration Issues

### Issue 1: Port Already in Use

```bash
# Check ports
lsof -i :3001
lsof -i :3002

# Kill processes or change ports
fleet config set api.port 8080
fleet config set squawk.port 8081
```

### Issue 2: Database Migration Fails

```bash
# Backup again
cp ~/.fleet/state.db ~/.fleet/state.db.backup2

# Check database integrity
sqlite3 ~/.fleet/state.db "PRAGMA integrity_check;"

# Manual migration if needed
bun run scripts/migrate-db-manual.ts
```

### Issue 3: Plugin Connection Fails

```bash
# Check Squawk is running
curl http://localhost:3002/health

# Check plugin configuration
fleet config get plugins.default_editor

# Restart plugins
cd plugins/claude-code
bun run dev
```

### Issue 4: Configuration Validation Errors

```bash
# Validate config
fleet config validate

# Fix errors manually
vim ~/.fleet/config.json

# Reset to defaults (careful!)
fleet config reset
```

---

## Migration Checklist Complete

After completing all steps:

- [ ] All services start successfully
- [ ] Configuration is valid
- [ ] Data migrated correctly
- [ ] CLI commands work
- [ ] API endpoints respond
- [ ] Plugins connect
- [ ] Tests pass
- [ ] Performance is acceptable

---

## Post-Migration Tasks

### Clean Up

```bash
# Remove old files (after successful migration)
rm ~/.fleet/config.json.backup
rm .fleet/config.json.backup
rm ~/.fleet/state.db.backup
rm .fleet/state.db.backup

# Uninstall old packages
npm uninstall -g fleet-tools-plugin

# Update documentation
# Update team on new architecture
```

### Monitor Performance

```bash
# Monitor service logs
tail -f ~/.fleet/logs/fleet.log

# Monitor API performance
curl http://localhost:3001/health

# Monitor database performance
sqlite3 ~/.fleet/state.db "PRAGMA cache_size;"
```

### Update Documentation

```bash
# Update internal docs
# Update API documentation
# Update onboarding guides
# Create migration guide for future users
```

---

## Support

If you encounter issues during migration:

- Check [FAQ](./faq.md) for common problems
- Review [Architecture](./architecture.md) for changes
- Open issue on GitHub: https://github.com/v1truvius/fleettools/issues

---

**Version**: [Current Version]
**Last Updated**: 2026-01-14
