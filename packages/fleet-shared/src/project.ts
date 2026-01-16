/**
 * Project Management Utilities
 * 
 * Utilities for managing FleetTools projects
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FleetProjectConfig } from './config.js';

/**
 * Project template structure
 */
export interface ProjectTemplate {
  name: string;
  description: string;
  directories: string[];
  files: Record<string, string>;
  dependencies?: Record<string, string>;
}

/**
 * Available project templates
 */
export const PROJECT_TEMPLATES: Record<string, ProjectTemplate> = {
  basic: {
    name: 'Basic FleetTools Project',
    description: 'A basic FleetTools setup for AI agent coordination',
    directories: [
      '.fleet/squawk',
      '.fleet/postgres',
      '.flightline/work-orders',
      '.flightline/ctk',
      '.flightline/tech-orders',
      'spec',
      'tests'
    ],
    files: {
      '.gitignore': `# FleetTools
.fleet/
.flightline/
*.log

# Dependencies
node_modules/
bun.lockb
package-lock.json

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`,
      'README.md': `# FleetTools Project

This is a FleetTools project for AI agent coordination.

## Getting Started

1. Start FleetTools services:
   \`\`\`bash
   fleet start
   \`\`\`

2. Check status:
   \`\`\`bash
   fleet status
   \`\`\`

3. View available commands:
   \`\`\`bash
   fleet --help
   \`\`\`

## Project Structure

- \`.fleet/\` - Local FleetTools data and services
- \`.flightline/\` - Git-backed work tracking
- \`spec/\` - Project specifications
- \`tests/\` - Test files

## Learn More

Visit [FleetTools Documentation](https://github.com/v1truvius/fleettools) for more information.
`
    }
  },
  
  agent: {
    name: 'AI Agent Project',
    description: 'Project template for developing AI agents with FleetTools integration',
    directories: [
      '.fleet/squawk',
      '.fleet/postgres',
      '.flightline/work-orders',
      '.flightline/ctk',
      '.flightline/tech-orders',
      'src/agents',
      'src/tasks',
      'src/tools',
      'spec/agents',
      'tests',
      'docs'
    ],
    files: {
      '.gitignore': `# FleetTools
.fleet/
.flightline/
*.log

# Dependencies
node_modules/
bun.lockb
package-lock.json

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`,
      'README.md': `# AI Agent Project

A FleetTools project for developing and coordinating AI agents.

## Project Structure

- \`src/agents/\` - Agent implementations
- \`src/tasks/\` - Task definitions
- \`src/tools/\` - Tool implementations
- \`spec/agents/\` - Agent specifications
- \`docs/\` - Documentation

## Getting Started

1. Install dependencies:
   \`\`\`bash
   bun install
   \`\`\`

2. Start FleetTools:
   \`\`\`bash
   fleet start
   \`\`\`

3. Create your first agent:
   \`\`\`bash
   fleet agent create my-agent
   \`\`\`

## Learn More

See the [FleetTools Documentation](https://github.com/v1truvius/fleettools) for detailed guides.
`,
      'package.json': JSON.stringify({
        name: 'my-fleet-agent',
        version: '1.0.0',
        description: 'A FleetTools AI agent project',
        type: 'module',
        scripts: {
          'start': 'fleet start',
          'test': 'bun test',
          'build': 'bun build'
        },
        dependencies: {
          '@fleettools/core': 'workspace:*',
          '@fleettools/fleet-shared': 'workspace:*'
        },
        devDependencies: {
          'typescript': '^5.9.3',
          '@types/node': '^20.10.6'
        }
      }, null, 2)
    },
    dependencies: {
      '@fleettools/core': 'workspace:*',
      '@fleettools/fleet-shared': 'workspace:*'
    }
  }
};

/**
 * Initialize a new FleetTools project
 */
export function initializeProject(
  projectPath: string,
  templateName: string,
  config: Partial<FleetProjectConfig> = {}
): FleetProjectConfig {
  const template = PROJECT_TEMPLATES[templateName];
  if (!template) {
    throw new Error(`Unknown template: ${templateName}`);
  }

  // Create directories
  template.directories.forEach(dir => {
    const fullPath = join(projectPath, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  });

  // Create files
  Object.entries(template.files).forEach(([filePath, content]) => {
    const fullPath = join(projectPath, filePath);
    writeFileSync(fullPath, content, 'utf-8');
  });

  // Create project config
  const projectConfig: FleetProjectConfig = {
    name: config.name || template.name,
    version: config.version || '1.0.0',
    fleet: {
      version: '0.1.0',
      mode: 'local',
      ...config.fleet
    },
    services: {
      squawk: {
        enabled: true,
        port: 3000,
        dataDir: './.fleet/squawk',
        ...config.services?.squawk
      },
      api: {
        enabled: true,
        port: 3001,
        ...config.services?.api
      },
      postgres: {
        enabled: false,
        provider: 'podman',
        port: 5432,
        dataDir: './.fleet/postgres',
        ...config.services?.postgres
      }
    },
    plugins: {
      claudeCode: true,
      openCode: true,
      ...config.plugins
    }
  };

  return projectConfig;
}

/**
 * Get available templates
 */
export function getAvailableTemplates(): string[] {
  return Object.keys(PROJECT_TEMPLATES);
}

/**
 * Get template information
 */
export function getTemplateInfo(templateName: string): ProjectTemplate | null {
  return PROJECT_TEMPLATES[templateName] || null;
}

/**
 * Check if a directory is a valid FleetTools project
 */
export function isValidProject(projectPath: string): boolean {
  const configPath = join(projectPath, 'fleet.yaml');
  return existsSync(configPath);
}

/**
 * Get project root directory (searches upward from current directory)
 */
export function getProjectRoot(): string | null {
  let currentDir = process.cwd();
  
  while (currentDir !== '/') {
    if (isValidProject(currentDir)) {
      return currentDir;
    }
    currentDir = join(currentDir, '..');
  }
  
  return null;
}