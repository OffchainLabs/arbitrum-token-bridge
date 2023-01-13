/*
  All the utility functions and configs related to our testing
*/

import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { MultiCaller } from '@arbitrum/sdk'

export type NetworkType = 'L1' | 'L2'

export const ethRpcUrl = 'http://localhost:8545'
export const arbRpcUrl = 'http://localhost:8547'

export const l1NetworkConfig = {
  networkName: 'localhost',
  rpcUrl: ethRpcUrl,
  chainId: '1337',
  symbol: 'ETH',
  isTestnet: true
}

export const l2NetworkConfig = {
  networkName: 'arbitrum-localhost',
  rpcUrl: arbRpcUrl,
  chainId: '412346',
  symbol: 'ETH',
  isTestnet: true
}

export const ERC20TokenAddressL1 = '0x326C977E6efc84E512bB9C30f76E30c160eD06FB'
export const ERC20TokenAddressL2 = '0xd14838A68E8AFBAdE5efb411d5871ea0011AFd28'

export const zeroToLessThanOneETH = /0(\.\d+)*( ETH)/
export const zeroToLessThanOneERC20 = /0(\.\d+)*( LINK)/

export async function getInitialETHBalance(rpcURL: string): Promise<BigNumber> {
  const provider = new StaticJsonRpcProvider(rpcURL)
  return await provider.getBalance(Cypress.env('ADDRESS'))
}

export async function getInitialERC20Balance(
  tokenAddress: string,
  rpcURL: string
): Promise<BigNumber> {
  const provider = new StaticJsonRpcProvider(rpcURL)
  const multiCaller = await MultiCaller.fromProvider(provider)
  const [tokenData] = await multiCaller.getTokenData([tokenAddress], {
    balanceOf: { account: Cypress.env('ADDRESS') }
  })
  return tokenData.balance
}

export const setupMetamaskNetwork = (
  networkType: NetworkType,
  addNewNetwork?: boolean
) => {
  // we want control over the metamask flow before our web app starts (because we might want to start from an L2 network)
  // hence this additional network switch-check before actually starting the app
  if (networkType === 'L2') {
    if (addNewNetwork) {
      // add and switch to Arbitrum goerli network
      return cy.addMetamaskNetwork(l2NetworkConfig)
    } else {
      // L2 network already added
      // switch to Arbitrum goerli network
      return cy.changeMetamaskNetwork(l2NetworkConfig.networkName)
    }
  } else {
    //else, stick to the original l1 network
    return cy.changeMetamaskNetwork(l1NetworkConfig.networkName)
  }
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

export const startWebApp = () => {
  // once all the metamask setup is done, we can start the actual web-app for testing
  // cy.visit(`/`)
  cy.connectToApp()
  acceptMetamaskAccess()
}
