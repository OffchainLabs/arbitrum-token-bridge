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

if (!process.env.PRIVATE_KEY_CCTP) {
  throw new Error('PRIVATE_KEY_CCTP variable missing.')
}

if (!process.env.PRIVATE_KEY_USER) {
  throw new Error('PRIVATE_KEY_USER variable missing.')
}

const SEPOLIA_INFURA_RPC_URL = `https://sepolia.infura.io/v3/${INFURA_KEY}`
const sepoliaRpcUrl =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? SEPOLIA_INFURA_RPC_URL
const arbSepoliaRpcUrl = 'https://sepolia-rollup.arbitrum.io/rpc'

const sepoliaProvider = new StaticJsonRpcProvider(sepoliaRpcUrl)
const arbSepoliaProvider = new StaticJsonRpcProvider(arbSepoliaRpcUrl)

// Wallet funded on Sepolia and ArbSepolia with ETH and USDC
const localWallet = new Wallet(process.env.PRIVATE_KEY_CCTP)
// Generate a new wallet every time
const userWallet = Wallet.createRandom()

console.log(
  sepoliaRpcUrl,
  arbSepoliaRpcUrl,
  localWallet.address,
  userWallet.address
)

async function fundWallets() {
  const userWalletAddress = userWallet.address
  console.log(`Funding wallet ${userWalletAddress}`)

  const fundEthHelper = (network: 'sepolia' | 'arbSepolia') => {
    return () =>
      fundEth({
        address: userWalletAddress,
        sourceWallet: localWallet,
        ...(network === 'sepolia'
          ? {
              provider: sepoliaProvider,
              amount: ethAmountSepolia
            }
          : {
              provider: arbSepoliaProvider,
              amount: ethAmountArbSepolia
            })
      })
  }
  const fundUsdcHelper = (network: 'sepolia' | 'arbSepolia') => {
    return () =>
      fundUsdc({
        address: userWalletAddress,
        sourceWallet: localWallet,
        amount: usdcAmount,
        ...(network === 'sepolia'
          ? {
              provider: sepoliaProvider,
              networkType: 'parentChain'
            }
          : {
              provider: arbSepoliaProvider,
              networkType: 'childChain'
            })
      })
  }

  /**
   * We need 0.0002 USDC per test (0.0001 for same address and 0.0001 for custom address)
   * And in the worst case, we run each tests 3 time
   */
  const usdcAmount = utils.parseUnits('0.0006', 6)
  const ethAmountSepolia = utils.parseEther('0.01')
  const ethAmountArbSepolia = utils.parseEther('0.002')
  const ethPromises: (() => Promise<void>)[] = []
  const usdcPromises: (() => Promise<void>)[] = []

  if (tests.some(testFile => testFile.includes('deposit'))) {
    ethPromises.push(fundEthHelper('sepolia'))
    usdcPromises.push(fundUsdcHelper('sepolia'))
  }

  if (tests.some(testFile => testFile.includes('withdraw'))) {
    ethPromises.push(fundEthHelper('arbSepolia'))
    usdcPromises.push(fundUsdcHelper('arbSepolia'))
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
      config.env.SEPOLIA_INFURA_RPC_URL = sepoliaRpcUrl
      config.env.ARB_SEPOLIA_INFURA_RPC_URL = arbSepoliaRpcUrl
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
