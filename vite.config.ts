
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env vars from the system environment.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Ensure variables are strictly stringified for the global replacement
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.NEON_DATABASE_URL': JSON.stringify(env.NEON_DATABASE_URL || ''),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      port: 3000
    }
  };
});
