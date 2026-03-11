/**
 * Project Management Utilities
 *
 * Utilities for managing FleetTools projects
 */
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
export declare const PROJECT_TEMPLATES: Record<string, ProjectTemplate>;
/**
 * Initialize a new FleetTools project
 */
export declare function initializeProject(projectPath: string, templateName: string, config?: Partial<FleetProjectConfig>): FleetProjectConfig;
/**
 * Get available templates
 */
export declare function getAvailableTemplates(): string[];
/**
 * Get template information
 */
export declare function getTemplateInfo(templateName: string): ProjectTemplate | null;
/**
 * Check if a directory is a valid FleetTools project
 */
export declare function isValidProject(projectPath: string): boolean;
/**
 * Get project root directory (searches upward from current directory)
 */
export declare function getProjectRoot(): string | null;
//# sourceMappingURL=project.d.ts.map