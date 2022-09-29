/*
  All the utility functions and configs related to our testing
*/

import { JsonRpcProvider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { MultiCaller, Erc20Bridger } from '@arbitrum/sdk'

export type NetworkType = 'L1' | 'L2'

export const l1NetworkConfig = 'goerli'

export const l2NetworkConfig = {
  networkName: 'arbitrum goerli',
  rpcUrl: 'https://goerli-rollup.arbitrum.io/rpc',
  chainId: '421613',
  symbol: 'ETH',
  blockExplorer: 'https://goerli-rollup-explorer.arbitrum.io',
  isTestnet: true
}

export const goerliRPC = `https://goerli.infura.io/v3/${Cypress.env(
  'INFURA_KEY'
)}`
export const arbitrumGoerliRPC = 'https://goerli-rollup.arbitrum.io/rpc'

export const customERC20TokenAddressL1 =
  '0x326C977E6efc84E512bB9C30f76E30c160eD06FB'
export const customERC20TokenAddressL2 =
  '0xd14838A68E8AFBAdE5efb411d5871ea0011AFd28'

export const zeroToLessThanOneETH = /0(\.\d+)*( ETH)/
export const zeroToLessThanOneERC20 = /0(\.\d+)*( LINK)/

export async function getInitialETHBalance(rpcURL: string): Promise<BigNumber> {
  const provider = new JsonRpcProvider(rpcURL)
  return await provider.getBalance(Cypress.env('ADDRESS'))
}

export async function getInitialERC20Balance(
  tokenAddress: string,
  rpcURL: string
): Promise<BigNumber> {
  const provider = new JsonRpcProvider(rpcURL)
  const multiCaller = await MultiCaller.fromProvider(provider)
  const [tokenData] = await multiCaller.getTokenData([tokenAddress], {
    balanceOf: { account: Cypress.env('ADDRESS') },
    decimals: true
  })
  return await tokenData.balance
}

export const setupMetamaskNetwork = (networkType: NetworkType) => {
  // we want control over the metamask flow before our web app starts (because we might want to start from an L2 network)
  // hence this additional network switch-check before actually starting the app
  if (networkType === 'L2') {
    // add and switch to Arbitrum goerli network
    return cy.addMetamaskNetwork(l2NetworkConfig)
  } else {
    //else, stick to the original l1 network
    return cy.changeMetamaskNetwork(l1NetworkConfig)
  }
}

export const startWebApp = () => {
  // once all the metamask setup is done, we can start the actual web-app for testing
  cy.visit(`/`)

  // initial modal prompts which come in the web-app
  cy.findByText('Agree to terms').should('be.visible').click()
  cy.findByText('MetaMask').should('be.visible')
  cy.findByText('Connect to your MetaMask Wallet').click()
  cy.acceptMetamaskAccess().then(() => {
    cy.switchToCypressWindow().should('be.true')
  })
}
