import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const cliRequire = createRequire(import.meta.url);

type FleetService = 'api' | 'squawk';

function getLocalServicePath(service: FleetService, projectRoot: string): string {
  if (service === 'squawk') {
    return join(projectRoot, 'squawk', 'dist', 'bin.js');
  }

  return join(projectRoot, 'server', 'api', 'dist', 'index.js');
}

function resolveInstalledServicePath(service: FleetService, projectRoot: string): string | null {
  const packageName = service === 'squawk' ? '@fleettools/squawk' : '@fleettools/server';
  const entryPoint = service === 'squawk' ? 'dist/bin.js' : 'dist/index.js';
  const resolver = createRequire(join(projectRoot, 'fleettools-resolver.cjs'));

  for (const requireFn of [resolver, cliRequire]) {
    try {
      const packageJsonPath = requireFn.resolve(`${packageName}/package.json`);
      const servicePath = join(dirname(packageJsonPath), entryPoint);
      if (existsSync(servicePath)) {
        return servicePath;
      }
    } catch {
      // Try the next resolution path.
    }
  }

  return null;
}

export function resolveServicePath(service: FleetService, projectRoot: string): string {
  const localServicePath = getLocalServicePath(service, projectRoot);
  if (existsSync(localServicePath)) {
    return localServicePath;
  }

  const installedServicePath = resolveInstalledServicePath(service, projectRoot);
  if (installedServicePath) {
    return installedServicePath;
  }

  const packageName = service === 'squawk' ? '@fleettools/squawk' : '@fleettools/server';
  throw new Error(
    `Could not locate ${packageName}. Build the local workspace or install @fleettools/cli so it can resolve FleetTools runtime packages.`
  );
}
