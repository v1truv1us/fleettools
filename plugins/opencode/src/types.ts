/**
 * Type Definitions for FleetTools OpenCode Plugin
 */

/**
 * Arguments passed to FleetTools tools
 */
export interface ToolArgs {
  /** Output format: text or json (fleet_status, fleet_stop) */
  format?: string;
  /** Services to start/stop (comma-separated: api,squawk) */
  services?: string;
  /** Force stop without graceful shutdown (fleet_stop) */
  force?: boolean;
  /** Timeout for graceful shutdown in milliseconds (fleet_stop) */
  timeout_ms?: number;
  /** Output in JSON format (fleet_stop) */
  json?: boolean;
  /** Attempt to fix common issues automatically (fleet_doctor) */
  fix?: boolean;
  /** Setup global configuration only (fleet_setup) */
  global?: boolean;
  /** Force re-initialization (fleet_setup) */
  setup_force?: boolean;
  /** Arguments to pass to fleet services command (fleet_services) */
  args?: string;
  /** Project path (defaults to current directory) (fleet_opencode_setup) */
  project_path?: string;
  /** Overwrite existing command files (fleet_opencode_setup) */
  overwrite?: boolean;
  /** Include detailed information (fleet_context) */
  verbose?: boolean;
}

/**
 * Context passed to FleetTools tool functions
 */
export interface ToolContext {
  /** Current working directory */
  directory: string;
  /** Git worktree path (optional) */
  worktree?: string;
}

/**
 * Command configuration for OpenCode command files
 */
export interface CommandConfig {
  /** Command name */
  name: string;
  /** Subcommand */
  commands: string;
  /** Description */
  desc: string;
  /** Extra flags/options */
  extra: string;
}

/**
 * Plugin context passed by OpenCode
 */
export interface PluginContext {
  /** OpenCode SDK client */
  client: any;
  /** Current working directory */
  directory: string;
  /** Git worktree path (optional) */
  worktree?: string;
}