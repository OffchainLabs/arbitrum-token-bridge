import './commands'
import '@synthetixio/synpress/support'
import 'cypress-localstorage-commands'

Cypress.Keyboard.defaults({
  keystrokeDelay: 50
})

before(() => {
  cy.setupMetamask(Cypress.env('PRIVATE_KEY'))
})
