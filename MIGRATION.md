# FleetTools Architecture Migration

This document outlines the migration from the legacy FleetTools architecture to the new SwarmTools-matching architecture.

## Overview

The new architecture introduces:

1. **packages/fleet-cli** - Global CLI with `fleet` command
2. **packages/fleet-shared** - Shared utilities and configuration
3. **Per-project bootstrapping** - `fleet init/start/config` commands
4. **Dual runtime support** - Bun (default) and Node.js compatibility
5. **Publishable packages** - For npm/bun installation

## Migration Steps

### 1. Install Dependencies

```bash
# Install new dependencies
bun install

# Build new packages
bun run build:packages
```

### 2. Update Global Installation

For users with the old CLI:

```bash
# Uninstall old CLI (if globally installed)
npm uninstall -g @fleettools/cli

# Install new CLI
npm install -g @fleettools/fleet-cli
# or
bun install -g @fleettools/fleet-cli
```

### 3. Project Migration

For existing FleetTools projects:

```bash
# Your existing project still works with the old CLI
cd your-project

# Initialize with new CLI (optional, creates fleet.yaml)
fleet init --template basic --yes

# Review and migrate configuration
fleet config list
```

### 4. Configuration Changes

#### Old Configuration (.fleet/config.json)
```json
{
  "mode": "local",
  "services": {
    "postgres": {
      "enabled": true,
      "provider": "podman"
    }
  }
}
```

#### New Configuration (fleet.yaml)
```yaml
name: "my-project"
version: "1.0.0"
fleet:
  version: "0.1.0"
  mode: "local"
services:
  squawk:
    enabled: true
    port: 3000
    dataDir: "./.fleet/squawk"
  api:
    enabled: true
    port: 3001
  postgres:
    enabled: false
    provider: "podman"
    port: 5432
    dataDir: "./.fleet/postgres"
plugins:
  claudeCode: true
  openCode: true
```

### 5. Command Changes

| Old Command | New Command | Description |
|-------------|---------------|-------------|
| `fleettools status` | `fleet status` | Show status |
| `fleettools setup` | `fleet config --global edit` | Global setup |
| `fleettools services up` | `fleet start` | Start services |
| `fleettools services down` | `fleet stop` | Stop services |

### 6. Path Changes

| Old Path | New Path | Purpose |
|-----------|------------|---------|
| `~/.config/fleet/fleet.json` | `~/.config/fleet/config.yaml` | Global config |
| `.fleet/config.json` | `fleet.yaml` | Project config |
| `.fleet/data/` | `.fleet/squawk/` | Squawk data |

## Breaking Changes

### For End Users

1. **Command Name Change**: `fleettools` → `fleet`
2. **Configuration Format**: JSON → YAML
3. **Configuration Location**: Moved from `.fleet/` to project root
4. **Installation Method**: Now installable from npm/bun registry

### For Developers

1. **Package Structure**: Code moved from `cli/` to `packages/fleet-cli/`
2. **Shared Code**: New `packages/fleet-shared/` package
3. **Build System**: Updated to build packages independently
4. **Dependencies**: Now uses workspace dependencies

## Rollback Plan

If issues occur during migration:

1. **Keep Old CLI**: Don't uninstall the old CLI immediately
2. **Backup Config**: Copy `.fleet/` directory before migration
3. **Gradual Migration**: Test new CLI in parallel with old
4. **Rollback**: Reinstall old CLI if needed

```bash
# Rollback to old CLI
npm install -g @fleettools/cli@legacy
# Restore configuration from backup
cp -r .fleet.backup .fleet
```

## Testing Migration

### Test New CLI

```bash
# Test CLI installation
fleet --help

# Test project initialization
mkdir test-project && cd test-project
fleet init --template basic --yes

# Test service management
fleet start
fleet status
fleet stop
```

### Verify Compatibility

```bash
# Old CLI should still work in existing projects
fleettools status

# New CLI should also work in existing projects
fleet status
```

## Timeline

1. **Phase 1** - Build new packages (Complete)
2. **Phase 2** - Update documentation (In Progress)
3. **Phase 3** - Publish new packages
4. **Phase 4** - Migration period (4 weeks)
5. **Phase 5** - Deprecate old CLI

## Support

For migration issues:

1. Check this documentation first
2. Review [Migration FAQ](FAQ.md)
3. Open GitHub issue with `migration` label
4. Join Discord/Slack for real-time help

## FAQ

**Q: Do I need to migrate immediately?**
A: No, both CLIs will work during migration period.

**Q: Will my existing projects continue to work?**
A: Yes, existing projects work with both CLI versions.

**Q: How do I report migration issues?**
A: Open GitHub issues with detailed reproduction steps.

**Q: Can I use both CLIs side-by-side?**
A: Yes, install both with different names if needed.