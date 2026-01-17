export interface OpenCodeCommand {
    id: string;
    name: string;
    description: string;
    handler: () => Promise<void>;
}
export interface OpenCodeCommandRegistry {
    registerCommand: (command: OpenCodeCommand) => void;
}
export interface FleetToolsOpenCodePlugin {
    name: string;
    version: string;
    registerCommands: (commands: OpenCodeCommandRegistry) => Promise<void>;
}
export interface FleetToolsStatus {
    mode?: 'local' | 'synced';
    config?: {
        fleet?: {
            user_id?: string;
            workspace_id?: string;
        };
    };
    podman?: {
        available?: boolean;
        zero?: {
            url?: string;
        };
        api?: {
            url?: string;
        };
    };
    sync?: {
        zero?: {
            url?: string;
        };
        api?: {
            url?: string;
        };
    };
}
export declare class FleetToolsOpenCodePluginImpl implements FleetToolsOpenCodePlugin {
    /** Plugin name */
    name: string;
    /** Plugin version */
    version: string;
    registerCommands(commands: OpenCodeCommandRegistry): Promise<void>;
    private handleStatus;
    private handleSetup;
    private handleDoctor;
    private handleServices;
    private handleHelp;
    private showMessage;
    private showError;
    private showOutput;
    private showInOutputPane;
}
export declare function createPlugin(): FleetToolsOpenCodePluginImpl;
export declare const fleetToolsPlugin: {
    name: string;
    version: string;
    register: (commands: OpenCodeCommandRegistry) => Promise<void>;
};
export declare function fallbackRegister(): Promise<void>;
export default fleetToolsPlugin;
//# sourceMappingURL=index.d.ts.map