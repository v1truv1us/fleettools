/**
 * CLI Performance Tests (INT-002)
 * 
 * Tests the performance of CLI commands including checkpoint listing,
 * showing, pruning, and command startup times.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { PerformanceProfiler, PerformanceTestDataGenerator, type LoadTestConfig } from './performance-utils';
import { join } from 'path';
import { mkdtemp, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('CLI Performance (INT-002)', () => {
  let profiler: PerformanceProfiler;
  let testDbDir: string;

  beforeAll(async () => {
    profiler = new PerformanceProfiler();
    testDbDir = await mkdtemp(join(tmpdir(), 'fleettools-cli-perf-'));
  });

  afterAll(async () => {
    // Clean up test directory
    if (testDbDir) {
      rmSync(testDbDir, { recursive: true, force: true });
    }
    
    // Export performance report
    const reportPath = join(testDbDir, 'cli-performance-report.json');
    profiler.exportReport(reportPath);
    console.log(`CLI performance report exported to: ${reportPath}`);
  });

  beforeEach(() => {
    profiler.reset();
  });

  describe('Command Startup Performance', () => {
    test('should start commands quickly', async () => {
      const { result, metrics } = await profiler.measureOperation(
        'command_startup',
        async () => {
          // Simulate command startup overhead
          const startTime = Date.now();
          
          // Mock initialization tasks
          await new Promise(resolve => setTimeout(resolve, 5)); // Config loading
          await new Promise(resolve => setTimeout(resolve, 3)); // Database connection
          await new Promise(resolve => setTimeout(resolve, 2)); // Command registration
          
          const initTime = Date.now() - startTime;
          return { initialized: true, initTime };
        }
      );

      expect(metrics.duration).toBeLessThan(20); // Should startup in < 20ms
      expect(result.initialized).toBe(true);
      
      console.log(`Command startup: ${metrics.duration.toFixed(2)}ms`);
      console.log(`Memory usage: ${(metrics.memoryPeak / 1024 / 1024).toFixed(2)}MB`);
    });

    test('should handle argument parsing efficiently', async () => {
      const argCount = 20;
      const args = Array.from({ length: argCount }, (_, i) => `--arg${i}=value${i}`);
      
      const { result, metrics } = await profiler.measureOperation(
        'argument_parsing',
        async () => {
          // Simulate argument parsing
          const parsed = {};
          for (const arg of args) {
            const [key, value] = arg.split('=');
            parsed[key] = value;
          }
          return Object.keys(parsed).length;
        }
      );

      expect(metrics.duration).toBeLessThan(5); // Should parse in < 5ms
      expect(result).toBe(argCount);
      
      console.log(`Argument parsing (${argCount} args): ${metrics.duration.toFixed(2)}ms`);
    });
  });

  describe('Checkpoint List Performance', () => {
    test('should list small number of checkpoints efficiently', async () => {
      const checkpointCount = 10;
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(checkpointCount, 1);
      
      const { result, metrics } = await profiler.measureOperation(
        'list_small_checkpoints',
        async () => {
          // Simulate checkpoint listing with filtering
          const filtered = checkpoints.map(cp => ({
            id: cp.id,
            mission_id: cp.mission_id,
            timestamp: cp.timestamp,
            progress_percent: cp.progress_percent
          }));
          
          // Apply limit and offset
          const limited = filtered.slice(0, 10);
          return limited.length;
        }
      );

      expect(metrics.duration).toBeLessThan(10); // Should complete in < 10ms
      expect(result).toBe(checkpointCount);
      
      console.log(`List checkpoints (${checkpointCount} items): ${metrics.duration.toFixed(2)}ms`);
    });

    test('should handle medium checkpoint listings efficiently', async () => {
      const checkpointCount = 100;
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(checkpointCount, 2);
      
      const { result, metrics } = await profiler.measureOperation(
        'list_medium_checkpoints',
        async () => {
          // Simulate more complex listing with filtering and sorting
          const filtered = checkpoints
            .filter(cp => cp.progress_percent > 50) // Progress filter
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) // Sort by timestamp
            .map(cp => ({
              id: cp.id,
              mission_id: cp.mission_id,
              timestamp: cp.timestamp,
              progress_percent: cp.progress_percent,
              sorties_count: cp.sorties.length,
              locks_count: cp.active_locks.length
            }));
          
          // Apply pagination
          const page = filtered.slice(0, 20);
          return page.length;
        }
      );

      expect(metrics.duration).toBeLessThan(50); // Should complete in < 50ms
      expect(result).toBeGreaterThan(0);
      
      console.log(`List checkpoints (${checkpointCount} items, filtered): ${metrics.duration.toFixed(2)}ms`);
      
      const throughput = checkpointCount / (metrics.duration / 1000);
      console.log(`Listing throughput: ${throughput.toFixed(2)} checkpoints/second`);
    });

    test('should handle large checkpoint listings efficiently', async () => {
      const checkpointCount = 1000;
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(checkpointCount, 3);
      
      const { result, metrics } = await profiler.measureOperation(
        'list_large_checkpoints',
        async () => {
          // Simulate complex listing with multiple filters
          const filtered = checkpoints
            .filter(cp => cp.progress_percent > 25) // Progress filter
            .filter(cp => new Date(cp.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            .sort((a, b) => {
              // Sort by progress, then by timestamp
              if (a.progress_percent !== b.progress_percent) {
                return b.progress_percent - a.progress_percent;
              }
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            })
            .map(cp => ({
              id: cp.id,
              mission_id: cp.mission_id,
              timestamp: cp.timestamp,
              progress_percent: cp.progress_percent,
              age_hours: Math.floor((Date.now() - new Date(cp.timestamp).getTime()) / (1000 * 60 * 60)),
              sorties_count: cp.sorties.length,
              locks_count: cp.active_locks.length,
              messages_count: cp.pending_messages.filter(m => !m.delivered).length
            }));
          
          // Apply pagination with limit and offset
          const page = filtered.slice(0, 50);
          return page.length;
        }
      );

      expect(metrics.duration).toBeLessThan(200); // Should complete in < 200ms
      expect(result).toBeGreaterThan(0);
      
      console.log(`List checkpoints (${checkpointCount} items, complex filter): ${metrics.duration.toFixed(2)}ms`);
      
      const throughput = checkpointCount / (metrics.duration / 1000);
      console.log(`Listing throughput: ${throughput.toFixed(2)} checkpoints/second`);
      expect(throughput).toBeGreaterThan(5000); // Should handle at least 5k checkpoints/sec
    });
  });

  describe('Checkpoint Show Performance', () => {
    test('should show checkpoint details efficiently', async () => {
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(1, 1);
      const checkpoint = checkpoints[0];
      
      const { result, metrics } = await profiler.measureOperation(
        'show_checkpoint_details',
        async () => {
          // Simulate detailed checkpoint retrieval and formatting
          const details = {
            basic: {
              id: checkpoint.id,
              mission_id: checkpoint.mission_id,
              timestamp: checkpoint.timestamp,
              progress_percent: checkpoint.progress_percent
            },
            sorties: checkpoint.sorties.map(s => ({
              id: s.id,
              title: s.title,
              status: s.status,
              progress: s.progress
            })),
            locks: checkpoint.active_locks.map(l => ({
              id: l.id,
              file: l.file,
              held_by: l.held_by,
              acquired_at: l.acquired_at,
              age_minutes: Math.floor((Date.now() - new Date(l.acquired_at).getTime()) / (1000 * 60))
            })),
            messages: checkpoint.pending_messages.map(m => ({
              id: m.id,
              type: m.type,
              delivered: m.delivered,
              timestamp: m.timestamp
            }))
          };
          
          return details;
        }
      );

      expect(metrics.duration).toBeLessThan(20); // Should complete in < 20ms
      expect(result).toHaveProperty('basic');
      expect(result).toHaveProperty('sorties');
      expect(result).toHaveProperty('locks');
      expect(result).toHaveProperty('messages');
      
      console.log(`Show checkpoint details: ${metrics.duration.toFixed(2)}ms`);
      console.log(`  Sorties: ${result.sorties.length}, Locks: ${result.locks.length}, Messages: ${result.messages.length}`);
    });

    test('should show large checkpoint details efficiently', async () => {
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(1, 1);
      const checkpoint = checkpoints[0];
      
      // Create a larger checkpoint with more data
      checkpoint.sorties = PerformanceTestDataGenerator.generateCheckpoints(1, 30)[0].sorties;
      checkpoint.active_locks = PerformanceTestDataGenerator.generateCheckpoints(1, 15)[0].active_locks;
      checkpoint.pending_messages = PerformanceTestDataGenerator.generateCheckpoints(1, 25)[0].pending_messages;
      
      const { result, metrics } = await profiler.measureOperation(
        'show_large_checkpoint_details',
        async () => {
          // Simulate detailed retrieval with additional processing
          const details = {
            basic: {
              id: checkpoint.id,
              mission_id: checkpoint.mission_id,
              timestamp: checkpoint.timestamp,
              progress_percent: checkpoint.progress_percent
            },
            statistics: {
              sorties_total: checkpoint.sorties.length,
              sorties_completed: checkpoint.sorties.filter(s => s.status === 'completed').length,
              sorties_in_progress: checkpoint.sorties.filter(s => s.status === 'in_progress').length,
              locks_active: checkpoint.active_locks.length,
              messages_pending: checkpoint.pending_messages.filter(m => !m.delivered).length,
              messages_delivered: checkpoint.pending_messages.filter(m => m.delivered).length
            },
            sorties: checkpoint.sorties.map(s => ({
              id: s.id,
              title: s.title,
              status: s.status,
              progress: s.progress,
              progress_category: s.progress >= 80 ? 'high' : s.progress >= 50 ? 'medium' : 'low'
            })),
            locks: checkpoint.active_locks.map(l => ({
              id: l.id,
              file: l.file,
              held_by: l.held_by,
              acquired_at: l.acquired_at,
              age_minutes: Math.floor((Date.now() - new Date(l.acquired_at).getTime()) / (1000 * 60)),
              timeout_remaining: Math.max(0, l.timeout_ms - (Date.now() - new Date(l.acquired_at).getTime()))
            })),
            messages: checkpoint.pending_messages.map(m => ({
              id: m.id,
              type: m.type,
              delivered: m.delivered,
              timestamp: m.timestamp,
              age_minutes: Math.floor((Date.now() - new Date(m.timestamp).getTime()) / (1000 * 60))
            }))
          };
          
          return details;
        }
      );

      expect(metrics.duration).toBeLessThan(50); // Should complete in < 50ms
      expect(result).toHaveProperty('statistics');
      expect(result.statistics.sorties_total).toBeGreaterThan(20);
      
      console.log(`Show large checkpoint details: ${metrics.duration.toFixed(2)}ms`);
      console.log(`  Sorties: ${result.statistics.sorties_total}, Locks: ${result.statistics.locks_active}, Messages: ${result.statistics.messages_pending}`);
    });
  });

  describe('Prune Performance', () => {
    test('should prune small dataset efficiently', async () => {
      const checkpointCount = 20;
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(checkpointCount, 1);
      const cutoffTime = Date.now() - (60 * 60 * 1000); // 1 hour ago
      
      const { result, metrics } = await profiler.measureOperation(
        'prune_small_dataset',
        async () => {
          // Simulate pruning operation
          const toDelete = checkpoints.filter(cp => 
            new Date(cp.timestamp).getTime() < cutoffTime
          );
          
          // Calculate total size (estimated)
          const totalSize = toDelete.length * 1024; // 1KB per checkpoint
          
          return {
            toDelete: toDelete.length,
            totalSize: totalSize,
            ids: toDelete.map(cp => cp.id)
          };
        }
      );

      expect(metrics.duration).toBeLessThan(10); // Should complete in < 10ms
      expect(result.toDelete).toBeGreaterThanOrEqual(0);
      
      console.log(`Prune small dataset (${checkpointCount} checkpoints): ${metrics.duration.toFixed(2)}ms`);
      console.log(`  To delete: ${result.toDelete}, Size: ${(result.totalSize / 1024).toFixed(2)}KB`);
    });

    test('should prune medium dataset efficiently', async () => {
      const checkpointCount = 200;
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(checkpointCount, 2);
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      
      const { result, metrics } = await profiler.measureOperation(
        'prune_medium_dataset',
        async () => {
          // Simulate complex pruning with mission filter
          const missionFilter = 'msn-perf-0001';
          const toDelete = checkpoints.filter(cp => 
            new Date(cp.timestamp).getTime() < cutoffTime &&
            (!missionFilter || cp.mission_id === missionFilter)
          );
          
          // Group by mission for analysis
          const byMission = toDelete.reduce((acc, cp) => {
            acc[cp.mission_id] = (acc[cp.mission_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          // Calculate detailed size information
          const totalSize = toDelete.reduce((size, cp) => {
            const checkpointSize = 1024 + // Base size
              cp.sorties.length * 256 + // Sorties
              cp.active_locks.length * 128 + // Locks
              cp.pending_messages.length * 64; // Messages
            return size + checkpointSize;
          }, 0);
          
          return {
            toDelete: toDelete.length,
            totalSize,
            byMission,
            averageSize: toDelete.length > 0 ? totalSize / toDelete.length : 0,
            ids: toDelete.map(cp => cp.id)
          };
        }
      );

      expect(metrics.duration).toBeLessThan(100); // Should complete in < 100ms
      expect(result.toDelete).toBeGreaterThanOrEqual(0);
      
      console.log(`Prune medium dataset (${checkpointCount} checkpoints): ${metrics.duration.toFixed(2)}ms`);
      console.log(`  To delete: ${result.toDelete}, Size: ${(result.totalSize / 1024).toFixed(2)}KB`);
      console.log(`  Average size: ${(result.averageSize / 1024).toFixed(2)}KB`);
      
      const throughput = checkpointCount / (metrics.duration / 1000);
      console.log(`Pruning throughput: ${throughput.toFixed(2)} checkpoints/second`);
    });

    test('should prune large dataset efficiently', async () => {
      const checkpointCount = 2000;
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(checkpointCount, 3);
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      const { result, metrics } = await profiler.measureOperation(
        'prune_large_dataset',
        async () => {
          // Simulate large-scale pruning with comprehensive analysis
          const toDelete = checkpoints.filter(cp => 
            new Date(cp.timestamp).getTime() < cutoffTime
          );
          
          // Comprehensive analysis
          const analysis = {
            total: toDelete.length,
            byProgress: toDelete.reduce((acc, cp) => {
              const range = Math.floor(cp.progress_percent / 25) * 25;
              const key = `${range}-${range + 24}%`;
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            byAge: toDelete.reduce((acc, cp) => {
              const ageDays = Math.floor((Date.now() - new Date(cp.timestamp).getTime()) / (24 * 60 * 60 * 1000));
              const key = ageDays < 1 ? '<1d' : ageDays < 7 ? '1-7d' : ageDays < 30 ? '7-30d' : '>30d';
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            totalSize: toDelete.reduce((size, cp) => {
              const checkpointSize = 1024 + cp.sorties.length * 256 + cp.active_locks.length * 128 + cp.pending_messages.length * 64;
              return size + checkpointSize;
            }, 0)
          };
          
          return analysis;
        }
      );

      expect(metrics.duration).toBeLessThan(1000); // Should complete in < 1s
      expect(result.total).toBeGreaterThanOrEqual(0);
      
      console.log(`Prune large dataset (${checkpointCount} checkpoints): ${metrics.duration.toFixed(2)}ms`);
      console.log(`  To delete: ${result.total}, Size: ${(result.totalSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  By progress:`, result.byProgress);
      console.log(`  By age:`, result.byAge);
      
      const throughput = checkpointCount / (metrics.duration / 1000);
      console.log(`Pruning throughput: ${throughput.toFixed(2)} checkpoints/second`);
      expect(throughput).toBeGreaterThan(2000); // Should handle at least 2k checkpoints/sec
    });
  });

  describe('Output Formatting Performance', () => {
    test('should format human-readable output efficiently', async () => {
      const checkpointCount = 50;
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(checkpointCount, 1);
      
      const { result, metrics } = await profiler.measureOperation(
        'format_human_output',
        async () => {
          // Simulate human-readable formatting
          const lines = [
            'Checkpoints:',
            '============',
            ''
          ];
          
          checkpoints.forEach((cp, index) => {
            lines.push(`${index + 1}. ${cp.id}`);
            lines.push(`   Mission: ${cp.mission_id}`);
            lines.push(`   Created: ${new Date(cp.timestamp).toLocaleString()}`);
            lines.push(`   Progress: ${cp.progress_percent}%`);
            lines.push(`   Sorties: ${cp.sorties.length}, Locks: ${cp.active_locks.length}, Messages: ${cp.pending_messages.length}`);
            lines.push('');
          });
          
          return lines.join('\n');
        }
      );

      expect(metrics.duration).toBeLessThan(30); // Should complete in < 30ms
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(100);
      
      console.log(`Format human output (${checkpointCount} items): ${metrics.duration.toFixed(2)}ms`);
      console.log(`  Output length: ${result.length} characters`);
    });

    test('should format JSON output efficiently', async () => {
      const checkpointCount = 100;
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(checkpointCount, 1);
      
      const { result, metrics } = await profiler.measureOperation(
        'format_json_output',
        async () => {
          // Simulate JSON formatting
          const output = {
            checkpoints: checkpoints.map(cp => ({
              id: cp.id,
              mission_id: cp.mission_id,
              timestamp: cp.timestamp,
              progress_percent: cp.progress_percent,
              sorties_count: cp.sorties.length,
              locks_count: cp.active_locks.length,
              messages_count: cp.pending_messages.length
            })),
            total: checkpoints.length,
            generated_at: new Date().toISOString(),
            format_version: '1.0'
          };
          
          return JSON.stringify(output, null, 2);
        }
      );

      expect(metrics.duration).toBeLessThan(50); // Should complete in < 50ms
      expect(typeof result).toBe('string');
      
      const parsed = JSON.parse(result);
      expect(parsed.checkpoints).toHaveLength(checkpointCount);
      
      console.log(`Format JSON output (${checkpointCount} items): ${metrics.duration.toFixed(2)}ms`);
      console.log(`  JSON length: ${result.length} characters`);
    });
  });

  describe('Load Testing for CLI Commands', () => {
    test('should handle concurrent listing operations', async () => {
      const checkpointCount = 500;
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(checkpointCount, 2);
      
      const loadTestConfig: LoadTestConfig = {
        concurrentOperations: 5,
        duration: 5, // 5 seconds
        rampUpTime: 1,
        operationInterval: 100,
      };

      const loadMetrics = await profiler.runLoadTest(
        'concurrent_listing',
        async () => {
          // Simulate listing operation with random filters
          const filterOptions = {
            limit: [10, 20, 50][Math.floor(Math.random() * 3)],
            progress_threshold: [25, 50, 75][Math.floor(Math.random() * 3)]
          };
          
          const filtered = checkpoints
            .filter(cp => cp.progress_percent >= filterOptions.progress_threshold)
            .slice(0, filterOptions.limit);
          
          return filtered.length;
        },
        loadTestConfig
      );

      const avgDuration = loadMetrics.reduce((sum, m) => sum + m.duration, 0) / loadMetrics.length;
      const maxDuration = Math.max(...loadMetrics.map(m => m.duration));
      const operationsPerSecond = loadMetrics.length / loadTestConfig.duration;

      console.log(`Concurrent listing test completed:`);
      console.log(`  Total operations: ${loadMetrics.length}`);
      console.log(`  Average duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Max duration: ${maxDuration.toFixed(2)}ms`);
      console.log(`  Operations/sec: ${operationsPerSecond.toFixed(2)}`);

      expect(avgDuration).toBeLessThan(50); // Average < 50ms
      expect(maxDuration).toBeLessThan(200); // Max < 200ms
      expect(operationsPerSecond).toBeGreaterThan(20); // At least 20 ops/sec
    });
  });
});