/**
 * Configuration Management
 *
 * Global and project-level configuration for FleetTools
 */
export interface FleetGlobalConfig {
    version: string;
    defaultRuntime: 'bun' | 'node';
    telemetry: {
        enabled: boolean;
        endpoint?: string;
    };
    services: {
        autoStart: boolean;
        squawkPort: number;
        apiPort: number;
    };
    paths: {
        configDir: string;
        dataDir: string;
        logDir: string;
    };
}
export interface FleetProjectConfig {
    name: string;
    version: string;
    fleet: {
        version: string;
        mode: 'local' | 'synced';
        runtime?: 'consolidated' | 'split';
        workspaceId?: string;
    };
    services: {
        squawk: {
            enabled: boolean;
            port: number;
            dataDir: string;
        };
        api: {
            enabled: boolean;
            port: number;
        };
        postgres: {
            enabled: boolean;
            provider: 'podman' | 'docker' | 'local';
            port: number;
            container?: string;
            dataDir: string;
        };
    };
    plugins: {
        claudeCode: boolean;
        openCode: boolean;
    };
}
/**
 * Get the default global configuration
 */
export declare function getDefaultGlobalConfig(): FleetGlobalConfig;
/**
 * Get the global configuration file path
 */
export declare function getGlobalConfigPath(): string;
/**
 * Load global configuration
 */
export declare function loadGlobalConfig(): FleetGlobalConfig;
/**
 * Save global configuration
 */
export declare function saveGlobalConfig(config: FleetGlobalConfig): void;
/**
 * Get the project configuration file path
 */
export declare function getProjectConfigPath(): string;
/**
 * Load project configuration
 */
export declare function loadProjectConfig(): FleetProjectConfig | null;
/**
 * Get default project configuration
 */
export declare function getDefaultProjectConfig(): FleetProjectConfig;
/**
 * Save project configuration
 */
export declare function saveProjectConfig(config: FleetProjectConfig): void;
/**
 * Check if current directory is a FleetTools project
 */
export declare function isFleetProject(): boolean;
/**
 * Ensure all required directories exist
 */
export declare function ensureDirectories(config: FleetGlobalConfig): void;
//# sourceMappingURL=config.d.ts.map