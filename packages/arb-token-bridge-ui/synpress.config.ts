import { BigNumber, Signer, Wallet, constants, ethers, utils } from 'ethers'
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
  l1WethGateway,
  wethTokenAddressL1,
  wethTokenAddressL2
} from './tests/support/common'

import { defaultL2Network, registerLocalNetwork } from './src/util/networks'

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
      await Promise.all([fundUserWalletEth('L1'), fundUserWalletEth('L2')])

      // Wrap ETH to test ERC-20 transactions
      await Promise.all([wrapEth('L1'), wrapEth('L2')])

      // Approve WETH
      await approveWeth()

      // Generate activity on chains so that assertions get posted and claims can be made
      generateActivityOnChains()

      checkForAssertions()

      // Set Cypress variables
      config.env.ETH_RPC_URL = ethRpcUrl
      config.env.ARB_RPC_URL = arbRpcUrl
      config.env.ETH_SEPOLIA_RPC_URL = sepoliaRpcUrl
      config.env.ARB_SEPOLIA_RPC_URL = arbSepoliaRpcUrl
      config.env.ADDRESS = userWalletAddress
      config.env.PRIVATE_KEY = userWallet.privateKey
      config.env.INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY
      config.env.ERC20_TOKEN_ADDRESS_L1 = l1ERC20Token.address
      config.env.LOCAL_WALLET_PRIVATE_KEY = localWallet.privateKey

      config.env.CUSTOM_DESTINATION_ADDRESS =
        await getCustomDestinationAddress()

      config.env.ERC20_TOKEN_ADDRESS_L2 = await getL2ERC20Address({
        erc20L1Address: l1ERC20Token.address,
        l1Provider: ethProvider,
        l2Provider: arbProvider
      })

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

async function fundUserWalletEth(networkType: 'L1' | 'L2') {
  console.log(`Funding ETH to user wallet: ${networkType}...`)
  const address = await userWallet.getAddress()
  const provider = networkType === 'L1' ? ethProvider : arbProvider
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

async function checkForAssertions() {
  const abi = [
    'function latestConfirmed() public view returns (uint64)',
    'function latestNodeCreated() public view returns (uint64)'
  ]

  const rollupContract = new ethers.Contract(
    defaultL2Network.ethBridge.rollup,
    abi,
    ethProvider
  )

  while (true) {
    console.log(
      '>>>>> Assertion status (created vs confirmed)',
      (await rollupContract.latestNodeCreated()).toString(),
      (await rollupContract.latestConfirmed()).toString()
    )
    await wait(10000)
  }
}

const wait = (ms = 0): Promise<void> => {
  return new Promise(res => setTimeout(res, ms))
}

async function generateActivityOnChains() {
  async function fundWalletEth(walletAddress, networkType: 'L1' | 'L2') {
    const provider = networkType === 'L1' ? ethProvider : arbProvider
    const tx = await localWallet.connect(provider).sendTransaction({
      to: walletAddress,
      value: utils.parseEther('1')
    })
    await tx.wait()
  }

  const keepMining = async (miner: Signer) => {
    while (true) {
      await (
        await miner.sendTransaction({
          to: await miner.getAddress(),
          value: 0,
          data: '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000010c3c627574746f6e20636c6173733d226e61766261722d746f67676c65722220747970653d22627574746f6e2220646174612d746f67676c653d22636f6c6c617073652220646174612d7461726765743d22236e6176626172537570706f72746564436f6e74656e742220617269612d636f6e74726f6c733d226e6176626172537570706f72746564436f6e74656e742220617269612d657870616e6465643d2266616c73652220617269612d6c6162656c3d223c253d20676574746578742822546f67676c65206e617669676174696f6e222920253e223e203c7370616e20636c6173733d226e61766261722d746f67676c65722d69636f6e223e3c2f7370616e3e203c2f627574746f6e3e0000000000000000000000000000000000000000'
        })
      ).wait()

      await wait(100)
    }
  }
  // whilst waiting for status we mine on both l1 and l2
  console.log('Generating activity on L1...')
  const minerL1 = Wallet.createRandom().connect(ethProvider)
  await fundWalletEth(await minerL1.getAddress(), 'L1')

  console.log('Generating activity on L2...')
  const minerL2 = Wallet.createRandom().connect(arbProvider)
  await fundWalletEth(await minerL2.getAddress(), 'L2')

  await Promise.allSettled([keepMining(minerL1), keepMining(minerL2)])
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
    setWalletConnectedToDapp: () => {
      walletConnectedToDapp = true
      return null
    },
    getWalletConnectedToDapp: () => {
      return walletConnectedToDapp
    }
  })
}
