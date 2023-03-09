/* eslint-disable jest/valid-expect */
/**
 * Add Metamask networks before all the other tests
 */

import {
  getL1NetworkConfig,
  getL2NetworkConfig,
  metamaskLocalL1RpcUrl
} from '../../support/common'

describe('Create Metamask networks', () => {
  afterEach(() => {
    cy.logout()
  })

  it('should add L1 network successfully if required', () => {
    // add L1 network if it's different than the local Metamask network
    if (Cypress.env('ETH_RPC_URL') !== metamaskLocalL1RpcUrl) {
      cy.addMetamaskNetwork(getL1NetworkConfig()).then(networkAdded => {
        expect(networkAdded, 'Adding L1 network has failed').to.be.true
      })
    }
  })

  it('should add L2 network successfully', () => {
    cy.addMetamaskNetwork(getL2NetworkConfig()).then(networkAdded => {
      expect(networkAdded, 'Adding L2 network has failed').to.be.true
    })
  })
})
