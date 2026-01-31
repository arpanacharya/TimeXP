
import { neon } from '@neondatabase/serverless';

// process.env.NEON_DATABASE_URL is injected by Vite during build/dev
const databaseUrl = process.env.NEON_DATABASE_URL || '';

export const sql = databaseUrl && databaseUrl !== 'undefined' && databaseUrl !== ''
  ? neon(databaseUrl) 
  : null;

export const isCloudEnabled = !!sql;
