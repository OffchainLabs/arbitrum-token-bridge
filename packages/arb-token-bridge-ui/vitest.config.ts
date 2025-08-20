import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    sequence: { concurrent: true },
    snapshotFormat: {
      escapeString: true
    },
    testTimeout: 15_000,
    include: ['./src/**/*.test.ts', './src/**/*.test.tsx'],
    env: loadEnv('', process.cwd(), ''),
    environment: 'happy-dom',
    setupFiles: ['./vitest.mocks.ts']
  },
  resolve: {
    alias: {
      '@/images': path.resolve(__dirname, '../app/public/images'),
      '@/icons': path.resolve(__dirname, '../app/public/icons'),
      '@/token-bridge-sdk': path.resolve(__dirname, './src/token-bridge-sdk')
    }
  }
})
