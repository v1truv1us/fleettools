import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { OrchestrationTaskRef } from '../orchestration/types.js';
import type { SoloEnvelope, SoloSessionStartData, SoloTaskListData, SoloTaskShowData } from './solo-types.js';
import { SoloCommandError, isRetryableSoloError } from './solo-errors.js';

const execFileAsync = promisify(execFile);

export interface SoloAdapterOptions {
  binaryPath?: string;
  cwd?: string;
  retries?: number;
  retryDelayMs?: number;
}

export interface SoloSessionContext {
  taskId: string;
  sessionId: string;
  reservationId: string;
  reservationToken?: string;
  worktreePath: string;
  branch?: string;
  expiresAt?: string;
  contextBundle: Record<string, unknown>;
}

export class SoloAdapter {
  private readonly binaryPath: string;
  private readonly cwd: string;
  private readonly retries: number;
  private readonly retryDelayMs: number;

  constructor(options: SoloAdapterOptions = {}) {
    this.binaryPath = options.binaryPath ?? 'solo';
    this.cwd = options.cwd ?? process.cwd();
    this.retries = options.retries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 250;
  }

  async listAvailableTasks(limit = 20): Promise<OrchestrationTaskRef[]> {
    const data = await this.run<SoloTaskListData>(['task', 'list', '--available', '--limit', String(limit), '--json']);
    return (data.tasks ?? []).map(task => normalizeTask(task));
  }

  async showTask(taskId: string): Promise<Record<string, unknown>> {
    const data = await this.run<SoloTaskShowData>(['task', 'show', taskId, '--json']);
    return data.task ?? data;
  }

  async getTaskContext(taskId: string): Promise<Record<string, unknown>> {
    return this.run<Record<string, unknown>>(['task', 'context', taskId, '--json']);
  }

  async startSession(taskId: string, worker: string): Promise<SoloSessionContext> {
    const data = await this.run<SoloSessionStartData>([
      'session',
      'start',
      taskId,
      '--worker',
      worker,
      '--pid',
      String(process.pid),
      '--json',
    ]);
    return {
      taskId,
      sessionId: data.session_id,
      reservationId: data.reservation_id,
      reservationToken: data.reservation_token,
      worktreePath: data.worktree_path,
      branch: data.branch,
      expiresAt: data.expires_at,
      contextBundle: data.context,
    };
  }

  async endSession(
    taskId: string,
    result: 'completed' | 'failed' | 'interrupted' | 'abandoned',
    options: { notes?: string; commits?: string[]; files?: string[]; overrideStatus?: string } = {},
  ): Promise<Record<string, unknown>> {
    const args = ['session', 'end', taskId, '--result', result, '--json'];
    if (options.notes) args.push('--notes', options.notes);
    if (options.commits && options.commits.length > 0) args.push('--commits', options.commits.join(','));
    if (options.files && options.files.length > 0) args.push('--files', options.files.join(','));
    if (options.overrideStatus) args.push('--status', options.overrideStatus);
    return this.run<Record<string, unknown>>(args);
  }

  async createHandoff(
    taskId: string,
    input: { summary: string; remainingWork: string; to: string; files?: string[] },
  ): Promise<Record<string, unknown>> {
    const args = [
      'handoff',
      'create',
      taskId,
      '--summary',
      input.summary,
      '--remaining-work',
      input.remainingWork,
      '--to',
      input.to,
      '--json',
    ];
    if (input.files && input.files.length > 0) {
      args.push('--files', input.files.join(','));
    }
    return this.run<Record<string, unknown>>(args);
  }

  async inspectWorktree(taskId: string): Promise<Record<string, unknown>> {
    return this.run<Record<string, unknown>>(['worktree', 'inspect', taskId, '--json']);
  }

  private async run<T>(args: string[]): Promise<T> {
    let lastError: SoloCommandError | undefined;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const { stdout, stderr } = await execFileAsync(this.binaryPath, args, { cwd: this.cwd });
        return parseSoloResponse<T>(stdout, stderr);
      } catch (error) {
        const normalized = normalizeSoloFailure(error);
        lastError = normalized;
        if (!normalized.retryable || attempt === this.retries) {
          throw normalized;
        }
        await sleep(this.retryDelayMs * attempt);
      }
    }

    throw lastError ?? new SoloCommandError('SOLO_COMMAND_FAILED', 'Solo command failed');
  }
}

function parseSoloResponse<T>(stdout: string, stderr: string): T {
  const raw = stdout.trim() || stderr.trim();
  if (!raw) {
    throw new SoloCommandError('SOLO_EMPTY_RESPONSE', 'Solo command returned no output');
  }

  let parsed: SoloEnvelope<T>;
  try {
    parsed = JSON.parse(raw) as SoloEnvelope<T>;
  } catch {
    throw new SoloCommandError('SOLO_INVALID_JSON', 'Solo command returned invalid JSON');
  }

  if (!parsed.ok) {
    throw new SoloCommandError(
      parsed.error.code,
      parsed.error.message,
      parsed.error.retryable ?? isRetryableSoloError(parsed.error.code),
      parsed.error.retry_hint,
    );
  }

  return parsed.data;
}

function normalizeSoloFailure(error: unknown): SoloCommandError {
  if (error instanceof SoloCommandError) {
    return error;
  }

  if (typeof error === 'object' && error !== null && 'stdout' in error) {
    const stdout = String((error as { stdout?: string }).stdout ?? '');
    const stderr = String((error as { stderr?: string }).stderr ?? '');
    try {
      return parseSoloResponse(stdout, stderr) as never;
    } catch (parsedError) {
      if (parsedError instanceof SoloCommandError) {
        parsedError.exitCode = Number((error as { code?: number | string }).code ?? 1);
        return parsedError;
      }
    }
  }

  if (error instanceof Error) {
    return new SoloCommandError('SOLO_EXEC_ERROR', error.message);
  }

  return new SoloCommandError('SOLO_EXEC_ERROR', String(error));
}

function normalizeTask(task: Record<string, unknown>): OrchestrationTaskRef {
  return {
    taskId: String(task.id ?? ''),
    title: String(task.title ?? ''),
    description: readOptionalString(task.description),
    type: readOptionalString(task.type),
    priority: readOptionalString(task.priority),
    priorityValue: typeof task.priority_value === 'number' ? task.priority_value : undefined,
    labels: Array.isArray(task.labels) ? task.labels.map(value => String(value)) : [],
    status: readOptionalString(task.status),
    affectedFiles: Array.isArray(task.affected_files) ? task.affected_files.map(value => String(value)) : [],
  };
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
