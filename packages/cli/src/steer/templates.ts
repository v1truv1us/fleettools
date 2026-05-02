import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathExists } from './fs.js';
import { SteerError } from './errors.js';

async function findCliPackageRoot(): Promise<string> {
  let current = dirname(fileURLToPath(import.meta.url));
  while (true) {
    if (await pathExists(join(current, 'package.json'))) return current;
    const parent = dirname(current);
    if (parent === current) throw new SteerError('Could not locate @fleettools/cli package root for templates.');
    current = parent;
  }
}

export async function loadTemplate(name: string, vars: Record<string, string | number>, projectRoot = process.cwd()): Promise<string> {
  const override = join(projectRoot, '.steer', 'templates', `${name}.md`);
  const packageRoot = await findCliPackageRoot();
  const packaged = join(packageRoot, 'templates', 'steer', `${name}.md`);
  const templatePath = (await pathExists(override)) ? override : packaged;
  if (!(await pathExists(templatePath))) throw new SteerError(`Missing steer template: ${templatePath}`);
  const source = await fs.readFile(templatePath, 'utf8');
  return source.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => {
    if (!(key in vars)) throw new SteerError(`Missing template variable "${key}" for ${templatePath}`);
    return String(vars[key]);
  });
}
