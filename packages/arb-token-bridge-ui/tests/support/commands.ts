// ***********************************************
// using commands.js you can create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import '@testing-library/cypress/add-commands'
import { SelectorMatcherOptions } from '@testing-library/cypress'
import {
  NetworkType,
  NetworkName,
  startWebApp,
  getL1NetworkConfig,
  getL2NetworkConfig
} from './common'
import { shortenAddress } from '../../src/util/CommonUtils'
import { formatAmount } from 'packages/arb-token-bridge-ui/src/util/NumberUtils'

function shouldChangeNetwork(networkName: NetworkName) {
  // synpress throws if trying to connect to a network we are already connected to
  // issue has been raised with synpress and this is just a workaround
  // TODO: remove this whenever fixed
  return cy
    .task('getCurrentNetworkName')
    .then((currentNetworkName: NetworkName) => {
      return currentNetworkName !== networkName
    })
}

export function login({
  networkType,
  networkName,
  url,
  query
}: {
  networkType: NetworkType
  networkName?: NetworkName
  url?: string
  query?: { [s: string]: string }
}) {
  // if networkName is not specified we connect to default network from config
  const network =
    networkType === 'parentChain' ? getL1NetworkConfig() : getL2NetworkConfig()
  const networkNameWithDefault = networkName ?? network.networkName

  function _startWebApp() {
    const sourceChain =
      networkNameWithDefault === 'mainnet' ? 'ethereum' : networkNameWithDefault

    // when testing Orbit chains we want to set destination chain to L3
    const destinationChain =
      networkType === 'parentChain' && network.chainId === 412346
        ? 'l3-localhost'
        : ''
    startWebApp(url, {
      ...query,
      sourceChain,
      destinationChain
    })
  }

  shouldChangeNetwork(networkNameWithDefault).then(changeNetwork => {
    if (changeNetwork) {
      cy.changeMetamaskNetwork(networkNameWithDefault).then(() => {
        _startWebApp()
      })
    } else {
      _startWebApp()
    }

    cy.task('setCurrentNetworkName', networkNameWithDefault)
  })
}

// once all assertions are run, before test exit, make sure web-app is reset to original
export const logout = () => {
  cy.disconnectMetamaskWalletFromAllDapps()
  cy.resetMetamaskAccount()
  // resetMetamaskAccount doesn't seem to remove the connected network in CI
  // changeMetamaskNetwork fails if already connected to the desired network
  // as a workaround we switch to another network after all the tests
  cy.changeMetamaskNetwork('sepolia')
}

export const connectToApp = () => {
  // initial modal prompts which come in the web-app
  cy.findByText(/Agree to Terms and Continue/i)
    .should('be.visible')
    .click()
  cy.findByText('Connect a Wallet').should('be.visible')
  cy.findByText('MetaMask').should('be.visible').click()
}

export const selectTransactionsPanelTab = (tab: 'pending' | 'settled') => {
  cy.findByRole('tab', {
    name: `show ${tab} transactions`
  })
    .as('tab')
    .should('be.visible')
    .click()

  return cy
    .get('@tab')
    .should('have.attr', 'data-headlessui-state')
    .and('equal', 'selected')
}

export const openTransactionsPanel = (tab: 'pending' | 'settled') => {
  cy.log(`opening transactions panel on ${tab}`)
  cy.findByRole('button', { name: /account header button/i })
    .should('be.visible')
    .click()
  cy.findByRole('button', { name: /transactions/i })
    .should('be.visible')
    .click()

  cy.selectTransactionsPanelTab(tab)

  // Waiting for transactions to be fetched
  return cy.waitUntil(
    () =>
      cy
        .findByText(/Showing \d+ \w+ transactions made in/)
        .should('be.visible'),
    {
      errorMsg: 'Failed to fetch transactions.',
      timeout: 30_000,
      interval: 500
    }
  )
}

export const searchAndSelectToken = ({
  tokenName,
  tokenAddress
}: {
  tokenName: string
  tokenAddress: string
}) => {
  // Click on the native token dropdown (Select token button)
  cy.findSelectTokenButton(Cypress.env('NATIVE_TOKEN_SYMBOL') ?? 'ETH').click()

  // open the Select Token popup
  cy.findByPlaceholderText(/Search by token name/i)
    .type(tokenAddress)
    .should('be.visible')

  // Click on the Add new token button
  cy.findByRole('button', { name: 'Add New Token' })
    .should('be.visible')
    .click()

  // Select the USDC token
  cy.findAllByText(tokenName).first().click()

  // USDC token should be selected now and popup should be closed after selection
  cy.findSelectTokenButton(tokenName)
}

export const fillCustomDestinationAddress = () => {
  // click on advanced settings
  cy.findByLabelText('advanced settings').should('be.visible').click()

  // unlock custom destination address input
  cy.findByLabelText('Custom destination input lock')
    .should('be.visible')
    .click()

  cy.findByLabelText('Custom Destination Address Input')
    .should('be.visible')
    .type(Cypress.env('CUSTOM_DESTINATION_ADDRESS'))
}

export function findAmountInput(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.findByLabelText('Amount input')
}

export function findAmount2Input(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.findByLabelText('Amount2 input')
}

export function typeAmount(
  amount: string | number
): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.findAmountInput().scrollIntoView().type(String(amount))
}

export function typeAmount2(
  amount: string | number
): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.findAmount2Input().scrollIntoView().type(String(amount))
}

export function findSourceChainButton(
  chain: string
): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .findByRole('button', { name: `From: ${chain}` })
    .should('be.visible')
}

export function findDestinationChainButton(
  chain: string
): Cypress.Chainable<JQuery<HTMLElement>> {
  return (
    cy
      //
      .findByRole('button', { name: `To: ${chain}` })
      .should('be.visible')
  )
}

export function findGasFeeForChain(
  label: string | RegExp,
  amount?: string | number | RegExp
): Cypress.Chainable<JQuery<HTMLElement>> {
  if (amount) {
    return cy
      .findByText(`${label} gas fee`)
      .parent()
      .siblings()
      .contains(amount)
      .should('be.visible')
  }

  return cy.findByText(label).should('be.visible')
}

export function findGasFeeSummary(
  amount: string | number | RegExp
): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .findByText('You will pay in gas fees:')
    .siblings()
    .last()
    .contains(amount)
    .should('be.visible')
}

export function findMoveFundsButton(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .findByRole('button', { name: /move funds/i })
    .scrollIntoView()
    .should('be.visible')
}

export function findSelectTokenButton(
  text: string
): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .findByRole('button', { name: 'Select Token' })
    .should('be.visible')
    .should('have.text', text)
}

export function closeTransactionHistoryPanel() {
  cy.findByLabelText('Close side panel').click()
}

export function openTransactionDetails({
  amount,
  amount2,
  symbol,
  symbol2
}: {
  amount: number
  amount2?: number
  symbol: string
  symbol2?: string
}): Cypress.Chainable<JQuery<HTMLElement>> {
  cy.findTransactionInTransactionHistory({
    amount,
    amount2,
    symbol,
    symbol2
  }).within(() => {
    cy.findByLabelText('Transaction details button').click()
  })
  return cy.findByText('Transaction details').should('be.visible')
}

export function closeTransactionDetails() {
  cy.findByLabelText('Close transaction details popup').click()
}

export function findTransactionDetailsCustomDestinationAddress(
  customAddress: string
): Cypress.Chainable<JQuery<HTMLElement>> {
  cy.findByText(/CUSTOM ADDRESS/i).should('be.visible')

  // custom destination label in pending tx history should be visible
  return cy
    .findByLabelText(`Custom address: ${shortenAddress(customAddress)}`)
    .should('be.visible')
}

export function findTransactionInTransactionHistory({
  symbol,
  symbol2,
  amount,
  amount2,
  duration
}: {
  symbol: string
  symbol2?: string
  amount: number
  amount2?: number
  duration?: string
}) {
  // Replace . with \.
  const parsedAmount = amount.toString().replace(/\./g, '\\.')

  const rowId = new RegExp(
    `(claimable|deposit)-row-[0-9xabcdef]*-${parsedAmount}${symbol}${
      amount2 && symbol2 ? `-${amount2}${symbol2}` : ''
    }`
  )

  cy.findByTestId(rowId).as('row')
  if (duration) {
    cy.get('@row').findAllByText(duration).first().should('be.visible')
  }

  cy.get('@row')
    .findByLabelText('Transaction details button')
    .should('be.visible')
  return cy.get('@row')
}

export function findClaimButton(
  amountToClaim: string,
  options?: SelectorMatcherOptions
): Cypress.Chainable<JQuery<HTMLElement>> {
  if (options) {
    return cy.findByLabelText(`Claim ${amountToClaim}`, options)
  }

  return cy.findByLabelText(`Claim ${amountToClaim}`)
}

/**
 * Currently, Synpress confirmMetamaskPermissionToSpend is clicking only once
 * We need to call it twice to confirm it.
 * shouldWaitForPopupClosure needs to be set to true for the test to pass
 */
export function confirmSpending(
  spendLimit: Parameters<
    typeof cy.confirmMetamaskPermissionToSpend
  >[0]['spendLimit']
) {
  cy.confirmMetamaskPermissionToSpend({
    spendLimit,
    shouldWaitForPopupClosure: true
  })
  cy.confirmMetamaskPermissionToSpend({
    spendLimit,
    shouldWaitForPopupClosure: true
  })
}

export function claimCctp(amount: number, options: { accept: boolean }) {
  const formattedAmount = formatAmount(amount, {
    symbol: 'USDC'
  })
  cy.openTransactionsPanel('pending')
  cy.findTransactionInTransactionHistory({
    amount,
    symbol: 'USDC'
  })
  cy.findClaimButton(formattedAmount, { timeout: 120_000 }).click()
  if (options.accept) {
    cy.confirmMetamaskTransaction(undefined)
    cy.findByLabelText('show settled transactions').should('be.visible').click()
    cy.findByText(formattedAmount).should('be.visible')
  } else {
    cy.rejectMetamaskTransaction()
  }
}

Cypress.Commands.addAll({
  connectToApp,
  login,
  logout,
  openTransactionsPanel,
  selectTransactionsPanelTab,
  searchAndSelectToken,
  fillCustomDestinationAddress,
  typeAmount,
  typeAmount2,
  findAmountInput,
  findAmount2Input,
  findSourceChainButton,
  findDestinationChainButton,
  findGasFeeForChain,
  findGasFeeSummary,
  findMoveFundsButton,
  findSelectTokenButton,
  closeTransactionHistoryPanel,
  openTransactionDetails,
  closeTransactionDetails,
  findTransactionInTransactionHistory,
  findClaimButton,
  findTransactionDetailsCustomDestinationAddress,
  confirmSpending,
  claimCctp
})
