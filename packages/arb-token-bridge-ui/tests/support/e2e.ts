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

synpressCommandsForMetaMask()

const PRIVATE_KEY_USER = Cypress.env('PRIVATE_KEY')

if (!PRIVATE_KEY_USER) {
  throw new Error('PRIVATE_KEY_USER must be set in .e2e.env')
}

const ETH_RPC_URL = process.env.ETH_RPC_URL

before(() => {
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
