import {
  importTokenThroughUI,
  ERC20TokenName,
  ERC20TokenSymbol,
  getZeroToLessThanOneToken,
  getL1NetworkName,
  getL2NetworkName
} from '../../support/common'

const ERC20TokenAddressL1 = Cypress.env('ERC20_TOKEN_ADDRESS_PARENT_CHAIN')

describe('Approve token for deposit', () => {
  // log in to metamask
  const zeroToLessThanOneEth = getZeroToLessThanOneToken('ETH')
  const zeroToLessThanOneNativeToken = getZeroToLessThanOneToken(
    Cypress.env('NATIVE_TOKEN_SYMBOL')
  )

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
      cy.findGasFeeForChain(getL1NetworkName(), zeroToLessThanOneEth)
      cy.findGasFeeForChain(getL2NetworkName(), zeroToLessThanOneNativeToken)

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
      cy.confirmSpending('5')

      /**
       * If confirm spending fails, test is still considered to be passing by Cypress
       * We add another check to make sure the test fails if needed
       */
      cy.wait(10_000)
      cy.rejectMetamaskTransaction()
    })
  })
})
