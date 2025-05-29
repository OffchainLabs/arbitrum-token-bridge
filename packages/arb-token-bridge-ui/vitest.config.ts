import path from 'path'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    sequence: { concurrent: true },
    snapshotFormat: {
      escapeString: true
    },
    testTimeout: 5_000,
    include: ['./src/**/*.test.ts', './src/**/*.test.tsx'],
    env: loadEnv('', process.cwd(), ''),
    environment: 'happy-dom'
  },
  resolve: {
    alias: {
      '@/images': path.resolve(__dirname, './public/images'),
      '@/icons': path.resolve(__dirname, './public/icons'),
      '@/token-bridge-sdk': path.resolve(__dirname, './src/token-bridge-sdk')
    }
  }
})
