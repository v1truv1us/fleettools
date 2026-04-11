#!/usr/bin/env bash

set -euo pipefail

if ! command -v solo >/dev/null 2>&1; then
  printf 'solo binary not found in PATH\n' >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  printf 'node binary not found in PATH\n' >&2
  exit 1
fi

parse_task_id() {
  node -e 'let s=""; process.stdin.on("data", d => s += d).on("end", () => { const j = JSON.parse(s); const id = j?.data?.task?.id ?? j?.data?.id ?? ""; if (!id) process.exit(2); process.stdout.write(id); });'
}

create_task() {
  local __var_name="$1"
  local title="$2"
  local priority="$3"
  local tags="$4"
  local description="$5"
  local deps="${6:-}"

  local output
  if [[ -n "$deps" ]]; then
    output="$(solo task create --title "$title" --description "$description" --priority "$priority" --tags "$tags" --deps "$deps" --json)"
  else
    output="$(solo task create --title "$title" --description "$description" --priority "$priority" --tags "$tags" --json)"
  fi

  local task_id
  task_id="$(printf '%s' "$output" | parse_task_id)"
  printf -v "$__var_name" '%s' "$task_id"
  printf '%s -> %s\n' "$task_id" "$title"
}

printf 'Creating FleetTools orchestration backlog in Solo...\n\n'

create_task ADR_TASK \
  'Write ADR for Solo-backed FleetTools orchestration' \
  high \
  'orchestration,architecture,solo,fleettools' \
  $'Write an architecture decision record that establishes the authoritative boundaries for the orchestration app.\n\nScope:\n- Solo is the source of truth for tasks, sessions, handoffs, reservations, and worktrees.\n- FleetTools owns routing, harness launch, supervision, and operator workflow.\n- Squawk is non-authoritative and optional for transient events only.\n- Phase 1 harnesses are claude-code, opencode, and codex.\n\nAcceptance criteria:\n- A written ADR exists in the FleetTools repo.\n- The ADR explicitly marks duplicate FleetTools task systems as non-authoritative for this initiative.\n- Stable worker IDs are documented as claude-code, opencode, and codex.\n- The ADR is specific enough to guide implementation without ambiguity.'

create_task SOLO_ADAPTER_TASK \
  'Implement typed Solo adapter and error mapping' \
  critical \
  'orchestration,solo,core,adapter' \
  $'Build a CLI-only Solo adapter inside FleetTools.\n\nScope:\n- Add typed response models for Solo task, session, handoff, and worktree responses.\n- Add FleetTools-native error mapping for Solo error codes.\n- Implement listAvailableTasks, showTask, getTaskContext, startSession, endSession, createHandoff, and inspectWorktree.\n- Add bounded retry only for retryable Solo errors such as SQLITE_BUSY and VERSION_CONFLICT.\n\nAcceptance criteria:\n- FleetTools can successfully call Solo commands and parse JSON results.\n- Non-retryable Solo errors are surfaced clearly with preserved error codes.\n- TASK_LOCKED is never retried for the same task.\n- Integration tests cover successful session start/end and at least one retryable error path.' \
  "$ADR_TASK"

create_task ROUTING_RULES_TASK \
  'Implement routing rules config and validation' \
  high \
  'orchestration,routing,config' \
  $'Add an explicit rules-file-based routing system for FleetTools.\n\nScope:\n- Define a repo-local routing file format such as fleet.routing.yaml.\n- Implement config loading, schema validation, and default fallback behavior.\n- Implement first-match-wins rule evaluation.\n- Support initial conditions based on task metadata and repo facts.\n\nAcceptance criteria:\n- FleetTools can load and validate the routing config.\n- A route preview returns the chosen harness, matched rule ID, and reason.\n- Invalid config fails fast with actionable messages.\n- Tests cover first-match-wins and fallback selection behavior.' \
  "$ADR_TASK"

create_task HARNESS_REGISTRY_TASK \
  'Implement harness registry and availability probes' \
  high \
  'orchestration,harnesses,registry' \
  $'Create the shared harness abstraction used by FleetTools orchestration.\n\nScope:\n- Define the HarnessAdapter contract.\n- Implement a registry for configured harnesses.\n- Add availability probes for claude-code, opencode, and codex.\n- Expose harness status for CLI consumption.\n\nAcceptance criteria:\n- FleetTools can report whether each phase 1 harness is available.\n- The orchestration core can resolve an adapter by stable harness ID.\n- Harness probing happens before Solo session claim in the run flow.\n- Tests cover unavailable and partially configured harness states.' \
  "$SOLO_ADAPTER_TASK,$ROUTING_RULES_TASK"

create_task CLAUDE_TASK \
  'Implement Claude Code harness adapter' \
  high \
  'orchestration,harnesses,claude-code' \
  $'Implement the real Claude Code harness adapter for FleetTools.\n\nScope:\n- Probe Claude Code availability.\n- Launch Claude Code inside the Solo worktree returned by session start.\n- Assemble the FleetTools prompt envelope with Solo trust boundaries.\n- Normalize Claude outcomes into the shared HarnessRunResult contract.\n\nAcceptance criteria:\n- FleetTools can launch Claude Code in a Solo worktree.\n- The adapter never edits outside the assigned worktree path.\n- The adapter returns a normalized completed or failed result.\n- Timeout and termination behavior are implemented and tested.' \
  "$HARNESS_REGISTRY_TASK"

create_task OPENCODE_TASK \
  'Implement OpenCode harness adapter' \
  high \
  'orchestration,harnesses,opencode' \
  $'Implement the real OpenCode harness adapter for FleetTools.\n\nScope:\n- Probe OpenCode availability.\n- Launch OpenCode inside the Solo worktree returned by session start.\n- Reuse the FleetTools prompt envelope with Solo trust boundaries.\n- Normalize OpenCode outcomes into the shared HarnessRunResult contract.\n\nAcceptance criteria:\n- FleetTools can launch OpenCode in a Solo worktree.\n- The adapter does not rely on the existing FleetTools OpenCode plugin as the runtime path.\n- The adapter returns a normalized completed or failed result.\n- Timeout and termination behavior are implemented and tested.' \
  "$HARNESS_REGISTRY_TASK"

create_task CODEX_TASK \
  'Implement Codex harness adapter' \
  high \
  'orchestration,harnesses,codex' \
  $'Implement the real Codex harness adapter for FleetTools.\n\nScope:\n- Probe Codex availability.\n- Launch Codex inside the Solo worktree returned by session start.\n- Reuse the FleetTools prompt envelope with Solo trust boundaries.\n- Normalize Codex outcomes into the shared HarnessRunResult contract.\n\nAcceptance criteria:\n- FleetTools can launch Codex in a Solo worktree.\n- The adapter returns a normalized completed or failed result.\n- Timeout and termination behavior are implemented and tested.\n- Adapter behavior matches the common harness interface used by FleetTools.' \
  "$HARNESS_REGISTRY_TASK"

create_task ORCHESTRATOR_TASK \
  'Implement orchestration core and run supervisor' \
  critical \
  'orchestration,core,supervisor' \
  $'Build the main FleetTools orchestration flow for one task and one harness run.\n\nScope:\n- Implement route resolution, harness probe, Solo session claim, prompt assembly, harness launch, supervision, and final result handling.\n- Ensure FleetTools remains the supervising process for the run lifetime.\n- Support completion, failure, and handoff outcomes.\n- Keep the implementation independent from legacy FleetTools task queue and agent route systems.\n\nAcceptance criteria:\n- FleetTools can execute one Solo task end-to-end through the orchestration core.\n- Harness availability is checked before claiming the Solo session.\n- On success, FleetTools ends the session in Solo as completed.\n- On failure, FleetTools ends the session in Solo as failed or creates a handoff when appropriate.' \
  "$SOLO_ADAPTER_TASK,$ROUTING_RULES_TASK,$HARNESS_REGISTRY_TASK,$CLAUDE_TASK,$OPENCODE_TASK,$CODEX_TASK"

create_task CLI_TASKS_TASK \
  'Add FleetTools CLI task inspection commands backed by Solo' \
  medium \
  'cli,orchestration,solo' \
  $'Add task inspection commands to the FleetTools CLI using Solo as the source of truth.\n\nScope:\n- Add fleet tasks list.\n- Add fleet tasks show <taskId>.\n- Add output modes suitable for both humans and automation.\n- Include route preview context where useful.\n\nAcceptance criteria:\n- FleetTools lists available tasks from Solo.\n- FleetTools shows task details without querying legacy FleetTools task stores.\n- Output is correct in both human-readable and machine-readable modes.\n- CLI tests cover the new task commands.' \
  "$SOLO_ADAPTER_TASK,$ROUTING_RULES_TASK"

create_task CLI_RUN_TASK \
  'Add FleetTools CLI route and run commands' \
  critical \
  'cli,orchestration,run' \
  $'Add the operator-facing orchestration commands to the FleetTools CLI.\n\nScope:\n- Add fleet route <taskId>.\n- Add fleet run <taskId>.\n- Show selected harness, matched rule, Solo session ID, worktree path, and final outcome.\n- Keep task pickup manual-first.\n\nAcceptance criteria:\n- Operators can preview harness selection for a Solo task.\n- Operators can run a Solo task end-to-end from FleetTools CLI.\n- The run command clearly reports completed, failed, or handoff outcomes.\n- CLI tests cover route preview and run execution paths.' \
  "$ORCHESTRATOR_TASK,$CLI_TASKS_TASK"

create_task PROJECTION_TASK \
  'Add non-authoritative run projection storage' \
  medium \
  'orchestration,projection,observability' \
  $'Add local FleetTools projection storage for orchestration run history.\n\nScope:\n- Record run ID, task ID, selected harness, status transitions, timestamps, and artifact references.\n- Store projection state under FleetTools-owned local storage.\n- Keep projection state explicitly non-authoritative compared to Solo.\n\nAcceptance criteria:\n- FleetTools stores local run history without duplicating Solo task ownership.\n- Projection storage can be listed through a FleetTools command later.\n- Projection records include enough data for operator diagnostics.\n- The design documents that Solo remains authoritative for task and session state.' \
  "$ORCHESTRATOR_TASK"

create_task RELIABILITY_TASK \
  'Harden reliability and failure handling for orchestration runs' \
  critical \
  'orchestration,reliability,recovery' \
  $'Harden the orchestration path for real-world failures.\n\nScope:\n- Add bounded retry and backoff for retryable Solo failures.\n- Handle harness launch failures, timeouts, and forced termination.\n- Ensure operator-facing remediation is clear for TASK_LOCKED, WORKTREE_ERROR, and similar failures.\n- Add failure-focused tests and crash-path validation.\n\nAcceptance criteria:\n- FleetTools does not leave ambiguous outcomes after recoverable failures.\n- Retryable and non-retryable failures are treated differently and intentionally.\n- Timeout behavior is deterministic and tested.\n- Failure tests cover at least lock conflict, worktree error, harness timeout, and interrupted run scenarios.' \
  "$CLI_RUN_TASK,$PROJECTION_TASK"

create_task DOCS_TASK \
  'Update docs for Solo-backed FleetTools orchestration' \
  medium \
  'docs,orchestration,solo' \
  $'Update FleetTools documentation to reflect the new orchestration model.\n\nScope:\n- Explain that Solo is the ledger and FleetTools is the orchestrator.\n- Document routing rules, phase 1 harness support, and core CLI flows.\n- Remove or clarify stale docs that imply FleetTools owns the task ledger for this workflow.\n\nAcceptance criteria:\n- The top-level docs describe the Solo-backed orchestration model accurately.\n- The routing rules file and CLI run flow are documented.\n- Operator docs cover harness prerequisites and expected outputs.\n- Documentation no longer suggests that legacy FleetTools task systems are authoritative for this feature.' \
  "$CLI_RUN_TASK"

create_task API_TASK \
  'Add optional orchestration API wrappers' \
  medium \
  'api,orchestration,projection' \
  $'Add thin API wrappers for orchestration capabilities after the CLI path is stable.\n\nScope:\n- Add API endpoints for task listing, route preview, run creation, run status, and harness status.\n- Reuse the same core orchestration services as the CLI.\n- Avoid introducing a second orchestration model in the API layer.\n\nAcceptance criteria:\n- API routes call the shared orchestration core rather than duplicating logic.\n- API can return route previews and harness status.\n- API can create and inspect orchestration runs.\n- The API does not become authoritative for task or session state.' \
  "$ORCHESTRATOR_TASK,$PROJECTION_TASK"

printf '\nCreated tasks:\n'
printf '  %s ADR\n' "$ADR_TASK"
printf '  %s Solo adapter\n' "$SOLO_ADAPTER_TASK"
printf '  %s Routing rules\n' "$ROUTING_RULES_TASK"
printf '  %s Harness registry\n' "$HARNESS_REGISTRY_TASK"
printf '  %s Claude adapter\n' "$CLAUDE_TASK"
printf '  %s OpenCode adapter\n' "$OPENCODE_TASK"
printf '  %s Codex adapter\n' "$CODEX_TASK"
printf '  %s Orchestrator core\n' "$ORCHESTRATOR_TASK"
printf '  %s CLI tasks\n' "$CLI_TASKS_TASK"
printf '  %s CLI route/run\n' "$CLI_RUN_TASK"
printf '  %s Projection store\n' "$PROJECTION_TASK"
printf '  %s Reliability hardening\n' "$RELIABILITY_TASK"
printf '  %s Docs\n' "$DOCS_TASK"
printf '  %s API wrappers\n' "$API_TASK"
