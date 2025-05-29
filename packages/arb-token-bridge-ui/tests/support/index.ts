import '@synthetixio/synpress/support'
import './commands'

import logCollector from 'cypress-terminal-report/src/installLogsCollector'

import {
  getL1NetworkConfig,
  getL2NetworkConfig,
  getL2TestnetNetworkConfig
} from './common'

logCollector({
  collectTypes: [
    'cy:command',
    'cy:log',
    'cons:debug',
    'cons:error',
    'cons:info',
    'cons:warn'
  ]
})

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
