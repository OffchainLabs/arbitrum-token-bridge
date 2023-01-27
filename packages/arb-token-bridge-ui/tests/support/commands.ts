// ***********************************************
// using commands.js you can create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import '@testing-library/cypress/add-commands'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { BigNumber, constants, utils, Wallet } from 'ethers'
import { TestWETH9__factory } from '@arbitrum/sdk/dist/lib/abi/factories/TestWETH9__factory'
import {
  ethRpcUrl,
  ERC20TokenAddressL1,
  l1NetworkConfig,
  NetworkType,
  setupMetamaskNetwork,
  startWebApp
} from './common'

export function login(networkType: NetworkType, addNewNetwork?: boolean) {
  setupMetamaskNetwork(networkType, addNewNetwork).then(() => {
    startWebApp()
  })
}

// once all assertions are run, before test exit, make sure web-app is reset to original
export const logout = () => {
  cy.switchToCypressWindow().then(() => {
    cy.changeMetamaskNetwork(l1NetworkConfig.networkName).then(() => {
      // disconnect-metamask-wallet hangs if already not connected to metamask,
      // so we do it while logout instead of before login.
      cy.disconnectMetamaskWalletFromAllDapps().then(() => {
        cy.switchToCypressWindow().then(() => {
          cy.resetMetamaskAccount()
        })
      })
    })
  })
}

export const sendEthToAccount = (
  accountNameOrNumberFrom: string | number,
  accountNameOrNumberTo: string | number,
  amount: number
) => {
  cy.switchMetamaskAccount(accountNameOrNumberTo)
  cy.getMetamaskWalletAddress().then(async address => {
    cy.switchMetamaskAccount(accountNameOrNumberFrom)
    const provider = new StaticJsonRpcProvider(ethRpcUrl)
    const wallet = new Wallet(Cypress.env('PRIVATE_KEY')).connect(provider)
    const tx = {
      to: address,
      value: utils.parseEther(String(amount))
    }
    await wallet.sendTransaction(tx)
  })
}

export const wrapEth = async (amount: BigNumber) => {
  const provider = new StaticJsonRpcProvider(ethRpcUrl)
  const wallet = new Wallet(Cypress.env('PRIVATE_KEY')).connect(provider)
  const factory = TestWETH9__factory.connect(ERC20TokenAddressL1, wallet)
  const tx = await factory.deposit({ value: amount })
  await tx.wait()
}

export const approveWeth = async () => {
  const provider = new StaticJsonRpcProvider(ethRpcUrl)
  const wallet = new Wallet(Cypress.env('PRIVATE_KEY')).connect(provider)
  const factory = TestWETH9__factory.connect(ERC20TokenAddressL1, wallet)
  const tx = await factory.approve(
    // L1 WETH gateway
    '0xF5FfD11A55AFD39377411Ab9856474D2a7Cb697e',
    constants.MaxInt256
  )
  await tx.wait()
}

export const resetSeenTimeStampCache = () => {
  const dataKey = 'arbitrum:bridge:seen-txs'
  const timestampKey = 'arbitrum:bridge:seen-txs:created-at'

  cy.setLocalStorage(dataKey, JSON.stringify([]))
  cy.setLocalStorage(timestampKey, new Date().toISOString())

  cy.saveLocalStorage()
}

export const restoreAppState = () => {
  // restore local storage from previous test

  cy.restoreLocalStorage().then(() => {
    // check if there are proper values of cache timestamp
    const timestampKey = 'arbitrum:bridge:seen-txs:created-at'

    cy.getLocalStorage(timestampKey).then(cacheSeenTimeStamp => {
      // if proper value of cache-timestamp are not found between tests, set it
      if (!cacheSeenTimeStamp) {
        resetSeenTimeStampCache()
      }
    })
  })
}

export const saveAppState = () => {
  // cypress clears local storage between tests
  // so in order to preserve local storage on the page between tests
  // we need to use the cypress-localstorage-commands plugin
  // or else we have to visit the page every test which will be much slower
  // https://docs.cypress.io/api/commands/clearlocalstorage
  cy.saveLocalStorage()
}

export const connectToApp = () => {
  // initial modal prompts which come in the web-app
  cy.findByText('MetaMask').should('be.visible')
  cy.findByText('Connect to your MetaMask Wallet').should('be.visible').click()
}

Cypress.Commands.addAll({
  login,
  logout,
  restoreAppState,
  saveAppState,
  connectToApp,
  wrapEth,
  sendEthToAccount,
  approveWeth
})
