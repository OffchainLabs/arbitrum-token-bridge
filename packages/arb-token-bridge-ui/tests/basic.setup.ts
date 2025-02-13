import { defineWalletSetup } from '@synthetixio/synpress'
import { MetaMask } from '@synthetixio/synpress/playwright'
import 'dotenv/config'

const SEED_PHRASE = process.env.SEED_PHRASE
const PASSWORD = process.env.WALLET_PASSWORD

if (!SEED_PHRASE) {
  throw new Error('SEED_PHRASE must be set in .e2e.env')
}

if (!PASSWORD) {
  throw new Error('WALLET_PASSWORD must be set in .e2e.env')
}

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, PASSWORD)

  await metamask.importWallet(SEED_PHRASE)
})
