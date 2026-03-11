/**
 * Task Decomposer for FleetTools Coordination System
 *
 * Automatically breaks down missions into assignable tasks
 * Handles task dependencies and agent type assignment
 */

// Using local types to avoid import issues
export enum AgentType {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  SECURITY = 'security',
  PERFORMANCE = 'performance'
}

export interface Task {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  missionId?: string;
  dependencies?: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface DecompositionRule {
  missionType: string;
  patterns: Array<{
    pattern: RegExp;
    taskTemplate: {
      type: string;
      title: string;
      description: string;
      agentType: AgentType;
      priority: 'low' | 'medium' | 'high' | 'critical';
      estimatedDuration?: number; // minutes
    };
  }>;
}

export interface DecompositionConfig {
  rules: DecompositionRule[];
  defaultAgentType: AgentType;
  maxTasksPerMission: number;
}

export class TaskDecomposer {
  private config: DecompositionConfig;

  constructor(config: Partial<DecompositionConfig> = {}) {
    this.config = {
      defaultAgentType: AgentType.BACKEND,
      maxTasksPerMission: 20,
      rules: this.getDefaultRules(),
      ...config
    };
  }

  /**
   * Decompose a mission into individual tasks
   */
  decomposeMission(mission: {
    title: string;
    description: string;
    type?: string;
    metadata?: Record<string, any>;
  }): Task[] {
    const tasks: Task[] = [];
    const missionType = mission.type || this.inferMissionType(mission.title, mission.description);
    
    // Get applicable rules
    const rules = this.config.rules.filter(rule => rule.missionType === missionType);
    
    if (rules.length === 0) {
      // Apply generic decomposition
      return this.createGenericTasks(mission);
    }

    // Apply rules to generate tasks
    for (const rule of rules) {
      for (const patternRule of rule.patterns) {
        if (patternRule.pattern.test(mission.title) || patternRule.pattern.test(mission.description)) {
          const task = this.createTaskFromPattern(patternRule.taskTemplate, mission);
          tasks.push(task);
        }
      }
    }

    // Limit number of tasks
    if (tasks.length > this.config.maxTasksPerMission) {
      console.warn(`⚠️ Mission decomposed into ${tasks.length} tasks, limiting to ${this.config.maxTasksPerMission}`);
      return tasks.slice(0, this.config.maxTasksPerMission);
    }

    // Add dependency relationships
    this.addTaskDependencies(tasks);
    
    console.log(`✓ Decomposed mission "${mission.title}" into ${tasks.length} tasks`);
    return tasks;
  }

  /**
   * Infer mission type from title and description
   */
  private inferMissionType(title: string, description: string): string {
    const content = `${title} ${description}`.toLowerCase();
    
    if (content.includes('frontend') || content.includes('ui') || content.includes('react')) {
      return 'frontend_development';
    }
    if (content.includes('backend') || content.includes('api') || content.includes('server')) {
      return 'backend_development';
    }
    if (content.includes('test') || content.includes('testing') || content.includes('quality')) {
      return 'testing';
    }
    if (content.includes('doc') || content.includes('manual') || content.includes('guide')) {
      return 'documentation';
    }
    if (content.includes('security') || content.includes('auth') || content.includes('vulnerability')) {
      return 'security';
    }
    if (content.includes('performance') || content.includes('optimize') || content.includes('speed')) {
      return 'performance';
    }
    
    return 'general';
  }

  /**
   * Create generic tasks for missions without specific rules
   */
  private createGenericTasks(mission: {
    title: string;
    description: string;
    metadata?: Record<string, any>;
  }): Task[] {
    const now = new Date().toISOString();
    const missionId = mission.metadata?.missionId || `mission_${Date.now()}`;
    
    return [
      {
        id: `tsk_${Math.random().toString(36).substr(2, 9)}`,
        type: 'analysis',
        title: `Analyze requirements for ${mission.title}`,
        description: `Review and analyze mission requirements: ${mission.description}`,
        status: 'pending' as any,
        priority: 'high',
        assignedTo: undefined,
        missionId,
        dependencies: [],
        metadata: { phase: 'planning', missionTitle: mission.title },
        createdAt: now,
        updatedAt: now
      },
      {
        id: `tsk_${Math.random().toString(36).substr(2, 9)}`,
        type: 'implementation',
        title: `Implement ${mission.title}`,
        description: `Core implementation task for: ${mission.description}`,
        status: 'pending' as any,
        priority: 'high',
        assignedTo: undefined,
        missionId,
        dependencies: [],
        metadata: { phase: 'implementation', missionTitle: mission.title },
        createdAt: now,
        updatedAt: now
      },
      {
        id: `tsk_${Math.random().toString(36).substr(2, 9)}`,
        type: 'testing',
        title: `Test ${mission.title}`,
        description: `Testing and validation for: ${mission.description}`,
        status: 'pending' as any,
        priority: 'medium',
        assignedTo: undefined,
        missionId,
        dependencies: [],
        metadata: { phase: 'testing', missionTitle: mission.title },
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  /**
   * Create task from pattern template
   */
  private createTaskFromPattern(template: any, mission: {
    title: string;
    description: string;
    metadata?: Record<string, any>;
  }): Task {
    const now = new Date().toISOString();
    const missionId = mission.metadata?.missionId || `mission_${Date.now()}`;
    
    return {
      id: `tsk_${Math.random().toString(36).substr(2, 9)}`,
      type: template.type,
      title: template.title.replace('{mission}', mission.title),
      description: template.description.replace('{description}', mission.description),
      status: 'pending' as any,
      priority: template.priority,
      assignedTo: undefined,
      missionId,
      dependencies: [],
      metadata: { 
        ...template.metadata,
        missionTitle: mission.title,
        estimatedDuration: template.estimatedDuration 
      },
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Add logical dependencies between tasks
   */
  private addTaskDependencies(tasks: Task[]): void {
    // Find analysis tasks
    const analysisTasks = tasks.filter(t => t.type === 'analysis');
    const implementationTasks = tasks.filter(t => t.type === 'implementation');
    const testingTasks = tasks.filter(t => t.type === 'testing');

    // Implementation depends on analysis
    implementationTasks.forEach(implTask => {
      const matchingAnalysis = analysisTasks.find(analTask => 
        implTask.metadata?.missionTitle === analTask.metadata?.missionTitle
      );
      if (matchingAnalysis) {
        implTask.dependencies = implTask.dependencies || [];
        implTask.dependencies.push(matchingAnalysis.id);
      }
    });

    // Testing depends on implementation
    testingTasks.forEach(testTask => {
      const matchingImpl = implementationTasks.find(implTask => 
        testTask.metadata?.missionTitle === implTask.metadata?.missionTitle
      );
      if (matchingImpl) {
        testTask.dependencies = testTask.dependencies || [];
        testTask.dependencies.push(matchingImpl.id);
      }
    });
  }

  /**
   * Calculate task complexity score
   */
  calculateComplexity(task: Task): number {
    let complexity = 50;

    if (task.title.includes('create') || task.title.includes('implement')) {
      complexity += 30;
    }
    if (task.title.includes('test') || task.title.includes('testing')) {
      complexity += 20;
    }
    if (task.title.includes('optimize') || task.title.includes('performance')) {
      complexity += 25;
    }
    if (task.title.includes('security') || task.title.includes('auth')) {
      complexity += 20;
    }
    if (task.title.includes('documentation') || task.title.includes('doc')) {
      complexity += 15;
    }

    if (task.dependencies && task.dependencies.length > 0) {
      complexity += task.dependencies.length * 10;
    }

    if (task.description && task.description.length > 200) {
      complexity += 10;
    }

    return Math.min(100, complexity);
  }

  /**
   * Estimate task duration based on complexity
   */
  estimateTaskDuration(complexity: number): number {
    const baseMinutes = 30;
    const multiplier = complexity / 50;
    return Math.ceil(baseMinutes * multiplier);
  }

  /**
   * Get default decomposition rules
   */
  private getDefaultRules(): DecompositionRule[] {
    return [
      {
        missionType: 'frontend_development',
        patterns: [
          {
            pattern: /component/i,
            taskTemplate: {
              type: 'component_development',
              title: 'Create {mission} component',
              description: 'Develop React component for {description}',
              agentType: AgentType.FRONTEND,
              priority: 'high',
              estimatedDuration: 120
            }
          },
          {
            pattern: /page/i,
            taskTemplate: {
              type: 'page_development',
              title: 'Create {mission} page',
              description: 'Develop full page layout and functionality for {description}',
              agentType: AgentType.FRONTEND,
              priority: 'high',
              estimatedDuration: 180
            }
          },
          {
            pattern: /style|css/i,
            taskTemplate: {
              type: 'styling',
              title: 'Style {mission}',
              description: 'Apply styling and responsive design for {description}',
              agentType: AgentType.FRONTEND,
              priority: 'medium',
              estimatedDuration: 90
            }
          }
        ]
      },
      {
        missionType: 'backend_development',
        patterns: [
          {
            pattern: /api/i,
            taskTemplate: {
              type: 'api_development',
              title: 'Develop {mission} API',
              description: 'Create REST API endpoints for {description}',
              agentType: AgentType.BACKEND,
              priority: 'high',
              estimatedDuration: 150
            }
          },
          {
            pattern: /database|schema/i,
            taskTemplate: {
              type: 'database_design',
              title: 'Design database for {mission}',
              description: 'Create database schema and migrations for {description}',
              agentType: AgentType.BACKEND,
              priority: 'high',
              estimatedDuration: 100
            }
          },
          {
            pattern: /auth/i,
            taskTemplate: {
              type: 'authentication',
              title: 'Implement authentication for {mission}',
              description: 'Add user authentication and authorization for {description}',
              agentType: AgentType.BACKEND,
              priority: 'critical',
              estimatedDuration: 200
            }
          }
        ]
      },
      {
        missionType: 'testing',
        patterns: [
          {
            pattern: /unit/i,
            taskTemplate: {
              type: 'unit_testing',
              title: 'Write unit tests for {mission}',
              description: 'Create comprehensive unit tests for {description}',
              agentType: AgentType.TESTING,
              priority: 'high',
              estimatedDuration: 120
            }
          },
          {
            pattern: /integration/i,
            taskTemplate: {
              type: 'integration_testing',
              title: 'Integration testing for {mission}',
              description: 'Create integration tests for {description}',
              agentType: AgentType.TESTING,
              priority: 'medium',
              estimatedDuration: 180
            }
          }
        ]
      },
      {
        missionType: 'documentation',
        patterns: [
          {
            pattern: /api/i,
            taskTemplate: {
              type: 'api_documentation',
              title: 'Document {mission} API',
              description: 'Create comprehensive API documentation for {description}',
              agentType: AgentType.DOCUMENTATION,
              priority: 'medium',
              estimatedDuration: 90
            }
          },
          {
            pattern: /guide|tutorial/i,
            taskTemplate: {
              type: 'tutorial',
              title: 'Create {mission} guide',
              description: 'Write step-by-step guide for {description}',
              agentType: AgentType.DOCUMENTATION,
              priority: 'medium',
              estimatedDuration: 150
            }
          }
        ]
      },
      {
        missionType: 'security',
        patterns: [
          {
            pattern: /audit|review/i,
            taskTemplate: {
              type: 'security_audit',
              title: 'Security audit for {mission}',
              description: 'Conduct comprehensive security audit for {description}',
              agentType: AgentType.SECURITY,
              priority: 'critical',
              estimatedDuration: 240
            }
          },
          {
            pattern: /vulnerability/i,
            taskTemplate: {
              type: 'vulnerability_assessment',
              title: 'Vulnerability assessment for {mission}',
              description: 'Identify and assess security vulnerabilities for {description}',
              agentType: AgentType.SECURITY,
              priority: 'critical',
              estimatedDuration: 180
            }
          }
        ]
      },
      {
        missionType: 'performance',
        patterns: [
          {
            pattern: /optimize/i,
            taskTemplate: {
              type: 'performance_optimization',
              title: 'Optimize {mission}',
              description: 'Improve performance and efficiency for {description}',
              agentType: AgentType.PERFORMANCE,
              priority: 'high',
              estimatedDuration: 160
            }
          },
          {
            pattern: /benchmark/i,
            taskTemplate: {
              type: 'performance_testing',
              title: 'Performance testing for {mission}',
              description: 'Conduct performance benchmarks for {description}',
              agentType: AgentType.PERFORMANCE,
              priority: 'medium',
              estimatedDuration: 120
            }
          }
        ]
      }
    ];
  }
}