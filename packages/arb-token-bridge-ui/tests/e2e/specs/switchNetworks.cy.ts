import { getL1NetworkName, getL2NetworkName } from '../../support/common'

describe('Switch Networks', () => {
  context('User is on test network L1', () => {
    it('should show L1 and L2 chains correctly', () => {
      cy.login({ networkType: 'parentChain' })
      cy.findSourceChainButton(getL1NetworkName())
      cy.findDestinationChainButton(getL2NetworkName())
    })

    context(
      'User is connected to parent chain, source chain is parent chain and destination chain is child chain',
      () => {
        it('should switch "from: Parent Chain" to "from: Child Chain" successfully', () => {
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
