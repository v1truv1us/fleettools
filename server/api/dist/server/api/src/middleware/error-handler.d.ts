export declare class HttpError extends Error {
    status: number;
    details?: any | undefined;
    constructor(status: number, message: string, details?: any | undefined);
}
export declare function errorHandler(error: unknown): Response;
export declare function withErrorHandler(handler: (request: Request) => Promise<Response>): (request: Request) => Promise<Response>;
//# sourceMappingURL=error-handler.d.ts.map