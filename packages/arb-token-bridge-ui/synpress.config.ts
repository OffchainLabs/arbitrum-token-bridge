import { constants, Wallet, utils } from 'ethers'
import { defineConfig } from 'cypress'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import synpressPlugins from '@synthetixio/synpress/plugins'
import cypressLocalStoragePlugin from 'cypress-localstorage-commands/plugin'
import { TestWETH9__factory } from '@arbitrum/sdk/dist/lib/abi/factories/TestWETH9__factory'

import { ethRpcUrl, ERC20TokenAddressL1 } from './tests/support/common'

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
      const provider = new StaticJsonRpcProvider(ethRpcUrl)

      on('before:run', async () => {
        const factory = TestWETH9__factory.connect(
          ERC20TokenAddressL1,
          wallet.connect(provider)
        )
        // WETH used to test ERC-20 transfers
        const wrapTx = await factory.deposit({ value: utils.parseEther('0.1') })
        await wrapTx.wait()
        // Approve ERC-20
        const approveTx = await factory.approve(
          // L1 WETH gateway
          '0xF5FfD11A55AFD39377411Ab9856474D2a7Cb697e',
          constants.MaxInt256
        )
        await approveTx.wait()
      })
      config.env.ADDRESS = await wallet.getAddress()
      config.env.PRIVATE_KEY = process.env.PRIVATE_KEY
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
