# GitHub CLI Publishing Setup for FleetTools

This directory contains the GitHub CLI-based publishing system for FleetTools.

## Quick Start

### 1. Run Setup Script
```bash
./setup-publishing.sh
```

This will:
- ✅ Check prerequisites (Git, GitHub CLI, Bun)
- ✅ Verify GitHub authentication
- ✅ Check repository permissions
- ✅ Validate package configurations
- ✅ Test publishing scripts
- ✅ Create `.npmrc` for local development

### 2. Configure GitHub Token
For local publishing, create a GitHub Personal Access Token:

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - ✅ repo (Full control of private repositories)
   - ✅ write:packages (Upload packages to GitHub Packages)
4. Set environment variable:
   ```bash
   export GITHUB_TOKEN=your_token_here
   ```

### 3. Test Publishing
```bash
# Test single package publishing
bun run publish:package packages/fleet-shared --dry-run

# Publish with GitHub CLI
bun run publish:package packages/fleet-shared
```

## Files Overview

### Workflow
- `.github/workflows/publish.yml` - GitHub Actions workflow for automated publishing

### Scripts
- `scripts/detect-changes.ts` - Detects changed packages in monorepo
- `scripts/publish-package.ts` - Publishes single package via GitHub CLI
- `scripts/publish-all.ts` - Publishes all changed packages
- `scripts/version-package.ts` - Updates version for single package
- `scripts/version-all.ts` - Updates versions for all changed packages

### Configuration
- `.npmrc` - npm registry configuration for GitHub Packages
- `setup-publishing.sh` - Setup script for initial configuration
- `docs/publishing.md` - Comprehensive documentation

### Package Updates
Updated package.json files with:
- ✅ Proper `publishConfig` settings
- ✅ Repository information
- ✅ Engines constraints
- ✅ Files specification
- ✅ Pre-publish hooks

## Publishing Methods

### Automated (Recommended)
1. Push to `main` or `release` branch
2. GitHub Actions automatically detects changes
3. Builds, tests, and publishes packages
4. Creates GitHub releases

### Manual
```bash
# Publish specific package
bun run publish:package packages/fleet-shared

# Publish all changed packages
bun run publish:all

# Version management
bun run version:all HEAD patch
```

### Workflow Trigger
Go to Actions → "Publish Packages via GitHub CLI" → "Run workflow"

## Features

- 🔄 **Change Detection**: Only publishes changed packages
- 🏷️ **Version Management**: Auto and manual versioning
- 🔐 **GitHub Authentication**: Secure token-based auth
- 📦 **Monorepo Support**: Handles workspace dependencies
- ⚡ **Bun Runtime**: Fast builds and publishing
- 🔒 **Private Packages**: Support for restricted access
- 🚀 **Zero Config**: Works out of the box

## Next Steps

1. Run `./setup-publishing.sh`
2. Set `GITHUB_TOKEN` environment variable
3. Try local publishing with a test package
4. Commit changes and push to test automated publishing
5. Read `docs/publishing.md` for detailed guide

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Verify `gh auth status`
3. Review package.json configuration
4. Check the comprehensive documentation in `docs/publishing.md`

---

*Happy publishing with FleetTools! 🚀*