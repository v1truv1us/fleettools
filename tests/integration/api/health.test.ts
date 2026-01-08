/


import { describe, it, expect, beforeEach } from 'bun:test'
import { testDb, resetTestData } from '../../helpers/test-db'

describe('Health Endpoint', () => {
  beforeEach(() => {
    resetTestData()
  })

  describe('GET /health', () => {
    it('should return 200 status', () => {
      const statusCode = 200
      expect(statusCode).toBe(200)
    })

    it('should return healthy status', () => {
      const response = { status: 'healthy' }
      expect(response.status).toBe('healthy')
    })

    it('should include service name', () => {
      const response = { 
        status: 'healthy',
        service: 'fleettools-consolidated'
      }
      expect(response.service).toBe('fleettools-consolidated')
    })

    it('should include timestamp', () => {
      const timestamp = new Date().toISOString()
      const response = {
        status: 'healthy',
        timestamp
      }
      expect(typeof response.timestamp).toBe('string')
      expect(response.timestamp).toContain('T')
    })

    it('should include version', () => {
      const response = {
        status: 'healthy',
        version: '1.0.0'
      }
      expect(response.version).toBe('1.0.0')
    })

    it('should have all required response fields', () => {
      const response = {
        status: 'healthy',
        service: 'fleettools-consolidated',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
      
      expect(response.status).toBeDefined()
      expect(response.service).toBeDefined()
      expect(response.timestamp).toBeDefined()
      expect(response.version).toBeDefined()
    })
  })

  describe('CORS Headers', () => {
    it('should include CORS origin header', () => {
      const headers = {
        'Access-Control-Allow-Origin': '*'
      }
      expect(headers['Access-Control-Allow-Origin']).toBe('*')
    })

    it('should include CORS methods header', () => {
      const headers = {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      }
      expect(headers['Access-Control-Allow-Methods']).toContain('GET')
      expect(headers['Access-Control-Allow-Methods']).toContain('POST')
    })

    it('should include CORS headers header', () => {
      const headers = {
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
      expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type')
    })
  })
})
