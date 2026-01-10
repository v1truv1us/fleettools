/**
 * FleetTools TDD Implementation Framework
 * 
 * This file provides utilities and structure for Phase 2 (SQLite Persistence) 
 * and Phase 3 (Context Survival) parallel development.
 * 
 * Following Test-Driven Development principles:
 * 1. Write tests first
 * 2. Implement functionality to pass tests
 * 3. Refactor while keeping tests green
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'bun:test';
import type { DatabaseAdapter } from '../../squawk/src/db/types';
import { createTestDatabase, cleanupDatabase } from './test-sqlite';
import { mockDatabase, resetMockStorage } from './mock-database';

/**
 * DatabaseAdapterFactory - Create different database implementations for testing
 */
export class DatabaseAdapterFactory {
  /**
   * Create a mock database adapter for Phase 3 development
   */
  static createMock(): DatabaseAdapter {
    return mockDatabase as DatabaseAdapter;
  }

  /**
   * Create a SQLite database adapter for Phase 2 development
   */
  static createSQLite(dbPath?: string): DatabaseAdapter {
    // This would be implemented when Phase 2 SQLite adapter is ready
    // For now, return mock
    return mockDatabase as DatabaseAdapter;
    
    // When SQLite adapter is ready:
    // const db = dbPath ? new Database(dbPath) : createTestDatabase();
    // return createSQLiteAdapter(db);
  }
}

/**
 * TestContext - Provides isolated test context with cleanup
 */
export class TestContext {
  private cleanup: (() => Promise<void>)[] = [];

  /**
   * Add cleanup function to be called after test
   */
  addCleanup(cleanupFn: () => Promise<void>): void {
    this.cleanup.push(cleanupFn);
  }

  /**
   * Run all cleanup functions
   */
  async cleanupAll(): Promise<void> {
    for (const cleanupFn of this.cleanup) {
      try {
        await cleanupFn();
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    }
    this.cleanup = [];
  }
}

/**
 * Test Fixtures - Common test data patterns
 */
export class TestFixtures {
  /**
   * Create a test mission
   */
  static createMission(overrides: Partial<any> = {}) {
    return {
      id: `msn-test-${Date.now()}`,
      title: 'Test Mission',
      description: 'Test mission description',
      status: 'pending',
      priority: 'medium',
      created_at: new Date().toISOString(),
      total_sorties: 0,
      completed_sorties: 0,
      ...overrides
    };
  }

  /**
   * Create a test sortie
   */
  static createSortie(overrides: Partial<any> = {}) {
    return {
      id: `srt-test-${Date.now()}`,
      mission_id: 'msn-test',
      title: 'Test Sortie',
      description: 'Test sortie description',
      status: 'pending',
      priority: 'medium',
      progress: 0,
      created_at: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create a test lock
   */
  static createLock(overrides: Partial<any> = {}) {
    return {
      id: `lock-test-${Date.now()}`,
      file: '/test/file.ts',
      normalized_path: '/test/file.ts',
      reserved_by: 'spec-test',
      reserved_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60000).toISOString(),
      purpose: 'edit',
      status: 'active',
      ...overrides
    };
  }

  /**
   * Create a test event
   */
  static createEvent(overrides: Partial<any> = {}) {
    return {
      sequence_number: 1,
      event_id: `evt-test-${Date.now()}`,
      event_type: 'test_event',
      stream_type: 'mission',
      stream_id: 'msn-test',
      data: { test: true },
      occurred_at: new Date().toISOString(),
      recorded_at: new Date().toISOString(),
      schema_version: 1,
      ...overrides
    };
  }

  /**
   * Create a test checkpoint
   */
  static createCheckpoint(overrides: Partial<any> = {}) {
    return {
      id: `chk-test-${Date.now()}`,
      mission_id: 'msn-test',
      timestamp: new Date().toISOString(),
      trigger: 'manual',
      progress_percent: 0,
      sorties: [],
      active_locks: [],
      pending_messages: [],
      recovery_context: {
        last_action: 'test action',
        next_steps: ['step 1', 'step 2'],
        blockers: [],
        files_modified: [],
        mission_summary: 'Test mission',
        elapsed_time_ms: 0,
        last_activity_at: new Date().toISOString()
      },
      created_by: 'test-agent',
      version: '1.0.0',
      ...overrides
    };
  }

  /**
   * Create a test specialist
   */
  static createSpecialist(overrides: Partial<any> = {}) {
    return {
      id: `spec-test-${Date.now()}`,
      name: 'Test Specialist',
      status: 'active',
      capabilities: ['test'],
      registered_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create a test message
   */
  static createMessage(overrides: Partial<any> = {}) {
    return {
      id: `msg-test-${Date.now()}`,
      mailbox_id: 'mbx-test',
      message_type: 'test_message',
      content: { test: true },
      priority: 'normal',
      status: 'pending',
      sent_at: new Date().toISOString(),
      ...overrides
    };
  }
}

/**
 * TDD Test Patterns - Common test patterns for FleetTools
 */
export class TDDPatterns {
  /**
   * Test CRUD operations with happy path
   */
  static async testCRUDHappyPath<T>(
    createInput: any,
    entityOps: {
      create: (input: any) => Promise<T>;
      getById: (id: string) => Promise<T | null>;
      update: (id: string, input: any) => Promise<T | null>;
      delete: (id: string) => Promise<boolean>;
    }
  ): Promise<void> {
    // Create
    const created = await entityOps.create(createInput);
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();

    // Read by ID
    const retrieved = await entityOps.getById(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(created.id);

    // Update
    const updateInput = { title: 'Updated Title' };
    const updated = await entityOps.update(created.id, updateInput);
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe(updateInput.title);

    // Delete
    const deleted = await entityOps.delete(created.id);
    expect(deleted).toBe(true);

    // Verify deletion
    const afterDelete = await entityOps.getById(created.id);
    expect(afterDelete).toBeNull();
  }

  /**
   * Test error handling
   */
  static async testErrorHandling<T>(
    entityOps: {
      getById: (id: string) => Promise<T | null>;
    },
    nonExistentId: string = 'non-existent-id'
  ): Promise<void> {
    const notFound = await entityOps.getById(nonExistentId);
    expect(notFound).toBeNull();
  }
}

/**
 * Coverage tracking for TDD development
 */
export interface CoverageMetrics {
  totalTests: number;
  passingTests: number;
  lineCoverage: number;
  functionCoverage: number;
  branchCoverage: number;
}

export class CoverageTracker {
  private metrics: CoverageMetrics = {
    totalTests: 0,
    passingTests: 0,
    lineCoverage: 0,
    functionCoverage: 0,
    branchCoverage: 0
  };

  /**
   * Record test execution
   */
  recordTest(passed: boolean): void {
    this.metrics.totalTests++;
    if (passed) {
      this.metrics.passingTests++;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): CoverageMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if coverage targets are met
   */
  areTargetsMet(): boolean {
    return (
      this.metrics.lineCoverage >= 95 &&
      this.metrics.functionCoverage >= 95 &&
      this.metrics.branchCoverage >= 90
    );
  }
}

/**
 * Phase Development Tracking
 */
export interface PhaseProgress {
  phase: 'Phase 2' | 'Phase 3';
  day: number;
  totalTests: number;
  completedTests: number;
  blockers: string[];
}

export class PhaseTracker {
  private progress: Map<string, PhaseProgress> = new Map();

  /**
   * Initialize phase tracking
   */
  initPhase(phase: 'Phase 2' | 'Phase 3', totalTests: number): void {
    this.progress.set(phase, {
      phase,
      day: 1,
      totalTests,
      completedTests: 0,
      blockers: []
    });
  }

  /**
   * Mark test as completed
   */
  completeTest(phase: 'Phase 2' | 'Phase 3'): void {
    const progress = this.progress.get(phase);
    if (progress) {
      progress.completedTests++;
      this.progress.set(phase, progress);
    }
  }

  /**
   * Add blocker
   */
  addBlocker(phase: 'Phase 2' | 'Phase 3', blocker: string): void {
    const progress = this.progress.get(phase);
    if (progress) {
      progress.blockers.push(blocker);
      this.progress.set(phase, progress);
    }
  }

  /**
   * Get phase status
   */
  getPhaseStatus(phase: 'Phase 2' | 'Phase 3'): PhaseProgress | undefined {
    return this.progress.get(phase);
  }

  /**
   * Check if phase is complete
   */
  isPhaseComplete(phase: 'Phase 2' | 'Phase 3'): boolean {
    const progress = this.progress.get(phase);
    return progress ? progress.completedTests >= progress.totalTests : false;
  }
}

/**
 * Export all utilities for TDD development
 */
// Export all framework components
export { DatabaseAdapterFactory };
export { TestContext };
export { TestFixtures };
export { TDDPatterns };
export { CoverageTracker };
export { PhaseTracker };

/**
 * Integration test helpers
 */
export class IntegrationTestHelper {
  /**
   * Create isolated test environment
   */
  static createIsolatedEnvironment(): {
    const testContext = new TestContext();
    
    // Setup isolated database
    const mockDb = DatabaseAdapterFactory.createMock();
    
    return {
      db: mockDb,
      cleanup: () => testContext.cleanupAll(),
      context: testContext
    };
  }

  /**
   * Run contract tests against both implementations
   */
  static async runContractTests(
    contractTestFn: (createOps: () => any, cleanup?: () => Promise<void>) => void,
    mockImplementation: any,
    // realImplementation would be added when Phase 2 is complete
  ): Promise<void> {
    describe('Contract Tests', () => {
      // Test mock implementation
      describe('Mock Implementation', () => {
        contractTestFn(
          () => mockImplementation,
          () => resetMockStorage()
        );
      });

      // Test real implementation when available
      // This will be added when Phase 2 SQLite implementation is ready
    });
  }
}

/**
 * Development workflow helpers
 */
export class WorkflowHelper {
  /**
   * Get today's TDD tasks
   */
  static getTodaysTasks(day: number): {
    phase2: string[];
    phase3: string[];
  } {
    const phase2Tasks: Record<number, string[]> = {
      1: ['Create shared interfaces', 'Create mock implementations', 'Write contract tests'],
      2: ['Write EVT-001 to EVT-008', 'Implement EventOps interface', 'Write STR-001 to STR-010'],
      3: ['Write MSN-001 to MSN-012', 'Write SRT-001 to SRT-015', 'Write CKP-001 to CKP-015'],
      4: ['Write LCK-001 to LCK-010', 'Write DET-001 to DET-008', 'Write RST-001 to RST-012'],
      5: ['Write event schema tests', 'Implement state restoration', 'Implement lock re-acquisition'],
      // ... more days
    };

    const phase3Tasks: Record<number, string[]> = {
      1: ['Create mock implementations', 'Write contract tests', 'Verify mocks pass contract tests'],
      2: ['Write STR-001 to STR-010', 'Implement CheckpointStorage class', 'Implement dual storage'],
      3: ['Write CKP-001 to CKP-015', 'Implement CheckpointService class', 'Create progress milestones'],
      4: ['Write DET-001 to DET-008', 'Implement RecoveryDetector class', 'Implement activity thresholds'],
      5: ['Write RST-001 to RST-012', 'Implement StateRestorer class', 'Implement lock re-acquisition'],
      // ... more days
    };

    return {
      phase2: phase2Tasks[day] || [],
      phase3: phase3Tasks[day] || []
    };
  }

  /**
   * Validate completion according to targets
   */
  static validateDayCompletion(
    completedTasks: string[],
    targetTasks: string[],
    targetTests: number,
    actualTests: number
  ): {
    success: boolean;
    coverage: number;
    blockers: string[];
  } {
    const taskSuccess = targetTasks.every(task => completedTasks.includes(task));
    const testSuccess = actualTests >= targetTests;
    const coverage = targetTests > 0 ? (actualTests / targetTests) * 100 : 100;
    
    return {
      success: taskSuccess && testSuccess,
      coverage,
      blockers: targetTasks.filter(task => !completedTasks.includes(task))
    };
  }
}