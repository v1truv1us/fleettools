# Adversarial Review Round {{round}} — Ambiguity/Completeness

Review the {{phase}} artifact for `{{slug}}` with no reliance on prior chat history.

## Context

{{context}}

## Artifact Under Review

{{artifact}}

Look for ambiguity, missing acceptance criteria, unstated dependencies, and incomplete scope boundaries.

Emit only strict JSON with exactly this schema:
{"status":"pass|issues","round":{{round}},"lens":"ambiguity","issues":[{"severity":"high|medium|low","description":"...","location":"optional"}]}
