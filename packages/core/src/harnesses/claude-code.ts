import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { HarnessAvailability, HarnessLaunchRequest, HarnessRunResult } from '../orchestration/types.js';
import type { HarnessAdapter } from './types.js';

const execFileAsync = promisify(execFile);

const RESULT_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['completed', 'failed', 'handoff'] },
    summary: { type: 'string' },
    remainingWork: { type: 'string' },
    nextWorker: { type: 'string', enum: ['claude-code', 'opencode', 'codex'] },
    filesChanged: { type: 'array', items: { type: 'string' } },
    error: { type: 'string' },
  },
  required: ['status', 'summary', 'filesChanged'],
  additionalProperties: false,
});

export class ClaudeCodeHarnessAdapter implements HarnessAdapter {
  readonly id = 'claude-code' as const;
  private readonly command = process.env.FLEET_CLAUDE_COMMAND || 'claude';

  async probeAvailability(): Promise<HarnessAvailability> {
    try {
      await execFileAsync(this.command, ['--version'], { cwd: process.cwd() });
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
    const args = [
      '--print',
      '--output-format',
      'json',
      '--json-schema',
      RESULT_SCHEMA,
      '--allowedTools',
      'Read,Edit,Write,Bash,Glob,Grep',
      '--add-dir',
      request.worktreePath,
      request.prompt,
    ];

    const { stdout, stderr } = await execFileAsync(this.command, args, {
      cwd: request.worktreePath,
      timeout: request.timeoutMs,
      maxBuffer: 1024 * 1024 * 10,
    });

    return normalizeClaudeResult(stdout, stderr);
  }
}

function normalizeClaudeResult(stdout: string, stderr: string): HarnessRunResult {
  const raw = stdout.trim() || stderr.trim();
  if (!raw) {
    return {
      status: 'failed',
      summary: 'Claude Code returned no output',
      filesChanged: [],
      error: 'empty_output',
      rawOutput: raw,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const candidate = extractStructuredPayload(parsed);
    return {
      status: candidate.status,
      summary: candidate.summary,
      remainingWork: candidate.remainingWork,
      nextWorker: candidate.nextWorker,
      filesChanged: candidate.filesChanged,
      error: candidate.error,
      rawOutput: raw,
    };
  } catch {
    return {
      status: 'failed',
      summary: 'Claude Code returned unparsable output',
      filesChanged: [],
      error: 'invalid_json',
      rawOutput: raw,
    };
  }
}

function extractStructuredPayload(parsed: Record<string, unknown>): {
  status: 'completed' | 'failed' | 'handoff';
  summary: string;
  remainingWork?: string;
  nextWorker?: 'claude-code' | 'opencode' | 'codex';
  filesChanged: string[];
  error?: string;
} {
  if (typeof parsed.status === 'string' && typeof parsed.summary === 'string') {
    return {
      status: parsed.status as 'completed' | 'failed' | 'handoff',
      summary: parsed.summary,
      remainingWork: typeof parsed.remainingWork === 'string' ? parsed.remainingWork : undefined,
      nextWorker: typeof parsed.nextWorker === 'string' ? parsed.nextWorker as 'claude-code' | 'opencode' | 'codex' : undefined,
      filesChanged: Array.isArray(parsed.filesChanged) ? parsed.filesChanged.map(item => String(item)) : [],
      error: typeof parsed.error === 'string' ? parsed.error : undefined,
    };
  }

  if (typeof parsed.result === 'string') {
    return extractStructuredPayload(JSON.parse(parsed.result));
  }

  if (typeof parsed.content === 'string') {
    return extractStructuredPayload(JSON.parse(parsed.content));
  }

  throw new Error('No structured payload found');
}
