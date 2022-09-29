// ***********************************************
// using commands.js you can create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import '@testing-library/cypress/add-commands'
import { setupMetamask, startWebApp } from './common'

export function login(isL2Network?: boolean) {
  setupMetamask(isL2Network).then(() => {
    startWebApp()
  })
}

// once all assertions are run, before test exit, make sure web-app is reset to original
export const logout = () => {
  cy.switchToCypressWindow().then(() => {
    // disconnect-metamask-wallet hangs if already not connected to metamask,
    // so we do it while logout instead of before login.
    cy.disconnectMetamaskWalletFromAllDapps().then(() => {
      cy.clearLocalStorageSnapshot()
      cy.clearLocalStorage().then(() => {
        cy.switchToCypressWindow().then(() => {
          cy.resetMetamaskAccount()
        })
      })
    })
  })
}

Cypress.Commands.addAll({ login, logout })
