import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/highlight.js")) {
            return "markdown-highlight";
          }

          if (
            id.includes("node_modules/react-markdown") ||
            id.includes("node_modules/remark-gfm") ||
            id.includes("node_modules/mdast") ||
            id.includes("node_modules/micromark") ||
            id.includes("node_modules/unified") ||
            id.includes("node_modules/remark-") ||
            id.includes("node_modules/rehype")
          ) {
            return "markdown-renderer";
          }

          if (id.includes("node_modules/@tauri-apps") || id.includes("node_modules/react")) {
            return "app-vendor";
          }
        }
      }
    }
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"]
});
