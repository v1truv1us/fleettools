import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

async function runFleet(cwd: string, args: string[], stdin?: string) {
  const proc = Bun.spawn(['bun', join(import.meta.dir, '../../../src/index.ts'), ...args], { cwd, stdin: stdin ? 'pipe' : 'ignore', stdout: 'pipe', stderr: 'pipe' });
  if (stdin && proc.stdin) {
    proc.stdin.write(stdin);
    proc.stdin.end();
  }
  return { code: await proc.exited, stdout: await new Response(proc.stdout).text(), stderr: await new Response(proc.stderr).text() };
}

describe('fleet steer CLI', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `fleet-steer-cli-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(join(tempDir, 'package.json'), '{}');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('initializes a change and emits clean prompt output', async () => {
    const init = await runFleet(tempDir, ['steer', 'init', 'demo-change']);
    expect(init.code).toBe(0);
    expect(init.stdout).toBe('');
    const state = JSON.parse(await fs.readFile(join(tempDir, 'specs', 'demo-change', 'state.json'), 'utf8'));
    expect(state.phase).toBe('context');
    const next = await runFleet(tempDir, ['steer', 'next', 'demo-change']);
    expect(next.code).toBe(0);
    expect(next.stdout).toContain('Fleet Steer Context Prompt');
  });

  it('does not advance past an untouched skeleton artifact', async () => {
    await runFleet(tempDir, ['steer', 'init', 'blocked-change']);
    const advance = await runFleet(tempDir, ['steer', 'advance', 'blocked-change']);

    expect(advance.code).toBe(1);
    expect(advance.stderr).toContain('00-context.md is missing or empty');
  });

  it('early exits review after two consecutive passes', async () => {
    await runFleet(tempDir, ['steer', 'init', 'review-change']);
    await fs.writeFile(join(tempDir, 'specs', 'review-change', '00-context.md'), 'context');
    await runFleet(tempDir, ['steer', 'advance', 'review-change']);
    await fs.writeFile(join(tempDir, 'specs', 'review-change', '01-spec.md'), 'spec');
    await runFleet(tempDir, ['steer', 'advance', 'review-change']);
    const pass = '{"status":"pass","round":1,"lens":"ambiguity","issues":[]}';
    expect((await runFleet(tempDir, ['steer', 'review', '--ingest', 'review-change'], pass)).code).toBe(0);
    expect((await runFleet(tempDir, ['steer', 'review', '--ingest', 'review-change'], pass.replace('"round":1', '"round":2'))).code).toBe(0);
    const state = JSON.parse(await fs.readFile(join(tempDir, 'specs', 'review-change', 'state.json'), 'utf8'));
    expect(state.phase).toBe('plan');
  });

  it('refuses task start before the task execution phase', async () => {
    await runFleet(tempDir, ['steer', 'init', 'early-task']);
    await fs.writeFile(join(tempDir, 'specs', 'early-task', '05-tasks.md'), '- [ ] Should not start yet\n');

    const start = await runFleet(tempDir, ['steer', 'task', 'start', 'early-task']);

    expect(start.code).toBe(1);
    expect(start.stderr).toContain('Cannot start tasks while change is in context phase');
  });
});
