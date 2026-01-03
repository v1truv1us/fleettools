# Squawk - Fleet Coordination System

**Squawk** is the agent coordination and durable messaging system for FleetTools, analogous to SwarmTools' `swarm-mail`.

## Purpose

Squawk provides:
- **Durable Mailbox** - Append-only event queue with ordering guarantees
- **Durable Cursor** - Progress tracking for event processing
- **Durable Lock** - Distributed file locking (CTK - Consolidated Tool Kit)
- **Durable Deferred** - Promise-based coordination
- **Flightline Integration** - Git-backed work tracking
- **Hive Integration** - Event sourcing for Flightline work orders

## Directory Structure

```
squawk/
├── mail/                 # Durable Mailbox implementation
│   ├── mail.ts           # Mailbox API
│   ├── cursor.ts         # Durable Cursor
│   └── defer.ts          # Durable Deferred
├── streams/               # Event streaming primitives
│   ├── event.ts           # Event types
│   ├── store.ts           # Append-only event store
│   └── subscription.ts    # Event subscription
├── hive/                 # Flightline event source
│   ├── cells.ts           # CTK reservation events
│   ├── work-orders.ts      # Work order events
│   └── projections.ts     # Materialized views
├── memory/               # Semantic memory integration
│   ├── embeddings.ts       # Memory records with embeddings
│   └── retrieval.ts       # Search APIs
└── api/                  # Squawk API for plugins
    ├── coordinator.ts      # Dispatch API
    └── mail.ts            # Mailbox API
```

## Event Types

### Core Events
```typescript
interface SquawkEvent {
  id: string;
  type: 'work_order.created' | 'work_order.started' | 'work_order.completed' |
          'cell.reserved' | 'cell.released' | 'tech_order.learned' |
          'specialist.assigned' | 'specialist.completed';
  stream_id: string;        // Work order or tech order ID
  data: Record<string, any>;
  occurred_at: string;      // ISO 8601
  causation_id?: string;   // For event chaining
}
```

## Mailbox Concepts

### DurableMailbox
Append-only event queue with ordering guarantees:
- Events are written to durable storage
- Sequential numbering per stream
- No in-place modifications

### DurableCursor
Progress tracking for event consumers:
- Points to last processed event
- Survives restarts
- Enables resumable processing

### DurableLock
Distributed file locking mechanism:
- Prevents conflicting edits to the same file
- Timeout-based to prevent deadlocks
- Automatic cleanup on release

### DurableDeferred
Promise-based coordination:
- Wait for condition (event, timeout, or manual resolution)
- Persistent across restarts
- Used for Specialist handoffs

## Flightline Integration

Squawk emits events that are consumed by Flightline to update:
- Work order manifests
- Cell reservation records
- Tech Order promotion

## Memory Integration

Squawk can publish memory events:
- Tech Order learned events
- Pattern extraction events
- Specialist behavior patterns

These events are consumed by the Memory subsystem to create embeddings.

## API Endpoints

### POST /mailbox/append
Append events to durable mailbox.

### POST /mailbox/subscribe
Subscribe to event streams.

### GET /mailbox/stream
Stream events from a cursor position.

### GET /coordinator/status
Get Dispatch status and active Specialists.

## Sync Mode Interaction

When **Sync Mode** is enabled:
- Events are published to Zero (projections only)
- Full event logs remain local
- CTK locks remain workspace-specific
- Memory records are synced (metadata only, not embeddings)
