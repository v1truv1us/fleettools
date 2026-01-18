"use strict";
/**
 * FleetTools Utility Functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = sleep;
exports.retry = retry;
exports.deepClone = deepClone;
exports.isValidJSON = isValidJSON;
exports.safeJSONStringify = safeJSONStringify;
exports.isValidFleetToolsId = isValidFleetToolsId;
exports.extractUUIDFromId = extractUUIDFromId;
exports.generateSafeFilename = generateSafeFilename;
exports.formatBytes = formatBytes;
exports.debounce = debounce;
exports.throttle = throttle;
/**
 * Sleep function for async delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Retry function with exponential backoff
 */
async function retry(fn, maxAttempts = 3, baseDelay = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await fn();
            return { success: true, data: result };
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt === maxAttempts) {
                break;
            }
            const delay = baseDelay * Math.pow(2, attempt - 1);
            await sleep(delay);
        }
    }
    return { success: false, error: lastError };
}
/**
 * Deep clone function
 */
function deepClone(obj) {
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
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
}
/**
 * Validate JSON string
 */
function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Safe JSON stringify with circular reference protection
 */
function safeJSONStringify(obj, space) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    }, space);
}
/**
 * Validate FleetTools ID format
 */
function isValidFleetToolsId(id) {
    const validPrefixes = ['msn-', 'wo-', 'chk-', 'evt-'];
    const prefix = id.match(/^([a-z]{2,4}-)/);
    return prefix ? validPrefixes.includes(prefix[1] || '') : false;
}
/**
 * Extract UUID from FleetTools ID
 */
function extractUUIDFromId(id) {
    const match = id.match(/^[a-z]{2,4}-(.+)$/);
    return match?.[1] ?? null;
}
/**
 * Generate a safe filename from a string
 */
function generateSafeFilename(str) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
/**
 * Convert bytes to human readable format
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
/**
 * Debounce function
 */
function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}
/**
 * Throttle function
 */
function throttle(fn, delay) {
    let lastCall = 0;
    return (...args) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            fn(...args);
        }
    };
}
//# sourceMappingURL=utils.js.map