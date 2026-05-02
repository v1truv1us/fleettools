import { basename, dirname, join, relative } from 'node:path';
import { SoloAdapter, type SoloCreateTaskInput } from '@fleettools/core';
import { listTaskStatuses, readTaskStatus, writeTaskStatus } from './tasks.js';
import { readTextIfExists, writeJsonAtomic } from './fs.js';
import { TaskStatusFile } from './types.js';

export async function mockHandoff(changeDir: string, task: TaskStatusFile): Promise<string> {
  if (process.env.STEER_MOCK_HANDOFF_FAIL === '1') throw new Error('Mock handoff failure requested by STEER_MOCK_HANDOFF_FAIL=1');
  const id = `mock-solo-${task.id}-${Date.now()}`;
  await writeJsonAtomic(join(changeDir, 'tasks', task.id, 'handoff.json'), {
    id,
    task_id: task.id,
    description: task.description,
    verify_result: `tasks/${task.id}/verify-result.md`,
    created_at: new Date().toISOString(),
    note: 'Mock/file handoff only. Real Solo create-task API is unconfirmed.',
  });
  return id;
}

export async function createSoloTaskHandoff(changeDir: string, task: TaskStatusFile, projectRoot = dirname(dirname(changeDir))): Promise<{ id: string; status?: string }> {
  if (task.solo_task_id) return { id: task.solo_task_id, status: task.solo_status };
  if (process.env.STEER_SOLO_MOCK === '1') return { id: await mockHandoff(changeDir, task), status: 'mock' };

  const input = await buildSoloTaskInput(changeDir, task, projectRoot);
  const adapter = new SoloAdapter({ ...(process.env.STEER_SOLO_BINARY ? { binaryPath: process.env.STEER_SOLO_BINARY } : {}), cwd: projectRoot, retries: 1 });
  const created = await adapter.createTask(input);
  await writeHandoffArtifact(changeDir, task, created.id, created.status, projectRoot);
  return { id: created.id, status: created.status };
}

export async function completeHandoff(changeDir: string, taskId: string, projectRoot?: string): Promise<TaskStatusFile> {
  const task = await readTaskStatus(changeDir, taskId);
  const handoff = await createSoloTaskHandoff(changeDir, task, projectRoot);
  const done = {
    ...task,
    status: 'done' as const,
    handoff_id: handoff.id,
    solo_task_id: handoff.status === 'mock' ? task.solo_task_id : handoff.id,
    solo_status: handoff.status,
    completed_at: task.completed_at ?? new Date().toISOString(),
  };
  await writeTaskStatus(changeDir, done);
  return done;
}

async function buildSoloTaskInput(changeDir: string, task: TaskStatusFile, projectRoot: string): Promise<SoloCreateTaskInput> {
  const slug = basename(changeDir);
  const verifyText = await readTextIfExists(join(changeDir, 'tasks', task.id, 'verify.md'));
  const verifyResultPath = join(changeDir, 'tasks', task.id, 'verify-result.md');
  const verifyResultRelative = relative(projectRoot, verifyResultPath);
  const statuses = await listTaskStatuses(changeDir);
  const deps = task.deps
    .map(dep => statuses.find(candidate => candidate.id === dep)?.solo_task_id)
    .filter((dep): dep is string => typeof dep === 'string' && dep.length > 0);

  return {
    title: task.description,
    type: 'task',
    priority: 'medium',
    description: [`Fleet Steer verified task handoff.`, `Change: ${slug}`, `Steer task: ${task.id}`, `Verify result: ${verifyResultRelative}`].join('\n'),
    acceptanceCriteria: extractAcceptanceCriteria(verifyText).join('\n') || 'Verify result exists and diff review passed.',
    definitionOfDone: `Verify result exists and diff review passed: ${verifyResultRelative}`,
    labels: [slug, 'fleet-steer', 'verified'],
    affectedFiles: extractDeclaredFiles(verifyText),
    deps,
  };
}

async function writeHandoffArtifact(changeDir: string, task: TaskStatusFile, soloTaskId: string, soloStatus: string | undefined, projectRoot: string): Promise<void> {
  const verifyResult = relative(projectRoot, join(changeDir, 'tasks', task.id, 'verify-result.md'));
  await writeJsonAtomic(join(changeDir, 'tasks', task.id, 'handoff.json'), {
    id: soloTaskId,
    solo_task_id: soloTaskId,
    solo_status: soloStatus,
    task_id: task.id,
    source_change: basename(changeDir),
    source_steer_task_id: task.id,
    description: task.description,
    verify_result: verifyResult,
    created_at: new Date().toISOString(),
    note: 'Solo task created as draft. FleetTools does not auto-ready Solo tasks.',
  });
}

function extractDeclaredFiles(verifyText: string): string[] {
  const files: string[] = [];
  let inFiles = false;
  for (const line of verifyText.split('\n')) {
    if (/^#+\s+Files (created|modified)/i.test(line)) { inFiles = true; continue; }
    if (/^#+\s+/.test(line)) inFiles = false;
    if (inFiles) {
      const match = line.match(/^\s*[-*]\s+`?([^`\s]+)`?/);
      if (match && !match[1].includes('path/to/')) files.push(match[1]);
    }
  }
  return [...new Set(files)];
}

function extractAcceptanceCriteria(verifyText: string): string[] {
  const shellCriteria = [...verifyText.matchAll(/\[shell:\s*([^\]]+)\]/g)].map(match => `Command passes: ${match[1].trim()}`);
  const fileCriteria = extractDeclaredFiles(verifyText).map(file => `Declared file exists: ${file}`);
  return [...fileCriteria, ...shellCriteria];
}
