# FleetTools Phase 0 Foundation Research

**Date:** 2026-01-10  
**Researcher:** Assistant  
**Topic:** TypeScript/Bun monorepo patterns with Drizzle ORM, libSQL integration, and Zod validation  
**Status:** complete  
**Confidence:** high

## Synopsis

Research comprehensive implementation patterns for FleetTools Phase 0 Foundation, covering Bun monorepo setup, Drizzle ORM with libSQL, Zod validation, event sourcing architecture, and integration with existing Squawk coordination service.

## Summary

- **Bun Monorepo Patterns:** Optimal configuration with workspaces, shared TypeScript config, and workspace dependency management
- **Drizzle ORM + libSQL:** Best practices for SQLite with type-safe schema, migrations, and per-project database design
- **Event Sourcing Architecture:** Append-only event store with projections, snapshots, and Zod validation for 30+ event types
- **Integration Patterns:** Seamless integration with existing Squawk service and CTK file lock system
- **Performance Optimization:** SQLite WAL mode, connection pooling, and event compaction strategies

## Detailed Findings

### Technical Stack Integration

#### Bun Monorepo Configuration

**Finding:** FleetTools already has a solid monorepo foundation with proper workspace setup at `/home/vitruvius/git/fleettools/package.json:9-15`.

**Evidence:** Root package.json with workspaces configuration:
```json
"workspaces": [
  "cli",
  "squawk", 
  "server/api",
  "plugins/*",
  "packages/*"
]
```

**Recommended Patterns:**
- Use `workspace:*` for internal dependencies (already implemented in packages/db and packages/events)
- Shared TypeScript configuration with ES2022 target and NodeNext module resolution
- Bun-first build pipeline using `bun build` with `--target bun --format esm`

**Implementation Strategy:**
```typescript
// Root build script
"scripts": {
  "build": "bun run build --filter=*",
  "build:packages": "bun run build --filter=@fleettools/*",
  "dev:db": "cd packages/db && bun run dev",
  "dev:events": "cd packages/events && bun run dev"
}
```

#### Drizzle ORM + libSQL Integration

**Finding:** Drizzle config already properly set up for SQLite with per-project database at `/home/vitruvius/git/fleettools/packages/db/drizzle.config.ts:6-8`.

**Evidence:** Database URL configured for `.fleet/fleet.db`:
```typescript
dbCredentials: {
  url: process.env.DATABASE_URL || 'file:.fleet/fleet.db',
}
```

**Best Practices:**
- Use libSQL client for better SQLite compatibility and performance
- Enable WAL mode for concurrent access
- Implement proper connection pooling for multi-agent scenarios

**Connection Pattern:**
```typescript
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient({ 
  url: 'file:.fleet/fleet.db',
  // Enable WAL mode for concurrent access
  // Configure connection timeout
});
export const db = drizzle(client, { schema });
```

## Key Implementation Patterns

### 1. Bun Monorepo Structure
```json
{
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "bun run build --filter=*",
    "test": "bun test --filter=*",
    "dev": "bun run dev --filter=*"
  }
}
```

### 2. Drizzle with libSQL Setup
```typescript
import { drizzle } from 'drizzle-orm/bun-sql';
import Database from 'bun:sqlite';

const sqlite = new Database('fleettools.db');
export const db = drizzle(sqlite);
```

### 3. Zod Event Schema Pattern
```typescript
import { z } from 'zod';

const BaseEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  timestamp: z.string().datetime(),
  aggregateId: z.string(),
  data: z.unknown(),
});

const MissionCreatedEvent = BaseEventSchema.extend({
  type: z.literal('MissionCreated'),
  data: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});
```

### 4. Event Store Pattern
```typescript
interface EventStore {
  append(aggregateId: string, events: Event[]): Promise<void>;
  getEvents(aggregateId: string): Promise<Event[]>;
  getEventsFromVersion(aggregateId: string, version: number): Promise<Event[]>;
}
```

## FleetTools Specific Considerations

### ID Generation Patterns
- **Prefix-Based IDs:** FleetTools uses descriptive prefixes (msn-, wo-, chk-, etc.)
- **UUID Integration:** Combine prefixes with UUIDs for uniqueness
- **Type Safety:** Generate types for different ID categories

### Event Sourcing Architecture
- **Event Types:** 30+ typed events covering missions, work orders, checkpoints
- **Projections:** Read models built from event streams
- **Snapshots:** Periodic state snapshots for performance optimization

### Package Dependencies
- **packages/core:** Shared utilities, ID generators, constants
- **packages/db:** Drizzle schema, migrations, client factory
- **packages/events:** Event types, validation schemas, store interface

## Best Practices Identified

### Database Schema Design
1. **Event Table:** Append-only storage with proper indexing
2. **Snapshot Table:** Periodic state snapshots with version tracking
3. **Metadata Tables:** Support for event metadata and correlation

### TypeScript Configuration
1. **Strict Mode:** Enable all strict type checking options
2. **Path Mapping:** Configure proper import paths for monorepo
3. **Build Target:** ES2022 for modern features and performance

### Testing Strategy
1. **Unit Tests:** Individual package testing with focused test files
2. **Integration Tests:** Cross-package functionality testing
3. **Event Replay Tests:** Verify event store replay functionality

## Risk Assessment & Mitigation

### Low Risk Areas
- **Bun Runtime:** Stable and well-documented
- **Drizzle ORM:** Mature project with active development
- **TypeScript:** Standard for modern JavaScript development

### Medium Risk Areas
- **libSQL Integration:** Newer technology but SQLite-compatible
- **Event Sourcing Complexity:** Requires careful design and testing

### Mitigation Strategies
- **Comprehensive Testing:** Full test coverage for critical paths
- **Incremental Implementation:** Start with core functionality
- **Documentation:** Clear documentation for complex patterns

## Implementation Recommendations

### Phase 0 Execution Order
1. **0D - Core Types:** Foundation utilities and ID generators
2. **0A - Drizzle Migration:** Database schema and client setup
3. **0B - Event Types:** Zod schemas and event definitions
4. **0C - Event Store:** Storage and retrieval implementation

### Quality Gates
- **Build Success:** `bun run build` must complete without errors
- **Test Coverage:** All packages must have passing tests
- **Type Safety:** No TypeScript errors or warnings
- **Integration Tests:** Cross-package functionality verified

## Performance Considerations

### Database Optimization
- **Indexing Strategy:** Proper indexes on event queries
- **Connection Pooling:** Efficient database connection management
- **Query Optimization:** Efficient event stream queries

### Runtime Performance
- **Bundle Size:** Optimize package sizes for fast loading
- **Memory Usage:** Efficient event handling and garbage collection
- **Concurrent Access:** Thread-safe event store operations

## Security Considerations

### Data Validation
- **Input Sanitization:** Zod validation for all event data
- **SQL Injection Prevention:** Drizzle provides parameterized queries
- **Access Control:** Proper authorization for event operations

### Event Integrity
- **Immutability:** Events should be immutable once stored
- **Sequence Validation:** Ensure proper event ordering
- **Audit Trail:** Complete audit trail of all operations

## Conclusion

The technology stack for FleetTools Phase 0 Foundation is well-supported and mature. The combination of Bun, Drizzle ORM, libSQL, and Zod provides an excellent foundation for event-sourced architecture with strong type safety and performance characteristics.

The implementation should follow the established patterns for monorepo structure, database schema design, and event sourcing best practices. With proper testing and quality gates, this foundation will support the subsequent phases of FleetTools development.

## Next Steps

1. Create detailed specification document based on research findings
2. Develop implementation plan with parallel execution strategy
3. Begin implementation with core utilities and database setup
4. Establish comprehensive testing strategy
5. Implement quality gates and CI/CD pipeline

### FleetTools-Specific Patterns

#### Per-Project Database Design

**Finding:** Database design already supports multi-tenancy via `project_key` field.

**Implementation Pattern:**
- Each project gets isolated database at `.fleet/{project_key}/fleet.db`
- Shared schema with project_key segregation
- Connection factory per project for proper isolation

```typescript
export function createProjectDb(projectKey: string) {
  const client = createClient({
    url: `file:.fleet/${projectKey}/fleet.db`,
  });
  return drizzle(client, { schema });
}
```

#### FleetTools Naming Conventions

**Finding:** Pilots/callsigns pattern already established in schema at `/home/vitruvius/git/fleettools/packages/db/src/schema/streams.ts:22-38`.

**Evidence:** Pilots table with FleetTools terminology:
```typescript
export const pilotsTable = sqliteTable('pilots', {
  callsign: text('callsign').notNull(),
  program: text('program').default('opencode'),
  model: text('model').default('unknown'),
  // ...
});
```

**Event Type Naming:**
- Use FleetTools domain language: `pilot-registered`, `callsign-assigned`
- Prefix events: `fleet.`, `squawk.`, `flightline.`
- Maintain backward compatibility with existing Squawk events

### Performance and Reliability

#### SQLite WAL Mode Optimization

**Recommended Configuration:**
```typescript
const client = createClient({
  url: 'file:.fleet/fleet.db',
  // Enable WAL mode for concurrent reads/writes
  syncMode: 'NORMAL',
  // Optimize for event sourcing workload
  cache: 'shared',
});
```

#### Connection Pooling Patterns

**Multi-Agent Access Strategy:**
- Use connection pooling per project
- Implement connection timeouts and retry logic
- Handle database file locking gracefully

```typescript
class ProjectDbPool {
  private pools = new Map<string, any>();
  
  getConnection(projectKey: string) {
    if (!this.pools.has(projectKey)) {
      this.pools.set(projectKey, createProjectDb(projectKey));
    }
    return this.pools.get(projectKey);
  }
}
```

#### Event Compaction Strategies

**Snapshot Implementation:**
```typescript
export const snapshotsTable = sqliteTable('snapshots', {
  id: integer('id').primaryKey(),
  aggregate_id: text('aggregate_id').notNull(),
  aggregate_type: text('aggregate_type').notNull(),
  version: integer('version').notNull(),
  data: text('data').notNull(), // Serialized state
  created_at: integer('created_at').notNull(),
}, (table) => ({
  aggregateIdx: index('idx_snapshots_aggregate').on(table.aggregate_id),
}));
```

## Architecture Insights

### Phase 0 Stream Dependencies

```
0A (Drizzle Migration) → 0B (Event Types) → 0C (Event Store) → 0D (Core Types)
        ↓                           ↓                    ↓              ↓
   Database Schema          Event Validation     Event Storage   Shared Utils
        ↓                           ↓                    ↓              ↓
   libSQL Client            Zod Schemas        Projections    ID Generation
```

### Integration with Existing Squawk

**Current Squawk Schema:** Already has messages, reservations, cursors, and locks tables
**Phase 0 Enhancement:** Add event sourcing layer for audit trail and replay capabilities

```typescript
// Bridge Squawk events to event store
export function squawkEventToFleetEvent(squawkEvent: SquawkEvent): FleetEvent {
  return {
    type: `squawk.${squawkEvent.type}`,
    project_key: squawkEvent.project_key,
    timestamp: squawkEvent.timestamp,
    data: squawkEvent.data,
  };
}
```

## Implementation Examples

### Complete Event Schema Definition

```typescript
// packages/events/src/schemas/work-orders.ts
export const WorkOrderCreatedSchema = z.object({
  type: z.literal('fleet.work-order.created'),
  project_key: z.string(),
  timestamp: z.number(),
  data: z.object({
    work_order_id: z.string().startsWith('wo_'),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    assigned_to: z.array(z.string()).default([]),
    created_by: z.string(),
  }),
});

export const WorkOrderAssignedSchema = z.object({
  type: z.literal('fleet.work-order.assigned'),
  project_key: z.string(),
  timestamp: z.number(),
  data: z.object({
    work_order_id: z.string().startsWith('wo_'),
    assigned_to: z.array(z.string()),
    assigned_by: z.string(),
    previous_assignees: z.array(z.string()).default([]),
  }),
});
```

### Event Store Implementation

```typescript
// packages/db/src/event-store.ts
export class EventStore {
  constructor(private db: DrizzleDB) {}

  async appendEvent(event: FleetEvent): Promise<void> {
    await this.db.insert(eventsTable).values({
      type: event.type,
      project_key: event.project_key,
      timestamp: event.timestamp,
      data: JSON.stringify(event.data),
    });
  }

  async getEvents(
    projectKey: string, 
    aggregateId?: string,
    fromVersion?: number
  ): Promise<FleetEvent[]> {
    let query = this.db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.project_key, projectKey));

    if (aggregateId) {
      query = query.where(eq(eventsTable.aggregate_id, aggregateId));
    }
    if (fromVersion) {
      query = query.where(gte(eventsTable.version, fromVersion));
    }

    const rows = await query.orderBy(asc(eventsTable.sequence));
    return rows.map(row => ({
      type: row.type,
      project_key: row.project_key,
      timestamp: row.timestamp,
      data: JSON.parse(row.data),
    }));
  }
}
```

### Projection Engine

```typescript
// packages/db/src/projections.ts
export class ProjectionEngine {
  constructor(private eventStore: EventStore) {}

  async buildProjection(
    projectKey: string,
    projectionName: string,
    fromVersion?: number
  ): Promise<any> {
    const events = await this.eventStore.getEvents(projectKey, null, fromVersion);
    
    return events.reduce((state, event) => {
      return this.applyEvent(projectionName, state, event);
    }, this.getInitialState(projectionName));
  }

  private applyEvent(projectionName: string, state: any, event: FleetEvent): any {
    switch (projectionName) {
      case 'work-orders':
        return this.applyWorkOrderProjection(state, event);
      case 'pilots':
        return this.applyPilotProjection(state, event);
      default:
        return state;
    }
  }
}
```

## Updated Implementation Recommendations

### Immediate Actions

1. **Complete Event Type Definitions**
   - Define 30+ event types with Zod schemas
   - Implement discriminated union validation
   - Add event versioning strategy

2. **Enhance Database Schema**
   - Add snapshots table for event compaction
   - Implement event versioning fields
   - Add metadata fields for tracing

3. **Build Event Store Implementation**
   - Append-only event storage
   - Projection engine for materialized views
   - Snapshot generation and recovery

### Long-term Considerations

- **Event Migration Strategy:** Handle schema evolution across 30+ event types
- **Performance Monitoring:** Track event store performance with many agents
- **Multi-Project Scaling:** Optimize for many concurrent projects

## Risks & Limitations

- **SQLite Concurrency:** WAL mode helps but may still have contention with many agents
- **Event Store Size:** Implement compaction to prevent unbounded growth
- **Schema Evolution:** Need careful migration strategy for event types

## Open Questions

- [ ] Optimal snapshot frequency for different aggregate types
- [ ] Event replay performance for large event histories  
- [ ] Integration strategy with existing Squawk JSON persistence

---
**Research completed:** 2026-01-10  
**Next phase:** Specification development