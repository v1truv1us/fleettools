/**
 * Runtime Detection and Information
 * 
 * Utilities for detecting and managing different JavaScript runtimes
 * Supports Bun and Node.js
 */

import { platform, arch, release } from 'node:os';
import { createRequire } from 'node:module';

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
export function detectRuntime(): RuntimeType {
  // Check for Bun first (it has global.Bun)
  if (typeof globalThis.Bun !== 'undefined') {
    return 'bun';
  }
  
  // Check for Node.js
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    return 'node';
  }
  
  return 'unknown';
}

/**
 * Get detailed runtime information
 */
export function getRuntimeInfo(): RuntimeInfo {
  const type = detectRuntime();
  let version = 'unknown';
  let supported = false;

  switch (type) {
    case 'bun':
      version = (globalThis.Bun as any).version || 'unknown';
      supported = true; // Bun 1.0+ is supported
      break;
    case 'node':
      version = process.versions.node || 'unknown';
      const majorVersion = parseInt(version.split('.')[0], 10);
      supported = majorVersion >= 18; // Node.js 18+ is supported
      break;
    default:
      supported = false;
  }

  return {
    type,
    version,
    platform: platform(),
    arch: arch(),
    supported,
    isBun: type === 'bun',
    isNode: type === 'node'
  };
}

/**
 * Check if the current runtime is supported
 */
export function isSupportedRuntime(): boolean {
  return getRuntimeInfo().supported;
}

/**
 * Get the preferred runtime for the current platform
 * Defaults to Bun, falls back to Node.js
 */
export function getPreferredRuntime(): 'bun' | 'node' {
  const info = getRuntimeInfo();
  
  if (info.isBun && info.supported) {
    return 'bun';
  }
  
  if (info.isNode && info.supported) {
    return 'node';
  }
  
  // Default to bun for new installations
  return 'bun';
}

/**
 * Check if we're running in a development environment
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
}

/**
 * Get the appropriate executable for the preferred runtime
 */
export function getRuntimeExecutable(): string {
  const preferred = getPreferredRuntime();
  return preferred;
}

/**
 * Create a require function that works across runtimes
 */
export function createCrossRuntimeRequire() {
  try {
    return createRequire(import.meta.url);
  } catch {
    // Fallback for environments where createRequire might not work
    return (id: string) => {
      throw new Error(`Cannot require module: ${id}`);
    };
  }
}