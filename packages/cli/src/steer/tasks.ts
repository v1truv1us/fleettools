import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { TaskMetadata, TaskStatusFile } from './types.js';
import { pathExists, readTextIfExists, writeJsonAtomic, writeTextAtomic } from './fs.js';
import { loadTemplate } from './templates.js';

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'task';
}

function extractDeps(text: string): string[] {
  const match = text.match(/(?:\[|\()deps:\s*([^\]\)]+)(?:\]|\))/i);
  if (!match) return [];
  return match[1].split(',').map((dep) => dep.trim()).filter(Boolean);
}

export async function parseTasksFile(changeDir: string): Promise<TaskMetadata[]> {
  const raw = await readTextIfExists(join(changeDir, '05-tasks.md'));
  const items = raw.split('\n').map((line) => line.match(/^\s*[-*]\s+\[[ xX]\]\s+(.+)$/)?.[1]?.trim()).filter(Boolean) as string[];
  return items.map((item, index) => {
    const deps = extractDeps(item);
    const description = item.replace(/(?:\[|\()deps:\s*[^\]\)]+(?:\]|\))/i, '').trim();
    const slug = slugify(description);
    return { id: `${String(index + 1).padStart(3, '0')}-${slug}`, slug, description, deps };
  });
}

export async function readTaskStatus(changeDir: string, taskId: string): Promise<TaskStatusFile> {
  return JSON.parse(await fs.readFile(join(changeDir, 'tasks', taskId, 'status.json'), 'utf8')) as TaskStatusFile;
}

export async function writeTaskStatus(changeDir: string, status: TaskStatusFile): Promise<void> {
  await writeJsonAtomic(join(changeDir, 'tasks', status.id, 'status.json'), status);
}

export async function scaffoldTasks(changeDir: string, projectRoot: string): Promise<TaskMetadata[]> {
  const tasks = await parseTasksFile(changeDir);
  for (const task of tasks) {
    const dir = join(changeDir, 'tasks', task.id);
    await fs.mkdir(dir, { recursive: true });
    if (!(await pathExists(join(dir, 'prompt.md')))) {
      await writeTextAtomic(join(dir, 'prompt.md'), await loadTemplate('task-prompt', { task_id: task.id, task_description: task.description, deps: task.deps.join(', ') || 'none' }, projectRoot));
    }
    if (!(await pathExists(join(dir, 'verify.md')))) {
      await writeTextAtomic(join(dir, 'verify.md'), await loadTemplate('task-verify', { task_id: task.id, task_description: task.description }, projectRoot));
    }
    if (!(await pathExists(join(dir, 'status.json')))) {
      await writeTaskStatus(changeDir, { id: task.id, status: 'pending', deps: task.deps, description: task.description });
    }
  }
  return tasks;
}

export async function listTaskStatuses(changeDir: string): Promise<TaskStatusFile[]> {
  const tasks = await parseTasksFile(changeDir);
  const statuses: TaskStatusFile[] = [];
  for (const task of tasks) {
    const statusPath = join(changeDir, 'tasks', task.id, 'status.json');
    if (await pathExists(statusPath)) statuses.push(await readTaskStatus(changeDir, task.id));
    else statuses.push({ id: task.id, status: 'pending', deps: task.deps, description: task.description });
  }
  return statuses;
}

export async function getActiveTask(changeDir: string): Promise<TaskStatusFile | undefined> {
  return (await listTaskStatuses(changeDir)).find((task) => task.status === 'active' || task.status === 'verifying');
}

export function depsSatisfied(task: TaskStatusFile, all: TaskStatusFile[]): boolean {
  return task.deps.every((dep) => all.some((candidate) => candidate.id === dep && candidate.status === 'done'));
}
