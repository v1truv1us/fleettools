/**
 * General Utilities
 *
 * Shared utility functions for FleetTools
 */
/**
 * Color utilities
 */
export declare const colors: {
    reset: string;
    bright: string;
    dim: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    gray: string;
};
/**
 * Simple color formatter (fallback when chalk not available)
 */
export declare function colorize(text: string, color: keyof typeof colors): string;
/**
 * Check if a command exists in PATH
 */
export declare function commandExists(command: string): boolean;
/**
 * Find a file in parent directories
 */
export declare function findUp(filename: string, cwd?: string): string | null;
/**
 * Sleep for a specified number of milliseconds
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Retry an async function with exponential backoff
 */
export declare function retry<T>(fn: () => Promise<T>, maxAttempts?: number, baseDelay?: number): Promise<T>;
/**
 * Format bytes to human readable string
 */
export declare function formatBytes(bytes: number): string;
/**
 * Format duration to human readable string
 */
export declare function formatDuration(ms: number): string;
/**
 * Generate a random ID
 */
export declare function generateId(length?: number): string;
/**
 * Deep clone an object
 */
export declare function deepClone<T>(obj: T): T;
/**
 * Check if a value is a promise
 */
export declare function isPromise(value: any): value is Promise<any>;
/**
 * Create a simple EventEmitter
 */
export declare class FleetEventEmitter {
    private events;
    on(event: string, listener: Function): void;
    off(event: string, listener: Function): void;
    emit(event: string, ...args: any[]): void;
    removeAllListeners(event?: string): void;
}
//# sourceMappingURL=utils.d.ts.map