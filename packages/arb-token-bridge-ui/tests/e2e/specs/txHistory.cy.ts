const DEPOSIT_ROW_IDENTIFIER = /deposit-row-*/i
const CLAIMABLE_ROW_IDENTIFIER = /claimable-row-*/i

describe('Transaction History', () => {
  it('should successfully open and use pending transactions panel', () => {
    cy.login({
      networkType: 'parentChain',
      networkName: 'Sepolia',
      query: {
        sourceChain: 'sepolia',
        destinationChain: 'arbitrum-sepolia'
      }
    })
    // open tx history panel
    context('open transactions history panel', () => {
      cy.switchToTransactionHistoryTab('pending')
      cy.findAllByTestId(CLAIMABLE_ROW_IDENTIFIER)
        .its('length')
        .should('be.gt', 0)
    })
  })

  it('should successfully open and use settled transactions panel', () => {
    cy.login({
      networkType: 'parentChain',
      networkName: 'Sepolia',
      query: {
        sourceChain: 'sepolia',
        destinationChain: 'arbitrum-sepolia'
      }
    })
    context('open transactions history panel', () => {
      cy.switchToTransactionHistoryTab('settled')
      cy.findAllByTestId(CLAIMABLE_ROW_IDENTIFIER)
        .its('length')
        .should('be.gt', 0)
      cy.findAllByTestId(DEPOSIT_ROW_IDENTIFIER)
        .its('length')
        .should('be.gt', 0)
    })
  })
})
