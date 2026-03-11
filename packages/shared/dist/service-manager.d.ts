/**
 * Service Management Utilities
 *
 * Utilities for managing FleetTools service processes, state, and lifecycle
 */
export interface ServiceState {
    service: 'api' | 'squawk';
    runtime: 'consolidated' | 'split';
    pid: number;
    pgid?: number;
    port: number;
    healthUrl: string;
    startedAt: string;
    command: string;
    args: string[];
    logFile: string;
    cwd: string;
}
export interface ProcessManagerOptions {
    projectRoot: string;
    serviceName: 'api' | 'squawk';
    runtime: 'consolidated' | 'split';
}
/**
 * Ensure runtime directories exist
 */
export declare function ensureRuntimeDirectories(projectRoot: string): void;
/**
 * Write service state file atomically
 */
export declare function writeServiceState(serviceState: ServiceState): void;
/**
 * Read service state file
 */
export declare function readServiceState(service: 'api' | 'squawk', projectRoot: string): ServiceState | null;
/**
 * Remove service state file
 */
export declare function removeServiceState(service: 'api' | 'squawk', projectRoot: string): void;
/**
 * Check if a PID is alive
 */
export declare function isPidAlive(pid: number): boolean;
/**
 * Check health endpoint with timeout
 */
export declare function checkHealth(url: string, timeoutMs?: number): Promise<boolean>;
/**
 * Get log file path for a service
 */
export declare function getLogFilePath(service: 'api' | 'squawk', projectRoot: string): string;
/**
 * Create service state from process info
 */
export declare function createServiceState(serviceName: 'api' | 'squawk', runtime: 'consolidated' | 'split', pid: number, port: number, projectRoot: string, command: string, args: string[]): ServiceState;
/**
 * Acquire exclusive lock for fleet operations
 */
export declare function acquireRunLock(projectRoot: string): {
    locked: boolean;
    pid?: number;
};
/**
 * Release run lock
 */
export declare function releaseRunLock(projectRoot: string): void;
/**
 * Stop a service by PID with graceful shutdown and fallback to force kill
 */
export declare function stopService(serviceName: 'api' | 'squawk', projectRoot: string, timeoutMs?: number, force?: boolean): Promise<{
    success: boolean;
    service?: string;
    error?: string;
}>;
//# sourceMappingURL=service-manager.d.ts.map