/*
  All the utility functions and configs related to our testing
*/

import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers'
import { BigNumber, Signer, Wallet, ethers, utils } from 'ethers'
import { MultiCaller } from '@arbitrum/sdk'
import { MULTICALL_TESTNET_ADDRESS } from '../../src/constants'
import { defaultL2Network } from '../../src/util/networks'

export type NetworkType = 'parentChain' | 'childChain'
export type NetworkName =
  | 'custom-localhost'
  | 'arbitrum-localhost'
  | 'arbitrum-sepolia'
  | 'mainnet'
  | 'sepolia'

type NetworkConfig = {
  networkName: NetworkName
  rpcUrl: string
  chainId: string
  symbol: string
  isTestnet: boolean
  multiCall: string
}

export const getL1NetworkConfig = (): NetworkConfig => {
  return {
    networkName: 'custom-localhost',
    rpcUrl: Cypress.env('ETH_RPC_URL'),
    chainId: '1337',
    symbol: 'ETH',
    isTestnet: true,
    multiCall: defaultL2Network.tokenBridge.parentMultiCall
  }
}

export const getL2NetworkConfig = (): NetworkConfig => {
  return {
    networkName: 'arbitrum-localhost',
    rpcUrl: Cypress.env('ARB_RPC_URL'),
    chainId: '412346',
    symbol: 'ETH',
    isTestnet: true,
    multiCall: defaultL2Network.tokenBridge.childMultiCall
  }
}

export const getL1TestnetNetworkConfig = (): NetworkConfig => {
  return {
    networkName: 'sepolia',
    rpcUrl: Cypress.env('ETH_SEPOLIA_RPC_URL'),
    chainId: '11155111',
    symbol: 'ETH',
    isTestnet: true,
    multiCall: MULTICALL_TESTNET_ADDRESS
  }
}

export const getL2TestnetNetworkConfig = (): NetworkConfig => {
  return {
    networkName: 'arbitrum-sepolia',
    rpcUrl: Cypress.env('ARB_SEPOLIA_RPC_URL'),
    chainId: '421614',
    symbol: 'ETH',
    isTestnet: true,
    multiCall: MULTICALL_TESTNET_ADDRESS
  }
}

export const l1WethGateway = defaultL2Network.tokenBridge.parentWethGateway
export const wethTokenAddressL1 = defaultL2Network.tokenBridge.parentWeth
export const wethTokenAddressL2 = defaultL2Network.tokenBridge.childWeth
export const ERC20TokenName = 'IntArbTestToken'
export const ERC20TokenSymbol = 'IARB'
export const invalidTokenAddress = '0x0000000000000000000000000000000000000000'

export const zeroToLessThanOneETH = /0(\.\d+)*( ETH)/

export const importTokenThroughUI = (address: string) => {
  // Click on the ETH dropdown (Select token button)
  cy.findSelectTokenButton('ETH').click()

  // open the Select Token popup
  return cy
    .findByPlaceholderText(/Search by token name/i)
    .should('be.visible')
    .typeRecursively(address)
    .then(() => {
      // Click on the Add new token button
      cy.findByRole('button', { name: 'Add New Token' })
        .should('be.visible')
        .click()
    })
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
  return tokenData.balance
}

export const acceptMetamaskAccess = () => {
  cy.acceptMetamaskAccess().then(() => {
    cy.isCypressWindowActive().then(cyWindowIsActive => {
      if (!cyWindowIsActive) {
        cy.switchToCypressWindow().should('be.true')
      }
    })
  })
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
  cy.connectToApp()
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
}

export const wait = (ms = 0): Promise<void> => {
  return new Promise(res => setTimeout(res, ms))
}

export async function generateActivityOnChains({
  parentChainProvider,
  childChainProvider,
  wallet
}: {
  parentChainProvider: Provider
  childChainProvider: Provider
  wallet: Wallet
}) {
  async function fundWalletEth(walletAddress, networkType: 'L1' | 'L2') {
    const provider =
      networkType === 'L1' ? parentChainProvider : childChainProvider
    const tx = await wallet.connect(provider).sendTransaction({
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
          // random data to make the tx heavy, so that batches are posted sooner (since they're posted according to calldata size)
          data: '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000010c3c627574746f6e20636c6173733d226e61766261722d746f67676c65722220747970653d22627574746f6e2220646174612d746f67676c653d22636f6c6c617073652220646174612d7461726765743d22236e6176626172537570706f72746564436f6e74656e742220617269612d636f6e74726f6c733d226e6176626172537570706f72746564436f6e74656e742220617269612d657870616e6465643d2266616c73652220617269612d6c6162656c3d223c253d20676574746578742822546f67676c65206e617669676174696f6e222920253e223e203c7370616e20636c6173733d226e61766261722d746f67676c65722d69636f6e223e3c2f7370616e3e203c2f627574746f6e3e0000000000000000000000000000000000000000'
        })
      ).wait()

      await wait(100)
    }
  }
  // whilst waiting for status we mine on both l1 and l2
  console.log('Generating activity on L1...')
  const minerL1 = Wallet.createRandom().connect(parentChainProvider)
  await fundWalletEth(await minerL1.getAddress(), 'L1')

  console.log('Generating activity on L2...')
  const minerL2 = Wallet.createRandom().connect(childChainProvider)
  await fundWalletEth(await minerL2.getAddress(), 'L2')

  await Promise.allSettled([keepMining(minerL1), keepMining(minerL2)])
}

export async function checkForAssertions({
  parentChainProvider
}: {
  parentChainProvider: Provider
}) {
  const abi = [
    'function latestConfirmed() public view returns (uint64)',
    'function latestNodeCreated() public view returns (uint64)'
  ]

  const rollupContract = new ethers.Contract(
    defaultL2Network.ethBridge.rollup,
    abi,
    parentChainProvider
  )

  while (true) {
    console.log(
      `***** Assertion status: ${(
        await rollupContract.latestNodeCreated()
      ).toString()} created / ${(
        await rollupContract.latestConfirmed()
      ).toString()} confirmed`
    )
    await wait(10000)
  }
}
