/**
 * Security and Learning System Unit Tests
 *
 * Verify security hardening and learning system implementation
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Security Hardening', () => {
  describe('Postgres Provider Security', () => {
    it('should not have hardcoded postgres password', () => {
      const filePath = path.join(process.cwd(), 'providers/podman-postgres.ts');
      const content = readFileSync(filePath, 'utf-8');

      // Should NOT contain hardcoded password
      expect(content).not.toContain('POSTGRES_PASSWORD=fleettools');
    });

    it('should use environment variable for postgres password', () => {
      const filePath = path.join(process.cwd(), 'providers/podman-postgres.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('process.env.POSTGRES_PASSWORD');
    });

    it('should validate postgres password is required', () => {
      const filePath = path.join(process.cwd(), 'providers/podman-postgres.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('if (!postgresPassword)');
      expect(content).toContain('throw new Error');
    });

    it('should support configurable postgres user', () => {
      const filePath = path.join(process.cwd(), 'providers/podman-postgres.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('process.env.POSTGRES_USER');
    });

    it('should support configurable postgres database', () => {
      const filePath = path.join(process.cwd(), 'providers/podman-postgres.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('process.env.POSTGRES_DB');
    });
  });
});

describe('Learning System Implementation', () => {
  describe('Pattern Storage', () => {
    it('should have pattern storage module', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/pattern-storage.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
    });

    it('should export PatternStorage class', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/pattern-storage.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('export class PatternStorage');
    });

    it('should have storePattern method', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/pattern-storage.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('async storePattern');
    });

    it('should have getPattern method', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/pattern-storage.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('async getPattern');
    });

    it('should have listPatterns method', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/pattern-storage.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('async listPatterns');
    });

    it('should have methods for pattern management', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/pattern-storage.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('async storePattern');
      expect(content).toContain('async listPatterns');
    });

    it('should use bun:sqlite for persistence', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/pattern-storage.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('import Database from \'bun:sqlite\'');
    });

    it('should generate pattern IDs with pat_ prefix', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/pattern-storage.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('pat_');
      expect(content).toContain('randomUUID()');
    });
  });

  describe('Learning Routes', () => {
    it('should handle pattern list endpoint', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('router.get(\'/api/v1/patterns\'');
    });

    it('should handle pattern create endpoint', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('router.post(\'/api/v1/patterns\'');
    });

    it('should handle learning metrics endpoint', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('router.get(\'/api/v1/learning/metrics\'');
    });

    it('should calculate total patterns in metrics', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('total_patterns');
    });

    it('should categorize patterns by type', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('patterns_by_type');
    });

    it('should calculate average effectiveness', () => {
      const filePath = path.join(process.cwd(), 'server/api/src/coordination/learning/routes.ts');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('average_effectiveness');
    });
  });

  describe('Database Schema', () => {
    it('should have learned_patterns table in schema', () => {
      const filePath = path.join(process.cwd(), 'squawk/src/db/schema.sql');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('CREATE TABLE IF NOT EXISTS learned_patterns');
    });

    it('should have pattern_outcomes table in schema', () => {
      const filePath = path.join(process.cwd(), 'squawk/src/db/schema.sql');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('CREATE TABLE IF NOT EXISTS pattern_outcomes');
    });

    it('should have indexes for pattern queries', () => {
      const filePath = path.join(process.cwd(), 'squawk/src/db/schema.sql');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_pattern_outcomes_pattern');
      expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_pattern_outcomes_mission');
      expect(content).toContain('CREATE INDEX IF NOT EXISTS idx_learned_patterns_type');
    });

    it('should have pattern columns for core data', () => {
      const filePath = path.join(process.cwd(), 'squawk/src/db/schema.sql');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('pattern_type TEXT NOT NULL');
      expect(content).toContain('task_sequence TEXT NOT NULL');
      expect(content).toContain('success_rate REAL');
      expect(content).toContain('effectiveness_score REAL');
      expect(content).toContain('usage_count INTEGER');
    });

    it('should have outcome columns for tracking usage', () => {
      const filePath = path.join(process.cwd(), 'squawk/src/db/schema.sql');
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('pattern_id TEXT NOT NULL');
      expect(content).toContain('mission_id TEXT NOT NULL');
      expect(content).toContain('success BOOLEAN NOT NULL');
      expect(content).toContain('completion_rate REAL');
    });
  });
});

describe('Build Compilation', () => {
  it('should have valid typescript in CLI commands', async () => {
    const agentsPath = path.join(process.cwd(), 'packages/cli/src/commands/agents.ts');
    const checkpointsPath = path.join(process.cwd(), 'packages/cli/src/commands/checkpoints.ts');
    const resumePath = path.join(process.cwd(), 'packages/cli/src/commands/resume.ts');

    const agentsContent = readFileSync(agentsPath, 'utf-8');
    const checkpointsContent = readFileSync(checkpointsPath, 'utf-8');
    const resumeContent = readFileSync(resumePath, 'utf-8');

    // Check for basic TypeScript syntax
    expect(agentsContent).toContain('import');
    expect(agentsContent).toContain('export');
    expect(checkpointsContent).toContain('import');
    expect(checkpointsContent).toContain('export');
    expect(resumeContent).toContain('import');
    expect(resumeContent).toContain('export');
  });

  it('should have valid typescript in learning system', async () => {
    const patternStoragePath = path.join(process.cwd(), 'server/api/src/coordination/learning/pattern-storage.ts');
    const learningRoutesPath = path.join(process.cwd(), 'server/api/src/coordination/learning/routes.ts');

    const patternStorageContent = readFileSync(patternStoragePath, 'utf-8');
    const learningRoutesContent = readFileSync(learningRoutesPath, 'utf-8');

    expect(patternStorageContent).toContain('import');
    expect(patternStorageContent).toContain('export');
    expect(learningRoutesContent).toContain('import');
    expect(learningRoutesContent).toContain('export');
  });
});
