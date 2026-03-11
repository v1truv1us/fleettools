#!/usr/bin/env bun
/**
 * Squawk CLI Entrypoint
 * 
 * This is the executable entrypoint for the Squawk service.
 * It starts the server with default options and handles CLI-specific concerns.
 */

import { startSquawkServer } from './server.js';

// Start the server with default configuration
startSquawkServer({
  port: parseInt(process.env.SQUAWK_PORT || '3000', 10),
  onReady: (port) => {
    console.log(`Squawk server is ready on port ${port}`);
  },
  onRequestError: (error) => {
    console.error('Request error:', error);
  },
}).catch((error) => {
  console.error('Failed to start Squawk server:', error);
  process.exit(1);
});