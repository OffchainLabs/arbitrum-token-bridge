import './commands'
import '@synthetixio/synpress/support'
import 'cypress-localstorage-commands'

before(() => {
  cy.setupMetamask(Cypress.env('PRIVATE_KEY'))
})
