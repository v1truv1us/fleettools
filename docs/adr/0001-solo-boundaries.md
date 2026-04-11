# Solo boundaries

Define authority across orchestration components.

- Status: Accepted
- Date: 2026-04-11
- Task: T-1

---

## Decide

Solo is the source of truth for tasks, sessions, handoffs, reservations, and worktrees.
FleetTools must not create a second authoritative task system for this initiative.

---

## Assign

FleetTools owns routing, harness launch, supervision, and the operator workflow around execution.
Phase 1 harnesses are `claude-code`, `opencode`, and `codex`.

---

## Limit

Squawk is non-authoritative and optional for this initiative.
Use it only for transient events or signaling that does not need durable canonical state.

---

## Treat

Any duplicate FleetTools task systems, caches, projections, or local mirrors are non-authoritative for this initiative.
If FleetTools state disagrees with Solo, Solo wins.

---

## Follow

New orchestration work should read canonical tasking and workspace state from Solo first.
Future changes to these boundaries require a new ADR.
