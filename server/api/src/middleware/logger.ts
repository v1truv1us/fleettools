

export function requestLogger() {
  return async (request: Request, next: (request: Request) => Promise<Response>): Promise<Response> => {
    const start = Date.now();
    const url = new URL(request.url);
    const method = request.method;
    
    console.log(`[${new Date().toISOString()}] ${method} ${url.pathname}`);
    
    try {
      const response = await next(request);
      const duration = Date.now() - start;
      const status = response.status;
      
      console.log(`[${new Date().toISOString()}] ${method} ${url.pathname} ${status} ${duration}ms`);
      
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`[${new Date().toISOString()}] ${method} ${url.pathname} ERROR ${duration}ms:`, error);
      throw error;
    }
  };
}

export function logRequest(req: Request) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = new URL(req.url);
  console.log(`[${timestamp}] ${method} ${url.pathname}`);
  return { timestamp, method, path: url.pathname };
}

export function logResponse(timestamp: string, method: string, path: string, status: number, duration: number) {
  console.log(`[${new Date().toISOString()}] ${method} ${path} ${status} ${duration}ms`);
}
