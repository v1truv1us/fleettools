# CLI Workspace Agent Context

**Hierarchy Level:** CLI Application
**Parent:** [../AGENTS.md](../AGENTS.md)
**Philosophy:** See [AGENTS.md](../AGENTS.md) Core Philosophy section

## Commands

```bash
cd cli
bun run build          # Compile TypeScript to dist/
bun run dev            # bun index.ts (run from project root)
bun start              # bun dist/index.js
```

## Key Patterns

- Uses `commander@^11.1.0` for CLI argument parsing
- YAML config parsing with `yaml@^2.3.4`
- Command structure in `src/commands/` directory
- Entry point: `index.ts` registers all commands
- No runtime Node.js dependencies (Bun runtime only)

## Integration Points

- Reads/writes config to `~/.config/fleet/fleet.json`
- Executes FleetTools subcommands via CLI
- Outputs to stdout/stderr with optional JSON mode
