// ***********************************************
// using commands.js you can create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import '@testing-library/cypress/add-commands'
import { recurse } from 'cypress-recurse'
import {
  NetworkType,
  NetworkName,
  startWebApp,
  getL1NetworkConfig,
  getL2NetworkConfig
} from './common'

function shouldChangeNetwork(networkName: NetworkName) {
  // synpress throws if trying to connect to a network we are already connected to
  // issue has been raised with synpress and this is just a workaround
  // TODO: remove this whenever fixed
  return cy
    .task('getCurrentNetworkName')
    .then((currentNetworkName: NetworkName) => {
      return currentNetworkName !== networkName
    })
}

export function login({
  networkType,
  networkName,
  url,
  query
}: {
  networkType: NetworkType
  networkName?: NetworkName
  url?: string
  query?: { [s: string]: string }
}) {
  function _startWebApp() {
    startWebApp(url, query)
  }

  // if networkName is not specified we connect to default network from config
  networkName =
    networkName ||
    (networkType === 'L1' ? getL1NetworkConfig() : getL2NetworkConfig())
      .networkName

  shouldChangeNetwork(networkName).then(changeNetwork => {
    if (changeNetwork) {
      cy.changeMetamaskNetwork(networkName).then(() => {
        _startWebApp()
      })
    } else {
      _startWebApp()
    }

    cy.task('setCurrentNetworkName', networkName)
  })
}

Cypress.Commands.add(
  'typeRecursively',
  { prevSubject: true },
  (subject, text: string) => {
    recurse(
      // the commands to repeat, and they yield the input element
      () =>
        cy.wrap(subject).clear({ scrollBehavior: false }).type(text, {
          scrollBehavior: false
        }),
      // the predicate takes the output of the above commands
      // and returns a boolean. If it returns true, the recursion stops
      $input => $input.val() === text,
      {
        log: false,
        timeout: 180_000
      }
    )
      // the recursion yields whatever the command function yields
      // and we can confirm that the text was entered correctly
      .should('have.value', text)
  }
)

// once all assertions are run, before test exit, make sure web-app is reset to original
export const logout = () => {
  cy.disconnectMetamaskWalletFromAllDapps().then(() => {
    cy.resetMetamaskAccount().then(() => {
      // resetMetamaskAccount doesn't seem to remove the connected network in CI
      // changeMetamaskNetwork fails if already connected to the desired network
      // as a workaround we switch to another network after all the tests
      cy.changeMetamaskNetwork('goerli')
    })
  })
}

export const restoreAppState = () => {
  // restore local storage from previous test
  cy.restoreLocalStorage()
}

export const saveAppState = () => {
  // cypress clears local storage between tests
  // so in order to preserve local storage on the page between tests
  // we need to use the cypress-localstorage-commands plugin
  // or else we have to visit the page every test which will be much slower
  // https://docs.cypress.io/api/commands/clearlocalstorage
  cy.saveLocalStorage()
}

export const connectToApp = () => {
  // initial modal prompts which come in the web-app
  cy.findByText('Agree to terms').should('be.visible').click()
  cy.findByText('MetaMask').should('be.visible')
  cy.findByText('Connect to your MetaMask Wallet').should('be.visible').click()
}

export const openTransactionsPanel = () => {
  cy.findByRole('button', { name: /account header button/i })
    .should('be.visible')
    .click()

  cy.findByRole('button', { name: /transactions/i })
    .should('be.visible')
    .click()
}

Cypress.Commands.addAll({
  connectToApp,
  login,
  logout,
  restoreAppState,
  saveAppState,
  openTransactionsPanel
})
