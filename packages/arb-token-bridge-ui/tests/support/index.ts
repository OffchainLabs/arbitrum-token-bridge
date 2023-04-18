import './commands'
import '@synthetixio/synpress/support'
import 'cypress-localstorage-commands'

import {
  getL1NetworkConfig,
  getL2NetworkConfig,
  metamaskLocalL1RpcUrl
} from './common'

Cypress.Keyboard.defaults({
  // tests are flaky in CI with low keystroke delay
  keystrokeDelay: 150
})

before(() => {
  // connect to goerli to avoid connecting to localhost twice and failing
  cy.setupMetamask(Cypress.env('PRIVATE_KEY'), 'goerli')

  // setup local networks in Metamask if haven't done it yet
  cy.task('getNetworkSetupComplete').then(complete => {
    if (!complete) {
      // L1
      // only CI setup is required, Metamask already has localhost
      if (Cypress.env('ETH_RPC_URL') !== metamaskLocalL1RpcUrl) {
        cy.addMetamaskNetwork(getL1NetworkConfig())
      }

      // L2
      cy.addMetamaskNetwork(getL2NetworkConfig())

      cy.task('setNetworkSetupComplete')
    }
  })
})
