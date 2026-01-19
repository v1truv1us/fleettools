# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Add `fleet.runtime` configuration field to support `consolidated` (default) and `split` modes
- In consolidated mode, `fleet start` now starts only the API server (Squawk runs embedded)
- Consolidated mode avoids port conflicts by not spawning a standalone Squawk service
- Updated defaults: new projects use `fleet.runtime: consolidated`; standalone Squawk port moved from `3000` to `7201`
- Added runtime-aware port selection logic in `fleet start` with "next available port for this run only" behavior
- CLI warns and ignores `squawk` service request in consolidated mode to prevent user confusion
- Enhanced `fleet init` to write explicit `fleet.runtime: consolidated` in generated `fleet.yaml`

### Changed
- Squawk and API are started independently only when `fleet.runtime: split`
- Split mode uses distinct dynamic ports (Squawk: `7201+`, API: `3001+`)
- Consolidated mode serves Squawk endpoints under the API base URL (`http://localhost:${PORT}/api/v1/...`) with one process

### Deprecated
- In `fleet.yaml`, `services.squawk.port` now defaults to `7201` (instead of `3000`) to avoid common web dev port conflicts

### Fixed
- Resolved "Squawk started twice, EADDRINUSE on port 3000" issue in consolidated mode
- Runtime mode flag is read from project config with fallback to `consolidated`
- Proper environment variables are set in both modes for compatibility (`PORT`, `SQUAWK_URL`, `SQUAWK_PORT`)

## [0.2.0] - 2026-01-19

### Added
- Add `fleet.runtime` configuration field to support `consolidated` (default) and `split` modes
- In consolidated mode, `fleet start` now starts only the API server (Squawk runs embedded)
- Consolidated mode avoids port conflicts by not spawning a standalone Squawk service
- Updated defaults: new projects use `fleet.runtime: consolidated`; standalone Squawk port moved from `3000` to `7201`
- Added runtime-aware port selection logic in `fleet start` with "next available port for this run only" behavior
- CLI warns and ignores `squawk` service request in consolidated mode to prevent user confusion
- Enhanced `fleet init` to write explicit `fleet.runtime: consolidated` in generated `fleet.yaml`

### Changed
- Squawk and API are started independently only when `fleet.runtime: split`
- Split mode uses distinct dynamic ports (Squawk: `7201+`, API: `3001+`)
- Consolidated mode serves Squawk endpoints under the API base URL (`http://localhost:${PORT}/api/v1/...`) with one process

### Deprecated
- In `fleet.yaml`, `services.squawk.port` now defaults to `7201` (instead of `3000`) to avoid common web dev port conflicts

### Fixed
- Resolved "Squawk started twice, EADDRINUSE on port 3000" issue in consolidated mode
- Runtime mode flag is read from project config with fallback to `consolidated`
- Proper environment variables are set in both modes for compatibility (`PORT`, `SQUAWK_URL`, `SQUAWK_PORT`)