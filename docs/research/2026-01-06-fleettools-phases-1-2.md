---
date: 2026-01-06
researcher: Assistant
topic: 'FleetTools Phase 1 & 2 Implementation Research'
tags: [research, fleettools, cli, sqlite, implementation]
status: complete
confidence: 0.9
---

## Synopsis

Comprehensive research analysis for FleetTools Phase 1 (CLI Service Management) and Phase 2 (SQLite Persistence Layer) implementation, covering current state, technical approaches, dependency mapping, and risk assessment for successful delivery.

## Summary

### Key Findings
- **Phase 1 CLI**: Ready for immediate implementation with 7 well-defined tasks; Podman provider exists but disconnected from CLI commands
- **Phase 2 SQLite**: Complex event-sourcing implementation with 10 additional tasks beyond basic 7 tasks; migration strategy already defined
- **Architecture**: Event-sourcing SQLite implementation with WAL mode provides superior durability and concurrency vs current JSON persistence
- **Dependencies**: Phase 1 must complete before Phase 2; both phases have clear technical prerequisites

### Implementation Priority
- **P0**: Phase 1 CLI service management (~2 hours effort)
- **P0**: Phase 2 SQLite event sourcing (~3-4 days effort)
- **Critical Path**: CLI → SQLite → Context Survival → Task Decomposition → Parallel Spawning

## Detailed Findings

### Current Implementation Status

#### Phase 1 CLI Service Management
- **Provider Implementation**: ✅ Complete (`providers/podman-postgres.ts`)
  - Full PodmanPostgresProvider class with start/stop/logs/status methods
  - Container lifecycle management, health checks, error handling
  - Platform detection (macOS Podman machine handling)
- **CLI Integration**: ❌ Missing
  - CLI functions print "TODO" instead of calling provider
  - Missing import path fix (providers/podman-postgres.ts:306)
  - Sync functions need async conversion
- **Configuration**: ✅ Present
  - Default config includes PostgreSQL service settings
  - Podman provider configuration available

#### Phase 2 SQLite Event-Sourced Persistence
- **Schema & Migration**: ✅ Implemented
  - Complete SQLite adapter with schema.sql
  - Automatic migration from JSON to SQLite
  - Backward-compatible API wrapper
- **Event Sourcing Foundation**: ⚠️ Partial
  - Append-only event log implemented
  - Missing: Event compaction logic
  - Missing: Materialized view projections for specialists/sorties/missions
- **API Extensions**: ❌ Missing
  - 21 new API endpoints not implemented
  - Specialist/sortie/mission management endpoints
  - Event query endpoints

### Technical Approach Recommendations

#### Phase 1 CLI Technical Implementation
1. **Import Resolution Fix** (5 minutes)
   - Add `import path from 'node:path';` to `providers/podman-postgres.ts`
   - Resolves ReferenceError at line 306

2. **CLI Integration** (90 minutes)
   - Import PodmanPostgresProvider into CLI
   - Convert sync service functions to async
   - Wire up provider method calls with proper error handling
   - Update command handlers to use await

3. **Error Handling Enhancement** (15 minutes)
   - Implement Podman availability checks
   - Add installation instructions for all platforms
   - Graceful degradation for status command

#### Phase 2 SQLite Event Sourcing Enhancement

**Database Architecture Pattern**
```sql
-- Event Store (Core)
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  stream_type TEXT NOT NULL,
  stream_id TEXT NOT NULL,
  data JSON,
  sequence_number INTEGER NOT NULL,
  occurred_at TEXT NOT NULL,
  causation_id TEXT,
  correlation_id TEXT,
  metadata JSON
);

-- Materialized Views (Projections)
CREATE VIEW mv_active_specialists AS
SELECT * FROM specialists WHERE status = 'active';
```

**Event Compaction Strategy**
```typescript
// Compact events older than 30 days for performance
const compactEvents = async (beforeDate: Date) => {
  // Group by stream_id, keep last event state
  // Create snapshot events
  // Archive old events to separate table
};
```

### Dependencies and Prerequisites

#### Phase 1 Dependencies
- **Podman Installation**: Required for all service commands
- **Node.js 18+**: Current environment meets requirement
- **TypeScript**: Build system in place with workspaces

#### Phase 2 Dependencies
- **Phase 1 Completion**: CLI must be functional for testing
- **SQLite Knowledge**: Team familiar with `bun:sqlite`
- **Event Sourcing Understanding**: Complex pattern requiring careful implementation

#### Cross-Phase Dependencies
```
Phase 1 (CLI) ──────┐
                   │
Phase 2 (SQLite) ────┤──► Phase 3 (Context Survival)
                   │
               └─────► Phase 4 (Task Decomposition)
```

### Risk Assessment and Mitigation

#### Phase 1 Risks (Low Risk)
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Podman not installed | Medium | Medium | Clear error messages with installation instructions |
| Container startup timeout | Low | Medium | Configurable timeout with progress indication |
| Platform-specific issues | Medium | Low | Platform detection and macOS Podman machine handling |

#### Phase 2 Risks (Medium Risk)
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data migration corruption | Low | High | JSON backup before migration; validation checks |
| Event ordering issues | Medium | High | Sequence numbers with database constraints |
| Performance degradation | Medium | Medium | WAL mode + proper indexing strategy |
| Complex event compaction bugs | High | Medium | Extensive testing; fallback to manual compaction |

### Resource Requirements and Effort Estimates

#### Phase 1 CLI Implementation
| Task | Effort | Dependencies |
|------|--------|--------------|
| Fix path import in provider | 5 minutes | None |
| Add provider import to CLI | 5 minutes | Import fix |
| Implement servicesUp() | 30 minutes | Import |
| Implement servicesDown() | 15 minutes | Import |
| Implement servicesLogs() | 15 minutes | Import |
| Enhance servicesStatus() | 20 minutes | Import |
| Update command handlers | 10 minutes | All functions |
| Manual testing & validation | 30 minutes | Implementation |
| **Total Phase 1** | **~2 hours** | **None** |

#### Phase 2 SQLite Enhancement
| Task | Effort | Dependencies |
|------|--------|--------------|
| Event schemas with Zod validation | 4 hours | Basic schema |
| Event store append-only semantics | 6 hours | Validation |
| Projection update system | 8 hours | Event store |
| Migration script enhancement | 4 hours | Basic schema |
| Event compaction logic | 12 hours | Event store |
| Specialist management endpoints | 6 hours | Projections |
| Sortie management endpoints | 6 hours | Specialists |
| Mission management endpoints | 6 hours | Sorties |
| Checkpoint endpoints | 4 hours | Base schema |
| Event query endpoints | 4 hours | Event store |
| Testing & validation | 8 hours | All components |
| **Total Phase 2** | **~3-4 days** | **Phase 1 completion** |

## Architecture Insights

### Event Sourcing Pattern Benefits
- **Complete Audit Trail**: Every state change recorded immutably
- **Time Travel Debugging**: Replay events to any point in time
- **Temporal Queries**: State at any moment derived from events
- **Causation Tracking**: Event-to-event relationships for debugging

### Materialized View Strategy
```typescript
// Example: Specialist projection
interface SpecialistProjection {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  registered_at: string;
  last_seen: string;
  capabilities: string[];
}

// Update projection on relevant events
const updateSpecialistProjection = async (event: Event) => {
  switch (event.event_type) {
    case 'specialist_registered':
      await createSpecialist(event.data);
      break;
    case 'specialist_active':
      await updateLastSeen(event.data.specialist_id, event.occurred_at);
      break;
  }
};
```

## Historical Context

### Current State Evolution
1. **Initial Implementation**: Basic CLI with placeholder service commands
2. **Provider Development**: Complete PodmanPostgresProvider implementation
3. **SQLite Migration**: Event-sourced persistence layer added
4. **Specification Gap**: 25 missing tasks identified across phases

### Decision Rationale
- **SQLite over JSON**: Better concurrency, ACID guarantees, query performance
- **Event Sourcing**: Complete audit trail, debugging capabilities, state reconstruction
- **WAL Mode**: Concurrent reads/writes, immediate durability

## Recommendations

### Immediate Actions (Week 1)
1. **Complete Phase 1 CLI Integration** (Priority: P0)
   - Fix provider path import
   - Wire CLI commands to provider
   - Add comprehensive error handling
   - Manual testing validation

2. **Prepare Phase 2 Enhancement Plan** (Priority: P0)
   - Review event schema definitions
   - Design materialized view strategy
   - Plan API endpoint structure

### Medium-term Actions (Week 2-3)
1. **Implement Phase 2 SQLite Enhancements** (Priority: P0)
   - Event store with validation
   - Projection system
   - API endpoints
   - Compaction logic

2. **Integration Testing** (Priority: P1)
   - End-to-end service management
   - Database migration testing
   - Performance benchmarking

### Long-term Considerations (Week 4+)
1. **Performance Optimization**
   - Database query optimization
   - Event compaction scheduling
   - Connection pooling

2. **Monitoring and Observability**
   - Database metrics
   - Service health monitoring
   - Error tracking

## Risks & Limitations

### Research Limitations
- **External Dependencies**: Podman installation varies by platform
- **Complexity**: Event sourcing adds architectural complexity
- **Performance**: Event replay can be expensive for large histories

### Mitigation Strategies
- **Comprehensive Testing**: Unit, integration, and performance tests
- **Documentation**: Clear migration and operation guides
- **Monitoring**: Health checks and performance metrics
- **Rollback Plan**: JSON backup retention for emergency rollback

## Open Questions

- [ ] Event compaction frequency and retention policy
- [ ] Performance targets for large event histories (>100K events)
- [ ] Backup strategy for SQLite databases
- [ ] Multi-project database isolation strategy

## Conclusion

FleetTools Phase 1 & 2 implementation is well-structured with clear technical requirements and achievable timelines. Phase 1 presents minimal risk with immediate value, while Phase 2 provides foundational event-sourcing capabilities for future phases. The dependency chain is clear, and the technical approaches align with modern best practices for CLI tools and persistent event storage.

**Confidence: 0.9** - High confidence in research completeness and implementation approach viability.
**Next Step**: Proceed with Phase 1 CLI implementation using the detailed task breakdown provided.