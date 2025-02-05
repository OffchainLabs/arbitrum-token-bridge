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
import { TestERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/TestERC20__factory'
import { TestWETH9__factory } from '@arbitrum/sdk/dist/lib/abi/factories/TestWETH9__factory'
import { Erc20Bridger, EthBridger } from '@arbitrum/sdk'
import logsPrinter from 'cypress-terminal-report/src/installLogsPrinter'
import { getL2ERC20Address } from './src/util/TokenUtils'
import specFiles from './tests/e2e/specfiles.json'
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

import { registerLocalNetwork } from './src/util/networks'
import {
  defaultL2Network,
  defaultL3Network,
  defaultL3CustomGasTokenNetwork
} from './src/util/networksNitroTestnode'
import { getCommonSynpressConfig } from './tests/e2e/getCommonSynpressConfig'
import { browserConfig } from './tests/e2e/browser.config'

const tests = process.env.TEST_FILE
  ? [process.env.TEST_FILE]
  : specFiles.map(file => file.file)

const isOrbitTest = [
  process.env.E2E_ORBIT,
  process.env.E2E_ORBIT_CUSTOM_GAS_TOKEN
].includes('true')
const shouldRecordVideo = process.env.CYPRESS_RECORD_VIDEO === 'true'

const l3Network =
  process.env.ORBIT_CUSTOM_GAS_TOKEN === 'true'
    ? defaultL3CustomGasTokenNetwork
    : defaultL3Network

const l1WethGateway = isOrbitTest
  ? l3Network.tokenBridge!.parentWethGateway
  : defaultL2Network.tokenBridge!.parentWethGateway

let l1WethAddress = isOrbitTest
  ? l3Network.tokenBridge!.parentWeth
  : defaultL2Network.tokenBridge!.parentWeth

let l2WethAddress = isOrbitTest
  ? l3Network.tokenBridge!.childWeth
  : defaultL2Network.tokenBridge!.childWeth

export default defineConfig({
  ...getCommonSynpressConfig(shouldRecordVideo),
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: tests,
    supportFile: 'tests/support/index.ts',
    defaultCommandTimeout: 20_000,
    browsers: [browserConfig]
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

async function approveCustomFeeToken({
  signer,
  erc20ParentAddress,
  amount
}: {
  signer: Wallet
  erc20ParentAddress: string
  amount?: BigNumber
}) {
  console.log('Approving custom fee token...')
  const childErc20Bridger = await Erc20Bridger.fromProvider(childProvider)

  await childErc20Bridger.approveGasToken({
    parentSigner: signer,
    erc20ParentAddress,
    amount
  })
}

async function fundUserWalletNativeCurrency() {
  const childEthBridger = await EthBridger.fromProvider(childProvider)
  const decimals = await getNativeTokenDecimals({
    parentProvider,
    childProvider
  })

  const address = await userWallet.getAddress()

  const tokenContract = TestERC20__factory.connect(
    childEthBridger.nativeToken!,
    localWallet.connect(parentProvider)
  )

  const userBalance = await tokenContract.balanceOf(address)
  const shouldFund = userBalance.lt(utils.parseUnits('0.3', decimals))

  if (!shouldFund) {
    console.log(
      `User wallet has enough custom native currency for testing, skip funding...`
    )
    return
  }

  console.log(`Funding native currency to user wallet on L2...`)

  const tx = await tokenContract.transfer(
    address,
    utils.parseUnits('3', decimals)
  )
  await tx.wait()
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

function isNonZeroAddress(address: string | undefined) {
  return (
    typeof address === 'string' &&
    address !== constants.AddressZero &&
    utils.isAddress(address)
  )
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

  // store deployed weth address
  if (erc20L1Address === l1WethAddress) {
    l2WethAddress = await getL2ERC20Address({
      erc20L1Address: l1WethAddress,
      l1Provider: parentProvider,
      l2Provider: childProvider
    })
  }
}

function getWethContract(
  provider: StaticJsonRpcProvider,
  tokenAddress: string
) {
  return TestWETH9__factory.connect(tokenAddress, userWallet.connect(provider))
}

async function fundWethOnParentChain() {
  console.log(`Funding WETH...`)
  const tx = await getWethContract(parentProvider, l1WethAddress).deposit({
    value: utils.parseEther('0.3')
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

async function fundErc20ToChildChain({
  parentErc20Address,
  parentSigner,
  amount,
  isCustomFeeToken
}: {
  parentErc20Address: string
  parentSigner: Wallet
  amount: BigNumber
  isCustomFeeToken: boolean
}) {
  // deploy any token that's not WETH
  // only deploy WETH for custom fee token chains because it's not deployed there
  if (parentErc20Address !== l1WethAddress || isCustomFeeToken) {
    // first deploy the ERC20 to L2 (if not, it might throw a gas error later)
    await deployERC20ToChildChain(parentErc20Address)
  }

  const erc20Bridger = await Erc20Bridger.fromProvider(childProvider)

  // approve the ERC20 token for spending
  const approvalTx = await erc20Bridger.approveToken({
    erc20ParentAddress: parentErc20Address,
    parentSigner,
    amount: constants.MaxUint256
  })
  await approvalTx.wait()

  const depositTx = await erc20Bridger.deposit({
    parentSigner,
    childProvider,
    erc20ParentAddress: parentErc20Address,
    amount,
    destinationAddress: userWallet.address
  })
  const depositRec = await depositTx.wait()

  // wait for funds to reach L2
  await depositRec.waitForChildTransactionReceipt(childProvider)
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