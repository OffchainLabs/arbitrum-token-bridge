import posthog from 'posthog-js'

import { FastBridgeNames, SpecialTokenSymbol } from './fastBridges'
import { isProductionEnvironment } from './CommonUtils'
import { RouteType } from '../components/TransferPanel/hooks/useRouteStore'
import { ChainId } from '../types/ChainId'

type AccountType = 'EOA' | 'Smart Contract'
type AssetType = 'ETH' | 'ERC-20'
type TransferDirection = 'Deposit' | 'Withdrawal' | 'Teleport'
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

export type SimplifiedRouteType = Extract<
  RouteType,
  'arbitrum' | 'oftV2' | 'cctp' | 'lifi'
>
type AnalyticsEventMap = {
  'Transfer Button Click': {
    type: TransferDirection
    isCustomDestinationTransfer: boolean
    selectedRoute: RouteType
    tokenSymbol?: string
    assetType: AssetType
    parentChainErc20Address?: string
    accountType: AccountType
    network: string
    amount: number
    amount2?: number
  }
  Deposit: {
    tokenSymbol?: string
    assetType: AssetType
    accountType: AccountType
    network: string
    amount: number
    amount2?: number
  }
  Withdraw: {
    tokenSymbol?: string
    assetType: AssetType
    accountType: AccountType
    network: string
    amount: number
  }
  Teleport: {
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
    version: number
  }
  'Redeem Retryable': { network: string }
  'Redeem Teleport Retryable': { network: string }
  'Tx Error: Get Help Click': {
    network: string
    transactionType: SimplifiedRouteType
  }
  'Address Block': { address: string }
  'Move More Funds Click': undefined
  'Explore: Randomize Click': undefined
  'Add to Google Calendar Click': undefined
  'CCTP Deposit': {
    accountType: AccountType
    network: string
    amount: number
    complete: boolean
    version: number
  }
  'CCTP Withdrawal': {
    accountType: AccountType
    network: string
    amount: number
    complete: boolean
    version: number
  }
  'OFT Transfer': {
    tokenSymbol: string
    assetType: string
    accountType: string
    network: string
    amount: number
    sourceChain: string
    destinationChain: string
  }
  'Lifi Transfer': {
    tokenSymbol: string
    assetType: string
    accountType: string
    network: string
    amount: number
    sourceChain: string
    destinationChain: string
  }
  'Recover funds': {
    chainId: ChainId
    balanceToRecover: string
  }
}

type AnalyticsEvent = keyof AnalyticsEventMap

export function trackEvent(
  event: AnalyticsEvent,
  properties?: AnalyticsEventMap[AnalyticsEvent]
): void {
  if (!isProductionEnvironment) {
    return
  }

  // Posthog
  posthog.capture(event, properties)
}
