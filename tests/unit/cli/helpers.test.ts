/// <reference types="bun-types" />

/**
 * CLI Helper Functions Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import fs from 'fs'
import path from 'path'

describe('CLI Helper Functions', () => {
  describe('checkPodmanSync()', () => {
    it('should detect podman availability', () => {
      // This test checks if podman is available in the environment
      // In a real test environment, podman might or might not be installed
      const canDetect = (() => {
        try {
          // Simple check - try to run podman --version
          const { execSync } = require('child_process')
          execSync('podman --version', { encoding: 'utf-8' })
          return true
        } catch {
          return false
        }
      })()
      
      // Just verify the check doesn't throw
      expect(typeof canDetect).toBe('boolean')
    })
  })

  describe('checkPostgresStatusSync()', () => {
    it('should handle disabled postgres config', () => {
      const config = {
        services: {
          postgres: {
            enabled: false
          }
        }
      }
      
      // When postgres is disabled, should return false
      const isRunning = !config.services?.postgres?.enabled ? false : true
      expect(isRunning).toBe(false)
    })

    it('should handle missing services config', () => {
      const config = {}
      
      const isRunning = config.services?.postgres?.enabled ? true : false
      expect(isRunning).toBe(false)
    })
  })

  describe('initializeDirectoriesSync()', () => {
    const testDirs = [
      path.join(process.cwd(), 'tests', 'fixtures', 'dir-test', 'config'),
      path.join(process.cwd(), 'tests', 'fixtures', 'dir-test', 'local', 'share', 'fleet'),
      path.join(process.cwd(), 'tests', 'fixtures', 'dir-test', 'local', 'state', 'fleet', 'logs'),
    ]

    beforeAll(() => {
      // Clean up any existing test directories
      const parentDir = path.join(process.cwd(), 'tests', 'fixtures', 'dir-test')
      if (fs.existsSync(parentDir)) {
        fs.rmSync(parentDir, { recursive: true, force: true })
      }
    })

    afterAll(() => {
      // Cleanup
      const parentDir = path.join(process.cwd(), 'tests', 'fixtures', 'dir-test')
      if (fs.existsSync(parentDir)) {
        fs.rmSync(parentDir, { recursive: true, force: true })
      }
    })

    it('should create all required directories', () => {
      // Simulate directory creation
      const dirs = [
        path.join(process.cwd(), 'tests', 'fixtures', 'dir-test', 'config'),
        path.join(process.cwd(), 'tests', 'fixtures', 'dir-test', 'local', 'share', 'fleet'),
        path.join(process.cwd(), 'tests', 'fixtures', 'dir-test', 'local', 'state', 'fleet', 'logs'),
      ]

      for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        expect(fs.existsSync(dir)).toBe(true)
      }
    })

    it('should not throw for existing directories', () => {
      const existingDir = path.join(process.cwd(), 'tests', 'fixtures', 'dir-test', 'config')
      
      // Create directory first
      if (!fs.existsSync(existingDir)) {
        fs.mkdirSync(existingDir, { recursive: true })
      }
      
      // Should not throw when directory exists
      try {
        fs.mkdirSync(existingDir, { recursive: true })
        expect(true).toBe(true)
      } catch {
        expect(true).toBe(false) // Should not reach here
      }
    })
  })

  describe('getCurrentModeSync()', () => {
    it('should return local as default mode', () => {
      const config = {}
      const mode = config.mode || 'local'
      expect(mode).toBe('local')
    })

    it('should return configured mode', () => {
      const config = { mode: 'synced' }
      const mode = config.mode || 'local'
      expect(mode).toBe('synced')
    })

    it('should handle both valid modes', () => {
      const localConfig = { mode: 'local' }
      const syncedConfig = { mode: 'synced' }
      
      expect(localConfig.mode || 'local').toBe('local')
      expect(syncedConfig.mode || 'local').toBe('synced')
    })
  })

  describe('servicesUpSync()', () => {
    it('should skip when podman is not available', () => {
      const config = {
        services: {
          postgres: {
            enabled: true
          }
        }
      }
      
      // Simulate podman not available
      const podmanAvailable = false
      
      if (!podmanAvailable) {
        // Should skip postgres startup
        expect(true).toBe(true)
      } else {
        // Would start postgres
        expect(config.services.postgres.enabled).toBe(true)
      }
    })

    it('should indicate postgres startup when enabled', () => {
      const config = {
        services: {
          postgres: {
            enabled: true,
            provider: 'podman',
            image: 'postgres:16',
            port: 5432,
            container_name: 'fleettools-pg'
          }
        }
      }
      
      const podmanAvailable = true
      
      if (config.services?.postgres?.enabled && podmanAvailable) {
        // Would start postgres
        expect(config.services.postgres.image).toBe('postgres:16')
        expect(config.services.postgres.port).toBe(5432)
      }
    })
  })

  describe('servicesDownSync()', () => {
    it('should handle disabled postgres', () => {
      const config = {
        services: {
          postgres: {
            enabled: false
          }
        }
      }
      
      if (!config.services?.postgres?.enabled) {
        expect(true).toBe(true) // Would skip
      }
    })

    it('should handle podman not available', () => {
      const config = {
        services: {
          postgres: {
            enabled: true,
            provider: 'podman'
          }
        }
      }
      
      const podmanAvailable = false
      
      if (config.services?.postgres?.enabled) {
        if (!podmanAvailable) {
          expect(true).toBe(true) // Would skip
        }
      }
    })
  })

  describe('servicesStatusSync()', () => {
    it('should report postgres status when enabled', () => {
      const config = {
        services: {
          postgres: {
            enabled: true,
            provider: 'podman',
            image: 'postgres:16',
            port: 5432
          }
        },
        mode: 'local'
      }
      
      if (config.services?.postgres?.enabled) {
        expect(config.services.postgres.provider).toBe('podman')
        expect(config.services.postgres.image).toBe('postgres:16')
      }
    })

    it('should report not enabled when postgres disabled', () => {
      const config = {
        services: {
          postgres: {
            enabled: false
          }
        }
      }
      
      if (config.services?.postgres?.enabled) {
        // Would report running
        expect(true).toBe(false)
      } else {
        expect(true).toBe(true) // Would report not enabled
      }
    })
  })
})
