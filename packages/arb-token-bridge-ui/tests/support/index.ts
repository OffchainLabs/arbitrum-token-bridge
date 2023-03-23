import './commands'
import '@synthetixio/synpress/support'
import 'cypress-localstorage-commands'

Cypress.Keyboard.defaults({
  // tests are flaky in CI with low keystroke delay
  keystrokeDelay: 300
})

before(() => {
  // connect to goerli to avoid connecting to localhost twice and failing
  cy.setupMetamask(Cypress.env('PRIVATE_KEY'), 'goerli')
})
