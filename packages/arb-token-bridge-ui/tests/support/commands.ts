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
  getL2NetworkConfig,
  getInitialERC20Balance
} from './common'
import { Wallet, utils } from 'ethers'
import { CommonAddress } from '../../src/util/CommonAddressUtils'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { MULTICALL_TESTNET_ADDRESS } from '../../src/constants'

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
    networkType === 'L1' ? getL1NetworkConfig() : getL2NetworkConfig()
  const networkNameWithDefault = networkName ?? network.networkName

  function _startWebApp() {
    const sourceChain =
      networkNameWithDefault === 'mainnet' ? 'ethereum' : networkNameWithDefault
    startWebApp(url, { ...query, sourceChain })
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
  cy.disconnectMetamaskWalletFromAllDapps().then(() => {
    cy.resetMetamaskAccount().then(() => {
      // resetMetamaskAccount doesn't seem to remove the connected network in CI
      // changeMetamaskNetwork fails if already connected to the desired network
      // as a workaround we switch to another network after all the tests
      cy.changeMetamaskNetwork('sepolia')
    })
  })
}

export const connectToApp = () => {
  // initial modal prompts which come in the web-app
  cy.findByText(/Agree to Terms and Continue/i)
    .should('be.visible')
    .click()
  cy.findByText('Connect a Wallet').should('be.visible')
  cy.findByText('MetaMask').should('be.visible').click()
}

export const openTransactionsPanel = () => {
  cy.waitUntil(
    () =>
      cy.findByText(/Summary/i).then(() => {
        // Open tx history panel
        cy.findByRole('button', { name: /account header button/i })
          .should('be.visible')
          .click()

        cy.findByRole('button', { name: /transactions/i })
          .should('be.visible')
          .click()
      }),
    {
      timeout: 10000,
      interval: 500
    }
  )
}

const l1RpcUrl = Cypress.env('ETH_SEPOLIA_RPC_URL')
const l2RpcUrl = Cypress.env('ARB_SEPOLIA_RPC_URL')
const l1Provider = new StaticJsonRpcProvider(l1RpcUrl)
const l2Provider = new StaticJsonRpcProvider(l2RpcUrl)
const userWallet = new Wallet(Cypress.env('PRIVATE_KEY'))
const localWallet = new Wallet(Cypress.env('LOCAL_WALLET_PRIVATE_KEY'))

export async function resetCctpAllowance(networkType: 'L1' | 'L2') {
  const provider = networkType === 'L1' ? l1Provider : l2Provider
  const { USDC, tokenMessengerContractAddress } =
    networkType === 'L1' ? CommonAddress.Sepolia : CommonAddress.ArbitrumSepolia

  const contract = ERC20__factory.connect(USDC, userWallet.connect(provider))
  const allowance = await contract.allowance(
    userWallet.address,
    tokenMessengerContractAddress
  )
  if (allowance.gt(0)) {
    await contract.decreaseAllowance(tokenMessengerContractAddress, allowance)
  }
}

export async function fundUserUsdcTestnet(networkType: 'L1' | 'L2') {
  console.log(`Funding USDC to user wallet (testnet): ${networkType}...`)
  const usdcContractAddress =
    networkType === 'L1'
      ? CommonAddress.Sepolia.USDC
      : CommonAddress.ArbitrumSepolia.USDC

  const usdcBalance = await getInitialERC20Balance({
    address: userWallet.address,
    rpcURL: networkType === 'L1' ? l1RpcUrl : l2RpcUrl,
    tokenAddress: usdcContractAddress,
    multiCallerAddress: MULTICALL_TESTNET_ADDRESS
  })

  // Fund only if the balance is less than 0.0001 USDC
  if (usdcBalance && usdcBalance.lt(utils.parseUnits('0.0001', 6))) {
    console.log(`Adding USDC to user wallet (testnet): ${networkType}...`)
    const l1Provider = new StaticJsonRpcProvider(l1RpcUrl)
    const l2Provider = new StaticJsonRpcProvider(l2RpcUrl)
    const provider = networkType === 'L1' ? l1Provider : l2Provider
    const contract = new ERC20__factory().connect(localWallet.connect(provider))
    const token = contract.attach(usdcContractAddress)
    await token.deployed()
    const tx = await token.transfer(
      userWallet.address,
      utils.parseUnits('1', 6)
    )
    await tx.wait()
  }
}

export async function fundUserWalletEth(networkType: 'L1' | 'L2') {
  console.log(`Funding ETH to user wallet (testnet): ${networkType}...`)
  const address = await userWallet.getAddress()
  const provider = networkType === 'L1' ? l1Provider : l2Provider
  const balance = await provider.getBalance(address)
  // Fund only if the balance is less than 0.005 eth
  const amountToTransfer = '0.005'
  if (balance.lt(utils.parseEther(amountToTransfer))) {
    const tx = await localWallet.connect(provider).sendTransaction({
      to: address,
      value: utils.parseEther(amountToTransfer)
    })
    await tx.wait()
  }
}

export const searchAndSelectToken = ({
  tokenName,
  tokenAddress
}: {
  tokenName: string
  tokenAddress: string
}) => {
  // Click on the ETH dropdown (Select token button)
  cy.findByRole('button', { name: 'Select Token' })
    .should('be.visible')
    .should('have.text', 'ETH')
    .click()

  // open the Select Token popup
  cy.findByPlaceholderText(/Search by token name/i)
    .typeRecursively(tokenAddress)
    .should('be.visible')
    .then(() => {
      // Click on the Add new token button
      cy.findByRole('button', { name: 'Add New Token' })
        .should('be.visible')
        .click()

      // Select the USDC token
      cy.findAllByText(tokenName).first().click()

      // USDC token should be selected now and popup should be closed after selection
      cy.findByRole('button', { name: 'Select Token' })
        .should('be.visible')
        .should('have.text', tokenName)
    })
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

Cypress.Commands.addAll({
  connectToApp,
  login,
  logout,
  openTransactionsPanel,
  resetCctpAllowance,
  fundUserUsdcTestnet,
  fundUserWalletEth,
  searchAndSelectToken,
  fillCustomDestinationAddress
})
