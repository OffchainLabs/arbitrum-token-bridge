import { posthog as posthogClient } from 'posthog-js'

import {
  ExploreArbitrumDeFiProjectName,
  ExploreArbitrumNFTProjectName
} from '../components/MainContent/ExploreArbitrumContent'
import {
  CEXName,
  FiatOnRampName
} from '../components/TransferPanel/LowBalanceDialogContent'
import {
  NonCanonicalTokenAddresses,
  NonCanonicalTokenNames,
  NonCanonicalTokenSupportedBridges,
  FastBridgeNames
} from './fastBridges'
import { ProviderName } from '../hooks/useNetworksAndSigners'
import { getNetworkName } from './networks'

declare global {
  interface Window {
    fathom?: {
      trackGoal: (eventId: string) => void
    }
  }
}

type AccountType = 'EOA' | 'Smart Contract'
type TokenType = 'ETH' | 'ERC-20'
type FastBridgeName = `${FastBridgeNames}`
type NonCanonicalTokenName = `${NonCanonicalTokenNames}`

const AnalyticsNetworkNames = ['Arbitrum One', 'Arbitrum Nova'] as const
type AllNetworkNames = ReturnType<typeof getNetworkName>
type AnalyticsNetworkName = (typeof AnalyticsNetworkNames)[number]
export const isAnalyticsNetworkName = (
  networkName: AllNetworkNames
): networkName is AnalyticsNetworkName => {
  return AnalyticsNetworkNames.includes(networkName as AnalyticsNetworkName)
}

type EventName =
  | 'Deposit'
  | 'Withdraw'
  | 'Connect Wallet Click'
  | 'Address Block'
  | 'Explore: DeFi Project Click'
  | 'Explore: NFT Project Click'
  | 'CEX Click'
  | 'Fiat On-Ramp Click'
  | 'Fast Bridge Click'
  | 'Use Arbitrum Bridge Click'
  | 'Copy Bridge Link Click'
  | 'Slow Bridge Click'
  | 'Move More Funds Click'
  | 'Add to Google Calendar Click'
  | 'Switch Network and Transfer'
  | 'Redeem Retryable'
  | 'Open Transaction History Click'
  | 'Tx Error: Get Help Click'
  | 'Multiple Tx Error: Get Help Click'
  | 'Explore: Randomize Click'

type EventProperties = {
  bridge: FastBridgeName
  fastBridge: NonCanonicalTokenSupportedBridges<NonCanonicalTokenAddresses.FRAX>
  pageElement: 'Header' | 'Tx Info Banner'
  defiProject: ExploreArbitrumDeFiProjectName
  nftProject: ExploreArbitrumNFTProjectName
  network: 'Arbitrum One' | 'Arbitrum Nova'
  tokenSymbol: string
  cexExchange: CEXName
  fiatExchange: FiatOnRampName
  txType: 'Deposit' | 'Withdrawal'
  tokenType: 'ETH' | 'ERC-20'
  walletType: AccountType
  walletName: ProviderName
  amount: number
  nonCanonicalTokenSymbol: NonCanonicalTokenName
}

export type FathomEventNonCanonicalTokens =
  | `${NonCanonicalTokenNames.FRAX}: Fast Bridge Click: ${NonCanonicalTokenSupportedBridges<NonCanonicalTokenAddresses.FRAX>}`

export type FathomEvent =
  | 'Address Block'
  //
  | `Connect Wallet Click: ${ProviderName}`
  //
  | `Deposit ${TokenType} to ${AnalyticsNetworkName} (${AccountType})`
  | `Withdraw ${TokenType} from ${AnalyticsNetworkName} (${AccountType})`
  //
  | `Explore: DeFi Project Click: ${ExploreArbitrumDeFiProjectName}`
  | `Explore: NFT Project Click: ${ExploreArbitrumNFTProjectName}`
  | `Explore: Randomize Click`
  //
  | `CEX Click: ${CEXName}`
  | `Fiat On-Ramp Click: ${FiatOnRampName}`
  //
  | `Fast Bridge Click: ${FastBridgeName}`
  | `${NonCanonicalTokenName}: Use Arbitrum Bridge Click`
  | `${NonCanonicalTokenName}: Copy Bridge Link Click`
  //
  | `Slow Bridge Click`
  | `Move More Funds Click`
  | `Add to Google Calendar Click`
  //
  | 'Switch Network and Transfer'
  //
  | `Redeem Retryable on ${AnalyticsNetworkName}`
  //
  | `Open Transaction History Click`
  | `Open Transaction History Click: Tx Info Banner`
  //
  | `Tx Error: Get Help Click on ${AnalyticsNetworkName}`
  | `Multiple Tx Error: Get Help Click on ${AnalyticsNetworkName}`

const fathomEventToEventId: { [key in FathomEvent]: string } & {
  [key in FathomEventNonCanonicalTokens]: string
} = {
  'Address Block': 'KG4YHGXC',
  //
  'Connect Wallet Click: MetaMask': 'VGEJWUHT',
  'Connect Wallet Click: Coinbase Wallet': 'CSNSGTI5',
  'Connect Wallet Click: WalletConnect': 'QPDOCSPL',
  'Connect Wallet Click: Trust Wallet': 'XFGNLIQZ',
  'Connect Wallet Click: Safe': '8HAEMQGA',
  'Connect Wallet Click: Injected': 'GU8XQEEH',
  'Connect Wallet Click: Ledger': 'EBS4HGEH',
  'Connect Wallet Click: Other': 'V700XEJ1',
  //
  'Deposit ETH to Arbitrum One (EOA)': 'UL9WSZQO',
  'Deposit ETH to Arbitrum One (Smart Contract)': 'HMAEKCNM',
  'Deposit ETH to Arbitrum Nova (EOA)': 'QAIO4AJ1',
  'Deposit ETH to Arbitrum Nova (Smart Contract)': 'JEJCCAX5',
  'Deposit ERC-20 to Arbitrum One (EOA)': 'JFSNEA7Z',
  'Deposit ERC-20 to Arbitrum One (Smart Contract)': 'W26LHYUZ',
  'Deposit ERC-20 to Arbitrum Nova (EOA)': 'K1VGFDC5',
  'Deposit ERC-20 to Arbitrum Nova (Smart Contract)': 'WFVNXUXA',
  'Withdraw ETH from Arbitrum One (EOA)': 'PACZDLXE',
  'Withdraw ETH from Arbitrum One (Smart Contract)': 'F3N3OBE9',
  'Withdraw ETH from Arbitrum Nova (EOA)': 'MGEAJZ7A',
  'Withdraw ETH from Arbitrum Nova (Smart Contract)': 'RML4LVRI',
  'Withdraw ERC-20 from Arbitrum One (EOA)': '9B33K1F3',
  'Withdraw ERC-20 from Arbitrum One (Smart Contract)': 'A2GD3YQA',
  'Withdraw ERC-20 from Arbitrum Nova (EOA)': '4KA57CQE',
  'Withdraw ERC-20 from Arbitrum Nova (Smart Contract)': '4VA53F84',
  //
  'Explore: DeFi Project Click: Uniswap': 'GD30QTVK',
  'Explore: DeFi Project Click: SushiSwap': '1FSKVH8U',
  'Explore: DeFi Project Click: Curve': '2VK5GI5K',
  'Explore: DeFi Project Click: Aave': 'GUOQMB1B',
  'Explore: DeFi Project Click: GMX': '1P9YY5PL',
  'Explore: DeFi Project Click: Dopex': 'SZPHSXIE',
  'Explore: DeFi Project Click: TreasureDAO': 'YVGKJ1CX',
  'Explore: DeFi Project Click: Balancer': '4FZQAI5H',
  'Explore: DeFi Project Click: Jones DAO': 'LOUGONM6',
  'Explore: DeFi Project Click: 1inch': 'DZBLQTEL',
  'Explore: DeFi Project Click: Beefy Finance': 'NDMROCKL',
  'Explore: DeFi Project Click: Yearn Finance': '32U989O7',
  'Explore: DeFi Project Click: KyberSwap': 'RVW7KSNB',
  'Explore: DeFi Project Click: Sperax': '6IVIM3JM',
  //
  'Explore: NFT Project Click: Arbibots': 'UKENMGHD',
  'Explore: NFT Project Click: Smol Brains': '7JMIH5HA',
  'Explore: NFT Project Click: Battlefly': 'X6SJPXIZ',
  'Explore: NFT Project Click: Bridgeworld': 'FGONZVFV',
  'Explore: NFT Project Click: Diamond Pepes': 'URQL1V1O',
  'Explore: NFT Project Click: GMX Blueberry Club': 'CLCORI2X',
  'Explore: NFT Project Click: Toadstoolz': '86GGM1X5',
  'Explore: NFT Project Click: Smol Bodies': '4QWJGIK3',
  'Explore: NFT Project Click: Tales of Elleria': 'FM8M0QG3',
  'Explore: NFT Project Click: RandomWalkNFT': 'BTXARIM1',
  'Explore: NFT Project Click: City Clash': 'DSBNPBGZ',
  'Explore: NFT Project Click: Arbidudes': '2IPJGJ5S',
  'Explore: NFT Project Click: CastleDAO': 'QZOB4Q05',
  'Explore: NFT Project Click: The Lost Donkeys': 'JPUFDZPF',
  'Explore: NFT Project Click: Realm': 'WNDPBXBS',
  'Explore: NFT Project Click: SmithyDAO': 'KIBVXEXH',
  'Explore: NFT Project Click: Mithical': 'NEMVXNXN',
  'Explore: NFT Project Click: Farmland': 'TJLLNSHG',
  'Explore: NFT Project Click: OpenSea': 'F5RJY3S0',
  //
  'Explore: Randomize Click': '9M9C7EZ3',
  //
  'CEX Click: Binance': 'TO6BRQEP',
  'CEX Click: Bitget': 'P2RBDSLX',
  'CEX Click: Bybit': '4MCGRHS8',
  'CEX Click: Crypto.com': 'ZVK2C6WN',
  'CEX Click: Kucoin': 'LKGN4G9R',
  'CEX Click: MEXC': 'NY3ECWCL',
  'CEX Click: OKX': '8UGCXUUS',
  //
  'Fiat On-Ramp Click: Banxa': 'IJDAFM7U',
  'Fiat On-Ramp Click: CryptoRefills': 'VKDJFRJU',
  'Fiat On-Ramp Click: FluidFi': 'AOLZ3ME2',
  'Fiat On-Ramp Click: Mt Pelerin': '8GKV135S',
  'Fiat On-Ramp Click: Ramp': 'IJQLRRB9',
  'Fiat On-Ramp Click: Simplex': 'FAERNLIC',
  'Fiat On-Ramp Click: Transak': 'FKEOPFNQ',
  'Fiat On-Ramp Click: Wirex': 'BNQOEXBL',
  //
  'Fast Bridge Click: Hop': 'W70GIPZ0',
  'Fast Bridge Click: Celer': 'JGSCWGST',
  'Fast Bridge Click: Connext': 'KFF7GMET',
  'Fast Bridge Click: Across': 'EZDV8TMY',
  'Fast Bridge Click: Synapse': 'SKUFXFQR',
  'Fast Bridge Click: Stargate': '6VZXVGEQ',
  //
  'FRAX: Fast Bridge Click: Celer': '6PZJPSBO',
  'FRAX: Use Arbitrum Bridge Click': 'THMMEGSP',
  'FRAX: Copy Bridge Link Click': 'WWJ8WGXM',
  //
  'Slow Bridge Click': '9CEY3IGM',
  'Move More Funds Click': 'YE1OYTL4',
  'Add to Google Calendar Click': 'CZTO23FP',
  //
  'Switch Network and Transfer': '4F5SKZRG',
  //
  'Redeem Retryable on Arbitrum One': 'UHPNE3XJ',
  'Redeem Retryable on Arbitrum Nova': 'AQDHUKER',
  //
  'Open Transaction History Click': 'BNE3W7KB',
  'Open Transaction History Click: Tx Info Banner': 'I9AMOFHA',
  //
  'Tx Error: Get Help Click on Arbitrum One': 'HT1BWVVI',
  'Tx Error: Get Help Click on Arbitrum Nova': 'XD5VYLPU',
  'Multiple Tx Error: Get Help Click on Arbitrum One': 'CWMVRSXW',
  'Multiple Tx Error: Get Help Click on Arbitrum Nova': '2VOXN4FB'
}

const payloadToFathomEvent = (
  event: EventName,
  properties?: Partial<EventProperties>
): FathomEvent | FathomEventNonCanonicalTokens => {
  const props = properties as EventProperties

  switch (event) {
    case 'Connect Wallet Click':
      return `${event}: ${props.walletName}`
    case 'Deposit':
      return `${event} ${props.tokenType} to ${props.network} (${props.walletType})`

    case 'Withdraw':
      return `${event} ${props.tokenType} from ${props.network} (${props.walletType})`

    case 'Explore: DeFi Project Click':
      return `${event}: ${props.defiProject}`
    case 'Explore: NFT Project Click':
      return `${event}: ${props.nftProject}`
    case 'CEX Click':
      return `${event}: ${props.cexExchange}`
    case 'Fiat On-Ramp Click':
      return `${event}: ${props.fiatExchange}`
    case 'Fast Bridge Click':
      if (props.nonCanonicalTokenSymbol) {
        // FRAX: Fast Bridge Click: Celer
        return `${props.nonCanonicalTokenSymbol}: ${event}: ${props.fastBridge}`
      } else {
        return `${event}: ${props.bridge}`
      }
    case 'Redeem Retryable':
      return `${event} on ${props.network}`
    case 'Multiple Tx Error: Get Help Click':
      return `${event} on ${props.network}`
    case 'Tx Error: Get Help Click':
      return `${event} on ${props.network}`
    case 'Use Arbitrum Bridge Click':
      return `${props.nonCanonicalTokenSymbol}: ${event}`
    case 'Copy Bridge Link Click':
      return `${props.nonCanonicalTokenSymbol}: ${event}`
    case 'Open Transaction History Click':
      if (props.pageElement === 'Tx Info Banner') {
        // tx history from the banner
        return `${event}: Tx Info Banner`
      } else {
        // tx history from the header
        return event
      }
    default:
      // events w/o props in fathom
      return event
  }
}

// events overload
export function trackEvent(
  event: 'Deposit',
  properties: {
    tokenType: EventProperties['tokenType']
    walletType: EventProperties['walletType']
    network: EventProperties['network']
    amount: EventProperties['amount']
    tokenSymbol?: EventProperties['tokenSymbol']
  }
): void
export function trackEvent(
  event: 'Withdraw',
  properties: {
    tokenType: EventProperties['tokenType']
    walletType: EventProperties['walletType']
    network: EventProperties['network']
    amount: EventProperties['amount']
    tokenSymbol?: EventProperties['tokenSymbol']
  }
): void
export function trackEvent(
  event: 'Connect Wallet Click',
  properties: {
    walletName: EventProperties['walletName']
  }
): void
export function trackEvent(
  event: 'Explore: DeFi Project Click',
  properties: {
    defiProject: EventProperties['defiProject']
  }
): void
export function trackEvent(
  event: 'Explore: NFT Project Click',
  properties: {
    nftProject: EventProperties['nftProject']
  }
): void
export function trackEvent(
  event: 'CEX Click',
  properties: {
    cexExchange: EventProperties['cexExchange']
  }
): void
export function trackEvent(
  event: 'Fiat On-Ramp Click',
  properties: {
    fiatExchange: EventProperties['fiatExchange']
  }
): void
export function trackEvent(
  event: 'Fast Bridge Click',
  properties: {
    bridge: EventProperties['bridge']
    nonCanonicalTokenSymbol?: EventProperties['nonCanonicalTokenSymbol']
  }
): void
export function trackEvent(
  event: 'Redeem Retryable',
  properties: {
    network: EventProperties['network']
  }
): void
export function trackEvent(
  event: 'Multiple Tx Error: Get Help Click',
  properties: {
    network: EventProperties['network']
  }
): void
export function trackEvent(
  event: 'Use Arbitrum Bridge Click',
  properties: {
    nonCanonicalTokenSymbol: EventProperties['nonCanonicalTokenSymbol']
  }
): void
export function trackEvent(
  event: 'Copy Bridge Link Click',
  properties: {
    nonCanonicalTokenSymbol: EventProperties['nonCanonicalTokenSymbol']
  }
): void
export function trackEvent(
  event: 'Tx Error: Get Help Click',
  properties: {
    network: EventProperties['network']
  }
): void
export function trackEvent(
  event: 'Open Transaction History Click',
  properties: {
    pageElement: EventProperties['pageElement']
  }
): void
export function trackEvent(
  event: 'Switch Network and Transfer',
  properties: {
    tokenType: EventProperties['tokenType']
    walletType: EventProperties['walletType']
    network: EventProperties['network']
    amount: EventProperties['amount']
    tokenSymbol?: EventProperties['tokenSymbol']
    txType?: EventProperties['txType']
  }
): void
export function trackEvent(event: 'Slow Bridge Click'): void
export function trackEvent(event: 'Move More Funds Click'): void
export function trackEvent(event: 'Add to Google Calendar Click'): void
export function trackEvent(event: 'Explore: Randomize Click'): void
export function trackEvent(event: 'Address Block'): void

// event tracking method
export function trackEvent(
  event: EventName,
  properties?: Partial<EventProperties>
): void {
  // Posthog
  posthogClient.capture(event, properties)
  // Fathom
  if (typeof window.fathom !== 'undefined' && typeof event !== 'undefined') {
    const fathomEvent = payloadToFathomEvent(event, properties)
    if (process.env.NODE_ENV !== 'production') {
      console.log('Fathom Event:', fathomEvent)
      // only send in prod
      return
    }
    window.fathom.trackGoal(fathomEventToEventId[fathomEvent])
  }
  return
}
