/**
 * FleetTools OpenCode Plugin
 *
 * Integrates FleetTools CLI functionality into OpenCode via tools and commands
 */
export declare const FleetToolsPlugin: ({ client, $, directory, worktree }: any) => Promise<{
    tool: {
        'fleet-status': {
            description: string;
            parameters: {
                type: string;
                properties: {
                    format: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                };
            };
            execute: ({ format }: {
                format?: string | undefined;
            }) => Promise<any>;
        };
        'fleet-start': {
            description: string;
            parameters: {
                type: string;
                properties: {
                    services: {
                        type: string;
                        items: {
                            type: string;
                            enum: string[];
                        };
                        description: string;
                    };
                };
            };
            execute: ({ services }: {
                services?: never[] | undefined;
            }) => Promise<any>;
        };
        'fleet-stop': {
            description: string;
            parameters: {
                type: string;
                properties: {
                    services: {
                        type: string;
                        items: {
                            type: string;
                            enum: string[];
                        };
                        description: string;
                    };
                    force: {
                        type: string;
                        description: string;
                    };
                    timeoutMs: {
                        type: string;
                        description: string;
                    };
                    format: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                };
            };
            execute: ({ services, force, timeoutMs, format }: {
                services?: never[] | undefined;
                force?: boolean | undefined;
                timeoutMs?: undefined;
                format?: string | undefined;
            }) => Promise<any>;
        };
    };
    config(config: any): Promise<void>;
}>;
//# sourceMappingURL=index.d.ts.map