import { Wallet, utils } from 'ethers'
import { defineConfig } from 'cypress'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import synpressPlugins from '@synthetixio/synpress/plugins'
import logsPrinter from 'cypress-terminal-report/src/installLogsPrinter'
import { getCommonSynpressConfig } from './tests/e2e/getCommonSynpressConfig'
import { setupCypressTasks, fundEth, fundUsdc } from './tests/support/common'
import specFiles from './tests/e2e/cctp.json'

const shouldRecordVideo = process.env.CYPRESS_RECORD_VIDEO === 'true'

const tests = process.env.TEST_FILE
  ? [process.env.TEST_FILE]
  : specFiles.map(file => file.file)

const INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY
if (typeof INFURA_KEY === 'undefined') {
  throw new Error('Infura API key not provided')
}

const SEPOLIA_INFURA_RPC_URL = `https://sepolia.infura.io/v3/${INFURA_KEY}`
const ARB_SEPOLIA_INFURA_RPC_URL = `https://arbitrum-sepolia.infura.io/v3/${INFURA_KEY}`

const sepoliaProvider = new StaticJsonRpcProvider(SEPOLIA_INFURA_RPC_URL)
const arbSepoliaProvider = new StaticJsonRpcProvider(ARB_SEPOLIA_INFURA_RPC_URL)

if (!process.env.PRIVATE_KEY_CCTP) {
  throw new Error('PRIVATE_KEY_CCTP variable missing.')
}

// Wallet funded on Sepolia and ArbSepolia with ETH and USDC
const localWallet = new Wallet(process.env.PRIVATE_KEY_CCTP)
// Generate a new wallet every time
const userWallet = Wallet.createRandom()

export default defineConfig({
  ...getCommonSynpressConfig(shouldRecordVideo),
  e2e: {
    async setupNodeEvents(on, config) {
      logsPrinter(on)

      const userWalletAddress = await userWallet.getAddress()
      config.env.ADDRESS = userWalletAddress
      config.env.LOCAL_CCTP_WALLET_PRIVATE_KEY = localWallet.privateKey
      config.env.SEPOLIA_INFURA_RPC_URL = SEPOLIA_INFURA_RPC_URL
      config.env.ARB_SEPOLIA_INFURA_RPC_URL = ARB_SEPOLIA_INFURA_RPC_URL

      // Fund wallet
      console.log(`Funding user wallet: ${userWalletAddress}`)
      await Promise.all([
        // Sepolia
        fundEth({
          address: userWalletAddress,
          provider: sepoliaProvider,
          sourceWallet: localWallet,
          amount: utils.parseEther('0.01')
        }),
        // ArbSepolia
        fundEth({
          address: userWalletAddress,
          provider: arbSepoliaProvider,
          sourceWallet: localWallet,
          amount: utils.parseEther('0.01')
        })
      ])
      await Promise.all([
        fundUsdc({
          address: userWalletAddress,
          provider: sepoliaProvider,
          networkType: 'parentChain',
          sourceWallet: localWallet,
          amount: utils.parseUnits('0.0001', 6)
        }),
        fundUsdc({
          address: userWalletAddress,
          provider: arbSepoliaProvider,
          networkType: 'childChain',
          sourceWallet: localWallet,
          amount: utils.parseUnits('0.0001', 6)
        })
      ])

      setupCypressTasks(on, { requiresNetworkSetup: false })
      synpressPlugins(on, config)
      return config
    },
    baseUrl: 'http://localhost:3000',
    specPattern: tests,
    supportFile: 'tests/support/index.ts'
  }
})
