/**
 * Integration Tests for Enhanced Agent Features
 * 
 * Tests real task execution, progress tracking, heartbeat monitoring, and resource usage
 */

import { AgentSpawner, AgentType } from './src/coordination/agent-spawner.js';
import { ProgressTracker } from './src/coordination/progress-tracker.js';

const API_BASE = 'http://localhost:3001';

interface TestResult {
  passed: boolean;
  message: string;
  details?: any;
}

class EnhancedAgentTester {
  private spawner: AgentSpawner;
  private progressTracker: ProgressTracker;

  constructor() {
    this.spawner = new AgentSpawner();
    this.progressTracker = new ProgressTracker();
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Enhanced Agent Tests');
    console.log('='.repeat(60));

    const tests = [
      this.testAgentSpawnWithRealTask.bind(this),
      this.testProgressTracking.bind(this),
      this.testHeartbeatMonitoring.bind(this),
      this.testResourceMonitoring.bind(this),
      this.testAgentSpecialization.bind(this),
      this.testAutomaticRecovery.bind(this),
      this.testSystemHealth.bind(this)
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        const result = await test();
        if (result.passed) {
          console.log(`✅ ${result.message}`);
          if (result.details) {
            console.log(`   Details:`, result.details);
          }
          passed++;
        } else {
          console.log(`❌ ${result.message}`);
          if (result.details) {
            console.log(`   Error:`, result.details);
          }
          failed++;
        }
      } catch (error: any) {
        console.log(`❌ Test failed: ${error.message}`);
        failed++;
      }
      console.log('');
    }

    console.log('='.repeat(60));
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    
    // Cleanup
    await this.cleanup();
  }

  private async testAgentSpawnWithRealTask(): Promise<TestResult> {
    console.log('Testing agent spawn with real task execution...');

    try {
      const spawnRequest = {
        type: AgentType.FRONTEND,
        task: 'Create new UserCard component with TypeScript',
        config: { timeout: 60000 }
      };

      const agent = await this.spawner.spawn(spawnRequest);
      
      // Wait a moment for agent to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check agent status
      const monitor = await this.spawner.monitor(agent.id);
      
      if (agent.status === 'running' || agent.status === 'spawning') {
        return {
          passed: true,
          message: 'Agent spawned successfully with real task',
          details: {
            agentId: agent.id,
            type: agent.type,
            task: spawnRequest.task,
            status: monitor.status,
            pid: agent.pid
          }
        };
      } else {
        return {
          passed: false,
          message: 'Agent failed to start properly',
          details: { status: agent.status }
        };
      }
    } catch (error: any) {
      return {
        passed: false,
        message: 'Failed to spawn agent with real task',
        details: error.message
      };
    }
  }

  private async testProgressTracking(): Promise<TestResult> {
    console.log('Testing real-time progress tracking...');

    try {
      // Start a mission
      const missionId = await this.progressTracker.startMission({
        title: 'Test Mission',
        description: 'Testing progress tracking',
        status: 'planned' as any,
        tasks: ['task1', 'task2'],
        metadata: { test: true }
      });

      // Simulate progress updates
      await this.progressTracker.updateProgress({
        missionId,
        agentId: 'test-agent',
        progress: 25,
        message: 'Analysis completed',
        timestamp: new Date().toISOString()
      });

      await this.progressTracker.updateProgress({
        missionId,
        agentId: 'test-agent',
        progress: 50,
        message: 'Implementation in progress',
        timestamp: new Date().toISOString()
      });

      // Check mission status
      const mission = await this.progressTracker.getMission(missionId);
      
      if (mission && mission.progress === 50) {
        return {
          passed: true,
          message: 'Progress tracking working correctly',
          details: {
            missionId,
            progress: mission.progress,
            updates: await this.progressTracker.getProgressHistory(missionId)
          }
        };
      } else {
        return {
          passed: false,
          message: 'Progress tracking not working as expected',
          details: { mission }
        };
      }
    } catch (error: any) {
      return {
        passed: false,
        message: 'Progress tracking test failed',
        details: error.message
      };
    }
  }

  private async testHeartbeatMonitoring(): Promise<TestResult> {
    console.log('Testing heartbeat monitoring...');

    try {
      // Spawn an agent
      const agent = await this.spawner.spawn({
        type: AgentType.BACKEND,
        task: 'Test heartbeat monitoring',
        config: { timeout: 30000 }
      });

      // Wait for initial heartbeat
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Update heartbeat manually
      await this.spawner.updateHeartbeat(agent.id);

      // Check heartbeat status
      const health = await this.spawner.getAgentHealth(agent.id);
      
      const hasRecentHeartbeat = health.lastHeartbeat && 
        (Date.now() - new Date(health.lastHeartbeat).getTime() < 60000);

      return {
        passed: hasRecentHeartbeat || false,
        message: hasRecentHeartbeat ? 'Heartbeat monitoring working' : 'No recent heartbeat detected',
        details: {
          agentId: agent.id,
          lastHeartbeat: health.lastHeartbeat,
          isHealthy: health.isHealthy
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        message: 'Heartbeat monitoring test failed',
        details: error.message
      };
    }
  }

  private async testResourceMonitoring(): Promise<TestResult> {
    console.log('Testing resource monitoring...');

    try {
      // Spawn an agent
      const agent = await this.spawner.spawn({
        type: AgentType.PERFORMANCE,
        task: 'Test resource monitoring',
        config: { timeout: 30000 }
      });

      // Wait for resource data collection
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Get resource usage
      const monitor = await this.spawner.monitor(agent.id);
      
      const hasResourceData = monitor.resourceUsage && 
        typeof monitor.resourceUsage.memory === 'number' && 
        typeof monitor.resourceUsage.cpu === 'number';

      if (hasResourceData) {
        // Get resource history
        const history = await this.spawner.getResourceHistory(agent.id);
        const trends = await this.spawner.getResourceTrends(agent.id);

        return {
          passed: true,
          message: 'Resource monitoring working',
          details: {
            currentUsage: monitor.resourceUsage,
            historyPoints: history.length,
            avgCpu: trends.avgCpu,
            avgMemory: trends.avgMemory
          }
        };
      } else {
        return {
          passed: false,
          message: 'Resource data not available',
          details: { monitor }
        };
      }
    } catch (error: any) {
      return {
        passed: false,
        message: 'Resource monitoring test failed',
        details: error.message
      };
    }
  }

  private async testAgentSpecialization(): Promise<TestResult> {
    console.log('Testing agent specialization...');

    const agentTypes = [
      AgentType.FRONTEND,
      AgentType.BACKEND,
      AgentType.TESTING,
      AgentType.DOCUMENTATION,
      AgentType.SECURITY,
      AgentType.PERFORMANCE
    ];

    const results: any[] = [];

    for (const type of agentTypes) {
      try {
        const agent = await this.spawner.spawn({
          type,
          task: `Test ${type} agent specialization`,
          config: { timeout: 20000 }
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        const monitor = await this.spawner.monitor(agent.id);
        
        results.push({
          type,
          spawned: true,
          running: monitor.status === 'running',
          agentId: agent.id
        });

        // Cleanup
        await this.spawner.terminate(agent.id, true);
        
      } catch (error: any) {
        results.push({
          type,
          spawned: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.spawned && r.running).length;
    const allSuccessful = successCount === agentTypes.length;

    return {
      passed: allSuccessful,
      message: allSuccessful ? 'All agent types working' : 'Some agent types failed',
      details: {
        successCount: `${successCount}/${agentTypes.length}`,
        results
      }
    };
  }

  private async testAutomaticRecovery(): Promise<TestResult> {
    console.log('Testing automatic recovery...');

    try {
      // Spawn an agent
      const agent = await this.spawner.spawn({
        type: AgentType.BACKEND,
        task: 'Test automatic recovery',
        config: { timeout: 30000 }
      });

      // Wait for it to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Manually kill the process to simulate failure
      if (agent.pid) {
        process.kill(agent.pid, 'SIGKILL');
      }

      // Wait for recovery detection
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check if recovery was attempted
      const updatedAgent = this.spawner.getAgent(agent.id);
      const hasRecoveryAttempt = updatedAgent?.metadata?.recoveryAttempts > 0;

      return {
        passed: hasRecoveryAttempt,
        message: hasRecoveryAttempt ? 'Automatic recovery triggered' : 'Recovery not triggered',
        details: {
          agentId: agent.id,
          recoveryAttempts: updatedAgent?.metadata?.recoveryAttempts || 0,
          lastRecoveryAttempt: updatedAgent?.metadata?.lastRecoveryAttempt
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        message: 'Automatic recovery test failed',
        details: error.message
      };
    }
  }

  private async testSystemHealth(): Promise<TestResult> {
    console.log('Testing system health monitoring...');

    try {
      const systemHealth = await this.spawner.getSystemHealth();
      
      const hasRequiredFields = typeof systemHealth.totalAgents === 'number' &&
        typeof systemHealth.healthyAgents === 'number' &&
        typeof systemHealth.unhealthyAgents === 'number' &&
        ['healthy', 'degraded', 'critical'].includes(systemHealth.overallHealth);

      return {
        passed: hasRequiredFields,
        message: hasRequiredFields ? 'System health monitoring working' : 'Missing health data',
        details: systemHealth
      };
    } catch (error: any) {
      return {
        passed: false,
        message: 'System health test failed',
        details: error.message
      };
    }
  }

  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test agents...');
    
    const activeAgents = this.spawner.getActiveAgents();
    
    for (const agent of activeAgents) {
      try {
        await this.spawner.terminate(agent.id, true);
      } catch (error) {
        console.warn(`Failed to cleanup agent ${agent.id}:`, error);
      }
    }

    await this.progressTracker.close();
    
    if (this.spawner.cleanup) {
      this.spawner.cleanup();
    }

    console.log('✓ Cleanup completed');
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  const tester = new EnhancedAgentTester();
  tester.runAllTests().catch(console.error);
}

export { EnhancedAgentTester };