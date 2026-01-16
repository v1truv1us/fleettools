import { describe, it, expect } from 'bun:test';
import {
  getAvailableTemplates,
  getTemplateInfo,
  isValidProject,
  getProjectRoot,
  PROJECT_TEMPLATES,
  ProjectTemplate
} from '../src/project.js';
import { FleetProjectConfig } from '../src/config.js';

describe('Project Management', () => {
  describe('PROJECT_TEMPLATES', () => {
    it('should contain basic and agent templates', () => {
      expect(PROJECT_TEMPLATES.basic).toBeDefined();
      expect(PROJECT_TEMPLATES.agent).toBeDefined();
      expect(PROJECT_TEMPLATES.basic.name).toBe('Basic FleetTools Project');
      expect(PROJECT_TEMPLATES.agent.name).toBe('AI Agent Project');
    });

    it('should have proper template structure', () => {
      const template = PROJECT_TEMPLATES.basic;
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(Array.isArray(template.directories)).toBe(true);
      expect(typeof template.files).toBe('object');
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return array of template names', () => {
      const templates = getAvailableTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates).toContain('basic');
      expect(templates).toContain('agent');
    });
  });

  describe('getTemplateInfo', () => {
    it('should return template info for valid template', () => {
      const info = getTemplateInfo('basic');
      expect(info).toBe(PROJECT_TEMPLATES.basic);
    });

    it('should return null for invalid template', () => {
      const info = getTemplateInfo('invalid');
      expect(info).toBeNull();
    });
  });

  describe('isValidProject', () => {
    it('should return false when fleet.yaml does not exist in current directory', () => {
      const { existsSync, unlinkSync } = require('node:fs');
      const configPath = require('node:path').join(process.cwd(), 'fleet.yaml');
      
      // Ensure fleet.yaml doesn't exist
      if (existsSync(configPath)) {
        unlinkSync(configPath);
      }
      
      expect(isValidProject(process.cwd())).toBe(false);
    });
  });

  describe('getProjectRoot', () => {
    it('should return null when no project found', () => {
      const { existsSync, unlinkSync } = require('node:fs');
      const configPath = require('node:path').join(process.cwd(), 'fleet.yaml');
      
      // Ensure fleet.yaml doesn't exist
      if (existsSync(configPath)) {
        unlinkSync(configPath);
      }
      
      const root = getProjectRoot();
      expect(root).toBeNull();
    });

    it('should return project root when found in current directory', () => {
      const { writeFileSync, unlinkSync } = require('node:fs');
      const configPath = require('node:path').join(process.cwd(), 'fleet.yaml');
      
      writeFileSync(configPath, 'name: test');
      
      const root = getProjectRoot();
      expect(root).toBe(process.cwd());
      
      unlinkSync(configPath);
    });
  });

  describe('template validation', () => {
    it('should have valid template data for basic template', () => {
      const template = PROJECT_TEMPLATES.basic;
      
      expect(template.name.length).toBeGreaterThan(0);
      expect(template.description.length).toBeGreaterThan(0);
      expect(template.directories.length).toBeGreaterThan(0);
      expect(Object.keys(template.files).length).toBeGreaterThan(0);
    });

    it('should have valid template data for agent template', () => {
      const template = PROJECT_TEMPLATES.agent;
      
      expect(template.name.length).toBeGreaterThan(0);
      expect(template.description.length).toBeGreaterThan(0);
      expect(template.directories.length).toBeGreaterThan(0);
      expect(Object.keys(template.files).length).toBeGreaterThan(0);
    });
  });
});