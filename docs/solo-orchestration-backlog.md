# FleetTools Solo Backlog

This backlog converts the FleetTools orchestration spec into Solo tasks.

Assumptions:
- Solo is the source of truth for tasks, sessions, handoffs, and worktrees.
- FleetTools is the orchestration control plane.
- Squawk remains optional and non-authoritative for this work.
- Phase 1 harnesses are `claude-code`, `opencode`, and `codex`.

Note:
- Solo's public CLI currently exposes `--title`, `--description`, `--priority`, `--deps`, and `--tags` for `solo task create`.
- Acceptance criteria and definition-of-done details are embedded in the task descriptions below.

## Task Set

1. Write ADR establishing Solo/FleetTools/Squawk boundaries
2. Implement typed Solo adapter and error mapping
3. Implement routing rules config and validation
4. Implement harness adapter registry and availability probes
5. Implement Claude Code harness adapter
6. Implement OpenCode harness adapter
7. Implement Codex harness adapter
8. Implement orchestration core and run supervisor
9. Add FleetTools CLI task inspection commands backed by Solo
10. Add FleetTools CLI route and run commands
11. Add non-authoritative run projection storage
12. Harden reliability and failure handling
13. Update docs for Solo-backed orchestration
14. Add optional orchestration API wrappers

## Dependency Shape

Recommended dependency chain:

- 2 depends on 1
- 3 depends on 1
- 4 depends on 2 and 3
- 5 depends on 4
- 6 depends on 4
- 7 depends on 4
- 8 depends on 2, 3, 4, 5, 6, and 7
- 9 depends on 2 and 3
- 10 depends on 8 and 9
- 11 depends on 8
- 12 depends on 10 and 11
- 13 depends on 10
- 14 depends on 8 and 11

## Creation Script

Use `scripts/create-solo-orchestration-backlog.sh` to create the full backlog in Solo with dependencies wired automatically.

Example:

```bash
./scripts/create-solo-orchestration-backlog.sh
```

The script prints each created task ID and a final dependency summary.
