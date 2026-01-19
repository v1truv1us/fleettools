// @bun
// src/index.ts
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);

class FleetToolsOpenCodePluginImpl {
  name = "FleetTools";
  version = "0.1.0";
  async registerCommands(commands) {
    commands.registerCommand({
      id: "fleet-status",
      name: "/fleet status",
      description: "Show FleetTools status and configuration",
      handler: this.handleStatus.bind(this)
    });
    commands.registerCommand({
      id: "fleet-setup",
      name: "/fleet setup",
      description: "Initialize FleetTools configuration",
      handler: this.handleSetup.bind(this)
    });
    commands.registerCommand({
      id: "fleet-doctor",
      name: "/fleet doctor",
      description: "Diagnose FleetTools installation and configuration",
      handler: this.handleDoctor.bind(this)
    });
    commands.registerCommand({
      id: "fleet-services",
      name: "/fleet services",
      description: "Manage local services (up/down/status/logs)",
      handler: this.handleServices.bind(this)
    });
    commands.registerCommand({
      id: "fleet-help",
      name: "/fleet help",
      description: "Show FleetTools help information",
      handler: this.handleHelp.bind(this)
    });
  }
  async handleStatus() {
    this.showMessage("Fetching FleetTools status...");
    try {
      const { stdout } = await execAsync("fleet status --json");
      try {
        const status = JSON.parse(stdout);
        const output = [
          "FleetTools Status",
          "================",
          "",
          `Mode: ${status.mode?.toUpperCase() || "LOCAL"}`,
          "",
          `User: ${status.config?.fleet?.user_id || "Not enrolled"}`,
          ""
        ];
        if (status.mode === "synced") {
          output.push("Sync Status:");
          output.push(`  Zero: ${status.sync?.zero?.url ? "Connected" : "Not configured"}`);
          output.push(`  API: ${status.sync?.api?.url || "Not configured"}`);
        }
        if (status.podman) {
          output.push("");
          output.push("Podman:");
          output.push(`  Available: ${status.podman.available ? "\u2713" : "\u2717"}`);
        }
        this.showOutput(output);
        const details = JSON.stringify(status, null, 2);
        this.showInOutputPane("Status Details", details);
      } catch {
        this.showOutput(["Failed to parse status output"]);
        this.showInOutputPane("Status Details", stdout);
      }
    } catch (error) {
      this.showError("Failed to get FleetTools status", error);
    }
  }
  async handleSetup() {
    this.showMessage("Running FleetTools setup...");
    try {
      const { stdout } = await execAsync("fleet setup");
      this.showOutput(stdout);
      this.showInOutputPane("Setup Output", stdout);
    } catch (error) {
      this.showError("Failed to run FleetTools setup", error);
    }
  }
  async handleDoctor() {
    this.showMessage("Running FleetTools diagnostics...");
    try {
      const { stdout } = await execAsync("fleet doctor");
      this.showOutput(stdout);
      this.showInOutputPane("Diagnostics Output", stdout);
    } catch (error) {
      this.showError("Failed to run FleetTools doctor", error);
    }
  }
  async handleServices() {
    this.showMessage("Opening FleetTools services menu...");
    try {
      const { stdout } = await execAsync("fleet services");
      this.showOutput(stdout);
      this.showInOutputPane("Services Menu", stdout);
    } catch (error) {
      this.showError("Failed to open services menu", error);
    }
  }
  async handleHelp() {
    const output = [
      "FleetTools Plugin for OpenCode",
      "=============================",
      "",
      "Commands:",
      "  /fleet status  - Show FleetTools status",
      "  /fleet setup   - Initialize FleetTools configuration",
      "  /fleet doctor  - Diagnose installation and configuration",
      "  /fleet services - Manage local services",
      "  /fleet help     - Show this help",
      "",
      "For more information, see: https://github.com/v1truv1us/fleettools"
    ];
    this.showOutput(output);
  }
  showMessage(message) {
    this.showOutput(`
${message}
`);
  }
  showError(message, error) {
    this.showOutput(`
\u274C Error: ${message}
`);
    this.showOutput(`   ${error.message}
`);
  }
  showOutput(message) {
    if (Array.isArray(message)) {
      message.forEach((line) => console.log(line));
    } else {
      console.log(message);
    }
  }
  showInOutputPane(title, content) {
    console.log(`
--- ${title} ---
${content}
`);
  }
}
var plugin = null;
function createPlugin() {
  if (!plugin) {
    plugin = new FleetToolsOpenCodePluginImpl;
  }
  return plugin;
}
var fleetToolsPlugin = {
  name: "FleetTools",
  version: "0.1.0",
  register: async (commands) => {
    const fleetPlugin = createPlugin();
    await fleetPlugin.registerCommands(commands);
  }
};
async function fallbackRegister() {
  console.warn("[FleetTools] OpenCode SDK not available. Running in CLI fallback mode.");
  console.warn("[FleetTools] The following commands are available via fleet CLI:");
  console.warn("  - fleet status");
  console.warn("  - fleet setup");
  console.warn("  - fleet doctor");
  console.warn("  - fleet services");
  console.warn("  - fleet help");
}
var src_default = fleetToolsPlugin;
export {
  fleetToolsPlugin,
  fallbackRegister,
  src_default as default,
  createPlugin,
  FleetToolsOpenCodePluginImpl
};
