# Flightline

**Flightline** is the git-backed work tracking system for FleetTools, analogous to SwarmTools' `.hive/` directory.

## Purpose

Flightline stores:
- **Work Orders** - Primary units of work (analogous to SwarmTools "cells")
- **Tech Orders** - Learned patterns and anti-patterns
- **Run History** - Task execution history and outcomes
- **CTK Records** - File reservation/lock records

## Directory Structure

```
.flightline/
├── work-orders/          # Individual work orders
│   ├── <work-order-id>/
│   │   ├── manifest.json        # Work order metadata
│   │   ├── cells/              # Swarm-style cells (file reservations)
│   │   ├── events/             # Event log for this work order
│   │   └── artifacts/          # Generated artifacts
├── tech-orders/           # Learned patterns
│   ├── <tech-order-id>.json
├── state/                # Fleet state (last positions, etc.)
└── index.json            # Search index for work orders
```

## Work Order Schema

A work order represents a cohesive unit of work that may be executed by one or more Specialists.

### manifest.json
```json
{
  "id": "wo_<uuid>",
  "title": "Fix authentication flow",
  "description": "Implement OAuth2 flow for API access",
  "status": "pending" | "in_progress" | "completed" | "blocked" | "cancelled",
  "priority": "high" | "medium" | "low",
  "created_at": "2025-01-02T12:00:00Z",
  "updated_at": "2025-01-02T14:30:00Z",
  "assigned_to": ["frontend", "backend"],
  "cells": [
    {
      "file": "src/api/auth.ts",
      "reserved_by": "specialist-frontend",
      "reserved_at": "2025-01-02T12:05:00Z",
      "released_at": null
    }
  ],
  "tech_orders": [
    "to_<tech_order_id>"
  ],
}
```

## Cell Schema

Cells represent file reservations (CTK - Consolidated Tool Kit) to prevent conflicts.

```json
{
  "file": "relative/path/to/file",
  "reserved_by": "specialist-id",
  "reserved_at": "timestamp",
  "released_at": "timestamp" | null,
  "purpose": "edit" | "read" | "review",
  "checksum": "sha256",
  "size": 12345
}
```

## Tech Order Schema

Tech Orders are learned patterns that can be promoted to stable procedures.

```json
{
  "id": "to_<uuid>",
  "name": "API Error Handling Pattern",
  "pattern": "When encountering 4xx errors, implement exponential backoff",
  "context": "frontend",
  "usage_count": 12,
  "success_rate": 0.95,
  "anti_pattern": false,
  "created_at": "2025-01-02T12:00:00Z",
  "last_used": "2025-01-02T10:30:00Z"
}
```

## Git Integration

All Flightline data is tracked in git:
- `.flightline/` directory added to .gitignore (optional, per workspace)
- Work orders and tech orders committed alongside code changes
- Branch strategy allows parallel work without conflicts

## Sync Mode Interaction

When **Sync Mode** is enabled:
- Work order summaries are synced via Zero
- Tech Orders are synced via Zero
- Full event logs remain local (for debugging)
- CTK reservations remain local (workspace-specific)
