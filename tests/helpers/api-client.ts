
import { TEST_SERVER_URL } from './test-server'

export interface ApiClientOptions {
  baseUrl?: string
  timeout?: number
  retries?: number
  retryDelay?: number
  debug?: boolean
}

export interface ApiResponse<T = any> {
  status: number
  data?: T
  error?: string
  headers?: Record<string, string>
}

export class ApiClient {
  private baseUrl: string
  private timeout: number
  private retries: number
  private retryDelay: number
  private debug: boolean

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || TEST_SERVER_URL
    this.timeout = options.timeout || 30000
    this.retries = options.retries || 3
    this.retryDelay = options.retryDelay || 1000
    this.debug = options.debug || false
  }

  private async request<T = any>(
    method: string,
    path: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const url = `${this.baseUrl}${path}`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...headers
        }

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        let data: any = undefined
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          try {
            data = await response.json()
          } catch {
          }
        }

        if (this.debug) {
          console.log(`[API] ${method} ${path} -> ${response.status}`)
        }

        return {
          status: response.status,
          data,
          headers: Object.fromEntries(response.headers.entries())
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))

        if (this.debug) {
          console.log(`[API] ${method} ${path} attempt ${attempt + 1} failed: ${lastError.message}`)
        }

        if (attempt < this.retries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay))
        }
      }
    }

    return {
      status: 0,
      error: lastError?.message || 'Unknown error'
    }
  }

  // ===== Work Orders API =====

  async createWorkOrder(data: {
    title: string
    description?: string
    priority?: string
    assigned_to?: string[]
  }): Promise<ApiResponse<any>> {
    return this.request('POST', '/api/v1/work-orders', data)
  }

  async getWorkOrders(): Promise<ApiResponse<any[]>> {
    return this.request('GET', '/api/v1/work-orders')
  }

  async getWorkOrder(id: string): Promise<ApiResponse<any>> {
    return this.request('GET', `/api/v1/work-orders/${id}`)
  }

  async updateWorkOrder(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request('PATCH', `/api/v1/work-orders/${id}`, data)
  }

  async deleteWorkOrder(id: string): Promise<ApiResponse<void>> {
    return this.request('DELETE', `/api/v1/work-orders/${id}`)
  }

  // ===== Mailbox API =====

  async appendEvents(mailboxId: string, events: any[]): Promise<ApiResponse<any>> {
    return this.request('POST', '/api/v1/mailbox/append', {
      mailbox_id: mailboxId,
      events
    })
  }

  async getMailboxEvents(mailboxId: string): Promise<ApiResponse<any[]>> {
    return this.request('GET', `/api/v1/mailbox/${mailboxId}/events`)
  }

  // ===== CTK (Concurrency Token Kit) API =====

  async reserveFile(filePath: string, specialistId: string, purpose?: string): Promise<ApiResponse<any>> {
    return this.request('POST', '/api/v1/ctk/reserve', {
      file: filePath,
      reserved_by: specialistId,
      purpose: purpose || 'edit',
      timeout_ms: 60000
    })
  }

  async releaseFile(reservationId: string): Promise<ApiResponse<any>> {
    return this.request('POST', '/api/v1/ctk/release', {
      id: reservationId
    })
  }

  async getReservations(): Promise<ApiResponse<any[]>> {
    return this.request('GET', '/api/v1/ctk/reservations')
  }

  // ===== Cursor API =====

  async advanceCursor(streamId: string, position: number): Promise<ApiResponse<any>> {
    return this.request('POST', '/api/v1/cursor/advance', {
      stream_id: streamId,
      position
    })
  }

  async getCursor(streamId: string): Promise<ApiResponse<any>> {
    return this.request('GET', `/api/v1/cursor/${streamId}`)
  }

  // ===== Lock API =====

  async acquireLock(filePath: string, specialistId: string, purpose?: string): Promise<ApiResponse<any>> {
    return this.request('POST', '/api/v1/locks/acquire', {
      file: filePath,
      reserved_by: specialistId,
      purpose: purpose || 'edit',
      timeout_ms: 60000
    })
  }

  async releaseLock(lockId: string): Promise<ApiResponse<any>> {
    return this.request('POST', '/api/v1/locks/release', {
      id: lockId
    })
  }

  async getLocks(): Promise<ApiResponse<any[]>> {
    return this.request('GET', '/api/v1/locks')
  }

  // ===== Coordinator API =====

  async getCoordinatorStatus(): Promise<ApiResponse<any>> {
    return this.request('GET', '/api/v1/coordinator/status')
  }

  async getCoordinatorHealth(): Promise<ApiResponse<any>> {
    return this.request('GET', '/health')
  }

  // ===== Tech Orders API =====

  async createTechOrder(data: {
    name: string
    pattern: string
    context?: string
  }): Promise<ApiResponse<any>> {
    return this.request('POST', '/api/v1/tech-orders', data)
  }

  async getTechOrders(): Promise<ApiResponse<any[]>> {
    return this.request('GET', '/api/v1/tech-orders')
  }

  async getTechOrder(id: string): Promise<ApiResponse<any>> {
    return this.request('GET', `/api/v1/tech-orders/${id}`)
  }

  async updateTechOrder(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request('PATCH', `/api/v1/tech-orders/${id}`, data)
  }

  async deleteTechOrder(id: string): Promise<ApiResponse<void>> {
    return this.request('DELETE', `/api/v1/tech-orders/${id}`)
  }

  // ===== Utility Methods =====

  isSuccess(response: ApiResponse): boolean {
    return response.status >= 200 && response.status < 300
  }

  isClientError(response: ApiResponse): boolean {
    return response.status >= 400 && response.status < 500
  }

  isServerError(response: ApiResponse): boolean {
    return response.status >= 500 && response.status < 600
  }

  getErrorMessage(response: ApiResponse): string {
    if (response.error) {
      return response.error
    }
    if (response.data?.error) {
      return response.data.error
    }
    if (response.data?.message) {
      return response.data.message
    }
    return `HTTP ${response.status}`
  }
}

export function createApiClient(options?: ApiClientOptions): ApiClient {
  return new ApiClient(options)
}

export const apiClient = createApiClient()
