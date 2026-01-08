/**
 * Test Server Helper
 * Provides test server setup and teardown for integration testing
 */

import { spawn, ChildProcess } from 'child_process'
import http from 'http'
import path from 'path'
import { generateTestId } from '../setup'

// Test server configuration
export const TEST_SERVER_PORT = 3002
export const TEST_SERVER_HOST = 'localhost'
export const TEST_SERVER_URL = `http://${TEST_SERVER_HOST}:${TEST_SERVER_PORT}`

// Server process reference
let serverProcess: ChildProcess | null = null
let serverReady = false
let serverStartTime = 0

/**
 * Health check for the test server
 * @param timeout - Maximum time to wait for server to respond
 * @returns Promise that resolves when server is healthy
 */
export async function waitForServerHealth(timeout = 30000): Promise<void> {
  const startTime = Date.now()
  
  return new Promise((resolve, reject) => {
    const checkHealth = () => {
      const req = http.request({
        hostname: TEST_SERVER_HOST,
        port: TEST_SERVER_PORT,
        path: '/health',
        method: 'GET',
        timeout: 5000,
      }, (res) => {
        if (res.statusCode === 200) {
          serverReady = true
          resolve()
        } else {
          if (Date.now() - startTime < timeout) {
            setTimeout(checkHealth, 1000)
          } else {
            reject(new Error(`Server health check failed with status: ${res.statusCode}`))
          }
        }
      })

      req.on('error', (err) => {
        if (Date.now() - startTime < timeout) {
          setTimeout(checkHealth, 1000)
        } else {
          reject(new Error(`Server health check error: ${err.message}`))
        }
      })

      req.on('timeout', () => {
        req.destroy()
        if (Date.now() - startTime < timeout) {
          setTimeout(checkHealth, 1000)
        } else {
          reject(new Error('Server health check timeout'))
        }
      })

      req.end()
    }

    checkHealth()
  })
}

/**
 * Start the test server
 * @param options - Server startup options
 * @returns Promise that resolves when server is ready
 */
export async function startTestServer(options: {
  env?: Record<string, string>
  timeout?: number
} = {}): Promise<void> {
  if (serverProcess && serverReady) {
    // Server is already running and ready
    return
  }

  if (serverProcess) {
    // Server process exists but not ready, wait for it
    await waitForServerHealth(options.timeout)
    return
  }

  const serverPath = path.join(process.cwd(), 'server', 'api', 'src', 'index.ts')
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: TEST_SERVER_PORT.toString(),
    HOST: TEST_SERVER_HOST,
    DATABASE_URL: ':memory:',
    LOG_LEVEL: 'error', // Reduce log noise in tests
    ...options.env
  }

  return new Promise((resolve, reject) => {
    try {
      // Start the server using Bun
      serverProcess = spawn('bun', ['run', serverPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
        cwd: process.cwd()
      })

      serverStartTime = Date.now()

      serverProcess.on('error', (err) => {
        serverProcess = null
        reject(new Error(`Failed to start server: ${err.message}`))
      })

      serverProcess.on('exit', (code, signal) => {
        serverProcess = null
        serverReady = false
        if (code !== 0 && signal !== 'SIGTERM') {
          console.warn(`Server exited with code ${code}, signal ${signal}`)
        }
      })

      // Capture server output for debugging
      if (serverProcess.stdout) {
        serverProcess.stdout.on('data', (data) => {
          const output = data.toString().trim()
          if (output && process.env.DEBUG_TESTS) {
            console.log('[SERVER STDOUT]', output)
          }
        })
      }

      if (serverProcess.stderr) {
        serverProcess.stderr.on('data', (data) => {
          const output = data.toString().trim()
          if (output && process.env.DEBUG_TESTS) {
            console.error('[SERVER STDERR]', output)
          }
        })
      }

      // Wait for server to be healthy
      waitForServerHealth(options.timeout)
        .then(resolve)
        .catch(reject)

    } catch (err) {
      reject(new Error(`Failed to spawn server process: ${err}`))
    }
  })
}

/**
 * Stop the test server
 * @param timeout - Maximum time to wait for server to stop
 * @returns Promise that resolves when server is stopped
 */
export async function stopTestServer(timeout = 10000): Promise<void> {
  if (!serverProcess) {
    return // Server is not running
  }

  return new Promise((resolve) => {
    const startTime = Date.now()

    const checkProcess = () => {
      if (!serverProcess) {
        resolve()
        return
      }

      try {
        // Check if process is still running
        serverProcess.kill(0) // Signal 0 just checks if process exists
      } catch {
        // Process is dead
        serverProcess = null
        serverReady = false
        resolve()
        return
      }

      // Process is still running, try to kill it
      if (Date.now() - startTime > timeout) {
        // Force kill if timeout
        serverProcess.kill('SIGKILL')
        serverProcess = null
        serverReady = false
        resolve()
        return
      }

      // Try graceful shutdown first
      serverProcess.kill('SIGTERM')
      setTimeout(checkProcess, 1000)
    }

    checkProcess()
  })
}

/**
 * Restart the test server
 * @param options - Server startup options
 * @returns Promise that resolves when server is ready
 */
export async function restartTestServer(options: {
  env?: Record<string, string>
  timeout?: number
} = {}): Promise<void> {
  await stopTestServer()
  await startTestServer(options)
}

/**
 * Get server uptime in milliseconds
 * @returns Server uptime or 0 if server is not running
 */
export function getServerUptime(): number {
  return serverReady && serverStartTime > 0 ? Date.now() - serverStartTime : 0
}

/**
 * Check if server is ready
 * @returns True if server is ready to accept requests
 */
export function isServerReady(): boolean {
  return serverReady
}

/**
 * Get server process information
 * @returns Process info or null if server is not running
 */
export function getServerInfo(): {
  pid?: number
  uptime: number
  ready: boolean
  port: number
  host: string
} | null {
  if (!serverProcess) {
    return null
  }

  return {
    pid: serverProcess.pid,
    uptime: getServerUptime(),
    ready: serverReady,
    port: TEST_SERVER_PORT,
    host: TEST_SERVER_HOST
  }
}

/**
 * Test server health endpoint
 * @returns Promise with health check result
 */
export async function checkServerHealth(): Promise<{
  status: 'healthy' | 'unhealthy'
  response?: any
  error?: string
}> {
  try {
    // Use AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${TEST_SERVER_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      return {
        status: 'healthy',
        response: data
      }
    } else {
      return {
        status: 'unhealthy',
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
  } catch (err) {
    return {
      status: 'unhealthy',
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

/**
 * Test server setup/teardown utilities for test files
 */
export class TestServerManager {
  private started = false

  /**
   * Setup server before tests
   */
  async setup(options?: { env?: Record<string, string>; timeout?: number }): Promise<void> {
    if (!this.started) {
      await startTestServer(options)
      this.started = true
    }
  }

  /**
   * Teardown server after tests
   */
  async teardown(): Promise<void> {
    if (this.started) {
      await stopTestServer()
      this.started = false
    }
  }

  /**
   * Restart server (useful for test isolation)
   */
  async restart(options?: { env?: Record<string, string>; timeout?: number }): Promise<void> {
    await restartTestServer(options)
  }

  /**
   * Get current server status
   */
  get status() {
    return {
      started: this.started,
      ready: isServerReady(),
      info: getServerInfo()
    }
  }
}

/**
 * Default server manager instance for use in tests
 */
export const testServer = new TestServerManager()

/**
 * JUnit-style beforeAll/afterAll helpers for test files
 */
export const serverTestUtils = {
  /**
   * Setup server before all tests
   * Usage: beforeAll(async () => await serverTestUtils.beforeAll())
   */
  beforeAll: (options?: { env?: Record<string, string>; timeout?: number }) => 
    async () => {
      await testServer.setup(options)
    },

  /**
   * Teardown server after all tests
   * Usage: afterAll(async () => await serverTestUtils.afterAll())
   */
  afterAll: () => 
    async () => {
      await testServer.teardown()
    },

  /**
   * Restart server between tests
   * Usage: beforeEach(async () => await serverTestUtils.beforeEach())
   */
  beforeEach: (options?: { env?: Record<string, string>; timeout?: number }) => 
    async () => {
      await testServer.restart(options)
    }
}