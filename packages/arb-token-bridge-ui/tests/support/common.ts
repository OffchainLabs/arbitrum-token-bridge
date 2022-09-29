/*
  All the utility functions and configs related to our testing
*/

import { JsonRpcProvider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'

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

export async function getInitialETHBalance(rpcURL: string): Promise<BigNumber> {
  const goerliProvider = new JsonRpcProvider(rpcURL)
  return await goerliProvider.getBalance(Cypress.env('ADDRESS'))
}

export const setupMetamask = (isL2Network: boolean) => {
  // we want complete control over the metamask flow before our web app starts (because we might want to start from an L2 network)
  // hence we are not bootstrapping metamask from.env anymore

  // start with bootstrapping from default l1 network
  return cy
    .setupMetamask(
      Cypress.env('SECRET_WORDS'),
      l1NetworkConfig,
      Cypress.env('METAMASK_PASSWORD')
    )
    .then(() => {
      // if we wanted to start with l2 network, add and switch to it
      if (isL2Network) {
        cy.addMetamaskNetwork(l2NetworkConfig)
      } else {
        //else, stick to the original l1 network
        cy.changeMetamaskNetwork(l1NetworkConfig)
      }
    })
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
