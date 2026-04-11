# Orchestration

Route Solo tasks to the right coding harness automatically.

---

## How it works

FleetTools sits between your task backlog (Solo) and your coding agents (Claude Code, OpenCode, Codex). You pick a task, FleetTools picks the best harness, runs it, and reports back.

```
Solo (task backlog) → FleetTools (routing + supervision) → Harness (does the work)
```

Solo is the source of truth for task state. FleetTools owns routing, launch, and lifecycle. Run history is stored locally at `.fleet/orchestration/runs.jsonl` as a non-authoritative projection.

---

## Prerequisites

Install at least one harness CLI so FleetTools can find it on PATH:

- **claude** — Claude Code CLI
- **opencode** — OpenCode CLI
- **codex** — OpenAI Codex CLI

Verify they're visible:

```bash
fleet harnesses status
```

You should see at least one `available` entry.

---

## Configure routing

Create `fleet.routing.yaml` in your project root. Rules are evaluated top-to-bottom, first match wins.

```yaml
version: 1

defaults:
  harness: claude-code
  timeout_ms: 1800000

rules:
  - id: backend-claude
    when:
      labels:
        - backend
    select:
      harness: claude-code

  - id: frontend-opencode
    when:
      labels:
        - frontend
        - ui
    select:
      harness: opencode

  - id: scaffolding-codex
    when:
      task_type: scaffold
    select:
      harness: codex
      timeout_ms: 1200000
```

### Rule fields

A rule matches when all `when` conditions are satisfied.

**`when` conditions:**

| Field | Matches against |
|-------|----------------|
| `labels` | Task labels (any match) |
| `task_type` | Task type field |
| `title_pattern` | Regex against task title |
| `priority_min` | Minimum numeric priority |
| `affected_patterns` | Regex against affected file paths (any match) |

**`select` fields:**

| Field | Purpose |
|-------|---------|
| `harness` | Which harness to use |
| `timeout_ms` | Run timeout override |

Validate your config:

```bash
fleet rules validate
```

---

## Inspect tasks

List tasks from Solo that are ready for work:

```bash
fleet tasks list
```

Show details for a specific task:

```bash
fleet tasks show T-1
```

---

## Preview routing

See which harness FleetTools would pick without running anything:

```bash
fleet route T-1
```

Output shows the matched rule, selected harness, and timeout.

---

## Run a task

Execute a task through the full orchestration pipeline:

```bash
fleet run T-1
```

FleetTools will route → claim → run → complete (or fail).

Override the harness choice:

```bash
fleet run T-1 --harness codex
```

---

## View run history

List all local run projections:

```bash
fleet runs
```

---

## Use the API

Start the API server:

```bash
fleet start --api-only
```

### List available tasks

```http
GET /api/v1/orchestration/tasks?limit=20
```

### Preview routing

```http
GET /api/v1/orchestration/tasks/T-1/route
```

### Check harness availability

```http
GET /api/v1/orchestration/harnesses
```

### View run history

```http
GET /api/v1/orchestration/runs
```

### Execute a run

```http
POST /api/v1/orchestration/runs
Content-Type: application/json

{
  "taskId": "T-1",
  "harness": "opencode"
}
```

The `harness` field is optional. Omit it to use routing rules.

---

## Harness specifics

### Claude Code

Uses `--print --output-format json` for non-interactive execution. Supports structured JSON output via `--json-schema`.

Override binary path: `FLEET_CLAUDE_COMMAND=/path/to/claude`

### OpenCode

Uses `run --format json --dir <path>` for non-interactive execution. Strips ANSI codes and extracts JSON from the output.

Override binary path: `FLEET_OPENCODE_COMMAND=/path/to/opencode`

### Codex

Uses `exec --full-auto --sandbox workspace-write` for non-interactive execution. Runs with workspace-write sandbox permissions.

Override binary path: `FLEET_CODEX_COMMAND=/path/to/codex`

---

## Run lifecycle

Each `fleet run` goes through these phases:

1. **Route** — match task against `fleet.routing.yaml` rules
2. **Claim** — Solo `task ready` + `session start` to lock the task
3. **Run** — launch the selected harness with a built prompt
4. **Complete** — Solo `task done` or `task fail` based on harness result
5. **Record** — append run to `.fleet/orchestration/runs.jsonl`

If the harness returns `status: "handoff"`, the run records remaining work and the next worker hint, but no automatic re-dispatch happens in v1.

---

## Environment variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `FLEET_CLAUDE_COMMAND` | Override Claude Code binary | `claude` |
| `FLEET_OPENCODE_COMMAND` | Override OpenCode binary | `opencode` |
| `FLEET_CODEX_COMMAND` | Override Codex binary | `codex` |

---

## Troubleshooting

### Harness shows as unavailable

Check that the binary is on your PATH:

```bash
which claude opencode codex
```

Or set the override env var for the one that's missing.

### Routing config not found

Make sure `fleet.routing.yaml` exists in your project root. Without it, FleetTools falls back to the `defaults` block (claude-code, 30min timeout).

### Task claim fails with TASK_LOCKED

Another session already claimed this task. Use `solo task show <id>` to check the current session state.
