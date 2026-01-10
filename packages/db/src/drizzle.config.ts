/**
 * Drizzle Kit Configuration
 */

import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './fleettools.db',
  },
} satisfies Config;
