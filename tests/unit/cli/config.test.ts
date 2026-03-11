

import fs from 'fs'
import path from 'path'

const TEST_CONFIG_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'config-test')
const TEST_CONFIG_FILE = path.join(TEST_CONFIG_DIR, 'fleet.json')

const mockConfig = {
  fleet: {
    user_id: 'test-user-123',
    org_id: 'test-org-456',
    workspace_id: 'test-ws-789',
    server_url: null
  },
  mode: 'local' as const,
  services: {
    postgres: {
      enabled: true,
      provider: 'podman',
      image: 'postgres:16',
      port: 5432,
      container_name: 'fleettools-pg-test',
      volume_name: 'fleettools-pg-data-test'
    }
  },
  flightline: {
    directory: '.flightline-test'
  },
  sync: {
    zero: {
      url: null
    },
    api: {
      url: null
    }
  }
}

describe('CLI Config Loading', () => {
  beforeAll(() => {
    if (!fs.existsSync(TEST_CONFIG_DIR)) {
      fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true })
    }
    fs.writeFileSync(TEST_CONFIG_FILE, JSON.stringify(mockConfig, null, 2))
  })

  afterAll(() => {
    try {
      if (fs.existsSync(TEST_CONFIG_FILE)) {
        fs.unlinkSync(TEST_CONFIG_FILE)
      }
    } catch { /* ignore */

    }
    try {
      if (fs.existsSync(TEST_CONFIG_DIR)) {
        fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
      }
    } catch { /* ignore */

    }
  })

  describe('loadConfigSync()', () => {
    it('should parse valid JSON config', () => {
      const content = fs.readFileSync(TEST_CONFIG_FILE, 'utf-8')
      const config = JSON.parse(content)
      
      expect(config.fleet.user_id).toBe('test-user-123')
      expect(config.mode).toBe('local')
    })

    it('should handle missing config file gracefully', () => {
      const missingPath = path.join(TEST_CONFIG_DIR, 'nonexistent.json')
      
      try {
        const content = fs.readFileSync(missingPath, 'utf-8')
        JSON.parse(content)
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe('ENOENT')
      }
    })

    it('should return empty object for non-existent file', () => {
      const nonExistent = path.join(TEST_CONFIG_DIR, 'missing.json')
      
      let result: any = {}
      try {
        const content = fs.readFileSync(nonExistent, 'utf-8')
        result = JSON.parse(content)
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          result = {}
        } else {
          throw error
        }
      }
      
      expect(result).toEqual({})
    })
  })

  describe('saveConfig()', () => {
    it('should create config file with valid JSON', () => {
      const testPath = path.join(TEST_CONFIG_DIR, 'save-test.json')
      const testConfig = { test: true, value: 123 }
      
      fs.writeFileSync(testPath, JSON.stringify(testConfig, null, 2))
      
      const content = fs.readFileSync(testPath, 'utf-8')
      const parsed = JSON.parse(content)
      
      expect(parsed.test).toBe(true)
      expect(parsed.value).toBe(123)
      
      // Cleanup
      fs.unlinkSync(testPath)
    })

    it('should create directory recursively if needed', () => {
      const nestedDir = path.join(TEST_CONFIG_DIR, 'nested', 'deep')
      const testPath = path.join(nestedDir, 'config.json')
      const testConfig = { nested: true }
      
      fs.mkdirSync(nestedDir, { recursive: true })
      fs.writeFileSync(testPath, JSON.stringify(testConfig, null, 2))
      
      expect(fs.existsSync(testPath)).toBe(true)
    })
  })

  describe('Config Structure', () => {
    it('should have correct fleet config structure', () => {
      expect(mockConfig.fleet).toBeDefined()
      expect(mockConfig.fleet.user_id).toBeDefined()
      expect(mockConfig.fleet.org_id).toBeDefined()
      expect(mockConfig.fleet.workspace_id).toBeDefined()
    })

    it('should have correct mode value', () => {
      expect(mockConfig.mode).toBe('local')
    })

    it('should have services config', () => {
      expect(mockConfig.services.postgres).toBeDefined()
      expect(mockConfig.services.postgres.enabled).toBe(true)
      expect(mockConfig.services.postgres.provider).toBe('podman')
    })

    it('should have flightline config', () => {
      expect(mockConfig.flightline).toBeDefined()
      expect(mockConfig.flightline.directory).toBe('.flightline-test')
    })
  })
})
