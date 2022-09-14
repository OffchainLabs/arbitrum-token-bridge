import { defineConfig } from 'cypress'
import synpressPlugins from '@synthetixio/synpress/plugins'

export default defineConfig({
  userAgent: 'synpress',
  retries: {
    runMode: process.env.CI ? 1 : 0,
    openMode: 0
  },
  screenshotsFolder: 'cypress/screenshots',
  videosFolder: 'cypress/videos',
  video: true,
  chromeWebSecurity: true,
  viewportWidth: 1366,
  viewportHeight: 850,
  env: {
    coverage: false
  },
  defaultCommandTimeout: 30000,
  pageLoadTimeout: 30000,
  requestTimeout: 30000,
  e2e: {
    setupNodeEvents(on, config) {
      synpressPlugins(on, config)
    },
    baseUrl: 'http://localhost:3000',
    specPattern: 'tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'tests/support/index.ts'
  }
})
