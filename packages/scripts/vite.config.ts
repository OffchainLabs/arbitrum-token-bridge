import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    // Vite build configuration
    outDir: "dist",
    lib: {
      entry: "src/index.ts",
      formats: ["es", "cjs"],
      fileName: (format) => `scripts.${format}.js`,
    },
    rollupOptions: {
      external: [
        "@actions/core",
        "@actions/github",
        "axios",
        "fs",
        "commander",
      ],
    },
  },
  test: {
    // Vitest configuration
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    setupFiles: ["./src/addOrbitChain/tests/setup.ts"],

    exclude: [...configDefaults.exclude, "dist", "node_modules"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/**/*.{test,spec}.{js,ts}"],
    },
  },
});
