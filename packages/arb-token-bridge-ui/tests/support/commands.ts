// ***********************************************
// using commands.js you can create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import '@testing-library/cypress/add-commands'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { recurse } from 'cypress-recurse'
import { NetworkType, setupMetamaskNetwork, startWebApp } from './common'

function shouldChangeNetwork({
  networkType,
  networkName
}: {
  networkType: NetworkType
  networkName: string
}) {
  // synpress throws if trying to connect to a network we are already connected to
  // issue has been raised with synpress and this is just a workaround
  // TODO: remove this whenever fixed

  // currentNetworkType is stored after each network switch and used in the next login
  return cy.task('getCurrentNetworkType').then(
    async (currentNetworkType: NetworkType | null) => {
      if (currentNetworkType === 'L1') {
        const provider = new StaticJsonRpcProvider(Cypress.env('ETH_RPC_URL'))
        const currentNetworkName = (await provider.getNetwork()).name
        // change network if different network name or type
        return currentNetworkName !== networkName || networkType === 'L2'
      } else if (currentNetworkType === 'L2') {
        // change network if different network type
        // name is irrelevant because there is only one local L2
        return networkType === 'L1'
      } else {
        // change network if network type hasn't been set yet
        return true
      }
    }
  )
}

export function login({
  networkType,
  networkName,
  url,
  query
}: {
  networkType: NetworkType
  networkName?: string
  url?: string
  query?: { [s: string]: string }
}) {
  function _startWebApp() {
    startWebApp(url, query)
  }

  shouldChangeNetwork({ networkType, networkName }).then(changeNetwork => {
    if (changeNetwork) {
      setupMetamaskNetwork(networkType, networkName).then(() => {
        _startWebApp()
      })
    } else {
      _startWebApp()
    }

    // set current network type
    cy.task('setCurrentNetworkType', networkType)
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
