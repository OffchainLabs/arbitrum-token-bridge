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
    // due to test flakiness when typing, we handle each character individually
    // if character fails, we insert it again until succeeded, and so on

    // store text that currently has been typed in letter by letter
    let fullText = ''
    // number of letters that have been successfully inserted
    let index = 0

    recurse(
      // the commands to repeat, and they yield the input element
      () => {
        if (index === 0) {
          // initiate text storage
          fullText += text[0]
          // at the start we clear the input
          return cy.wrap(subject).clear().type(text[0])
        }
        if (!fullText[index]) {
          // only add a new character if no character exists at this index
          // if populated, it means that the character has been successfully inserted
          fullText += text[index]
        }
        // we don't clear the input here, continue to type in characters
        return cy.wrap(subject).type(text[index])
      },

      $input => {
        // current input value
        const val = String($input.val())
        if (val === fullText) {
          // only add letter count if the current input value is the same as our stored text
          // if they are the same that means both input and storage text match and we can move on to the next character
          index++
        }
        if (val.length < fullText.length) {
          // in case cypress types in too much, prevents long loops
          return false
        }
        // the predicate takes the output of the above commands
        // and returns a boolean. If it returns true, the recursion stops
        return val === text
      },
      {
        log: false,
        timeout: 60_000,
        delay: 10,
        // because we are typing very fast a lot of characters might fail
        // arbitrary number provided to safely pass the entire typing process
        limit: 2_000
      }
    )
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

export const connectToApp = () => {
  // initial modal prompts which come in the web-app
  cy.findByText('Agree to terms').should('be.visible').click()
  cy.findByText('Connect a Wallet').should('be.visible')
  cy.findByText('MetaMask').should('be.visible').click()
}

export const openTransactionsPanel = () => {
  cy.waitUntil(
    () =>
      cy.findByText(/Bridging summary will appear here/i).then(() => {
        // Open tx history panel
        cy.findByRole('button', { name: /account header button/i })
          .should('be.visible')
          .click()

        cy.findByRole('button', { name: /transactions/i })
          .should('be.visible')
          .click()
      }),
    {
      timeout: 10000,
      interval: 500
    }
  )
}

Cypress.Commands.addAll({
  connectToApp,
  login,
  logout,
  openTransactionsPanel
})
