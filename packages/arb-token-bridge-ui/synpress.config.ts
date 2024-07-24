import { BigNumber, Wallet, constants, utils } from 'ethers'
import { defineConfig } from 'cypress'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import synpressPlugins from '@synthetixio/synpress/plugins'
import { TestWETH9__factory } from '@arbitrum/sdk/dist/lib/abi/factories/TestWETH9__factory'
import { TestERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/TestERC20__factory'
import { Erc20Bridger } from '@arbitrum/sdk'
import { getL2ERC20Address } from './src/util/TokenUtils'
import specFiles from './tests/e2e/specfiles.json'
import cctpFiles from './tests/e2e/cctp.json'

import {
  NetworkName,
  getInitialERC20Balance,
  l1WethGateway,
  wethTokenAddressL1,
  wethTokenAddressL2
} from './tests/support/common'

import { registerLocalNetwork } from './src/util/networks'
import { CommonAddress } from './src/util/CommonAddressUtils'
import { MULTICALL_TESTNET_ADDRESS } from './src/constants'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'

let tests: string[]
if (process.env.TEST_FILE) {
  tests = [process.env.TEST_FILE]
} else if (process.env.E2E_CCTP) {
  tests = cctpFiles.map(file => file.file)
} else {
  tests = specFiles.map(file => file.file)
}

const shouldRecordVideo = process.env.CYPRESS_RECORD_VIDEO === 'true'

export default defineConfig({
  userAgent: 'synpress',
  retries: shouldRecordVideo ? 0 : 2,
  screenshotsFolder: 'cypress/screenshots',
  videosFolder: 'cypress/videos',
  video: shouldRecordVideo,
  screenshotOnRunFailure: true,
  chromeWebSecurity: true,
  modifyObstructiveCode: false,
  scrollBehavior: false,
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
      require('cypress-terminal-report/src/installLogsPrinter')(on)
      registerLocalNetwork()

      if (!ethRpcUrl) {
        throw new Error('NEXT_PUBLIC_LOCAL_ETHEREUM_RPC_URL variable missing.')
      }
      if (!arbRpcUrl) {
        throw new Error('NEXT_PUBLIC_LOCAL_ARBITRUM_RPC_URL variable missing.')
      }
      if (!sepoliaRpcUrl) {
        throw new Error(
          'process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL variable missing.'
        )
      }

      const userWalletAddress = await userWallet.getAddress()
      if (!process.env.E2E_CCTP) {
        // Deploy ERC-20 token to L1
        const l1ERC20Token = await deployERC20ToL1()

        // Deploy ERC-20 token to L2
        await deployERC20ToL2(l1ERC20Token.address)

        // Mint ERC-20 token
        // We need this to test token approval
        // WETH is pre-approved so we need a new token
        const mintedL1Erc20Token = await l1ERC20Token.mint()
        await mintedL1Erc20Token.wait()

        // Send minted ERC-20 to the test userWallet
        await l1ERC20Token
          .connect(localWallet.connect(ethProvider))
          .transfer(userWalletAddress, BigNumber.from(50000000))

        // Fund the userWallet. We do this to run tests on a small amount of ETH.
        await Promise.all([
          fundWalletEth(userWallet.address, 'L1', 2),
          fundWalletEth(userWallet.address, 'L2', 2)
        ])

        // Wrap ETH to test ERC-20 transactions
        await Promise.all([wrapEth('L1'), wrapEth('L2')])

        // Approve WETH
        await approveWeth()
        config.env.ERC20_TOKEN_ADDRESS_L1 = l1ERC20Token.address
        config.env.ERC20_TOKEN_ADDRESS_L2 = await getL2ERC20Address({
          erc20L1Address: l1ERC20Token.address,
          l1Provider: ethProvider,
          l2Provider: arbProvider
        })

        config.env.ERC20_TOKEN_ADDRESS_L2 = await getL2ERC20Address({
          erc20L1Address: l1ERC20Token.address,
          l1Provider: ethProvider,
          l2Provider: arbProvider
        })

        config.env.REDEEM_RETRYABLE_TEST_TX =
          await generateTestTxForRedeemRetryable()
      }

      console.log(localWallet.address)
      // Set Cypress variables
      config.env.ETH_RPC_URL = ethRpcUrl
      config.env.ARB_RPC_URL = arbRpcUrl
      config.env.ETH_SEPOLIA_RPC_URL = sepoliaRpcUrl
      config.env.ARB_SEPOLIA_RPC_URL = arbSepoliaRpcUrl
      config.env.ADDRESS = userWalletAddress
      config.env.PRIVATE_KEY = userWallet.privateKey
      config.env.INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY
      config.env.LOCAL_WALLET_PRIVATE_KEY = localWallet.privateKey
      config.env.CUSTOM_DESTINATION_ADDRESS =
        await getCustomDestinationAddress()

      synpressPlugins(on, config)
      setupCypressTasks(on)
      return config
    },
    baseUrl: 'http://localhost:3000',
    specPattern: tests,
    supportFile: 'tests/support/index.ts'
  }
})

const INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY
if (typeof INFURA_KEY === 'undefined') {
  throw new Error('Infura API key not provided')
}

const MAINNET_INFURA_RPC_URL = `https://mainnet.infura.io/v3/${INFURA_KEY}`
const SEPOLIA_INFURA_RPC_URL = `https://sepolia.infura.io/v3/${INFURA_KEY}`

const ethRpcUrl = (() => {
  // MetaMask comes with a default http://localhost:8545 network with 'localhost' as network name
  // On CI, the rpc is http://geth:8545 so we cannot reuse the 'localhost' network
  // However, Synpress does not allow editing network name on the MetaMask extension
  // For consistency purpose, we would be using 'custom-localhost'
  // MetaMask auto-detects same rpc url and blocks adding new custom network with same rpc
  // so we have to add a / to the end of the rpc url
  if (!process.env.NEXT_PUBLIC_LOCAL_ETHEREUM_RPC_URL) {
    return MAINNET_INFURA_RPC_URL
  }
  if (process.env.NEXT_PUBLIC_LOCAL_ETHEREUM_RPC_URL.endsWith('/')) {
    return process.env.NEXT_PUBLIC_LOCAL_ETHEREUM_RPC_URL
  }
  return process.env.NEXT_PUBLIC_LOCAL_ETHEREUM_RPC_URL + '/'
})()

const arbRpcUrl = process.env.NEXT_PUBLIC_LOCAL_ARBITRUM_RPC_URL
const sepoliaRpcUrl =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? SEPOLIA_INFURA_RPC_URL
const arbSepoliaRpcUrl = 'https://sepolia-rollup.arbitrum.io/rpc'

const ethProvider = new StaticJsonRpcProvider(ethRpcUrl)
const arbProvider = new StaticJsonRpcProvider(arbRpcUrl)

if (!process.env.PRIVATE_KEY_CUSTOM) {
  throw new Error('PRIVATE_KEY_CUSTOM variable missing.')
}
if (!process.env.PRIVATE_KEY_USER) {
  throw new Error('PRIVATE_KEY_USER variable missing.')
}

const localWallet = new Wallet(process.env.PRIVATE_KEY_CUSTOM)
const userWallet = new Wallet(process.env.PRIVATE_KEY_USER)

async function deployERC20ToL1() {
  console.log('Deploying ERC20 to L1...')
  const contract = new TestERC20__factory().connect(
    localWallet.connect(ethProvider)
  )
  const token = await contract.deploy()
  await token.deployed()

  return token
}

async function deployERC20ToL2(erc20L1Address: string) {
  console.log('Deploying ERC20 to L2...')
  const bridger = await Erc20Bridger.fromProvider(arbProvider)
  const deploy = await bridger.deposit({
    amount: BigNumber.from(0),
    erc20ParentAddress: erc20L1Address,
    parentSigner: localWallet.connect(ethProvider),
    childProvider: arbProvider
  })
  await deploy.wait()
}

export async function fundUserUsdcTestnet(
  address: string,
  networkType: 'L1' | 'L2'
) {
  console.log(`Funding USDC to user wallet (testnet): ${networkType}...`)
  const usdcContractAddress =
    networkType === 'L1'
      ? CommonAddress.Sepolia.USDC
      : CommonAddress.ArbitrumSepolia.USDC

  const usdcBalance = await getInitialERC20Balance({
    address: address,
    rpcURL: networkType === 'L1' ? sepoliaRpcUrl : arbSepoliaRpcUrl,
    tokenAddress: usdcContractAddress,
    multiCallerAddress: MULTICALL_TESTNET_ADDRESS
  })

  // Fund only if the balance is less than 0.0001 USDC
  const amount = utils.parseUnits('0.0001', 6)
  if (usdcBalance && usdcBalance.lt(amount)) {
    console.log(`Adding USDC to user wallet (testnet): ${networkType}...`)
    const goerliProvider = new StaticJsonRpcProvider(sepoliaRpcUrl)
    const arbGoerliProvider = new StaticJsonRpcProvider(arbSepoliaRpcUrl)
    const provider = networkType === 'L1' ? goerliProvider : arbGoerliProvider
    const contract = new ERC20__factory().connect(localWallet.connect(provider))
    const token = contract.attach(usdcContractAddress)
    await token.deployed()
    const tx = await token.transfer(address, amount)
    await tx.wait()
  }
}

async function fundWalletEth(
  address: string,
  networkType: 'L1' | 'L2',
  amount: number
) {
  console.log(`Funding ETH to user wallet: ${networkType}...`)
  const provider = networkType === 'L1' ? ethProvider : arbProvider
  const balance = await provider.getBalance(address)
  // Fund only if the balance is less than {amount} eth
  if (balance.lt(utils.parseEther(amount.toString()))) {
    const tx = await localWallet.connect(provider).sendTransaction({
      to: address,
      value: utils.parseEther(amount.toString())
    })
    await tx.wait()
  }
}

function getWethContract(
  provider: StaticJsonRpcProvider,
  tokenAddress: string
) {
  return TestWETH9__factory.connect(tokenAddress, userWallet.connect(provider))
}

async function wrapEth(networkType: 'L1' | 'L2') {
  console.log(`Wrapping ETH: ${networkType}...`)
  const amount = networkType === 'L1' ? '0.2' : '0.1'
  const address = networkType === 'L1' ? wethTokenAddressL1 : wethTokenAddressL2
  const provider = networkType === 'L1' ? ethProvider : arbProvider
  const tx = await getWethContract(provider, address).deposit({
    value: utils.parseEther(amount)
  })
  await tx.wait()
}

async function approveWeth() {
  console.log('Approving WETH...')
  const tx = await getWethContract(ethProvider, wethTokenAddressL1).approve(
    // L1 WETH gateway
    l1WethGateway,
    constants.MaxInt256
  )
  await tx.wait()
}

async function getCustomDestinationAddress() {
  console.log('Getting custom destination address...')
  return (await Wallet.createRandom().getAddress()).toLowerCase()
}

async function generateTestTxForRedeemRetryable() {
  console.log('Adding a test transaction for redeeming retryable...')

  const walletAddress = await userWallet.getAddress()
  const l1Provider = ethProvider
  const l2Provider = arbProvider
  const erc20Token = {
    symbol: 'WETH',
    decimals: 18,
    address: wethTokenAddressL1
  }
  const amount = utils.parseUnits('0.001', erc20Token.decimals)
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
  const depositRequest = await erc20Bridger.getDepositRequest({
    parentProvider: l1Provider,
    childProvider: l2Provider,
    from: walletAddress,
    erc20ParentAddress: erc20Token.address,
    amount,
    retryableGasOverrides: {
      gasLimit: { base: BigNumber.from(0) }
    }
  })
  const tx = await erc20Bridger.deposit({
    ...depositRequest,
    parentSigner: userWallet.connect(ethProvider),
    childProvider: arbProvider,
    retryableGasOverrides: {
      gasLimit: {
        base: BigNumber.from(0)
      }
    }
  })
  const receipt = await tx.wait()
  return receipt.transactionHash
}

function setupCypressTasks(on: Cypress.PluginEvents) {
  let currentNetworkName: NetworkName | null = null
  let networkSetupComplete = false
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
    setWalletConnectedToDapp: (toggle: boolean) => {
      walletConnectedToDapp = toggle
      return null
    },
    getWalletConnectedToDapp: () => {
      return walletConnectedToDapp
    }
  })
}
