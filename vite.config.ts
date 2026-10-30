import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true },
  // Which build a player is on, sent along with bug reports.
  define: { __BUILD__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7)) },
});
