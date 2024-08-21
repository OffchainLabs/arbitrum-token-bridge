import { Wallet, utils } from 'ethers'
import { defineConfig } from 'cypress'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import synpressPlugins from '@synthetixio/synpress/plugins'
import logsPrinter from 'cypress-terminal-report/src/installLogsPrinter'
import { getCommonSynpressConfig } from './tests/e2e/getCommonSynpressConfig'
import {
  setupCypressTasks,
  fundEth,
  fundUsdc,
  getCustomDestinationAddress
} from './tests/support/common'
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

if (!process.env.PRIVATE_KEY_CCTP) {
  throw new Error('PRIVATE_KEY_CCTP variable missing.')
}

if (!process.env.PRIVATE_KEY_USER) {
  throw new Error('PRIVATE_KEY_USER variable missing.')
}

async function fundWallets() {
  const userWalletAddress = await userWallet.getAddress()
  console.log(`Funding wallet ${userWalletAddress}`)

  /**
   * We need 0.0002 USDC per test (0.0001 for same address and 0.0001 for custom address)
   * And in the worst case, we run each tests 3 time
   */
  const usdcAmount = utils.parseUnits('0.0006', 6)
  const ethAmount = utils.parseEther('0.006')
  const ethPromises: (() => Promise<void>)[] = []
  const usdcPromises: (() => Promise<void>)[] = []

  if (tests.length === 2) {
    ethPromises.push(() =>
      fundEth({
        address: userWalletAddress,
        provider: sepoliaProvider,
        sourceWallet: localWallet,
        amount: ethAmount
      })
    )
    ethPromises.push(() =>
      fundEth({
        address: userWalletAddress,
        provider: arbSepoliaProvider,
        sourceWallet: localWallet,
        amount: ethAmount
      })
    )
    usdcPromises.push(
      () =>
        fundUsdc({
          address: userWalletAddress,
          provider: sepoliaProvider,
          networkType: 'parentChain',
          sourceWallet: localWallet,
          amount: usdcAmount
        }),
      () =>
        fundUsdc({
          address: userWalletAddress,
          provider: arbSepoliaProvider,
          networkType: 'childChain',
          sourceWallet: localWallet,
          amount: usdcAmount
        })
    )
  } else if (tests[0].includes('deposit')) {
    ethPromises.push(() =>
      fundEth({
        address: userWalletAddress,
        provider: sepoliaProvider,
        sourceWallet: localWallet,
        amount: ethAmount
      })
    )
    usdcPromises.push(() =>
      fundUsdc({
        address: userWalletAddress,
        provider: sepoliaProvider,
        networkType: 'parentChain',
        sourceWallet: localWallet,
        amount: usdcAmount
      })
    )
  } else {
    ethPromises.push(() =>
      fundEth({
        address: userWalletAddress,
        provider: arbSepoliaProvider,
        sourceWallet: localWallet,
        amount: ethAmount
      })
    )
    usdcPromises.push(() =>
      fundUsdc({
        address: userWalletAddress,
        provider: arbSepoliaProvider,
        networkType: 'childChain',
        sourceWallet: localWallet,
        amount: usdcAmount
      })
    )
  }

  await Promise.all(ethPromises.map(fn => fn()))
  await Promise.all(usdcPromises.map(fn => fn()))
}

export default defineConfig({
  ...getCommonSynpressConfig(shouldRecordVideo),
  e2e: {
    async setupNodeEvents(on, config) {
      logsPrinter(on)

      await fundWallets()

      config.env.PRIVATE_KEY = userWallet.privateKey
      config.env.PRIVATE_KEY_CCTP = process.env.PRIVATE_KEY_CCTP
      config.env.SEPOLIA_INFURA_RPC_URL = SEPOLIA_INFURA_RPC_URL
      config.env.ARB_SEPOLIA_INFURA_RPC_URL = ARB_SEPOLIA_INFURA_RPC_URL
      config.env.CUSTOM_DESTINATION_ADDRESS =
        await getCustomDestinationAddress()

      setupCypressTasks(on, { requiresNetworkSetup: false })
      synpressPlugins(on, config)
      return config
    },
    baseUrl: 'http://localhost:3000',
    specPattern: tests,
    supportFile: 'tests/support/index.ts'
  }
})
