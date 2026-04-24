#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url'));
const repoRoot = resolve(__dirname, '..');

const INTERNAL_SCOPES = ['@fleettools/'];
const INTERNAL_PACKAGES: Record<string, string> = {};

const dirs = ['packages/core','packages/shared','packages/db','packages/events','packages/cli','squawk','server/api','plugins/claude-code','plugins/opencode'];
for (const dir of dirs) {
  try {
    const pkg = JSON.parse(readFileSync(join(repoRoot, dir, 'package.json'), 'utf8'));
    if (pkg.name && pkg.version) INTERNAL_PACKAGES[pkg.name] = pkg.version;
  } catch {}
}

function rewriteDepBlock(block?: Record<string, string>): boolean {
  if (!block) return false;
  let changed = false;
  for (const [name, spec] of Object.entries(block)) {
    if (!['workspace:*', 'workspace:^', 'workspace:~'].includes(spec)) continue;
    if (!INTERNAL_SCOPES.some(s => name.startsWith(s))) continue;
    const ver = INTERNAL_PACKAGES[name];
    if (!ver) throw new Error(`No version for ${name}`);
    block[name] = `^${ver}`;
    changed = true;
  }
  return changed;
}

const dir = process.argv[2];
if (!dir) { console.error('Usage: rewrite-workspace-deps.ts <dir>'); process.exit(1); }

const pkgPath = resolve(repoRoot, dir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const changed = [rewriteDepBlock(pkg.dependencies), rewriteDepBlock(pkg.devDependencies), rewriteDepBlock(pkg.peerDependencies), rewriteDepBlock(pkg.optionalDependencies)].some(Boolean);

if (changed) {
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Rewrote workspace:* deps in ${dir}/package.json`);
} else {
  console.log(`No workspace:* deps in ${dir}/package.json`);
}