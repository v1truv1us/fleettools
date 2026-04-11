import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { HarnessAvailability, HarnessId, HarnessLaunchRequest, HarnessRunResult } from '../orchestration/types.js';
import type { HarnessAdapter } from './types.js';

const execFileAsync = promisify(execFile);

export class GenericCliHarnessAdapter implements HarnessAdapter {
  readonly id: HarnessId;
  private readonly command: string;
  private readonly versionArgs: string[];
  private readonly runTemplate?: string;

  constructor(id: HarnessId, command: string, versionArgs = ['--version'], runTemplate?: string) {
    this.id = id;
    this.command = command;
    this.versionArgs = versionArgs;
    this.runTemplate = runTemplate;
  }

  async probeAvailability(): Promise<HarnessAvailability> {
    try {
      await execFileAsync(this.command, this.versionArgs, { cwd: process.cwd() });
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
    if (!this.runTemplate) {
      return {
        status: 'failed',
        summary: `${this.id} run template is not configured`,
        filesChanged: [],
        error: 'missing_run_template',
      };
    }

    const expanded = this.runTemplate
      .replaceAll('{worktree}', request.worktreePath)
      .replaceAll('{prompt}', request.prompt)
      .replaceAll('{sessionId}', request.sessionId)
      .replaceAll('{taskId}', request.task.taskId);

    const { stdout, stderr } = await execFileAsync('/bin/sh', ['-lc', expanded], {
      cwd: request.worktreePath,
      timeout: request.timeoutMs,
      maxBuffer: 1024 * 1024 * 10,
    });

    const raw = stdout.trim() || stderr.trim();
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        status: parsed.status as 'completed' | 'failed' | 'handoff',
        summary: String(parsed.summary ?? `${this.id} run completed`),
        remainingWork: typeof parsed.remainingWork === 'string' ? parsed.remainingWork : undefined,
        nextWorker: typeof parsed.nextWorker === 'string' ? parsed.nextWorker as HarnessId : undefined,
        filesChanged: Array.isArray(parsed.filesChanged) ? parsed.filesChanged.map(item => String(item)) : [],
        error: typeof parsed.error === 'string' ? parsed.error : undefined,
        rawOutput: raw,
      };
    } catch {
      return {
        status: 'failed',
        summary: `${this.id} returned unstructured output`,
        filesChanged: [],
        error: 'invalid_json',
        rawOutput: raw,
      };
    }
  }
}
