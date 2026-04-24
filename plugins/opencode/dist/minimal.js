// @bun
// src/minimal.ts
var FleetToolsPlugin = async () => {
  return {
    tool: {
      fleet_status: { description: "Get FleetTools service status" },
      fleet_start: { description: "Start FleetTools services" },
      fleet_stop: { description: "Stop FleetTools services" },
      fleet_setup: { description: "Setup OpenCode commands" },
      fleet_context: { description: "Get FleetTools context" }
    },
    config: () => ({})
  };
};
export {
  FleetToolsPlugin
};
