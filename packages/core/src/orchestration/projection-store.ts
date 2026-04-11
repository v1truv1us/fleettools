import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OrchestrationRunRecord } from './types.js';

export class ProjectionStore {
  private readonly filePath: string;

  constructor(rootDir: string = process.cwd()) {
    const dir = join(rootDir, '.fleet', 'orchestration');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.filePath = join(dir, 'runs.jsonl');
  }

  append(record: OrchestrationRunRecord): void {
    appendFileSync(this.filePath, `${JSON.stringify(record)}\n`, 'utf-8');
  }

  list(): OrchestrationRunRecord[] {
    if (!existsSync(this.filePath)) {
      return [];
    }

    return readFileSync(this.filePath, 'utf-8')
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => JSON.parse(line) as OrchestrationRunRecord);
  }
}
