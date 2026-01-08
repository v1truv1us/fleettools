
export class MockRequest {
  url: string
  method: string
  headers: Record<string, string>
  private _body: any
  private _jsonCache: any = null

  constructor(options: {
    url: string
    method?: string
    headers?: Record<string, string>
    body?: any
  }) {
    this.url = options.url
    this.method = options.method || 'GET'
    this.headers = options.headers || { 'Content-Type': 'application/json' }
    this._body = options.body
  }

  async json(): Promise<any> {
    if (this._jsonCache !== null) {
      return this._jsonCache
    }
    if (this._body === undefined || this._body === null) {
      this._jsonCache = null
    } else if (typeof this._body === 'string') {
      this._jsonCache = JSON.parse(this._body)
    } else {
      this._jsonCache = this._body
    }
    return this._jsonCache
  }

  text(): Promise<string> {
    if (typeof this._body === 'string') {
      return Promise.resolve(this._body)
    }
    if (this._body === undefined || this._body === null) {
      return Promise.resolve('')
    }
    return Promise.resolve(JSON.stringify(this._body))
  }
}

export class MockResponse {
  status: number
  headers: Record<string, string>
  private _body: any

  constructor(body: any, options: { status?: number; headers?: Record<string, string> } = {}) {
    this._body = body
    this.status = options.status || 200
    this.headers = options.headers || { 'Content-Type': 'application/json' }
  }

  static json(data: any, options: { status?: number } = {}): MockResponse {
    return new MockResponse(data, {
      status: options.status || 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  static error(message: string, status: number = 500): MockResponse {
    return new MockResponse({ error: message }, { status })
  }

  static notFound(message: string = 'Not found'): MockResponse {
    return MockResponse.error(message, 404)
  }

  static badRequest(message: string = 'Bad request'): MockResponse {
    return MockResponse.error(message, 400)
  }

  static text(text: string, status: number = 200): MockResponse {
    return new MockResponse(text, {
      status,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  async json(): Promise<any> {
    if (typeof this._body === 'string') {
      return JSON.parse(this._body)
    }
    return this._body
  }

  get data(): any {
    return this._body
  }
}

export function createMockRequest(url: string, options: {
  method?: string
  headers?: Record<string, string>
  body?: any
} = {}): MockRequest {
  return new MockRequest({ url, ...options })
}

export function mockGet(url: string, headers?: Record<string, string>): MockRequest {
  return createMockRequest(url, { method: 'GET', headers })
}

export function mockPost(url: string, body: any, headers?: Record<string, string>): MockRequest {
  return createMockRequest(url, { method: 'POST', body, headers })
}

export function mockPatch(url: string, body: any, headers?: Record<string, string>): MockRequest {
  return createMockRequest(url, { method: 'PATCH', body, headers })
}

export function mockDelete(url: string, headers?: Record<string, string>): MockRequest {
  return createMockRequest(url, { method: 'DELETE', headers })
}

export function parseMockUrl(url: string): { path: string; params: Record<string, string> } {
  const urlObj = new URL(url, 'http://localhost')
  const path = urlObj.pathname
  const params: Record<string, string> = {}
  
  const pathParts = path.split('/')
  const searchParams = urlObj.searchParams
  
  for (const [key, value] of searchParams) {
    params[key] = value
  }
  
  return { path, params }
}
