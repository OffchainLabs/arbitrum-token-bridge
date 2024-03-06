import posthog from 'posthog-js'

import { FastBridgeNames, SpecialTokenSymbol } from './fastBridges'

type AccountType = 'EOA' | 'Smart Contract'
type AssetType = 'ETH' | 'ERC-20'
type TransferDirection = 'Deposit' | 'Withdrawal'
type FastBridgeName = `${FastBridgeNames}`

// TODO: maintain these wallet names in a central constants file (like networks.ts/wallet.ts) - can be consistently accessed all throughout the app?
export type ProviderName =
  | 'MetaMask'
  | 'Coinbase Wallet'
  | 'Trust Wallet'
  | 'WalletConnect'
  | 'Safe' // not used yet
  | 'Injected'
  | 'Ledger'
  | 'Other'

type AnalyticsEventMap = {
  Deposit: {
    tokenSymbol?: string
    assetType: AssetType
    accountType: AccountType
    network: string
    amount: number
  }
  Withdraw: {
    tokenSymbol?: string
    assetType: AssetType
    accountType: AccountType
    network: string
    amount: number
  }
  'Connect Wallet Click': { walletName: ProviderName }
  'Fast Bridge Click': {
    bridge: FastBridgeName
    tokenSymbol?: SpecialTokenSymbol.USDC
  }
  'Use Arbitrum Bridge Click': {
    tokenSymbol: SpecialTokenSymbol.USDC
    type: TransferDirection
  }
  'Use CCTP Click': {
    tokenSymbol: SpecialTokenSymbol.USDC
    type: TransferDirection
  }
  'Switch Network and Transfer': {
    type: TransferDirection
    tokenSymbol?: string
    assetType: AssetType
    accountType: AccountType
    network: string
    amount: number
  }
  'Redeem Retryable': { network: string }
  'Open Transaction History Click': { pageElement: 'Tx Info Banner' | 'Header' }
  'Tx Error: Get Help Click': { network: string }
  'Multiple Tx Error: Get Help Click': { network: string }
  'Address Block': { address: string }
  'Slow Bridge Click': undefined
  'Move More Funds Click': undefined
  'Explore: Randomize Click': undefined
  'Add to Google Calendar Click': undefined
  'CCTP Deposit': {
    accountType: AccountType
    network: string
    amount: number
    complete: boolean
  }
  'CCTP Withdrawal': {
    accountType: AccountType
    network: string
    amount: number
    complete: boolean
  }
}

type AnalyticsEvent = keyof AnalyticsEventMap

export function trackEvent(
  event: AnalyticsEvent,
  properties?: AnalyticsEventMap[AnalyticsEvent]
): void {
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  // Posthog
  posthog.capture(event, properties)
}
