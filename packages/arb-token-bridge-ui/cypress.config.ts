import {
  BigNumber,
  Contract,
  ContractFactory,
  Wallet,
  constants,
  utils
} from 'ethers'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { defineConfig } from 'cypress'
import logsPrinter from 'cypress-terminal-report/src/installLogsPrinter'
import { Erc20Bridger, EthBridger } from '@arbitrum/sdk'

import specFiles from './tests/e2e/specfiles.json'
import { getCommonSynpressConfig } from './tests/e2e/getCommonSynpressConfig'
import { registerLocalNetwork } from './src/util/networks'
import { contractAbi, contractByteCode } from './testErc20Token'
import {
  checkForAssertions,
  generateActivityOnChains,
  fundEth,
  setupCypressTasks,
  getCustomDestinationAddress,
  ERC20TokenSymbol,
  ERC20TokenDecimals,
  ERC20TokenName,
  getNativeTokenDecimals
} from './tests/support/common'

const tests = process.env.TEST_FILE
  ? [process.env.TEST_FILE]
  : specFiles.map(file => file.file)

const isOrbitTest = [
  process.env.E2E_ORBIT,
  process.env.E2E_ORBIT_CUSTOM_GAS_TOKEN
].includes('true')

const shouldRecordVideo = process.env.CYPRESS_RECORD_VIDEO === 'true'

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
  if (!process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1) {
    return MAINNET_INFURA_RPC_URL
  }
  if (process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1.endsWith('/')) {
    return process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1
  }
  return process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1 + '/'
})()

const arbRpcUrl = process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L2
const l3RpcUrl = process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L3
const sepoliaRpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA ?? SEPOLIA_INFURA_RPC_URL
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
  process.env.E2E_ORBIT_CUSTOM_GAS_TOKEN === 'true'
    ? utils.sha256(utils.toUtf8Bytes('user_fee_token_deployer'))
    : process.env.PRIVATE_KEY_CUSTOM
)
const userWallet = new Wallet(process.env.PRIVATE_KEY_USER)

function isNonZeroAddress(address: string | undefined) {
  return (
    typeof address === 'string' &&
    address !== constants.AddressZero &&
    utils.isAddress(address)
  )
}

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

export default defineConfig({
  ...getCommonSynpressConfig(shouldRecordVideo),
  e2e: {
    async setupNodeEvents(on, config) {
      // implement node event listeners here
      logsPrinter(on)

      await registerLocalNetwork()

      const erc20Bridger = await Erc20Bridger.fromProvider(childProvider)
      const ethBridger = await EthBridger.fromProvider(childProvider)
      const isCustomFeeToken = isNonZeroAddress(ethBridger.nativeToken)

      if (!ethRpcUrl && !isOrbitTest) {
        throw new Error(
          'NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1 variable missing.'
        )
      }
      if (!arbRpcUrl) {
        throw new Error(
          'NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L2 variable missing.'
        )
      }
      if (!l3RpcUrl && isOrbitTest) {
        throw new Error(
          'NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L3 variable missing.'
        )
      }
      if (!sepoliaRpcUrl) {
        throw new Error(
          'process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA variable missing.'
        )
      }

      const userWalletAddress = await userWallet.getAddress()

      // Fund the userWallet. We do this to run tests on a small amount of ETH.
      await Promise.all([
        fundEth({
          address: userWalletAddress,
          provider: parentProvider,
          sourceWallet: localWallet,
          amount: utils.parseEther('2'),
          networkType: 'parentChain'
        }),
        fundEth({
          address: userWalletAddress,
          provider: childProvider,
          sourceWallet: localWallet,
          amount: utils.parseEther('2'),
          networkType: 'childChain'
        })
      ])

      // Deploy and fund ERC20 to Parent and Child chains
      const l1ERC20Token = await deployERC20ToParentChain()

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
      config.env.NATIVE_TOKEN_SYMBOL = isCustomFeeToken ? 'TN' : 'ETH'
      config.env.NATIVE_TOKEN_ADDRESS = ethBridger.nativeToken
      config.env.NATIVE_TOKEN_DECIMALS = await await registerLocalNetwork()
    },
    baseUrl: 'http://localhost:3000',
    specPattern: tests,
    supportFile: 'tests/support/e2e.ts',
    defaultCommandTimeout: 20_000
  }
})
