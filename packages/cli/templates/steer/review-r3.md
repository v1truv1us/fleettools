# Adversarial Review Round {{round}} — Maintainability/Operations

Review the {{phase}} artifact for `{{slug}}` with no reliance on prior chat history.

## Context

{{context}}

## Artifact Under Review

{{artifact}}

Look for maintainability, operability, testability, rollback, and documentation gaps.

Emit only strict JSON with exactly this schema:
{"status":"pass|issues","round":{{round}},"lens":"maintainability","issues":[{"severity":"high|medium|low","description":"...","location":"optional"}]}
