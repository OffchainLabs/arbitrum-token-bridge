import './commands'
import '@synthetixio/synpress/support'
import logCollector from 'cypress-terminal-report/src/installLogsCollector'

import {
  getL1NetworkConfig,
  getL2NetworkConfig,
  getL2TestnetNetworkConfig
} from './common'

Cypress.Keyboard.defaults({
  // tests are flaky in CI with low keystroke delay
  keystrokeDelay: 150
})

logCollector()

before(() => {
  // connect to sepolia to avoid connecting to localhost twice and failing
  cy.setupMetamask(Cypress.env('PRIVATE_KEY'), 'sepolia')
    .task('getNetworkSetupComplete')
    .then(complete => {
      if (!complete) {
        // L1
        // only CI setup is required, Metamask already has localhost
        if (Cypress.env('ETH_RPC_URL') !== 'http://localhost:8545') {
          cy.addMetamaskNetwork(getL1NetworkConfig())
        }

        // L2
        cy.addMetamaskNetwork(getL2NetworkConfig())
        cy.addMetamaskNetwork(getL2TestnetNetworkConfig())

        cy.task('setNetworkSetupComplete')
      }
    })
})
