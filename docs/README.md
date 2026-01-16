# FleetTools Documentation

Welcome to the official FleetTools documentation. FleetTools is an AI Agent Coordination System built with TypeScript that enables seamless collaboration between AI agents, human developers, and development environments.

## What is FleetTools?

FleetTools provides a unified platform for coordinating multiple AI agents in development workflows. It enables:

- **Agent Coordination**: Centralized event-driven coordination via Squawk service
- **Work Management**: Flightline system for managing development tasks
- **Editor Integration**: First-class support for Claude Code and OpenCode
- **Type-Safe Development**: TypeScript with strict mode across all workspaces
- **Bun-First Runtime**: Optimized performance with Bun runtime

## Quick Start

```bash
# Install dependencies
bun install

# Initialize a new project
bun run fleet init my-project

# Start the coordination service
bun run fleet start

# Check system status
bun run fleet status
```

## Documentation Structure

| Document | Description |
|----------|-------------|
| [Getting Started](./getting-started.md) | Installation, setup, and first project |
| [Architecture](./architecture.md) | System design, components, and data flow |
| [CLI Reference](./cli-reference.md) | All fleet commands with examples |
| [API Reference](./api-reference.md) | All endpoints, request/response examples |
| [Plugin Development](./plugin-development.md) | Creating plugins for editors |
| [Configuration](./configuration.md) | Global and project config options |
| [Development](./development.md) | Building, testing, and contributing |
| [Migration](./migration.md) | From legacy setup |
| [FAQ](./faq.md) | Common questions and answers |

## Key Concepts

### Squawk (Coordination Service)
Squawk provides the core coordination APIs:
- **Mailbox API**: Message passing between agents
- **Cursor API**: Shared state management
- **Lock API**: Distributed locking mechanisms

### Flightline (Work Management)
Flightline manages development tasks and workflows:
- Work Orders: Individual development tasks
- Checkpoints: Verification and validation points
- Missions: High-level project objectives

### Plugins
Editor plugins integrate FleetTools with development environments:
- **Claude Code Plugin**: Native Claude Code integration
- **OpenCode Plugin**: OpenCode editor support

## Project Structure

```
fleettools/
├── cli/              # Legacy CLI (backup)
├── squawk/           # Coordination service
├── server/api/       # Consolidated API (Flightline + Squawk)
├── plugins/          # Editor plugins
│   ├── claude-code/
│   └── opencode/
└── packages/
    ├── fleet-cli/    # Global CLI
    └── fleet-shared/ # Shared utilities
```

## System Requirements

- **Runtime**: Bun (>=1.0.0) or Node.js (>=18.0.0)
- **TypeScript**: 5.9.3
- **Target**: ES2022

## Core Principles

1. **Bun-First Runtime** - All services use Bun for optimal performance
2. **Event-Driven Architecture** - Squawk provides coordination APIs
3. **Type-Safe Development** - TypeScript with strict mode
4. **Developer Experience** - Minimal dependencies, clear patterns
5. **Editor Integration** - First-class editor support

## Design Decisions

- ✅ Bun.serve instead of Express/Node.js HTTP
- ✅ bun:sqlite for zero-dependency embedded database
- ✅ Monorepo with workspaces
- ✅ ISO 8601 timestamps for universal date handling
- ✅ Prefix-based IDs (msn-, wo-, chk-, etc.)

## Getting Help

- 📖 Read the [FAQ](./faq.md) for common questions
- 🚀 Check [Getting Started](./getting-started.md) for setup
- 🏗️ See [Architecture](./architecture.md) for system design
- 💻 Review [CLI Reference](./cli-reference.md) for commands

## Contributing

See [Development](./development.md) for guidelines on building, testing, and contributing to FleetTools.

## License

[Add license information here]

---

**Version**: [Current Version]
**Last Updated**: 2026-01-14
