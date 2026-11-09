import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

/** `ITCH=1`: the build uploaded to itch.io (the game only, no inbox, no Vercel analytics). */
const itch = !!process.env.ITCH;
const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? (itch ? execSync('git rev-parse HEAD').toString().trim() : 'dev');

export default defineConfig({
  base: './',
  server: { host: true },
  // Which build a player is on, sent along with bug reports ("-itch" for the itch.io upload).
  define: { __BUILD__: JSON.stringify(commit.slice(0, 7) + (itch ? '-itch' : '')) },
  build: {
    outDir: itch ? 'dist-itch' : 'dist',
    rollupOptions: {
      // The game, and the owner's feedback inbox.
      input: itch ? { main: resolve(__dirname, 'index.html') } : { main: resolve(__dirname, 'index.html'), inbox: resolve(__dirname, 'inbox.html') },
    },
  },
});
