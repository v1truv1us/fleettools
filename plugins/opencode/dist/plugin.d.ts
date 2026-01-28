/**
 * FleetTools OpenCode Plugin
 *
 * Integrates FleetTools CLI functionality into OpenCode
 */
export default function FleetToolsPlugin(): Promise<{
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
                format?: string;
            }) => Promise<{
                success: boolean;
                data: string;
                error?: undefined;
            } | {
                success: boolean;
                error: string;
                data?: undefined;
            }>;
        };
        'fleet-start': {
            description: string;
            parameters: {
                type: string;
                properties: {
                    services: {
                        type: string;
                        description: string;
                    };
                    foreground: {
                        type: string;
                        description: string;
                    };
                };
            };
            execute: ({ services, foreground }: {
                services?: string;
                foreground?: boolean;
            }) => Promise<unknown>;
        };
        'fleet-stop': {
            description: string;
            parameters: {
                type: string;
                properties: {
                    force: {
                        type: string;
                        description: string;
                    };
                };
            };
            execute: ({ force }: {
                force?: boolean;
            }) => Promise<unknown>;
        };
    };
}>;
//# sourceMappingURL=plugin.d.ts.map