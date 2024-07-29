import { BigNumber, Wallet, constants, utils } from 'ethers'
import { defineConfig } from 'cypress'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import synpressPlugins from '@synthetixio/synpress/plugins'
import { TestWETH9__factory } from '@arbitrum/sdk/dist/lib/abi/factories/TestWETH9__factory'
import { TestERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/TestERC20__factory'
import { Erc20Bridger, EthBridger, MultiCaller } from '@arbitrum/sdk'
import { getL2ERC20Address } from './src/util/TokenUtils'
import specFiles from './tests/e2e/specfiles.json'
import cctpFiles from './tests/e2e/cctp.json'

import { NetworkName, NetworkType } from './tests/support/common'

import {
  defaultL2Network,
  defaultL3Network,
  registerLocalNetwork
} from './src/util/networks'
import { parseEther } from 'ethers/lib/utils.js'

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
  ? defaultL3Network.tokenBridge.parentWethGateway
  : defaultL2Network.tokenBridge.parentWethGateway

let l1WethAddress = isOrbitTest
  ? defaultL3Network.tokenBridge.parentWeth
  : defaultL2Network.tokenBridge.parentWeth

let l2WethAddress = isOrbitTest
  ? defaultL3Network.tokenBridge.childWeth
  : defaultL2Network.tokenBridge.childWeth

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

      // Deploy ERC-20 token to L1
      const l1ERC20Token = await deployERC20ToL1()

      // Approve custom fee token if not ETH
      await approveCustomFeeToken(
        localWallet.connect(parentProvider),
        l1ERC20Token.address
      )

      await fundUserWalletNativeCurrency()

      // Deploy ERC-20 token to L2
      await deployERC20ToL2(l1ERC20Token.address)

      // Mint ERC-20 token
      // We need this to test token approval
      // WETH is pre-approved so we need a new token
      const mintedL1Erc20Token = await l1ERC20Token.mint()
      await mintedL1Erc20Token.wait()

      // Send minted ERC-20 to the test userWallet
      await l1ERC20Token
        .connect(localWallet.connect(parentProvider))
        .transfer(userWalletAddress, BigNumber.from(50000000))

      // Fund the userWallet. We do this to run tests on a small amount of ETH.
      await Promise.all([
        fundUserWalletEth('parentChain'),
        fundUserWalletEth('childChain')
      ])

      if (
        !isNonZeroAddress(l1WethAddress) ||
        !isNonZeroAddress(l2WethAddress)
      ) {
        const wethAddresses = await deployWeth(parentProvider)
        l1WethAddress = wethAddresses.l1WethAddress
        l2WethAddress = wethAddresses.l2WethAddress
      }

      const bridger = await Erc20Bridger.fromProvider(childProvider)
      const isCustomFeeToken = typeof bridger.nativeToken !== 'undefined'

      const ethBridger = await EthBridger.fromProvider(childProvider)

      await approveCustomFeeToken(
        userWallet.connect(parentProvider),
        bridger.nativeToken!
      )

      await ethBridger.approveGasToken({
        parentSigner: userWallet.connect(parentProvider)
      })

      // Wrap ETH to test ERC-20 transactions
      await Promise.all([wrapEth('parentChain'), wrapEth('childChain')])

      // Approve WETH
      await approveWeth()

      // Set Cypress variables
      config.env.ETH_RPC_URL = isOrbitTest ? arbRpcUrl : ethRpcUrl
      config.env.ARB_RPC_URL = isOrbitTest ? l3RpcUrl : arbRpcUrl
      config.env.ETH_SEPOLIA_RPC_URL = sepoliaRpcUrl
      config.env.ARB_SEPOLIA_RPC_URL = arbSepoliaRpcUrl
      config.env.ADDRESS = userWalletAddress
      config.env.PRIVATE_KEY = userWallet.privateKey
      config.env.INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY
      config.env.ERC20_TOKEN_ADDRESS_L1 = l1ERC20Token.address
      config.env.LOCAL_WALLET_PRIVATE_KEY = localWallet.privateKey
      config.env.ORBIT_TEST = isOrbitTest ? '1' : '0'
      config.env.NATIVE_TOKEN_SYMBOL = isCustomFeeToken ? 'TN' : 'ETH'

      config.env.CUSTOM_DESTINATION_ADDRESS =
        await getCustomDestinationAddress()

      config.env.ERC20_TOKEN_ADDRESS_L2 = await getL2ERC20Address({
        erc20L1Address: l1ERC20Token.address,
        l1Provider: parentProvider,
        l2Provider: childProvider
      })
      config.env.L1_WETH_ADDRESS = l1WethAddress
      config.env.L2_WETH_ADDRESS = l2WethAddress

      config.env.REDEEM_RETRYABLE_TEST_TX =
        await generateTestTxForRedeemRetryable()

      // const multiCaller = new MultiCaller(parentProvider, '0x6B1E93aE298B64e8f5b9f43B65Dd8F1eaA6DD4c3')
      // const [tokenData] = await multiCaller.getTokenData([bridger.nativeToken!], {
      //   balanceOf: { account: userWallet.address }
      // })
      // console.log({ tokenData })
      // throw 'end'

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

const localWallet = new Wallet(
  utils.sha256(utils.toUtf8Bytes('user_fee_token_deployer'))
)
const userWallet = new Wallet(process.env.PRIVATE_KEY_USER)

async function deployERC20ToL1() {
  console.log('Deploying ERC20 to L1...')
  const contract = new TestERC20__factory().connect(
    localWallet.connect(parentProvider)
  )
  const token = await contract.deploy()
  await token.deployed()

  return token
}

async function approveCustomFeeToken(
  signer: Wallet,
  erc20ParentAddress: string,
  amount?: BigNumber
) {
  const childEthBridger = await EthBridger.fromProvider(childProvider)
  const childErc20Bridger = await Erc20Bridger.fromProvider(childProvider)
  const isCustomFeeToken = typeof childEthBridger.nativeToken !== 'undefined'

  if (!isCustomFeeToken) {
    return
  }

  console.log('Approving custom fee token...')

  await childErc20Bridger.approveGasToken({
    parentSigner: signer,
    erc20ParentAddress
  })
}

function percentIncrease(num: BigNumber, increase: BigNumber): BigNumber {
  return num.add(num.mul(increase).div(100))
}

async function estimateDepositGas({
  parentErc20Address,
  from,
  amount
}: {
  parentErc20Address: string
  from: string
  amount: BigNumber
}) {
  const erc20Bridger = await Erc20Bridger.fromProvider(childProvider)

  const { retryableData } = await erc20Bridger.getDepositRequest({
    amount,
    erc20ParentAddress: parentErc20Address,
    parentProvider: parentProvider,
    childProvider: childProvider,
    from,
    retryableGasOverrides: {
      gasLimit: { percentIncrease: BigNumber.from(30) }
    }
  })

  const destinationChainGasPrice = await childProvider.getGasPrice()

  return BigNumber.from(
    utils.formatEther(
      retryableData.gasLimit
        .mul(percentIncrease(destinationChainGasPrice, BigNumber.from(500)))
        .add(retryableData.maxSubmissionCost)
    )
  )
}

function isNonZeroAddress(address: string) {
  return address !== constants.AddressZero && utils.isAddress(address)
}

async function deployERC20ToL2(erc20L1Address: string) {
  console.log('Deploying ERC20 to L2...')
  const bridger = await Erc20Bridger.fromProvider(childProvider)
  const deploy = await bridger.deposit({
    amount: BigNumber.from(0),
    erc20ParentAddress: erc20L1Address,
    parentSigner: localWallet.connect(parentProvider),
    childProvider
  })
  await deploy.wait()
}

async function fundUserWalletEth(networkType: NetworkType) {
  console.log(`Funding ETH to user wallet: ${networkType}...`)
  const address = await userWallet.getAddress()
  const provider =
    networkType === 'parentChain' ? parentProvider : childProvider
  const balance = await provider.getBalance(address)
  // Fund only if the balance is less than 2 eth
  if (balance.lt(utils.parseEther('2'))) {
    const tx = await localWallet.connect(provider).sendTransaction({
      to: address,
      value: utils.parseEther('2')
    })
    await tx.wait()
  }
}

async function fundUserWalletNativeCurrency() {
  const childEthBridger = await EthBridger.fromProvider(childProvider)
  const isCustomFeeToken = typeof childEthBridger.nativeToken !== 'undefined'

  if (!isCustomFeeToken) {
    return
  }

  const address = await userWallet.getAddress()

  const tokenContract = TestERC20__factory.connect(
    childEthBridger.nativeToken,
    localWallet.connect(parentProvider)
  )

  const userBalance = await tokenContract.balanceOf(address)
  const shouldFund = userBalance.lt(parseEther('0.3'))

  if (!shouldFund) {
    console.log(
      `User wallet has enough L3 native currency for testing, skip funding...`
    )
    return
  }

  console.log(`Funding native currency to user wallet on L2...`)

  const tx = await tokenContract.transfer(address, parseEther('3'))
  await tx.wait()
}

function getWethContract(
  provider: StaticJsonRpcProvider,
  tokenAddress: string
) {
  return TestWETH9__factory.connect(tokenAddress, userWallet.connect(provider))
}

async function deployWeth(provider: StaticJsonRpcProvider) {
  const wethFactory = new TestWETH9__factory(localWallet.connect(provider))
  const weth = await wethFactory.deploy('Wrapped Ether', 'WETH')
  await weth.deployed()

  const bridger = await Erc20Bridger.fromProvider(childProvider)
  const deployOnChildChain = await bridger.deposit({
    amount: BigNumber.from(0),
    erc20ParentAddress: weth.address,
    parentSigner: localWallet.connect(parentProvider),
    childProvider
  })

  await deployOnChildChain.wait()

  const l2WethAddress = await getL2ERC20Address({
    erc20L1Address: weth.address,
    l1Provider: parentProvider,
    l2Provider: childProvider
  })

  return {
    l1WethAddress: weth.address,
    l2WethAddress
  }
}

async function wrapEth(networkType: NetworkType) {
  const childEthBridger = await EthBridger.fromProvider(childProvider)
  const isCustomFeeToken = typeof childEthBridger.nativeToken !== 'undefined'

  if (isCustomFeeToken && networkType === 'childChain') {
    return
  }

  console.log(`Wrapping ETH: ${networkType}...`)
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
  console.log({ l1WethAddress })
  const tx = await getWethContract(parentProvider, l1WethAddress).approve(
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
  const erc20Token = {
    symbol: 'WETH',
    decimals: 18,
    address: l1WethAddress
  }
  const amount = utils.parseUnits('0.001', erc20Token.decimals)

  console.log({ l1WethGateway, l1WethAddress })

  // const gas = await estimateDepositGas({
  //   parentErc20Address: l1WethAddress,
  //   amount,
  //   from: walletAddress
  // })
  await approveCustomFeeToken(
    userWallet.connect(parentProvider),
    erc20Token.address
  )

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
