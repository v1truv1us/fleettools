# Learning System Guide

This guide explains how the FleetTools learning system works and how to use it to improve mission execution.

## Overview

The learning system captures patterns from completed missions and applies them to future missions. This enables:

- **Pattern reuse**: Apply successful approaches to similar tasks
- **Continuous improvement**: Track pattern effectiveness over time
- **Knowledge preservation**: Save institutional knowledge from missions

## How It Works

### 1. Pattern Extraction

When a mission completes, the system analyzes it to extract patterns:

- **Pattern Type**: Classification (frontend, backend, testing, etc.)
- **Task Sequence**: Ordered steps that were executed
- **Effectiveness Score**: Computed from completion rate and duration
- **Success Rate**: Percentage of tasks completed successfully

### 2. Pattern Storage

Extracted patterns are stored with:

```json
{
  "id": "pat_abc123",
  "pattern_type": "backend",
  "description": "API endpoint implementation",
  "task_sequence": [
    "Create database model",
    "Implement REST endpoint",
    "Add error handling",
    "Write tests"
  ],
  "success_rate": 0.95,
  "effectiveness_score": 0.87,
  "usage_count": 12,
  "version": 1
}
```

### 3. Pattern Matching

When a new mission starts, the system:

1. Analyzes the mission description
2. Finds similar learned patterns
3. Ranks them by effectiveness
4. Makes suggestions or applies automatically

### 4. Pattern Learning

As patterns are applied and completed:

- **Success tracked**: Did the pattern work for this mission?
- **Metrics updated**: Effectiveness score adjusted based on outcome
- **Trends analyzed**: Pattern improving or declining?
- **Versions created**: Major improvements trigger new versions

## API Endpoints

### List Patterns

Get all learned patterns:

```bash
curl http://localhost:3001/api/v1/patterns
curl http://localhost:3001/api/v1/patterns?type=backend
```

**Query Parameters:**
- `type`: Filter by pattern type (optional)

### Get Pattern Details

```bash
curl http://localhost:3001/api/v1/patterns/pat_abc123
```

### Create Pattern

Manually create a pattern:

```bash
curl -X POST http://localhost:3001/api/v1/patterns \
  -H "Content-Type: application/json" \
  -d '{
    "pattern_type": "backend",
    "description": "User authentication flow",
    "task_sequence": ["Setup auth provider", "Create JWT logic", "Add middleware"],
    "effectiveness_score": 0.9
  }'
```

### Delete Pattern

```bash
curl -X DELETE http://localhost:3001/api/v1/patterns/pat_abc123
```

### Get Learning Metrics

View overall learning system statistics:

```bash
curl http://localhost:3001/api/v1/learning/metrics
```

**Returns:**
```json
{
  "total_patterns": 42,
  "patterns_by_type": {
    "backend": 18,
    "frontend": 15,
    "testing": 9
  },
  "average_effectiveness": 0.82,
  "total_usage": 156
}
```

## Pattern Types

Common pattern classifications:

- `frontend`: UI/component implementation
- `backend`: API and server-side logic
- `testing`: Test suite creation
- `database`: Schema and query design
- `devops`: Deployment and infrastructure
- `security`: Security hardening approaches
- `general`: Cross-cutting patterns

## Effectiveness Metrics

Patterns are evaluated on:

- **Effectiveness Score** (0-1): Overall quality score
- **Success Rate** (0-1): Percentage of successful applications
- **Usage Count**: How many times applied
- **Trend**: Improving, stable, or declining

Monitor these to identify which patterns are actually valuable.

## Workflow Example

```
1. Create/Update Mission
   └─> Learning system searches for matching patterns

2. Apply Matched Pattern
   └─> Pattern tasks are suggested

3. Execute Mission
   └─> Mission runs (pattern or custom approach)

4. Mission Completes
   └─> Outcome is analyzed
   └─> New patterns extracted
   └─> Existing patterns updated with outcome
```

## Best Practices

### Pattern Management

- **Review effectiveness**: Check metrics regularly for poor-performing patterns
- **Version strategically**: Create new versions for significant improvements
- **Keep descriptions clear**: Good descriptions help matching

### Pattern Application

- **Validate matches**: Always review suggested patterns
- **Monitor outcomes**: Track if applied patterns work
- **Provide feedback**: Mark patterns as helpful or not

### Data Quality

- **Complete metadata**: Fill in descriptions and types
- **Regular cleanup**: Remove obsolete or redundant patterns
- **Track context**: Record why patterns work

## Examples

### Example 1: Extracting a Backend Pattern

Mission: "Implement user CRUD API"
Result: Success (15 tasks, 95% completion in 2 hours)

**Extracted Pattern:**
```json
{
  "pattern_type": "backend",
  "description": "CRUD API for user management",
  "task_sequence": [
    "Define data model",
    "Create database schema",
    "Implement routes",
    "Add authentication",
    "Write tests"
  ],
  "effectiveness_score": 0.95,
  "success_rate": 0.95
}
```

### Example 2: Applying a Stored Pattern

New mission: "Build product management API"

System finds similar pattern (API pattern with 0.92 effectiveness)
Suggests task sequence from that pattern
User can accept or modify

## Troubleshooting

**No patterns found?**
System hasn't captured many completed missions yet. Keep running missions to build the pattern library.

**Pattern not being suggested?**
The pattern might not match the new mission description well. Check pattern descriptions and consider updating them.

**Pattern effectiveness declining?**
The pattern might not apply well to current mission types. Review outcomes and consider archiving the pattern.

## Integration

The learning system integrates with:
- **Mission execution**: Patterns suggested during planning
- **Agent coordination**: Patterns can specify agent types needed
- **Checkpoints**: Recovery context informed by successful patterns

See also:
- [Agent Coordination Guide](./agent-coordination.md)
- [Checkpoint and Recovery Guide](./checkpoint-resume.md)
