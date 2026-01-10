export function nowIso(): string {
  return new Date().toISOString();
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function fromUnixMs(ms: number): string {
  return new Date(ms).toISOString();
}

export function fromIso(iso: string): Date {
  return new Date(iso);
}

export function toUnixMs(date: Date): number {
  return date.getTime();
}

export function nowUnixMs(): number {
  return Date.now();
}

export function formatDuration(ms: number): string {
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

export function durationBetween(startIso: string, endIso: string): number {
  const start = fromIso(startIso);
  const end = fromIso(endIso);
  return end.getTime() - start.getTime();
}

export function addDuration(iso: string, ms: number): string {
  const date = fromIso(iso);
  date.setTime(date.getTime() + ms);
  return toIso(date);
}

export function isPast(iso: string): boolean {
  return fromIso(iso).getTime() < Date.now();
}

export function isFuture(iso: string): boolean {
  return fromIso(iso).getTime() > Date.now();
}

export function formatDisplay(iso: string): string {
  return iso.replace('T', ' ').replace(/\.\d+Z$/, '');
}
