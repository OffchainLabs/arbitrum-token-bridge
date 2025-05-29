import { defineWalletSetup } from '@synthetixio/synpress'
import { getExtensionId, MetaMask } from '@synthetixio/synpress/playwright'
import dotenv from 'dotenv'
import {
  getL1NetworkConfig,
  getL2NetworkConfig,
  getL2TestnetNetworkConfig
} from '../support/common'

dotenv.config({ path: `./.e2e.env` })

const SEED_PHRASE =
  'test test test test test test test test test test test junk'

const PASSWORD = 'Password123'

const ETH_RPC_URL = process.env.ETH_RPC_URL

const PRIVATE_KEY_USER = process.env.PRIVATE_KEY_USER

if (!PRIVATE_KEY_USER) {
  throw new Error('PRIVATE_KEY_USER must be set in .e2e.env')
}

// Using Synpress v4's defineWalletSetup function
export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  try {
    // Get MetaMask extension ID
    const extensionId = await getExtensionId(context, 'MetaMask')

    // Create MetaMask instance
    const metamask = new MetaMask(context, walletPage, PASSWORD, extensionId)

    // Import seed phrase wallet
    await metamask.importWallet(SEED_PHRASE)

    // Import user wallet from private key
    await metamask.importWallet(PRIVATE_KEY_USER)

    // Add networks to MetaMask
    // L1 network
    if (ETH_RPC_URL !== 'http://localhost:8545') {
      await metamask.addNetwork(getL1NetworkConfig())
    }

    // L2 networks
    await metamask.addNetwork(getL2NetworkConfig())
    await metamask.addNetwork(getL2TestnetNetworkConfig())

    console.log('MetaMask setup complete!')
  } catch (error) {
    console.error('Error during wallet setup:', error)
    // Continue even if there are errors to allow tests to run
  }
})
