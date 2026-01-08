# Squawk Workspace Agent Context

**Hierarchy Level:** Coordination Service
**Parent:** [../AGENTS.md](../AGENTS.md)
**Philosophy:** See [AGENTS.md](../AGENTS.md) Core Philosophy section

## Commands

```bash
cd squawk
bun run build          # Compile TypeScript to dist/
bun run dev            # bun src/index.ts
bun start              # bun dist/index.js
```

## Key Patterns

- Bun.serve HTTP server on `SQUAWK_PORT` (default: 3001)
- Event sourcing with `bun:sqlite` for persistence
- Mailbox/cursor/lock APIs for agent coordination
- No external HTTP dependencies (pure Bun APIs)
- Database initialized on startup, closed on SIGINT

## Architecture

- `src/db/` - SQLite adapter with prepared statements
- `src/recovery/` - Checkpoint restoration logic
- Entry point: `src/index.ts` with all route handlers
