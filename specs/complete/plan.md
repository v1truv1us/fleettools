# FleetTools Phase 1: CLI Service Management Implementation Plan

**Version:** 1.0.0  
**Status:** Ready for Implementation  
**Author:** Implementation Team  
**Date:** 2026-01-06  
**Estimated Duration:** 2 hours  
**Critical Path:** Sequential task execution (no parallel opportunities)

---

## Executive Summary

Phase 1 focuses on integrating the existing `PodmanPostgresProvider` with the FleetTools CLI service management commands. The implementation involves fixing a missing import, converting synchronous CLI functions to async, and wiring up provider method calls. This phase presents minimal risk and delivers immediate value by enabling developers to manage local Postgres containers via the CLI.

---

## Task Breakdown

### TASK-PH1-001: Fix Missing `path` Import in Provider

**Description:** Add missing `path` module import to `providers/podman-postgres.ts` to resolve ReferenceError at line 306.

**Effort Estimate:** 5 minutes  
**Risk Level:** Low  
**Dependencies:** None  

#### Sub-tasks
- [ ] Add `import path from 'node:path';` after existing imports
- [ ] Verify fix resolves `createPodmanPostgresProvider()` function

#### Acceptance Criteria
- [ ] Import error resolved when running `node providers/podman-postgres.ts`
- [ ] No TypeScript compilation errors
- [ ] Provider factory function works without ReferenceError

#### Testing Requirements
- **Unit Test:** Verify import resolution (manual check)
- **Integration Test:** Provider factory executes successfully

#### Quality Gates
- [ ] Code passes TypeScript compilation
- [ ] No linting errors
- [ ] Import follows project conventions (node: prefix)

#### Risk Mitigation
- **Risk:** Breaking existing import structure
- **Mitigation:** Add import in correct position, verify existing functionality unchanged

---

### TASK-PH1-002: Import PodmanPostgresProvider into CLI

**Description:** Add the provider import to `cli/index.ts` to enable access to the PodmanPostgresProvider class and factory function.

**Effort Estimate:** 5 minutes  
**Risk Level:** Low  
**Dependencies:** TASK-PH1-001

#### Sub-tasks
- [ ] Add import statement after existing imports (line 15)
- [ ] Verify TypeScript recognizes imported symbols

#### Acceptance Criteria
- [ ] Import statement added without syntax errors
- [ ] TypeScript recognizes `createPodmanPostgresProvider` and `PodmanPostgresProvider`
- [ ] No compilation errors in CLI module

#### Testing Requirements
- **Unit Test:** Verify import resolution
- **Type Check:** TypeScript compilation succeeds

#### Quality Gates
- [ ] Correct import path using `.js` extension
- [ ] Named exports properly imported
- [ ] No circular dependencies

#### Risk Mitigation
- **Risk:** Import path mismatch
- **Mitigation:** Verify exact export names in provider module

---

### TASK-PH1-003: Implement `servicesUp()` Function

**Description:** Replace the synchronous `servicesUpSync()` placeholder with an async implementation that calls the provider's `start()` method.

**Effort Estimate:** 30 minutes  
**Risk Level:** Low  
**Dependencies:** TASK-PH1-001, TASK-PH1-002

#### Sub-tasks
- [ ] Convert function signature to async
- [ ] Instantiate provider with configuration from config file
- [ ] Add error handling with try/catch blocks
- [ ] Implement proper Podman availability check
- [ ] Add descriptive error messages with installation instructions
- [ ] Update console output to match user story examples

#### Acceptance Criteria
- [ ] Running `fleet services up` starts Postgres container
- [ ] Container uses correct name: `fleettools-pg`
- [ ] Command waits for Postgres to be ready before returning
- [ ] Success message displays connection information
- [ ] Error message includes installation instructions when Podman missing
- [ ] If container already exists, it starts the existing container

#### Testing Requirements
- **Integration Test:** End-to-end container startup
- **Error Path Test:** Podman not installed scenario
- **Edge Case Test:** Container already running

#### Quality Gates
- [ ] Async/await properly implemented
- [ ] Error handling covers all failure modes
- [ ] Console output matches specification
- [ ] Provider configuration passed correctly

#### Risk Mitigation
- **Risk:** Container startup timeout
- **Mitigation:** Provider already handles timeout with configurable maxAttempts
- **Risk:** Platform-specific issues
- **Mitigation:** Provider includes macOS Podman machine handling

---

### TASK-PH1-004: Implement `servicesDown()` Function

**Description:** Replace synchronous `servicesDownSync()` with async implementation that calls provider's `stop()` method.

**Effort Estimate:** 15 minutes  
**Risk Level:** Low  
**Dependencies:** TASK-PH1-001, TASK-PH1-002

#### Sub-tasks
- [ ] Convert function signature to async
- [ ] Instantiate provider with configuration
- [ ] Add error handling for provider operations
- [ ] Update console output to match specification
- [ ] Handle case where container not running

#### Acceptance Criteria
- [ ] Running `fleet services down` stops Postgres container
- [ ] Container stopped gracefully (not removed)
- [ ] Success message confirms container stopped
- [ ] Informative message when container not running
- [ ] Error handling for Podman unavailability

#### Testing Requirements
- **Integration Test:** Container stop functionality
- **Edge Case Test:** Container already stopped
- **Error Path Test:** Podman not available

#### Quality Gates
- [ ] Proper async implementation
- [ ] Graceful handling of non-existent container
- [ ] Clear console messaging
- [ ] Data persistence in volume maintained

#### Risk Mitigation
- **Risk:** Data loss in volume
- **Mitigation:** Provider uses stop (not rm), preserving data volume

---

### TASK-PH1-005: Implement `servicesLogs()` Function

**Description:** Replace `servicesLogsSync()` with async implementation that calls provider's `logs()` method with optional tail parameter.

**Effort Estimate:** 15 minutes  
**Risk Level:** Low  
**Dependencies:** TASK-PH1-001, TASK-PH1-002

#### Sub-tasks
- [ ] Convert function signature to async with tail parameter
- [ ] Add service validation (postgres/pg only)
- [ ] Call provider logs method with tail argument
- [ ] Format and display logs appropriately
- [ ] Handle missing container scenario

#### Acceptance Criteria
- [ ] Running `fleet services logs` displays last 100 lines of container logs
- [ ] Optional `--tail <n>` flag works correctly
- [ ] Informative message when container doesn't exist
- [ ] Logs displayed in real-time format with timestamps
- [ ] Error handling for invalid service names

#### Testing Requirements
- **Integration Test:** Log retrieval functionality
- **Parameter Test:** Tail flag variations
- **Error Test:** Invalid service name

#### Quality Gates
- [ ] Tail parameter validation
- [ ] Service name validation
- [ ] Proper log formatting
- [ ] Error messages for missing container

#### Risk Mitigation
- **Risk:** Large log output
- **Mitigation:** Default tail of 100 lines, configurable via parameter

---

### TASK-PH1-006: Enhance `servicesStatus()` Function

**Description:** Upgrade `servicesStatusSync()` to async implementation that calls provider's `status()` method and displays detailed container information.

**Effort Estimate:** 20 minutes  
**Risk Level:** Low  
**Dependencies:** TASK-PH1-001, TASK-PH1-002

#### Sub-tasks
- [ ] Convert function signature to async
- [ ] Call provider status method
- [ ] Parse and display status information
- [ ] Add visual indicators (✓/✗) for running state
- [ ] Display additional details when available (version, image, etc.)
- [ ] Handle Podman unavailability gracefully

#### Acceptance Criteria
- [ ] Shows running/stopped status with visual indicator
- [ ] Displays container image and version when running
- [ ] Shows exposed port information
- [ ] Handles Podman not installed with warning only
- [ ] Never crashes with unhandled exceptions

#### Testing Requirements
- **Integration Test:** Status display for running container
- **Edge Case Test:** Status display for stopped container
- **Graceful Degradation Test:** Podman unavailable

#### Quality Gates
- [ ] Status information accurately displayed
- [ ] Visual indicators clear and consistent
- [ ] Error handling prevents crashes
- [ ] Output format matches specification

#### Risk Mitigation
- **Risk:** Provider status method failure
- **Mitigation:** Wrap in try/catch, display error message instead of crashing

---

### TASK-PH1-007: Update Command Handler for Async Functions

**Description:** Update the CLI command action handler to properly await the async service functions and handle promise rejections.

**Effort Estimate:** 10 minutes  
**Risk Level:** Low  
**Dependencies:** TASK-PH1-003, TASK-PH1-004, TASK-PH1-005, TASK-PH1-006

#### Sub-tasks
- [ ] Update command action handler to use await
- [ ] Ensure proper async/await propagation
- [ ] Update function calls to pass correct parameters
- [ ] Verify error propagation works correctly

#### Acceptance Criteria
- [ ] All service commands (up, down, logs, status) execute correctly
- [ ] Errors from async functions properly propagate
- [ ] Command exits with correct status codes
- [ ] Parameters passed correctly to functions

#### Testing Requirements
- **Integration Test:** All command variations
- **Error Propagation Test:** Verify error handling through command layer

#### Quality Gates
- [ ] No unhandled promise rejections
- [ ] Proper await usage throughout handler
- [ ] Consistent error handling behavior
- [ ] Command line interface functions correctly

#### Risk Mitigation
- **Risk:** Unhandled promise rejections
- **Mitigation:** Ensure all async calls are properly awaited and wrapped in try/catch

---

## Overall Implementation Strategy

### Sequential Execution Plan

```
TASK-PH1-001 (5m) → TASK-PH1-002 (5m) → TASK-PH1-003 (30m) → 
TASK-PH1-004 (15m) → TASK-PH1-005 (15m) → TASK-PH1-006 (20m) → 
TASK-PH1-007 (10m) → Testing (30m)
```

**Total Estimated Time:** 2 hours 10 minutes

### Critical Path Analysis

The tasks form a strict sequential dependency chain:
- Tasks 001-002: Prerequisites for all subsequent tasks
- Tasks 003-006: Independent service functions but require async conversion
- Task 007: Final integration layer
- No parallel execution opportunities due to import and async dependencies

### Risk Assessment Summary

| Risk Category | Risk Level | Mitigation Strategy |
|---------------|------------|-------------------|
| Technical Implementation | Low | Well-defined provider interface, minimal code changes |
| Platform Compatibility | Low | Provider already handles platform differences |
| Breaking Existing Functionality | Low | Isolated to service commands, no core logic changes |
| Performance Impact | Minimal | Simple provider method calls, no computationally intensive operations |

### Quality Assurance Strategy

#### Code Review Requirements
- [ ] All changes reviewed by at least one team member
- [ ] Focus on async/await implementation correctness
- [ ] Verify error handling completeness
- [ ] Check console output matches specification

#### Testing Strategy
- **Manual Testing:** Complete end-to-end verification of all commands
- **Automated Testing:** Basic unit tests for error scenarios (if time permits)
- **Platform Testing:** Verify on macOS, Linux, and Windows environments

#### Acceptance Testing Checklist
```bash
# Prerequisite: Podman installed
podman --version

# Test 1: Start services
fleet services up
# Expected: Container starts, success message displayed

# Test 2: Check status (running)
fleet services status  
# Expected: Shows "✓ Running" with details

# Test 3: View logs
fleet services logs
# Expected: Shows Postgres logs

# Test 4: Stop services
fleet services down
# Expected: Container stops, success message

# Test 5: Check status (stopped)
fleet services status
# Expected: Shows "✗ Not running"

# Test 6: Start existing container
fleet services up
# Expected: Starts existing container

# Test 7: Error handling (Podman unavailable)
# Expected: Clear installation instructions
```

### Deployment and Release Strategy

#### Release Notes
- **Breaking Changes:** None (CLI interface unchanged)
- **New Features:** Functional service management commands
- **Bug Fixes:** Resolved TODO placeholders in service commands

#### Rollback Plan
- **Code Changes:** Simple git revert to previous commit
- **Data Impact:** No data changes, only container lifecycle management
- **User Impact:** Minimal, reverts to non-functional service commands

### Monitoring and Observability

#### Success Metrics
- **CLI Command Success Rate:** 100% for all service commands
- **Container Startup Time:** < 90 seconds (including image pull)
- **Error Message Clarity:** 90% user comprehension in usability testing

#### Performance Benchmarks
- `fleet services up`: < 90 seconds (including first-time image pull)
- `fleet services down`: < 10 seconds
- `fleet services status`: < 2 seconds
- `fleet services logs`: < 5 seconds

### Documentation Requirements

#### Update Requirements
- [ ] README.md updated to reflect functional service commands
- [ ] Add troubleshooting section for common Podman issues
- [ ] Update installation documentation to include Podman

#### Code Documentation
- [ ] Inline comments for async conversions
- [ ] Update JSDoc for modified functions
- [ ] Document error handling approach

---

## Task Dependencies Graph

```
TASK-PH1-001 (Fix Import)
    ↓
TASK-PH1-002 (Add Import)
    ↓
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ TASK-PH1-003│ TASK-PH1-004│ TASK-PH1-005│ TASK-PH1-006│
│ (servicesUp)│(servicesDown)│(servicesLogs)│(servicesStatus)│
└─────────────┴─────────────┴─────────────┴─────────────┘
    ↓
TASK-PH1-007 (Command Handler)
    ↓
Testing & Validation
```

---

## Resource Requirements

### Human Resources
- **Primary Developer:** 1 developer for implementation
- **Code Reviewer:** 1 reviewer for quality assurance
- **Tester:** 1 person for manual validation (can be same as reviewer)

### Technical Resources
- **Development Environment:** Node.js 18+, TypeScript, Podman
- **Testing Environment:** Access to multiple platforms (macOS, Linux, Windows)
- **CI/CD:** Existing pipeline for automated checks

### Prerequisites
- [ ] Podman installed on development machine
- [ ] Existing FleetTools codebase checked out
- [ ] Development environment configured

---

## Success Criteria Verification

### Functional Verification
- [ ] `fleet services up` starts Postgres container successfully
- [ ] `fleet services up` (when already running) starts existing container  
- [ ] `fleet services down` stops running container
- [ ] `fleet services down` (when not running) displays informative message
- [ ] `fleet services logs` displays container logs
- [ ] `fleet services logs` (when container missing) displays error with guidance
- [ ] `fleet services status` shows running state correctly
- [ ] `fleet services status` shows stopped state correctly

### Error Handling Verification
- [ ] All commands display helpful error when Podman not installed
- [ ] Startup timeout displays clear error message
- [ ] Container creation failure displays actionable error

### Integration Verification
- [ ] Provider `path` import fix allows factory function to work
- [ ] CLI correctly imports and instantiates provider
- [ ] Async/await properly propagates through command handlers

---

## Post-Implementation Activities

### Knowledge Transfer
- [ ] Team walkthrough of async conversion approach
- [ ] Documentation of error handling patterns
- [ ] Share platform-specific considerations

### Performance Monitoring
- [ ] Benchmark command execution times
- [ ] Monitor resource usage during operations
- [ ] Validate timeout handling effectiveness

### User Feedback Collection
- [ ] Solicit feedback from early adopters
- [ ] Monitor support requests for service commands
- [ ] Track error message clarity improvements

---

**Plan Confidence:** 0.95  
**Last Updated:** 2026-01-06  
**Next Phase:** Phase 2 SQLite Event-Sourced Persistence