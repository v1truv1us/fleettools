# Server/API Workspace Agent Context

**Hierarchy Level:** Consolidated API Server
**Parent:** [../../AGENTS.md](../../AGENTS.md)
**Philosophy:** See [AGENTS.md](../../AGENTS.md) Core Philosophy section

## Commands

```bash
cd server/api
bun run build          # Compile TypeScript to dist/
bun run dev            # bun src/index.ts
bun test               # bun test-api.ts (single test file)
bun start              # bun dist/index.js
```

## Key Patterns

- Custom router with regex-based route matching
- Modular route registration in separate files
- Bun.serve on `PORT` (default: 3001)
- CORS headers required for all responses
- Consolidates Flightline + Squawk endpoints

## Architecture

- `src/flightline/` - Work orders, CTK, tech orders routes
- `src/squawk/` - Mailbox, cursor, lock, coordinator routes
- `src/middleware/` - Error handling, logging
- Uses Squawk database from `../../../squawk/src/db/index.js`
