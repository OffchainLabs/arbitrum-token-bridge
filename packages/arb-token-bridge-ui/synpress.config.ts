import { defineConfig } from 'cypress'
import synpressPlugins from '@synthetixio/synpress/plugins'
import cypressLocalStoragePlugin from 'cypress-localstorage-commands/plugin'

export default defineConfig({
  userAgent: 'synpress',
  retries: {
    // Configure retry attempts for `cypress run`
    // Default is 0
    runMode: 0,
    openMode: 0
  },
  screenshotsFolder: 'cypress/screenshots',
  videosFolder: 'cypress/videos',
  video: false,
  chromeWebSecurity: true,
  modifyObstructiveCode: false,
  viewportWidth: 1366,
  viewportHeight: 850,
  env: {
    coverage: false
  },
  defaultCommandTimeout: 30000,
  pageLoadTimeout: 30000,
  requestTimeout: 30000,
  e2e: {
    // @ts-ignore
    setupNodeEvents(on, config) {
      config.env.ADDRESS = process.env.ADDRESS
      config.env.INFURA_KEY = process.env.REACT_APP_INFURA_KEY
      cypressLocalStoragePlugin(on, config)
      synpressPlugins(on, config)
      return config
    },
    baseUrl: 'http://localhost:3000',
    specPattern: 'tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'tests/support/index.ts',
    testIsolation: 'strict'
  }
})
