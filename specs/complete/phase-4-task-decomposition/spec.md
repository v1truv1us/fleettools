# FleetTools Phase 4: Task Decomposition System

## Overview

The Task Decomposition System enables FleetTools to break down high-level tasks into parallelizable sorties that specialists can work on independently. This system bridges the gap between human intent ("implement user authentication") and actionable work units that AI agents can execute without conflicts.

### Goals

1. **Intelligent Decomposition** - Transform natural language tasks into structured, parallelizable work units
2. **Conflict Prevention** - Ensure no file overlap between concurrent sorties
3. **Dependency Management** - Order sorties correctly based on dependencies
4. **Strategy Selection** - Match decomposition approach to task type
5. **Learning Integration** - Record decompositions for future pattern learning

### Non-Goals

- Real-time task monitoring (covered by Squawk)
- Agent execution (covered by Specialists)
- File locking during execution (covered by CTK)

## User Stories

### US-001: Developer Decomposes Task via Plugin

**As a** developer using Claude Code or OpenCode  
**I want** to run `/fleet "implement user authentication with JWT"`  
**So that** I can see a structured plan before specialists begin work

#### Acceptance Criteria

- [ ] Plugin accepts natural language task description
- [ ] Strategy is auto-detected from keywords (or can be overridden)
- [ ] Codebase context is analyzed (existing files, patterns)
- [ ] SortieTree is generated via LLM planner
- [ ] Validation catches file conflicts and dependency issues
- [ ] Mission and Sorties are created in Flightline
- [ ] Summary is displayed showing sorties, dependencies, and estimated complexity

### US-002: Developer Decomposes Task via CLI

**As a** developer using the terminal  
**I want** to run `fleet decompose "refactor auth module" --strategy=file-based`  
**So that** I can generate a mission plan from the command line

#### Acceptance Criteria

- [ ] CLI accepts task description as positional argument
- [ ] `--strategy` flag allows manual strategy override
- [ ] `--dry-run` flag shows plan without creating files
- [ ] `--json` flag outputs machine-readable format
- [ ] Mission ID is returned for tracking

### US-003: API Consumer Creates Mission Programmatically

**As an** automation system  
**I want** to POST to `/api/v1/missions/decompose`  
**So that** I can integrate task decomposition into CI/CD pipelines

#### Acceptance Criteria

- [ ] API accepts task description and optional strategy
- [ ] Returns complete SortieTree with mission and sortie IDs
- [ ] Validation errors return 400 with specific error messages
- [ ] Created mission is immediately queryable via GET endpoints

### US-004: Developer Views Mission Sorties

**As a** developer tracking work progress  
**I want** to run `fleet mission sorties <mission-id>`  
**So that** I can see all sorties and their status

#### Acceptance Criteria

- [ ] Lists all sorties with status, complexity, and dependencies
- [ ] Shows which sorties can run in parallel
- [ ] Indicates blocked sorties and their blockers
- [ ] Supports `--json` output format

### US-005: System Learns from Decompositions

**As** the FleetTools system  
**I want** to record successful decomposition patterns  
**So that** future similar tasks can be decomposed more accurately

#### Acceptance Criteria

- [ ] `decomposition_generated` event is emitted with full context
- [ ] Successful mission completions update pattern confidence
- [ ] Failed decompositions are flagged for review
- [ ] Tech Orders can be created from successful patterns

## Strategy Selection Algorithm

### Strategy Definitions

| Strategy | Keywords | Best For | Parallelization |
|----------|----------|----------|-----------------|
| `file-based` | refactor, migrate, rename, update all, replace, convert | Pattern changes across multiple files | High (one sortie per file/group) |
| `feature-based` | add, implement, build, create, develop | New features (vertical slices) | Medium (by layer/component) |
| `risk-based` | fix, bug, security, critical, urgent, hotfix | Bug fixes, critical changes | Low (sequential, careful) |
| `research-based` | research, investigate, explore, analyze, understand | Discovery/exploration | Low (sequential, iterative) |

### Selection Algorithm

```typescript
function selectStrategy(taskDescription: string, override?: Strategy): Strategy {
  // 1. If override provided, use it
  if (override) return override;
  
  // 2. Normalize input
  const normalized = taskDescription.toLowerCase();
  
  // 3. Score each strategy based on keyword matches
  const scores: Record<Strategy, number> = {
    'file-based': 0,
    'feature-based': 0,
    'risk-based': 0,
    'research-based': 0,
  };
  
  // File-based keywords (highest priority for refactoring)
  const fileBasedKeywords = ['refactor', 'migrate', 'rename', 'update all', 'replace', 'convert', 'move'];
  for (const kw of fileBasedKeywords) {
    if (normalized.includes(kw)) scores['file-based'] += 2;
  }
  
  // Feature-based keywords
  const featureKeywords = ['add', 'implement', 'build', 'create', 'develop', 'new', 'feature'];
  for (const kw of featureKeywords) {
    if (normalized.includes(kw)) scores['feature-based'] += 2;
  }
  
  // Risk-based keywords (high priority for safety)
  const riskKeywords = ['fix', 'bug', 'security', 'critical', 'urgent', 'hotfix', 'vulnerability', 'patch'];
  for (const kw of riskKeywords) {
    if (normalized.includes(kw)) scores['risk-based'] += 3; // Higher weight for safety
  }
  
  // Research-based keywords
  const researchKeywords = ['research', 'investigate', 'explore', 'analyze', 'understand', 'study', 'review'];
  for (const kw of researchKeywords) {
    if (normalized.includes(kw)) scores['research-based'] += 2;
  }
  
  // 4. Select highest scoring strategy (default to feature-based)
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] as Strategy : 'feature-based';
}
```

### Strategy-Specific Decomposition Rules

#### File-Based Strategy

- Group files by directory or pattern
- One sortie per file group (max 5 files per sortie)
- Dependencies based on import relationships
- Parallel execution for unrelated file groups

#### Feature-Based Strategy

- Decompose by architectural layer (API, service, UI, tests)
- One sortie per component/module
- Dependencies flow from backend to frontend
- Tests depend on implementation sorties

#### Risk-Based Strategy

- Single sortie for minimal change
- Explicit rollback plan in sortie description
- Sequential execution only
- Mandatory review checkpoint between sorties

#### Research-Based Strategy

- Iterative sorties (research → synthesize → recommend)
- Each sortie builds on previous findings
- No file modifications in research sorties
- Final sortie produces actionable recommendations

## LLM Planner Prompt Template

```markdown
# Task Decomposition Planner

You are an expert software architect decomposing a development task into parallelizable work units called "sorties."

## Context

**Task Description:**
{{task_description}}

**Selected Strategy:** {{strategy}}

**Codebase Context:**
- Project: {{project_name}}
- Language: {{primary_language}}
- Framework: {{framework}}
- Existing Files (relevant):
{{#each relevant_files}}
  - {{this.path}} ({{this.description}})
{{/each}}

**Recent Tech Orders (patterns to follow):**
{{#each tech_orders}}
  - {{this.name}}: {{this.pattern}}
{{/each}}

## Strategy Guidelines

{{#if strategy_is_file_based}}
- Group related files together (max 5 per sortie)
- Each sortie should make consistent changes across its files
- Identify import/dependency relationships between file groups
{{/if}}

{{#if strategy_is_feature_based}}
- Decompose by architectural layer (API, service, UI, tests)
- Each sortie should be a complete vertical slice when possible
- Tests should be in separate sorties that depend on implementation
{{/if}}

{{#if strategy_is_risk_based}}
- Minimize the number of sorties (prefer 1-2)
- Include explicit rollback steps in descriptions
- Add verification steps between sorties
{{/if}}

{{#if strategy_is_research_based}}
- First sortie: Research and gather information
- Middle sorties: Analyze and synthesize findings
- Final sortie: Produce recommendations or implementation plan
{{/if}}

## Output Format

Respond with a JSON object matching this schema:

```json
{
  "mission": {
    "title": "Brief mission title",
    "description": "Detailed description of what this mission accomplishes"
  },
  "sorties": [
    {
      "title": "Sortie title",
      "description": "What this sortie accomplishes",
      "files": ["path/to/file1.ts", "path/to/file2.ts"],
      "dependencies": [],
      "complexity": 1-5,
      "type": "task|feature|bugfix|chore"
    }
  ],
  "rationale": "Brief explanation of decomposition decisions"
}
```

## Rules

1. **No File Overlap**: Each file can only appear in ONE sortie
2. **Dependency Ordering**: If sortie B depends on sortie A, A must have a lower index
3. **Complexity Scale**: 1=trivial, 2=simple, 3=moderate, 4=complex, 5=very complex
4. **New Files**: Mark new files with "(new)" suffix, e.g., "src/auth/jwt.ts (new)"
5. **Maximum Sorties**: Prefer 3-7 sorties; split larger tasks into multiple missions

## Task

Decompose the task into sorties following the {{strategy}} strategy.
```

## SortieTree Schema

### TypeScript Definitions

```typescript
/**
 * Decomposition strategy types
 */
type Strategy = 'file-based' | 'feature-based' | 'risk-based' | 'research-based';

/**
 * Sortie type classification
 */
type SortieType = 'task' | 'feature' | 'bugfix' | 'chore';

/**
 * Complexity rating (1-5 scale)
 */
type Complexity = 1 | 2 | 3 | 4 | 5;

/**
 * Mission status
 */
type MissionStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

/**
 * Sortie status
 */
type SortieStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'blocked' | 'failed';

/**
 * Complete SortieTree structure returned from decomposition
 */
interface SortieTree {
  mission: {
    id: string;                    // "msn-<uuid>"
    title: string;                 // Brief mission title
    description?: string;          // Detailed description
    strategy: Strategy;            // Selected decomposition strategy
    status: MissionStatus;         // Current mission status
    created_at: string;            // ISO 8601 timestamp
    updated_at: string;            // ISO 8601 timestamp
    metadata?: {
      task_description: string;    // Original task input
      rationale?: string;          // LLM's decomposition rationale
      context?: Record<string, unknown>; // Additional context
    };
  };
  sorties: Array<{
    id: string;                    // "msn-<uuid>.0", "msn-<uuid>.1", etc.
    title: string;                 // Brief sortie title
    description?: string;          // What this sortie accomplishes
    files: string[];               // Files this sortie will modify
    dependencies: number[];        // Indices of dependent sorties (must complete first)
    complexity: Complexity;        // 1-5 complexity rating
    type: SortieType;              // Classification
    status: SortieStatus;          // Current sortie status
    assigned_to?: string;          // Specialist ID if assigned
    created_at: string;            // ISO 8601 timestamp
    updated_at: string;            // ISO 8601 timestamp
    started_at?: string;           // When work began
    completed_at?: string;         // When work finished
    metadata?: {
      new_files?: string[];        // Files to be created (subset of files)
      estimated_tokens?: number;   // Estimated token usage
      notes?: string;              // Additional notes
    };
  }>;
}

/**
 * Decomposition request
 */
interface DecomposeRequest {
  task: string;                    // Natural language task description
  strategy?: Strategy;             // Optional strategy override
  context?: {
    project_root?: string;         // Project root directory
    include_patterns?: string[];   // Glob patterns for relevant files
    exclude_patterns?: string[];   // Glob patterns to exclude
    tech_orders?: string[];        // Tech order IDs to consider
  };
}

/**
 * Decomposition response
 */
interface DecomposeResponse {
  success: boolean;
  sortie_tree?: SortieTree;
  errors?: Array<{
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }>;
}
```

### JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://fleettools.dev/schemas/sortie-tree.json",
  "title": "SortieTree",
  "type": "object",
  "required": ["mission", "sorties"],
  "properties": {
    "mission": {
      "type": "object",
      "required": ["id", "title", "strategy", "status", "created_at", "updated_at"],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^msn-[a-f0-9-]{36}$"
        },
        "title": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "description": {
          "type": "string",
          "maxLength": 2000
        },
        "strategy": {
          "type": "string",
          "enum": ["file-based", "feature-based", "risk-based", "research-based"]
        },
        "status": {
          "type": "string",
          "enum": ["pending", "in_progress", "completed", "blocked", "cancelled"]
        },
        "created_at": {
          "type": "string",
          "format": "date-time"
        },
        "updated_at": {
          "type": "string",
          "format": "date-time"
        },
        "metadata": {
          "type": "object",
          "properties": {
            "task_description": { "type": "string" },
            "rationale": { "type": "string" },
            "context": { "type": "object" }
          }
        }
      }
    },
    "sorties": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "title", "files", "dependencies", "complexity", "type", "status", "created_at", "updated_at"],
        "properties": {
          "id": {
            "type": "string",
            "pattern": "^msn-[a-f0-9-]{36}\\.[0-9]+$"
          },
          "title": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
          },
          "description": {
            "type": "string",
            "maxLength": 2000
          },
          "files": {
            "type": "array",
            "items": { "type": "string" }
          },
          "dependencies": {
            "type": "array",
            "items": { "type": "integer", "minimum": 0 }
          },
          "complexity": {
            "type": "integer",
            "minimum": 1,
            "maximum": 5
          },
          "type": {
            "type": "string",
            "enum": ["task", "feature", "bugfix", "chore"]
          },
          "status": {
            "type": "string",
            "enum": ["pending", "assigned", "in_progress", "completed", "blocked", "failed"]
          },
          "assigned_to": { "type": "string" },
          "created_at": { "type": "string", "format": "date-time" },
          "updated_at": { "type": "string", "format": "date-time" },
          "started_at": { "type": "string", "format": "date-time" },
          "completed_at": { "type": "string", "format": "date-time" },
          "metadata": {
            "type": "object",
            "properties": {
              "new_files": { "type": "array", "items": { "type": "string" } },
              "estimated_tokens": { "type": "integer" },
              "notes": { "type": "string" }
            }
          }
        }
      }
    }
  }
}
```

## Validation Rules

### Rule 1: No File Overlap

Each file can only appear in one sortie within a mission.

```typescript
function validateNoFileOverlap(sorties: Sortie[]): ValidationResult {
  const fileToSortie = new Map<string, string>();
  const errors: ValidationError[] = [];
  
  for (const sortie of sorties) {
    for (const file of sortie.files) {
      const normalizedFile = normalizePath(file);
      if (fileToSortie.has(normalizedFile)) {
        errors.push({
          code: 'FILE_OVERLAP',
          message: `File "${file}" appears in multiple sorties`,
          details: {
            file,
            sorties: [fileToSortie.get(normalizedFile), sortie.id],
          },
        });
      } else {
        fileToSortie.set(normalizedFile, sortie.id);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

### Rule 2: Dependency Ordering

If sortie B depends on sortie A, A must have a lower index than B.

```typescript
function validateDependencyOrdering(sorties: Sortie[]): ValidationResult {
  const errors: ValidationError[] = [];
  
  for (let i = 0; i < sorties.length; i++) {
    const sortie = sorties[i];
    for (const depIndex of sortie.dependencies) {
      if (depIndex >= i) {
        errors.push({
          code: 'INVALID_DEPENDENCY_ORDER',
          message: `Sortie ${i} depends on sortie ${depIndex}, but dependencies must have lower indices`,
          details: {
            sortie_index: i,
            dependency_index: depIndex,
          },
        });
      }
      if (depIndex < 0 || depIndex >= sorties.length) {
        errors.push({
          code: 'INVALID_DEPENDENCY_INDEX',
          message: `Sortie ${i} has invalid dependency index ${depIndex}`,
          details: {
            sortie_index: i,
            dependency_index: depIndex,
            valid_range: [0, sorties.length - 1],
          },
        });
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

### Rule 3: No Circular Dependencies

Dependency graph must be acyclic.

```typescript
function validateNoCycles(sorties: Sortie[]): ValidationResult {
  const errors: ValidationError[] = [];
  const visited = new Set<number>();
  const recursionStack = new Set<number>();
  
  function hasCycle(index: number, path: number[]): boolean {
    if (recursionStack.has(index)) {
      errors.push({
        code: 'CIRCULAR_DEPENDENCY',
        message: `Circular dependency detected`,
        details: { cycle: [...path, index] },
      });
      return true;
    }
    if (visited.has(index)) return false;
    
    visited.add(index);
    recursionStack.add(index);
    
    for (const depIndex of sorties[index].dependencies) {
      if (hasCycle(depIndex, [...path, index])) return true;
    }
    
    recursionStack.delete(index);
    return false;
  }
  
  for (let i = 0; i < sorties.length; i++) {
    if (!visited.has(i)) {
      hasCycle(i, []);
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

### Rule 4: File Existence Check

All files must exist or be marked as new.

```typescript
function validateFileExistence(sorties: Sortie[], projectRoot: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  for (const sortie of sorties) {
    for (const file of sortie.files) {
      const isNew = file.endsWith('(new)') || sortie.metadata?.new_files?.includes(file);
      if (isNew) continue;
      
      const fullPath = path.join(projectRoot, file);
      if (!fs.existsSync(fullPath)) {
        errors.push({
          code: 'FILE_NOT_FOUND',
          message: `File "${file}" does not exist. Mark as "(new)" if it should be created.`,
          details: { file, sortie_id: sortie.id },
        });
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

### Rule 5: Complexity Bounds

Complexity must be between 1 and 5.

```typescript
function validateComplexity(sorties: Sortie[]): ValidationResult {
  const errors: ValidationError[] = [];
  
  for (const sortie of sorties) {
    if (sortie.complexity < 1 || sortie.complexity > 5) {
      errors.push({
        code: 'INVALID_COMPLEXITY',
        message: `Sortie "${sortie.id}" has invalid complexity ${sortie.complexity}`,
        details: { sortie_id: sortie.id, complexity: sortie.complexity },
      });
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

### Combined Validation

```typescript
function validateSortieTree(sortieTree: SortieTree, projectRoot: string): ValidationResult {
  const validators = [
    () => validateNoFileOverlap(sortieTree.sorties),
    () => validateDependencyOrdering(sortieTree.sorties),
    () => validateNoCycles(sortieTree.sorties),
    () => validateFileExistence(sortieTree.sorties, projectRoot),
    () => validateComplexity(sortieTree.sorties),
  ];
  
  const allErrors: ValidationError[] = [];
  
  for (const validator of validators) {
    const result = validator();
    allErrors.push(...result.errors);
  }
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
```

## Storage Format

### Directory Structure

```
.flightline/
├── missions/
│   └── <mission-id>/
│       ├── manifest.json          # Mission metadata
│       └── sorties/
│           ├── 0.json             # Sortie 0
│           ├── 1.json             # Sortie 1
│           └── ...
├── work-orders/                   # Existing work orders
├── tech-orders/                   # Existing tech orders
└── index.json                     # Search index
```

### Mission Manifest (manifest.json)

```json
{
  "id": "msn-550e8400-e29b-41d4-a716-446655440000",
  "title": "Implement JWT Authentication",
  "description": "Add JWT-based authentication to the API with refresh tokens",
  "strategy": "feature-based",
  "status": "in_progress",
  "created_at": "2026-01-04T10:00:00.000Z",
  "updated_at": "2026-01-04T12:30:00.000Z",
  "sortie_count": 4,
  "completed_count": 2,
  "metadata": {
    "task_description": "implement user authentication with JWT",
    "rationale": "Decomposed into API layer, service layer, middleware, and tests",
    "context": {
      "project": "fleettools",
      "framework": "express"
    }
  }
}
```

### Sortie File (sorties/0.json)

```json
{
  "id": "msn-550e8400-e29b-41d4-a716-446655440000.0",
  "title": "Create JWT utility functions",
  "description": "Implement token generation, verification, and refresh logic",
  "files": [
    "src/auth/jwt.ts (new)",
    "src/auth/types.ts (new)"
  ],
  "dependencies": [],
  "complexity": 3,
  "type": "feature",
  "status": "completed",
  "assigned_to": "specialist-backend",
  "created_at": "2026-01-04T10:00:00.000Z",
  "updated_at": "2026-01-04T11:30:00.000Z",
  "started_at": "2026-01-04T10:05:00.000Z",
  "completed_at": "2026-01-04T11:30:00.000Z",
  "metadata": {
    "new_files": ["src/auth/jwt.ts", "src/auth/types.ts"],
    "estimated_tokens": 2500,
    "notes": "Used jsonwebtoken library"
  }
}
```

### SQLite Schema Extension

Add to `squawk/src/db/schema.sql`:

```sql
-- Missions table
CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    strategy TEXT NOT NULL CHECK (strategy IN ('file-based', 'feature-based', 'risk-based', 'research-based')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
    sortie_count INTEGER NOT NULL DEFAULT 0,
    completed_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    metadata TEXT  -- JSON string
);

-- Sorties table
CREATE TABLE IF NOT EXISTS sorties (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL,
    sortie_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    files TEXT NOT NULL,  -- JSON array
    dependencies TEXT NOT NULL DEFAULT '[]',  -- JSON array of indices
    complexity INTEGER NOT NULL CHECK (complexity BETWEEN 1 AND 5),
    type TEXT NOT NULL CHECK (type IN ('task', 'feature', 'bugfix', 'chore')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'blocked', 'failed')),
    assigned_to TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    metadata TEXT,  -- JSON string
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

-- Indexes for missions and sorties
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_strategy ON missions(strategy);
CREATE INDEX IF NOT EXISTS idx_sorties_mission ON sorties(mission_id);
CREATE INDEX IF NOT EXISTS idx_sorties_status ON sorties(status);
CREATE INDEX IF NOT EXISTS idx_sorties_assigned ON sorties(assigned_to);
```

## API Endpoint Specifications

### POST /api/v1/missions/decompose

Decompose a task into a mission with sorties.

**Request:**

```http
POST /api/v1/missions/decompose
Content-Type: application/json

{
  "task": "implement user authentication with JWT",
  "strategy": "feature-based",
  "context": {
    "project_root": "/home/user/project",
    "include_patterns": ["src/**/*.ts"],
    "exclude_patterns": ["node_modules/**", "dist/**"],
    "tech_orders": ["to_abc123"]
  }
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "sortie_tree": {
    "mission": {
      "id": "msn-550e8400-e29b-41d4-a716-446655440000",
      "title": "Implement JWT Authentication",
      "description": "Add JWT-based authentication to the API",
      "strategy": "feature-based",
      "status": "pending",
      "created_at": "2026-01-04T10:00:00.000Z",
      "updated_at": "2026-01-04T10:00:00.000Z",
      "metadata": {
        "task_description": "implement user authentication with JWT",
        "rationale": "Decomposed by architectural layer"
      }
    },
    "sorties": [
      {
        "id": "msn-550e8400-e29b-41d4-a716-446655440000.0",
        "title": "Create JWT utility functions",
        "files": ["src/auth/jwt.ts (new)"],
        "dependencies": [],
        "complexity": 3,
        "type": "feature",
        "status": "pending",
        "created_at": "2026-01-04T10:00:00.000Z",
        "updated_at": "2026-01-04T10:00:00.000Z"
      }
    ]
  }
}
```

**Response (400 Bad Request - Validation Error):**

```json
{
  "success": false,
  "errors": [
    {
      "code": "FILE_OVERLAP",
      "message": "File \"src/auth.ts\" appears in multiple sorties",
      "details": {
        "file": "src/auth.ts",
        "sorties": ["msn-xxx.0", "msn-xxx.1"]
      }
    }
  ]
}
```

### GET /api/v1/missions

List all missions.

**Request:**

```http
GET /api/v1/missions?status=in_progress&strategy=feature-based&limit=20&offset=0
```

**Response (200 OK):**

```json
{
  "missions": [
    {
      "id": "msn-550e8400-e29b-41d4-a716-446655440000",
      "title": "Implement JWT Authentication",
      "strategy": "feature-based",
      "status": "in_progress",
      "sortie_count": 4,
      "completed_count": 2,
      "created_at": "2026-01-04T10:00:00.000Z",
      "updated_at": "2026-01-04T12:30:00.000Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

### GET /api/v1/missions/:id

Get a specific mission with full details.

**Response (200 OK):**

```json
{
  "mission": {
    "id": "msn-550e8400-e29b-41d4-a716-446655440000",
    "title": "Implement JWT Authentication",
    "description": "Add JWT-based authentication to the API",
    "strategy": "feature-based",
    "status": "in_progress",
    "sortie_count": 4,
    "completed_count": 2,
    "created_at": "2026-01-04T10:00:00.000Z",
    "updated_at": "2026-01-04T12:30:00.000Z",
    "metadata": {
      "task_description": "implement user authentication with JWT",
      "rationale": "Decomposed by architectural layer"
    }
  }
}
```

### GET /api/v1/missions/:id/sorties

Get all sorties for a mission.

**Request:**

```http
GET /api/v1/missions/msn-550e8400-e29b-41d4-a716-446655440000/sorties?status=pending
```

**Response (200 OK):**

```json
{
  "sorties": [
    {
      "id": "msn-550e8400-e29b-41d4-a716-446655440000.0",
      "title": "Create JWT utility functions",
      "description": "Implement token generation and verification",
      "files": ["src/auth/jwt.ts (new)"],
      "dependencies": [],
      "complexity": 3,
      "type": "feature",
      "status": "completed",
      "assigned_to": "specialist-backend",
      "created_at": "2026-01-04T10:00:00.000Z",
      "updated_at": "2026-01-04T11:30:00.000Z",
      "completed_at": "2026-01-04T11:30:00.000Z"
    },
    {
      "id": "msn-550e8400-e29b-41d4-a716-446655440000.1",
      "title": "Create auth middleware",
      "files": ["src/middleware/auth.ts (new)"],
      "dependencies": [0],
      "complexity": 2,
      "type": "feature",
      "status": "pending",
      "created_at": "2026-01-04T10:00:00.000Z",
      "updated_at": "2026-01-04T10:00:00.000Z"
    }
  ],
  "parallelizable": [1, 2],
  "blocked": [3]
}
```

### PATCH /api/v1/missions/:id

Update mission status.

**Request:**

```http
PATCH /api/v1/missions/msn-550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "status": "completed"
}
```

### PATCH /api/v1/sorties/:id

Update sortie status or assignment.

**Request:**

```http
PATCH /api/v1/sorties/msn-550e8400-e29b-41d4-a716-446655440000.1
Content-Type: application/json

{
  "status": "in_progress",
  "assigned_to": "specialist-frontend"
}
```

### DELETE /api/v1/missions/:id

Delete a mission and all its sorties.

**Response (204 No Content)**

## Plugin Command Specification

### Command: /fleet

**Syntax:**

```
/fleet "<task description>" [--strategy=<strategy>] [--dry-run]
```

**Examples:**

```
/fleet "implement user authentication with JWT"
/fleet "refactor the auth module to use async/await" --strategy=file-based
/fleet "fix the login bug where users can't reset passwords" --dry-run
```

**Behavior:**

1. Parse task description and options
2. Call strategy selection algorithm
3. Gather codebase context (relevant files, tech orders)
4. Call LLM planner with prompt template
5. Parse and validate SortieTree
6. If `--dry-run`, display plan without saving
7. Otherwise, create mission and sorties in Flightline
8. Display summary to user

**Output Format:**

```
Mission Created: msn-550e8400-e29b-41d4-a716-446655440000
Strategy: feature-based
Title: Implement JWT Authentication

Sorties (4 total):
  [0] Create JWT utility functions (complexity: 3)
      Files: src/auth/jwt.ts (new)
      Dependencies: none
      
  [1] Create auth middleware (complexity: 2)
      Files: src/middleware/auth.ts (new)
      Dependencies: [0]
      
  [2] Add login/logout endpoints (complexity: 3)
      Files: src/routes/auth.ts (new)
      Dependencies: [0, 1]
      
  [3] Add authentication tests (complexity: 2)
      Files: tests/auth.test.ts (new)
      Dependencies: [0, 1, 2]

Parallelizable now: [0]
Next after [0]: [1]

Run 'fleet mission start msn-550e8400...' to begin execution.
```

### Plugin Implementation

```typescript
// plugins/claude-code/src/commands/fleet.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface FleetCommandOptions {
  strategy?: 'file-based' | 'feature-based' | 'risk-based' | 'research-based';
  dryRun?: boolean;
}

export async function handleFleetCommand(
  taskDescription: string,
  options: FleetCommandOptions = {}
): Promise<void> {
  const args = ['decompose', `"${taskDescription}"`];
  
  if (options.strategy) {
    args.push(`--strategy=${options.strategy}`);
  }
  
  if (options.dryRun) {
    args.push('--dry-run');
  }
  
  args.push('--json');
  
  try {
    const { stdout } = await execAsync(`fleet ${args.join(' ')}`);
    const result = JSON.parse(stdout);
    
    if (result.success) {
      displayMissionSummary(result.sortie_tree);
    } else {
      displayErrors(result.errors);
    }
  } catch (error) {
    console.error('Failed to decompose task:', error);
  }
}

function displayMissionSummary(sortieTree: SortieTree): void {
  const { mission, sorties } = sortieTree;
  
  console.log(`\nMission Created: ${mission.id}`);
  console.log(`Strategy: ${mission.strategy}`);
  console.log(`Title: ${mission.title}`);
  console.log(`\nSorties (${sorties.length} total):`);
  
  for (const sortie of sorties) {
    const index = parseInt(sortie.id.split('.')[1]);
    const deps = sortie.dependencies.length > 0 
      ? `[${sortie.dependencies.join(', ')}]` 
      : 'none';
    
    console.log(`  [${index}] ${sortie.title} (complexity: ${sortie.complexity})`);
    console.log(`      Files: ${sortie.files.join(', ')}`);
    console.log(`      Dependencies: ${deps}`);
    console.log('');
  }
  
  // Calculate parallelizable sorties
  const parallelizable = sorties
    .filter(s => s.dependencies.length === 0)
    .map(s => parseInt(s.id.split('.')[1]));
  
  console.log(`Parallelizable now: [${parallelizable.join(', ')}]`);
}
```

## CLI Command Specification

### Command: fleet decompose

**Syntax:**

```bash
fleet decompose "<task description>" [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--strategy` | `-s` | Decomposition strategy | auto-detect |
| `--dry-run` | `-d` | Show plan without creating files | false |
| `--json` | `-j` | Output in JSON format | false |
| `--context` | `-c` | Additional context file (JSON) | none |
| `--include` | `-i` | Glob patterns for relevant files | `**/*.{ts,js}` |
| `--exclude` | `-e` | Glob patterns to exclude | `node_modules/**` |

**Examples:**

```bash
# Basic decomposition
fleet decompose "implement user authentication with JWT"

# With strategy override
fleet decompose "refactor auth module" --strategy=file-based

# Dry run with JSON output
fleet decompose "fix login bug" --dry-run --json

# With custom context
fleet decompose "add payment integration" --context=./payment-context.json
```

**Implementation:**

```typescript
// cli/src/commands/decompose.ts

import { Command } from 'commander';
import { selectStrategy } from '../lib/strategy';
import { gatherContext } from '../lib/context';
import { callLLMPlanner } from '../lib/planner';
import { validateSortieTree } from '../lib/validation';
import { saveMission } from '../lib/storage';
import { emitEvent } from '../lib/events';

export function registerDecomposeCommand(program: Command): void {
  program
    .command('decompose <task>')
    .description('Decompose a task into parallelizable sorties')
    .option('-s, --strategy <strategy>', 'Decomposition strategy')
    .option('-d, --dry-run', 'Show plan without creating files')
    .option('-j, --json', 'Output in JSON format')
    .option('-c, --context <file>', 'Additional context file')
    .option('-i, --include <patterns...>', 'Include glob patterns')
    .option('-e, --exclude <patterns...>', 'Exclude glob patterns')
    .action(async (task: string, options) => {
      try {
        // 1. Select strategy
        const strategy = selectStrategy(task, options.strategy);
        
        // 2. Gather codebase context
        const context = await gatherContext({
          projectRoot: process.cwd(),
          includePatterns: options.include || ['**/*.{ts,js,tsx,jsx}'],
          excludePatterns: options.exclude || ['node_modules/**', 'dist/**'],
          contextFile: options.context,
        });
        
        // 3. Call LLM planner
        const rawTree = await callLLMPlanner(task, strategy, context);
        
        // 4. Validate
        const validation = validateSortieTree(rawTree, process.cwd());
        if (!validation.valid) {
          if (options.json) {
            console.log(JSON.stringify({ success: false, errors: validation.errors }));
          } else {
            console.error('Validation failed:');
            for (const error of validation.errors) {
              console.error(`  - ${error.code}: ${error.message}`);
            }
          }
          process.exit(1);
        }
        
        // 5. Save or display
        if (options.dryRun) {
          if (options.json) {
            console.log(JSON.stringify({ success: true, sortie_tree: rawTree, dry_run: true }));
          } else {
            displayDryRun(rawTree);
          }
        } else {
          const sortieTree = await saveMission(rawTree);
          
          // 6. Emit events
          await emitEvent('mission_created', { mission: sortieTree.mission });
          for (const sortie of sortieTree.sorties) {
            await emitEvent('sortie_created', { sortie });
          }
          await emitEvent('decomposition_generated', {
            mission_id: sortieTree.mission.id,
            task,
            strategy,
            sortie_count: sortieTree.sorties.length,
          });
          
          if (options.json) {
            console.log(JSON.stringify({ success: true, sortie_tree: sortieTree }));
          } else {
            displayMissionCreated(sortieTree);
          }
        }
      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({ 
            success: false, 
            errors: [{ code: 'DECOMPOSE_ERROR', message: error.message }] 
          }));
        } else {
          console.error('Error:', error.message);
        }
        process.exit(1);
      }
    });
}
```

### Command: fleet mission

**Subcommands:**

```bash
fleet mission list [--status=<status>] [--json]
fleet mission show <mission-id> [--json]
fleet mission sorties <mission-id> [--status=<status>] [--json]
fleet mission start <mission-id>
fleet mission cancel <mission-id>
```

### Command: fleet sortie

**Subcommands:**

```bash
fleet sortie show <sortie-id> [--json]
fleet sortie assign <sortie-id> <specialist-id>
fleet sortie start <sortie-id>
fleet sortie complete <sortie-id>
fleet sortie fail <sortie-id> [--reason=<reason>]
```

## Events

### Event: mission_created

Emitted when a new mission is created from decomposition.

```typescript
interface MissionCreatedEvent {
  type: 'mission_created';
  timestamp: string;
  data: {
    mission_id: string;
    title: string;
    strategy: Strategy;
    sortie_count: number;
    task_description: string;
  };
}
```

### Event: sortie_created

Emitted for each sortie created during decomposition.

```typescript
interface SortieCreatedEvent {
  type: 'sortie_created';
  timestamp: string;
  data: {
    sortie_id: string;
    mission_id: string;
    title: string;
    files: string[];
    complexity: Complexity;
    type: SortieType;
  };
}
```

### Event: decomposition_generated

Emitted after successful decomposition for learning purposes.

```typescript
interface DecompositionGeneratedEvent {
  type: 'decomposition_generated';
  timestamp: string;
  data: {
    mission_id: string;
    task_description: string;
    strategy: Strategy;
    sortie_count: number;
    total_complexity: number;
    files_affected: string[];
    rationale: string;
    llm_model: string;
    llm_tokens_used: number;
  };
}
```

### Event: sortie_status_changed

Emitted when a sortie's status changes.

```typescript
interface SortieStatusChangedEvent {
  type: 'sortie_status_changed';
  timestamp: string;
  data: {
    sortie_id: string;
    mission_id: string;
    previous_status: SortieStatus;
    new_status: SortieStatus;
    assigned_to?: string;
  };
}
```

### Event: mission_completed

Emitted when all sorties in a mission are completed.

```typescript
interface MissionCompletedEvent {
  type: 'mission_completed';
  timestamp: string;
  data: {
    mission_id: string;
    title: string;
    strategy: Strategy;
    duration_ms: number;
    sortie_count: number;
    success_rate: number;
  };
}
```

## Non-Functional Requirements

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Strategy selection | < 10ms | Time from input to strategy |
| Context gathering | < 500ms | Time to scan codebase |
| LLM planning | < 30s | Time for LLM response |
| Validation | < 100ms | Time to validate SortieTree |
| Storage write | < 200ms | Time to persist mission |
| Total decomposition | < 35s | End-to-end time |

### Reliability

- LLM failures should retry up to 3 times with exponential backoff
- Partial failures should not corrupt existing data
- Validation must catch all file conflicts before storage
- Events must be emitted atomically with storage

### Scalability

- Support missions with up to 50 sorties
- Support files lists with up to 100 files per sortie
- Support concurrent decomposition requests (API)
- Index missions for fast querying (< 50ms for list)

### Security

- Sanitize file paths to prevent directory traversal
- Validate LLM output against schema before use
- Rate limit decomposition requests (10/minute per user)
- Log all decomposition requests for audit

### Observability

- Log strategy selection decisions
- Log LLM prompt and response (debug level)
- Log validation errors with full context
- Emit metrics for decomposition latency and success rate

## Success Criteria

### Functional Criteria

- [ ] `/fleet "task"` command works in Claude Code plugin
- [ ] `/fleet "task"` command works in OpenCode plugin
- [ ] `fleet decompose "task"` CLI command works
- [ ] POST `/api/v1/missions/decompose` endpoint works
- [ ] GET `/api/v1/missions/:id/sorties` endpoint works
- [ ] Strategy auto-detection matches expected strategy for test cases
- [ ] Validation catches file overlap errors
- [ ] Validation catches dependency ordering errors
- [ ] Missions persist in `.flightline/missions/`
- [ ] Missions persist in SQLite database
- [ ] Events are emitted for all state changes

### Quality Criteria

- [ ] 90%+ test coverage for validation logic
- [ ] 80%+ test coverage for strategy selection
- [ ] All API endpoints have integration tests
- [ ] CLI commands have unit tests
- [ ] Plugin commands have mock tests
- [ ] TypeScript strict mode passes
- [ ] No critical or high severity security issues

### Performance Criteria

- [ ] End-to-end decomposition < 35s (p95)
- [ ] Strategy selection < 10ms (p99)
- [ ] Validation < 100ms (p99)
- [ ] Mission list query < 50ms (p95)

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `server/api/src/missions/decompose.ts` | Decomposition API endpoint |
| `server/api/src/missions/missions.ts` | Mission CRUD endpoints |
| `server/api/src/missions/sorties.ts` | Sortie CRUD endpoints |
| `cli/src/commands/decompose.ts` | CLI decompose command |
| `cli/src/commands/mission.ts` | CLI mission commands |
| `cli/src/commands/sortie.ts` | CLI sortie commands |
| `cli/src/lib/strategy.ts` | Strategy selection algorithm |
| `cli/src/lib/planner.ts` | LLM planner integration |
| `cli/src/lib/validation.ts` | SortieTree validation |
| `cli/src/lib/context.ts` | Codebase context gathering |
| `plugins/claude-code/src/commands/fleet.ts` | Plugin /fleet command |
| `plugins/opencode/src/commands/fleet.ts` | Plugin /fleet command |
| `squawk/src/db/missions.ts` | Mission database operations |
| `squawk/src/db/sorties.ts` | Sortie database operations |
| `tests/unit/lib/strategy.test.ts` | Strategy selection tests |
| `tests/unit/lib/validation.test.ts` | Validation tests |
| `tests/integration/api/missions.test.ts` | Mission API tests |
| `tests/integration/api/sorties.test.ts` | Sortie API tests |
| `tests/integration/cli/decompose.test.ts` | CLI decompose tests |
| `specs/phase-4-task-decomposition/spec.md` | This specification |

### Modified Files

| File | Changes |
|------|---------|
| `squawk/src/db/schema.sql` | Add missions and sorties tables |
| `squawk/src/db/index.ts` | Add mission and sortie operations |
| `server/api/src/index.ts` | Register mission routes |
| `cli/index.ts` | Register decompose, mission, sortie commands |
| `plugins/claude-code/src/index.ts` | Add /fleet command handler |
| `plugins/opencode/src/index.ts` | Add /fleet command handler |
| `package.json` | Add LLM client dependency |

## Implementation Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 4.1: Schema & Storage | 2 days | Database schema, file storage, types |
| Phase 4.2: Strategy & Validation | 2 days | Strategy selection, validation rules |
| Phase 4.3: LLM Planner | 3 days | Prompt template, LLM integration, parsing |
| Phase 4.4: API Endpoints | 2 days | All REST endpoints, tests |
| Phase 4.5: CLI Commands | 2 days | decompose, mission, sortie commands |
| Phase 4.6: Plugin Integration | 2 days | /fleet command in both plugins |
| Phase 4.7: Testing & Polish | 2 days | Integration tests, documentation |
| **Total** | **15 days** | Complete Task Decomposition System |

## Open Questions

1. **LLM Provider**: Which LLM to use for planning? (OpenAI GPT-4o, Claude 3.5 Sonnet, local Ollama?)
2. **Token Limits**: How to handle tasks that exceed context window?
3. **Retry Strategy**: How many retries for LLM failures? Exponential backoff parameters?
4. **Caching**: Should we cache decomposition results for similar tasks?
5. **Learning**: How to incorporate successful decompositions into Tech Orders?

## Related Documentation

- [FleetTools README](/home/vitruvius/git/fleettools/README.md)
- [Flightline README](/home/vitruvius/git/fleettools/flightline/README.md)
- [Squawk README](/home/vitruvius/git/fleettools/squawk/README.md)
- [Phase 1-3 Fixes Spec](/home/vitruvius/git/fleettools/specs/fleettools-fixes/spec.md)

---

**Status**: Ready for Implementation  
**Confidence**: 0.90  
**Last Updated**: 2026-01-04  
**Spec Version**: 1.0.0
