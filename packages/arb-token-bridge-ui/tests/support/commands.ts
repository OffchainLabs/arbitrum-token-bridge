// ***********************************************
// using commands.js you can create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import '@testing-library/cypress/add-commands'
import { NetworkType, setupMetamaskNetwork, startWebApp } from './common'

export function login(networkType: NetworkType) {
  setupMetamaskNetwork(networkType).then(() => {
    startWebApp()
  })
}

// once all assertions are run, before test exit, make sure web-app is reset to original
export const logout = () => {
  cy.switchToCypressWindow().then(() => {
    // disconnect-metamask-wallet hangs if already not connected to metamask,
    // so we do it while logout instead of before login.
    cy.disconnectMetamaskWalletFromAllDapps().then(() => {
      cy.switchToCypressWindow().then(() => {
        cy.resetMetamaskAccount()
      })
    })
  })
}

export const restoreAppState = () => {
  // restore local storage from previous test

  cy.restoreLocalStorage().then(() => {
    // check if there are proper values of cache timestamp
    const dataKey = 'arbitrum:bridge:seen-txs'
    const timestampKey = 'arbitrum:bridge:seen-txs:created-at'

    cy.getLocalStorage(timestampKey).then(cacheSeenTimeStamp => {
      // if proper value of cache-timestamp are not found between tests, set it
      if (!cacheSeenTimeStamp) {
        cy.setLocalStorage(dataKey, JSON.stringify([]))
        cy.setLocalStorage(timestampKey, new Date().toISOString())
      }
    })
  })
}

export const saveAppState = () => {
  // cypress clears local storage between tests
  // so in order to preserve local storage on the page between tests
  // we need to use the cypress-localstorage-commands plugin
  // or else we have to visit the page every test which will be much slower
  // https://docs.cypress.io/api/commands/clearlocalstorage
  cy.saveLocalStorage()
}

Cypress.Commands.addAll({ login, logout, restoreAppState, saveAppState })
