export type HarnessId = 'claude-code' | 'opencode' | 'codex';
export interface FleetRoutingRuleCondition {
    task_id?: string | string[];
    task_type?: string | string[];
    labels?: string[];
    priority?: string | string[];
    title_regex?: string;
    affected_files_glob?: string[];
}
export interface FleetRoutingRule {
    id: string;
    when: FleetRoutingRuleCondition;
    select: {
        harness: HarnessId;
        timeout_ms?: number;
    };
}
export interface FleetRoutingConfig {
    version: number;
    defaults: {
        harness: HarnessId;
        timeout_ms: number;
    };
    rules: FleetRoutingRule[];
    filePath?: string;
}
export declare function getDefaultRoutingConfig(): FleetRoutingConfig;
export declare function findRoutingConfigPath(cwd?: string): string | null;
export declare function loadRoutingConfig(cwd?: string): FleetRoutingConfig;
export declare function validateRoutingConfig(input: unknown): FleetRoutingConfig;
//# sourceMappingURL=orchestration-config.d.ts.map