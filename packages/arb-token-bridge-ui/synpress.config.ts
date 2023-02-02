import { constants, Wallet, utils } from 'ethers'
import { defineConfig } from 'cypress'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import synpressPlugins from '@synthetixio/synpress/plugins'
import cypressLocalStoragePlugin from 'cypress-localstorage-commands/plugin'
import { TestWETH9__factory } from '@arbitrum/sdk/dist/lib/abi/factories/TestWETH9__factory'

import {
  ethRpcUrl,
  ERC20TokenAddressL1,
  ERC20TokenAddressL2,
  arbRpcUrl
} from './tests/support/common'

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
      const wallet = new Wallet(process.env.PRIVATE_KEY_CUSTOM!)
      const ethProvider = new StaticJsonRpcProvider(ethRpcUrl)
      const arbProvider = new StaticJsonRpcProvider(arbRpcUrl)
      const testWallet = Wallet.createRandom()
      const testWalletAddress = await testWallet.getAddress()

      const getWethContract = (
        provider: StaticJsonRpcProvider,
        tokenAddress: string
      ) =>
        TestWETH9__factory.connect(tokenAddress, testWallet.connect(provider))

      on('before:run', async () => {
        let tx
        // Fund the test wallet. We do this to run tests on a small amount of ETH.
        // Fund L1
        tx = await wallet.connect(ethProvider).sendTransaction({
          to: testWalletAddress,
          value: utils.parseEther('123.45678')
        })
        await tx.wait()
        // Fund L2
        tx = await wallet.connect(arbProvider).sendTransaction({
          to: testWalletAddress,
          value: utils.parseEther('0.5')
        })
        await tx.wait()

        // Wrap ETH to test ERC-20 transactions
        // L1
        tx = await getWethContract(ethProvider, ERC20TokenAddressL1).deposit({
          value: utils.parseEther('0.2')
        })
        await tx.wait()
        // L2
        tx = await getWethContract(arbProvider, ERC20TokenAddressL2).deposit({
          value: utils.parseEther('0.1')
        })

        // Approve ERC-20
        tx = await getWethContract(ethProvider, ERC20TokenAddressL1).approve(
          // L1 WETH gateway
          '0xF5FfD11A55AFD39377411Ab9856474D2a7Cb697e',
          constants.MaxInt256
        )
        await tx.wait()
      })
      config.env.ADDRESS = testWalletAddress
      config.env.PRIVATE_KEY = testWallet.privateKey
      config.env.INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY
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
