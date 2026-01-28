"use strict";
/**
 * FleetTools OpenCode Plugin
 *
 * Integrates FleetTools CLI functionality into OpenCode
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FleetToolsPlugin;
async function FleetToolsPlugin() {
    console.log('FleetTools plugin initialized!');
    // Return tool definitions for FleetTools
    return {
        tool: {
            'fleet-status': {
                description: 'Get FleetTools service status and configuration',
                parameters: {
                    type: 'object',
                    properties: {
                        format: {
                            type: 'string',
                            enum: ['json', 'text'],
                            description: 'Output format (default: text)'
                        }
                    }
                },
                execute: async ({ format = 'text' }) => {
                    const { execSync } = await import('node:child_process');
                    try {
                        const result = execSync(`fleet status${format === 'json' ? ' --json' : ''}`, {
                            encoding: 'utf-8'
                        });
                        return { success: true, data: result };
                    }
                    catch (error) {
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        };
                    }
                }
            },
            'fleet-start': {
                description: 'Start FleetTools services',
                parameters: {
                    type: 'object',
                    properties: {
                        services: {
                            type: 'string',
                            description: 'Comma-separated list of services to start (api,squawk)'
                        },
                        foreground: {
                            type: 'boolean',
                            description: 'Run in foreground instead of background'
                        }
                    }
                },
                execute: async ({ services, foreground }) => {
                    const { spawn } = await import('node:child_process');
                    return new Promise((resolve) => {
                        const args = ['start'];
                        if (services)
                            args.push('--services', services);
                        if (foreground)
                            args.push('--foreground');
                        const process = spawn('fleet', args, { stdio: 'pipe' });
                        let stdout = '';
                        let stderr = '';
                        process.stdout?.on('data', (data) => stdout += data);
                        process.stderr?.on('data', (data) => stderr += data);
                        process.on('close', (code) => {
                            if (code === 0) {
                                resolve({
                                    success: true,
                                    data: stdout || 'FleetTools services started successfully'
                                });
                            }
                            else {
                                resolve({
                                    success: false,
                                    error: stderr || `Process exited with code ${code}`
                                });
                            }
                        });
                        process.on('error', (error) => {
                            resolve({
                                success: false,
                                error: error.message
                            });
                        });
                    });
                }
            },
            'fleet-stop': {
                description: 'Stop FleetTools services',
                parameters: {
                    type: 'object',
                    properties: {
                        force: {
                            type: 'boolean',
                            description: 'Force stop services'
                        }
                    }
                },
                execute: async ({ force }) => {
                    const { spawn } = await import('node:child_process');
                    return new Promise((resolve) => {
                        const args = ['stop'];
                        if (force)
                            args.push('--force');
                        const process = spawn('fleet', args, { stdio: 'pipe' });
                        let stdout = '';
                        let stderr = '';
                        process.stdout?.on('data', (data) => stdout += data);
                        process.stderr?.on('data', (data) => stderr += data);
                        process.on('close', (code) => {
                            if (code === 0) {
                                resolve({
                                    success: true,
                                    data: stdout || 'FleetTools services stopped successfully'
                                });
                            }
                            else {
                                resolve({
                                    success: false,
                                    error: stderr || `Process exited with code ${code}`
                                });
                            }
                        });
                        process.on('error', (error) => {
                            resolve({
                                success: false,
                                error: error.message
                            });
                        });
                    });
                }
            }
        }
    };
}
//# sourceMappingURL=plugin.js.map