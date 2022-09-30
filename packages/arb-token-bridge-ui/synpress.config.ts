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
  defaultCommandTimeout: 45000,
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
    specPattern: [
      // order of running the tests...
      'tests/e2e/specs/**/login.cy.{js,jsx,ts,tsx}', // login and balance check
      'tests/e2e/specs/**/depositETH.cy.{js,jsx,ts,tsx}', // deposit ETH
      'tests/e2e/specs/**/withdrawETH.cy.{js,jsx,ts,tsx}', // withdraw ETH
      'tests/e2e/specs/**/depositCustomERC20.cy.{js,jsx,ts,tsx}', // deposit ERC20
      'tests/e2e/specs/**/withdrawCustomERC20.cy.{js,jsx,ts,tsx}', // withdraw ERC20 (assumes L2 network is already added in a prev test)
      'tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}' // rest of the tests...
    ],
    supportFile: 'tests/support/index.ts'
  }
})
