# Fleet Steer Diff Review — {{task_id}}

Review this completed task diff against the spec and task verification notes.

## Spec

{{spec}}

## Task Verify Notes

{{verify}}

## Git Diff

```diff
{{diff}}
```

Emit only strict JSON with exactly this schema:
{"status":"pass|issues","round":1,"lens":"custom","issues":[{"severity":"high|medium|low","description":"...","location":"optional"}]}
