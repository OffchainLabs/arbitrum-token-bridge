/*
  All the utility functions and configs related to our testing
*/

import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { MultiCaller } from '@arbitrum/sdk'
import { MULTICALL_TESTNET_ADDRESS } from '../../src/constants'

export type NetworkType = 'L1' | 'L2'
export type NetworkName =
  | 'localhost'
  | 'custom-localhost'
  | 'arbitrum-localhost'
  | 'arbitrum-goerli'
  | 'mainnet'
  | 'goerli'
  | 'Sepolia test network'

export const metamaskLocalL1RpcUrl = 'http://localhost:8545'

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
    // reuse built-in Metamask network if possible
    // we add a new network in CI because of a different rpc url
    networkName:
      Cypress.env('ETH_RPC_URL') === metamaskLocalL1RpcUrl
        ? 'localhost'
        : 'custom-localhost',
    rpcUrl: Cypress.env('ETH_RPC_URL'),
    chainId: '1337',
    symbol: 'ETH',
    isTestnet: true,
    multiCall: '0xA39FFA43ebA037D67a0f4fe91956038ABA0CA386'
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

export const getL1TestnetNetworkConfig = (): NetworkConfig => {
  return {
    networkName: 'goerli',
    rpcUrl: Cypress.env('ETH_GOERLI_RPC_URL'),
    chainId: '5',
    symbol: 'ETH',
    isTestnet: true,
    multiCall: MULTICALL_TESTNET_ADDRESS
  }
}

export const getL2TestnetNetworkConfig = (): NetworkConfig => {
  return {
    networkName: 'arbitrum-goerli',
    rpcUrl: Cypress.env('ARB_GOERLI_RPC_URL'),
    chainId: '421613',
    symbol: 'ETH',
    isTestnet: true,
    multiCall: MULTICALL_TESTNET_ADDRESS
  }
}

export const l1WethGateway = '0x408Da76E87511429485C32E4Ad647DD14823Fdc4'
export const wethTokenAddressL1 = '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48'
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
