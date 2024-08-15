import { Wallet } from 'ethers'
import { defineConfig } from 'cypress'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import synpressPlugins from '@synthetixio/synpress/plugins'
import logsPrinter from 'cypress-terminal-report/src/installLogsPrinter'
import { NetworkName } from './tests/support/common'
import { getCommonSynpressConfig } from './tests/e2e/getCommonSynpressConfig'

const shouldRecordVideo = process.env.CYPRESS_RECORD_VIDEO === 'true'

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

if (!process.env.TEST_FILE) {
  throw new Error('process.env.TEST_FILE is missing.')
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

      // const userWalletAddress = await userWallet.getAddress()
      // config.env.ADDRESS = userWalletAddress
      // config.env.LOCAL_CCTP_WALLET_PRIVATE_KEY = localWallet.privateKey

      // // Fund wallet
      // console.log(`Funding user wallet: ${userWalletAddress}`)
      // await Promise.all([
      //   // Sepolia
      //   cy.fundEth({
      //     address: userWalletAddress,
      //     provider: sepoliaProvider,
      //     sourceWallet: localWallet,
      //     amount: utils.parseEther('0.01')
      //   }),
      //   cy.fundUsdc({
      //     address: userWalletAddress,
      //     provider: sepoliaProvider,
      //     networkType: 'parentChain',
      //     amount: utils.parseUnits('0.0001', 6)
      //   }),
      //   // ArbSepolia
      //   cy.fundEth({
      //     address: userWalletAddress,
      //     provider: arbSepoliaProvider,
      //     sourceWallet: localWallet,
      //     amount: utils.parseEther('0.01')
      //   }),
      //   cy.fundUsdc({
      //     address: userWalletAddress,
      //     provider: arbSepoliaProvider,
      //     networkType: 'childChain',
      //     amount: utils.parseUnits('0.0001', 6)
      //   })
      // ])

      synpressPlugins(on, config)
      setupCypressTasks(on)
      return config
    },
    baseUrl: 'http://localhost:3000',
    specPattern: [process.env.TEST_FILE],
    supportFile: 'tests/support/index.ts'
  }
})

function setupCypressTasks(on: Cypress.PluginEvents) {
  let currentNetworkName: NetworkName | null = null
  let networkSetupComplete = true
  let walletConnectedToDapp = false

  on('task', {
    setCurrentNetworkName: (networkName: NetworkName) => {
      currentNetworkName = networkName
      return null
    },
    getCurrentNetworkName: () => {
      return currentNetworkName
    },
    setNetworkSetupComplete: () => {
      networkSetupComplete = true
      return null
    },
    getNetworkSetupComplete: () => {
      return networkSetupComplete
    },
    setWalletConnectedToDapp: () => {
      walletConnectedToDapp = true
      return null
    },
    getWalletConnectedToDapp: () => {
      return walletConnectedToDapp
    }
  })
}
