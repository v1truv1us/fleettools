# FleetTools - Claude Code Onboarding

**Quick Links:**
- 📖 [Full Agent Guidelines](./AGENTS.md) - Build commands, code style, patterns, and workflows
- 🏗️ [Project Philosophy](./AGENTS.md#core-philosophy) - Core principles and design decisions

## Project Overview

FleetTools is an AI Agent Coordination System built with TypeScript and Bun. It's a monorepo with CLI, Squawk (coordination service), Server/API (consolidated API), and editor plugins (Claude Code, OpenCode).

**Runtime:** Bun (>=1.0.0) - NOT Node.js
**TypeScript:** 5.9.3, ES2022 target

## For Claude Code Users

This project uses the universal **AGENTS.md** standard that works across multiple AI coding agents (Claude Code, OpenCode, Cursor, Zed, etc.).

**Why AGENTS.md instead of CLAUDE.md?**
- FleetTools supports multiple editors (Claude Code AND OpenCode)
- AGENTS.md is the open-standard used by 60k+ projects
- Works with future AI tools, not just Claude
- Single source of truth reduces confusion

## Quick Start

```bash
# Install dependencies
bun install

# Build all workspaces
bun run build

# Start development (from project root)
cd cli && bun run dev          # CLI
cd squawk && bun run dev        # Coordination service
cd server/api && bun run dev     # API server
```

## Key Patterns to Know

- ✅ Always use **Bun.serve** (NOT express or Node.js http)
- ✅ Use **.js extensions** for local TypeScript imports
- ✅ **'node:' prefix** for Node.js built-ins (e.g., `import fs from 'node:fs'`)
- ✅ **ISO 8601 timestamps** everywhere (`new Date().toISOString()`)
- ✅ **Prefix-based IDs** (e.g., `msn-abc123`, `wo_def456`)
- ✅ **CORS headers** in all API responses

## What's in AGENTS.md?

The comprehensive **[AGENTS.md](./AGENTS.md)** contains:

### 📋 Commands
- Build, test, and lint workflows for each workspace
- How to run a single test file
- Environment variable configuration

### 🎨 Code Style
- Import conventions (Node.js vs Bun vs external deps)
- Naming conventions (kebab-case, camelCase, PascalCase)
- Type definitions with JSDoc comments
- Error handling patterns

### 🏗️ Architecture
- CLI: `commander`-based command structure
- Squawk: `Bun.serve` with `bun:sqlite` persistence
- Server/API: Custom router, consolidated endpoints
- Plugins: Node.js built-ins only, CLI execution

### 📁 Workspace Context
- Each workspace has its own AGENTS.md with hierarchy metadata
- Links between workspaces (e.g., server/api → squawk/db)

### ⚠️ Common Pitfalls
- What NOT to do (express, ts-node, missing CORS, etc.)

## Need More Details?

See **[AGENTS.md](./AGENTS.md)** for complete agent guidelines including:
- Detailed build/lint/test commands
- Complete code style examples
- HTTP server patterns with Bun.serve
- Database operations with bun:sqlite
- Directory context index with all workspaces

## Claude Code Integration

FleetTools provides a Claude Code plugin at `plugins/claude-code/`. The plugin exposes these commands:

- `/fleet status` - Show FleetTools status
- `/fleet setup` - Initialize FleetTools configuration
- `/fleet doctor` - Diagnose installation and configuration
- `/fleet services` - Manage local services
- `/fleet help` - Show help information

These commands execute the FleetTools CLI and return results to Claude Code for display.

---

**Note:** This CLAUDE.md provides quick onboarding for Claude Code users. For comprehensive agent guidelines, always reference **[AGENTS.md](./AGENTS.md)**.
