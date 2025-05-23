import {
  ERC20TokenSymbol,
  getInitialERC20Balance,
  getInitialETHBalance,
  getL1NetworkConfig,
  getL1NetworkName,
  getL2NetworkConfig,
  getL2NetworkName,
  getZeroToLessThanOneToken
} from '../../support/common'
import { formatAmount } from '../../../src/util/NumberUtils'

describe('Batch Deposit', () => {
  let parentErc20Balance, childNativeTokenBalance, childErc20Balance: string

  const nativeTokenSymbol = Cypress.env('NATIVE_TOKEN_SYMBOL')
  const zeroToLessThanOneEth = getZeroToLessThanOneToken('ETH')

  beforeEach(() => {
    getInitialERC20Balance({
      tokenAddress: Cypress.env('ERC20_TOKEN_ADDRESS_CHILD_CHAIN'),
      multiCallerAddress: getL2NetworkConfig().multiCall,
      address: Cypress.env('ADDRESS'),
      rpcURL: Cypress.env('ARB_RPC_URL')
    }).then(val => (childErc20Balance = formatAmount(val)))

    getInitialETHBalance(
      Cypress.env('ARB_RPC_URL'),
      Cypress.env('ADDRESS')
    ).then(val => (childNativeTokenBalance = formatAmount(val)))

    getInitialERC20Balance({
      tokenAddress: Cypress.env('ERC20_TOKEN_ADDRESS_PARENT_CHAIN'),
      multiCallerAddress: getL1NetworkConfig().multiCall,
      address: Cypress.env('ADDRESS'),
      rpcURL: Cypress.env('ETH_RPC_URL')
    }).then(val => (parentErc20Balance = formatAmount(val)))
  })

  it('should show L1 and L2 chains, and ETH correctly', () => {
    cy.login({
      networkType: 'parentChain',
      url: '/'
    })
    cy.findSourceChainButton(getL1NetworkName())
    cy.findDestinationChainButton(getL2NetworkName())
    cy.findSelectTokenButton(nativeTokenSymbol)
  })

  it('should deposit erc-20 and native currency to the same address', () => {
    // randomize the amount to be sure that previous transactions are not checked in e2e
    const ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5))
    const nativeCurrencyAmountToSend = 0.002

    const isOrbitTest = Cypress.env('ORBIT_TEST') == '1'
    const depositTime = isOrbitTest ? 'Less than a minute' : '9 minutes'

    cy.login({ networkType: 'parentChain' })
    context('should add a new token', () => {
      cy.searchAndSelectToken({
        tokenName: ERC20TokenSymbol,
        tokenAddress: Cypress.env('ERC20_TOKEN_ADDRESS_PARENT_CHAIN')
      })
    })

    context('should show erc-20 parent balance correctly', () => {
      cy.findByLabelText(`${ERC20TokenSymbol} balance amount on parentChain`)
        .should('be.visible')
        .contains(parentErc20Balance)
    })

    context('should show erc-20 child balance correctly', () => {
      cy.findByLabelText(`${ERC20TokenSymbol} balance amount on childChain`)
        .should('be.visible')
        .contains(childErc20Balance)
    })

    context('native currency balance on child chain should not exist', () => {
      cy.findByLabelText(
        `${nativeTokenSymbol} balance amount on childChain`
      ).should('not.exist')
    })

    context('amount2 input should not exist', () => {
      cy.findAmount2Input().should('not.exist')
    })

    context('should click add native currency button', () => {
      cy.findByLabelText('Add native currency button')
        .should('be.visible')
        .click()
    })

    context('amount2 input should show', () => {
      cy.findAmount2Input().should('be.visible').should('have.value', '')
    })

    context('native currency balance on child chain should show', () => {
      cy.findByLabelText(`${nativeTokenSymbol} balance amount on childChain`)
        .should('be.visible')
        .contains(childNativeTokenBalance)
    })

    context('move funds button should be disabled', () => {
      cy.findMoveFundsButton().should('be.disabled')
    })

    context('should show gas estimations and summary', () => {
      cy.typeAmount(ERC20AmountToSend)
      cy.typeAmount2(nativeCurrencyAmountToSend)
      cy.findGasFeeSummary(zeroToLessThanOneEth)
    })

    const txData = {
      symbol: ERC20TokenSymbol,
      symbol2: nativeTokenSymbol,
      amount: ERC20AmountToSend,
      amount2: nativeCurrencyAmountToSend
    }

    context('should deposit successfully', () => {
      cy.clickMoveFundsButton()
      cy.findTransactionInTransactionHistory({
        ...txData,
        duration: depositTime
      })
    })

    context('deposit should complete successfully', () => {
      cy.selectTransactionsPanelTab('settled')

      cy.findTransactionInTransactionHistory(txData)

      cy.findTransactionInTransactionHistory({
        duration: 'a few seconds ago',
        ...txData
      })
      cy.switchToTransferPanelTab()
    })

    context('funds should reach destination account successfully', () => {
      // should have more funds on destination chain
      cy.findByLabelText(
        `${ERC20TokenSymbol} balance amount on childChain`
      ).should($el => {
        const currentBalance = parseFloat($el.text())
        expect(currentBalance).to.be.gt(Number(childErc20Balance))
      })

      cy.findByLabelText(
        `${nativeTokenSymbol} balance amount on childChain`
      ).should($el => {
        const currentBalance = parseFloat($el.text())
        expect(currentBalance).to.be.gt(Number(childNativeTokenBalance))
      })

      // the balance on the source chain should not be the same as before
      cy.findByLabelText(
        `${ERC20TokenSymbol} balance amount on parentChain`
      ).should($el => {
        const currentBalance = parseFloat($el.text())
        expect(currentBalance).to.be.lt(Number(parentErc20Balance))
      })
    })

    context('transfer panel amount should be reset', () => {
      cy.findAmountInput().should('have.value', '')
      cy.findAmount2Input().should('have.value', '')
      cy.findMoveFundsButton().should('be.disabled')
    })
  })

  it('should deposit erc-20 and native currency to a different address', () => {
    // randomize the amount to be sure that previous transactions are not checked in e2e
    const ERC20AmountToSend = Number((Math.random() * 0.001).toFixed(5))
    const nativeCurrencyAmountToSend = 0.002

    const isOrbitTest = Cypress.env('ORBIT_TEST') == '1'
    const depositTime = isOrbitTest ? 'Less than a minute' : '9 minutes'

    cy.login({ networkType: 'parentChain' })
    context('should add a new token', () => {
      cy.searchAndSelectToken({
        tokenName: ERC20TokenSymbol,
        tokenAddress: Cypress.env('ERC20_TOKEN_ADDRESS_PARENT_CHAIN')
      })
    })

    context('should fill custom destination address successfully', () => {
      cy.fillCustomDestinationAddress()
    })

    context('amount2 input should not exist', () => {
      cy.findAmount2Input().should('not.exist')
    })

    context('should click add native currency button', () => {
      cy.findByLabelText('Add native currency button')
        .should('be.visible')
        .click()
    })

    context('amount2 input should show', () => {
      cy.findAmount2Input().should('be.visible').should('have.value', '')
    })

    context('move funds button should be disabled', () => {
      cy.findMoveFundsButton().should('be.disabled')
    })

    context('should show gas estimations and summary', () => {
      cy.typeAmount(ERC20AmountToSend)
      cy.typeAmount2(nativeCurrencyAmountToSend)
      cy.findGasFeeSummary(zeroToLessThanOneEth)
    })

    const txData = {
      symbol: ERC20TokenSymbol,
      symbol2: nativeTokenSymbol,
      amount: ERC20AmountToSend,
      amount2: nativeCurrencyAmountToSend
    }

    context('should deposit successfully', () => {
      cy.clickMoveFundsButton()
      cy.findTransactionInTransactionHistory({
        ...txData,
        duration: depositTime
      })
      cy.openTransactionHistoryDetails(txData)
      cy.findTransactionDetailsCustomDestinationAddress(
        Cypress.env('CUSTOM_DESTINATION_ADDRESS')
      )
      cy.closeTransactionDetails()
    })

    context('deposit should complete successfully', () => {
      cy.selectTransactionsPanelTab('settled')

      cy.findTransactionInTransactionHistory(txData)

      cy.findTransactionInTransactionHistory({
        duration: 'a few seconds ago',
        ...txData
      })
      cy.openTransactionHistoryDetails(txData)
      cy.findTransactionDetailsCustomDestinationAddress(
        Cypress.env('CUSTOM_DESTINATION_ADDRESS')
      )
      cy.closeTransactionDetails()
      cy.switchToTransferPanelTab()
    })

    context('transfer panel amount should be reset', () => {
      cy.findAmountInput().should('have.value', '')
      cy.findAmount2Input().should('have.value', '')
      cy.findMoveFundsButton().should('be.disabled')
    })
  })
})
