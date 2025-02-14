import { defineWalletSetup } from '@synthetixio/synpress'
import { getExtensionId, MetaMask } from '@synthetixio/synpress/playwright'
import dotenv from 'dotenv'
import {
  getL1NetworkConfig,
  getL2NetworkConfig,
  getL2TestnetNetworkConfig
} from '../support/common'

dotenv.config({ path: `.e2e.env` })

const SEED_PHRASE =
  'test test test test test test test test test test test junk'

const PASSWORD = 'Password123'

const ETH_RPC_URL = process.env.ETH_RPC_URL

const PRIVATE_KEY_USER = process.env.PRIVATE_KEY_USER

if (!PRIVATE_KEY_USER) {
  throw new Error('PRIVATE_KEY_USER must be set in .e2e.env')
}

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  // This is a workaround for the fact that the MetaMask extension ID changes, and this ID is required to detect the pop-ups. // [!code focus]
  // It won't be needed in the near future! 😇 // [!code focus]
  const extensionId = await getExtensionId(context, 'MetaMask')

  const metamask = new MetaMask(context, walletPage, PASSWORD, extensionId)

  await metamask.importWallet(SEED_PHRASE)
  await metamask.importWalletFromPrivateKey(PRIVATE_KEY_USER)

  // L1
  // only CI setup is required, Metamask already has localhost
  if (ETH_RPC_URL !== 'http://localhost:8545') {
    cy.addNetwork(getL1NetworkConfig())
  }

  // L2
  cy.addNetwork(getL2NetworkConfig())
  cy.addNetwork(getL2TestnetNetworkConfig())
})
