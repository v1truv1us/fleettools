export declare function requestLogger(): (request: Request, next: (request: Request) => Promise<Response>) => Promise<Response>;
export declare function logRequest(req: Request): {
    timestamp: string;
    method: string;
    path: string;
};
export declare function logResponse(timestamp: string, method: string, path: string, status: number, duration: number): void;
//# sourceMappingURL=logger.d.ts.map