export class HttpError extends Error {
    status;
    details;
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
        this.name = 'HttpError';
    }
}
export function errorHandler(error) {
    const timestamp = new Date().toISOString();
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
export function withErrorHandler(handler) {
    return async (request) => {
        try {
            return await handler(request);
        }
        catch (error) {
            return errorHandler(error);
        }
    };
}
//# sourceMappingURL=error-handler.js.map