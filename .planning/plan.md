# OpenCode Plugin: FleetTools “SwarmTools-Style” Wiring

## Goal

Make `plugins/opencode/` behave like the SwarmTools OpenCode plugin:

- Primary interface is **tools** (callable, type-safe, predictable).
- Slash commands exist via OpenCode **command files/config** (not magical plugin hooks).
- Includes “memory/context” hooks so we don’t re-discover the same integration decisions every session.

## Reference patterns (what “like SwarmTools” means)

From SwarmTools’ `opencode-swarm-plugin` docs:

- Tools are **snake_case** (callable as `swarm_init({ ... })`, `swarmmail_inbox({ ... })`).
- Explicit **init** tool is required before doing meaningful work.
- “Context-safe” tool outputs (e.g. inbox caps output, doesn’t dump full bodies).
- Completion/cleanup is structured and automatic.

From OpenCode docs:

- Plugins can add tools via `tool()` helper from `@opencode-ai/plugin` (Zod validation).
- Slash commands are configured via `opencode.json` `command` entries or `.opencode/commands/*.md`.
- Plugins can add **memory** via hooks like `session.created` and `experimental.session.compacting`.

## Current state (gap analysis)

- `plugins/opencode/src/index.ts` defines tools named with hyphens (`fleet-status`, `fleet-start`, `fleet-stop`).
  - Hyphenated names are awkward/impossible to call in function-call style (`fleet-status()` is not a valid identifier).
- It tries to register slash commands via a `config()` hook.
  - This is **not** part of documented OpenCode plugin API; we should not depend on it.
- It passes CLI flags as a single interpolated string (likely parsed as one arg).
- Missing FleetTools coverage: `setup`, `doctor`, and `services`.
- Repo docs/tests disagree on whether the interface is `/fleet status` or `/fleet-status`.

## Target behavior

### Tools (SwarmTools-style, recommended path)

Provide these tools (snake_case), with Zod validation and context-safe outputs:

- `fleet_init({ project_path? })` (lightweight readiness check + guidance)
- `fleet_status({ format?: "text"|"json" })`
- `fleet_start({ services?: ("api"|"squawk")[] })`
- `fleet_stop({ services?: ("api"|"squawk")[], force?: boolean, timeout_ms?: number, format?: "text"|"json" })`
- `fleet_setup({ global?: boolean, force?: boolean })`
- `fleet_doctor({ format?: "text"|"json", fix?: boolean })`
- `fleet_services({ args?: string[] })` (pass-through; constrained to known subcommands if needed)
- `fleet_help()`

Back-compat:

- Keep existing hyphenated tool names as aliases (thin wrappers), so we don’t break anyone already using them.

### Slash command: `/fleet …` (optional but requested)

Because OpenCode commands are not registered by plugins, we provide `/fleet` via a setup step (like `swarm setup`).

- Create `.opencode/commands/fleet.md` with a template that:
  - Treats `$1` as subcommand (`status|start|stop|setup|doctor|services|help`).
  - Uses the appropriate `fleet_*` tool.
  - Uses `$ARGUMENTS` for the remainder.

Provide helper aliases as separate files if desired:

- `.opencode/commands/fleet-status.md`, `.opencode/commands/fleet-start.md`, etc.

### Memory + context (fix “we had to do this twice”)

- Add `fleet_context()` tool:
  - Returns a compact, stable “FleetTools state” block (mode, ports, running status, config paths, plugin version).
  - Default output is short; add `verbose` flag if needed.
- Add plugin hook `session.created`:
  - Appends `fleet_context()` output into the prompt (or shows a toast) once per session.
- Add plugin hook `experimental.session.compacting`:
  - Injects FleetTools state + “how to use fleet tools” into the compaction prompt so `/fleet` wiring doesn’t get forgotten.

## Implementation plan

### 1) Refactor to official OpenCode tool definitions

- Update `plugins/opencode/src/index.ts` to use:
  - `import type { Plugin } from "@opencode-ai/plugin"`
  - `import { tool } from "@opencode-ai/plugin"`
- Add `@opencode-ai/plugin` to `plugins/opencode/package.json` dependencies.
- Remove reliance on the undocumented `config()` hook.

### 2) Implement robust CLI execution (no broken arg splitting)

- Implement a single internal runner that constructs args as discrete tokens:
  - `fleet status` + optional `--json`
  - `fleet start` + `--services <csv>`
  - `fleet stop` + `--services <csv>` + `--force` + `--timeout <ms>` + `--json`
  - etc.

Security posture:

- Never accept arbitrary shell fragments.
- Validate `services` against enum.
- For `fleet_services`, either:
  - whitelist known subcommands/options, or
  - allow `args: string[]` but reject characters/patterns that look like shell control (`;`, `&&`, `|`, redirections).

### 3) Add “setup like swarmtools” for `/fleet`

Add tool: `fleet_opencode_setup({ project_path?: string, overwrite?: boolean })`:

- Ensures `.opencode/commands/` exists.
- Writes/updates `fleet.md` (and optional aliases) with stable templates.
- Prints “restart OpenCode” guidance.

This mirrors SwarmTools’ “install plugin → run setup” workflow.

### 4) Add memory/context hooks

- Add `fleet_context()` tool.
- Add `session.created` hook to append context.
- Add `experimental.session.compacting` hook to preserve FleetTools usage + current state across compaction.

### 5) Align repo docs + agent context

- Update `plugins/opencode/README.md`:
  - Document the primary tool interface (`fleet_status()`, etc).
  - Document `/fleet …` as “available after `fleet_opencode_setup()`”.
- Update `plugins/opencode/AGENTS.md` to match reality (tools-first; setup step for commands).

### 6) Fix and harden tests

- Update `plugins/opencode/test-contract.ts`:
  - Assert tool names include `fleet_status|start|stop|setup|doctor|services|help|context|opencode_setup`.
  - Remove assertions about plugin-registered commands.
- Add a focused test that:
  - Runs `fleet_opencode_setup()` against a temp dir.
  - Asserts `.opencode/commands/fleet.md` exists and contains expected placeholders (`$1`, `$ARGUMENTS`).

### 7) Validation (when leaving plan mode)

- `cd plugins/opencode && bun run build`
- `cd plugins/opencode && bun run test`
- Manual in OpenCode:
  - Confirm tools show up and can be invoked.
  - Run `fleet_opencode_setup()`.
  - Restart OpenCode.
  - Confirm `/fleet status` works.

## Acceptance criteria

- Tools callable in OpenCode using snake_case names.
- `fleet_start`/`fleet_stop` parse args correctly (no “flags collapsed into one arg” issues).
- `/fleet …` works after setup and restart.
- Session compaction retains FleetTools usage + current state.

## One decision to confirm (recommended default included)

Do you want the plugin to auto-run `fleet_opencode_setup()` when it detects missing `.opencode/commands/fleet.md`?

- Recommended default: **no auto-write**; show a toast instructing the user to run `fleet_opencode_setup()`.
- If you prefer “just works”, we can auto-create the files (idempotent, non-destructive unless `overwrite: true`).
