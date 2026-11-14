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
      // itch.io gets the game only (renamed to index.html after the build). Our own site: the website pages, the game
      // at /play, and the owner's feedback inbox.
      input: itch
        ? { play: resolve(__dirname, 'play.html') }
        : Object.fromEntries(['index', 'play', 'world', 'classes', 'bestiary', 'devlog', 'wayfinder', 'inbox'].map((p) => [p, resolve(__dirname, `${p}.html`)])),
    },
  },
});
