/**
 * Configuration Management
 *
 * Global and project-level configuration for FleetTools
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
/**
 * Get the default global configuration
 */
export function getDefaultGlobalConfig() {
    const configDir = join(homedir(), '.config', 'fleet');
    const dataDir = join(homedir(), '.local', 'share', 'fleet');
    const logDir = join(homedir(), '.local', 'state', 'fleet', 'logs');
    return {
        version: '1.0.0',
        defaultRuntime: 'bun',
        telemetry: {
            enabled: false
        },
        services: {
            autoStart: false,
            squawkPort: 3000,
            apiPort: 3001
        },
        paths: {
            configDir,
            dataDir,
            logDir
        }
    };
}
/**
 * Get the global configuration file path
 */
export function getGlobalConfigPath() {
    return join(homedir(), '.config', 'fleet', 'config.yaml');
}
/**
 * Load global configuration
 */
export function loadGlobalConfig() {
    const configPath = getGlobalConfigPath();
    if (!existsSync(configPath)) {
        return getDefaultGlobalConfig();
    }
    try {
        const content = readFileSync(configPath, 'utf-8');
        const parsed = parseYaml(content);
        return { ...getDefaultGlobalConfig(), ...parsed };
    }
    catch (error) {
        console.warn(`Failed to parse global config: ${error}`);
        return getDefaultGlobalConfig();
    }
}
/**
 * Save global configuration
 */
export function saveGlobalConfig(config) {
    const configPath = getGlobalConfigPath();
    const configDir = dirname(configPath);
    if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
    }
    const content = stringifyYaml(config);
    writeFileSync(configPath, content, 'utf-8');
}
/**
 * Get the project configuration file path
 */
export function getProjectConfigPath() {
    return join(process.cwd(), 'fleet.yaml');
}
/**
 * Load project configuration
 */
export function loadProjectConfig() {
    const configPath = getProjectConfigPath();
    if (!existsSync(configPath)) {
        return null;
    }
    try {
        const content = readFileSync(configPath, 'utf-8');
        const parsed = parseYaml(content);
        return getProjectConfigWithDefaults(parsed);
    }
    catch (error) {
        console.warn(`Failed to parse project config: ${error}`);
        return null;
    }
}
/**
 * Get default project configuration
 */
export function getDefaultProjectConfig() {
    return {
        name: 'fleet-project',
        version: '1.0.0',
        fleet: {
            version: '0.1.0',
            mode: 'local'
        },
        services: {
            squawk: {
                enabled: true,
                port: 3000,
                dataDir: './.fleet/squawk'
            },
            api: {
                enabled: true,
                port: 3001
            },
            postgres: {
                enabled: false,
                provider: 'podman',
                port: 5432,
                dataDir: './.fleet/postgres'
            }
        },
        plugins: {
            claudeCode: true,
            openCode: true
        }
    };
}
/**
 * Merge user config with defaults
 */
function getProjectConfigWithDefaults(userConfig) {
    const defaults = getDefaultProjectConfig();
    return {
        ...defaults,
        ...userConfig,
        fleet: { ...defaults.fleet, ...userConfig.fleet },
        services: {
            ...defaults.services,
            ...userConfig.services,
            squawk: { ...defaults.services.squawk, ...userConfig.services?.squawk },
            api: { ...defaults.services.api, ...userConfig.services?.api },
            postgres: { ...defaults.services.postgres, ...userConfig.services?.postgres }
        },
        plugins: { ...defaults.plugins, ...userConfig.plugins }
    };
}
/**
 * Save project configuration
 */
export function saveProjectConfig(config) {
    const configPath = getProjectConfigPath();
    const content = stringifyYaml(config);
    writeFileSync(configPath, content, 'utf-8');
}
/**
 * Check if current directory is a FleetTools project
 */
export function isFleetProject() {
    return existsSync(getProjectConfigPath());
}
/**
 * Ensure all required directories exist
 */
export function ensureDirectories(config) {
    const dirs = [
        config.paths.configDir,
        config.paths.dataDir,
        config.paths.logDir
    ];
    dirs.forEach(dir => {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    });
}
//# sourceMappingURL=config.js.map