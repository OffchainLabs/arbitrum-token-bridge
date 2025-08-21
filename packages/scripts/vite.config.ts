import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['cjs', 'es'],
      fileName: format => `scripts.${format}.js`
    },
    rollupOptions: {
      external: [
        '@actions/core',
        '@actions/github',
        'axios',
        'fs',
        'commander',
        'sharp',
        'path'
      ]
    }
  },
  optimizeDeps: {
    exclude: ['sharp']
  },
  resolve: {
    alias: {
      path: 'path'
    }
  }
})
