import { BigNumber, Contract, Wallet, utils } from 'ethers'
import { defineConfig } from 'cypress'
import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers'
import synpressPlugins from '@synthetixio/synpress/plugins'
import logsPrinter from 'cypress-terminal-report/src/installLogsPrinter'
import { getCommonSynpressConfig } from './tests/e2e/getCommonSynpressConfig'
import {
  setupCypressTasks,
  fundEth,
  getCustomDestinationAddress,
  NetworkType
} from './tests/support/common'
import specFiles from './tests/e2e/cctp.json'
import { CommonAddress } from './src/util/CommonAddressUtils'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { TokenMessengerAbi } from './src/util/cctp/TokenMessengerAbi'
import { ChainDomain } from './src/pages/api/cctp/[type]'
import { cctpEnv, shouldRecordVideo } from './src/config/cctp.env'

const tests = cctpEnv.TEST_FILE
  ? [cctpEnv.TEST_FILE]
  : specFiles.map(file => file.file)

const INFURA_KEY = cctpEnv.NEXT_PUBLIC_INFURA_KEY
if (typeof INFURA_KEY === 'undefined') {
  throw new Error('Infura API key not provided')
}

const SEPOLIA_INFURA_RPC_URL = `https://sepolia.infura.io/v3/${INFURA_KEY}`
const sepoliaRpcUrl =
  cctpEnv.NEXT_PUBLIC_RPC_URL_SEPOLIA ?? SEPOLIA_INFURA_RPC_URL
const arbSepoliaRpcUrl = 'https://sepolia-rollup.arbitrum.io/rpc'

const sepoliaProvider = new StaticJsonRpcProvider(sepoliaRpcUrl)
const arbSepoliaProvider = new StaticJsonRpcProvider(arbSepoliaRpcUrl)

if (!cctpEnv.PRIVATE_KEY_CCTP) {
  throw new Error('PRIVATE_KEY_CCTP variable missing.')
}
if (!cctpEnv.PRIVATE_KEY_USER) {
  throw new Error('PRIVATE_KEY_USER variable missing.')
}

const userWallet = new Wallet(cctpEnv.PRIVATE_KEY_USER)
const cctpWallet = new Wallet(cctpEnv.PRIVATE_KEY_CCTP)

export default defineConfig({
  ...getCommonSynpressConfig(shouldRecordVideo),
  e2e: {
    async setupNodeEvents(on, config) {
      logsPrinter(on)

      const userWalletAddress = await userWallet.getAddress()

      // Fund the userWallet. We do this to run tests on a small amount of ETH.
      await Promise.all([
        fundEth({
          address: userWalletAddress,
          provider: sepoliaProvider,
          sourceWallet: cctpWallet,
          amount: utils.parseEther('0.5'),
          networkType: 'parentChain'
        }),
        fundEth({
          address: userWalletAddress,
          provider: arbSepoliaProvider,
          sourceWallet: cctpWallet,
          amount: utils.parseEther('0.5'),
          networkType: 'childChain'
        })
      ])

      // Set Cypress variables
      config.env.ETH_SEPOLIA_RPC_URL = sepoliaRpcUrl
      config.env.ARB_SEPOLIA_RPC_URL = arbSepoliaRpcUrl
      config.env.ADDRESS = userWalletAddress
      config.env.PRIVATE_KEY = userWallet.privateKey
      config.env.INFURA_KEY = INFURA_KEY
      config.env.CUSTOM_DESTINATION_ADDRESS =
        await getCustomDestinationAddress()

      synpressPlugins(on, config)
      setupCypressTasks(on, { requiresNetworkSetup: false })
      return config
    },
    baseUrl: 'http://localhost:3000',
    specPattern: tests,
    supportFile: 'tests/support/index.ts',
    defaultCommandTimeout: 20_000,
    browsers: [
      {
        name: 'chrome',
        family: 'chromium',
        channel: 'stable',
        displayName: 'Chrome',
        version: '114.0.5735.133',
        path: '',
        majorVersion: '114'
      }
    ]
  }
})
