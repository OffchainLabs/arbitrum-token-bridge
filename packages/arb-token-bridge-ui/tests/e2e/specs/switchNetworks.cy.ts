import { getL1NetworkName, getL2NetworkName } from '../../support/common'

describe('Switch Networks', () => {
  before(() => cy.resetAppState())

  context('User is on test network L1', () => {
    it('should show L1 and L2 chains correctly', () => {
      cy.login({ networkType: 'parentChain' })
      cy.findSourceChainButton(getL1NetworkName())
      cy.findDestinationChainButton(getL2NetworkName())
    })

    context(
      'User is connected to Ethereum, source chain is Ethereum and destination chain is Arbitrum',
      () => {
        it('should switch "from: Ethereum" to "from: Arbitrum" successfully', () => {
          cy.login({ networkType: 'parentChain' })
          cy.findSourceChainButton(getL1NetworkName())

          cy.findByRole('button', { name: /Switch Networks/i })
            .should('be.visible')
            .click()

          cy.findSourceChainButton(getL2NetworkName())
        })
      }
    )
  })
})
