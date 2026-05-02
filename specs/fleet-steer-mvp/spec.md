# Fleet Steer MVP — Spec-Driven Authoring CLI

**Date:** 2026-04-24
**Version:** 0.1 (MVP)
**Timeline:** ~1 week focused implementation
**Based on:** Discord design conversation 2026-04-24, prior research on OpenSpec / Spec-Kit / Vibe-Specs / Karpathy "vibe coding" frame
**Target:** Harness-agnostic CLI that walks a single change through context → spec → review → plan → review → tasks → verify, with hard gates between phases. Produces verified, atomically-committable changes ready for Solo handoff.

---

## Executive Summary

`fleet steer` is the **authoring layer** for one change. It owns the in-flight messy state (drafts, review rounds, debates) so Solo's task ledger only sees verified work. The `steer` workflow is enforced via files-on-disk (artifacts under `specs/<change-name>/`) and a deterministic state machine — not via system prompts or agent skills. Any harness (Claude Code, Codex, Cursor, raw human) can drive it, because each `steer` subcommand emits a prompt to stdout and consumes artifacts from disk.

**User Need:** "I want this to be usable on any coding harnesses, it should orchestrate the development of a complete spec, plan, do a configurable number of adversarial reviews of the spec/plan, task breakdown — atomic tasks that can be committed individually, verification of implementation after each task." — v1truv1us, 2026-04-24

**Critical Properties (non-negotiable):**
- **Adversarial review actually executes** — not collapsed into spec/plan, runs as its own gated phase (default 3 rounds, configurable)
- **Solo handoff happens *after* per-task verify passes** — Solo never sees in-flight work
- **Hard gate on "done"** — tests pass + files exist + spec acceptance criteria check + adversarial diff review + manual ack
- **Harness-agnostic** — works with `claude -p`, `codex exec`, `cursor`, or copy-paste

---

## User Stories & Acceptance Criteria

### Epic 1: Change Lifecycle

**User Story 1.1:** Initialize a Change
```
As a developer using FleetTools
I want to scaffold a new change with `fleet steer init <slug>`
So that a structured artifact folder exists before I start writing
```

**Acceptance Criteria:**
- ✅ `fleet steer init <slug>` creates `specs/<slug>/` with skeleton files
- ✅ Skeleton includes: `00-context.md`, `01-spec.md`, `03-plan.md`, `05-tasks.md`, `state.json`, `decisions.md`
- ✅ `state.json` is initialized to `{ phase: "context", round: 0, tasks: [] }`
- ✅ Errors clearly if slug already exists (no clobber)
- ✅ Slug is kebab-case validated; rejects path traversal

**User Story 1.2:** Resume a Change
```
As a developer returning after a session break
I want `fleet steer resume` to re-emit the prompt for the in-flight phase
So that I can continue without remembering where I left off
```

**Acceptance Criteria:**
- ✅ `fleet steer resume` reads `state.json` and emits the appropriate prompt to stdout
- ✅ `fleet steer status` prints a human-readable summary (current phase, round, task)
- ✅ Idempotent — running `resume` twice produces identical output

---

### Epic 2: Phase Progression

**User Story 2.1:** Linear Phase Walk
```
As a developer
I want phases to advance only when the current artifact exists and the gate passes
So that I cannot accidentally skip ahead with a blank spec or unreviewed plan
```

**Acceptance Criteria:**
- ✅ Phase order: `context → spec → spec-review → plan → plan-review → tasks → execute → verify`
- ✅ `fleet steer next` emits the prompt for the current phase
- ✅ `fleet steer advance` validates current artifact exists + non-empty, then transitions phase
- ✅ Cannot skip phases (advance fails if prerequisites missing)
- ✅ `state.json` is updated atomically (write-temp-then-rename pattern)

**User Story 2.2:** Phase Prompts Are Templated
```
As a developer
I want each phase's prompt to come from a templated file
So that I can edit the wording without touching CLI code
```

**Acceptance Criteria:**
- ✅ Templates live under `templates/steer/<phase>.md`
- ✅ Templates support variable substitution: `{{slug}}`, `{{round}}`, `{{prior_artifact}}`
- ✅ Missing template fails with actionable error message
- ✅ User can override per-repo via `.steer/templates/<phase>.md`

---

### Epic 3: Adversarial Review Loop

**User Story 3.1:** Multi-Round Review
```
As a developer
I want spec and plan to each go through N rounds of adversarial review
So that scope drift, missing edges, and operational gaps are caught before code is written
```

**Acceptance Criteria:**
- ✅ Default 3 rounds per artifact (configurable via `.steer/config.yaml`)
- ✅ Each round writes to `02-spec-reviews/round-N.md` (or `04-plan-reviews/round-N.md`)
- ✅ Reviewer gets fresh context (no shared history with author) — enforced via separate prompt-emit
- ✅ Per-round lens differs: R1=ambiguity/completeness, R2=security/perf/edge-cases, R3=maintainability/operational
- ✅ Round lens prompts live in `templates/steer/review-r{N}.md`

**User Story 3.2:** Convergence & Circuit-Break
```
As a developer
I want the review loop to early-exit when nothing new is found
And to escalate to me when it can't converge
So that I don't burn rounds for diminishing returns or loop forever
```

**Acceptance Criteria:**
- ✅ Reviewer outputs structured verdict: `{ status: "pass" | "issues", issues: Issue[] }`
- ✅ Two consecutive `pass` verdicts → review phase complete (early exit)
- ✅ Hitting configured max rounds without `pass` → escalate (print summary, prompt user y/n)
- ✅ User can `fleet steer review --resolve` to acknowledge open issues and force advance
- ✅ All round verdicts logged to `decisions.md`

---

### Epic 4: Task Decomposition & Execution

**User Story 4.1:** Atomic Task Breakdown
```
As a developer
I want the plan to break into atomic, individually-committable tasks
So that each task is small enough to verify, revert, and bisect
```

**Acceptance Criteria:**
- ✅ `05-tasks.md` is a checklist with one task per line
- ✅ Each task has a corresponding `tasks/NNN-<slug>/` folder with `prompt.md`, `verify.md`, `status.json`
- ✅ Tasks have explicit dependencies (DAG); steer refuses to start a task with unmet deps
- ✅ Task status: `pending | active | verifying | done | failed`
- ✅ One task active at a time (per change)

**User Story 4.2:** Per-Task Verify Gate
```
As a developer
I want each task to pass a hard gate before being marked done and handed off to Solo
So that the verified work in Solo is actually verified
```

**Acceptance Criteria:**
- ✅ `fleet steer verify` runs the configured gate against the active task
- ✅ Gate consists of four checks (all must pass):
  1. **Tests pass** — `bun test` (or repo-configured runner) exits 0
  2. **Files exist** — every file the task said it would create/modify exists with non-zero size
  3. **Spec acceptance criteria** — task's `verify.md` assertions all pass
  4. **Adversarial diff review + manual ack** — fresh agent reads `01-spec.md` + `git diff` + task `verify.md`, reports pass/fail. If `pass`, auto-advance. If `issues`, print summary and require user `y/N` ack.
- ✅ Gate result logged to `tasks/NNN-<slug>/verify-result.md`
- ✅ On pass: task `status.json` → `done`, change emitted as Solo task
- ✅ On fail: task `status.json` → `failed`, debug prompt emitted, no Solo handoff

**User Story 4.3:** Solo Handoff Boundary
```
As a developer
I want each verified task to be created in Solo's ledger automatically
So that Solo only contains verified, committable work
```

**Acceptance Criteria:**
- ✅ On `verify pass`, steer calls Solo's task creation API with task metadata
- ✅ Solo task includes: change-slug, task-id, diff reference, verify-result link
- ✅ If Solo handoff fails, task `status.json` → `done-pending-handoff` (retryable via `fleet steer handoff --retry`)
- ✅ Steer never creates Solo tasks for in-flight work (only post-verify)

---

### Epic 5: Harness-Agnostic Prompt Emission

**User Story 5.1:** Pipe to Any Harness
```
As a developer using a non-Claude harness
I want `steer next | <agent>` to drive the workflow
So that I am not locked into one tool
```

**Acceptance Criteria:**
- ✅ All prompt-emitting subcommands (`next`, `review`, `task start`, etc.) write to stdout only (no side-effects)
- ✅ Prompts are self-contained (include all context needed; no `@file` references that require harness support)
- ✅ Verified pipe targets: `claude -p`, `codex exec`, `cursor` (via clipboard), `tee /tmp/p.md`
- ✅ Exit code 0 on successful prompt emission
- ✅ Documentation includes one-line invocation per supported harness

---

## Technical Requirements

### CLI Surface
```typescript
interface SteerCLI {
  init(slug: string): Promise<void>;
  next(): Promise<string>;        // emits prompt to stdout
  advance(): Promise<void>;        // moves phase forward
  review(opts: { round?: number; resolve?: boolean }): Promise<string>;
  task: {
    start(): Promise<string>;     // emits prompt for next task
    list(): Promise<TaskStatus[]>;
  };
  verify(): Promise<VerifyResult>; // runs gate, handles handoff
  handoff(opts: { retry?: boolean }): Promise<void>;
  rollback(): Promise<void>;       // revert last task
  status(): Promise<StateSnapshot>;
  resume(): Promise<string>;
}
```

### File Layout
```
specs/<slug>/
  state.json                    # { phase, round, active_task, history[] }
  00-context.md                 # codebase research, constraints, dependencies
  01-spec.md                    # what & why, acceptance criteria, risks
  02-spec-reviews/
    round-1.md                  # adversarial review (ambiguity lens)
    round-2.md                  # (security/perf lens)
    round-3.md                  # (maintainability lens)
  03-plan.md                    # how, broken into phases
  04-plan-reviews/              # same shape as 02-
  05-tasks.md                   # master checklist
  tasks/
    001-<task-slug>/
      prompt.md
      verify.md
      status.json               # { status, started_at, completed_at }
      verify-result.md          # gate output
      diff.patch                # post-hoc, generated on done
  decisions.md                  # ADR-lite from review verdicts
  retro.md                      # post-merge reflection
```

### Configuration Schema
```yaml
# .steer/config.yaml (per-repo, falls back to ~/.config/fleet/steer.yaml)
review:
  max_rounds: 3
  early_exit_on_pass_count: 2     # consecutive pass verdicts to stop
  escalate_to_user: true

verify_gate:
  tests:
    command: "bun test"
    timeout_seconds: 300
  files_exist: true               # auto-derived from task spec
  acceptance_criteria: true       # parsed from task verify.md
  adversarial_diff_review:
    enabled: true
    manual_ack_on_issues: true    # the "B" choice
    reviewer_prompt: "templates/steer/diff-review.md"

handoff:
  solo_endpoint: "${SOLO_API_URL}"
  retry_max: 3
  retry_backoff_seconds: [5, 15, 60]
```

### State Machine
```
context ─advance→ spec ─advance→ spec-review (loop until early-exit or escalate)
                                       │
                                       ▼
                                     plan ─advance→ plan-review (loop)
                                                         │
                                                         ▼
                                                       tasks ─advance→ execute
                                                                         │
                                                                         ▼
                                                                       verify
                                                                    (per-task)
                                                                         │
                                                                         ▼
                                                                  Solo handoff
```

### Performance Targets
```typescript
interface PerformanceTargets {
  initLatency: '<500ms';        // scaffold creation
  promptEmit: '<200ms';          // any prompt-emitting subcommand
  verifyGateP95: '<60s';         // excluding test execution time
  handoffP95: '<2s';             // Solo API call
}
```

---

## Implementation Phases

### Day 1: Scaffolding & State
- `fleet steer init <slug>` creates folder + skeleton files
- `state.json` read/write helpers (atomic write)
- `fleet steer status` prints human summary

### Day 2: Phase Walk + Templates
- Template loader with `{{var}}` substitution
- `next`, `advance` subcommands wired through state machine
- Per-phase template files (context/spec/plan/tasks)

### Day 3: Adversarial Review Loop
- `review` subcommand with round-N output
- Per-round lens templates (r1-r3)
- Reviewer verdict parser (structured `{ status, issues[] }`)
- Early-exit logic (consecutive-pass count)
- Circuit-break + `--resolve` escalation path

### Day 4: Task Decomposition + Execute
- `task start` emits prompt for next pending task in DAG order
- Task status tracking
- Dependency validation (refuse to start unmet-dep task)

### Day 5: Verify Gate (the load-bearing piece)
- Run all four gate checks
- Adversarial diff review subprocess invocation
- Manual ack TTY prompt (or `--yes` flag for CI)
- Verify result writer

### Day 6: Solo Handoff
- HTTP client for Solo task creation
- Retry with backoff
- `done-pending-handoff` recovery path
- `fleet steer handoff --retry` subcommand

### Day 7: Polish + End-to-End Test
- `resume`, `rollback`, `--help` text
- Integration test: full change from `init` to `verify pass` → Solo entry
- Documentation: per-harness invocation cheatsheet

---

## Success Metrics

### Functional Metrics
- [ ] Full happy path works: `init → context → spec → 3 reviews → plan → 3 reviews → tasks → execute → verify pass → Solo entry`
- [ ] Works with `claude -p`, `codex exec`, manual paste
- [ ] No phase can be skipped via `advance` if prerequisites missing
- [ ] Adversarial review produces structured verdict parseable by CLI
- [ ] Verify gate stops on any failed check; manual ack prompt fires only on adversarial-review issues

### Performance Metrics
- [ ] `init` <500ms
- [ ] `next` / `status` / `resume` <200ms
- [ ] Handoff <2s p95

### Quality Metrics
- [ ] 80%+ test coverage on state machine + gate logic
- [ ] State file corruption recovery tested (truncated, malformed JSON)
- [ ] Concurrent-invocation safety (one `steer` per change folder via lockfile)

---

## Risk Mitigation

### High-Risk Areas
- **Adversarial reviewer noise** → Reviewer reads diff *only*, with no chat history; verdict schema enforced via JSON parse; manual ack catches false-positive escalations
- **State machine drift** → All state transitions go through one function with full enum match (no string compare); state file is the only source of truth
- **Harness incompatibility** → Self-contained prompts (no `@file` refs); test matrix includes raw paste path

### Mitigation Strategies
- Lockfile (`specs/<slug>/.lock`) to prevent concurrent steer invocations on same change
- Schema validation on `state.json` reads (Zod) — corruption fails loud, not silent
- All gate checks are individually re-runnable (`fleet steer verify --check tests`)

---

## Naming Conventions

### File Naming
- Phase artifacts numbered: `00-context.md`, `01-spec.md`, `03-plan.md`, `05-tasks.md`
- Review folders match owning artifact: `02-spec-reviews/`, `04-plan-reviews/`
- Tasks: `tasks/NNN-<kebab-slug>/` (zero-padded 3-digit)

### State Phases (enum)
```typescript
type Phase =
  | 'context'
  | 'spec' | 'spec-review'
  | 'plan' | 'plan-review'
  | 'tasks'
  | 'execute' | 'verify'
  | 'done';
```

### Review Verdict Schema
```typescript
interface ReviewVerdict {
  status: 'pass' | 'issues';
  round: number;
  lens: 'ambiguity' | 'security-perf' | 'maintainability' | 'custom';
  issues: Array<{ severity: 'high' | 'medium' | 'low'; description: string; location?: string }>;
}
```

---

## Testing Requirements

### Critical Test Scenarios
```typescript
describe('fleet steer MVP', () => {
  test('init creates skeleton + state.json', async () => { /* ... */ });
  test('cannot advance from spec without artifact', async () => { /* ... */ });
  test('two consecutive review passes triggers early exit', async () => { /* ... */ });
  test('max rounds without pass triggers escalation prompt', async () => { /* ... */ });
  test('verify gate fails if any single check fails', async () => { /* ... */ });
  test('verify pass creates Solo task; failure does not', async () => { /* ... */ });
  test('resume after crash re-emits correct prompt', async () => { /* ... */ });
  test('lockfile prevents concurrent steer invocations on same change', async () => { /* ... */ });
});
```

### Harness Compatibility Tests
- [ ] `fleet steer next | claude -p` produces valid spec draft
- [ ] `fleet steer next | codex exec` produces valid spec draft
- [ ] `fleet steer next > /tmp/p.md` (manual paste) is human-readable

---

## Out of Scope (MVP)

Explicitly deferred to v0.2+:
- Full integration smoke runs (option C from gate discussion) — needs per-project smoke scripts
- Drift detection between tasks (cheap re-check) — useful but not load-bearing
- Retro / learnings.md priming — post-merge reflection, doesn't gate execution
- Per-phase model routing via `fleet.routing.yaml` — defer until phase set stabilizes
- Plugin extraction (`@fleettools/steer`) — prototype inside fleettools first

---

## Specification Validation

**Confidence Assessment:** 0.85 — High confidence in 1-week feasibility given existing FleetTools infrastructure
**Dependencies on FleetTools:** Solo task API (handoff), `specs/` convention (already in use), routing config (deferred)
**Implementation Risk:** Medium — state machine + gate composition is well-understood; reviewer-verdict reliability is the unknown
**Success Probability:** 75% if Solo handoff API is stable; 90% if we mock handoff for MVP and wire real Solo in v0.2

This MVP delivers a harness-agnostic, file-backed, gated authoring workflow that complements rather than duplicates FleetTools' existing orchestration. The deliberate scope cut (no smoke runs, no drift detection) keeps the MVP under one week while preserving the load-bearing properties: real adversarial review, hard verify gate, post-verify Solo handoff.
