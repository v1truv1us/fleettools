// @ts-nocheck
// Error handling middleware

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function errorHandler(error: unknown): Response {
  const timestamp = new Date().toISOString();
  
  // Handle HttpError
  if (error instanceof HttpError) {
    console.error(`[${timestamp}] HTTP ${error.status}: ${error.message}`, error.details);
    return new Response(JSON.stringify({
      error: error.message,
      details: error.details,
      timestamp,
    }), {
      status: error.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Handle validation errors
  if (error instanceof SyntaxError && 'status' in error) {
    console.error(`[${timestamp}] JSON Parse Error:`, error.message);
    return new Response(JSON.stringify({
      error: 'Invalid JSON in request body',
      timestamp,
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Handle other errors
  console.error(`[${timestamp}] Internal Server Error:`, error);
  return new Response(JSON.stringify({
    error: 'Internal server error',
    message: error instanceof Error ? error.message : 'Unknown error',
    timestamp,
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function withErrorHandler(handler: (request: Request) => Promise<Response>): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      return errorHandler(error);
    }
  };
}
