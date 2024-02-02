/*
  All the utility functions and configs related to our testing
*/

import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { MultiCaller } from '@arbitrum/sdk'
import { MULTICALL_TESTNET_ADDRESS } from '../../src/constants'
import { defaultL2Network } from '../../src/arbLocalNodeConstants'

export type NetworkType = 'L1' | 'L2'
export type NetworkName =
  | 'custom-localhost'
  | 'arbitrum-localhost'
  | 'arbitrum-goerli'
  | 'arbitrum-sepolia'
  | 'mainnet'
  | 'goerli'
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
    multiCall: defaultL2Network.tokenBridge.l1MultiCall
  }
}

export const getL2NetworkConfig = (): NetworkConfig => {
  return {
    networkName: 'arbitrum-localhost',
    rpcUrl: Cypress.env('ARB_RPC_URL'),
    chainId: '412346',
    symbol: 'ETH',
    isTestnet: true,
    multiCall: defaultL2Network.tokenBridge.l2Multicall
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

export const l1WethGateway = defaultL2Network.tokenBridge.l1WethGateway
export const wethTokenAddressL1 = defaultL2Network.tokenBridge.l1Weth
export const wethTokenAddressL2 = defaultL2Network.tokenBridge.l2Weth
export const ERC20TokenName = 'IntArbTestToken'
export const ERC20TokenSymbol = 'IARB'
export const invalidTokenAddress = '0x0000000000000000000000000000000000000000'

export const zeroToLessThanOneETH = /0(\.\d+)*( ETH)/

export const importTokenThroughUI = (address: string) => {
  // Click on the ETH dropdown (Select token button)
  cy.findByRole('button', { name: 'Select Token' })
    .should('be.visible')
    .should('have.text', 'ETH')
    .click()

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
