import {
  importTokenThroughUI,
  ERC20TokenName,
  ERC20TokenSymbol,
  zeroToLessThanOneETH,
  getL1NetworkName,
  getL2NetworkName
} from '../../support/common'

const ERC20TokenAddressL1 = Cypress.env('ERC20_TOKEN_ADDRESS_PARENT_CHAIN')

describe('Approve token for deposit', () => {
  // log in to metamask

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

      cy.findGasFeeSummary(zeroToLessThanOneETH)
      cy.findGasFeeForChain(getL1NetworkName(), zeroToLessThanOneETH)
      cy.findGasFeeForChain(getL2NetworkName(), zeroToLessThanOneETH)

      cy.waitUntil(() => cy.findMoveFundsButton().should('not.be.disabled'), {
        errorMsg: 'move funds button is disabled (expected to be enabled)',
        timeout: 50000,
        interval: 500
      })
      cy.findMoveFundsButton().click()
      cy.findByText(/pay a one-time approval fee/).click()
      cy.findByRole('button', {
        name: /Pay approval fee of/
      }).click()
      cy.confirmMetamaskPermissionToSpend('1')
    })
  })
})
