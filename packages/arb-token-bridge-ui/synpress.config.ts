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
import { TestWETH9 } from '@arbitrum/sdk/dist/lib/abi/TestWETH9'
import { Erc20Bridger, EthBridger } from '@arbitrum/sdk'
import logsPrinter from 'cypress-terminal-report/src/installLogsPrinter'
import { getL2ERC20Address } from './src/util/TokenUtils'
import specFiles from './tests/e2e/specfiles.json'
import { contractAbi, contractByteCode } from './testErc20Token'
import {
  checkForAssertions,
  generateActivityOnChains,
  NetworkType,
  fundEth,
  setupCypressTasks,
  getCustomDestinationAddress,
  ERC20TokenSymbol,
  ERC20TokenDecimals,
  ERC20TokenName
} from './tests/support/common'

import {
  defaultL2Network,
  defaultL3Network,
  defaultL3CustomGasTokenNetwork,
  registerLocalNetwork
} from './src/util/networks'
import { getCommonSynpressConfig } from './tests/e2e/getCommonSynpressConfig'

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
    async setupNodeEvents(on, config) {
      logsPrinter(on)
      await registerLocalNetwork()

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

      const bridger = await Erc20Bridger.fromProvider(childProvider)
      const ethBridger = await EthBridger.fromProvider(childProvider)
      const isCustomFeeToken = isNonZeroAddress(ethBridger.nativeToken)

      // Approve custom fee token if not ETH
      if (isCustomFeeToken) {
        await approveCustomFeeToken(
          localWallet.connect(parentProvider),
          l1ERC20Token.address
        )
        await approveCustomFeeToken(
          localWallet.connect(parentProvider),
          bridger.nativeToken!
        )
        await ethBridger.approveGasToken({
          parentSigner: localWallet.connect(parentProvider)
        })
      }
      await fundUserWalletNativeCurrency()

      await fundErc20ToParentChain(l1ERC20Token)
      await fundErc20ToChildChain(
        l1ERC20Token.address,
        localWallet.connect(parentProvider),
        '5'
      )
      await approveErc20(l1ERC20Token)

      if (
        !isNonZeroAddress(l1WethAddress) ||
        !isNonZeroAddress(l2WethAddress)
      ) {
        const wethAddresses = await deployWeth(parentProvider)
        l1WethAddress = wethAddresses.l1WethAddress
        l2WethAddress = wethAddresses.l2WethAddress
      }

      if (isCustomFeeToken) {
        await approveCustomFeeToken(
          userWallet.connect(parentProvider),
          bridger.nativeToken!
        )
      }

      if (isCustomFeeToken) {
        await ethBridger.approveGasToken({
          parentSigner: userWallet.connect(parentProvider)
        })
        await bridger.approveGasToken({
          parentSigner: userWallet.connect(parentProvider),
          erc20ParentAddress: l1WethAddress
        })
      }

      // Wrap ETH to test WETH transactions and approve it's usage
      await fundWeth('parentChain')
      await approveWeth()
      // await fundWeth('childChain')
      if (isCustomFeeToken) {
        await approveCustomFeeToken(
          userWallet.connect(parentProvider),
          l1WethAddress
        )
      }

      const wethBal = await getWethContract(
        parentProvider,
        l1WethAddress
      ).balanceOf(userWallet.address)

      await fundErc20ToChildChain(
        l1WethAddress,
        userWallet.connect(parentProvider),
        '0.1'
      )

      // Generate activity on chains so that assertions get posted and claims can be made
      generateActivityOnChains({
        parentProvider,
        childProvider,
        wallet: localWallet
      })
      // Also keep watching assertions since they will act as a proof of activity and claims for withdrawals
      checkForAssertions({
        parentProvider,
        testType:
          process.env.E2E_ORBIT_CUSTOM_GAS_TOKEN === 'true'
            ? 'orbit-custom'
            : process.env.E2E_ORBIT === 'true'
            ? 'orbit-eth'
            : 'regular'
      })

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
      config.env.NATIVE_TOKEN_SYMBOL = isCustomFeeToken ? 'TN' : 'ETH'

      config.env.CUSTOM_DESTINATION_ADDRESS =
        await getCustomDestinationAddress()

      config.env.ERC20_TOKEN_ADDRESS_CHILD_CHAIN = await getL2ERC20Address({
        erc20L1Address: l1ERC20Token.address,
        l1Provider: parentProvider,
        l2Provider: childProvider
      })
      config.env.L1_WETH_ADDRESS = l1WethAddress
      config.env.L2_WETH_ADDRESS = l2WethAddress

      if (isCustomFeeToken) {
        await approveCustomFeeToken(
          userWallet.connect(parentProvider),
          l1WethAddress
        )
      }

      config.env.REDEEM_RETRYABLE_TEST_TX =
        await generateTestTxForRedeemRetryable()

      synpressPlugins(on, config)
      setupCypressTasks(on, { requiresNetworkSetup: true })
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
  process.env.E2E_ORBIT_CUSTOM_GAS_TOKEN
    ? utils.sha256(utils.toUtf8Bytes('user_fee_token_deployer'))
    : process.env.PRIVATE_KEY_CUSTOM
)
const userWallet = new Wallet(process.env.PRIVATE_KEY_USER)

async function approveCustomFeeToken(
  signer: Wallet,
  erc20ParentAddress: string
) {
  console.log('Approving custom fee token...')
  const childErc20Bridger = await Erc20Bridger.fromProvider(childProvider)

  await childErc20Bridger.approveGasToken({
    parentSigner: signer,
    erc20ParentAddress
  })
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
  const shouldFund = userBalance.lt(utils.parseEther('0.3'))

  if (!shouldFund) {
    console.log(
      `User wallet has enough L3 native currency for testing, skip funding...`
    )
    return
  }

  console.log(`Funding native currency to user wallet on L2...`)

  const tx = await tokenContract.transfer(address, utils.parseEther('3'))
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
  const amount = networkType === 'parentChain' ? '0.3' : '0.1'
  const address = networkType === 'parentChain' ? l1WethAddress : l2WethAddress
  const provider =
    networkType === 'parentChain' ? parentProvider : childProvider
  const tx = await getWethContract(provider, address).deposit({
    value: utils.parseEther(amount)
  })
  await tx.wait()
}

async function depositWeth() {
  console.log(`Depositing WETH...`)
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

async function fundErc20ToChildChain(
  parentErc20Address: string,
  signer: Wallet,
  amount: string
) {
  // first deploy the ERC20 to L2 (if not, it might throw a gas error later)
  await deployERC20ToChildChain(parentErc20Address)

  const erc20Bridger = await Erc20Bridger.fromProvider(childProvider)
  const parentSigner = signer

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
    amount: parseUnits(amount, ERC20TokenDecimals),
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
