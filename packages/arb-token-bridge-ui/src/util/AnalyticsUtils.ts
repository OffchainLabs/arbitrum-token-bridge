import posthog from 'posthog-js'

import {
  ExploreArbitrumDeFiProjectName,
  ExploreArbitrumNFTProjectName
} from '../components/MainContent/ExploreArbitrumContent'
import { FastBridgeNames, SpecialTokenSymbol } from './fastBridges'
import { getNetworkName } from './networks'

type AccountType = 'EOA' | 'Smart Contract'
type AssetType = 'ETH' | 'ERC-20'
type FastBridgeName = `${FastBridgeNames}`

const AnalyticsNetworkNames = ['Arbitrum One', 'Arbitrum Nova'] as const
type AllNetworkNames = ReturnType<typeof getNetworkName>
type AnalyticsNetworkName = (typeof AnalyticsNetworkNames)[number]
export const shouldTrackAnalytics = (
  networkName: AllNetworkNames
): networkName is AnalyticsNetworkName => {
  if (process.env.NODE_ENV === 'development') {
    // sends events for any network when in dev
    return true
  }
  return AnalyticsNetworkNames.includes(networkName as AnalyticsNetworkName)
}

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
    network: AnalyticsNetworkName
    amount: number
  }
  Withdraw: {
    tokenSymbol?: string
    assetType: AssetType
    accountType: AccountType
    network: AnalyticsNetworkName
    amount: number
  }
  'Connect Wallet Click': { walletName: ProviderName }
  'Explore: DeFi Project Click': { project: ExploreArbitrumDeFiProjectName }
  'Explore: NFT Project Click': { project: ExploreArbitrumNFTProjectName }
  'Fast Bridge Click': {
    bridge: FastBridgeName
    tokenSymbol?: SpecialTokenSymbol.USDC
  }
  'Use Arbitrum Bridge Click': { tokenSymbol: 'USDC' }
  'Switch Network and Transfer': {
    type: 'Deposit' | 'Withdrawal'
    tokenSymbol?: string
    assetType: AssetType
    accountType: AccountType
    network: AnalyticsNetworkName
    amount: number
  }
  'Redeem Retryable': { network: AnalyticsNetworkName }
  'Open Transaction History Click': { pageElement: 'Tx Info Banner' | 'Header' }
  'Tx Error: Get Help Click': { network: AnalyticsNetworkName }
  'Multiple Tx Error: Get Help Click': { network: AnalyticsNetworkName }
  'Address Block': { address: string }
  'Slow Bridge Click': undefined
  'Move More Funds Click': undefined
  'Explore: Randomize Click': undefined
  'Add to Google Calendar Click': undefined
  'CCTP Deposit': {
    accountType: AccountType
    network: AnalyticsNetworkName
    amount: number
    complete: boolean
  }
  'CCTP Withdrawal': {
    accountType: AccountType
    network: AnalyticsNetworkName
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
