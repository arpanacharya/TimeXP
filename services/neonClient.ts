
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.NEON_DATABASE_URL || '';

// The neon() function creates an HTTP-based connection to Postgres
export const sql = databaseUrl && databaseUrl !== 'undefined' 
  ? neon(databaseUrl) 
  : null;

export const isCloudEnabled = !!sql;
