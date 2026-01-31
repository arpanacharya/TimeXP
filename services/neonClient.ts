
import { neon } from '@neondatabase/serverless';

/**
 * Neon Client Configuration
 * Resolves the database URL from the environment injected during the build process.
 */
const getDatabaseUrl = () => {
  try {
    const url = typeof process !== 'undefined' ? process.env.NEON_DATABASE_URL : undefined;
    
    // Handle cases where build tools might inject the literal string "undefined"
    if (!url || url === 'undefined' || url === 'null' || url === '') {
      return null;
    }
    
    return url;
  } catch (e) {
    return null;
  }
};

const databaseUrl = getDatabaseUrl();

export const sql = databaseUrl ? neon(databaseUrl) : null;
export const isCloudEnabled = !!sql;

if (!isCloudEnabled) {
  console.warn(
    "⚠️ TimeXP: Neon Database URL is missing. " +
    "Please ensure NEON_DATABASE_URL is set in your Netlify Environment Variables " +
    "and trigger a new deployment."
  );
}
