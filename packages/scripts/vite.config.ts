import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["cjs", "es"],
      fileName: (format) => `scripts.${format}.js`,
    },
    rollupOptions: {
      external: [
        "@actions/core",
        "@actions/github",
        "@actions/artifact",
        "axios",
        "fs",
        "commander",
        "sharp",
        "path",
        "puppeteer",
        "lighthouse",
      ],
    },
  },
  optimizeDeps: {
    exclude: ["sharp", "puppeteer", "lighthouse"],
  },
  resolve: {
    alias: {
      path: "path",
    },
  },
});
