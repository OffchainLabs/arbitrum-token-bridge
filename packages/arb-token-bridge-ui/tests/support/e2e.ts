import { synpressCommandsForMetaMask } from '@synthetixio/synpress/cypress/support'

import logCollector from 'cypress-terminal-report/src/installLogsCollector'

import './commands'

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

before(() => {
  cy.task('setNetworkSetupComplete')

  cy.visit('/')
})
