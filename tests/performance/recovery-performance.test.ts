
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { PerformanceProfiler, PerformanceTestDataGenerator, type LoadTestConfig } from './performance-utils';
import { RecoveryDetector, type RecoveryCandidate } from '../../squawk/src/recovery/detector';
import { StateRestorer } from '../../squawk/src/recovery/restorer';
import { SQLiteAdapter } from '../../squawk/src/db/sqlite';
import type { Checkpoint } from '../../squawk/src/db/types';
import { join } from 'path';
import { mkdtemp, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('Recovery System Performance (INT-002)', () => {
  let profiler: PerformanceProfiler;
  let testDbDir: string;
  let mockAdapter: any; // Mock database adapter for testing

  beforeAll(async () => {
    profiler = new PerformanceProfiler();
    testDbDir = await mkdtemp(join(tmpdir(), 'fleettools-perf-'));
    
    mockAdapter = createMockAdapter();
  });

  afterAll(async () => {
    if (testDbDir) {
      rmSync(testDbDir, { recursive: true, force: true });
    }
    
    const reportPath = join(testDbDir, 'recovery-performance-report.json');
    profiler.exportReport(reportPath);
    console.log(`Recovery performance report exported to: ${reportPath}`);
  });

  beforeEach(() => {
    profiler.reset();
  });

  afterEach(() => {
    if (mockAdapter.reset) {
      mockAdapter.reset();
    }
  });

  describe('Recovery Detection Performance', () => {
    test('should detect recovery candidates efficiently for small mission sets (10 missions)', async () => {
      const missionCount = 10;
      const missions = PerformanceTestDataGenerator.generateMissions(missionCount);
      
      mockAdapter.setMissions(missions);
      mockAdapter.setEvents(PerformanceTestDataGenerator.generateEvents(missionCount * 2));
      mockAdapter.setCheckpoints(PerformanceTestDataGenerator.generateCheckpoints(missionCount, 2));

      const detector = new RecoveryDetector(mockAdapter);

      const { result, metrics } = await profiler.measureOperation(
        'detect_recovery_candidates_10_missions',
        () => detector.detectRecoveryCandidates({ activityThresholdMs: 5 * 60 * 1000 })
      );

      expect(metrics.duration).toBeLessThan(100); 
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThanOrEqual(0);
      
      console.log(`Detection for ${missionCount} missions: ${metrics.duration.toFixed(2)}ms`);
      console.log(`Memory usage: ${(metrics.memoryPeak / 1024 / 1024).toFixed(2)}MB`);
    });

    test('should handle medium mission sets efficiently (100 missions)', async () => {
      const missionCount = 100;
      const missions = PerformanceTestDataGenerator.generateMissions(missionCount);
      
      mockAdapter.setMissions(missions);
      mockAdapter.setEvents(PerformanceTestDataGenerator.generateEvents(missionCount * 3));
      mockAdapter.setCheckpoints(PerformanceTestDataGenerator.generateCheckpoints(missionCount, 3));

      const detector = new RecoveryDetector(mockAdapter);

      const { result, metrics } = await profiler.measureOperation(
        'detect_recovery_candidates_100_missions',
        () => detector.detectRecoveryCandidates({ activityThresholdMs: 5 * 60 * 1000 })
      );

      expect(metrics.duration).toBeLessThan(500); 
      expect(result).toBeInstanceOf(Array);
      
      console.log(`Detection for ${missionCount} missions: ${metrics.duration.toFixed(2)}ms`);
      console.log(`Memory usage: ${(metrics.memoryPeak / 1024 / 1024).toFixed(2)}MB`);
    });

    test('should scale to large mission sets (1000 missions)', async () => {
      const missionCount = 1000;
      const missions = PerformanceTestDataGenerator.generateMissions(missionCount);
      
      mockAdapter.setMissions(missions);
      mockAdapter.setEvents(PerformanceTestDataGenerator.generateEvents(missionCount * 4));
      mockAdapter.setCheckpoints(PerformanceTestDataGenerator.generateCheckpoints(missionCount, 2));

      const detector = new RecoveryDetector(mockAdapter);

      const { result, metrics } = await profiler.measureOperation(
        'detect_recovery_candidates_1000_missions',
        () => detector.detectRecoveryCandidates({ activityThresholdMs: 5 * 60 * 1000 })
      );

      expect(metrics.duration).toBeLessThan(2000); // Should complete in < 2s
      expect(result).toBeInstanceOf(Array);
      
      console.log(`Detection for ${missionCount} missions: ${metrics.duration.toFixed(2)}ms`);
      console.log(`Memory usage: ${(metrics.memoryPeak / 1024 / 1024).toFixed(2)}MB`);
      
      const throughput = missionCount / (metrics.duration / 1000); // missions per second
      console.log(`Detection throughput: ${throughput.toFixed(2)} missions/second`);
      expect(throughput).toBeGreaterThan(500); // Should handle at least 500 missions/sec
    });

    test('should perform recovery check efficiently', async () => {
      const missionCount = 100;
      const missions = PerformanceTestDataGenerator.generateMissions(missionCount);
      
      mockAdapter.setMissions(missions);
      mockAdapter.setEvents(PerformanceTestDataGenerator.generateEvents(missionCount * 2));
      mockAdapter.setCheckpoints(PerformanceTestDataGenerator.generateCheckpoints(missionCount, 2));

      const detector = new RecoveryDetector(mockAdapter);

      const { result, metrics } = await profiler.measureOperation(
        'check_for_recovery',
        () => detector.checkForRecovery({ activityThresholdMs: 5 * 60 * 1000 })
      );

      expect(metrics.duration).toBeLessThan(300); 
      expect(result).toHaveProperty('needed');
      expect(result).toHaveProperty('candidates');
      expect(result.candidates).toBeInstanceOf(Array);
      
      console.log(`Recovery check: ${metrics.duration.toFixed(2)}ms`);
    });
  });

  describe('State Restoration Performance', () => {
    test('should restore small checkpoints efficiently (5 sorties, 2 locks, 3 messages)', async () => {
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(1, 1);
      mockAdapter.setCheckpoints(checkpoints);
      
      const restorer = new StateRestorer(mockAdapter);
      const checkpointId = checkpoints[0].id;

      const { result, metrics } = await profiler.measureOperation(
        'restore_small_checkpoint',
        () => restorer.restoreFromCheckpoint(checkpointId, { dryRun: true })
      );

      expect(metrics.duration).toBeLessThan(200); 
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('restored');
      expect(result.restored.sorties).toBeGreaterThan(0);
      
      console.log(`Small checkpoint restoration: ${metrics.duration.toFixed(2)}ms`);
      console.log(`Restored ${result.restored.sorties} sorties, ${result.restored.locks} locks, ${result.restored.messages} messages`);
    });

    test('should handle medium checkpoints efficiently (10 sorties, 5 locks, 8 messages)', async () => {
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(1, 1);
      checkpoints[0].sorties = PerformanceTestDataGenerator.generateCheckpoints(1, 10)[0].sorties;
      checkpoints[0].active_locks = PerformanceTestDataGenerator.generateCheckpoints(1, 10)[0].active_locks;
      checkpoints[0].pending_messages = PerformanceTestDataGenerator.generateCheckpoints(1, 10)[0].pending_messages;
      
      mockAdapter.setCheckpoints(checkpoints);
      const restorer = new StateRestorer(mockAdapter);
      const checkpointId = checkpoints[0].id;

      const { result, metrics } = await profiler.measureOperation(
        'restore_medium_checkpoint',
        () => restorer.restoreFromCheckpoint(checkpointId, { dryRun: true })
      );

      expect(metrics.duration).toBeLessThan(500); 
      expect(result).toHaveProperty('success');
      expect(result.restored.sorties).toBeGreaterThan(5);
      
      console.log(`Medium checkpoint restoration: ${metrics.duration.toFixed(2)}ms`);
      console.log(`Restored ${result.restored.sorties} sorties, ${result.restored.locks} locks, ${result.restored.messages} messages`);
    });

    test('should handle large checkpoints efficiently (20+ sorties, 10+ locks, 15+ messages)', async () => {
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(1, 1);
      checkpoints[0].sorties = PerformanceTestDataGenerator.generateCheckpoints(1, 25)[0].sorties;
      checkpoints[0].active_locks = PerformanceTestDataGenerator.generateCheckpoints(1, 25)[0].active_locks;
      checkpoints[0].pending_messages = PerformanceTestDataGenerator.generateCheckpoints(1, 25)[0].pending_messages;
      
      mockAdapter.setCheckpoints(checkpoints);
      const restorer = new StateRestorer(mockAdapter);
      const checkpointId = checkpoints[0].id;

      const { result, metrics } = await profiler.measureOperation(
        'restore_large_checkpoint',
        () => restorer.restoreFromCheckpoint(checkpointId, { dryRun: true })
      );

      expect(metrics.duration).toBeLessThan(1000); // Should complete in < 1s
      expect(result).toHaveProperty('success');
      expect(result.restored.sorties).toBeGreaterThan(15);
      
      console.log(`Large checkpoint restoration: ${metrics.duration.toFixed(2)}ms`);
      console.log(`Restored ${result.restored.sorties} sorties, ${result.restored.locks} locks, ${result.restored.messages} messages`);
      
      const totalItems = result.restored.sorties + result.restored.locks + result.restored.messages;
      const throughput = totalItems / (metrics.duration / 1000); // items per second
      console.log(`Restoration throughput: ${throughput.toFixed(2)} items/second`);
    });

    test('should restore latest checkpoint efficiently', async () => {
      const missionId = `msn-perf-${Date.now()}`;
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(1, 3);
      checkpoints[0].mission_id = missionId;
      
      mockAdapter.setCheckpoints(checkpoints);
      const restorer = new StateRestorer(mockAdapter);

      const { result, metrics } = await profiler.measureOperation(
        'restore_latest_checkpoint',
        () => restorer.restoreLatest(missionId, { dryRun: true })
      );

      expect(metrics.duration).toBeLessThan(300); 
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('checkpoint_id');
      
      console.log(`Latest checkpoint restoration: ${metrics.duration.toFixed(2)}ms`);
    });
  });

  describe('Load Testing for Recovery Operations', () => {
    test('should handle concurrent recovery detection operations', async () => {
      const missionCount = 200;
      const missions = PerformanceTestDataGenerator.generateMissions(missionCount);
      
      mockAdapter.setMissions(missions);
      mockAdapter.setEvents(PerformanceTestDataGenerator.generateEvents(missionCount * 3));
      mockAdapter.setCheckpoints(PerformanceTestDataGenerator.generateCheckpoints(missionCount, 2));

      const detector = new RecoveryDetector(mockAdapter);

      const loadTestConfig: LoadTestConfig = {
        concurrentOperations: 5,
        duration: 10, 
        rampUpTime: 2,
        operationInterval: 100,
      };

      const loadMetrics = await profiler.runLoadTest(
        'concurrent_recovery_detection',
        async () => {
          await detector.detectRecoveryCandidates({ activityThresholdMs: 5 * 60 * 1000 });
        },
        loadTestConfig
      );

      const avgDuration = loadMetrics.reduce((sum, m) => sum + m.duration, 0) / loadMetrics.length;
      const maxDuration = Math.max(...loadMetrics.map(m => m.duration));
      const operationsPerSecond = loadMetrics.length / loadTestConfig.duration;

      console.log(`Load test completed:`);
      console.log(`  Total operations: ${loadMetrics.length}`);
      console.log(`  Average duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Max duration: ${maxDuration.toFixed(2)}ms`);
      console.log(`  Operations/sec: ${operationsPerSecond.toFixed(2)}`);

      expect(avgDuration).toBeLessThan(1000); // Average < 1s
      expect(maxDuration).toBeLessThan(3000); // Max < 3s
      expect(operationsPerSecond).toBeGreaterThan(2); // At least 2 ops/sec
    });

    test('should handle concurrent restoration operations', async () => {
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(50, 1);
      mockAdapter.setCheckpoints(checkpoints);
      
      const restorer = new StateRestorer(mockAdapter);

      const loadTestConfig: LoadTestConfig = {
        concurrentOperations: 3,
        duration: 15, 
        rampUpTime: 3,
        operationInterval: 200,
      };

      const loadMetrics = await profiler.runLoadTest(
        'concurrent_restoration',
        async () => {
          const randomCheckpoint = checkpoints[Math.floor(Math.random() * checkpoints.length)];
          await restorer.restoreFromCheckpoint(randomCheckpoint.id, { dryRun: true });
        },
        loadTestConfig
      );

      const avgDuration = loadMetrics.reduce((sum, m) => sum + m.duration, 0) / loadMetrics.length;
      const maxDuration = Math.max(...loadMetrics.map(m => m.duration));
      const operationsPerSecond = loadMetrics.length / loadTestConfig.duration;

      console.log(`Restoration load test completed:`);
      console.log(`  Total operations: ${loadMetrics.length}`);
      console.log(`  Average duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Max duration: ${maxDuration.toFixed(2)}ms`);
      console.log(`  Operations/sec: ${operationsPerSecond.toFixed(2)}`);

      expect(avgDuration).toBeLessThan(800); 
      expect(maxDuration).toBeLessThan(2000); // Max < 2s
      expect(operationsPerSecond).toBeGreaterThan(1); // At least 1 op/sec
    });
  });

  describe('Memory Usage Analysis', () => {
    test('should maintain acceptable memory usage during large scale detection', async () => {
      const missionCount = 2000;
      const missions = PerformanceTestDataGenerator.generateMissions(missionCount);
      
      mockAdapter.setMissions(missions);
      mockAdapter.setEvents(PerformanceTestDataGenerator.generateEvents(missionCount * 5));
      mockAdapter.setCheckpoints(PerformanceTestDataGenerator.generateCheckpoints(missionCount, 2));

      const detector = new RecoveryDetector(mockAdapter);

      const initialMemory = process.memoryUsage().heapUsed;
      
      const { result, metrics } = await profiler.measureOperation(
        'large_scale_detection_memory',
        () => detector.detectRecoveryCandidates({ activityThresholdMs: 5 * 60 * 1000 })
      );

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`Memory analysis for ${missionCount} missions:`);
      console.log(`  Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
      console.log(`  Memory per mission: ${(memoryIncrease / missionCount).toFixed(2)} bytes`);

      expect(memoryIncreaseMB).toBeLessThan(100); // Less than 100MB increase
      expect(memoryIncrease / missionCount).toBeLessThan(50000); // Less than 50KB per mission
    });

    test('should not have memory leaks during repeated operations', async () => {
      const missionCount = 100;
      const missions = PerformanceTestDataGenerator.generateMissions(missionCount);
      
      mockAdapter.setMissions(missions);
      mockAdapter.setEvents(PerformanceTestDataGenerator.generateEvents(missionCount * 3));
      mockAdapter.setCheckpoints(PerformanceTestDataGenerator.generateCheckpoints(missionCount, 2));

      const detector = new RecoveryDetector(mockAdapter);
      const iterations = 50;
      const memoryMeasurements: number[] = [];

      for (let i = 0; i < iterations; i++) {
        await detector.detectRecoveryCandidates({ activityThresholdMs: 5 * 60 * 1000 });
        
        if (global.gc) {
          global.gc();
        }
        
        const memory = process.memoryUsage().heapUsed;
        memoryMeasurements.push(memory);
      }

      const initialMemory = memoryMeasurements[0];
      const finalMemory = memoryMeasurements[memoryMeasurements.length - 1];
      const maxMemory = Math.max(...memoryMeasurements);
      const memoryGrowth = finalMemory - initialMemory;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;

      console.log(`Memory leak test (${iterations} iterations):`);
      console.log(`  Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Max memory: ${(maxMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);

      expect(memoryGrowthMB).toBeLessThan(20); // Less than 20MB growth over 50 iterations
    });
  });
});

function createMockAdapter(): any {
  let missions: any[] = [];
  let events: any[] = [];
  let checkpoints: any[] = [];

  return {
    missions: {
      getByStatus: async (status: string) => missions.filter(m => m.status === status),
    },
    events: {
      getLatestByStream: async (type: string, id: string) => {
        const streamEvents = events.filter(e => e.stream_type === type && e.stream_id === id);
        return streamEvents.length > 0 ? streamEvents[streamEvents.length - 1] : null;
      },
    },
    checkpoints: {
      getLatestByMission: async (missionId: string) => {
        const missionCheckpoints = checkpoints.filter(c => c.mission_id === missionId);
        return missionCheckpoints.length > 0 ? missionCheckpoints[missionCheckpoints.length - 1] : null;
      },
      getById: async (id: string) => checkpoints.find(c => c.id === id) || null,
      markConsumed: async () => {},
    },
    sorties: {
      update: async () => {},
    },
    locks: {
      acquire: async () => ({ conflict: false }),
      forceRelease: async () => {},
    },
    messages: {
      requeue: async () => {},
    },
    
    beginTransaction: async () => {},
    commitTransaction: async () => {},
    rollbackTransaction: async () => {},
    
    setMissions: (data: any[]) => { missions = data; },
    setEvents: (data: any[]) => { events = data; },
    setCheckpoints: (data: any[]) => { checkpoints = data; },
    reset: () => {
      missions = [];
      events = [];
      checkpoints = [];
    },
  };
}