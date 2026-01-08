
import { writeFileSync, mkdirSync, existsSync, unlinkSync, statSync } from 'fs';
import { join, basename } from 'path';
import { tmpdir } from 'os';

interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryPeak: number;
  cpuUsage?: NodeJS.CpuUsage;
  throughput?: number;
  errors?: string[];
}

interface PerformanceReport {
  timestamp: string;
  systemInfo: {
    nodeVersion: string;
    platform: string;
    arch: string;
    totalMemory: number;
    freeMemory: number;
  };
  results: PerformanceMetrics[];
  summary: {
    totalOperations: number;
    totalDuration: number;
    averageDuration: number;
    peakMemoryUsage: number;
    errorsEncountered: number;
  };
}

interface LoadTestConfig {
  concurrentOperations: number;
  duration: number; // in seconds
  rampUpTime: number; // in seconds
  operationInterval: number; // in milliseconds
}

class PerformanceProfiler {
  private metrics: PerformanceMetrics[] = [];
  private memoryMonitorInterval?: NodeJS.Timeout;
  private peakMemory: number = 0;
  private isMonitoring: boolean = false;

  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return usage.heapUsed + usage.external;
  }

  private startMemoryMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.peakMemory = this.getMemoryUsage();
    
    this.memoryMonitorInterval = setInterval(() => {
      const current = this.getMemoryUsage();
      if (current > this.peakMemory) {
        this.peakMemory = current;
      }
    }, 100); 
  }

  private stopMemoryMonitoring(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = undefined;
    }
    this.isMonitoring = false;
  }

  async measureOperation<T>(
    operation: string,
    fn: () => Promise<T> | T
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = performance.now();
    const memoryBefore = this.getMemoryUsage();
    const cpuBefore = process.cpuUsage();

    this.startMemoryMonitoring();

    try {
      const result = await fn();
      
      const cpuAfter = process.cpuUsage(cpuBefore);
      const endTime = performance.now();
      const memoryAfter = this.getMemoryUsage();
      
      this.stopMemoryMonitoring();

      const metrics: PerformanceMetrics = {
        operation,
        startTime,
        endTime,
        duration: endTime - startTime,
        memoryBefore,
        memoryAfter: this.peakMemory,
        memoryPeak: this.peakMemory,
        cpuUsage: cpuAfter,
        errors: []
      };

      this.metrics.push(metrics);
      return { result, metrics };
    } catch (error) {
      this.stopMemoryMonitoring();
      
      const endTime = performance.now();
      const metrics: PerformanceMetrics = {
        operation,
        startTime,
        endTime,
        duration: endTime - startTime,
        memoryBefore,
        memoryAfter: this.getMemoryUsage(),
        memoryPeak: this.peakMemory,
        errors: [error instanceof Error ? error.message : String(error)]
      };

      this.metrics.push(metrics);
      throw error;
    }
  }

  async runLoadTest(
    operationName: string,
    operation: () => Promise<void>,
    config: LoadTestConfig
  ): Promise<PerformanceMetrics[]> {
    const metrics: PerformanceMetrics[] = [];
    const startTime = Date.now();
    
    console.log(`Starting load test: ${operationName}`);
    console.log(`Concurrent operations: ${config.concurrentOperations}`);
    console.log(`Duration: ${config.duration}s`);
    console.log(`Ramp-up time: ${config.rampUpTime}s`);

    const promises: Promise<void>[] = [];
    let completedOperations = 0;
    let totalOperations = 0;

    const createRunner = async (delay: number): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      while (Date.now() - startTime < config.duration * 1000) {
        const start = performance.now();
        const memBefore = this.getMemoryUsage();
        
        try {
          await operation();
          completedOperations++;
        } catch (error) {
          console.error(`Load test operation failed:`, error);
        }

        const end = performance.now();
        totalOperations++;

        metrics.push({
          operation: `${operationName}_load`,
          startTime: start,
          endTime: end,
          duration: end - start,
          memoryBefore: memBefore,
          memoryAfter: this.getMemoryUsage(),
          memoryPeak: this.getMemoryUsage(),
          errors: []
        });

        if (config.operationInterval > 0) {
          await new Promise(resolve => setTimeout(resolve, config.operationInterval));
        }
      }
    };

    const rampUpDelay = (config.rampUpTime * 1000) / config.concurrentOperations;
    for (let i = 0; i < config.concurrentOperations; i++) {
      promises.push(createRunner(i * rampUpDelay));
    }

    await Promise.all(promises);

    console.log(`Load test completed: ${completedOperations}/${totalOperations} operations successful`);
    return metrics;
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getReport(): PerformanceReport {
    const totalOperations = this.metrics.length;
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalDuration / totalOperations;
    const peakMemoryUsage = Math.max(...this.metrics.map(m => m.memoryPeak));
    const errorsEncountered = this.metrics.filter(m => m.errors && m.errors.length > 0).length;

    return {
      timestamp: new Date().toISOString(),
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        totalMemory: require('os').totalmem(),
        freeMemory: require('os').freemem(),
      },
      results: this.metrics,
      summary: {
        totalOperations,
        totalDuration,
        averageDuration,
        peakMemoryUsage,
        errorsEncountered,
      }
    };
  }

  reset(): void {
    this.metrics = [];
    this.peakMemory = 0;
  }

  exportReport(filePath: string): void {
    const report = this.getReport();
    writeFileSync(filePath, JSON.stringify(report, null, 2));
  }
}

class PerformanceTestDataGenerator {
  static generateMissions(count: number): Array<{
    id: string;
    title: string;
    status: string;
    created_at: string;
    updated_at: string;
  }> {
    const missions: Array<{
      id: string;
      title: string;
      status: string;
      created_at: string;
      updated_at: string;
    }> = [];
    for (let i = 0; i < count; i++) {
      missions.push({
        id: `msn-perf-${i.toString().padStart(4, '0')}`,
        title: `Performance Test Mission ${i + 1}`,
        status: i % 3 === 0 ? 'completed' : 'in_progress',
        created_at: new Date(Date.now() - (i * 60000)).toISOString(),
        updated_at: new Date(Date.now() - (i * 30000)).toISOString(),
      });
    }
    return missions;
  }

  static generateCheckpoints(missionCount: number, checkpointsPerMission: number): Array<{
    id: string;
    mission_id: string;
    timestamp: string;
    progress_percent: number;
    sorties: Array<{
      id: string;
      title: string;
      status: string;
      progress: number;
    }>;
    active_locks: Array<{
      id: string;
      file: string;
      held_by: string;
      acquired_at: string;
      timeout_ms: number;
    }>;
    pending_messages: Array<{
      id: string;
      type: string;
      delivered: boolean;
      timestamp: string;
    }>;
  }> {
    const checkpoints: Array<{
      id: string;
      mission_id: string;
      timestamp: string;
      progress_percent: number;
      sorties: Array<{
        id: string;
        title: string;
        status: string;
        progress: number;
      }>;
      active_locks: Array<{
        id: string;
        file: string;
        held_by: string;
        acquired_at: string;
        timeout_ms: number;
      }>;
      pending_messages: Array<{
        id: string;
        type: string;
        delivered: boolean;
        timestamp: string;
      }>;
    }> = [];
    
    for (let m = 0; m < missionCount; m++) {
      const missionId = `msn-perf-${m.toString().padStart(4, '0')}`;
      
      for (let c = 0; c < checkpointsPerMission; c++) {
        const sorties: Array<{
          id: string;
          title: string;
          status: string;
          progress: number;
        }> = [];
        const locks: Array<{
          id: string;
          file: string;
          held_by: string;
          acquired_at: string;
          timeout_ms: number;
        }> = [];
        const messages: Array<{
          id: string;
          type: string;
          delivered: boolean;
          timestamp: string;
        }> = [];
        
        const sortieCount = Math.floor(Math.random() * 10) + 5;
        for (let s = 0; s < sortieCount; s++) {
          sorties.push({
            id: `srt-${m}-${c}-${s}`,
            title: `Sortie ${s + 1} for Mission ${m}`,
            status: Math.random() > 0.3 ? 'completed' : 'in_progress',
            progress: Math.floor(Math.random() * 100),
          });
        }
        
        const lockCount = Math.floor(Math.random() * 5) + 1;
        for (let l = 0; l < lockCount; l++) {
          locks.push({
            id: `lock-${m}-${c}-${l}`,
            file: `/src/component-${l}.ts`,
            held_by: `specialist-${l}`,
            acquired_at: new Date(Date.now() - (l * 100000)).toISOString(),
            timeout_ms: 300000,
          });
        }
        
        const messageCount = Math.floor(Math.random() * 8) + 2;
        for (let msg = 0; msg < messageCount; msg++) {
          messages.push({
            id: `msg-${m}-${c}-${msg}`,
            type: ['task_assigned', 'status_update', 'error'][Math.floor(Math.random() * 3)],
            delivered: Math.random() > 0.3,
            timestamp: new Date(Date.now() - (msg * 50000)).toISOString(),
          });
        }
        
        checkpoints.push({
          id: `chk-${m}-${c}`,
          mission_id: missionId,
          timestamp: new Date(Date.now() - (c * 600000)).toISOString(),
          progress_percent: Math.floor((c + 1) * (100 / checkpointsPerMission)),
          sorties,
          active_locks: locks,
          pending_messages: messages,
        });
      }
    }
    
    return checkpoints;
  }

  static generateEvents(count: number): Array<{
    id: string;
    event_type: string;
    stream_type: string;
    stream_id: string;
    occurred_at: string;
    data: any;
  }> {
    const events: Array<{
      id: string;
      event_type: string;
      stream_type: string;
      stream_id: string;
      occurred_at: string;
      data: any;
    }> = [];
    for (let i = 0; i < count; i++) {
      events.push({
        id: `evt-perf-${i.toString().padStart(6, '0')}`,
        event_type: ['mission_started', 'mission_updated', 'sortie_completed', 'checkpoint_created'][Math.floor(Math.random() * 4)],
        stream_type: 'mission',
        stream_id: `msn-perf-${(i % 100).toString().padStart(4, '0')}`,
        occurred_at: new Date(Date.now() - (i * 1000)).toISOString(),
        data: {
          performance_test: true,
          iteration: i,
          payload: `x`.repeat(100), // Small payload
        },
      });
    }
    return events;
  }
}

export { 
  PerformanceProfiler, 
  PerformanceTestDataGenerator,
  type PerformanceMetrics,
  type PerformanceReport,
  type LoadTestConfig,
};