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
  isTestnet: true,
  l1MultiCall: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48'
}

export const l2NetworkConfig = {
  networkName: 'arbitrum-localhost',
  rpcUrl: arbRpcUrl,
  chainId: '412346',
  symbol: 'ETH',
  isTestnet: true,
  l2MultiCall: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48'
}

export const wethTokenAddressL1 = '0x408Da76E87511429485C32E4Ad647DD14823Fdc4'
export const wethTokenAddressL2 = '0x408Da76E87511429485C32E4Ad647DD14823Fdc4'
export const invalidTokenAddress = '0x0000000000000000000000000000000000000000'

export const zeroToLessThanOneETH = /0(\.\d+)*( ETH)/
export const zeroToLessThanOneERC20 = /0(\.\d+)*( LINK)/

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

export const startWebApp = (
  url: string = '/',
  qs: { [s: string]: string } = {}
) => {
  // once all the metamask setup is done, we can start the actual web-app for testing
  cy.visit(url, {
    qs
  })
  cy.connectToApp()
  acceptMetamaskAccess()
}
