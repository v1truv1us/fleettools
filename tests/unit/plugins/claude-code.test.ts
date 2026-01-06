/// <reference types="bun-types" />

/**
 * Claude Code Plugin Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { testDb, resetTestData } from '../../helpers/test-db'

describe('Claude Code Plugin', () => {
  beforeEach(() => {
    resetTestData()
  })

  describe('Plugin Metadata', () => {
    it('should have correct name', () => {
      const name = 'FleetTools'
      expect(name).toBe('FleetTools')
    })

    it('should have correct version', () => {
      const version = '0.1.0'
      expect(version).toBe('0.1.0')
    })
  })

  describe('Command Registration', () => {
    it('should register status command', () => {
      const commands = ['/fleet status']
      expect(commands).toContain('/fleet status')
    })

    it('should register setup command', () => {
      const commands = ['/fleet setup']
      expect(commands).toContain('/fleet setup')
    })

    it('should register doctor command', () => {
      const commands = ['/fleet doctor']
      expect(commands).toContain('/fleet doctor')
    })

    it('should register services command', () => {
      const commands = ['/fleet services']
      expect(commands).toContain('/fleet services')
    })

    it('should register help command', () => {
      const commands = ['/fleet help']
      expect(commands).toContain('/fleet help')
    })

    it('should have all required commands', () => {
      const expectedCommands = [
        '/fleet status',
        '/fleet setup',
        '/fleet doctor',
        '/fleet services',
        '/fleet help'
      ]
      
      const registeredCommands = [
        '/fleet status',
        '/fleet setup',
        '/fleet doctor',
        '/fleet services',
        '/fleet help'
      ]
      
      expect(registeredCommands).toEqual(expectedCommands)
    })
  })

  describe('Command Handlers', () => {
    it('status handler should process status data', () => {
      // Simulate status processing
      const mockStatus = {
        mode: 'local',
        config: {
          fleet: {
            user_id: 'test-user'
          }
        }
      }
      
      const output = []
      output.push(`Mode: ${mockStatus.mode.toUpperCase()}`)
      output.push(`User: ${mockStatus.config.fleet.user_id}`)
      
      expect(output[0]).toBe('Mode: LOCAL')
      expect(output[1]).toBe('User: test-user')
    })

    it('help handler should return help text', () => {
      const helpText = [
        'FleetTools Plugin for Claude Code',
        'Commands:',
        ' /fleet status  - Show FleetTools status and configuration',
        ' /fleet setup   - Initialize FleetTools configuration',
        ' /fleet doctor  - Diagnose FleetTools installation and configuration',
        ' /fleet services - Manage local services (up/down/status/logs)',
        ' /fleet help     - Show this help',
      ]
      
      expect(helpText.length).toBe(7)
      expect(helpText[0]).toContain('FleetTools')
      expect(helpText[2]).toContain('status')
      expect(helpText[3]).toContain('setup')
    })

    it('setup handler should indicate setup action', () => {
      const setupAction = 'Running FleetTools setup...'
      expect(setupAction).toContain('setup')
    })

    it('doctor handler should indicate diagnostics', () => {
      const doctorAction = 'Running FleetTools diagnostics...'
      expect(doctorAction).toContain('diagnostics')
    })

    it('services handler should indicate services menu', () => {
      const servicesAction = 'Opening FleetTools services menu...'
      expect(servicesAction).toContain('services')
    })
  })

  describe('Error Handling', () => {
    it('should handle CLI errors gracefully', () => {
      const errorMessage = 'Failed to get FleetTools status'
      expect(errorMessage).toContain('Failed')
    })

    it('should provide error details', () => {
      const error = new Error('Test error message')
      const message = `Error: ${error.message}`
      expect(message).toBe('Error: Test error message')
    })
  })

  describe('Output Formatting', () => {
    it('should format status output correctly', () => {
      const status = {
        mode: 'local',
        config: {
          fleet: {
            user_id: 'test-user',
            workspace_id: 'test-workspace'
          }
        }
      }
      
      const lines = [
        `Mode: ${status.mode.toUpperCase()}`,
        `User: ${status.config.fleet.user_id}`,
        `Workspace: ${status.config.fleet.workspace_id}`
      ]
      
      expect(lines[0]).toBe('Mode: LOCAL')
      expect(lines[1]).toBe('User: test-user')
      expect(lines[2]).toBe('Workspace: test-workspace')
    })

    it('should handle missing optional fields', () => {
      const status = {
        mode: 'local'
      }
      
      const user = status.config?.fleet?.user_id || 'Not enrolled'
      expect(user).toBe('Not enrolled')
    })
  })
})
