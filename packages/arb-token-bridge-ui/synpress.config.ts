import {
  BigNumber,
  Contract,
  ContractFactory,
  Wallet,
  constants,
  utils
} from 'ethers'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import { defineConfig } from 'cypress'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import synpressPlugins from '@synthetixio/synpress/plugins'
import { TestWETH9__factory } from '@arbitrum/sdk/dist/lib/abi/factories/TestWETH9__factory'
import { Erc20Bridger } from '@arbitrum/sdk'
import { getL2ERC20Address } from './src/util/TokenUtils'
import specFiles from './tests/e2e/specfiles.json'
import cctpFiles from './tests/e2e/cctp.json'
import { contractAbi, contractByteCode } from './testErc20Token'
import {
  NetworkName,
  checkForAssertions,
  generateActivityOnChains,
  NetworkType,
  fundEth,
  ERC20TokenSymbol,
  ERC20TokenDecimals,
  ERC20TokenName
} from './tests/support/common'

import {
  defaultL2Network,
  defaultL3Network,
  registerLocalNetwork
} from './src/util/networks'

let tests: string[]
if (process.env.TEST_FILE) {
  tests = [process.env.TEST_FILE]
} else if (process.env.E2E_CCTP) {
  tests = cctpFiles.map(file => file.file)
} else {
  tests = specFiles.map(file => file.file)
}

const isOrbitTest = process.env.E2E_ORBIT == 'true'
const shouldRecordVideo = process.env.CYPRESS_RECORD_VIDEO === 'true'

const l1WethGateway = isOrbitTest
  ? defaultL3Network.tokenBridge!.parentWethGateway
  : defaultL2Network.tokenBridge!.parentWethGateway

const l1WethAddress = isOrbitTest
  ? defaultL3Network.tokenBridge!.parentWeth
  : defaultL2Network.tokenBridge!.parentWeth

const l2WethAddress = isOrbitTest
  ? defaultL3Network.tokenBridge!.childWeth
  : defaultL2Network.tokenBridge!.childWeth

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

      if (!ethRpcUrl && !isOrbitTest) {
        throw new Error('NEXT_PUBLIC_LOCAL_ETHEREUM_RPC_URL variable missing.')
      }
      if (!arbRpcUrl) {
        throw new Error('NEXT_PUBLIC_LOCAL_ARBITRUM_RPC_URL variable missing.')
      }
      if (!l3RpcUrl && isOrbitTest) {
        throw new Error('NEXT_PUBLIC_LOCAL_L3_RPC_URL variable missing.')
      }
      if (!sepoliaRpcUrl) {
        throw new Error(
          'process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL variable missing.'
        )
      }

      const userWalletAddress = await userWallet.getAddress()

      // Fund the userWallet. We do this to run tests on a small amount of ETH.
      await Promise.all([
        fundEth({
          networkType: 'parentChain',
          address: userWalletAddress,
          parentProvider,
          childProvider,
          sourceWallet: localWallet
        }),
        fundEth({
          networkType: 'childChain',
          address: userWalletAddress,
          parentProvider,
          childProvider,
          sourceWallet: localWallet
        })
      ])

      // Deploy and fund ERC20 to Parent and Child chains
      const l1ERC20Token = await deployERC20ToParentChain()
      await fundErc20ToParentChain(l1ERC20Token)
      await fundErc20ToChildChain(l1ERC20Token)
      await approveErc20(l1ERC20Token)

      // Wrap ETH to test WETH transactions and approve it's usage
      await fundWeth('parentChain')
      await fundWeth('childChain')
      await approveWeth()

      // Generate activity on chains so that assertions get posted and claims can be made
      generateActivityOnChains({
        parentProvider,
        childProvider,
        wallet: localWallet
      })
      // Also keep watching assertions since they will act as a proof of activity and claims for withdrawals
      checkForAssertions({ parentProvider, isOrbitTest })

      // Set Cypress variables
      config.env.ETH_RPC_URL = isOrbitTest ? arbRpcUrl : ethRpcUrl
      config.env.ARB_RPC_URL = isOrbitTest ? l3RpcUrl : arbRpcUrl
      config.env.ETH_SEPOLIA_RPC_URL = sepoliaRpcUrl
      config.env.ARB_SEPOLIA_RPC_URL = arbSepoliaRpcUrl
      config.env.ADDRESS = userWalletAddress
      config.env.PRIVATE_KEY = userWallet.privateKey
      config.env.INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY
      config.env.ERC20_TOKEN_ADDRESS_PARENT_CHAIN = l1ERC20Token.address
      config.env.LOCAL_WALLET_PRIVATE_KEY = localWallet.privateKey
      config.env.ORBIT_TEST = isOrbitTest ? '1' : '0'

      config.env.CUSTOM_DESTINATION_ADDRESS =
        await getCustomDestinationAddress()

      config.env.ERC20_TOKEN_ADDRESS_CHILD_CHAIN = await getL2ERC20Address({
        erc20L1Address: l1ERC20Token.address,
        l1Provider: parentProvider,
        l2Provider: childProvider
      })
      config.env.L1_WETH_ADDRESS = l1WethAddress
      config.env.L2_WETH_ADDRESS = l2WethAddress

      config.env.REDEEM_RETRYABLE_TEST_TX =
        await generateTestTxForRedeemRetryable()

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
const l3RpcUrl = process.env.NEXT_PUBLIC_LOCAL_L3_RPC_URL
const sepoliaRpcUrl =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? SEPOLIA_INFURA_RPC_URL
const arbSepoliaRpcUrl = 'https://sepolia-rollup.arbitrum.io/rpc'

const parentProvider = new StaticJsonRpcProvider(
  isOrbitTest ? arbRpcUrl : ethRpcUrl
)
const childProvider = new StaticJsonRpcProvider(
  isOrbitTest ? l3RpcUrl : arbRpcUrl
)

if (!process.env.PRIVATE_KEY_CUSTOM) {
  throw new Error('PRIVATE_KEY_CUSTOM variable missing.')
}
if (!process.env.PRIVATE_KEY_USER) {
  throw new Error('PRIVATE_KEY_USER variable missing.')
}

const localWallet = new Wallet(process.env.PRIVATE_KEY_CUSTOM)
const userWallet = new Wallet(process.env.PRIVATE_KEY_USER)

async function deployERC20ToParentChain() {
  console.log('Deploying ERC20...')
  const signer = localWallet.connect(parentProvider)
  const factory = new ContractFactory(contractAbi, contractByteCode, signer)
  const l1TokenContract = await factory.deploy(
    ERC20TokenName,
    ERC20TokenSymbol,
    parseUnits('100', ERC20TokenDecimals).toString()
  )
  console.log('Deployed ERC20:', {
    symbol: await l1TokenContract.symbol(),
    address: l1TokenContract.address,
    supply: formatUnits(
      await l1TokenContract.balanceOf(localWallet.address),
      ERC20TokenDecimals
    )
  })
  return l1TokenContract
}

async function deployERC20ToChildChain(erc20L1Address: string) {
  const bridger = await Erc20Bridger.fromProvider(childProvider)
  const deploy = await bridger.deposit({
    amount: BigNumber.from(0),
    erc20ParentAddress: erc20L1Address,
    parentSigner: localWallet.connect(parentProvider),
    childProvider
  })
  await deploy.wait()
}

function getWethContract(
  provider: StaticJsonRpcProvider,
  tokenAddress: string
) {
  return TestWETH9__factory.connect(tokenAddress, userWallet.connect(provider))
}

async function fundWeth(networkType: NetworkType) {
  console.log(`Funding WETH: ${networkType}...`)
  const amount = networkType === 'parentChain' ? '0.2' : '0.1'
  const address = networkType === 'parentChain' ? l1WethAddress : l2WethAddress
  const provider =
    networkType === 'parentChain' ? parentProvider : childProvider
  const tx = await getWethContract(provider, address).deposit({
    value: utils.parseEther(amount)
  })
  await tx.wait()
}

async function approveWeth() {
  console.log('Approving WETH...')
  const tx = await getWethContract(parentProvider, l1WethAddress).approve(
    l1WethGateway,
    constants.MaxInt256
  )
  await tx.wait()
}

async function approveErc20(l1ERC20Token: Contract) {
  console.log('Approving ERC20...')
  const erc20Bridger = await Erc20Bridger.fromProvider(childProvider)
  const approvalTx = await erc20Bridger.approveToken({
    erc20ParentAddress: l1ERC20Token.address,
    parentSigner: userWallet.connect(parentProvider),
    amount: parseUnits('1', ERC20TokenDecimals) // only approve 1 token for deposits, later we will need MAX amount approval during approve tests
  })
  await approvalTx.wait()
}

async function fundErc20ToParentChain(l1ERC20Token: Contract) {
  console.log('Funding ERC20 on Parent Chain...')
  // Send deployed ERC-20 to the test userWallet
  const transferTx = await l1ERC20Token
    .connect(localWallet.connect(parentProvider))
    .transfer(userWallet.address, parseUnits('5', ERC20TokenDecimals))
  await transferTx.wait()
}

async function fundErc20ToChildChain(l1ERC20Token: Contract) {
  console.log('Funding ERC20 on Child Chain...')
  // first deploy the ERC20 to L2 (if not, it might throw a gas error later)
  await deployERC20ToChildChain(l1ERC20Token.address)
  const erc20Bridger = await Erc20Bridger.fromProvider(childProvider)
  const parentSigner = localWallet.connect(parentProvider)

  // approve the ERC20 token for spending
  const approvalTx = await erc20Bridger.approveToken({
    erc20ParentAddress: l1ERC20Token.address,
    parentSigner,
    amount: constants.MaxUint256
  })
  await approvalTx.wait()

  // deposit the ERC20 token to L2 (fund the L2 account)
  const depositTx = await erc20Bridger.deposit({
    parentSigner,
    childProvider,
    erc20ParentAddress: l1ERC20Token.address,
    amount: parseUnits('5', ERC20TokenDecimals),
    destinationAddress: userWallet.address
  })
  const depositRec = await depositTx.wait()

  // wait for funds to reach L2
  await depositRec.waitForChildTransactionReceipt(childProvider)
}

async function getCustomDestinationAddress() {
  console.log('Getting custom destination address...')
  return (await Wallet.createRandom().getAddress()).toLowerCase()
}

async function generateTestTxForRedeemRetryable() {
  console.log('Adding a test transaction for redeeming retryable...')

  const walletAddress = userWallet.address
  const erc20Token = {
    symbol: 'WETH',
    decimals: 18,
    address: l1WethAddress
  }
  const amount = utils.parseUnits('0.001', erc20Token.decimals)
  const erc20Bridger = await Erc20Bridger.fromProvider(childProvider)
  const depositRequest = await erc20Bridger.getDepositRequest({
    parentProvider,
    childProvider,
    from: walletAddress,
    erc20ParentAddress: erc20Token.address,
    amount,
    retryableGasOverrides: {
      gasLimit: { base: BigNumber.from(0) }
    }
  })
  const tx = await erc20Bridger.deposit({
    ...depositRequest,
    parentSigner: userWallet.connect(parentProvider),
    childProvider,
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
    setWalletConnectedToDapp: () => {
      walletConnectedToDapp = true
      return null
    },
    getWalletConnectedToDapp: () => {
      return walletConnectedToDapp
    }
  })
}
