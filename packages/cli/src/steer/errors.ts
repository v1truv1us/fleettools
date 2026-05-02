export class SteerError extends Error {
  constructor(message: string, public readonly exitCode = 1) {
    super(message);
    this.name = 'SteerError';
  }
}

export class StateCorruptionError extends SteerError {
  constructor(path: string, reason: string) {
    super(`Invalid steer state at ${path}: ${reason}`);
    this.name = 'StateCorruptionError';
  }
}
