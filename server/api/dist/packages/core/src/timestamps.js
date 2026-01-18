"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nowIso = nowIso;
exports.toIso = toIso;
exports.fromUnixMs = fromUnixMs;
exports.fromIso = fromIso;
exports.toUnixMs = toUnixMs;
exports.nowUnixMs = nowUnixMs;
exports.formatDuration = formatDuration;
exports.durationBetween = durationBetween;
exports.addDuration = addDuration;
exports.isPast = isPast;
exports.isFuture = isFuture;
exports.formatDisplay = formatDisplay;
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
    return iso.replace('T', ' ').replace(/\.\d+Z$/, '');
}
//# sourceMappingURL=timestamps.js.map