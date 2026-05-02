# Adversarial Review Round {{round}} — Security/Performance/Edges

Review the {{phase}} artifact for `{{slug}}` with no reliance on prior chat history.

## Context

{{context}}

## Artifact Under Review

{{artifact}}

Look for security, data integrity, performance, failure-mode, and edge-case gaps.

Emit only strict JSON with exactly this schema:
{"status":"pass|issues","round":{{round}},"lens":"security-perf","issues":[{"severity":"high|medium|low","description":"...","location":"optional"}]}
