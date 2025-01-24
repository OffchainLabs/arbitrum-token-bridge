import logCollector from 'cypress-terminal-report/src/installLogsCollector'
import { synpressCommandsForMetaMask } from '@synthetixio/synpress/cypress/support'

Cypress.on('uncaught:exception', () => {
  // failing the test
  return false
})

import {
  getL1NetworkConfig,
  getL2NetworkConfig,
  getL2TestnetNetworkConfig
} from './common'
import './commands'

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

synpressCommandsForMetaMask()

before(() => {
  // connect to sepolia to avoid connecting to localhost twice and failing
  cy.importWalletFromPrivateKey(Cypress.env('PRIVATE_KEY'))
    .task('getNetworkSetupComplete')
    .then(complete => {
      if (!complete) {
        // L1
        // only CI setup is required, Metamask already has localhost
        if (Cypress.env('ETH_RPC_URL') !== 'http://localhost:8545') {
          cy.addNetwork(getL1NetworkConfig())
        }

        // L2
        cy.addNetwork(getL2NetworkConfig())
        cy.addNetwork(getL2TestnetNetworkConfig())

        cy.task('setNetworkSetupComplete')
      }
    })

  cy.visit('/')
})
