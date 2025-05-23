import { synpressCommandsForMetaMask } from '@synthetixio/synpress/cypress/support'

import logCollector from 'cypress-terminal-report/src/installLogsCollector'

import './commands'
import {
  getL1NetworkConfig,
  getL2NetworkConfig,
  getL2TestnetNetworkConfig
} from './common'

Cypress.on('uncaught:exception', () => {
  // failing the test
  return false
})

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

// Register Synpress v4 commands
synpressCommandsForMetaMask()

// In Synpress v4, this is setup via network configs in the before hook
before(() => {
  const ETH_RPC_URL = Cypress.env('ETH_RPC_URL')

  // L1
  // only CI setup is required, Metamask already has localhost
  if (ETH_RPC_URL !== 'http://localhost:8545') {
    cy.addNetwork(getL1NetworkConfig())
  }

  // L2
  cy.addNetwork(getL2NetworkConfig())
  cy.addNetwork(getL2TestnetNetworkConfig())

  cy.task('setNetworkSetupComplete')
})
