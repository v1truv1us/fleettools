/**
 * Service Management Utilities
 * 
 * Utilities for managing FleetTools service processes, state, and lifecycle
 */

import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadProjectConfig } from './config.js';

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
 * Get the .fleet/run directory path
 */
function getRunDir(projectRoot: string): string {
  return join(projectRoot, '.fleet', 'run');
}

/**
 * Get the .fleet/logs directory path
 */
function getLogsDir(projectRoot: string): string {
  return join(projectRoot, '.fleet', 'logs');
}

/**
 * Ensure runtime directories exist
 */
export function ensureRuntimeDirectories(projectRoot: string): void {
  const dirs = [getRunDir(projectRoot), getLogsDir(projectRoot)];
  
  dirs.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Write service state file atomically
 */
export function writeServiceState(serviceState: ServiceState): void {
  const runDir = getRunDir(serviceState.cwd);
  const stateFile = join(runDir, `${serviceState.service}.json`);
  const tempFile = join(runDir, `${serviceState.service}.json.tmp`);
  
  try {
    writeFileSync(tempFile, JSON.stringify(serviceState, null, 2), 'utf-8');
    // Atomic rename
    writeFileSync(stateFile, readFileSync(tempFile, 'utf-8'));
    unlinkSync(tempFile);
  } catch (error) {
    // Clean up temp file on error
    try {
      unlinkSync(tempFile);
    } catch {}
    throw error;
  }
}

/**
 * Read service state file
 */
export function readServiceState(service: 'api' | 'squawk', projectRoot: string): ServiceState | null {
  const runDir = getRunDir(projectRoot);
  const stateFile = join(runDir, `${service}.json`);
  
  if (!existsSync(stateFile)) {
    return null;
  }
  
  try {
    const content = readFileSync(stateFile, 'utf-8');
    return JSON.parse(content) as ServiceState;
  } catch {
    return null;
  }
}

/**
 * Remove service state file
 */
export function removeServiceState(service: 'api' | 'squawk', projectRoot: string): void {
  const runDir = getRunDir(projectRoot);
  const stateFile = join(runDir, `${service}.json`);
  
  if (existsSync(stateFile)) {
    unlinkSync(stateFile);
  }
}

/**
 * Check if a PID is alive
 */
export function isPidAlive(pid: number): boolean {
  try {
    // Sending signal 0 to a process checks if it exists
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check health endpoint with timeout
 */
export async function checkHealth(url: string, timeoutMs = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'fleet-cli' }
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get log file path for a service
 */
export function getLogFilePath(service: 'api' | 'squawk', projectRoot: string): string {
  const logsDir = getLogsDir(projectRoot);
  return join(logsDir, `${service}.log`);
}

/**
 * Create service state from process info
 */
export function createServiceState(
  serviceName: 'api' | 'squawk',
  runtime: 'consolidated' | 'split',
  pid: number,
  port: number,
  projectRoot: string,
  command: string,
  args: string[]
): ServiceState {
  return {
    service: serviceName,
    runtime,
    pid,
    port,
    healthUrl: `http://127.0.0.1:${port}/health`,
    startedAt: new Date().toISOString(),
    command,
    args,
    logFile: getLogFilePath(serviceName, projectRoot),
    cwd: projectRoot
  };
}

/**
 * Acquire exclusive lock for fleet operations
 */
export function acquireRunLock(projectRoot: string): { locked: boolean; pid?: number } {
  const lockFile = join(getRunDir(projectRoot), 'fleet.lock');
  
  try {
    if (existsSync(lockFile)) {
      const content = readFileSync(lockFile, 'utf-8');
      const lock = JSON.parse(content);
      const pid = lock.pid;
      
      // Check if locking process is still alive
      if (pid && isPidAlive(pid)) {
        return { locked: true, pid };
      }
      
      // Stale lock - remove it
      unlinkSync(lockFile);
    }
    
    // Create new lock
    const lockData = {
      pid: process.pid,
      timestamp: new Date().toISOString()
    };
    
    writeFileSync(lockFile, JSON.stringify(lockData, null, 2), 'utf-8');
    return { locked: false };
  } catch (error) {
    throw new Error(`Failed to acquire run lock: ${error}`);
  }
}

/**
 * Release run lock
 */
export function releaseRunLock(projectRoot: string): void {
  const lockFile = join(getRunDir(projectRoot), 'fleet.lock');
  
  if (existsSync(lockFile)) {
    unlinkSync(lockFile);
  }
}

/**
 * Stop a service by PID with graceful shutdown and fallback to force kill
 */
export async function stopService(
  serviceName: 'api' | 'squawk',
  projectRoot: string,
  timeoutMs: number = 5000,
  force: boolean = false
): Promise<{ success: boolean; service?: string; error?: string }> {
  const state = readServiceState(serviceName, projectRoot);
  
  if (!state) {
    return { success: true, service: serviceName }; // Already stopped
  }
  
  if (!isPidAlive(state.pid)) {
    // Process is dead, clean up state
    removeServiceState(serviceName, projectRoot);
    return { success: true, service: serviceName };
  }
  
  // Try graceful shutdown first
  if (!force) {
    try {
      // Send SIGTERM for graceful shutdown
      process.kill(state.pid, 'SIGTERM');
      
      // Wait for graceful shutdown with health check timeout
      const startTime = Date.now();
      while (Date.now() - startTime < timeoutMs) {
        const isHealthy = await checkHealth(state.healthUrl, 1000);
        if (!isHealthy) {
          // Service stopped gracefully
          removeServiceState(serviceName, projectRoot);
          return { success: true, service: serviceName };
        }
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Poll every 500ms
      }
      
      // Timeout reached, force kill
      console.warn(`Service ${serviceName} did not stop gracefully within ${timeoutMs}ms, forcing...`);
    } catch (error) {
      console.warn(`Failed to send SIGTERM to ${serviceName}: ${error}`);
    }
  }
  
  // Force kill
  try {
    process.kill(state.pid, 'SIGKILL');
    
    // Wait a moment for process to actually die
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify it's actually dead
    if (!isPidAlive(state.pid)) {
      removeServiceState(serviceName, projectRoot);
      return { success: true, service: serviceName };
    } else {
      return { 
        success: false, 
        error: `Process ${state.pid} refused to terminate` 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}