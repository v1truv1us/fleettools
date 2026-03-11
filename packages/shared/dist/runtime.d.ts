/**
 * Runtime Detection and Information
 *
 * Utilities for detecting and managing different JavaScript runtimes
 * Supports Bun and Node.js
 */
export type RuntimeType = 'bun' | 'node' | 'unknown';
export interface RuntimeInfo {
    type: RuntimeType;
    version: string;
    platform: string;
    arch: string;
    supported: boolean;
    isBun: boolean;
    isNode: boolean;
}
/**
 * Detect the current JavaScript runtime
 */
export declare function detectRuntime(): RuntimeType;
/**
 * Get detailed runtime information
 */
export declare function getRuntimeInfo(): RuntimeInfo;
/**
 * Check if the current runtime is supported
 */
export declare function isSupportedRuntime(): boolean;
/**
 * Get the preferred runtime for the current platform
 * Defaults to Bun, falls back to Node.js
 */
export declare function getPreferredRuntime(): 'bun' | 'node';
/**
 * Check if we're running in a development environment
 */
export declare function isDevelopment(): boolean;
/**
 * Get the appropriate executable for the preferred runtime
 */
export declare function getRuntimeExecutable(): string;
/**
 * Create a require function that works across runtimes
 */
export declare function createCrossRuntimeRequire(): NodeJS.Require | ((id: string) => never);
//# sourceMappingURL=runtime.d.ts.map