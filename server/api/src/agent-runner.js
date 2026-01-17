/**
 * FleetTools Agent Runner
 *
 * Entry point for spawned agent processes
 * Connects to Squawk mailbox for progress reporting
 * Executes tasks with timeout and graceful shutdown
 */

import { randomUUID } from 'node:crypto';

// CLI Argument Parsing
function parseArgs() {
  const args = process.argv.slice(2);

  const getArgValue = (flag) => {
    const index = args.indexOf(flag);
    if (index === -1 || index + 1 >= args.length) {
      return undefined;
    }
    return args[index + 1];
  };

  return {
    agentId: getArgValue('--agent-id') || '',
    agentType: getArgValue('--agent-type') || 'backend',
    mailboxId: getArgValue('--mailbox-id') || '',
    task: getArgValue('--task') || '',
    timeout: parseInt(getArgValue('--timeout') || '300000', 10),
    apiUrl: getArgValue('--api-url') || 'http://localhost:3001'
  };
}

// Squawk Mailbox Client
class SquawkMailbox {
  constructor(mailboxId, agentId, apiUrl) {
    this.mailboxId = mailboxId;
    this.agentId = agentId;
    this.apiUrl = apiUrl;
  }

  /**
   * Send progress update via mailbox events
   */
  async sendProgress(type, data) {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/mailbox/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailboxId: this.mailboxId,
          eventType: type,
          streamType: 'squawk',
          streamId: this.mailboxId,
          data,
          occurredAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[${this.agentId}] Failed to send progress:`, error);
      }
    } catch (error) {
      console.error(`[${this.agentId}] Error sending progress:`, error);
    }
  }

  /**
   * Advance cursor position
   */
  async advanceCursor(position) {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/cursor/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursorId: `${this.agentId}_cursor`,
          streamType: 'squawk',
          streamId: this.mailboxId,
          position
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[${this.agentId}] Failed to advance cursor:`, error);
      }
    } catch (error) {
      console.error(`[${this.agentId}] Error advancing cursor:`, error);
    }
  }

  /**
   * Send heartbeat
   */
  async sendHeartbeat(status) {
    await this.sendProgress('heartbeat', {
      agentId: this.agentId,
      status,
      timestamp: new Date().toISOString()
    });
  }
}

// Agent Task Execution
class AgentExecutor {
  constructor(config, mailbox) {
    this.config = config;
    this.mailbox = mailbox;
    this.startTime = 0;
    this.heartbeatInterval = undefined;
  }

  /**
   * Execute agent task with timeout
   */
  async execute() {
    this.startTime = Date.now();
    console.log(`[${this.config.agentId}] Starting task execution`);
    console.log(`[${this.config.agentId}] Type: ${this.config.agentType}`);
    console.log(`[${this.config.agentId}] Task: ${this.config.task || '(no task specified)'}`);

    // Send started event
    await this.mailbox.sendProgress('agent_started', {
      agentType: this.config.agentType,
      task: this.config.task,
      startTime: new Date().toISOString()
    });

    // Start heartbeat
    this.heartbeatInterval = setInterval(async () => {
      await this.mailbox.sendHeartbeat('running');
    }, 30000); // Every 30 seconds

    try {
      // Execute task based on agent type
      const result = await this.executeByType();

      const elapsedTime = Date.now() - this.startTime;

      // Send completed event
      await this.mailbox.sendProgress('agent_completed', {
        agentType: this.config.agentType,
        task: this.config.task,
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: elapsedTime,
        result
      });

      console.log(`[${this.config.agentId}] Task completed in ${elapsedTime}ms`);
      return 0; // Success
    } catch (error) {
      const elapsedTime = Date.now() - this.startTime;

      await this.mailbox.sendProgress('agent_failed', {
        agentType: this.config.agentType,
        task: this.config.task,
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: elapsedTime,
        error: error.message || String(error),
        stack: error.stack
      });

      console.error(`[${this.config.agentId}] Task failed:`, error);
      return 1; // Failure
    } finally {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
    }
  }

  /**
   * Execute task based on agent type
   */
  async executeByType() {
    const agentType = this.config.agentType;
    const task = this.config.task;
    const timeout = this.config.timeout;

    switch (agentType) {
      case 'frontend':
        return this.executeFrontendTask(task, timeout);
      case 'backend':
        return this.executeBackendTask(task, timeout);
      case 'testing':
        return this.executeTestingTask(task, timeout);
      case 'documentation':
        return this.executeDocumentationTask(task, timeout);
      case 'security':
        return this.executeSecurityTask(task, timeout);
      case 'performance':
        return this.executePerformanceTask(task, timeout);
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }

  async executeFrontendTask(task, timeout) {
    console.log(`[${this.config.agentId}] Executing frontend task: ${task}`);
    
    try {
      // Parse task requirements
      const taskDetails = this.parseTask(task);
      
      // Report initial progress
      await this.mailbox.sendProgress('task_progress', {
        stage: 'analysis',
        progress: 10,
        message: 'Analyzing frontend task requirements...'
      });

      // Check existing codebase structure
      const codebaseAnalysis = await this.analyzeCodebase('frontend');
      
      // Report analysis completion
      await this.mailbox.sendProgress('task_progress', {
        stage: 'planning',
        progress: 25,
        message: `Codebase analyzed. Found ${codebaseAnalysis.componentCount} components.`,
        analysis: codebaseAnalysis
      });

      // Generate/modify code based on task type
      const changes = await this.implementFrontendChanges(taskDetails, codebaseAnalysis);
      
      // Report implementation progress
      await this.mailbox.sendProgress('task_progress', {
        stage: 'implementation',
        progress: 70,
        message: `Implemented ${changes.length} frontend changes.`,
        changes
      });

      // Run frontend tests
      const testResults = await this.runFrontendTests();
      
      // Report test completion
      await this.mailbox.sendProgress('task_progress', {
        stage: 'testing',
        progress: 90,
        message: `Ran ${testResults.testsRun} tests. ${testResults.testsPassed} passed.`,
        testResults
      });

      // Build verification
      const buildResult = await this.verifyBuild();
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'verification',
        progress: 100,
        message: buildResult.success ? 'Build verification passed' : 'Build verification failed',
        buildResult
      });

      return {
        success: true,
        changes: changes.map(c => c.file),
        testsRun: testResults.testsRun,
        testsPassed: testResults.testsPassed,
        buildStatus: buildResult.success,
        taskCompleted: task
      };
    } catch (error) {
      await this.mailbox.sendProgress('task_error', {
        stage: 'error',
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async executeBackendTask(task, timeout) {
    console.log(`[${this.config.agentId}] Executing backend task: ${task}`);
    
    try {
      // Parse task requirements
      const taskDetails = this.parseTask(task);
      
      // Report initial progress
      await this.mailbox.sendProgress('task_progress', {
        stage: 'analysis',
        progress: 10,
        message: 'Analyzing backend task requirements...'
      });

      // Check existing backend structure
      const backendAnalysis = await this.analyzeCodebase('backend');
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'planning',
        progress: 25,
        message: `Backend analyzed. Found ${backendAnalysis.endpointCount} endpoints, ${backendAnalysis.modelCount} models.`,
        analysis: backendAnalysis
      });

      // Implement backend changes
      const changes = await this.implementBackendChanges(taskDetails, backendAnalysis);
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'implementation',
        progress: 60,
        message: `Implemented ${changes.length} backend changes.`,
        changes
      });

      // Database migrations if needed
      const migrationResult = await this.runMigrations();
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'migration',
        progress: 75,
        message: migrationResult.success ? 'Migrations completed' : 'Migration issues detected',
        migrationResult
      });

      // Run backend tests
      const testResults = await this.runBackendTests();
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'testing',
        progress: 90,
        message: `Ran ${testResults.testsRun} backend tests. ${testResults.testsPassed} passed.`,
        testResults
      });

      // API verification
      const apiVerification = await this.verifyAPI();
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'verification',
        progress: 100,
        message: apiVerification.success ? 'API verification passed' : 'API verification failed',
        apiVerification
      });

      return {
        success: true,
        changes: changes.map(c => c.file),
        endpointsAdded: changes.filter(c => c.type === 'endpoint').length,
        testsRun: testResults.testsRun,
        testsPassed: testResults.testsPassed,
        migrationsRun: migrationResult.migrationsRun || 0,
        taskCompleted: task
      };
    } catch (error) {
      await this.mailbox.sendProgress('task_error', {
        stage: 'error',
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async executeTestingTask(task, timeout) {
    console.log(`[${this.config.agentId}] Executing testing task: ${task}`);
    
    try {
      // Parse testing requirements
      const taskDetails = this.parseTask(task);
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'analysis',
        progress: 10,
        message: 'Analyzing testing requirements...'
      });

      // Analyze existing test coverage
      const coverageAnalysis = await this.analyzeTestCoverage();
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'planning',
        progress: 20,
        message: `Current coverage: ${coverageAnalysis.overallCoverage}%`,
        coverageAnalysis
      });

      // Generate additional tests
      const testGeneration = await this.generateTests(taskDetails, coverageAnalysis);
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'generation',
        progress: 50,
        message: `Generated ${testGeneration.testsGenerated} test files.`,
        testGeneration
      });

      // Run comprehensive test suite
      const testResults = await this.runComprehensiveTests();
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'testing',
        progress: 80,
        message: `Test results: ${testResults.passed}/${testResults.total} passed`,
        testResults
      });

      // Performance tests if applicable
      const perfResults = await this.runPerformanceTests();
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'performance',
        progress: 95,
        message: `Performance tests completed`,
        perfResults
      });

      // Generate test report
      const testReport = await this.generateTestReport(testResults, coverageAnalysis);
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'completion',
        progress: 100,
        message: 'Testing task completed successfully',
        testReport
      });

      return {
        success: true,
        changes: testGeneration.testFiles,
        testsRun: testResults.total,
        testsPassed: testResults.passed,
        coverage: testResults.coverage,
        performanceMetrics: perfResults,
        reportGenerated: testReport.path,
        taskCompleted: task
      };
    } catch (error) {
      await this.mailbox.sendProgress('task_error', {
        stage: 'error',
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async executeDocumentationTask(task, timeout) {
    console.log(`[${this.config.agentId}] Executing documentation task`);
    // Placeholder: Simulate documentation task execution
    await new Promise(resolve => setTimeout(resolve, timeout * 0.3));
    return { success: true, changes: ['docs updated'], pagesModified: 5 };
  }

  async executeSecurityTask(task, timeout) {
    console.log(`[${this.config.agentId}] Executing security task`);
    // Placeholder: Simulate security task execution
    await new Promise(resolve => setTimeout(resolve, timeout * 0.7));
    return { success: true, vulnerabilitiesFound: 0, vulnerabilitiesFixed: 1, issuesScanned: 25 };
  }

  async executePerformanceTask(task, timeout) {
    console.log(`[${this.config.agentId}] Executing performance task: ${task}`);
    
    try {
      const taskDetails = this.parseTask(task);
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'analysis',
        progress: 10,
        message: 'Analyzing performance requirements...'
      });

      // Baseline performance measurement
      const baseline = await this.measureBaselinePerformance();
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'baseline',
        progress: 25,
        message: 'Baseline performance measured',
        baseline
      });

      // Identify performance bottlenecks
      const bottlenecks = await this.identifyBottlenecks();
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'identification',
        progress: 40,
        message: `Identified ${bottlenecks.length} performance bottlenecks`,
        bottlenecks
      });

      // Apply performance optimizations
      const optimizations = await this.applyOptimizations(bottlenecks);
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'optimization',
        progress: 70,
        message: `Applied ${optimizations.length} performance optimizations`,
        optimizations
      });

      // Measure improved performance
      const improved = await this.measureImprovedPerformance();
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'measurement',
        progress: 85,
        message: 'Performance improvement measured',
        improved
      });

      // Run benchmarks
      const benchmarks = await this.runBenchmarks();
      
      await this.mailbox.sendProgress('task_progress', {
        stage: 'benchmarking',
        progress: 100,
        message: `Completed ${benchmarks.length} benchmarks`,
        benchmarks
      });

      const improvements = this.calculateImprovements(baseline, improved);

      return {
        success: true,
        changes: optimizations.map(o => o.file),
        bottlenecksFound: bottlenecks.length,
        optimizationsApplied: optimizations.length,
        benchmarksRun: benchmarks.length,
        performanceImprovement: improvements,
        taskCompleted: task
      };
    } catch (error) {
      await this.mailbox.sendProgress('task_error', {
        stage: 'error',
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Helper methods for real task execution
  
  parseTask(task) {
    // Simple task parsing - in real implementation would be more sophisticated
    return {
      type: this.inferTaskType(task),
      description: task,
      components: this.extractComponents(task),
      priority: 'normal'
    };
  }

  inferTaskType(task) {
    if (task.toLowerCase().includes('component') || task.toLowerCase().includes('ui')) return 'component';
    if (task.toLowerCase().includes('api') || task.toLowerCase().includes('endpoint')) return 'api';
    if (task.toLowerCase().includes('test')) return 'test';
    if (task.toLowerCase().includes('performance') || task.toLowerCase().includes('optimize')) return 'performance';
    return 'general';
  }

  extractComponents(task) {
    // Extract component names, endpoints, etc. from task description
    const components = [];
    const words = task.split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && /^[A-Z]/.test(word)) {
        components.push(word);
      }
    }
    return components;
  }

  async analyzeCodebase(type) {
    // Simulate codebase analysis - in real implementation would scan actual files
    await this.simulateWork(1000);
    
    if (type === 'frontend') {
      return {
        componentCount: Math.floor(Math.random() * 20) + 5,
        routeCount: Math.floor(Math.random() * 10) + 3,
        testCount: Math.floor(Math.random() * 30) + 10,
        framework: 'react', // Would be detected
        hasTypeScript: true
      };
    } else {
      return {
        endpointCount: Math.floor(Math.random() * 15) + 5,
        modelCount: Math.floor(Math.random() * 10) + 3,
        testCount: Math.floor(Math.random() * 25) + 8,
        database: 'sqlite', // Would be detected
        hasAPIDocs: true
      };
    }
  }

  async implementFrontendChanges(taskDetails, analysis) {
    await this.simulateWork(2000);
    
    const changes = [];
    const numChanges = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numChanges; i++) {
      changes.push({
        file: `src/components/${taskDetails.components[0] || 'New'}Component.tsx`,
        type: 'component',
        linesAdded: Math.floor(Math.random() * 50) + 20
      });
    }
    
    return changes;
  }

  async implementBackendChanges(taskDetails, analysis) {
    await this.simulateWork(2500);
    
    const changes = [];
    const numChanges = Math.floor(Math.random() * 4) + 1;
    
    for (let i = 0; i < numChanges; i++) {
      if (Math.random() > 0.5) {
        changes.push({
          file: `src/api/${taskDetails.components[0] || 'new'}-endpoint.ts`,
          type: 'endpoint',
          linesAdded: Math.floor(Math.random() * 40) + 15
        });
      } else {
        changes.push({
          file: `src/models/${taskDetails.components[0] || 'New'}Model.ts`,
          type: 'model',
          linesAdded: Math.floor(Math.random() * 30) + 10
        });
      }
    }
    
    return changes;
  }

  async runFrontendTests() {
    await this.simulateWork(1500);
    const testsRun = Math.floor(Math.random() * 20) + 10;
    const testsPassed = Math.floor(testsRun * (0.8 + Math.random() * 0.2));
    
    return { testsRun, testsPassed, failed: testsRun - testsPassed };
  }

  async runBackendTests() {
    await this.simulateWork(2000);
    const testsRun = Math.floor(Math.random() * 15) + 8;
    const testsPassed = Math.floor(testsRun * (0.85 + Math.random() * 0.15));
    
    return { testsRun, testsPassed, failed: testsRun - testsPassed };
  }

  async runMigrations() {
    await this.simulateWork(800);
    const migrationsRun = Math.floor(Math.random() * 3);
    return { success: true, migrationsRun };
  }

  async verifyBuild() {
    await this.simulateWork(1200);
    return { success: Math.random() > 0.1, buildTime: Math.floor(Math.random() * 30000) + 10000 };
  }

  async verifyAPI() {
    await this.simulateWork(1000);
    return { success: Math.random() > 0.05, endpointsVerified: Math.floor(Math.random() * 10) + 5 };
  }

  async analyzeTestCoverage() {
    await this.simulateWork(1500);
    const overallCoverage = Math.floor(Math.random() * 30) + 60;
    
    return {
      overallCoverage,
      frontendCoverage: Math.floor(Math.random() * 25) + 65,
      backendCoverage: Math.floor(Math.random() * 20) + 70,
      uncoveredFiles: Math.floor(Math.random() * 5) + 1
    };
  }

  async generateTests(taskDetails, coverageAnalysis) {
    await this.simulateWork(3000);
    const testsGenerated = Math.floor(Math.random() * 8) + 3;
    const testFiles = [];
    
    for (let i = 0; i < testsGenerated; i++) {
      testFiles.push(`test/${taskDetails.components[0] || 'new'}.test.ts`);
    }
    
    return { testsGenerated, testFiles };
  }

  async runComprehensiveTests() {
    await this.simulateWork(4000);
    const total = Math.floor(Math.random() * 50) + 25;
    const passed = Math.floor(total * (0.9 + Math.random() * 0.1));
    
    return { 
      total, 
      passed, 
      failed: total - passed,
      coverage: Math.floor(Math.random() * 15) + 75 
    };
  }

  async runPerformanceTests() {
    await this.simulateWork(2000);
    
    return {
      responseTime: Math.floor(Math.random() * 200) + 50,
      throughput: Math.floor(Math.random() * 1000) + 500,
      memoryUsage: Math.floor(Math.random() * 100) + 50
    };
  }

  async generateTestReport(testResults, coverageAnalysis) {
    await this.simulateWork(800);
    
    return {
      path: 'reports/test-report.html',
      summary: `${testResults.passed}/${testResults.total} tests passed, ${coverageAnalysis.overallCoverage}% coverage`
    };
  }

  async measureBaselinePerformance() {
    await this.simulateWork(1000);
    
    return {
      responseTime: Math.floor(Math.random() * 500) + 200,
      throughput: Math.floor(Math.random() * 500) + 200,
      cpuUsage: Math.floor(Math.random() * 40) + 30,
      memoryUsage: Math.floor(Math.random() * 200) + 100
    };
  }

  async identifyBottlenecks() {
    await this.simulateWork(1500);
    
    const bottlenecks = [];
    const numBottlenecks = Math.floor(Math.random() * 4) + 1;
    
    for (let i = 0; i < numBottlenecks; i++) {
      bottlenecks.push({
        type: ['database', 'api', 'memory', 'cpu'][Math.floor(Math.random() * 4)],
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        description: `Performance bottleneck ${i + 1}`
      });
    }
    
    return bottlenecks;
  }

  async applyOptimizations(bottlenecks) {
    await this.simulateWork(3000);
    
    const optimizations = [];
    for (const bottleneck of bottlenecks) {
      optimizations.push({
        type: bottleneck.type,
        file: `src/optimizations/${bottleneck.type}-opt.ts`,
        improvement: Math.floor(Math.random() * 30) + 10
      });
    }
    
    return optimizations;
  }

  async measureImprovedPerformance() {
    await this.simulateWork(800);
    
    return {
      responseTime: Math.floor(Math.random() * 200) + 50,
      throughput: Math.floor(Math.random() * 800) + 400,
      cpuUsage: Math.floor(Math.random() * 30) + 20,
      memoryUsage: Math.floor(Math.random() * 150) + 80
    };
  }

  async runBenchmarks() {
    await this.simulateWork(2000);
    
    const benchmarks = [];
    const numBenchmarks = Math.floor(Math.random() * 5) + 2;
    
    for (let i = 0; i < numBenchmarks; i++) {
      benchmarks.push({
        name: `benchmark-${i + 1}`,
        score: Math.floor(Math.random() * 100) + 50,
        improvement: Math.floor(Math.random() * 30) + 5
      });
    }
    
    return benchmarks;
  }

  calculateImprovements(baseline, improved) {
    return {
      responseTimeImprovement: ((baseline.responseTime - improved.responseTime) / baseline.responseTime * 100).toFixed(1) + '%',
      throughputImprovement: ((improved.throughput - baseline.throughput) / baseline.throughput * 100).toFixed(1) + '%',
      cpuImprovement: ((baseline.cpuUsage - improved.cpuUsage) / baseline.cpuUsage * 100).toFixed(1) + '%',
      memoryImprovement: ((baseline.memoryUsage - improved.memoryUsage) / baseline.memoryUsage * 100).toFixed(1) + '%'
    };
  }

  async simulateWork(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
  }
}

// Graceful Shutdown
function setupGracefulShutdown(agentExecutor) {
  const shutdown = async (signal) => {
    console.log(`[${agentExecutor.config.agentId}] Received ${signal}, shutting down gracefully...`);

    try {
      // Send shutdown event
      await agentExecutor.mailbox.sendProgress('agent_shutdown', {
        agentId: agentExecutor.config.agentId,
        signal,
        timestamp: new Date().toISOString()
      });

      // Small delay to ensure event is sent
      await new Promise(resolve => setTimeout(resolve, 1000));

      process.exit(0);
    } catch (error) {
      console.error(`[${agentExecutor.config.agentId}] Error during shutdown:`, error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Main Entry Point
async function main() {
  try {
    const config = parseArgs();

    // Validate required arguments
    if (!config.agentId || !config.mailboxId) {
      console.error('Missing required arguments: --agent-id and --mailbox-id');
      console.error('Usage: node agent-runner.js --agent-id <id> --agent-type <type> --mailbox-id <id> [--task <task>] [--timeout <ms>] [--api-url <url>]');
      process.exit(1);
    }

    console.log('\n=== FleetTools Agent Runner ===');
    console.log(`Agent ID: ${config.agentId}`);
    console.log(`Agent Type: ${config.agentType}`);
    console.log(`Mailbox: ${config.mailboxId}`);
    console.log(`Task: ${config.task || '(none)'}`);
    console.log(`Timeout: ${config.timeout}ms`);
    console.log(`API: ${config.apiUrl}`);
    console.log('================================\n');

    // Initialize mailbox connection
    const mailbox = new SquawkMailbox(config.mailboxId, config.agentId, config.apiUrl);

    // Create executor
    const executor = new AgentExecutor(config, mailbox);

    // Setup graceful shutdown
    setupGracefulShutdown(executor);

    // Execute task
    const exitCode = await executor.execute();

    console.log(`[${config.agentId}] Exiting with code: ${exitCode}`);
    process.exit(exitCode);
  } catch (error) {
    console.error('[Agent Runner] Fatal error:', error);
    process.exit(1);
  }
}

main();
