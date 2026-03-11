/**
 * Podman Provider for FleetTools Local Postgres
 *
 * Manages a Postgres 16.x container via Podman for local-only mode
 */
export interface PodmanPostgresConfig {
    image: string;
    containerName: string;
    volumeName: string;
    port: number;
    dataDir: string;
}
export interface PostgresStatus {
    running: boolean;
    containerId?: string;
    port: number;
    image: string;
    version: string;
    details?: string;
}
export declare class PodmanPostgresProvider {
    private config;
    constructor(config: PodmanPostgresConfig);
    /**
     * Start the Postgres container
     */
    start(): Promise<void>;
    /**
     * Stop the Postgres container
     */
    stop(): Promise<void>;
    /**
     * Check if container is running
     */
    status(): Promise<PostgresStatus>;
    /**
     * Get container logs
     */
    logs(tail?: number): Promise<string>;
    /**
     * Restart the container
     */
    restart(): Promise<void>;
    /**
     * Remove container and volume (destructive)
     */
    destroy(): Promise<void>;
    private checkPodman;
    private checkPodmanMachine;
    private containerExists;
    private isContainerRunning;
    private ensureVolume;
    private waitForReady;
    private getPostgresVersion;
    private exec;
}
export declare function createPodmanPostgresProvider(config?: {
    port?: number;
    dataDir?: string;
}): PodmanPostgresProvider;
//# sourceMappingURL=podman-postgres.d.ts.map