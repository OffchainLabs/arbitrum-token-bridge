import { BigNumber, constants, Wallet, utils } from 'ethers'
import { defineConfig } from 'cypress'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import synpressPlugins from '@synthetixio/synpress/plugins'
import cypressLocalStoragePlugin from 'cypress-localstorage-commands/plugin'
import { TestWETH9__factory } from '@arbitrum/sdk/dist/lib/abi/factories/TestWETH9__factory'
import { TestERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/TestERC20__factory'
import { Erc20Bridger } from '@arbitrum/sdk'
import { registerLocalNetwork } from './src/util/networks'

import { wethTokenAddressL1, wethTokenAddressL2 } from './tests/support/common'

export default defineConfig({
  userAgent: 'synpress',
  retries: 4,
  screenshotsFolder: 'cypress/screenshots',
  videosFolder: 'cypress/videos',
  video: true,
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
      registerLocalNetwork()

      const ethRpcUrl = process.env.NEXT_PUBLIC_LOCAL_ETHEREUM_RPC_URL
      const arbRpcUrl = process.env.NEXT_PUBLIC_LOCAL_ARBITRUM_RPC_URL

      const wallet = new Wallet(process.env.PRIVATE_KEY_CUSTOM!)
      const ethProvider = new StaticJsonRpcProvider(ethRpcUrl)
      const arbProvider = new StaticJsonRpcProvider(arbRpcUrl)
      const testWallet = Wallet.createRandom()
      const testWalletAddress = await testWallet.getAddress()
      const erc20Bridger = await Erc20Bridger.fromProvider(arbProvider)
      const erc20Contract = new TestERC20__factory().connect(
        wallet.connect(ethProvider)
      )

      const getWethContract = (
        provider: StaticJsonRpcProvider,
        tokenAddress: string
      ) =>
        TestWETH9__factory.connect(tokenAddress, testWallet.connect(provider))

      // Deploy ERC-20 token to L1
      const l1Erc20Token = await erc20Contract.deploy()
      await l1Erc20Token.deployed()

      // Deploy ERC-20 token to L2
      const l2Deploy = await erc20Bridger.deposit({
        amount: BigNumber.from(0),
        erc20L1Address: l1Erc20Token.address,
        l1Signer: wallet.connect(ethProvider),
        l2Provider: arbProvider
      })
      await l2Deploy.wait()

      // Mint ERC-20 token
      // We need this to test token approval
      // WETH is pre-approved so we need a new token
      const mintedL1Erc20Token = await l1Erc20Token.mint()
      await mintedL1Erc20Token.wait()

      // Send minted ERC-20 to the test wallet
      await l1Erc20Token
        .connect(wallet.connect(ethProvider))
        .transfer(testWalletAddress, BigNumber.from(50000000))

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
        tx = await getWethContract(ethProvider, wethTokenAddressL1).deposit({
          value: utils.parseEther('0.2')
        })
        await tx.wait()
        // L2
        tx = await getWethContract(arbProvider, wethTokenAddressL2).deposit({
          value: utils.parseEther('0.1')
        })

        // Approve WETH
        tx = await getWethContract(ethProvider, wethTokenAddressL1).approve(
          // L1 WETH gateway
          '0xF5FfD11A55AFD39377411Ab9856474D2a7Cb697e',
          constants.MaxInt256
        )
        await tx.wait()
      })
      config.env.ETH_RPC_URL = ethRpcUrl
      config.env.ARB_RPC_URL = arbRpcUrl
      config.env.ADDRESS = testWalletAddress
      config.env.PRIVATE_KEY = testWallet.privateKey
      config.env.INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY
      config.env.ERC20_TOKEN_ADDRESS_L1 = l1Erc20Token.address
      config.env.ERC20_TOKEN_ADDRESS_L2 = await erc20Bridger.getL2ERC20Address(
        l1Erc20Token.address,
        ethProvider
      )
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
      'tests/e2e/specs/**/approveToken.cy.{js,jsx,ts,tsx}', // approve ERC20
      'tests/e2e/specs/**/importToken.cy.{js,jsx,ts,tsx}', // import test ERC20
      'tests/e2e/specs/**/urlQueryParam.cy.{js,jsx,ts,tsx}', // URL Query Param
      'tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}' // rest of the tests...
    ],
    supportFile: 'tests/support/index.ts'
  }
})
