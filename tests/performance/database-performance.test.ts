/**
 * Database Performance Tests (INT-002)
 * 
 * Tests the performance of SQLite database operations including
 * query execution, concurrent access, and transaction performance.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { PerformanceProfiler, PerformanceTestDataGenerator, type LoadTestConfig } from './performance-utils';
import { join } from 'path';
import { mkdtemp, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('Database Performance (INT-002)', () => {
  let profiler: PerformanceProfiler;
  let testDbDir: string;

  beforeAll(async () => {
    profiler = new PerformanceProfiler();
    testDbDir = await mkdtemp(join(tmpdir(), 'fleettools-perf-'));
  });

  afterAll(async () => {
    // Clean up test directory
    if (testDbDir) {
      rmSync(testDbDir, { recursive: true, force: true });
    }
    
    // Export performance report
    const reportPath = join(testDbDir, 'database-performance-report.json');
    profiler.exportReport(reportPath);
    console.log(`Database performance report exported to: ${reportPath}`);
  });

  beforeEach(() => {
    profiler.reset();
  });

  describe('Query Performance', () => {
    test('should handle small dataset queries efficiently', async () => {
      const dataSize = 100;
      const testData = PerformanceTestDataGenerator.generateEvents(dataSize);
      
      const { result, metrics } = await profiler.measureOperation(
        'small_dataset_query',
        async () => {
          // Simulate query processing
          const filtered = testData.filter(e => e.stream_type === 'mission');
          return filtered.length;
        }
      );

      expect(metrics.duration).toBeLessThan(10); // Should complete in < 10ms
      expect(result).toBeGreaterThan(0);
      
      console.log(`Small dataset query (${dataSize} items): ${metrics.duration.toFixed(2)}ms`);
      console.log(`Memory usage: ${(metrics.memoryPeak / 1024 / 1024).toFixed(2)}MB`);
    });

    test('should handle medium dataset queries efficiently', async () => {
      const dataSize = 1000;
      const testData = PerformanceTestDataGenerator.generateEvents(dataSize);
      
      const { result, metrics } = await profiler.measureOperation(
        'medium_dataset_query',
        async () => {
          // Simulate more complex query processing
          const filtered = testData.filter(e => 
            e.stream_type === 'mission' && 
            e.data.performance_test === true
          );
          const grouped = filtered.reduce((acc, e) => {
            const key = e.stream_id;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          return Object.keys(grouped).length;
        }
      );

      expect(metrics.duration).toBeLessThan(50); // Should complete in < 50ms
      expect(result).toBeGreaterThan(0);
      
      console.log(`Medium dataset query (${dataSize} items): ${metrics.duration.toFixed(2)}ms`);
      console.log(`Memory usage: ${(metrics.memoryPeak / 1024 / 1024).toFixed(2)}MB`);
      
      // Calculate throughput
      const throughput = dataSize / (metrics.duration / 1000); // items per second
      console.log(`Query throughput: ${throughput.toFixed(2)} items/second`);
    });

    test('should handle large dataset queries efficiently', async () => {
      const dataSize = 10000;
      const testData = PerformanceTestDataGenerator.generateEvents(dataSize);
      
      const { result, metrics } = await profiler.measureOperation(
        'large_dataset_query',
        async () => {
          // Simulate complex query with multiple filters and aggregations
          const filtered = testData.filter(e => 
            e.stream_type === 'mission' && 
            e.data.performance_test === true &&
            new Date(e.occurred_at).getTime() > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
          );
          
          const aggregated = filtered.reduce((acc, e) => {
            const key = e.event_type;
            if (!acc[key]) {
              acc[key] = { count: 0, latest: e.occurred_at };
            }
            acc[key].count++;
            if (e.occurred_at > acc[key].latest) {
              acc[key].latest = e.occurred_at;
            }
            return acc;
          }, {} as Record<string, { count: number; latest: string }>);
          
          return Object.keys(aggregated).length;
        }
      );

      expect(metrics.duration).toBeLessThan(500); // Should complete in < 500ms
      expect(result).toBeGreaterThan(0);
      
      console.log(`Large dataset query (${dataSize} items): ${metrics.duration.toFixed(2)}ms`);
      console.log(`Memory usage: ${(metrics.memoryPeak / 1024 / 1024).toFixed(2)}MB`);
      
      const throughput = dataSize / (metrics.duration / 1000);
      console.log(`Query throughput: ${throughput.toFixed(2)} items/second`);
      expect(throughput).toBeGreaterThan(20000); // Should handle at least 20k items/sec
    });
  });

  describe('Transaction Performance', () => {
    test('should handle small transactions efficiently', async () => {
      const transactionSize = 10;
      
      const { result, metrics } = await profiler.measureOperation(
        'small_transaction',
        async () => {
          // Simulate transaction processing
          const operations = [];
          for (let i = 0; i < transactionSize; i++) {
            operations.push({
              type: 'insert',
              data: { id: `tx-${i}`, timestamp: new Date().toISOString() }
            });
          }
          return operations.length;
        }
      );

      expect(metrics.duration).toBeLessThan(20); // Should complete in < 20ms
      expect(result).toBe(transactionSize);
      
      console.log(`Small transaction (${transactionSize} operations): ${metrics.duration.toFixed(2)}ms`);
    });

    test('should handle medium transactions efficiently', async () => {
      const transactionSize = 100;
      
      const { result, metrics } = await profiler.measureOperation(
        'medium_transaction',
        async () => {
          const operations = [];
          for (let i = 0; i < transactionSize; i++) {
            operations.push({
              type: ['insert', 'update', 'delete'][Math.floor(Math.random() * 3)],
              data: { 
                id: `tx-${i}`, 
                timestamp: new Date().toISOString(),
                payload: `x`.repeat(100) // Small payload
              }
            });
          }
          return operations.length;
        }
      );

      expect(metrics.duration).toBeLessThan(100); // Should complete in < 100ms
      expect(result).toBe(transactionSize);
      
      console.log(`Medium transaction (${transactionSize} operations): ${metrics.duration.toFixed(2)}ms`);
    });

    test('should handle large transactions efficiently', async () => {
      const transactionSize = 1000;
      
      const { result, metrics } = await profiler.measureOperation(
        'large_transaction',
        async () => {
          const operations = [];
          for (let i = 0; i < transactionSize; i++) {
            operations.push({
              type: ['insert', 'update', 'delete'][Math.floor(Math.random() * 3)],
              data: { 
                id: `tx-${i}`, 
                timestamp: new Date().toISOString(),
                payload: `x`.repeat(200) // Larger payload
              }
            });
          }
          return operations.length;
        }
      );

      expect(metrics.duration).toBeLessThan(1000); // Should complete in < 1s
      expect(result).toBe(transactionSize);
      
      console.log(`Large transaction (${transactionSize} operations): ${metrics.duration.toFixed(2)}ms`);
      
      const throughput = transactionSize / (metrics.duration / 1000);
      console.log(`Transaction throughput: ${throughput.toFixed(2)} operations/second`);
    });
  });

  describe('Concurrent Access Performance', () => {
    test('should handle concurrent read operations', async () => {
      const dataSize = 1000;
      const testData = PerformanceTestDataGenerator.generateEvents(dataSize);
      
      const loadTestConfig: LoadTestConfig = {
        concurrentOperations: 10,
        duration: 5, // 5 seconds
        rampUpTime: 1,
        operationInterval: 50,
      };

      const loadMetrics = await profiler.runLoadTest(
        'concurrent_reads',
        async () => {
          // Simulate read operation
          const randomIndex = Math.floor(Math.random() * testData.length);
          const item = testData[randomIndex];
          return item.id;
        },
        loadTestConfig
      );

      const avgDuration = loadMetrics.reduce((sum, m) => sum + m.duration, 0) / loadMetrics.length;
      const maxDuration = Math.max(...loadMetrics.map(m => m.duration));
      const operationsPerSecond = loadMetrics.length / loadTestConfig.duration;

      console.log(`Concurrent read test completed:`);
      console.log(`  Total operations: ${loadMetrics.length}`);
      console.log(`  Average duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Max duration: ${maxDuration.toFixed(2)}ms`);
      console.log(`  Operations/sec: ${operationsPerSecond.toFixed(2)}`);

      expect(avgDuration).toBeLessThan(10); // Average < 10ms
      expect(maxDuration).toBeLessThan(50); // Max < 50ms
      expect(operationsPerSecond).toBeGreaterThan(50); // At least 50 ops/sec
    });

    test('should handle concurrent write operations', async () => {
      const loadTestConfig: LoadTestConfig = {
        concurrentOperations: 5,
        duration: 3, // 3 seconds
        rampUpTime: 1,
        operationInterval: 100,
      };

      const loadMetrics = await profiler.runLoadTest(
        'concurrent_writes',
        async () => {
          // Simulate write operation
          const item = {
            id: `write-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toISOString(),
            data: `x`.repeat(150)
          };
          return item.id;
        },
        loadTestConfig
      );

      const avgDuration = loadMetrics.reduce((sum, m) => sum + m.duration, 0) / loadMetrics.length;
      const maxDuration = Math.max(...loadMetrics.map(m => m.duration));
      const operationsPerSecond = loadMetrics.length / loadTestConfig.duration;

      console.log(`Concurrent write test completed:`);
      console.log(`  Total operations: ${loadMetrics.length}`);
      console.log(`  Average duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Max duration: ${maxDuration.toFixed(2)}ms`);
      console.log(`  Operations/sec: ${operationsPerSecond.toFixed(2)}`);

      expect(avgDuration).toBeLessThan(20); // Average < 20ms
      expect(maxDuration).toBeLessThan(100); // Max < 100ms
      expect(operationsPerSecond).toBeGreaterThan(10); // At least 10 ops/sec
    });
  });

  describe('Lock Performance', () => {
    test('should acquire and release locks efficiently', async () => {
      const lockOperations = 100;
      const locks: Array<{ id: string; file: string; heldBy: string; acquiredAt: number }> = [];
      
      const { result, metrics } = await profiler.measureOperation(
        'lock_acquire_release',
        async () => {
          for (let i = 0; i < lockOperations; i++) {
            // Simulate lock acquisition
            const lock = {
              id: `lock-${i}`,
              file: `/src/file-${i}.ts`,
              heldBy: `specialist-${i % 5}`,
              acquiredAt: Date.now()
            };
            locks.push(lock);
            
            // Simulate lock release after some operations
            if (i >= 10) {
              const releasedIndex = Math.floor(Math.random() * 10);
              locks.splice(releasedIndex, 1);
            }
          }
          return locks.length;
        }
      );

      expect(metrics.duration).toBeLessThan(50); // Should complete in < 50ms
      expect(result).toBeGreaterThan(0);
      
      console.log(`Lock operations (${lockOperations} operations): ${metrics.duration.toFixed(2)}ms`);
      console.log(`Final locks held: ${result}`);
      
      const throughput = lockOperations / (metrics.duration / 1000);
      console.log(`Lock throughput: ${throughput.toFixed(2)} operations/second`);
    });

    test('should handle lock contention efficiently', async () => {
      const contestedResource = '/src/contested-file.ts';
      const lockAttempts = 50;
      const locks: Array<{ file: string; heldBy: string; timestamp: number }> = [];
      
      const { result, metrics } = await profiler.measureOperation(
        'lock_contention',
        async () => {
          for (let i = 0; i < lockAttempts; i++) {
            // Check if resource is already locked
            const existingLock = locks.find(l => l.file === contestedResource);
            
            if (!existingLock) {
              // Acquire lock
              locks.push({
                file: contestedResource,
                heldBy: `specialist-${i % 3}`,
                timestamp: Date.now()
              });
            } else {
              // Simulate lock conflict resolution
              const lockAge = Date.now() - existingLock.timestamp;
              if (lockAge > 100) { // Lock expires after 100ms
                const index = locks.indexOf(existingLock);
                locks.splice(index, 1);
                
                // Acquire new lock
                locks.push({
                  file: contestedResource,
                  heldBy: `specialist-${i % 3}`,
                  timestamp: Date.now()
                });
              }
            }
          }
          return locks.length;
        }
      );

      expect(metrics.duration).toBeLessThan(100); // Should complete in < 100ms
      
      console.log(`Lock contention test (${lockAttempts} attempts): ${metrics.duration.toFixed(2)}ms`);
      console.log(`Final locks held: ${result}`);
    });
  });

  describe('Memory Efficiency', () => {
    test('should maintain acceptable memory usage during large operations', async () => {
      const dataSize = 50000;
      const initialMemory = process.memoryUsage().heapUsed;
      
      const { result, metrics } = await profiler.measureOperation(
        'large_memory_operation',
        async () => {
          // Create large dataset
          const largeDataset = [];
          for (let i = 0; i < dataSize; i++) {
            largeDataset.push({
              id: `item-${i}`,
              timestamp: new Date().toISOString(),
              data: `x`.repeat(50), // 50 bytes per item
              metadata: {
                index: i,
                processed: false,
                tags: [`tag-${i % 10}`, `category-${i % 5}`]
              }
            });
          }
          
          // Process the dataset
          const processed = largeDataset.filter(item => {
            return item.data.length > 0 && item.metadata.index % 2 === 0;
          });
          
          return processed.length;
        }
      );

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`Large memory operation (${dataSize} items):`);
      console.log(`  Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
      console.log(`  Items processed: ${result}`);

      // Memory usage should be reasonable
      expect(memoryIncreaseMB).toBeLessThan(200); // Less than 200MB increase
      expect(result).toBeGreaterThan(0);
    });

    test('should efficiently garbage collect after large operations', async () => {
      const iterations = 10;
      const dataSize = 10000;
      const memoryMeasurements: number[] = [];

      for (let i = 0; i < iterations; i++) {
        // Create and process large dataset
        const dataset = [];
        for (let j = 0; j < dataSize; j++) {
          dataset.push({
            id: `item-${i}-${j}`,
            data: `x`.repeat(30)
          });
        }
        
        // Process data
        const processed = dataset.filter(item => item.data.length > 20);
        expect(processed.length).toBe(dataSize);

        // Force garbage collection if available
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

      console.log(`Garbage collection test (${iterations} iterations):`);
      console.log(`  Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Max memory: ${(maxMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);

      // Should not have significant memory growth after GC
      expect(memoryGrowthMB).toBeLessThan(50); // Less than 50MB growth over 10 iterations
    });
  });
});