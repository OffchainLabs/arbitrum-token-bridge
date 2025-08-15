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

/**
 * Visit the bridge UI with different query params, accepts the terms and conditions, and optionally connect to the bridge with MetaMask.
 * @param params.networkType - The type of network to connect to ('parentChain' or 'childChain').
 * @param params.networkName - By default, we connect to a local network from testnode. Specify the network name to connect to a testnet or mainnet.
 * @param params.url - Legacy param. The URL of the web app to start (optional). By default it's `/` and we only use `/` in the codebase now. TODO: remove this.
 * @param params.query - Additional query parameters to pass to the web app (optional). This is used for specifying any query params.
 * @param params.connectMetamask - Whether to connect to MetaMask during login (default: true).
 */
export function login({
  networkType,
  networkName,
  url,
  query,
  connectMetamask = true
}: {
  networkType: NetworkType
  networkName?: NetworkName
  url?: string
  query?: { [s: string]: string }
  connectMetamask?: boolean
}) {
  // if networkName is not specified we connect to default network from config
  const network =
    networkType === 'parentChain' ? getL1NetworkConfig() : getL2NetworkConfig()
  const networkNameWithDefault = networkName ?? network.name

  function _startWebApp() {
    const sourceChain = networkNameWithDefault.toLowerCase().replace(/ /g, '-')

    // when testing Orbit chains we want to set destination chain to L3
    const destinationChain =
      networkType === 'parentChain' && network.chainId === 412346
        ? 'nitro-testnode-l3'
        : ''
    startWebApp(url, {
      query: { ...query, sourceChain, destinationChain },
      connectMetamask
    })
  }

  cy.changeMetamaskNetwork(networkNameWithDefault).then(() => {
    _startWebApp()
  })
}

export const acceptTnC = () => {
  // click on the terms and conditions acceptance checkbox before making transfers
  cy.findByText(/I have read and agree to the/i)
    .scrollIntoView()
    .should('be.visible')
    .click()
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
    .and('contain', 'selected')
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
  // click on Send to custom address toggle button
  cy.findByLabelText('Show Custom Destination Address')
    .scrollIntoView()
    .should('be.visible')
    .click()

  cy.wait(1_000)
  cy.findByLabelText('Custom Destination Address Input')
    .scrollIntoView()
    .should('be.disabled')

  // unlock custom destination address input
  cy.findByLabelText('Custom destination input lock')
    .scrollIntoView()
    .should('be.visible')
    .click()

  cy.findByLabelText('Custom Destination Address Input')
    .scrollIntoView()
    .should('be.visible')
    .should('be.enabled')
    .type(Cypress.env('CUSTOM_DESTINATION_ADDRESS'))

  cy.findByLabelText('Close Dialog').should('be.visible').click()
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

export function findGasFeeSummary(
  amount: string | number | RegExp
): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.findByLabelText('Route gas').should('contain', amount)
}

export function findMoveFundsButton(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .findByRole('button', { name: /move funds|select route/i })
    .scrollIntoView()
    .should('be.visible')
}

export function clickMoveFundsButton({
  shouldConfirmInMetamask = true
}: {
  shouldConfirmInMetamask?: boolean
} = {}) {
  cy.wait(5_000)
  cy.findMoveFundsButton().click()
  cy.wait(15_000)
  if (shouldConfirmInMetamask) {
    cy.confirmMetamaskTransaction({
      gasConfig: 'market',
      shouldWaitForPopupClosure: true
    })
  }
}

export function findSelectTokenButton(
  text: string
): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .findByRole('button', { name: 'Select Token' })
    .should('be.visible')
    .should('have.text', text)
}

export function switchToTransferPanelTab() {
  return cy.findByLabelText('Switch to Bridge Tab').click()
}

export function switchToTransactionHistoryTab(tab: 'pending' | 'settled') {
  cy.log(`opening transactions panel on ${tab}`)

  cy.findByLabelText('Switch to Transaction History Tab').click()

  cy.selectTransactionsPanelTab(tab)

  cy.findByText(/Showing \d+ \w+ transactions made in/, {
    timeout: 150_000
  }).should('be.visible')
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
  const timeout = 120_000

  // Replace . with \.
  const parsedAmount = amount.toString().replace(/\./g, '\\.')

  const rowId = new RegExp(
    `(claimable|deposit)-row-[0-9xabcdef]*-${parsedAmount}${symbol}${
      amount2 && symbol2 ? `-${amount2}${symbol2}` : ''
    }`
  )

  cy.findByTestId(rowId, { timeout }).as('row')
  if (duration) {
    cy.get('@row', { timeout })
      .findAllByText(duration, { timeout })
      .first()
      .should('be.visible', { timeout })
  }

  cy.get('@row', { timeout })
    .findByLabelText('Transaction details button', { timeout })
    .should('be.visible', { timeout })
  return cy.get('@row', { timeout })
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
  cy.switchToTransactionHistoryTab('pending')
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

export function clickClaimButton(amountToClaim: string) {
  cy.findClaimButton(amountToClaim).should('be.visible')
  cy.wait(10_000)
  cy.findClaimButton(amountToClaim).click()
}

export function selectRoute(type: 'arbitrum' | 'oftV2' | 'cctp') {
  cy.findByLabelText(`Route ${type}`).should('be.visible').click()
}

Cypress.Commands.addAll({
  acceptTnC,
  login,
  selectTransactionsPanelTab,
  searchAndSelectToken,
  fillCustomDestinationAddress,
  typeAmount,
  typeAmount2,
  findAmountInput,
  findAmount2Input,
  findSourceChainButton,
  findDestinationChainButton,
  findGasFeeSummary,
  findMoveFundsButton,
  clickMoveFundsButton,
  findSelectTokenButton,
  switchToTransferPanelTab,
  switchToTransactionHistoryTab,
  openTransactionDetails,
  closeTransactionDetails,
  findTransactionInTransactionHistory,
  findClaimButton,
  clickClaimButton,
  findTransactionDetailsCustomDestinationAddress,
  confirmSpending,
  claimCctp,
  selectRoute
})
