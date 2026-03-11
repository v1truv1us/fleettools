// src/service-manager.ts
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from "node:fs";
import { join } from "node:path";
function getRunDir(projectRoot) {
  return join(projectRoot, ".fleet", "run");
}
function getLogsDir(projectRoot) {
  return join(projectRoot, ".fleet", "logs");
}
function ensureRuntimeDirectories(projectRoot) {
  const dirs = [getRunDir(projectRoot), getLogsDir(projectRoot)];
  dirs.forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
}
function writeServiceState(serviceState) {
  const runDir = getRunDir(serviceState.cwd);
  const stateFile = join(runDir, `${serviceState.service}.json`);
  const tempFile = join(runDir, `${serviceState.service}.json.tmp`);
  try {
    writeFileSync(tempFile, JSON.stringify(serviceState, null, 2), "utf-8");
    writeFileSync(stateFile, readFileSync(tempFile, "utf-8"));
    unlinkSync(tempFile);
  } catch (error) {
    try {
      unlinkSync(tempFile);
    } catch {}
    throw error;
  }
}
function readServiceState(service, projectRoot) {
  const runDir = getRunDir(projectRoot);
  const stateFile = join(runDir, `${service}.json`);
  if (!existsSync(stateFile)) {
    return null;
  }
  try {
    const content = readFileSync(stateFile, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function removeServiceState(service, projectRoot) {
  const runDir = getRunDir(projectRoot);
  const stateFile = join(runDir, `${service}.json`);
  if (existsSync(stateFile)) {
    unlinkSync(stateFile);
  }
}
function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
async function checkHealth(url, timeoutMs = 5000) {
  try {
    const controller = new AbortController;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "fleet-cli" }
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
function getLogFilePath(service, projectRoot) {
  const logsDir = getLogsDir(projectRoot);
  return join(logsDir, `${service}.log`);
}
function createServiceState(serviceName, runtime, pid, port, projectRoot, command, args) {
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
function acquireRunLock(projectRoot) {
  const lockFile = join(getRunDir(projectRoot), "fleet.lock");
  try {
    if (existsSync(lockFile)) {
      const content = readFileSync(lockFile, "utf-8");
      const lock = JSON.parse(content);
      const pid = lock.pid;
      if (pid && isPidAlive(pid)) {
        return { locked: true, pid };
      }
      unlinkSync(lockFile);
    }
    const lockData = {
      pid: process.pid,
      timestamp: new Date().toISOString()
    };
    writeFileSync(lockFile, JSON.stringify(lockData, null, 2), "utf-8");
    return { locked: false };
  } catch (error) {
    throw new Error(`Failed to acquire run lock: ${error}`);
  }
}
function releaseRunLock(projectRoot) {
  const lockFile = join(getRunDir(projectRoot), "fleet.lock");
  if (existsSync(lockFile)) {
    unlinkSync(lockFile);
  }
}
async function stopService(serviceName, projectRoot, timeoutMs = 5000, force = false) {
  const state = readServiceState(serviceName, projectRoot);
  if (!state) {
    return { success: true, service: serviceName };
  }
  if (!isPidAlive(state.pid)) {
    removeServiceState(serviceName, projectRoot);
    return { success: true, service: serviceName };
  }
  if (!force) {
    try {
      process.kill(state.pid, "SIGTERM");
      const startTime = Date.now();
      while (Date.now() - startTime < timeoutMs) {
        const isHealthy = await checkHealth(state.healthUrl, 1000);
        if (!isHealthy) {
          removeServiceState(serviceName, projectRoot);
          return { success: true, service: serviceName };
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      console.warn(`Service ${serviceName} did not stop gracefully within ${timeoutMs}ms, forcing...`);
    } catch (error) {
      console.warn(`Failed to send SIGTERM to ${serviceName}: ${error}`);
    }
  }
  try {
    process.kill(state.pid, "SIGKILL");
    await new Promise((resolve) => setTimeout(resolve, 1000));
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
export {
  writeServiceState,
  stopService,
  removeServiceState,
  releaseRunLock,
  readServiceState,
  isPidAlive,
  getLogFilePath,
  ensureRuntimeDirectories,
  createServiceState,
  checkHealth,
  acquireRunLock
};
