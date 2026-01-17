// @bun
// src/ids.ts
import { randomUUID } from "crypto";
var ID_PREFIXES = {
  MISSION: "msn-",
  WORK_ORDER: "wo-",
  CHECKPOINT: "chk-",
  EVENT: "evt-"
};
var FLEETTOOLS_VERSION = "0.1.0";
function extractPrefix(id) {
  const match = id.match(/^([a-z]{2,4}-)/);
  return match?.[1] ?? null;
}
function isValidPrefixId(id, prefix) {
  return id.startsWith(prefix) && extractPrefix(id) === prefix;
}
function generateUUID() {
  return randomUUID();
}
function generateMissionId() {
  return `msn-${generateUUID()}`;
}
function generateWorkOrderId() {
  return `wo-${generateUUID()}`;
}
function generateCheckpointId() {
  return `chk-${generateUUID()}`;
}
function generateEventId() {
  return `evt-${generateUUID()}`;
}
function generateTimestamp() {
  return new Date().toISOString();
}
function isMissionId(id) {
  return isValidPrefixId(id, ID_PREFIXES.MISSION);
}
function isWorkOrderId(id) {
  return isValidPrefixId(id, ID_PREFIXES.WORK_ORDER);
}
function isCheckpointId(id) {
  return isValidPrefixId(id, ID_PREFIXES.CHECKPOINT);
}
function isEventId(id) {
  return isValidPrefixId(id, ID_PREFIXES.EVENT);
}
// src/timestamps.ts
function nowIso() {
  return new Date().toISOString();
}
function toIso(date) {
  return date.toISOString();
}
function fromUnixMs(ms) {
  return new Date(ms).toISOString();
}
function fromIso(iso) {
  return new Date(iso);
}
function toUnixMs(date) {
  return date.getTime();
}
function nowUnixMs() {
  return Date.now();
}
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const h = hours;
  const m = minutes % 60;
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}
function durationBetween(startIso, endIso) {
  const start = fromIso(startIso);
  const end = fromIso(endIso);
  return end.getTime() - start.getTime();
}
function addDuration(iso, ms) {
  const date = fromIso(iso);
  date.setTime(date.getTime() + ms);
  return toIso(date);
}
function isPast(iso) {
  return fromIso(iso).getTime() < Date.now();
}
function isFuture(iso) {
  return fromIso(iso).getTime() > Date.now();
}
function formatDisplay(iso) {
  return iso.replace("T", " ").replace(/\.\d+Z$/, "");
}
// src/utils.ts
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function retry(fn, maxAttempts = 3, baseDelay = 1000) {
  let lastError;
  for (let attempt = 1;attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return { success: true, data: result };
    } catch (error) {
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
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item));
  }
  if (typeof obj === "object") {
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
function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}
function safeJSONStringify(obj, space) {
  const seen = new WeakSet;
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }
    return value;
  }, space);
}
function isValidFleetToolsId(id) {
  const validPrefixes = ["msn-", "wo-", "chk-", "evt-"];
  const prefix = id.match(/^([a-z]{2,4}-)/);
  return prefix ? validPrefixes.includes(prefix[1] || "") : false;
}
function extractUUIDFromId(id) {
  const match = id.match(/^[a-z]{2,4}-(.+)$/);
  return match?.[1] ?? null;
}
function generateSafeFilename(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0)
    return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
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
export {
  toUnixMs,
  toIso,
  throttle,
  sleep,
  safeJSONStringify,
  retry,
  nowUnixMs,
  nowIso,
  isWorkOrderId,
  isValidPrefixId,
  isValidJSON,
  isValidFleetToolsId,
  isPast,
  isMissionId,
  isFuture,
  isEventId,
  isCheckpointId,
  generateWorkOrderId,
  generateTimestamp,
  generateSafeFilename,
  generateMissionId,
  generateEventId,
  generateCheckpointId,
  fromUnixMs,
  fromIso,
  formatDuration,
  formatDisplay,
  formatBytes,
  extractUUIDFromId,
  extractPrefix,
  durationBetween,
  deepClone,
  debounce,
  addDuration,
  ID_PREFIXES,
  FLEETTOOLS_VERSION
};
