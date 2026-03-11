# GitHub CLI Publishing for FleetTools

This guide covers setting up and using GitHub CLI-based publishing for the FleetTools monorepo.

## Overview

FleetTools uses GitHub CLI (`gh`) for package publishing instead of npm registry. This approach provides:

- ✅ Integrated with GitHub ecosystem
- ✅ Built-in authentication via GitHub tokens
- ✅ Automatic release creation
- ✅ Monorepo-aware change detection
- ✅ Private package support
- ✅ Automated version management

## Prerequisites

### 1. GitHub CLI Installation

Install GitHub CLI on your development machine:

```bash
# macOS
brew install gh

# Ubuntu/Debian
sudo apt install gh

# Windows
winget install GitHub.cli

# Or download from: https://cli.github.com/
```

### 2. GitHub Authentication

Authenticate with GitHub CLI:

```bash
gh auth login
# Choose GitHub.com
# Choose HTTPS
# Authenticate with your browser
```

Verify authentication:

```bash
gh auth status
```

### 3. Repository Permissions

Ensure you have the following permissions in the FleetTools repository:
- Write access to packages
- Ability to create releases
- Push access to main/release branches

## Setup

### 1. GitHub Actions Secrets

The workflow uses these secrets (automatically available in GitHub Actions):

- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

### 2. Personal Access Token (for local publishing)

For local publishing, create a personal access token:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with:
   - `repo` scope (full control of private repositories)
   - `write:packages` scope (to publish packages)
3. Set environment variable:
   ```bash
   export GITHUB_TOKEN=your_token_here
   ```

### 3. Package Configuration

Each publishable package should have:

```json
{
  "name": "@fleettools/package-name",
  "version": "0.1.0",
  "private": false,
  "publishConfig": {
    "access": "restricted"  // for private packages
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/v1truvius/fleettools",
    "directory": "packages/package-name"
  },
  "files": [
    "dist",
    "README.md"
  ]
}
```

## Usage

### Automated Publishing (Recommended)

#### 1. Push-based Publishing

When you push to `main` or `release` branches:

```bash
git push origin main
# Workflow will automatically:
# 1. Detect changed packages
# 2. Build and test them
# 3. Publish to GitHub Packages
# 4. Create releases
# 5. Update version numbers
```

#### 2. Manual Workflow Trigger

Go to Actions → Publish Packages via GitHub CLI → "Run workflow":

- **Version bump type**: patch, minor, major, or custom
- **Custom version**: Specific version number (if custom selected)
- **Dry run**: Simulate publishing without actual publishing

### Local Publishing

#### Publish Single Package

```bash
# Publish specific package with auto version
bun run publish:package packages/fleet-shared

# Publish with specific version
bun run publish:package packages/fleet-shared 1.2.3
```

#### Publish All Changed Packages

```bash
# Publish all packages with changes since last commit
bun run publish:all

# Publish with specific base commit
bun run publish:all HEAD~5

# Publish all with specific version
bun run publish:all HEAD 1.2.3
```

### Version Management

#### Update Single Package Version

```bash
bun run version:package packages/fleet-shared 1.2.3
```

#### Update All Changed Packages

```bash
# Auto-detect version bump based on commits
bun run version:all

# Specify version bump
bun run version:all HEAD patch

# Use specific version
bun run version:all HEAD 1.2.3
```

## Change Detection

The system automatically detects which packages have changed:

1. **Direct changes**: Files modified within package directories
2. **Dependency changes**: Package.json modifications
3. **Build output**: New/dist files in package directories

Only changed packages are built and published, making the process efficient.

## Version Bumping Strategies

### 1. Auto-detection (Default)

Based on conventional commit messages:
- `feat:`, `feature:` → minor bump
- `fix:`, `chore:` → patch bump
- `break:`, `major:`, `feat!` → major bump

### 2. Manual Specification

```bash
# Specify bump type
bun run version:all HEAD minor

# Specify exact version
bun run version:all HEAD 1.2.3
```

### 3. Workflow Input

When triggering workflow manually, choose from:
- patch (0.1.0 → 0.1.1)
- minor (0.1.0 → 0.2.0)  
- major (0.1.0 → 1.0.0)
- custom (specify exact version)

## Package Types

### Public Packages

For packages intended for public use:

```json
{
  "private": false,
  "publishConfig": {
    "access": "public"
  }
}
```

### Private Packages

For internal FleetTools packages:

```json
{
  "private": false,
  "publishConfig": {
    "access": "restricted"
  }
}
```

### Development Packages

Packages that should never be published:

```json
{
  "private": true
}
```

## Installation of Published Packages

To install published packages in your projects:

```bash
# Using bun (recommended)
bun add @fleettools/fleet-shared@latest

# Using npm
npm install @fleettools/fleet-shared@latest

# From private GitHub Packages (requires auth)
bun add @fleettools/fleet-shared@latest --registry=https://npm.pkg.github.com/
```

For private packages, configure authentication:

```bash
# ~/.npmrc
@fleettools:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## Troubleshooting

### Common Issues

#### 1. Authentication Errors

```bash
Error: Not authenticated with GitHub CLI
```

**Solution**: Run `gh auth login` and authenticate properly.

#### 2. Package Already Published

```bash
Error: Release already exists
```

**Solution**: Version number already exists. Update version first.

#### 3. Private Package Skipped

```
Skipping private package @fleettools/cli
```

**Expected behavior**: Private packages are not published.

#### 4. Build Failures

```bash
Error: Build failed for packages/fleet-shared
```

**Solution**: Check build logs locally:
```bash
cd packages/fleet-shared
bun run build
```

### Debugging

#### Enable Verbose Logging

```bash
# For publishing
GH_DEBUG=1 bun run publish:package packages/fleet-shared

# For GitHub Actions
Add env: GH_DEBUG: 1 in workflow
```

#### Check Package Status

```bash
# List all releases
gh release list --repo v1truvius/fleettools

# Check specific package version
gh release view @fleettools/fleet-shared@1.2.3 --repo v1truvius/fleettools
```

#### Manual Publishing (Debug)

```bash
# Manual tarball creation
cd packages/fleet-shared
npm pack
# This creates .tgz file you can inspect

# Manual release creation
gh release create test-release package.tgz \
  --title "Test Release" \
  --notes "Testing manual release" \
  --repo v1truvius/fleettools
```

## Best Practices

### 1. Version Management

- Use semantic versioning (semver)
- Bump patch versions for bug fixes
- Bump minor versions for new features
- Bump major versions for breaking changes
- Let auto-detection handle routine versioning

### 2. Commit Messages

Follow conventional commits for better auto-detection:

```
feat: add new authentication feature
fix: resolve database connection issue
docs: update API documentation
chore: upgrade dependencies
feat!: breaking change to API
```

### 3. Testing

```bash
# Test publishing locally first
bun run publish:package packages/fleet-shared --dry-run

# Run full test before push
bun run build:packages
bun test
```

### 4. Monitoring

- Check GitHub Actions logs for publishing status
- Monitor GitHub releases for new package versions
- Set up notifications for failed publishes

### 5. Rollback Strategy

If a bad package is published:

```bash
# Delete the release
gh release delete @fleettools/fleet-shared@1.2.3 --repo v1truvius/fleettools

# Republish with hotfix version
bun run publish:package packages/fleet-shared 1.2.4
```

## Security Considerations

### 1. Token Security

- Use `GITHUB_TOKEN` in GitHub Actions (automatically scoped)
- For local use, create PAT with minimum required scopes
- Never commit tokens to repository
- Rotate tokens regularly

### 2. Package Access

- Use `restricted` access for internal packages
- Only set `public` access for packages intended for public use
- Review package contents before first public publish

### 3. Supply Chain Security

- Enable GitHub's dependency graph scanning
- Review automatic security updates
- Use Dependabot for dependency management

## Advanced Features

### 1. Custom Registry

To publish to a different registry:

```bash
# Configure custom registry
bun config set @fleettools:registry https://custom-registry.com/

# Update npmrc for auth
echo "//custom-registry.com/:_authToken=$GITHUB_TOKEN" >> ~/.npmrc
```

### 2. Conditional Publishing

Skip publishing based on conditions:

```bash
# Only publish on tag pushes
if [[ $GITHUB_REF == refs/tags/* ]]; then
  bun run publish:all
fi
```

### 3. Monorepo Dependencies

The system handles internal dependencies automatically:

- Packages depend on workspace versions (`workspace:*`)
- Publishing updates dependencies automatically
- Version alignment across the monorepo

## Integration with CI/CD

### GitHub Actions Integration

The workflow integrates seamlessly with:

- **Pull Request Builds**: Testing before merge
- **Main Branch Protection**: Required checks before publishing
- **Status Checks**: Publishing status visible in PRs
- **Branch Protection**: Prevent direct publishing to protected branches

### Environment Promotion

Set up different environments:

```bash
# Development (auto-publish on main)
# Staging (manual publish workflow)
# Production (requires additional approval)
```

## Migration from npm

If migrating from npm publishing:

### 1. Update Scripts

Replace npm-based publishing scripts with GitHub CLI equivalents:

```bash
# Old
npm publish

# New
gh release create package@version package.tgz --repo org/repo
```

### 2. Update Dependencies

Update package.json to point to GitHub Packages:

```json
{
  "dependencies": {
    "@fleettools/shared": "github:v1truvius/fleettools/packages/fleet-shared#v1.2.3"
  }
}
```

### 3. Update Install Commands

```bash
# Old
npm install @fleettools/shared

# New
bun add @fleettools/shared --registry=https://npm.pkg.github.com/
```

## Support

For issues with FleetTools publishing:

1. Check GitHub Actions logs
2. Verify GitHub CLI authentication
3. Review package.json configuration
4. Check network connectivity to github.com
5. Create issue in FleetTools repository with detailed logs

---

*This documentation covers the GitHub CLI-based publishing system for FleetTools. For additional questions, refer to the GitHub CLI documentation or create an issue in the repository.*