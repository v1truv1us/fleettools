# FleetTools Implementation Summary

## Project Created

FleetTools project structure has been initialized at: `/home/vitruvius/git/fleettools/`

## Files Created

### Core Documentation
- `README.md` - Project overview and quick start guide
- `flightline/README.md` - Git-backed work tracking docs
- `squawk/README.md` - Coordination system docs
- `config/fleet.yaml` - Default configuration file

### CLI Implementation
- `cli/index.cjs` - Main Fleet CLI entry point with commands:
  - `fleet status` - Show FleetTools status and configuration
  - `fleet setup` - Initialize FleetTools configuration
  - `fleet doctor` - Diagnose installation and configuration
  - `fleet services up|down|status|logs` - Manage local services
- Status: ✅ Working (tested with Node.js)

### Provider Layer
- `providers/podman-postgres.ts` - Podman Postgres provider:
  - Container lifecycle (start, stop, restart, status, logs, destroy)
  - Health checks and readiness waiting
  - macOS `podman machine` handling

### Configuration Schema
- `config/fleet.yaml` - Configuration structure with:
  - Mode selection (local/synced)
  - Local services (Postgres provider)
  - Sync configuration (Zero URL, API URL, Cloudflare Access)
  - Semantic memory settings (embeddings, retrieval strategy)
  - Flightline directory
  - Logging configuration

## Directory Structure Created

```
git/fleettools/
├── README.md                    # Project overview
├── config/
│   └── fleet.yaml          # Default configuration
├── cli/
│   ├── index.ts              # Fleet CLI entry point
│   └── package.json          # CLI package definition
├── providers/
│   └── podman-postgres.ts    # Podman Postgres provider
├── flightline/
│   └── README.md             # Work tracking docs
├── squawk/
│   ├── mail/                 # Durable Mailbox
│   ├── streams/               # Event streaming
│   ├── hive/                 # Flightline event source
│   ├── memory/               # Semantic memory integration
│   └── api/                  # Squawk API
│   └── README.md             # Coordination system docs
└── (plugins/, server/ to be added)
```

## Next Steps

### 1. Initialize Fleet CLI
```bash
cd /home/vitruvius/git/fleettools/cli
npm install
# Or create symbolic link for testing
ln -s /home/vitruvius/git/fleettools/cli/index.cjs /usr/local/bin/fleet
```

### 2. Test Basic Commands
```bash
# Run setup (will create directories and defaults)
fleet setup

# Check status
fleet status

# Run diagnostics
fleet doctor
```

### 3. Implement Remaining Commands
Priority order:
1. **Local Services Management**
   - Complete Podman container lifecycle
   - Add proper health checks

2. **Flightline Implementation**
   - Work order CRUD operations
   - CTK (file reservation) system
   - Tech Order learning

3. **Squawk Core**
   - Durable Mailbox
   - Event streaming
   - Cursor management

4. **Sync Infrastructure**
   - Zero integration
   - Cloudflare Access setup
   - API endpoints

5. **Semantic Memory**
   - Embedding pipeline (Ollama on VPS)
   - pgvector integration
   - Retrieval APIs

6. **Plugins**
   - OpenCode plugin adapter
   - Claude Code plugin adapter

7. **VPS Services**
   - systemd unit files
   - Postgres 16 configuration
   - Zero setup

## Naming Recap

| SwarmTools | FleetTools |
|-----------|------------|
| `.hive/` | `.flightline/` |
| `swarm-mail` | `Squawk` |
| Coordinator | `Dispatch` |
| Workers | `Specialists` |
| File Reservations | `CTK` |
| Patterns | `Tech Orders` |
| `/swarm` command | `/fleet` command |

## Technical Decisions (Locked)

1. **Local-only mode is default**
   - No server required
   - Optional local Postgres for enhanced features

2. **Sync mode is opt-in**
   - Requires enrollment
   - Uses Rocicorp Zero for reads
   - API-only writes
   - Local Postgres NOT required for synced workspaces

3. **Embeddings are VPS-hosted (free)**
   - Self-hosted via Ollama
   - Postgres + pgvector
   - Model: bge-small-en-v1.5 or nomic-embed-text-v1.5
   - Vectors NOT replicated to clients

4. **Postgres 16.x baseline**
   - Latest 16.x patches
   - Podman for local
   - Systemd services for VPS

5. **Cloudflare Access only auth**
   - Human: browser login
   - Machine: Service Token
   - No API key fallback

6. **CLI + Plugin separation**
   - Fleet CLI manages all operations
   - Plugins delegate to CLI via JSON output

## VPS Specs Confirmed

| Component | Spec |
|-----------|-------|
| CPU | AMD EPYC 7543P 32-Core Processor |
| vCPUs | 2 |
| RAM | 7.7GB total (3.6GB available) |
| Storage | 100GB |

This is sufficient for Postgres 16 + Zero + API + Ollama (bge-small-en-v1.5).
