export class SoloCommandError extends Error {
  code: string;
  retryable: boolean;
  retryHint?: string;
  exitCode?: number;

  constructor(code: string, message: string, retryable = false, retryHint?: string, exitCode?: number) {
    super(message);
    this.name = 'SoloCommandError';
    this.code = code;
    this.retryable = retryable;
    this.retryHint = retryHint;
    this.exitCode = exitCode;
  }
}

export function isRetryableSoloError(code: string): boolean {
  return code === 'SQLITE_BUSY' || code === 'VERSION_CONFLICT';
}
