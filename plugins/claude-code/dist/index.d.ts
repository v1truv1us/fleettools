export interface ClaudeCodeCommand {
    id: string;
    name: string;
    description: string;
    handler: () => Promise<void>;
}
export interface ClaudeCodeCommandRegistry {
    registerCommand: (command: ClaudeCodeCommand) => void;
}
export interface FleetToolsClaudeCodePlugin {
    name: string;
    version: string;
    registerCommands: (commands: ClaudeCodeCommandRegistry) => Promise<void>;
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
export declare class FleetToolsClaudeCodePluginImpl implements FleetToolsClaudeCodePlugin {
    /** Plugin name */
    name: string;
    /** Plugin version */
    version: string;
    registerCommands(commands: ClaudeCodeCommandRegistry): Promise<void>;
    private handleStatus;
    private handleSetup;
    private handleDoctor;
    private handleServices;
    private handleHelp;
    private showMessage;
    private showError;
    private showOutput;
    private showInAssistantMessage;
}
export declare function createPlugin(): FleetToolsClaudeCodePluginImpl;
export declare const fleetToolsPlugin: {
    name: string;
    version: string;
    register: (commands: ClaudeCodeCommandRegistry) => Promise<void>;
};
export declare function fallbackRegister(): Promise<void>;
export default fleetToolsPlugin;
//# sourceMappingURL=index.d.ts.map