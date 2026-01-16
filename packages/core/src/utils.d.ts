/**
 * FleetTools Utility Functions
 */
import type { MissionId, WorkOrderId, CheckpointId, EventId } from './ids.js';
import type { Result } from './types.js';
/**
 * Sleep function for async delays
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Retry function with exponential backoff
 */
export declare function retry<T>(fn: () => Promise<T>, maxAttempts?: number, baseDelay?: number): Promise<Result<T>>;
/**
 * Deep clone function
 */
export declare function deepClone<T>(obj: T): T;
/**
 * Validate JSON string
 */
export declare function isValidJSON(str: string): boolean;
/**
 * Safe JSON stringify with circular reference protection
 */
export declare function safeJSONStringify(obj: unknown, space?: number): string;
/**
 * Validate FleetTools ID format
 */
export declare function isValidFleetToolsId(id: string): id is MissionId | WorkOrderId | CheckpointId | EventId;
/**
 * Extract UUID from FleetTools ID
 */
export declare function extractUUIDFromId(id: string): string | null;
/**
 * Generate a safe filename from a string
 */
export declare function generateSafeFilename(str: string): string;
/**
 * Convert bytes to human readable format
 */
export declare function formatBytes(bytes: number, decimals?: number): string;
/**
 * Debounce function
 */
export declare function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void;
/**
 * Throttle function
 */
export declare function throttle<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void;
//# sourceMappingURL=utils.d.ts.map