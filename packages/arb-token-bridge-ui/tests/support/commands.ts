import '@testing-library/cypress/add-commands'
// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

const l2networkConfig = {
  networkName: 'arbitrum goerli',
  rpcUrl: 'https://goerli-rollup.arbitrum.io/rpc',
  chainId: '421613',
  symbol: 'ETH',
  blockExplorer: 'https://goerli-rollup-explorer.arbitrum.io',
  isTestnet: true
}

export function login(isL2Network?: boolean) {
  const setupMetamask = isL2Network => {
    return cy
      .setupMetamask(
        Cypress.env('SECRET_WORDS'),
        'goerli',
        Cypress.env('METAMASK_PASSWORD')
      )
      .then(() => {
        if (isL2Network) {
          cy.addMetamaskNetwork(l2networkConfig)
        } else {
          cy.changeMetamaskNetwork('goerli')
        }
      })
  }

  const startWebApp = () => {
    cy.visit(`/`)
    cy.findByText('Agree to terms').should('be.visible').click()
    cy.findByText('MetaMask').should('be.visible')
    cy.findByText('Connect to your MetaMask Wallet').click()
    cy.acceptMetamaskAccess().then(() => {
      cy.switchToCypressWindow().should('be.true')
    })
  }

  setupMetamask(isL2Network).then(() => {
    startWebApp()
  })
}

export const resetMetamask = () => {
  cy.switchToCypressWindow().then(() => {
    cy.disconnectMetamaskWalletFromAllDapps().then(() => {
      cy.clearLocalStorage().then(() => {
        cy.switchToCypressWindow().then(() => {
          cy.resetMetamaskAccount()
        })
      })
    })
  })
}

Cypress.Commands.addAll({ login, resetMetamask })
