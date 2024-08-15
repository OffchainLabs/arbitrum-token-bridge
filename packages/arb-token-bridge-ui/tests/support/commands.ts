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
import { Provider } from '@ethersproject/providers'
import { BigNumber, Signer, Wallet, ethers, utils } from 'ethers'
import { CommonAddress } from '../../src/util/CommonAddressUtils'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'

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

  cy.findByPlaceholderText(Cypress.env('ADDRESS'))
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
  duration
}: {
  symbol: string
  amount: number
  duration?: string
}) {
  const rowId = new RegExp(
    `(claimable|deposit)-row-[0-9xabcdef]*-${amount}${symbol}`
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
  amountToClaim: string
): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.findByLabelText(`Claim ${amountToClaim}`)
}

export async function fundUsdc({
  address, // wallet address where funding is required
  provider,
  amount,
  networkType
}: {
  address: string
  provider: Provider
  amount: BigNumber
  networkType: NetworkType
}) {
  console.log('Funding USDC to user wallet...')
  const usdcContractAddress =
    networkType === 'parentChain'
      ? CommonAddress.Sepolia.USDC
      : CommonAddress.ArbitrumSepolia.USDC

  const localWallet = new Wallet(Cypress.env('LOCAL_CCTP_WALLET_PRIVATE_KEY'))
  const contract = new ERC20__factory().connect(localWallet.connect(provider))
  const token = contract.attach(usdcContractAddress)
  await token.deployed()
  const tx = await token.transfer(address, amount)
  await tx.wait()
}

export async function fundEth({
  address, // wallet address where funding is required
  provider,
  sourceWallet, // source wallet that will fund the `address`,
  amount = utils.parseEther('2')
}: {
  address: string
  provider: Provider
  sourceWallet: Wallet
  amount?: BigNumber
}) {
  console.log(`Funding ETH to user wallet...`)
  const balance = await provider.getBalance(address)
  // Fund only if the balance is less than 2 eth
  if (balance.lt(amount)) {
    const tx = await sourceWallet.connect(provider).sendTransaction({
      to: address,
      value: amount
    })
    await tx.wait()
  }
}

export const wait = (ms = 0): Promise<void> => {
  return new Promise(res => setTimeout(res, ms))
}
export async function generateActivityOnChains({
  parentProvider,
  childProvider,
  wallet
}: {
  parentProvider: Provider
  childProvider: Provider
  wallet: Wallet
}) {
  const keepMining = async (miner: Signer) => {
    while (true) {
      await (
        await miner.sendTransaction({
          to: await miner.getAddress(),
          value: 0,
          // random data to make the tx heavy, so that batches are posted sooner (since they're posted according to calldata size)
          data: '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000010c3c627574746f6e20636c6173733d226e61766261722d746f67676c65722220747970653d22627574746f6e2220646174612d746f67676c653d22636f6c6c617073652220646174612d7461726765743d22236e6176626172537570706f72746564436f6e74656e742220617269612d636f6e74726f6c733d226e6176626172537570706f72746564436f6e74656e742220617269612d657870616e6465643d2266616c73652220617269612d6c6162656c3d223c253d20676574746578742822546f67676c65206e617669676174696f6e222920253e223e203c7370616e20636c6173733d226e61766261722d746f67676c65722d69636f6e223e3c2f7370616e3e203c2f627574746f6e3e0000000000000000000000000000000000000000'
        })
      ).wait()

      await wait(100)
    }
  }
  // whilst waiting for status we mine on both parentChain and childChain
  console.log('Generating activity on parentChain...')
  const minerParent = Wallet.createRandom().connect(parentProvider)
  await fundEth({
    address: await minerParent.getAddress(),
    provider: parentProvider,
    sourceWallet: wallet
  })

  console.log('Generating activity on childChain...')
  const minerChild = Wallet.createRandom().connect(childProvider)
  await fundEth({
    address: await minerChild.getAddress(),
    provider: childProvider,
    sourceWallet: wallet
  })

  await Promise.allSettled([keepMining(minerParent), keepMining(minerChild)])
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
  findTransactionDetailsCustomDestinationAddress,
  fundUsdc,
  fundEth,
  generateActivityOnChains
})
