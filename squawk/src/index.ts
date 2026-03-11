import { initializeDatabase, closeDatabase, mailboxOps, eventOps, cursorOps, lockOps } from './db/index.js';

// Re-export operations and database functions for external consumers
// This file is now side-effect free and only provides library functionality
export { mailboxOps, eventOps, cursorOps, lockOps, initializeDatabase, closeDatabase };

// Re-export recovery functionality for deep imports
export * as recovery from './recovery/index.js';