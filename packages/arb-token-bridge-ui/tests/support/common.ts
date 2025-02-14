/*
  All the utility functions and configs related to our testing
*/

import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers'
import { BigNumber, Signer, Wallet, ethers, utils } from 'ethers'
import { EthBridger, MultiCaller } from '@arbitrum/sdk'
import { MULTICALL_TESTNET_ADDRESS } from '../../src/constants'
import {
  defaultL2Network,
  defaultL3Network,
  defaultL3CustomGasTokenNetwork
} from '../../src/util/networksNitroTestnode'

export type NetworkType = 'parentChain' | 'childChain'
export type NetworkName =
  | 'custom-localhost'
  | 'arbitrum-localhost'
  | 'l3-localhost'
  | 'arbitrum-sepolia'
  | 'mainnet'
  | 'sepolia'

type NetworkConfig = {
  name: NetworkName
  rpcUrl: string
  chainId: number
  symbol: string
  isTestnet: boolean
  multiCall: string
}

export const getL1NetworkName = () => {
  const isOrbitTest = Cypress.env('ORBIT_TEST') == '1'
  return isOrbitTest ? 'Arbitrum Local' : 'Ethereum Local'
}

export const getL2NetworkName = () => {
  const isOrbitTest = Cypress.env('ORBIT_TEST') == '1'
  return isOrbitTest ? 'L3 Local' : 'Arbitrum Local'
}

export const getL1NetworkConfig = (): NetworkConfig => {
  const isOrbitTest = Cypress.env('ORBIT_TEST') == '1'

  return {
    name: isOrbitTest ? 'arbitrum-localhost' : 'custom-localhost',
    rpcUrl: Cypress.env('ETH_RPC_URL'),
    chainId: isOrbitTest ? 412346 : 1337,
    symbol: 'ETH',
    isTestnet: true,
    multiCall: isOrbitTest
      ? defaultL2Network.tokenBridge!.childMultiCall
      : defaultL2Network.tokenBridge!.parentMultiCall
  }
}

export const getL2NetworkConfig = (): NetworkConfig => {
  const isOrbitTest = Cypress.env('ORBIT_TEST') == '1'
  const nativeTokenSymbol = Cypress.env('NATIVE_TOKEN_SYMBOL') ?? 'ETH'
  const isCustomFeeToken = nativeTokenSymbol !== 'ETH'

  const l3Network = isCustomFeeToken
    ? defaultL3CustomGasTokenNetwork
    : defaultL3Network

  return {
    name: isOrbitTest ? 'l3-localhost' : 'arbitrum-localhost',
    rpcUrl: Cypress.env('ARB_RPC_URL'),
    chainId: isOrbitTest ? 333333 : 412346,
    symbol: nativeTokenSymbol,
    isTestnet: true,
    multiCall: isOrbitTest
      ? l3Network.tokenBridge!.childMultiCall
      : defaultL2Network.tokenBridge!.childMultiCall
  }
}

export const getL1TestnetNetworkConfig = (): NetworkConfig => {
  return {
    name: 'sepolia',
    rpcUrl: Cypress.env('ETH_SEPOLIA_RPC_URL'),
    chainId: 11155111,
    symbol: 'ETH',
    isTestnet: true,
    multiCall: MULTICALL_TESTNET_ADDRESS
  }
}

export const getL2TestnetNetworkConfig = (): NetworkConfig => {
  return {
    name: 'arbitrum-sepolia',
    rpcUrl: Cypress.env('ARB_SEPOLIA_RPC_URL'),
    chainId: 421614,
    symbol: 'ETH',
    isTestnet: true,
    multiCall: MULTICALL_TESTNET_ADDRESS
  }
}

export const ERC20TokenName = 'Test Arbitrum Token'
export const ERC20TokenSymbol = 'TESTARB'
export const ERC20TokenDecimals = 18
export const invalidTokenAddress = utils.computeAddress(utils.randomBytes(32))

export const moreThanZeroBalance = /0(\.\d+)/

export function getZeroToLessThanOneToken(symbol: string) {
  return new RegExp(`0(\\.\\d+)*( ${symbol})`)
}

export const importTokenThroughUI = (address: string) => {
  // Click on the ETH dropdown (Select token button)
  cy.findSelectTokenButton(Cypress.env('NATIVE_TOKEN_SYMBOL') ?? 'ETH').click()

  // open the Select Token popup
  cy.findByPlaceholderText(/Search by token name/i)
    .should('be.visible')
    .type(address)

  // Click on the Add new token button
  return cy
    .findByRole('button', { name: 'Add New Token' })
    .should('be.visible')
    .click()
}

export async function getInitialETHBalance(
  rpcURL: string,
  walletAddress?: string
): Promise<BigNumber> {
  const provider = new StaticJsonRpcProvider(rpcURL)
  return await provider.getBalance(walletAddress ?? Cypress.env('ADDRESS'))
}

export async function getInitialERC20Balance({
  tokenAddress,
  multiCallerAddress,
  rpcURL,
  address
}: {
  tokenAddress: string
  multiCallerAddress: string
  rpcURL: string
  address: string
}): Promise<BigNumber | undefined> {
  const provider = new StaticJsonRpcProvider(rpcURL)
  const multiCaller = new MultiCaller(provider, multiCallerAddress)
  const [tokenData] = await multiCaller.getTokenData([tokenAddress], {
    balanceOf: { account: address }
  })
  return tokenData?.balance
}

export const acceptMetamaskAccess = () => {
  cy.connectToDapp()
}

export const startWebApp = (url = '/', qs: { [s: string]: string } = {}) => {
  // once all the metamask setup is done, we can start the actual web-app for testing
  // clear local storage for terms to always have it pop up
  cy.clearLocalStorage('arbitrum:bridge:tos-v2')
  cy.visit(url, {
    qs
  })
  if (Cypress.currentRetry > 0) {
    // ensures we don't test with the same state that could have caused the test to fail
    cy.reload(true)
  }
  cy.connectToDapp()
  cy.task('getWalletConnectedToDapp').then(connected => {
    if (!connected) {
      acceptMetamaskAccess()
      cy.task('setWalletConnectedToDapp')
    }
  })
}

export const visitAfterSomeDelay = (
  url: string,
  options?: Partial<Cypress.VisitOptions>
) => {
  cy.wait(15_000) // let all the race conditions settle, let UI load well first
  cy.visit(url, options)
  cy.wait(15_000)
}

export const wait = (ms = 0): Promise<void> => {
  return new Promise(res => setTimeout(res, ms))
}

export async function generateActivityOnChains({
  parentProvider,
  childProvider,
  wallet
}: {
  parentProvider: Provider
  childProvider: Provider
  wallet: Wallet
}) {
  const keepMining = async (miner: Signer) => {
    while (true) {
      await (
        await miner.sendTransaction({
          to: await miner.getAddress(),
          value: 0,
          // random data to make the tx heavy, so that batches are posted sooner (since they're posted according to calldata size)
          data: '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000010c3c627574746f6e20636c6173733d226e61766261722d746f67676c65722220747970653d22627574746f6e2220646174612d746f67676c653d22636f6c6c617073652220646174612d7461726765743d22236e6176626172537570706f72746564436f6e74656e742220617269612d636f6e74726f6c733d226e6176626172537570706f72746564436f6e74656e742220617269612d657870616e6465643d2266616c73652220617269612d6c6162656c3d223c253d20676574746578742822546f67676c65206e617669676174696f6e222920253e223e203c7370616e20636c6173733d226e61766261722d746f67676c65722d69636f6e223e3c2f7370616e3e203c2f627574746f6e3e0000000000000000000000000000000000000000'
        })
      ).wait()

      await wait(100)
    }
  }
  // whilst waiting for status we mine on both parentChain and childChain
  console.log('Generating activity on parentChain...')
  const minerParent = Wallet.createRandom().connect(parentProvider)

  const decimals = await getNativeTokenDecimals({
    parentProvider,
    childProvider
  })

  await fundEth({
    address: await minerParent.getAddress(),
    provider: parentProvider,
    sourceWallet: wallet,
    networkType: 'parentChain',
    amount: utils.parseUnits('0.2', decimals)
  })

  console.log('Generating activity on childChain...')
  const minerChild = Wallet.createRandom().connect(childProvider)

  await fundEth({
    address: await minerChild.getAddress(),
    provider: childProvider,
    sourceWallet: wallet,
    networkType: 'childChain',
    amount: utils.parseEther('0.2')
  })

  await Promise.allSettled([keepMining(minerParent), keepMining(minerChild)])
}

export async function checkForAssertions({
  parentProvider,
  testType
}: {
  parentProvider: Provider
  testType: 'regular' | 'orbit-eth' | 'orbit-custom'
}) {
  const abi = [
    'function latestConfirmed() public view returns (uint64)',
    'function latestNodeCreated() public view returns (uint64)'
  ]

  let rollupAddress: string

  switch (testType) {
    case 'orbit-eth':
      rollupAddress = defaultL3Network.ethBridge.rollup
      break
    case 'orbit-custom':
      rollupAddress = defaultL3CustomGasTokenNetwork.ethBridge.rollup
      break
    default:
      rollupAddress = defaultL2Network.ethBridge.rollup
  }

  const rollupContract = new ethers.Contract(rollupAddress, abi, parentProvider)

  const parentChainId = (await parentProvider.getNetwork()).chainId

  try {
    while (true) {
      console.log(
        `***** Assertion status on ChainId ${parentChainId}: ${(
          await rollupContract.latestNodeCreated()
        ).toString()} created / ${(
          await rollupContract.latestConfirmed()
        ).toString()} confirmed`
      )
      await wait(10000)
    }
  } catch (e) {
    console.log(
      `Could not fetch assertions for '${rollupAddress}' on ChainId ${parentChainId}`,
      e
    )
  }
}

export async function fundEth({
  address, // wallet address where funding is required
  provider,
  sourceWallet, // source wallet that will fund the `address`,
  networkType,
  amount
}: {
  address: string
  provider: Provider
  sourceWallet: Wallet
  networkType: NetworkType
  amount: BigNumber
}) {
  console.log(`Funding ETH ${address} on ${networkType}...`)
  const balance = await provider.getBalance(address)
  // Fund only if the balance is less than 2 eth
  if (balance.lt(amount)) {
    const tx = await sourceWallet.connect(provider).sendTransaction({
      to: address,
      value: amount
    })
    await tx.wait()
  }
}

export async function getCustomDestinationAddress() {
  console.log('Getting custom destination address...')
  return (await Wallet.createRandom().getAddress()).toLowerCase()
}

export function setupCypressTasks(
  on: Cypress.PluginEvents,
  { requiresNetworkSetup }: { requiresNetworkSetup: boolean }
) {
  let currentNetworkName: NetworkName | null = null
  let networkSetupComplete = !requiresNetworkSetup
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

export async function getNativeTokenDecimals({
  parentProvider,
  childProvider
}: {
  parentProvider: Provider
  childProvider: Provider
}) {
  const multiCaller = await MultiCaller.fromProvider(parentProvider)
  const ethBridger = await EthBridger.fromProvider(childProvider)
  const isCustomFeeToken = typeof ethBridger.nativeToken !== 'undefined'

  const nativeToken = isCustomFeeToken
    ? (
        await multiCaller.getTokenData([ethBridger.nativeToken!], {
          decimals: true
        })
      )[0]
    : undefined

  return nativeToken?.decimals ?? 18
}
