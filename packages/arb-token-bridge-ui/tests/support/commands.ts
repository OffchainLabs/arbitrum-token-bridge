// ***********************************************
// using commands.js you can create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import '@testing-library/cypress/add-commands'
import { recurse } from 'cypress-recurse'
import {
  NetworkType,
  NetworkName,
  startWebApp,
  getL1NetworkConfig,
  getL2NetworkConfig
} from './common'
import { shortenAddress } from '../../src/util/CommonUtils'
import { MatcherOptions } from '@testing-library/cypress'

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
      networkType === 'parentChain' && network.chainId === '412346'
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

Cypress.Commands.add(
  'typeRecursively',
  { prevSubject: true },
  (subject, text: string) => {
    recurse(
      // the commands to repeat, and they yield the input element
      () => cy.wrap(subject).clear().type(text),
      // the predicate takes the output of the above commands
      // and returns a boolean. If it returns true, the recursion stops
      $input => $input.val() === text,
      {
        log: false,
        timeout: 180_000
      }
    )
      // the recursion yields whatever the command function yields
      // and we can confirm that the text was entered correctly
      .should('have.value', text)
  }
)

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
  // Click on the ETH dropdown (Select token button)
  cy.findSelectTokenButton('ETH').click()

  // open the Select Token popup
  cy.findByPlaceholderText(/Search by token name/i)
    .typeRecursively(tokenAddress)
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
    .typeRecursively(Cypress.env('CUSTOM_DESTINATION_ADDRESS'))
}

export function typeAmount(
  amount: string | number
): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .findByPlaceholderText(/enter amount/i)
    .typeRecursively(String(amount))
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

export function openTransactionDetails({
  amount,
  symbol
}: {
  amount: number
  symbol: string
}): Cypress.Chainable<JQuery<HTMLElement>> {
  cy.findTransactionInTransactionHistory({ amount, symbol }).within(() => {
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
  amount,
  duration,
  options
}: {
  symbol: string
  amount: number
  duration?: string
  options?: MatcherOptions
}) {
  const rowId = new RegExp(
    `(claimable|deposit)-row-[0-9xabcdef]*-${amount}${symbol}`
  )
  cy.findByTestId(rowId, options).as('row')
  if (duration) {
    cy.get('@row').findAllByText(duration).first().should('be.visible')
  }

  cy.get('@row')
    .findByLabelText('Transaction details button')
    .should('be.visible')
  return cy.get('@row')
}

export function findClaimButton(
  amountToClaim: string
): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.findByLabelText(`Claim ${amountToClaim}`)
}

/**
 * Currently, Synpress confirmMetamaskPermissionToSpend is clicking only once
 * We need to call it twice to confirm it
 */
export function confirmSpending(
  params: Parameters<typeof cy.confirmMetamaskPermissionToSpend>[0]
) {
  cy.confirmMetamaskPermissionToSpend(params)
  cy.confirmMetamaskPermissionToSpend(params)
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
  findSourceChainButton,
  findDestinationChainButton,
  findGasFeeForChain,
  findGasFeeSummary,
  findMoveFundsButton,
  findSelectTokenButton,
  openTransactionDetails,
  closeTransactionDetails,
  findTransactionInTransactionHistory,
  findClaimButton,
  findTransactionDetailsCustomDestinationAddress
  confirmSpending
})
