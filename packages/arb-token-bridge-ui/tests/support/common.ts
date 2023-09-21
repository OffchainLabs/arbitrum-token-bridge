/*
  All the utility functions and configs related to our testing
*/

import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { MultiCaller } from '@arbitrum/sdk'

export type NetworkType = 'L1' | 'L2'
export type NetworkName =
  | 'custom-localhost'
  | 'arbitrum-localhost'
  | 'mainnet'
  | 'goerli'
  | 'sepolia'

export const metamaskLocalL1RpcUrl = 'http://localhost:8545'

type NetworkConfig = {
  networkName: NetworkName
  rpcUrl: string
  chainId: string
  symbol: string
  isTestnet: boolean
  multiCall: string
}

export const getNetworkNameForE2E = (networkType: NetworkType) => {
  if (networkType === 'L1') {
    return getL1NetworkConfig().networkName
  }
  return getL2NetworkConfig().networkName
}

export const getL1NetworkConfig = (): NetworkConfig => {
  return {
    networkName: 'custom-localhost',
    rpcUrl: Cypress.env('ETH_RPC_URL'),
    chainId: '1337',
    symbol: 'ETH',
    isTestnet: true,
    multiCall: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48'
  }
}

export const getL2NetworkConfig = (): NetworkConfig => {
  return {
    networkName: 'arbitrum-localhost',
    rpcUrl: Cypress.env('ARB_RPC_URL'),
    chainId: '412346',
    symbol: 'ETH',
    isTestnet: true,
    multiCall: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48'
  }
}

export const wethTokenAddressL1 = '0x408Da76E87511429485C32E4Ad647DD14823Fdc4'
export const wethTokenAddressL2 = '0x408Da76E87511429485C32E4Ad647DD14823Fdc4'
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

export async function getInitialERC20Balance(
  tokenAddress: string,
  multiCallerAddress: string,
  rpcURL: string
): Promise<BigNumber> {
  const provider = new StaticJsonRpcProvider(rpcURL)
  const multiCaller = new MultiCaller(provider, multiCallerAddress)
  const [tokenData] = await multiCaller.getTokenData([tokenAddress], {
    balanceOf: { account: Cypress.env('ADDRESS') }
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
  cy.clearLocalStorage('arbitrum:bridge:tos-v1')
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
