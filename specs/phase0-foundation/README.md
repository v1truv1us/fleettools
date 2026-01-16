# Phase 0: Foundation

**Status:** Ready for Implementation
**Estimated Effort:** 4 parallel streams, ~35 tasks total
**Dependencies:** None (this is the foundation)
**Dogfood Milestone:** After Phase 1 (Coordination)

## Overview

Phase 0 establishes the foundational infrastructure for FleetTools parity with SwarmTools:

1. **Drizzle ORM + libSQL** - Type-safe database layer
2. **Event Type System** - 30+ typed events with Zod validation
3. **Event Store** - Append-only event storage with projections
4. **Core Types** - Shared utilities, ID generators, constants

## Package Versions

| Package | Version | Purpose |
|---------|---------|---------|
| `drizzle-orm` | `^0.45.1` | Type-safe ORM |
| `drizzle-kit` | `^0.31.8` | Migration tooling |
| `@libsql/client` | `^0.17.0` | SQLite client (Turso) |
| `zod` | `^4.3.5` | Runtime validation |
| `nanoid` | `^5.1.6` | ID generation |

## FleetTools Naming Convention

| Concept | FleetTools Term | SwarmTools Equivalent |
|---------|-----------------|----------------------|
| System | Fleet | Swarm |
| AI Agents | **Pilots** | Bees/Agents |
| Agent ID | **Callsign** | agent_name |
| Agent Group | **Squadron** | - |
| Coordination | **Squawk** | Swarm Mail |
| Work Container | **Flightline** | Hive |
| Work Items | **Work Orders** | Cells |
| Grouped Work | **Sorties** | Beads |
| Large Work | **Missions** | Epics |

## Database Location

Per-project database: `.fleet/fleet.db`

## Streams

| Stream | Name | Package | Depends On |
|--------|------|---------|------------|
| 0A | Drizzle Migration | `packages/db` | None |
| 0B | Event Types | `packages/events` | 0D (core types) |
| 0C | Event Store | `packages/events` | 0A, 0B |
| 0D | Core Types | `packages/core` | None |

### Execution Order

```
0A (Drizzle) ──────────────────┐
                               ├──► 0C (Event Store)
0D (Core Types) ──► 0B (Events)┘
```

**Parallel Start:** 0A and 0D can start immediately
**Sequential:** 0B needs 0D, 0C needs 0A + 0B

## Success Criteria

- [ ] `packages/db` builds and exports Drizzle client
- [ ] `packages/core` builds and exports ID generators
- [ ] `packages/events` builds and exports all event types
- [ ] `packages/events` exports working event store
- [ ] All packages have passing tests
- [ ] `bun run build` succeeds at root
- [ ] `bun test` passes at root

## Next Phase

After Phase 0, proceed to **Phase 1: Coordination** which implements:
- Mailbox API (pilot messaging)
- Lock API (file reservations)
- Cursor API (stream positions)
- Pilot Registry

## Stream Specs

- **[0A - Drizzle Migration](./0A-drizzle-migration.md)** - Set up database layer
- **[0B - Event Types](./0B-event-types.md)** - Define typed events
- **[0C - Event Store](./0C-event-store.md)** - Implement event storage and projections
- **[0D - Core Types](./0D-core-types.md)** - Shared utilities and types
