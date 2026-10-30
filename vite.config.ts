import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true },
  // Which build a player is on, sent along with bug reports.
  define: { __BUILD__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7)) },
  build: {
    rollupOptions: {
      // The game, and the owner's feedback inbox.
      input: { main: resolve(__dirname, 'index.html'), inbox: resolve(__dirname, 'inbox.html') },
    },
  },
});
