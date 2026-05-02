import { promises as fs } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { SteerError } from './errors.js';

export function validateSlug(slug: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new SteerError(`Invalid slug "${slug}". Use kebab-case letters/numbers only.`);
  }
  if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
    throw new SteerError(`Invalid slug "${slug}". Path traversal is not allowed.`);
  }
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export async function discoverProjectRoot(start = process.cwd()): Promise<string> {
  let current = resolve(start);
  while (true) {
    if (await pathExists(join(current, '.git'))) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  current = resolve(start);
  while (true) {
    if (await pathExists(join(current, 'package.json'))) return current;
    const parent = dirname(current);
    if (parent === current) return resolve(start);
    current = parent;
  }
}

export function changeDir(root: string, slug: string): string {
  validateSlug(slug);
  return join(root, 'specs', slug);
}

export async function inferSlug(root: string, explicit?: string): Promise<string> {
  if (explicit) {
    validateSlug(explicit);
    return explicit;
  }
  const cwd = resolve(process.cwd());
  const specsRoot = join(resolve(root), 'specs') + sep;
  if (cwd.startsWith(specsRoot)) {
    const rest = cwd.slice(specsRoot.length).split(sep)[0];
    if (rest) {
      validateSlug(rest);
      return rest;
    }
  }
  throw new SteerError('Change slug is required when not inside specs/<slug>.');
}

export async function writeTextAtomic(filePath: string, content: string): Promise<void> {
  await fs.mkdir(dirname(filePath), { recursive: true });
  const tmp = join(dirname(filePath), `.${filePath.split('/').pop()}.${process.pid}.${randomUUID()}.tmp`);
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, filePath);
}

export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  await writeTextAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function readTextIfExists(path: string): Promise<string> {
  if (!(await pathExists(path))) return '';
  return fs.readFile(path, 'utf8');
}

export async function assertNonEmptyFile(path: string, label: string): Promise<void> {
  const text = await readTextIfExists(path);
  if (text.trim().length === 0) throw new SteerError(`${label} is missing or empty: ${path}`);
}

export async function withChangeLock<T>(dir: string, fn: () => Promise<T>): Promise<T> {
  const lockDir = join(dir, '.steer-lock');
  const recoveryLockDir = join(dir, '.steer-lock-recovery');
  const acquire = async (duringRecovery = false) => {
    if (!duringRecovery && await pathExists(recoveryLockDir)) throw new Error('lock recovery in progress');
    await fs.mkdir(lockDir, { recursive: false });
    await fs.writeFile(join(lockDir, 'owner.json'), JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
  };

  try {
    await acquire();
  } catch {
    await recoverStaleLock(lockDir, recoveryLockDir, dir, acquire);
  }
  try {
    return await fn();
  } finally {
    await fs.rm(lockDir, { recursive: true, force: true });
  }
}

async function recoverStaleLock(
  lockDir: string,
  recoveryLockDir: string,
  changeDir: string,
  acquire: (duringRecovery?: boolean) => Promise<void>,
): Promise<void> {
  try {
    await fs.mkdir(recoveryLockDir, { recursive: false });
  } catch {
    throw new SteerError(`Another steer operation is running for this change: ${changeDir}`);
  }

  try {
    if (!(await isStaleLock(lockDir))) throw new SteerError(`Another steer operation is running for this change: ${changeDir}`);
    await fs.rm(lockDir, { recursive: true, force: true });
    try {
      await acquire(true);
    } catch {
      throw new SteerError(`Another steer operation is running for this change: ${changeDir}`);
    }
  } finally {
    await fs.rm(recoveryLockDir, { recursive: true, force: true });
  }
}

async function isStaleLock(lockDir: string): Promise<boolean> {
  try {
    const owner = JSON.parse(await fs.readFile(join(lockDir, 'owner.json'), 'utf8')) as { pid?: number; at?: string };
    if (owner.pid && isPidAlive(owner.pid)) return false;
    const ageMs = owner.at ? Date.now() - Date.parse(owner.at) : Number.POSITIVE_INFINITY;
    return !owner.pid || Number.isNaN(ageMs) || ageMs > 60 * 60 * 1000;
  } catch {
    return true;
  }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
