/**
 * Scalability Performance Tests (INT-002)
 * 
 * Tests system scalability with large datasets, concurrent operations,
 * and resource utilization patterns.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { PerformanceProfiler, PerformanceTestDataGenerator, type LoadTestConfig } from './performance-utils';
import { join } from 'path';
import { mkdtemp, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('Scalability Performance (INT-002)', () => {
  let profiler: PerformanceProfiler;
  let testDbDir: string;

  beforeAll(async () => {
    profiler = new PerformanceProfiler();
    testDbDir = await mkdtemp(join(tmpdir(), 'fleettools-scalability-perf-'));
  });

  afterAll(async () => {
    // Clean up test directory
    if (testDbDir) {
      rmSync(testDbDir, { recursive: true, force: true });
    }
    
    // Export performance report
    const reportPath = join(testDbDir, 'scalability-performance-report.json');
    profiler.exportReport(reportPath);
    console.log(`Scalability performance report exported to: ${reportPath}`);
  });

  beforeEach(() => {
    profiler.reset();
  });

  describe('Large Dataset Performance', () => {
    test('should handle 10 missions efficiently', async () => {
      const missionCount = 10;
      const checkpointsPerMission = 5;
      const totalCheckpoints = missionCount * checkpointsPerMission;
      
      const missions = PerformanceTestDataGenerator.generateMissions(missionCount);
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(missionCount, checkpointsPerMission);
      const events = PerformanceTestDataGenerator.generateEvents(totalCheckpoints * 10);
      
      const { result, metrics } = await profiler.measureOperation(
        'scale_10_missions',
        async () => {
          // Simulate comprehensive data processing
          const missionStats = missions.map(mission => {
            const missionCheckpoints = checkpoints.filter(cp => cp.mission_id === mission.id);
            const missionEvents = events.filter(e => e.stream_id === mission.id);
            
            return {
              mission_id: mission.id,
              checkpoints_count: missionCheckpoints.length,
              events_count: missionEvents.length,
              average_progress: missionCheckpoints.reduce((sum, cp) => sum + cp.progress_percent, 0) / missionCheckpoints.length,
              latest_activity: missionEvents.length > 0 ? missionEvents[missionEvents.length - 1].occurred_at : null
            };
          });
          
          return {
            total_missions: missionStats.length,
            total_checkpoints: totalCheckpoints,
            total_events: events.length,
            mission_statistics: missionStats
          };
        }
      );

      expect(metrics.duration).toBeLessThan(50); // Should complete in < 50ms
      expect(result.total_missions).toBe(missionCount);
      
      console.log(`10 missions scalability test: ${metrics.duration.toFixed(2)}ms`);
      console.log(`  Total checkpoints: ${result.total_checkpoints}`);
      console.log(`  Total events: ${result.total_events}`);
      console.log(`  Memory usage: ${(metrics.memoryPeak / 1024 / 1024).toFixed(2)}MB`);
    });

    test('should handle 100 missions efficiently', async () => {
      const missionCount = 100;
      const checkpointsPerMission = 3;
      const totalCheckpoints = missionCount * checkpointsPerMission;
      
      const missions = PerformanceTestDataGenerator.generateMissions(missionCount);
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(missionCount, checkpointsPerMission);
      const events = PerformanceTestDataGenerator.generateEvents(totalCheckpoints * 8);
      
      const { result, metrics } = await profiler.measureOperation(
        'scale_100_missions',
        async () => {
          // Simulate more complex processing for larger dataset
          const missionStats = missions.map(mission => {
            const missionCheckpoints = checkpoints.filter(cp => cp.mission_id === mission.id);
            const missionEvents = events.filter(e => e.stream_id === mission.id);
            
            // Calculate additional metrics
            const sortedCheckpoints = missionCheckpoints.sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            
            const totalSorties = missionCheckpoints.reduce((sum, cp) => sum + cp.sorties.length, 0);
            const totalLocks = missionCheckpoints.reduce((sum, cp) => sum + cp.active_locks.length, 0);
            const totalMessages = missionCheckpoints.reduce((sum, cp) => sum + cp.pending_messages.length, 0);
            
            return {
              mission_id: mission.id,
              checkpoints_count: missionCheckpoints.length,
              events_count: missionEvents.length,
              average_progress: missionCheckpoints.reduce((sum, cp) => sum + cp.progress_percent, 0) / missionCheckpoints.length,
              latest_checkpoint: sortedCheckpoints[0]?.timestamp || null,
              total_sorties: totalSorties,
              total_locks: totalLocks,
              total_messages: totalMessages,
              completion_rate: missionCheckpoints.filter(cp => cp.progress_percent === 100).length / missionCheckpoints.length
            };
          });
          
          // Aggregate statistics
          const aggregated = {
            total_missions: missionStats.length,
            total_checkpoints: totalCheckpoints,
            total_events: events.length,
            total_sorties: missionStats.reduce((sum, m) => sum + m.total_sorties, 0),
            total_locks: missionStats.reduce((sum, m) => sum + m.total_locks, 0),
            total_messages: missionStats.reduce((sum, m) => sum + m.total_messages, 0),
            average_completion_rate: missionStats.reduce((sum, m) => sum + m.completion_rate, 0) / missionStats.length
          };
          
          return aggregated;
        }
      );

      expect(metrics.duration).toBeLessThan(200); // Should complete in < 200ms
      expect(result.total_missions).toBe(missionCount);
      
      console.log(`100 missions scalability test: ${metrics.duration.toFixed(2)}ms`);
      console.log(`  Total checkpoints: ${result.total_checkpoints}`);
      console.log(`  Total events: ${result.total_events}`);
      console.log(`  Total sorties: ${result.total_sorties}`);
      console.log(`  Memory usage: ${(metrics.memoryPeak / 1024 / 1024).toFixed(2)}MB`);
      
      // Calculate throughput
      const throughput = missionCount / (metrics.duration / 1000);
      console.log(`Processing throughput: ${throughput.toFixed(2)} missions/second`);
    });

    test('should handle 1000 missions efficiently', async () => {
      const missionCount = 1000;
      const checkpointsPerMission = 2;
      const totalCheckpoints = missionCount * checkpointsPerMission;
      
      const missions = PerformanceTestDataGenerator.generateMissions(missionCount);
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(missionCount, checkpointsPerMission);
      const events = PerformanceTestDataGenerator.generateEvents(totalCheckpoints * 5);
      
      const { result, metrics } = await profiler.measureOperation(
        'scale_1000_missions',
        async () => {
          // Simulate large-scale data processing with optimized algorithms
          const missionMap = new Map();
          
          // Pre-process data for efficient lookup
          checkpoints.forEach(cp => {
            if (!missionMap.has(cp.mission_id)) {
              missionMap.set(cp.mission_id, {
                checkpoints: [],
                events: [],
                total_sorties: 0,
                total_locks: 0,
                total_messages: 0
              });
            }
            const mission = missionMap.get(cp.mission_id);
            mission.checkpoints.push(cp);
            mission.total_sorties += cp.sorties.length;
            mission.total_locks += cp.active_locks.length;
            mission.total_messages += cp.pending_messages.length;
          });
          
          events.forEach(e => {
            if (missionMap.has(e.stream_id)) {
              missionMap.get(e.stream_id).events.push(e);
            }
          });
          
          // Generate statistics
          const stats = {
            total_missions: missionMap.size,
            total_checkpoints: checkpoints.length,
            total_events: events.length,
            total_sorties: 0,
            total_locks: 0,
            total_messages: 0,
            mission_details: []
          };
          
          for (const [missionId, data] of missionMap) {
            stats.total_sorties += data.total_sorties;
            stats.total_locks += data.total_locks;
            stats.total_messages += data.total_messages;
            
            if (stats.mission_details.length < 10) { // Limit details for performance
              const avgProgress = data.checkpoints.reduce((sum, cp) => sum + cp.progress_percent, 0) / data.checkpoints.length;
              stats.mission_details.push({
                mission_id: missionId,
                checkpoints_count: data.checkpoints.length,
                events_count: data.events.length,
                average_progress: avgProgress,
                total_resources: data.total_sorties + data.total_locks + data.total_messages
              });
            }
          }
          
          return stats;
        }
      );

      expect(metrics.duration).toBeLessThan(1000); // Should complete in < 1s
      expect(result.total_missions).toBe(missionCount);
      
      console.log(`1000 missions scalability test: ${metrics.duration.toFixed(2)}ms`);
      console.log(`  Total checkpoints: ${result.total_checkpoints}`);
      console.log(`  Total events: ${result.total_events}`);
      console.log(`  Total sorties: ${result.total_sorties}`);
      console.log(`  Total locks: ${result.total_locks}`);
      console.log(`  Memory usage: ${(metrics.memoryPeak / 1024 / 1024).toFixed(2)}MB`);
      
      const throughput = missionCount / (metrics.duration / 1000);
      console.log(`Processing throughput: ${throughput.toFixed(2)} missions/second`);
      expect(throughput).toBeGreaterThan(1000); // Should handle at least 1000 missions/sec
    });

    test('should handle extreme scale (5000+ missions)', async () => {
      const missionCount = 5000;
      const checkpointsPerMission = 1;
      const totalCheckpoints = missionCount * checkpointsPerMission;
      
      const missions = PerformanceTestDataGenerator.generateMissions(missionCount);
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(missionCount, checkpointsPerMission);
      const events = PerformanceTestDataGenerator.generateEvents(totalCheckpoints * 3);
      
      const { result, metrics } = await profiler.measureOperation(
        'scale_extreme_5000_missions',
        async () => {
          // Optimized processing for extreme scale
          const batchProcessor = {
            processInBatches: async (items: any[], batchSize: number, processor: Function) => {
              const results = [];
              for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                const batchResult = await processor(batch);
                results.push(batchResult);
              }
              return results.flat();
            }
          };
          
          // Process in batches to manage memory
          const batchSize = 500;
          const missionBatches = [];
          
          for (let i = 0; i < missions.length; i += batchSize) {
            const batch = missions.slice(i, i + batchSize);
            const batchIds = batch.map(m => m.id);
            
            const batchStats = {
              mission_count: batch.length,
              checkpoint_count: checkpoints.filter(cp => batchIds.includes(cp.mission_id)).length,
              event_count: events.filter(e => batchIds.includes(e.stream_id)).length
            };
            
            missionBatches.push(batchStats);
          }
          
          // Aggregate batch results
          const totalStats = missionBatches.reduce((acc, batch) => ({
            total_missions: acc.total_missions + batch.mission_count,
            total_checkpoints: acc.total_checkpoints + batch.checkpoint_count,
            total_events: acc.total_events + batch.event_count
          }), { total_missions: 0, total_checkpoints: 0, total_events: 0 });
          
          return {
            ...totalStats,
            batches_processed: missionBatches.length,
            average_per_batch: {
              missions: totalStats.total_missions / missionBatches.length,
              checkpoints: totalStats.total_checkpoints / missionBatches.length,
              events: totalStats.total_events / missionBatches.length
            }
          };
        }
      );

      expect(metrics.duration).toBeLessThan(3000); // Should complete in < 3s
      expect(result.total_missions).toBe(missionCount);
      
      console.log(`Extreme scale (5000 missions) test: ${metrics.duration.toFixed(2)}ms`);
      console.log(`  Total checkpoints: ${result.total_checkpoints}`);
      console.log(`  Total events: ${result.total_events}`);
      console.log(`  Batches processed: ${result.batches_processed}`);
      console.log(`  Memory usage: ${(metrics.memoryPeak / 1024 / 1024).toFixed(2)}MB`);
      
      const throughput = missionCount / (metrics.duration / 1000);
      console.log(`Processing throughput: ${throughput.toFixed(2)} missions/second`);
      expect(throughput).toBeGreaterThan(1500); // Should handle at least 1500 missions/sec
    });
  });

  describe('Large Checkpoint Handling', () => {
    test('should handle checkpoints with many sorties efficiently', async () => {
      const sortieCount = 100;
      const checkpoint = PerformanceTestDataGenerator.generateCheckpoints(1, 1)[0];
      checkpoint.sorties = Array.from({ length: sortieCount }, (_, i) => ({
        id: `srt-large-${i}`,
        title: `Large Scale Sortie ${i}`,
        status: i % 3 === 0 ? 'completed' : 'in_progress',
        progress: Math.floor(Math.random() * 100),
      }));
      
      const { result, metrics } = await profiler.measureOperation(
        'large_checkpoint_sorties',
        async () => {
          // Simulate processing large checkpoint
          const stats = {
            total_sorties: checkpoint.sorties.length,
            completed_sorties: checkpoint.sorties.filter(s => s.status === 'completed').length,
            in_progress_sorties: checkpoint.sorties.filter(s => s.status === 'in_progress').length,
            average_progress: checkpoint.sorties.reduce((sum, s) => sum + s.progress, 0) / checkpoint.sorties.length,
            progress_distribution: checkpoint.sorties.reduce((dist, s) => {
              const range = Math.floor(s.progress / 25) * 25;
              const key = `${range}-${range + 24}%`;
              dist[key] = (dist[key] || 0) + 1;
              return dist;
            }, {} as Record<string, number>)
          };
          
          return stats;
        }
      );

      expect(metrics.duration).toBeLessThan(20); // Should complete in < 20ms
      expect(result.total_sorties).toBe(sortieCount);
      
      console.log(`Large checkpoint (${sortieCount} sorties): ${metrics.duration.toFixed(2)}ms`);
      console.log(`  Completed: ${result.completed_sorties}, In Progress: ${result.in_progress_sorties}`);
      console.log(`  Progress distribution:`, result.progress_distribution);
    });

    test('should handle checkpoints with many locks efficiently', async () => {
      const lockCount = 50;
      const checkpoint = PerformanceTestDataGenerator.generateCheckpoints(1, 1)[0];
      checkpoint.active_locks = Array.from({ length: lockCount }, (_, i) => ({
        id: `lock-large-${i}`,
        file: `/src/large-component-${i}.ts`,
        held_by: `specialist-${i % 10}`,
        acquired_at: new Date(Date.now() - (i * 10000)).toISOString(),
        timeout_ms: 300000,
      }));
      
      const { result, metrics } = await profiler.measureOperation(
        'large_checkpoint_locks',
        async () => {
          // Simulate lock analysis
          const now = Date.now();
          const lockStats = checkpoint.active_locks.map(lock => ({
            id: lock.id,
            file: lock.file,
            held_by: lock.held_by,
            age_ms: now - new Date(lock.acquired_at).getTime(),
            time_remaining_ms: lock.timeout_ms - (now - new Date(lock.acquired_at).getTime())
          }));
          
          const grouped = lockStats.reduce((acc, lock) => {
            if (!acc[lock.held_by]) {
              acc[lock.held_by] = 0;
            }
            acc[lock.held_by]++;
            return acc;
          }, {} as Record<string, number>);
          
          return {
            total_locks: lockStats.length,
            expired_locks: lockStats.filter(l => l.time_remaining_ms <= 0).length,
            locks_by_specialist: grouped,
            average_age_ms: lockStats.reduce((sum, l) => sum + l.age_ms, 0) / lockStats.length
          };
        }
      );

      expect(metrics.duration).toBeLessThan(15); // Should complete in < 15ms
      expect(result.total_locks).toBe(lockCount);
      
      console.log(`Large checkpoint (${lockCount} locks): ${metrics.duration.toFixed(2)}ms`);
      console.log(`  Expired: ${result.expired_locks}`);
      console.log(`  Average age: ${(result.average_age_ms / 1000).toFixed(2)}s`);
      console.log(`  Locks by specialist:`, result.locks_by_specialist);
    });

    test('should handle checkpoints with many messages efficiently', async () => {
      const messageCount = 200;
      const checkpoint = PerformanceTestDataGenerator.generateCheckpoints(1, 1)[0];
      checkpoint.pending_messages = Array.from({ length: messageCount }, (_, i) => ({
        id: `msg-large-${i}`,
        type: ['task_assigned', 'status_update', 'error', 'warning'][Math.floor(Math.random() * 4)],
        delivered: Math.random() > 0.4,
        timestamp: new Date(Date.now() - (i * 5000)).toISOString(),
      }));
      
      const { result, metrics } = await profiler.measureOperation(
        'large_checkpoint_messages',
        async () => {
          // Simulate message processing
          const messageStats = {
            total_messages: checkpoint.pending_messages.length,
            delivered_messages: checkpoint.pending_messages.filter(m => m.delivered).length,
            pending_messages: checkpoint.pending_messages.filter(m => !m.delivered).length,
            message_types: checkpoint.pending_messages.reduce((acc, m) => {
              acc[m.type] = (acc[m.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            age_distribution: checkpoint.pending_messages.reduce((dist, m) => {
              const age = (Date.now() - new Date(m.timestamp).getTime()) / (1000 * 60); // minutes
              const key = age < 5 ? '<5m' : age < 30 ? '5-30m' : age < 120 ? '30m-2h' : '>2h';
              dist[key] = (dist[key] || 0) + 1;
              return dist;
            }, {} as Record<string, number>)
          };
          
          return messageStats;
        }
      );

      expect(metrics.duration).toBeLessThan(25); // Should complete in < 25ms
      expect(result.total_messages).toBe(messageCount);
      
      console.log(`Large checkpoint (${messageCount} messages): ${metrics.duration.toFixed(2)}ms`);
      console.log(`  Delivered: ${result.delivered_messages}, Pending: ${result.pending_messages}`);
      console.log(`  Message types:`, result.message_types);
      console.log(`  Age distribution:`, result.age_distribution);
    });
  });

  describe('Concurrent Scalability Testing', () => {
    test('should handle concurrent mission processing', async () => {
      const missionCount = 500;
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(missionCount, 2);
      
      const loadTestConfig: LoadTestConfig = {
        concurrentOperations: 10,
        duration: 8, // 8 seconds
        rampUpTime: 2,
        operationInterval: 50,
      };

      const loadMetrics = await profiler.runLoadTest(
        'concurrent_mission_processing',
        async () => {
          // Simulate processing a random mission
          const randomMissionId = `msn-perf-${Math.floor(Math.random() * missionCount).toString().padStart(4, '0')}`;
          const missionCheckpoints = checkpoints.filter(cp => cp.mission_id === randomMissionId);
          
          if (missionCheckpoints.length > 0) {
            const stats = {
              mission_id: randomMissionId,
              checkpoint_count: missionCheckpoints.length,
              total_sorties: missionCheckpoints.reduce((sum, cp) => sum + cp.sorties.length, 0),
              total_locks: missionCheckpoints.reduce((sum, cp) => sum + cp.active_locks.length, 0),
              average_progress: missionCheckpoints.reduce((sum, cp) => sum + cp.progress_percent, 0) / missionCheckpoints.length
            };
            return stats;
          }
          
          return null;
        },
        loadTestConfig
      );

      const successfulOps = loadMetrics.filter(m => m.errors.length === 0).length;
      const avgDuration = loadMetrics.reduce((sum, m) => sum + m.duration, 0) / loadMetrics.length;
      const operationsPerSecond = successfulOps / loadTestConfig.duration;

      console.log(`Concurrent mission processing test completed:`);
      console.log(`  Total operations: ${loadMetrics.length}`);
      console.log(`  Successful operations: ${successfulOps}`);
      console.log(`  Average duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Operations/sec: ${operationsPerSecond.toFixed(2)}`);

      expect(avgDuration).toBeLessThan(100); // Average < 100ms
      expect(operationsPerSecond).toBeGreaterThan(20); // At least 20 ops/sec
      expect(successfulOps).toBeGreaterThan(loadMetrics.length * 0.95); // 95% success rate
    });

    test('should handle concurrent checkpoint restoration', async () => {
      const checkpointCount = 100;
      const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(checkpointCount, 1);
      
      const loadTestConfig: LoadTestConfig = {
        concurrentOperations: 5,
        duration: 6, // 6 seconds
        rampUpTime: 1,
        operationInterval: 150,
      };

      const loadMetrics = await profiler.runLoadTest(
        'concurrent_checkpoint_restoration',
        async () => {
          // Simulate checkpoint restoration
          const randomCheckpoint = checkpoints[Math.floor(Math.random() * checkpoints.length)];
          
          // Simulate restoration steps
          const restorationSteps = [
            () => Promise.resolve('validating_checkpoint'),
            () => Promise.resolve('restoring_sorties'),
            () => Promise.resolve('acquiring_locks'),
            () => Promise.resolve('requeuing_messages'),
            () => Promise.resolve('marking_consumed')
          ];
          
          for (const step of restorationSteps) {
            await step();
            // Small delay to simulate work
            await new Promise(resolve => setTimeout(resolve, 5));
          }
          
          return {
            checkpoint_id: randomCheckpoint.id,
            mission_id: randomCheckpoint.mission_id,
            sorties_restored: randomCheckpoint.sorties.length,
            locks_restored: randomCheckpoint.active_locks.length,
            messages_requeued: randomCheckpoint.pending_messages.filter(m => !m.delivered).length
          };
        },
        loadTestConfig
      );

      const successfulOps = loadMetrics.filter(m => m.errors.length === 0).length;
      const avgDuration = loadMetrics.reduce((sum, m) => sum + m.duration, 0) / loadMetrics.length;
      const operationsPerSecond = successfulOps / loadTestConfig.duration;

      console.log(`Concurrent checkpoint restoration test completed:`);
      console.log(`  Total operations: ${loadMetrics.length}`);
      console.log(`  Successful operations: ${successfulOps}`);
      console.log(`  Average duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Operations/sec: ${operationsPerSecond.toFixed(2)}`);

      expect(avgDuration).toBeLessThan(200); // Average < 200ms
      expect(operationsPerSecond).toBeGreaterThan(8); // At least 8 ops/sec
      expect(successfulOps).toBeGreaterThan(loadMetrics.length * 0.95); // 95% success rate
    });
  });

  describe('Memory and CPU Scaling Analysis', () => {
    test('should analyze memory usage patterns at scale', async () => {
      const scales = [100, 500, 1000, 2000];
      const memoryResults = [];
      
      for (const missionCount of scales) {
        // Force garbage collection before each test
        if (global.gc) {
          global.gc();
        }
        
        const initialMemory = process.memoryUsage().heapUsed;
        
        const checkpoints = PerformanceTestDataGenerator.generateCheckpoints(missionCount, 1);
        
        const { result, metrics } = await profiler.measureOperation(
          `memory_analysis_${missionCount}_missions`,
          async () => {
            // Simulate memory-intensive processing
            const processedData = checkpoints.map(cp => ({
              id: cp.id,
              mission_id: cp.mission_id,
              processed_at: new Date().toISOString(),
              // Create some additional data to increase memory usage
              analysis: {
                sortie_details: cp.sorties.map(s => ({
                  id: s.id,
                  progress_analysis: {
                    completed_percentage: s.progress,
                    remaining_percentage: 100 - s.progress,
                    estimated_completion_time: new Date(Date.now() + (100 - s.progress) * 60000).toISOString()
                  }
                })),
                lock_analysis: cp.active_locks.map(l => ({
                  file: l.file,
                  specialist: l.held_by,
                  lock_duration: Date.now() - new Date(l.acquired_at).getTime(),
                  expiration_risk: (Date.now() - new Date(l.acquired_at).getTime()) / l.timeout_ms > 0.8
                }))
              }
            }));
            
            return processedData.length;
          }
        );
        
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;
        
        memoryResults.push({
          mission_count: missionCount,
          memory_increase_bytes: memoryIncrease,
          memory_increase_mb: memoryIncrease / 1024 / 1024,
          memory_per_mission_bytes: memoryIncrease / missionCount,
          processing_time_ms: metrics.duration
        });
      }
      
      console.log(`Memory usage analysis across scales:`);
      memoryResults.forEach(result => {
        console.log(`  ${result.mission_count} missions: ${result.memory_increase_mb.toFixed(2)}MB total, ${(result.memory_per_mission_bytes).toFixed(0)}B/mission, ${result.processing_time_ms.toFixed(2)}ms`);
      });
      
      // Check for linear scaling (should not be exponential)
      const lastResult = memoryResults[memoryResults.length - 1];
      const firstResult = memoryResults[0];
      const scalingFactor = lastResult.mission_count / firstResult.mission_count;
      const memoryScalingFactor = lastResult.memory_increase_mb / firstResult.memory_increase_mb;
      
      console.log(`Scaling analysis:`);
      console.log(`  Scale factor: ${scalingFactor}x`);
      console.log(`  Memory scaling factor: ${memoryScalingFactor.toFixed(2)}x`);
      
      // Memory scaling should be reasonable (not more than 2x the data scaling)
      expect(memoryScalingFactor).toBeLessThan(scalingFactor * 2);
    });

    test('should handle CPU-intensive operations efficiently', async () => {
      const dataSizes = [1000, 5000, 10000];
      const cpuResults = [];
      
      for (const dataSize of dataSizes) {
        const { result, metrics } = await profiler.measureOperation(
          `cpu_intensive_${dataSize}_items`,
          async () => {
            // Simulate CPU-intensive operations
            const data = PerformanceTestDataGenerator.generateEvents(dataSize);
            
            // Complex transformations
            const transformed = data.map(event => ({
              ...event,
              processed_at: Date.now(),
              hash_value: simpleHash(event.id + event.stream_id),
              category: categorizeEvent(event.event_type),
              time_bucket: getTimeBucket(new Date(event.occurred_at))
            }));
            
            // Aggregations
            const aggregated = transformed.reduce((acc, item) => {
              if (!acc[item.category]) {
                acc[item.category] = { count: 0, latest_timestamp: null };
              }
              acc[item.category].count++;
              if (!acc[item.category].latest_timestamp || item.occurred_at > acc[item.category].latest_timestamp) {
                acc[item.category].latest_timestamp = item.occurred_at;
              }
              return acc;
            }, {} as Record<string, { count: number; latest_timestamp: string | null }>);
            
            return {
              total_processed: transformed.length,
              categories_found: Object.keys(aggregated).length,
              aggregation_results: aggregated
            };
          }
        );
        
        cpuResults.push({
          data_size: dataSize,
          processing_time_ms: metrics.duration,
          throughput: dataSize / (metrics.duration / 1000),
          memory_usage_mb: metrics.memoryPeak / 1024 / 1024
        });
      }
      
      console.log(`CPU performance analysis:`);
      cpuResults.forEach(result => {
        console.log(`  ${result.data_size} items: ${result.processing_time_ms.toFixed(2)}ms, ${result.throughput.toFixed(2)} items/sec, ${result.memory_usage_mb.toFixed(2)}MB`);
      });
      
      // CPU performance should scale reasonably
      const lastResult = cpuResults[cpuResults.length - 1];
      expect(lastResult.throughput).toBeGreaterThan(10000); // Should handle at least 10k items/sec
    });
  });
});

// Helper functions for CPU-intensive tests
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function categorizeEvent(eventType: string): string {
  if (eventType.includes('mission')) return 'mission';
  if (eventType.includes('sortie')) return 'sortie';
  if (eventType.includes('checkpoint')) return 'checkpoint';
  if (eventType.includes('error')) return 'error';
  return 'other';
}

function getTimeBucket(date: Date): string {
  const hour = date.getHours();
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}