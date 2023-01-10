import { Wallet } from 'ethers'
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
    async setupNodeEvents(on, config) {
      const wallet = new Wallet(process.env.PRIVATE_KEY!)
      const walletAddress = await wallet.getAddress()
      on('before:browser:launch', (browser = {
        name: 'electron',
        family: 'chromium',
        displayName: 'Electron',
        channel: 'stable',
        version: '106',
        majorVersion: '106',
        path: '',
        isHeadless: true,
        isHeaded: false
      }, launchOptions = {
        preferences: {
          width: 1366,
          height: 850
        },
        extensions: [],
        args: [],
        env: {
          'ADDRESS': walletAddress,
          'INFURA_KEY': process.env.REACT_APP_INFURA_KEY
        }
      }) => {
        return launchOptions
      })
      config.env.ADDRESS = await wallet.getAddress()
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
      'tests/e2e/specs/**/depositERC20.cy.{js,jsx,ts,tsx}', // deposit ERC20
      'tests/e2e/specs/**/withdrawERC20.cy.{js,jsx,ts,tsx}', // withdraw ERC20 (assumes L2 network is already added in a prev test)
      'tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}' // rest of the tests...
    ],
    supportFile: 'tests/support/index.ts'
  }
})
