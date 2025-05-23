import {
  importTokenThroughUI,
  ERC20TokenName,
  ERC20TokenSymbol,
  getZeroToLessThanOneToken
} from '../../support/common'

const ERC20TokenAddressL1 = Cypress.env('ERC20_TOKEN_ADDRESS_PARENT_CHAIN')

describe('Approve token for deposit', () => {
  // log in to metamask
  const zeroToLessThanOneEth = getZeroToLessThanOneToken('ETH')

  it('should approve and deposit ERC-20 token', () => {
    context('Approve token', () => {
      cy.login({ networkType: 'parentChain' })
      importTokenThroughUI(ERC20TokenAddressL1)

      // Select the ERC-20 token
      cy.findByText('Added by User').should('exist')
      cy.findByText(ERC20TokenName).click()

      // ERC-20 token should be selected now and popup should be closed after selection
      cy.findSelectTokenButton(ERC20TokenSymbol)

      cy.findByText('MAX').click()

      cy.findGasFeeSummary(zeroToLessThanOneEth)
      cy.selectRoute('arbitrum')

      cy.findMoveFundsButton().should('not.be.disabled')
      cy.clickMoveFundsButton({ shouldConfirmInMetamask: false })
      cy.findByText(/pay a one-time approval fee/).click()
      cy.findByRole('button', {
        name: /Pay approval fee of/
      }).click()
      cy.confirmSpending(5)

      /**
       * If confirm spending fails, test is still considered to be passing by Cypress
       * We add another check to make sure the test fails if needed
       */
      cy.wait(25_000)
      cy.rejectTransaction()
    })
  })
})
