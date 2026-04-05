import { defineConfig } from "vite";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, "/");
          if (normalized.includes("node_modules/phaser")) {
            return "phaser-engine";
          }
          if (normalized.includes("node_modules/socket.io-client")) {
            return "network";
          }
          if (normalized.includes("/src/scenes/")) {
            const match = normalized.match(/\/src\/scenes\/([^/]+)\.(ts|js)$/);
            return match ? `scene-${match[1]}` : "scene-shared";
          }
          if (normalized.includes("/src/theme/") || normalized.includes("/src/assets/")) {
            return "ui-kit";
          }
          return undefined;
        }
      }
    }
  }
});
