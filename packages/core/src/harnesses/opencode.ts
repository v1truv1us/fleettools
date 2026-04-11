import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { HarnessAvailability, HarnessLaunchRequest, HarnessRunResult } from '../orchestration/types.js';
import type { HarnessAdapter } from './types.js';

const execFileAsync = promisify(execFile);

const OPENCODE_BIN_PATHS = [
  process.env.FLEET_OPENCODE_COMMAND,
  'opencode',
];

function resolveCommand(): string {
  return process.env.FLEET_OPENCODE_COMMAND || 'opencode';
}

export class OpenCodeHarnessAdapter implements HarnessAdapter {
  readonly id = 'opencode' as const;
  private readonly command = resolveCommand();

  async probeAvailability(): Promise<HarnessAvailability> {
    try {
      await execFileAsync(this.command, ['--version'], {
        cwd: process.cwd(),
        timeout: 10_000,
      });
      return { harness: this.id, status: 'available', command: this.command };
    } catch (error) {
      return {
        harness: this.id,
        status: 'unavailable',
        command: this.command,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async run(request: HarnessLaunchRequest): Promise<HarnessRunResult> {
    const prompt = buildOpenCodePrompt(request);

    const args = [
      'run',
      '--format', 'json',
      '--dir', request.worktreePath,
      '--no-input',
      prompt,
    ];

    const { stdout, stderr } = await execFileAsync(this.command, args, {
      cwd: request.worktreePath,
      timeout: request.timeoutMs,
      maxBuffer: 1024 * 1024 * 10,
      env: { ...process.env, TERM: 'dumb', NO_COLOR: '1' },
    });

    return normalizeOpenCodeResult(stdout, stderr);
  }
}

function buildOpenCodePrompt(request: HarnessLaunchRequest): string {
  const parts = [request.prompt];
  parts.push('');
  parts.push('Respond with a JSON object with these fields:');
  parts.push('- status: "completed", "failed", or "handoff"');
  parts.push('- summary: brief description of what was done');
  parts.push('- filesChanged: array of file paths modified');
  parts.push('- remainingWork: (optional) description of remaining work for handoff');
  parts.push('- nextWorker: (optional) "claude-code", "opencode", or "codex"');
  parts.push('- error: (optional) error description if failed');
  parts.push('Output ONLY the JSON object, no other text.');
  return parts.join('\n');
}

function normalizeOpenCodeResult(stdout: string, stderr: string): HarnessRunResult {
  const raw = stripAnsi(stdout.trim() || stderr.trim());
  if (!raw) {
    return {
      status: 'failed',
      summary: 'OpenCode returned no output',
      filesChanged: [],
      error: 'empty_output',
      rawOutput: raw,
    };
  }

  const jsonStr = extractJsonBlock(raw);

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    return {
      status: (['completed', 'failed', 'handoff'].includes(String(parsed.status))
        ? parsed.status as 'completed' | 'failed' | 'handoff'
        : 'completed'),
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'OpenCode run completed',
      remainingWork: typeof parsed.remainingWork === 'string' ? parsed.remainingWork : undefined,
      nextWorker: typeof parsed.nextWorker === 'string' ? parsed.nextWorker as 'claude-code' | 'opencode' | 'codex' : undefined,
      filesChanged: Array.isArray(parsed.filesChanged) ? parsed.filesChanged.map(String) : [],
      error: typeof parsed.error === 'string' ? parsed.error : undefined,
      rawOutput: raw,
    };
  } catch {
    return {
      status: 'completed',
      summary: raw.slice(0, 500),
      filesChanged: [],
      rawOutput: raw,
    };
  }
}

function extractJsonBlock(text: string): string {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    return text.slice(braceStart, braceEnd + 1);
  }
  return text;
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');
}
