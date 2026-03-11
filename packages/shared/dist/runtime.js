// src/runtime.ts
import { platform, arch } from "node:os";
import { createRequire } from "node:module";
function detectRuntime() {
  if (typeof globalThis.Bun !== "undefined") {
    return "bun";
  }
  if (typeof process !== "undefined" && process.versions && process.versions.node) {
    return "node";
  }
  return "unknown";
}
function getRuntimeInfo() {
  const type = detectRuntime();
  let version = "unknown";
  let supported = false;
  switch (type) {
    case "bun":
      version = globalThis.Bun?.version || "unknown";
      supported = true;
      break;
    case "node":
      version = process.versions.node || "unknown";
      const majorVersion = parseInt(version.split(".")[0], 10);
      supported = majorVersion >= 18;
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
    isBun: type === "bun",
    isNode: type === "node"
  };
}
function isSupportedRuntime() {
  return getRuntimeInfo().supported;
}
function getPreferredRuntime() {
  const info = getRuntimeInfo();
  if (info.isBun && info.supported) {
    return "bun";
  }
  if (info.isNode && info.supported) {
    return "node";
  }
  return "bun";
}
function isDevelopment() {
  return true;
}
function getRuntimeExecutable() {
  const preferred = getPreferredRuntime();
  return preferred;
}
function createCrossRuntimeRequire() {
  try {
    return createRequire(import.meta.url);
  } catch {
    return (id) => {
      throw new Error(`Cannot require module: ${id}`);
    };
  }
}
export {
  isSupportedRuntime,
  isDevelopment,
  getRuntimeInfo,
  getRuntimeExecutable,
  getPreferredRuntime,
  detectRuntime,
  createCrossRuntimeRequire
};
