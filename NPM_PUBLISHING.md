# npm Publishing Guide for FleetTools

This guide explains how to publish FleetTools packages to the npm registry using the publishing scripts in root package.json.

> **Note**: FleetTools also supports GitHub Packages publishing. See `PUBLISHING.md` for GitHub CLI-based publishing.

## Prerequisites

1. **npm Authentication**: Make sure you're logged in to npm with publishing permissions:
   ```bash
   npm login
   ```

2. **Build Status**: Ensure all packages build successfully:
   ```bash
   bun run build:workspaces
   ```

## Package Publishing Order

Packages are published in dependency order to avoid conflicts:

1. **@fleettools/core** (base package - no internal dependencies)
2. **Tier 2**: @fleettools/fleet-shared, @fleettools/db (depend on core)
3. **Tier 3**: @fleettools/events, @fleettools/squawk, @fleettools/server
4. **Tier 4**: @fleettools/fleet-cli, @fleettools (main CLI)
5. **Plugins**: @fleettools/claude-code-plugin, @fleettools/opencode-plugin

## Publishing Scripts

### 1. Publish All Packages

```bash
# Standard publishing (with OTP prompt if 2FA enabled)
bun run publish:all

# Dry run (test without actually publishing)
bun run publish:dry-run
```

### 2. Publish with Version Bump

```bash
# Bump patch version and publish (0.1.0 -> 0.1.1)
bun run publish:bump-patch

# Bump minor version and publish (0.1.0 -> 0.2.0)
bun run publish:bump-minor

# Bump major version and publish (0.1.0 -> 1.0.0)
bun run publish:bump-major
```

### 3. Individual Package Publishing

```bash
# Example: Publish core package only
cd packages/core
bun publish --access public --otp YOUR_OTP_CODE

# Or use to see available packages
bun run publish:individual
```

## OTP (One-Time Password) Authentication

When publishing, npm may require an OTP if you have 2FA enabled:

1. **Automatic OTP**: Scripts will prompt for OTP when needed
2. **Manual OTP**: Add `--otp YOUR_CODE` to any publish command
3. **Skip OTP**: Use `--otp` flag without value to skip if not required

## Version Management

### Automatic Version Bumping

The `publish:bump-*` scripts handle:

1. **Version Bumping**: Updates all package.json files using npm version
2. **Dependency Updates**: Updates internal @fleettools/* dependencies automatically
3. **Publishing**: Publishes all packages in correct order

### Manual Version Management

If you need more control:

```bash
# Update versions only (no publish)
bun run version:patch  # or version:minor, version:major

# Update internal dependencies only
bun run update:dependencies

# Then publish
bun run publish:all
```

## Publishing Workflow

### For Patch Releases (Recommended)

```bash
# 1. Ensure clean state
git checkout main
git pull origin main
bun run install:all

# 2. Run tests
bun test
bun run build:workspaces

# 3. Publish patch release
bun run publish:bump-patch

# 4. Push tags
git push --follow-tags
```

### For Major/Minor Releases

```bash
# 1. Create release branch
git checkout -b release/v0.2.0

# 2. Update changelog and version notes
# Edit your changelog files

# 3. Publish release
bun run publish:bump-minor

# 4. Merge and push
git checkout main
git merge release/v0.2.0
git push --follow-tags
git branch -d release/v0.2.0
```

## Verification

After publishing, verify packages are available:

```bash
# Check if package is available
npm view @fleettools/core
npm view @fleettools/fleet-shared

# Install test
npm install -g @fleettools/cli
fleet --version
```

## Environment Variables

For automated publishing (CI/CD):

```bash
export NPM_TOKEN=your_npm_token
export NPM_OTP=your_otp_code  # if needed
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure you're logged in with correct npm account
   ```bash
   npm whoami  # Should show your npm username
   ```

2. **Package Already Exists**: Use `--access public` for scoped packages
3. **Build Failures**: Run `bun run build:workspaces` before publishing
4. **Dependency Conflicts**: Use `bun run update:dependencies` to sync versions

### Recovery Steps

If publishing fails partway through:

1. **Identify Failed Package**: Check the error output
2. **Fix Issue**: Resolve build or permission problems
3. **Resume Publishing**: Use individual package publish commands
4. **Verify**: Check npm for published packages

## Publishing Methods Comparison

| Method | Registry | Auth | Automation | Best For |
|--------|----------|------|------------|----------|
| npm scripts | npmjs.com | npm token/OTP | Manual | Quick releases, public packages |
| GitHub CLI | GitHub Packages | GitHub token | Automated | Private packages, CI/CD integration |

## Notes

- All packages use `--access public` for proper scoped package publishing
- Internal dependencies are automatically updated during version bumps
- Build process runs before publishing to ensure all packages are compiled
- Scripts are designed to work with Bun runtime and npm registry
- The dependency update script (`scripts/update-dependencies.js`) ensures all internal packages reference the latest version

---

*Happy publishing with FleetTools! 🚀*