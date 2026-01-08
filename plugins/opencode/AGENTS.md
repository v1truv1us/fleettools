# OpenCode Plugin Agent Context

**Hierarchy Level:** Editor Plugin
**Parent:** [../../AGENTS.md](../../AGENTS.md)
**Philosophy:** See [AGENTS.md](../../AGENTS.md) Core Philosophy section

## Commands

```bash
cd plugins/opencode
bun run build          # Compile TypeScript to dist/
bun run clean           # Remove dist/
```

## Key Patterns

- No external dependencies (uses only Node.js built-ins)
- Executes `fleet` CLI commands via `child_process.exec`
- Plugin SDK interfaces: `OpenCodeCommand`, `OpenCodeCommandRegistry`
- Fallback mode when SDK unavailable
- Commands: /fleet status, setup, doctor, services, help

## Integration

- Binary: `fleet-opencode` in `dist/index.js`
- Reads `fleet status --json` for structured output
- Outputs to console for OpenCode consumption
