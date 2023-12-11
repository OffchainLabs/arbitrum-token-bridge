import './commands'
import '@synthetixio/synpress/support'

import { getL1NetworkConfig, getL2NetworkConfig } from './common'

Cypress.Keyboard.defaults({
  // tests are flaky in CI with low keystroke delay
  keystrokeDelay: 150
})

before(() => {
  // connect to goerli to avoid connecting to localhost twice and failing
  cy.setupMetamask(Cypress.env('PRIVATE_KEY'), 'goerli')
    .task('getNetworkSetupComplete')
    .then(complete => {
      if (!complete) {
        // L1
        cy.addMetamaskNetwork(getL1NetworkConfig())

        // L2
        cy.addMetamaskNetwork(getL2NetworkConfig())

        cy.task('setNetworkSetupComplete')
      }
    })
})
