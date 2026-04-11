# FleetTools Project

This is a FleetTools project for AI agent coordination.

FleetTools now supports a Solo-backed orchestration path where:
- `Solo` is the source of truth for tasks, sessions, handoffs, and worktrees
- `FleetTools` handles routing, harness selection, and run supervision
- `Squawk` remains optional and non-authoritative for transient coordination

## Getting Started

1. Start FleetTools services:
   ```bash
   fleet start
   ```

2. Check status:
   ```bash
   fleet status
   ```

3. View available commands:
   ```bash
   fleet --help
   ```

4. Inspect Solo-backed orchestration tasks:
   ```bash
   fleet tasks list
   fleet route T-1
   fleet harnesses status
   ```

## Project Structure

- `.fleet/` - Local FleetTools data and services
- `.solo/` - Solo task ledger and per-task worktrees
- `.flightline/` - Git-backed work tracking
- `fleet.routing.yaml` - Harness routing policy for orchestration
- `spec/` - Project specifications
- `tests/` - Test files

## Learn More

Visit [FleetTools Documentation](https://github.com/v1truvius/fleettools) for more information.
