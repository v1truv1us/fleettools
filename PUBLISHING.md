# FleetTools Automated Publishing Guide

## Overview

FleetTools uses a comprehensive automated changelog and publishing system that handles version bumping, changelog generation, and multi-package publishing based on conventional commits.

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Make a Commit

Use the interactive commit helper for conventional commits:

```bash
bun run commit
```

Or manually follow the format:
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 3. Publish Changes

```bash
bun run publish
```

This single command handles:
- ✅ Version bump detection based on commits
- ✅ Automatic changelog generation  
- ✅ Building all workspaces
- ✅ Publishing packages in dependency order
- ✅ Git tags and push

## Commit Types

| Type | Description | Bump Level |
|------|-------------|------------|
| `feat` | New feature | minor |
| `fix` | Bug fix | patch |
| `perf` | Performance improvement | patch |
| `docs` | Documentation | none |
| `style` | Code formatting | none |
| `refactor` | Code refactoring | none |
| `test` | Test changes | none |
| `build` | Build system | none |
| `ci` | CI/CD changes | none |
| `chore` | Maintenance | none |
| `revert` | Revert commit | patch |

### Examples

```bash
feat: add new API endpoint for user management
fix(cli): resolve version detection bug in scripts
docs: update installation guide with new prerequisites
refactor(api): simplify response handling middleware
perf: optimize database query for large datasets
```

## Publishing Workflow

### Automated Publishing (`bun run publish`)

The automated publishing script:

1. **Detects Changes**: Checks for source code changes since last publish
2. **Builds Packages**: Compiles all TypeScript workspaces
3. **Updates Dependencies**: Syncs internal package versions
4. **Bumps Version**: Automatically determines version bump type
5. **Generates Changelog**: Updates CHANGELOG.md from commit history
6. **Publishes Packages**: Publishes in dependency order:
   - Tier 1: `@fleettools/core`
   - Tier 2: `@fleettools/shared`, `@fleettools/db`
   - Tier 3: `@fleettools/events`, `@fleettools/squawk`, `@fleettools/server-api`
   - Tier 4: `@fleettools/cli`
   - Plugins: `@fleettools/claude-code-plugin`, `@fleettools/opencode-plugin`
7. **Creates Git Tag**: Tags and pushes the release

### Manual Publishing Commands

For fine-grained control:

```bash
# Bump versions manually
bun run version:patch    # Bump patch version
bun run version:minor    # Bump minor version  
bun run version:major    # Bump major version

# Generate changelog only
bun run changelog

# Dry run publishing
bun run publish:dry-run

# Publish specific tiers
bun run publish:tier1    # Core packages only
bun run publish:plugins  # Plugins only
```

## Configuration Files

- `.czrc` - Commitizen configuration
- `.versionrc` - Standard version settings
- `commitlint.config.js` - Commit message validation
- `scripts/detect-version-bump.js` - Version bump logic
- `scripts/publish.js` - Main publishing script
- `scripts/update-dependencies.js` - Dependency sync

## Environment Setup

### Pre-requisites

1. **Node.js / Bun**: Ensure Bun >= 1.0.0
2. **Git**: Configure user name and email
3. **NPM Access**: Must have publish permissions for @fleettools scope

### NPM Setup

```bash
# Login to npm
npm login

# Verify access
npm access ls @fleettools
npm whoami
```

### Git Hooks

The project includes a `commit-msg` hook that enforces conventional commit formats. This is automatically installed when you clone the repository.

## Troubleshooting

### Publishing Fails

1. **Check NPM Access**: `npm whoami` and `npm access ls @fleettools`
2. **Verify Build**: `bun run build:workspaces`
3. **Check Tests**: `bun test`
4. **Dry Run**: `bun run publish:dry-run`

### Version Detection Issues

1. **Check Commit History**: `git log --oneline -10`
2. **Manual Bump**: `bun run version:patch/minor/major`
3. **Force Version**: Edit `package.json` versions directly

### Dependency Conflicts

1. **Update Dependencies**: `bun run update:dependencies`
2. **Clean Install**: `rm -rf node_modules bun.lockb && bun install`

## Best Practices

### Commit Messages

- Use present tense: "add" not "added"
- Keep first line under 72 characters
- Use lowercase for scope: `feat(cli):` not `feat(CLI):`
- Include breaking changes in footer: `BREAKING CHANGE:`

### Release Planning

- Group related features in one release
- Use feature branches for large changes
- Review changelog before publishing

### Version Strategy

- **Patch**: Bug fixes, small improvements
- **Minor**: New features, API additions
- **Major**: Breaking changes, major architectural updates

## Integration with CI/CD

The publishing system integrates with GitHub Actions:

```yaml
# .github/workflows/publish.yml
on:
  push:
    tags:
      - 'v*'
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run publish
```

## Example Workflow

```bash
# 1. Make changes
echo "new feature" >> src/feature.ts

# 2. Commit with conventional format
bun run commit
# → Choose "feat"
# → Scope: "api"
# → Description: "add user authentication endpoint"

# 3. Publish when ready
bun run publish

# Output:
# 🚀 FleetTools Automated Publishing
# 📦 Current version: 0.2.0
# 🔍 Checking for unpublished changes...
# ✅ Source changes detected, proceeding with publish
# 🔨 Building all workspaces...
# 📋 Updating internal dependencies...
# 🔍 Detecting version bump type...
# 📝 Generating changelog...
# 🎯 Publishing version: 0.3.0
# 📤 Publishing packages...
# ✅ Core packages published successfully
# ✅ Shared packages published successfully
# ✅ Service packages published successfully
# ✅ CLI package published successfully
# ✅ Plugins published successfully
# 🔄 Pushing changes and tags...
# 🎉 Successfully published FleetTools v0.3.0!
```

This automated system ensures consistent versioning, comprehensive changelogs, and reliable multi-package publishing for the FleetTools monorepo.