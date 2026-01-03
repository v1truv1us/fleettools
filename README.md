# FleetTools

**FleetTools** - A fork and rebrand of SwarmTools, optimized for local-first development with optional sync via Rocicorp Zero.

## Concept Overview

FleetTools is a developer toolkit for coordinating AI "fleets" of specialized agents working together to solve problems. It provides:

- **Flightline** - Git-backed work tracking (formerly `.hive/`)
- **Squawk** - Agent coordination and durable messaging (formerly `swarm-mail`)
- **Dispatch** - Coordinator for fleet operations
- **Specialists** - Agent workers with specialized capabilities
- **CTK** - File reservation system (Consolidated Tool Kit)
- **Tech Orders** - Learned patterns and anti-patterns

## Key Features

### Local-First Mode (Default)
- Fully functional without any server or sync
- Optional local Postgres for enhanced features
- Git-backed persistence for work tracking

### Sync Mode (Opt-In)
- Opt-in workspace enrollment
- Read access via Rocicorp Zero
- Writes via FleetTools API only
- Semantic memory shared across machines

### Semantic Memory (Server-Side)
- VPS-hosted embeddings (bge-small-en or nomic-embed-text)
- Postgres + pgvector storage
- Hybrid retrieval: lexical + vector search
- Zero additional cost for embeddings

### Cross-Platform Support
- OpenCode plugin
- Claude Code plugin
- Fleet CLI for setup and operations

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  OpenCode / Claude Code (Plugins)                          │
│  └─→ /fleet commands  (UI layer)                      │
│         ↓                                                       │
│  Fleet CLI (Operations)                                     │
│  ├─→ Setup / Doctor / Sync / Services                     │
│  │                                                           │
│  ├─→ Local Mode:                                         │
│  │    ├─→ Podman Postgres (optional)                       │
│  │    └─→ .flightline/ (git-backed)                     │
│  │                                                           │
│  └─→ Sync Mode (opt-in):                                   │
│       ├─→ API writes                                       │
│       └─→ Zero reads (replicated projections)               │
│                                                             │
└─────────────────────────────────────────────────────────────────────┘
                     ↕
┌─────────────────────────────────────────────────────────────────────┐
│  VPS (Server)                                                │
│  ├─→ Postgres 16.x (systemd)                             │
│  ├─→ Rocicorp Zero (systemd)                               │
│  ├─→ FleetTools API (systemd)                               │
│  ├─→ Embedding Worker (Ollama - always-on)                     │
│  └─→ Caddy + Cloudflare Tunnel                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Naming Map (Fork from SwarmTools)

| SwarmTools | FleetTools | Notes |
|-----------|------------|--------|
| `.hive/` | `.flightline/` | Git-backed work tracking |
| `swarm-mail` | `Squawk` | Durable messaging primitives |
| Coordinator | Dispatch | Fleet orchestration |
| Workers | Specialists | Agent workers |
| File Reservations | CTK | Consolidated Tool Kit |
| Patterns | Tech Orders | Learned patterns |
| Swarm Tools Fleet | FleetTools Command | `/fleet` namespace |

## Quick Start

### Prerequisites
- Node.js 18+ (tested with Node v25.2.1)
- Podman (optional, for local Postgres)
- Cloudflare Access (for sync mode)

> **Note:** Fleet CLI is working (tested with Node.js). TypeScript compilation will be added in future iteration.

### Install
```bash
# Clone or install Fleet CLI
npm install -g @fleettools/cli

# Run setup
fleet setup
```

### Basic Usage
```bash
# Check status
fleet status

# Start local services
fleet services up

# Enable sync (opt-in)
fleet enroll
fleet sync enable
```

## Development

See:
- `cli/` - Fleet CLI implementation
- `providers/` - Local service providers (Podman, etc.)
- `plugins/` - OpenCode and Claude Code plugins
- `server/` - VPS services (API, Zero, embedder)

## License

FleetTools includes vendored code from SwarmTools (MIT License).
See `THIRD_PARTY_NOTICES.md` for full attribution.

## Status

🚧 **In Development** - Architecture finalized, implementation in progress.
