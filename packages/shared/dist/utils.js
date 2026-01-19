/**
 * General Utilities
 *
 * Shared utility functions for FleetTools
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
/**
 * Color utilities
 */
export const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
};
/**
 * Simple color formatter (fallback when chalk not available)
 */
export function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}
/**
 * Check if a command exists in PATH
 */
export function commandExists(command) {
    try {
        const { execSync } = require('node:child_process');
        execSync(`which ${command}`, { stdio: 'ignore' });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Find a file in parent directories
 */
export function findUp(filename, cwd = process.cwd()) {
    let currentDir = cwd;
    while (currentDir !== '/') {
        const filePath = join(currentDir, filename);
        if (existsSync(filePath)) {
            return filePath;
        }
        currentDir = resolve(currentDir, '..');
    }
    return null;
}
/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Retry an async function with exponential backoff
 */
export async function retry(fn, maxAttempts = 3, baseDelay = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxAttempts) {
                throw lastError;
            }
            const delay = baseDelay * Math.pow(2, attempt - 1);
            await sleep(delay);
        }
    }
    throw lastError;
}
/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
/**
 * Format duration to human readable string
 */
export function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0)
        return `${days}d ${hours % 24}h`;
    if (hours > 0)
        return `${hours}h ${minutes % 60}m`;
    if (minutes > 0)
        return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}
/**
 * Generate a random ID
 */
export function generateId(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
/**
 * Deep clone an object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
}
/**
 * Check if a value is a promise
 */
export function isPromise(value) {
    return value !== null && value !== undefined && typeof value.then === 'function';
}
/**
 * Create a simple EventEmitter
 */
export class FleetEventEmitter {
    events = {};
    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }
    off(event, listener) {
        if (!this.events[event])
            return;
        const index = this.events[event].indexOf(listener);
        if (index > -1) {
            this.events[event].splice(index, 1);
        }
    }
    emit(event, ...args) {
        if (!this.events[event])
            return;
        this.events[event].forEach(listener => {
            try {
                listener(...args);
            }
            catch (error) {
                console.error(`Error in event listener for '${event}':`, error);
            }
        });
    }
    removeAllListeners(event) {
        if (event) {
            delete this.events[event];
        }
        else {
            this.events = {};
        }
    }
}
//# sourceMappingURL=utils.js.map