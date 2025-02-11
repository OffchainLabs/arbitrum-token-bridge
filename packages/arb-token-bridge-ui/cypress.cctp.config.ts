import { BigNumber, Contract, Wallet, utils } from 'ethers'
import { defineConfig } from 'cypress'
import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers'
import logsPrinter from 'cypress-terminal-report/src/installLogsPrinter'
import { configureSynpressForMetaMask } from '@synthetixio/synpress/cypress'

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
import { Address } from 'wagmi'
import { browserConfig } from './tests/e2e/browser.config'

export async function fundUsdc({
  address, // wallet address where funding is required
  provider,
  amount,
  networkType,
  sourceWallet
}: {
  address: string
  provider: Provider
  amount: BigNumber
  sourceWallet: Wallet
  networkType: NetworkType
}) {
  console.log(`Funding USDC ${address} on ${networkType}...`)
  const usdcContractAddress =
    networkType === 'parentChain'
      ? CommonAddress.Sepolia.USDC
      : CommonAddress.ArbitrumSepolia.USDC

  const contract = new ERC20__factory().connect(sourceWallet.connect(provider))
  const token = contract.attach(usdcContractAddress)
  await token.deployed()
  const tx = await token.transfer(address, amount)
  await tx.wait()
}

const shouldRecordVideo = process.env.CYPRESS_RECORD_VIDEO === 'true'

const tests =
  process.env.TEST_FILE &&
  specFiles.find(file => file.name === process.env.TEST_FILE)
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
  process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA ?? SEPOLIA_INFURA_RPC_URL
const arbSepoliaRpcUrl = 'https://sepolia-rollup.arbitrum.io/rpc'

const sepoliaProvider = new StaticJsonRpcProvider(sepoliaRpcUrl)
const arbSepoliaProvider = new StaticJsonRpcProvider(arbSepoliaRpcUrl)

// Wallet funded on Sepolia and ArbSepolia with ETH and USDC
const localWallet = new Wallet(process.env.PRIVATE_KEY_CCTP)
// Generate a new wallet every time
const userWallet = Wallet.createRandom()

async function fundWallets() {
  const userWalletAddress = userWallet.address
  console.log(`Funding wallet ${userWalletAddress}`)

  const fundEthHelper = (
    network: 'sepolia' | 'arbSepolia',
    amount: BigNumber
  ) => {
    return fundEth({
      address: userWalletAddress,
      sourceWallet: localWallet,
      ...(network === 'sepolia'
        ? {
            provider: sepoliaProvider,
            amount,
            networkType: 'parentChain'
          }
        : {
            provider: arbSepoliaProvider,
            amount,
            networkType: 'childChain'
          })
    })
  }
  const fundUsdcHelper = (
    network: 'sepolia' | 'arbSepolia',
    amount: BigNumber = usdcAmount
  ) => {
    return fundUsdc({
      address: userWalletAddress,
      sourceWallet: localWallet,
      amount,
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
   * We need 0.0002 USDC per test (0.0001 for same address and 0.00011 for custom address)
   * And in the worst case, we run each tests 3 time
   */
  const usdcAmount = utils.parseUnits('0.00063', 6)
  const ethAmountSepolia = utils.parseEther('0.025')
  const ethAmountArbSepolia = utils.parseEther('0.006')

  if (tests.some(testFile => testFile.includes('deposit'))) {
    // Add ETH and USDC on ArbSepolia, to generate tx on ArbSepolia
    await Promise.all([
      fundEthHelper('sepolia', ethAmountSepolia),
      fundEthHelper('arbSepolia', utils.parseEther('0.01'))
    ])
    await Promise.all([
      fundUsdcHelper('sepolia'),
      fundUsdcHelper('arbSepolia', utils.parseUnits('0.00029', 6))
    ])
  }

  if (tests.some(testFile => testFile.includes('withdraw'))) {
    // Add ETH and USDC on Sepolia, to generate tx on Sepolia
    await Promise.all([
      fundEthHelper('arbSepolia', ethAmountArbSepolia),
      fundEthHelper('sepolia', utils.parseEther('0.01'))
    ])
    await Promise.all([
      fundUsdcHelper('arbSepolia'),
      fundUsdcHelper('sepolia', utils.parseUnits('0.00025', 6))
    ])
  }
}

async function createCctpTx(
  type: 'deposit' | 'withdrawal',
  destinationAddress: Address,
  amount: string
) {
  console.log(`Creating CCTP transaction for ${destinationAddress}`)
  const provider = type === 'deposit' ? sepoliaProvider : arbSepoliaProvider
  const usdcAddress =
    type === 'deposit'
      ? CommonAddress.Sepolia.USDC
      : CommonAddress.ArbitrumSepolia.USDC
  const tokenMessengerContractAddress =
    type === 'deposit'
      ? CommonAddress.Sepolia.tokenMessengerContractAddress
      : CommonAddress.ArbitrumSepolia.tokenMessengerContractAddress

  const signer = userWallet.connect(provider)
  const usdcContract = ERC20__factory.connect(usdcAddress, signer)

  const tx = await usdcContract.functions.approve(
    tokenMessengerContractAddress,
    utils.parseUnits(amount, 6)
  )

  await tx.wait()

  const tokenMessenger = new Contract(
    tokenMessengerContractAddress,
    TokenMessengerAbi,
    signer
  )

  await tokenMessenger.deployed()

  const depositForBurnTx = await tokenMessenger.functions.depositForBurn(
    utils.parseUnits(amount, 6),
    type === 'deposit' ? ChainDomain.ArbitrumOne : ChainDomain.Ethereum,
    utils.hexlify(utils.zeroPad(destinationAddress, 32)),
    usdcAddress
  )

  await depositForBurnTx.wait()
}

export default defineConfig({
  ...getCommonSynpressConfig(shouldRecordVideo),
  e2e: {
    async setupNodeEvents(on, config) {
      logsPrinter(on)

      await fundWallets()

      const customAddress = await getCustomDestinationAddress()
      config.env.PRIVATE_KEY = userWallet.privateKey
      config.env.PRIVATE_KEY_CCTP = process.env.PRIVATE_KEY_CCTP
      config.env.SEPOLIA_INFURA_RPC_URL = sepoliaRpcUrl
      config.env.ARB_SEPOLIA_INFURA_RPC_URL = arbSepoliaRpcUrl
      config.env.CUSTOM_DESTINATION_ADDRESS = customAddress

      /**
       * Currently, we can't confirm transaction on Sepolia, we need to programmatically deposit on Sepolia
       * And claim on ArbSepolia
       *
       * - Create one deposit transaction, claimed in withdrawCctp
       * - Create one deposit transaction to custom address, claimed in withdrawCctp
       * - Create one withdraw transaction, rejected in depositCctp
       * - Create one withdraw transaction to custom address, rejected in depositCctp
       */
      if (tests.some(testFile => testFile.includes('deposit'))) {
        await createCctpTx(
          'withdrawal',
          userWallet.address as Address,
          '0.00014'
        )
        await createCctpTx('withdrawal', customAddress as Address, '0.00015')
      }

      if (tests.some(testFile => testFile.includes('withdraw'))) {
        await createCctpTx('deposit', userWallet.address as Address, '0.00012')
        await createCctpTx('deposit', customAddress as Address, '0.00013')
      }

      configureSynpressForMetaMask(on, config)
      setupCypressTasks(on, { requiresNetworkSetup: false })

      config.browsers = [
        {
          ...browserConfig,
          family: 'chromium' // type issue if not added here
        }
      ]

      return config
    },
    baseUrl: 'http://localhost:3000',
    specPattern: tests,
    supportFile: 'tests/support/index.ts',
  }
})
