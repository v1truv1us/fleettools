# Fleet Steer Task Prompt — {{task_id}}

Implement only this atomic task:

{{task_description}}

Dependencies: {{deps}}

Rules:
- Preserve unrelated worktree changes.
- Follow existing project patterns.
- Add or update focused tests where practical.
- Do not mark the task done; run `fleet steer verify` after implementation.
