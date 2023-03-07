import './commands'
import '@synthetixio/synpress/support'
import 'cypress-localstorage-commands'

Cypress.Keyboard.defaults({
  keystrokeDelay: 50
})

before(() => {
  cy.setupMetamask(Cypress.env('PRIVATE_KEY'), {
    networkName: 'localhost',
    rpcUrl: 'http://geth:8545',
    chainId: 1337,
    symbol: 'ETH',
    blockExplorer: 'http://geth:8545',
    isTestnet: true
  })
})
