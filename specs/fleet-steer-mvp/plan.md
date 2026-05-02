# Fleet Steer MVP — Implementation Plan

**Date:** 2026-04-24
**Version:** 0.1 (MVP)
**Timeline:** 7 days focused implementation
**Based on:** specs/fleet-steer-mvp/spec.md
**Target:** Working `fleet steer` subcommand that drives a single change from `init` → `verify pass` → Solo handoff, harness-agnostic

---

## Executive Summary

This plan decomposes the Fleet Steer MVP into 38 atomic tasks across 7 days, each timeboxed to 15-30 minutes. Tasks have explicit dependencies forming a DAG; the critical path runs through state-machine plumbing (Day 1-2) → adversarial review loop (Day 3) → verify gate (Day 5) which is the single load-bearing piece. Solo handoff is intentionally placed last (Day 6) so that the workflow is testable end-to-end via mock handoff before the real API integration lands.

**Critical Path:**
- State machine + atomic state writes (TASK-103 → TASK-105) — anything later depends on this
- Verify gate composition (TASK-501 → TASK-505) — defines whether MVP is trustworthy
- Adversarial review verdict parser (TASK-303) — schema contract for all reviews

**Success Metrics:**
- Full happy path executable end-to-end by EOD Day 6
- Mock-Solo handoff demonstrated by EOD Day 6; real Solo handoff Day 7
- 80%+ test coverage on state machine + gate logic
- Documented invocation cheatsheet for `claude`, `codex`, manual paste

---

## Task Organization Framework

### Task Structure
```markdown
**TASK-ID:** Unique identifier
**Timebox:** 15-30 minutes
**Dependencies:** [TASK-IDs]
**Priority:** Critical/High/Medium
**Acceptance Criteria:** Specific testable outcomes
**File Locations:** Exact files to modify/create
**Quality Gate:** Validation criteria
**Risk Level:** Low/Medium/High
**Mitigation:** Specific strategies
```

### Phase Structure
- **Phase 1:** Scaffolding & State (Day 1)
- **Phase 2:** Phase Walk + Templates (Day 2)
- **Phase 3:** Adversarial Review Loop (Day 3)
- **Phase 4:** Task Decomposition + Execute (Day 4)
- **Phase 5:** Verify Gate (Day 5) — **load-bearing**
- **Phase 6:** Solo Handoff (Day 6)
- **Phase 7:** Polish + E2E (Day 7)

---

## Phase 1: Scaffolding & State (Day 1)

### TASK-101: Add `steer` subcommand stub to fleet CLI
**Timebox:** 15 minutes
**Dependencies:** None
**Priority:** Critical
**Acceptance Criteria:**
- ✅ `fleet steer --help` lists subcommands (init, next, advance, review, task, verify, handoff, status, resume, rollback)
- ✅ Each subcommand stub exits 0 with "not implemented" message
**File Locations:**
- `cli/index.ts` — register steer command group
- `cli/steer/index.ts` (new) — subcommand router
**Quality Gate:** `bun run fleet steer --help` shows full subcommand list
**Risk Level:** Low

---

### TASK-102: Define StateSnapshot + Phase enum types
**Timebox:** 15 minutes
**Dependencies:** TASK-101
**Priority:** Critical
**Acceptance Criteria:**
- ✅ `Phase` enum matches spec (8 values + `done`)
- ✅ `StateSnapshot` interface with phase, round, active_task, history
- ✅ Zod schema for runtime validation of `state.json`
**File Locations:**
- `cli/steer/types.ts` (new)
**Quality Gate:** TypeScript compiles; Zod schema parses sample state
**Risk Level:** Low

---

### TASK-103: Atomic state.json read/write helpers
**Timebox:** 25 minutes
**Dependencies:** TASK-102
**Priority:** Critical
**Acceptance Criteria:**
- ✅ `readState(slug)` returns parsed StateSnapshot or throws actionable error
- ✅ `writeState(slug, state)` uses write-temp-then-rename pattern
- ✅ Schema validation on read (Zod)
- ✅ Throws `StateCorruptionError` with file path on parse failure
**File Locations:**
- `cli/steer/state.ts` (new)
**Quality Gate:** Unit tests for happy path + corrupted file recovery
**Risk Level:** Medium
**Mitigation:** Atomic rename prevents partial writes; schema validation prevents silent corruption

---

### TASK-104: `fleet steer init <slug>` — scaffold change folder
**Timebox:** 25 minutes
**Dependencies:** TASK-103
**Priority:** Critical
**Acceptance Criteria:**
- ✅ Validates slug (kebab-case, no path traversal)
- ✅ Errors if `specs/<slug>/` already exists
- ✅ Creates skeleton: `00-context.md`, `01-spec.md`, `03-plan.md`, `05-tasks.md`, `decisions.md`
- ✅ Initializes `state.json` to `{ phase: "context", round: 0, history: [] }`
- ✅ Creates lockfile path (not lock yet — established in TASK-707)
**File Locations:**
- `cli/steer/init.ts` (new)
**Quality Gate:** `fleet steer init test-slug` produces valid folder; running twice fails cleanly
**Risk Level:** Low

---

### TASK-105: `fleet steer status` — human-readable state summary
**Timebox:** 15 minutes
**Dependencies:** TASK-103
**Priority:** High
**Acceptance Criteria:**
- ✅ Reads state.json from cwd-detected change folder
- ✅ Prints: phase, round (if review), active task (if execute), history tail
- ✅ Returns exit 1 if not inside a steer change folder
**File Locations:**
- `cli/steer/status.ts` (new)
**Quality Gate:** Manual eyeball test; output is parseable to a glance
**Risk Level:** Low

---

## Phase 2: Phase Walk + Templates (Day 2)

### TASK-201: Template loader with `{{var}}` substitution
**Timebox:** 25 minutes
**Dependencies:** TASK-101
**Priority:** Critical
**Acceptance Criteria:**
- ✅ `loadTemplate(name, vars)` reads from `templates/steer/<name>.md`
- ✅ Falls back to `.steer/templates/<name>.md` if repo override exists
- ✅ Substitutes `{{slug}}`, `{{round}}`, `{{prior_artifact}}`, `{{phase}}`
- ✅ Errors with template path + missing var name
**File Locations:**
- `cli/steer/templates.ts` (new)
- `templates/steer/.gitkeep` (new dir)
**Quality Gate:** Unit test for substitution + override + missing-var error
**Risk Level:** Low

---

### TASK-202: Phase template files (context, spec, plan, tasks)
**Timebox:** 30 minutes
**Dependencies:** TASK-201
**Priority:** Critical
**Acceptance Criteria:**
- ✅ `templates/steer/context.md` — codebase research prompt
- ✅ `templates/steer/spec.md` — spec authoring prompt referencing 00-context.md
- ✅ `templates/steer/plan.md` — plan authoring prompt referencing 01-spec.md
- ✅ `templates/steer/tasks.md` — task decomposition prompt
- ✅ All templates self-contained (no `@file` refs)
**File Locations:**
- `templates/steer/{context,spec,plan,tasks}.md` (new)
**Quality Gate:** Templates manually reviewed; pipe into `claude -p` produces sensible output
**Risk Level:** Medium
**Mitigation:** Templates are easily edited post-MVP; iterate on real usage

---

### TASK-203: `fleet steer next` — emit current-phase prompt
**Timebox:** 25 minutes
**Dependencies:** TASK-103, TASK-201, TASK-202
**Priority:** Critical
**Acceptance Criteria:**
- ✅ Reads state, loads matching phase template, substitutes vars
- ✅ Writes prompt to stdout (no other output; no logging to stdout)
- ✅ Logs (if any) go to stderr
- ✅ Exit 0 on success
**File Locations:**
- `cli/steer/next.ts` (new)
**Quality Gate:** `fleet steer next | wc -l` returns expected line count; stdout pipe-clean
**Risk Level:** Low

---

### TASK-204: `fleet steer advance` — phase transition with prerequisites
**Timebox:** 30 minutes
**Dependencies:** TASK-103, TASK-203
**Priority:** Critical
**Acceptance Criteria:**
- ✅ Validates current phase artifact exists + non-empty
- ✅ Refuses to advance if validation fails (prints which file is missing/empty)
- ✅ Updates state.json via writeState (atomic)
- ✅ Logs transition to history array
- ✅ State machine encoded as exhaustive switch (TS exhaustiveness check on Phase enum)
**File Locations:**
- `cli/steer/advance.ts` (new)
- `cli/steer/state-machine.ts` (new) — pure function: `nextPhase(current: Phase): Phase`
**Quality Gate:** Unit tests for every phase transition + every missing-prerequisite case
**Risk Level:** Medium
**Mitigation:** Exhaustive switch + tests catches missed transitions at compile time

---

### TASK-205: `fleet steer resume` — re-emit prompt for in-flight phase
**Timebox:** 15 minutes
**Dependencies:** TASK-203
**Priority:** High
**Acceptance Criteria:**
- ✅ Behaves identically to `fleet steer next` (alias with intent)
- ✅ Idempotent — running twice produces identical stdout
**File Locations:**
- `cli/steer/resume.ts` (new)
**Quality Gate:** `diff <(fleet steer resume) <(fleet steer resume)` is empty
**Risk Level:** Low

---

## Phase 3: Adversarial Review Loop (Day 3)

### TASK-301: Per-round review template files (r1, r2, r3)
**Timebox:** 25 minutes
**Dependencies:** TASK-201
**Priority:** Critical
**Acceptance Criteria:**
- ✅ `templates/steer/review-r1.md` — ambiguity/completeness lens
- ✅ `templates/steer/review-r2.md` — security/perf/edge-case lens
- ✅ `templates/steer/review-r3.md` — maintainability/operational lens
- ✅ Each template ends with strict instruction: emit only JSON matching ReviewVerdict schema
**File Locations:**
- `templates/steer/review-r{1,2,3}.md` (new)
**Quality Gate:** Manual pipe to `claude -p` with sample spec — output is valid JSON
**Risk Level:** Medium
**Mitigation:** JSON-only output is fragile; back it with strict parser + retry-on-malformed in TASK-303

---

### TASK-302: ReviewVerdict Zod schema
**Timebox:** 15 minutes
**Dependencies:** TASK-102
**Priority:** Critical
**Acceptance Criteria:**
- ✅ Matches schema in spec: `{ status, round, lens, issues[] }`
- ✅ Rejects unknown fields (strict mode)
- ✅ Issue severity enum: high/medium/low
**File Locations:**
- `cli/steer/types.ts` — extend with ReviewVerdict + Zod schema
**Quality Gate:** Unit tests for valid + invalid + extra-field cases
**Risk Level:** Low

---

### TASK-303: Verdict parser with retry-on-malformed
**Timebox:** 30 minutes
**Dependencies:** TASK-302
**Priority:** Critical
**Acceptance Criteria:**
- ✅ `parseVerdict(rawAgentOutput): ReviewVerdict`
- ✅ Strips markdown code fences if present
- ✅ On parse failure, returns `null` (caller decides retry policy)
- ✅ Logs raw output to `02-spec-reviews/round-N-raw.txt` on failure for debugging
**File Locations:**
- `cli/steer/review-parser.ts` (new)
**Quality Gate:** Unit tests with malformed JSON, fenced JSON, prose+JSON, valid JSON
**Risk Level:** High
**Mitigation:** Failure path preserves raw output for debug; never silently passes a malformed verdict

---

### TASK-304: `fleet steer review` — emit reviewer prompt + ingest verdict
**Timebox:** 30 minutes
**Dependencies:** TASK-301, TASK-303
**Priority:** Critical
**Acceptance Criteria:**
- ✅ `fleet steer review` (no flag) emits the round-N prompt for current artifact (spec or plan)
- ✅ `fleet steer review --ingest` reads verdict from stdin, parses, writes to `round-N.md`, updates state
- ✅ Increments round counter on each ingest
- ✅ Two consecutive `pass` verdicts → state advances to next phase
**File Locations:**
- `cli/steer/review.ts` (new)
**Quality Gate:** Integration test: 3 mock-pass verdicts triggers early-exit after round 2
**Risk Level:** High
**Mitigation:** Pass-count logic is the convergence behavior — must be unit-tested

---

### TASK-305: Circuit-break + `--resolve` escalation
**Timebox:** 25 minutes
**Dependencies:** TASK-304
**Priority:** Critical
**Acceptance Criteria:**
- ✅ When state.round == max_rounds and no early-exit, print summary of all open issues + prompt user "advance anyway? (y/N)"
- ✅ `fleet steer review --resolve` accepts ack non-interactively (for CI / scripted use)
- ✅ Resolution logged to `decisions.md` with timestamp + user note
**File Locations:**
- `cli/steer/review.ts` — extend
**Quality Gate:** Test: max_rounds=2, two issue-verdicts, --resolve advances; without --resolve, prompts
**Risk Level:** Medium
**Mitigation:** Default behavior is safe (prompt); CI usage is opt-in via flag

---

## Phase 4: Task Decomposition + Execute (Day 4)

### TASK-401: TaskStatus + dependency DAG types
**Timebox:** 15 minutes
**Dependencies:** TASK-102
**Priority:** Critical
**Acceptance Criteria:**
- ✅ `TaskStatus` enum: pending | active | verifying | done | failed | done-pending-handoff
- ✅ `TaskMetadata` includes id, slug, deps[], description
**File Locations:**
- `cli/steer/types.ts` — extend
**Quality Gate:** TS compiles
**Risk Level:** Low

---

### TASK-402: Parse `05-tasks.md` into TaskMetadata[]
**Timebox:** 30 minutes
**Dependencies:** TASK-401
**Priority:** Critical
**Acceptance Criteria:**
- ✅ Reads markdown checklist with frontmatter for deps
- ✅ Each task scaffolds `tasks/NNN-<slug>/` folder with `prompt.md`, `verify.md`, `status.json`
- ✅ Skips already-existing task folders (idempotent)
**File Locations:**
- `cli/steer/tasks.ts` (new)
- `templates/steer/task-prompt.md` (new) — per-task prompt template
- `templates/steer/task-verify.md` (new)
**Quality Gate:** Sample `05-tasks.md` produces correct folder count + valid status.json
**Risk Level:** Medium
**Mitigation:** Idempotency via skip-existing prevents corruption on re-run

---

### TASK-403: `fleet steer task start` — emit prompt for next ready task
**Timebox:** 25 minutes
**Dependencies:** TASK-402
**Priority:** Critical
**Acceptance Criteria:**
- ✅ Selects next pending task whose deps are all done
- ✅ Refuses to start if any task is currently active
- ✅ Updates task status.json to `active`
- ✅ Emits task prompt.md to stdout
- ✅ Updates state.json active_task field
**File Locations:**
- `cli/steer/task-start.ts` (new)
**Quality Gate:** Test: linear chain A→B→C; start picks A, blocks B until A done
**Risk Level:** Medium

---

### TASK-404: `fleet steer task list` — show task statuses
**Timebox:** 15 minutes
**Dependencies:** TASK-402
**Priority:** Medium
**Acceptance Criteria:**
- ✅ Prints table: id, status, deps, description (truncated)
- ✅ Highlights active + ready-to-start
**File Locations:**
- `cli/steer/task-list.ts` (new)
**Quality Gate:** Manual eyeball
**Risk Level:** Low

---

## Phase 5: Verify Gate (Day 5) — Load-Bearing

### TASK-501: Gate config schema + loader
**Timebox:** 20 minutes
**Dependencies:** TASK-102
**Priority:** Critical
**Acceptance Criteria:**
- ✅ Zod schema for `.steer/config.yaml` matching spec
- ✅ Loads from `.steer/config.yaml`, falls back to `~/.config/fleet/steer.yaml`, then defaults
- ✅ Default config baked in (no config file = sensible MVP defaults)
**File Locations:**
- `cli/steer/config.ts` (new)
**Quality Gate:** Test: missing file, partial file, full file all yield valid config
**Risk Level:** Low

---

### TASK-502: Check 1 — tests pass (configurable command)
**Timebox:** 20 minutes
**Dependencies:** TASK-501
**Priority:** Critical
**Acceptance Criteria:**
- ✅ Runs configured test command via Bun.spawn with timeout
- ✅ Captures stdout/stderr, writes to verify-result.md
- ✅ Returns `{ passed: bool, output: string }`
- ✅ Timeout produces explicit failure (not silent)
**File Locations:**
- `cli/steer/gate-checks/tests.ts` (new)
**Quality Gate:** Test: passing command, failing command, timeout
**Risk Level:** Medium
**Mitigation:** Explicit timeout prevents indefinite hang

---

### TASK-503: Check 2 — files exist (parsed from task verify.md)
**Timebox:** 20 minutes
**Dependencies:** TASK-501, TASK-402
**Priority:** Critical
**Acceptance Criteria:**
- ✅ Parses task's verify.md for `Files created:` and `Files modified:` sections
- ✅ Stats each file; passes only if all exist with size > 0
- ✅ Reports missing files explicitly
**File Locations:**
- `cli/steer/gate-checks/files.ts` (new)
**Quality Gate:** Unit tests for missing/empty/present
**Risk Level:** Low

---

### TASK-504: Check 3 — spec acceptance criteria parser + checker
**Timebox:** 30 minutes
**Dependencies:** TASK-501, TASK-402
**Priority:** Critical
**Acceptance Criteria:**
- ✅ Parses task verify.md for `## Acceptance Criteria` checklist
- ✅ Each criterion is either `[shell: <cmd>]` (run + check exit 0) or `[manual]` (prompt user)
- ✅ Aggregates pass/fail with per-criterion detail
**File Locations:**
- `cli/steer/gate-checks/acceptance.ts` (new)
- `templates/steer/task-verify.md` — establish criteria format convention
**Quality Gate:** Test: mixed shell + manual criteria
**Risk Level:** Medium
**Mitigation:** Manual criteria default to "fail" if --yes not set, preventing silent passes

---

### TASK-505: Check 4 — adversarial diff review (the option B gate)
**Timebox:** 30 minutes
**Dependencies:** TASK-303, TASK-501
**Priority:** Critical
**Acceptance Criteria:**
- ✅ Generates `git diff` for active task (against task start commit)
- ✅ Loads `templates/steer/diff-review.md` template, substitutes spec + diff
- ✅ Emits prompt to stdout (caller pipes to harness)
- ✅ `fleet steer verify --ingest-review` reads verdict from stdin
- ✅ On `pass` verdict → check passes
- ✅ On `issues` verdict → print summary + manual ack prompt (y/N), ack required to pass
- ✅ `--yes` flag bypasses ack (for CI)
**File Locations:**
- `cli/steer/gate-checks/diff-review.ts` (new)
- `templates/steer/diff-review.md` (new)
**Quality Gate:** E2E test: pass verdict auto-passes; issues verdict + 'n' fails; issues + 'y' passes
**Risk Level:** High — this is the load-bearing piece
**Mitigation:** Verdict schema is strict; manual ack default-deny on EOF

---

### TASK-506: `fleet steer verify` — orchestrate all 4 checks
**Timebox:** 25 minutes
**Dependencies:** TASK-502, TASK-503, TASK-504, TASK-505
**Priority:** Critical
**Acceptance Criteria:**
- ✅ Runs checks in order: tests → files → acceptance → diff-review
- ✅ Stops on first failure; later checks not run
- ✅ Aggregated result written to `tasks/NNN-<slug>/verify-result.md`
- ✅ On pass: task status → done; emits "ready for handoff" message
- ✅ On fail: task status → failed; emits debug prompt with check failure detail
- ✅ `fleet steer verify --check <name>` runs single check (re-runnable)
**File Locations:**
- `cli/steer/verify.ts` (new)
**Quality Gate:** E2E: full happy path passes; injected failure at each check stops correctly
**Risk Level:** High
**Mitigation:** Per-check granularity allows debug; never silently proceeds past a failure

---

## Phase 6: Solo Handoff (Day 6)

### TASK-601: Solo client interface + mock implementation
**Timebox:** 20 minutes
**Dependencies:** TASK-401
**Priority:** Critical
**Acceptance Criteria:**
- ✅ `interface SoloClient { createTask(metadata): Promise<{ id: string }> }`
- ✅ MockSoloClient writes to `specs/<slug>/tasks/NNN-<slug>/handoff.json`
- ✅ Selected via env var (`STEER_SOLO_MOCK=1`) for testing
**File Locations:**
- `cli/steer/solo-client.ts` (new)
**Quality Gate:** Mock writes valid JSON; interface compiles
**Risk Level:** Low
**Mitigation:** Mock-first lets us test E2E before real Solo API stabilizes

---

### TASK-602: Real Solo HTTP client (uses fleet's existing API client patterns)
**Timebox:** 30 minutes
**Dependencies:** TASK-601
**Priority:** High
**Acceptance Criteria:**
- ✅ POST to configured Solo endpoint with task metadata
- ✅ Honors auth headers from fleet config
- ✅ Returns Solo task id on success
**File Locations:**
- `cli/steer/solo-client.ts` — extend with HTTP impl
**Quality Gate:** Integration test against fleet's existing Solo (or fixture server)
**Risk Level:** Medium
**Mitigation:** Reuses existing fleet HTTP client patterns; isolates HTTP failures from gate logic

---

### TASK-603: Handoff with retry + backoff
**Timebox:** 25 minutes
**Dependencies:** TASK-601, TASK-602
**Priority:** Critical
**Acceptance Criteria:**
- ✅ On verify pass, automatically attempts handoff
- ✅ Retries per config (default 3 attempts, backoff 5s/15s/60s)
- ✅ On exhaustion, sets task status to `done-pending-handoff`
- ✅ Logs each attempt to verify-result.md
**File Locations:**
- `cli/steer/handoff.ts` (new)
**Quality Gate:** Test: 1st-attempt success; 2nd-attempt success after retry; exhaustion path
**Risk Level:** Medium

---

### TASK-604: `fleet steer handoff --retry` for stuck tasks
**Timebox:** 15 minutes
**Dependencies:** TASK-603
**Priority:** High
**Acceptance Criteria:**
- ✅ Lists all tasks with `done-pending-handoff` status
- ✅ Re-runs handoff for each
- ✅ Updates status to `done` on success
**File Locations:**
- `cli/steer/handoff.ts` — extend
**Quality Gate:** Test: simulate stuck task, retry succeeds
**Risk Level:** Low

---

## Phase 7: Polish + E2E (Day 7)

### TASK-701: `fleet steer rollback` — revert last task
**Timebox:** 25 minutes
**Dependencies:** TASK-403, TASK-506
**Priority:** Medium
**Acceptance Criteria:**
- ✅ Identifies most recent done task
- ✅ Runs `git revert <commit>` (or `git reset` if uncommitted)
- ✅ Sets task status back to pending
- ✅ Confirmation prompt before destructive action
**File Locations:**
- `cli/steer/rollback.ts` (new)
**Quality Gate:** Test in throwaway git repo
**Risk Level:** High — destructive
**Mitigation:** Confirmation prompt; only operates on identified task commit, not history

---

### TASK-702: Help text + per-harness invocation cheatsheet
**Timebox:** 25 minutes
**Dependencies:** All previous
**Priority:** High
**Acceptance Criteria:**
- ✅ Each subcommand has `--help` with example invocations
- ✅ `docs/steer/cheatsheet.md` with one-liners for claude/codex/cursor/manual
**File Locations:**
- `cli/steer/*.ts` — add help strings
- `docs/steer/cheatsheet.md` (new)
**Quality Gate:** Manual readthrough; examples verified to work
**Risk Level:** Low

---

### TASK-703: E2E happy-path integration test
**Timebox:** 30 minutes
**Dependencies:** All previous
**Priority:** Critical
**Acceptance Criteria:**
- ✅ Test fixture: scripted "agent" that emits canned responses for each phase
- ✅ Walks: init → context → spec → 3 reviews (2 pass) → plan → 3 reviews → tasks → execute task 1 → verify pass → mock-handoff success
- ✅ Final state.json shows `done`; mock-handoff.json exists
**File Locations:**
- `cli/steer/__tests__/e2e.test.ts` (new)
**Quality Gate:** Single `bun test` invocation passes
**Risk Level:** Medium
**Mitigation:** Scripted agent removes LLM nondeterminism from test

---

### TASK-704: Failure-path integration tests
**Timebox:** 25 minutes
**Dependencies:** TASK-703
**Priority:** High
**Acceptance Criteria:**
- ✅ Test: tests-fail → verify aborts at check 1
- ✅ Test: missing file → verify aborts at check 2
- ✅ Test: failed acceptance criterion → verify aborts at check 3
- ✅ Test: diff-review issues + 'n' ack → verify fails
**File Locations:**
- `cli/steer/__tests__/e2e-failures.test.ts` (new)
**Quality Gate:** All 4 tests pass
**Risk Level:** Low

---

### TASK-705: Concurrent-invocation lockfile
**Timebox:** 20 minutes
**Dependencies:** TASK-103
**Priority:** Medium
**Acceptance Criteria:**
- ✅ All state-mutating subcommands acquire `specs/<slug>/.lock` (proper-lockfile or similar)
- ✅ Second invocation prints "another steer is running for this change" and exits 1
- ✅ Lock released on process exit (including SIGINT)
**File Locations:**
- `cli/steer/lockfile.ts` (new)
- All mutating subcommands wrapped
**Quality Gate:** Test: two parallel `fleet steer advance` — one succeeds, one rejects cleanly
**Risk Level:** Medium

---

### TASK-706: Documentation index update
**Timebox:** 15 minutes
**Dependencies:** TASK-702
**Priority:** Medium
**Acceptance Criteria:**
- ✅ `docs/index.md` (or fleet README) links to steer docs
- ✅ Mentions MVP scope + deferred items from spec
**File Locations:**
- `docs/index.md` or `README.md`
**Quality Gate:** Links resolve
**Risk Level:** Low

---

### TASK-707: Smoke test against real Solo
**Timebox:** 20 minutes
**Dependencies:** TASK-602, TASK-703
**Priority:** Critical
**Acceptance Criteria:**
- ✅ Run E2E test with `STEER_SOLO_MOCK=0` against staging Solo
- ✅ Verify task lands in Solo's ledger with correct metadata
- ✅ Document any Solo API gaps for v0.2 plan
**Quality Gate:** Solo API call succeeds; ticket visible in Solo UI
**Risk Level:** High — depends on Solo API stability
**Mitigation:** If Solo API blocks, ship MVP with mock-only and split real-handoff into v0.2

---

## Critical Path Diagram

```
TASK-101 → 102 → 103 → 104 → 105
                    ↓
                   201 → 202 → 203 → 204 → 205
                                       ↓
                                      301 → 302 → 303 → 304 → 305
                                                                 ↓
                                                                401 → 402 → 403 → 404
                                                                                 ↓
                                                                                501 → 502 → 503 → 504 → 505 → 506
                                                                                                              ↓
                                                                                                             601 → 602 → 603 → 604
                                                                                                                                ↓
                                                                                                                               701 → 702 → 703 → 704 → 705 → 706 → 707
```

**Bottleneck tasks** (blocks most downstream work): 103, 204, 303, 506

---

## Risk Register

### High-Risk Tasks
- **TASK-303 (verdict parser)** — LLM JSON output is unreliable; mitigation: raw output preserved, retry-on-malformed in caller
- **TASK-505 (adversarial diff review)** — load-bearing for "done correctly"; mitigation: strict schema, default-deny on ack EOF
- **TASK-506 (verify orchestration)** — composition bugs hide failures; mitigation: per-check granularity, fail-fast
- **TASK-701 (rollback)** — destructive; mitigation: confirmation prompt + scoped to identified commit
- **TASK-707 (real Solo handoff)** — external dependency; mitigation: mock-first design, fallback to v0.2

### Schedule Risk
- Day 5 (Verify Gate) is the heaviest — 6 tasks, all critical, total ~140 minutes of pure work plus iteration. If it slips, Day 6 (Solo) is the natural buffer (mock-only ships, real handoff to v0.2).

---

## Out of Scope (Plan)

Deferred from MVP plan; v0.2+ candidates:
- Per-phase model routing via `fleet.routing.yaml` integration
- Drift detection between tasks
- Full integration smoke runs (per-project scripts)
- `learnings.md` priming on `init` from prior changes
- Plugin extraction (`@fleettools/steer`)
- Web UI for state visualization

---

## Plan Validation

**Confidence Assessment:** 0.80 — One-week timeline tight but feasible given infrastructure reuse
**Implementation Risk:** Medium — state machine + gate composition is well-understood; reviewer-verdict parsing is the biggest unknown
**Success Probability:** 75% for full plan including TASK-707; 90% for MVP minus real-Solo handoff
**Critical Dependency Risk:** Solo API stability for TASK-707; everything else is internal

This plan delivers a verified MVP within 7 days, with intentional buffers (mock-Solo on Day 6, smoke test on Day 7) so that real Solo handoff can be deferred to v0.2 if the API isn't ready, without losing the MVP itself.
