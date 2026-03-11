"use strict";
/**
 * Podman Provider for FleetTools Local Postgres
 *
 * Manages a Postgres 16.x container via Podman for local-only mode
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PodmanPostgresProvider = void 0;
exports.createPodmanPostgresProvider = createPodmanPostgresProvider;
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
class PodmanPostgresProvider {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Start the Postgres container
     */
    async start() {
        console.log('Starting Postgres via Podman...');
        // Check if Podman is available
        const podmanExists = await this.checkPodman();
        if (!podmanExists) {
            throw new Error('Podman is not installed or not in PATH');
        }
        // On macOS, check if podman machine is running
        const platform = process.platform;
        if (platform === 'darwin') {
            const machineRunning = await this.checkPodmanMachine();
            if (!machineRunning) {
                console.log('Starting podman machine for macOS...');
                await this.exec('podman', ['machine', 'start']);
            }
        }
        // Check if container already exists
        const exists = await this.containerExists();
        if (exists) {
            console.log(`Container ${this.config.containerName} already exists, starting...`);
            await this.exec('podman', ['start', this.config.containerName]);
        }
        else {
            // Create volume
            await this.ensureVolume();
            // Start new container
            console.log(`Starting new container: ${this.config.containerName}`);
            await this.exec('podman', [
                'run',
                '-d',
                '--name', this.config.containerName,
                '-e', 'POSTGRES_PASSWORD=fleettools',
                '-e', 'POSTGRES_DB=fleettools',
                '-e', 'POSTGRES_USER=fleettools',
                '-p', `${this.config.port}:5432`,
                '-v', `${this.config.volumeName}:/var/lib/postgresql/data`,
                this.config.image,
            ]);
        }
        // Wait for Postgres to be ready
        await this.waitForReady();
        console.log(`✓ Postgres started and ready`);
        console.log(`  Connection: localhost:${this.config.port}`);
        console.log(`  Container: ${this.config.containerName}`);
    }
    /**
     * Stop the Postgres container
     */
    async stop() {
        console.log('Stopping Postgres container...');
        const exists = await this.containerExists();
        if (!exists) {
            console.log('Container is not running');
            return;
        }
        await this.exec('podman', ['stop', this.config.containerName]);
        console.log('✓ Postgres container stopped');
    }
    /**
     * Check if container is running
     */
    async status() {
        const exists = await this.containerExists();
        if (!exists) {
            return {
                running: false,
                port: this.config.port,
                image: this.config.image,
                version: '16.x',
            };
        }
        const running = await this.isContainerRunning();
        const status = {
            running,
            port: this.config.port,
            image: this.config.image,
            version: '16.x',
        };
        if (running) {
            const version = await this.getPostgresVersion();
            if (version) {
                status.version = version;
                status.containerId = this.config.containerName;
            }
        }
        return status;
    }
    /**
     * Get container logs
     */
    async logs(tail = 100) {
        const exists = await this.containerExists();
        if (!exists) {
            return 'Container not found';
        }
        const { stdout } = await this.exec('podman', ['logs', '--tail', tail.toString(), this.config.containerName]);
        return stdout;
    }
    /**
     * Restart the container
     */
    async restart() {
        console.log('Restarting Postgres container...');
        await this.stop();
        // Brief pause
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.start();
    }
    /**
     * Remove container and volume (destructive)
     */
    async destroy() {
        console.log('Removing Postgres container and volume...');
        console.log('⚠️  This will delete all data!');
        await this.stop();
        const exists = await this.containerExists();
        if (exists) {
            await this.exec('podman', ['rm', this.config.containerName]);
            console.log('✓ Container removed');
        }
        await this.exec('podman', ['volume', 'rm', this.config.volumeName]);
        console.log('✓ Volume removed');
    }
    // ========================================================================
    // Private Helper Methods
    // ========================================================================
    async checkPodman() {
        try {
            const result = await this.exec('podman', ['--version']);
            return result.exitCode === 0;
        }
        catch {
            return false;
        }
    }
    async checkPodmanMachine() {
        try {
            const result = await this.exec('podman', ['machine', 'ls']);
            return result.exitCode === 0;
        }
        catch {
            return false;
        }
    }
    async containerExists() {
        try {
            const result = await this.exec('podman', ['ps', '--filter', `name=${this.config.containerName}`, '--format', '{{.Names}}']);
            return result.stdout.trim().length > 0;
        }
        catch {
            return false;
        }
    }
    async isContainerRunning() {
        try {
            const result = await this.exec('podman', ['ps', '--filter', `name=${this.config.containerName}`, '--format', '{{.Status}}']);
            return result.stdout.trim() === 'running';
        }
        catch {
            return false;
        }
    }
    async ensureVolume() {
        try {
            await this.exec('podman', ['volume', 'inspect', this.config.volumeName]);
        }
        catch {
            console.log('Creating volume...');
            await this.exec('podman', ['volume', 'create', this.config.volumeName]);
        }
    }
    async waitForReady(maxAttempts = 30, interval = 2000) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const result = await this.exec('podman', ['exec', this.config.containerName, 'pg_isready']);
                if (result.exitCode === 0) {
                    console.log('✓ Postgres is ready');
                    return;
                }
            }
            catch {
                // pg_isready might not be available yet, continue waiting
            }
            console.log(`Waiting for Postgres to be ready... (${i + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        throw new Error('Postgres failed to become ready');
    }
    async getPostgresVersion() {
        try {
            const result = await this.exec('podman', [
                'exec',
                this.config.containerName,
                'psql',
                '-U', 'postgres',
                '-c', 'SHOW server_version;'
            ]);
            const version = result.stdout.trim();
            // Extract major version
            const match = version.match(/^PostgreSQL (\d+\.\d+)/);
            return match ? match[1] : null;
        }
        catch {
            return null;
        }
    }
    async exec(command, args) {
        return new Promise((resolve, reject) => {
            const proc = (0, node_child_process_1.spawn)(command, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            let stdout = '';
            let stderr = '';
            if (proc.stdout) {
                proc.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
            }
            if (proc.stderr) {
                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            }
            proc.on('close', (code) => {
                resolve({ stdout, stderr, exitCode: code || 0 });
            });
            proc.on('error', (error) => {
                reject(error);
            });
        });
    }
}
exports.PodmanPostgresProvider = PodmanPostgresProvider;
// ============================================================================
// Factory function to create provider from config
// ============================================================================
function createPodmanPostgresProvider(config = {}) {
    return new PodmanPostgresProvider({
        image: 'postgres:16',
        containerName: 'fleettools-pg',
        volumeName: 'fleettools-pg-data',
        port: config.port || 5432,
        dataDir: config.dataDir || node_path_1.default.join(process.env.HOME || '', '.local', 'share', 'fleet', 'postgres'),
    });
}
//# sourceMappingURL=podman-postgres.js.map